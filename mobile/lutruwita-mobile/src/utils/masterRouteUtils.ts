/**
 * Utility functions for creating a master route that combines data from multiple routes
 */
import { RouteData, RouteStatistics, UnpavedSection } from '../services/routeService';
import { calculateUnpavedPercentage } from './routeUtils';

/**
 * Create a master route that combines data from multiple routes
 * @param routes Array of routes to combine
 * @param mapName Name of the map (used as the master route name)
 * @returns A single RouteData object that represents all routes combined
 */
export const createMasterRoute = (routes: RouteData[], mapName: string): RouteData => {
  if (!routes || routes.length === 0) {
    throw new Error('No routes provided to create master route');
  }

  // If there's only one route, return it with the map name
  if (routes.length === 1) {
    return {
      ...routes[0],
      name: mapName || routes[0].name,
      order: -1, // Special order to always be first
    };
  }

  // Combine statistics from all routes
  const combinedStatistics: RouteStatistics = routes.reduce(
    (combined, route) => {
      return {
        totalDistance: combined.totalDistance + (route.statistics?.totalDistance || 0),
        elevationGain: combined.elevationGain + (route.statistics?.elevationGain || 0),
        elevationLoss: combined.elevationLoss + (route.statistics?.elevationLoss || 0),
        maxElevation: Math.max(combined.maxElevation, route.statistics?.maxElevation || 0),
        minElevation: Math.min(combined.minElevation, route.statistics?.minElevation || Number.MAX_SAFE_INTEGER),
        averageSpeed: 0, // Not relevant for combined routes
        movingTime: combined.movingTime + (route.statistics?.movingTime || 0),
        totalTime: combined.totalTime + (route.statistics?.totalTime || 0),
      };
    },
    {
      totalDistance: 0,
      elevationGain: 0,
      elevationLoss: 0,
      maxElevation: 0,
      minElevation: Number.MAX_SAFE_INTEGER,
      averageSpeed: 0,
      movingTime: 0,
      totalTime: 0,
    }
  );

  // Fix minElevation if no routes had elevation data
  if (combinedStatistics.minElevation === Number.MAX_SAFE_INTEGER) {
    combinedStatistics.minElevation = 0;
  }

  // Create a combined GeoJSON with a single LineString
  const combinedCoordinates: [number, number, number][] = [];
  
  // Process each route to create a continuous LineString with proper elevation data
  // Simply concatenate the coordinates from each route in order (1, 2, 3, etc.)
  routes.forEach((route, routeIndex) => {
    if (!route.geojson?.features?.[0]?.geometry?.coordinates) {
      return;
    }
    
    const routeCoordinates = route.geojson.features[0].geometry.coordinates as [number, number, number][];
    
    // Check if elevation data exists in properties
    const elevationArray = route.geojson.features[0].properties?.coordinateProperties?.elevation;
    const hasElevationInProperties = Array.isArray(elevationArray) && elevationArray.length > 0;
    
    // Add coordinates from this route to the combined array
    routeCoordinates.forEach((coord, coordIndex) => {
      // Only add the first coordinate if this isn't the first route (to avoid duplicates)
      if (coordIndex === 0 && routeIndex > 0) {
        return;
      }
      
      let elevation = 0;
      
      // First try to get elevation from the coordinate
      if (coord.length > 2 && typeof coord[2] === 'number' && !isNaN(coord[2])) {
        elevation = coord[2];
      }
      // If not available, try to get it from properties
      else if (hasElevationInProperties && coordIndex < elevationArray.length) {
        elevation = elevationArray[coordIndex];
      }
      // If still not available, use the route's min elevation as a fallback
      else if (route.statistics?.minElevation !== undefined) {
        elevation = route.statistics.minElevation;
      }
      
      // Create a new coordinate with the elevation value
      combinedCoordinates.push([coord[0], coord[1], elevation]);
    });
  });
  
  // Create a combined GeoJSON object with a single LineString feature
  const combinedGeoJSON = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: combinedCoordinates
      }
    }]
  };

  // Create combined unpaved sections
  const combinedUnpavedSections: UnpavedSection[] = [];
  let coordinateOffset = 0;
  
  routes.forEach((route, routeIndex) => {
    if (!route.unpavedSections || !route.geojson?.features?.[0]?.geometry?.coordinates) {
      return;
    }
    
    const routeCoordinates = route.geojson.features[0].geometry.coordinates;
    
    // Adjust for the first coordinate of subsequent routes (which we skip)
    const firstCoordinateAdjustment = (routeIndex > 0) ? 1 : 0;
    
    // Map the unpaved sections to the combined coordinates
    route.unpavedSections.forEach(section => {
      combinedUnpavedSections.push({
        startIndex: section.startIndex + coordinateOffset - firstCoordinateAdjustment,
        endIndex: section.endIndex + coordinateOffset - firstCoordinateAdjustment,
        coordinates: section.coordinates,
        surfaceType: section.surfaceType || 'gravel',
        _id: section._id || `combined-${routeIndex}-${section.startIndex}`
      });
    });
    
    // Update the offset for the next route
    coordinateOffset += routeCoordinates.length - firstCoordinateAdjustment;
  });
  
  // Calculate combined unpaved percentage
  const totalUnpavedPoints = combinedUnpavedSections.reduce((sum, section) => 
    sum + (section.endIndex - section.startIndex + 1), 0);
  
  const totalPoints = combinedCoordinates.length;
  const unpavedPercentage = totalPoints > 0 ? Math.round((totalUnpavedPoints / totalPoints) * 100) : 0;

  // Create a minimal route overview description
  const combinedDescription = `<p>This route consists of ${routes.length} segments with a total distance of 
${(combinedStatistics.totalDistance / 1000).toFixed(1)} km.</p>`;

  // Create the master route
  return {
    order: -1, // Special order to always be first
    routeId: 'master-route',
    name: mapName || 'Combined Routes',
    color: '#ff4d4d', // Default color
    isVisible: true,
    geojson: combinedGeoJSON,
    statistics: combinedStatistics,
    status: {
      processingState: 'completed',
      progress: 100
    },
    metadata: {
      unpavedPercentage
    },
    description: combinedDescription,
    unpavedSections: combinedUnpavedSections
  };
};

/**
 * Create a historical weather component for the master route
 * This replaces the 7-day forecast with historical climate data
 * @param route The master route
 * @returns JSX element with historical weather data
 */
export const getStartingCoordinates = (route: RouteData): [number, number] | null => {
  if (!route.geojson || !route.geojson.features || route.geojson.features.length === 0) {
    return null;
  }

  const firstFeature = route.geojson.features[0];
  if (!firstFeature.geometry || !firstFeature.geometry.coordinates || firstFeature.geometry.coordinates.length === 0) {
    return null;
  }

  return firstFeature.geometry.coordinates[0] as [number, number];
};
