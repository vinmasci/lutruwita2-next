import { Photo } from './photoClusteringUtils';
import { RouteData } from '../services/routeService';

/**
 * Simple utility to sort photos by their original index
 * This ensures photos maintain their original order from the server
 * @param photos Array of photos to sort
 * @returns Sorted array of photos
 */
export function sortPhotosByOriginalOrder(photos: Photo[]): Photo[] {
  if (!photos || photos.length === 0) {
    return [];
  }

  console.log(`[photoSortingUtils] Sorting ${photos.length} photos by original order`);
  
  // Create a copy of the photos array with original index if not already present
  const photosWithIndex = photos.map((photo, index) => ({
    ...photo,
    originalIndex: photo.originalIndex !== undefined ? photo.originalIndex : index,
    photoNumber: photo.photoNumber !== undefined ? photo.photoNumber : index + 1
  }));

  // Sort by original index
  const sortedPhotos = [...photosWithIndex].sort((a, b) => {
    return (a.originalIndex || 0) - (b.originalIndex || 0);
  });
  
  // Log the first few photos for debugging
  console.log('[photoSortingUtils] First 3 photos after sorting by original order:');
  sortedPhotos.slice(0, 3).forEach((photo, idx) => {
    console.log(`  Photo ${idx}: originalIndex=${photo.originalIndex}, photoNumber=${photo.photoNumber}`);
  });
  
  if (sortedPhotos.length > 3) {
    console.log('[photoSortingUtils] Last 3 photos after sorting by original order:');
    sortedPhotos.slice(-3).forEach((photo, idx) => {
      const actualIdx = sortedPhotos.length - 3 + idx;
      console.log(`  Photo ${actualIdx}: originalIndex=${photo.originalIndex}, photoNumber=${photo.photoNumber}`);
    });
  }
  
  return sortedPhotos;
}

/**
 * Sort photos by route number and then by distance along the route
 * This ensures photos are in a logical order for navigation
 * @param photos Array of photos to sort
 * @returns Sorted array of photos
 */
export function sortPhotosByRouteAndDistance(photos: Photo[]): Photo[] {
  if (!photos || photos.length === 0) {
    return [];
  }

  console.log(`[photoSortingUtils] Sorting ${photos.length} photos by route and distance`);
  
  // Create a copy of the photos array
  const sortedPhotos = [...photos];
  
  // Sort by route index (ascending) and then by distance along route (ascending)
  sortedPhotos.sort((a, b) => {
    // First sort by route index
    const routeIndexA = a.routeIndex !== undefined ? a.routeIndex : Infinity;
    const routeIndexB = b.routeIndex !== undefined ? b.routeIndex : Infinity;
    
    if (routeIndexA !== routeIndexB) {
      return routeIndexA - routeIndexB;
    }
    
    // Then sort by distance along route
    const distanceA = a.distanceAlongRoute !== undefined ? a.distanceAlongRoute : Infinity;
    const distanceB = b.distanceAlongRoute !== undefined ? b.distanceAlongRoute : Infinity;
    
    return distanceA - distanceB;
  });
  
  // Assign new sequential photo numbers based on the sorted order
  // This preserves the original photoNumber in originalPhotoNumber
  sortedPhotos.forEach((photo, idx) => {
    // Store the original photo number if it exists
    if (photo.photoNumber !== undefined && photo.originalPhotoNumber === undefined) {
      photo.originalPhotoNumber = photo.photoNumber;
    }
    // Assign new photo number based on sorted position (1-based)
    photo.photoNumber = idx + 1;
  });
  
  // Log the first few photos for debugging
  console.log('[photoSortingUtils] First 3 photos after sorting by route and distance:');
  sortedPhotos.slice(0, 3).forEach((photo, idx) => {
    console.log(`  Photo ${idx}: routeIndex=${photo.routeIndex}, distanceAlongRoute=${photo.distanceAlongRoute?.toFixed(2)}m, originalIndex=${photo.originalIndex}, photoNumber=${photo.photoNumber}, originalPhotoNumber=${photo.originalPhotoNumber}`);
  });
  
  if (sortedPhotos.length > 3) {
    console.log('[photoSortingUtils] Last 3 photos after sorting by route and distance:');
    sortedPhotos.slice(-3).forEach((photo, idx) => {
      const actualIdx = sortedPhotos.length - 3 + idx;
      console.log(`  Photo ${actualIdx}: routeIndex=${photo.routeIndex}, distanceAlongRoute=${photo.distanceAlongRoute?.toFixed(2)}m, originalIndex=${photo.originalIndex}, photoNumber=${photo.photoNumber}, originalPhotoNumber=${photo.originalPhotoNumber}`);
    });
  }
  
  return sortedPhotos;
}

