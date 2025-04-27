import { RouteData } from '../services/routeService';
import { formatDistanceMetric } from './unitUtils';

/**
 * Interface for a distance marker
 */
export interface DistanceMarker {
  coordinates: [number, number]; // [longitude, latitude]
  distance: number; // Distance in meters
  formattedDistance: string; // Formatted distance (e.g., "1 km")
}

/**
 * Calculate the distance between two coordinates in meters using the Haversine formula
 */
function calculateDistance(
  coord1: [number, number], 
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Calculate distance markers along a route at regular intervals
 * @param route The route data
 * @param zoomLevel Current map zoom level (used to adjust marker density)
 * @returns Array of distance markers
 */
export function calculateDistanceMarkers(
  route: RouteData,
  zoomLevel: number = 10
): DistanceMarker[] {
  // Adjust interval based on zoom level to show approximately 5 markers
  // At lower zoom levels (zoomed out), use larger intervals
  // At higher zoom levels (zoomed in), use smaller intervals
  let interval: number;
  
  if (zoomLevel < 8) {
    interval = 50000; // 50km between markers when very zoomed out
  } else if (zoomLevel < 10) {
    interval = 20000; // 20km between markers
  } else if (zoomLevel < 12) {
    interval = 10000; // 10km between markers
  } else if (zoomLevel < 14) {
    interval = 5000;  // 5km between markers
  } else {
    interval = 2000;  // 2km between markers when zoomed in
  }
  if (!route.geojson || !route.geojson.features || route.geojson.features.length === 0) {
    return [];
  }

  const coordinates = route.geojson.features[0].geometry.coordinates as [number, number][];
  if (!coordinates || coordinates.length < 2) {
    return [];
  }

  const markers: DistanceMarker[] = [];
  let cumulativeDistance = 0;
  let nextMarkerDistance = interval;
  let lastCoord = coordinates[0];

  // Add a marker at the start (0 km)
  markers.push({
    coordinates: lastCoord,
    distance: 0,
    formattedDistance: formatDistanceMetric(0, 0) // "0 km"
  });

  // Get the total distance from route statistics (in meters)
  const totalRouteDistance = route.statistics?.totalDistance || 0;
  
  // If we have a valid total distance, use it to place markers at regular intervals
  if (totalRouteDistance > 0 && coordinates.length > 1) {
    // Calculate markers based on the total route distance
    const totalCoordinates = coordinates.length;
    
    // Place markers at regular intervals (e.g., every 5km)
    for (let distance = interval; distance < totalRouteDistance; distance += interval) {
      // Calculate the position along the route as a percentage
      const percentage = distance / totalRouteDistance;
      
      // Find the corresponding index in the coordinates array
      const index = Math.floor(percentage * (totalCoordinates - 1));
      
      // Get the coordinates for this marker
      const markerCoordinates = coordinates[index];
      
      // Calculate distance in kilometers
      const distanceInKm = distance / 1000;
      
      markers.push({
        coordinates: markerCoordinates,
        distance: distance,
        formattedDistance: formatDistanceMetric(distanceInKm, 0) // Already in km
      });
    }
  } else {
    // Fallback to the original calculation if no valid total distance
    for (let i = 1; i < coordinates.length; i++) {
      const currentCoord = coordinates[i];
      const segmentDistance = calculateDistance(lastCoord, currentCoord);
      cumulativeDistance += segmentDistance;
  
      // Check if we've reached or passed the next marker distance
      while (cumulativeDistance >= nextMarkerDistance) {
        // Interpolate to find the exact marker position
        const ratio = (nextMarkerDistance - (cumulativeDistance - segmentDistance)) / segmentDistance;
        const markerLon = lastCoord[0] + ratio * (currentCoord[0] - lastCoord[0]);
        const markerLat = lastCoord[1] + ratio * (currentCoord[1] - lastCoord[1]);
  
        // Calculate distance in kilometers
        const distanceInKm = nextMarkerDistance / 1000;
        
        markers.push({
          coordinates: [markerLon, markerLat],
          distance: nextMarkerDistance,
          formattedDistance: formatDistanceMetric(distanceInKm, 0) // Already in km
        });
  
        nextMarkerDistance += interval;
      }
  
      lastCoord = currentCoord;
    }
  }

  // Add a marker at the end if it's not too close to the last marker
  const totalDistance = route.statistics?.totalDistance || cumulativeDistance;
  if (totalDistance - markers[markers.length - 1].distance >= interval / 2) {
    markers.push({
      coordinates: coordinates[coordinates.length - 1],
      distance: totalDistance,
      formattedDistance: formatDistanceMetric(totalDistance / 1000, 0) // Convert to km and format
    });
  }

  return markers;
}
