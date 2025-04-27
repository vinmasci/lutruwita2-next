import { Feature, FeatureCollection, GeoJsonProperties, Point } from 'geojson';
import { RouteData } from '../services/routeService';

/**
 * Interface for photo data
 */
export interface Photo {
  name: string;
  url: string;
  thumbnailUrl: string;
  dateAdded: string;
  caption?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  _id: string;
  routePosition?: number; // Position along the route (0-1)
  routeIndex?: number; // Index of the closest point on the route
  routeName?: string; // Name of the route this photo belongs to
  distanceAlongRoute?: number; // Actual distance along the route in meters
  originalIndex?: number; // Original index in the array before sorting
  photoNumber?: number; // Photo number to display (1-based)
  originalPhotoNumber?: number; // Original photo number before sorting
}

/**
 * Interface for photo feature properties
 */
export interface PhotoFeatureProperties {
  id: string;
  photoData: Photo;
  cluster?: never;
  cluster_id?: never;
  point_count?: never;
  point_count_abbreviated?: never;
}

/**
 * Interface for cluster feature properties
 */
export interface ClusterFeatureProperties {
  cluster: boolean;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: number;
  id?: never;
  photoData?: never;
}

/**
 * Type guard to check if a feature is a cluster
 */
export function isCluster(properties: any): properties is ClusterFeatureProperties {
  return properties && properties.cluster === true;
}

/**
 * Type guard to check if a feature is a photo feature
 */
export function isPhotoFeature(properties: any): properties is PhotoFeatureProperties {
  return properties && properties.photoData !== undefined;
}

/**
 * Convert photos array to GeoJSON FeatureCollection for use with ShapeSource
 */
export function photosToGeoJSON(photos: Photo[]): FeatureCollection {
  if (!photos || photos.length === 0) {
    return {
      type: 'FeatureCollection' as const,
      features: []
    };
  }

  return {
    type: 'FeatureCollection' as const,
    features: photos.map((photo, index) => ({
      type: 'Feature' as const,
      id: photo._id || `photo-${index}`,
      properties: {
        id: photo._id || `photo-${index}`,
        photoData: photo // Store the entire photo object in properties
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [photo.coordinates.lng, photo.coordinates.lat]
      }
    }))
  };
}

/**
 * Helper function to get the appropriate cluster radius based on zoom level
 */
export function getClusterRadius(zoom: number): number {
  // More aggressive clustering at lower zoom levels
  if (zoom < 8) return 80;
  if (zoom < 10) return 60;
  if (zoom < 12) return 50;
  return 40; // Default radius
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in meters
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate the distance from a point to a line segment
 * @param lat Latitude of the point
 * @param lng Longitude of the point
 * @param lat1 Latitude of the first endpoint of the line segment
 * @param lng1 Longitude of the first endpoint of the line segment
 * @param lat2 Latitude of the second endpoint of the line segment
 * @param lng2 Longitude of the second endpoint of the line segment
 * @returns Distance in meters
 */
function distanceToLineSegment(
  lat: number, lng: number,
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  // Convert to Cartesian coordinates for simplicity
  // This is an approximation that works well for small distances
  const earthRadius = 6371e3; // Earth's radius in meters
  const x = lng * Math.PI / 180 * Math.cos(lat * Math.PI / 180) * earthRadius;
  const y = lat * Math.PI / 180 * earthRadius;
  
  const x1 = lng1 * Math.PI / 180 * Math.cos(lat1 * Math.PI / 180) * earthRadius;
  const y1 = lat1 * Math.PI / 180 * earthRadius;
  
  const x2 = lng2 * Math.PI / 180 * Math.cos(lat2 * Math.PI / 180) * earthRadius;
  const y2 = lat2 * Math.PI / 180 * earthRadius;
  
  // Calculate the squared length of the line segment
  const lengthSquared = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  
  // If the line segment is actually a point, just return the distance to that point
  if (lengthSquared === 0) {
    return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
  }
  
  // Calculate the projection of the point onto the line
  let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lengthSquared;
  
  // Clamp t to the range [0, 1] to ensure we're on the line segment
  t = Math.max(0, Math.min(1, t));
  
  // Calculate the closest point on the line segment
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  
  // Return the distance to the closest point
  return Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));
}