/**
 * Assign route information to photos without changing their order
 * This adds route information to each photo based on its proximity to routes
 * @param photos Array of photos to process
 * @param routes Array of routes
 * @returns Array of photos with route information added
 */
export function assignRouteInfoToPhotos(photos: Photo[], routes?: RouteData[]): Photo[] {
  if (!photos || photos.length === 0) {
    return [];
  }

  if (!routes || routes.length === 0) {
    console.log('[photoSortingUtils] No routes provided for assigning route info');
    return [...photos];
  }

  console.log(`[photoSortingUtils] Assigning route info to ${photos.length} photos`);
  
  // Create a copy of the photos array
  const photosWithRouteInfo = [...photos];
  
  // For each photo, find the closest route
  photosWithRouteInfo.forEach((photo, photoIndex) => {
    if (!photo.coordinates) {
      console.log(`[photoSortingUtils] Photo ${photoIndex} has no coordinates, skipping route assignment`);
      return;
    }
    
    let bestRouteIndex = 0;
    let shortestDistance = Infinity;
    
    // Check each route to find the closest one to this photo
    routes.forEach((route, routeIndex) => {
      if (!route.geojson?.features?.[0]?.geometry?.coordinates) {
        console.log(`[photoSortingUtils] Route ${routeIndex} has no coordinates, skipping`);
        return;
      }
      
      const routeCoords = route.geojson.features[0].geometry.coordinates as [number, number][];
      
      // Find the closest point on this route to the photo
      let minDistance = Infinity;
      let closestPointIndex = 0;
      
      // Calculate the minimum distance to any point on this route
      routeCoords.forEach(([lng, lat], pointIndex) => {
        const distance = calculateDistance(
          photo.coordinates.lat,
          photo.coordinates.lng,
          lat,
          lng
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPointIndex = pointIndex;
        }
      });
      
      // If this route is closer than any previous route
      if (minDistance < shortestDistance) {
        shortestDistance = minDistance;
        bestRouteIndex = routeIndex;
      }
    });
    
    // Calculate distance along the route for this photo
    const route = routes[bestRouteIndex];
    const routeCoords = route.geojson.features[0].geometry.coordinates as [number, number][];
    
    let distanceAlongRoute = 0;
    let totalRouteLength = 0;
    
    // Calculate distance along the route up to the closest point
    for (let i = 1; i < routeCoords.length; i++) {
      const [prevLng, prevLat] = routeCoords[i-1];
      const [currLng, currLat] = routeCoords[i];
      
      const segmentLength = calculateDistance(
        currLat, 
        currLng, 
        prevLat, 
        prevLng
      );
      
      totalRouteLength += segmentLength;
    }
    
    // Find the closest point again and calculate distance along route
    let minDistance = Infinity;
    let closestPointIndex = 0;
    
    routeCoords.forEach(([lng, lat], pointIndex) => {
      const distance = calculateDistance(
        photo.coordinates.lat,
        photo.coordinates.lng,
        lat,
        lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPointIndex = pointIndex;
      }
    });
    
    // Calculate distance along route up to the closest point
    for (let i = 1; i <= closestPointIndex; i++) {
      const [prevLng, prevLat] = routeCoords[i-1];
      const [currLng, currLat] = routeCoords[i];
      
      distanceAlongRoute += calculateDistance(
        currLat, 
        currLng, 
        prevLat, 
        prevLng
      );
    }
    
    // Assign route information to the photo
    photo.routeIndex = bestRouteIndex;
    photo.routeName = route.name || `Route ${bestRouteIndex + 1}`;
    photo.distanceAlongRoute = distanceAlongRoute;
    photo.routePosition = totalRouteLength > 0 ? distanceAlongRoute / totalRouteLength : 0;
    
    // Log for debugging
    if (photoIndex < 3 || photoIndex > photos.length - 3) {
      console.log(`[photoSortingUtils] Photo ${photoIndex}: assigned to route ${bestRouteIndex} (${photo.routeName}) at ${Math.round(distanceAlongRoute/1000)}km`);
    }
  });
  
  return photosWithRouteInfo;
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