/**
 * Find the closest point on a route to a given photo and calculate the distance along the route
 * @param photo The photo to find the closest point for
 * @param routeCoordinates Array of route coordinates [lng, lat]
 * @returns Object containing the index of the closest point, normalized position, and distance along route
 */
function findClosestPointOnRoute(
  photo: Photo, 
  routeCoordinates: [number, number][]
): { index: number; position: number; distanceAlongRoute: number } {
  let minDistance = Infinity;
  let closestIndex = 0;
  let debugInfo = '';

  // Find the closest point on the route
  for (let i = 0; i < routeCoordinates.length; i++) {
    const [lng, lat] = routeCoordinates[i];
    const distance = calculateDistance(
      photo.coordinates.lat, 
      photo.coordinates.lng, 
      lat, 
      lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
      debugInfo = `Point ${i}: [${lng.toFixed(6)}, ${lat.toFixed(6)}], distance=${distance.toFixed(2)}m`;
    }
  }

  // Also check line segments for more accuracy
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const [lng1, lat1] = routeCoordinates[i];
    const [lng2, lat2] = routeCoordinates[i + 1];
    
    const segmentDistance = distanceToLineSegment(
      photo.coordinates.lat, photo.coordinates.lng,
      lat1, lng1, lat2, lng2
    );
    
    if (segmentDistance < minDistance) {
      minDistance = segmentDistance;
      // Use the midpoint index for now
      closestIndex = i;
      debugInfo = `Segment ${i}-${i+1}: [${lng1.toFixed(6)},${lat1.toFixed(6)}]-[${lng2.toFixed(6)},${lat2.toFixed(6)}], distance=${segmentDistance.toFixed(2)}m`;
    }
  }

  // Calculate the actual distance along the route up to this point
  let distanceAlongRoute = 0;
  for (let i = 1; i <= closestIndex; i++) {
    const [prevLng, prevLat] = routeCoordinates[i-1];
    const [currLng, currLat] = routeCoordinates[i];
    
    const segmentLength = calculateDistance(
      currLat, 
      currLng, 
      prevLat, 
      prevLng
    );
    
    distanceAlongRoute += segmentLength;
  }

  // Calculate the normalized position along the route (0-1)
  // First, calculate the total route length
  let totalRouteLength = 0;
  for (let i = 1; i < routeCoordinates.length; i++) {
    const [prevLng, prevLat] = routeCoordinates[i-1];
    const [currLng, currLat] = routeCoordinates[i];
    
    totalRouteLength += calculateDistance(
      currLat, 
      currLng, 
      prevLat, 
      prevLng
    );
  }

  // Then calculate the normalized position
  const position = totalRouteLength > 0 ? distanceAlongRoute / totalRouteLength : 0;

  // Log detailed information for debugging
  if (photo.name && (photo.originalIndex === 0 || photo.originalIndex === 1 || 
      photo.photoNumber === 1 || photo.photoNumber === 2)) {
    console.log(`[findClosestPointOnRoute] Photo "${photo.name}" (index: ${photo.originalIndex || 'unknown'}, number: ${photo.photoNumber || 'unknown'}):`);
    console.log(`  - Coordinates: [${photo.coordinates.lng.toFixed(6)}, ${photo.coordinates.lat.toFixed(6)}]`);
    console.log(`  - Closest: ${debugInfo}`);
    console.log(`  - Closest index: ${closestIndex}/${routeCoordinates.length-1}`);
    console.log(`  - Distance along route: ${distanceAlongRoute.toFixed(2)}m / ${totalRouteLength.toFixed(2)}m (${(position*100).toFixed(2)}%)`);
  }

  return { index: closestIndex, position, distanceAlongRoute };
}

/**
 * Calculate the total length of a route in meters
 * @param routeCoordinates Array of route coordinates [lng, lat]
 * @returns Total length in meters
 */
function calculateRouteLength(routeCoordinates: [number, number][]): number {
  let totalLength = 0;
  for (let i = 1; i < routeCoordinates.length; i++) {
    const [prevLng, prevLat] = routeCoordinates[i-1];
    const [currLng, currLat] = routeCoordinates[i];
    
    totalLength += calculateDistance(
      currLat, 
      currLng, 
      prevLat, 
      prevLng
    );
  }
  return totalLength;
}

// Note: All sorting functions have been moved to photoSortingUtils.ts
// This file now only contains clustering-related functionality
