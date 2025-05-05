import { Feature, FeatureCollection, GeoJsonProperties, Point } from 'geojson';
import { RouteMap } from '../services/routeService';

/**
 * Interface for route feature properties
 */
export interface RouteFeatureProperties {
  id: string;
  routeType: 'tourism' | 'event' | 'bikepacking' | 'single' | string;
  routeData: RouteMap;
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
  routeData?: never;
}

/**
 * Type guard to check if a feature is a cluster
 */
export function isCluster(properties: any): properties is ClusterFeatureProperties {
  return properties && properties.cluster === true;
}

/**
 * Type guard to check if a feature is a route feature
 */
export function isRouteFeature(properties: any): properties is RouteFeatureProperties {
  return properties && properties.routeData !== undefined;
}

/**
 * Convert routes array to GeoJSON FeatureCollection for use with ShapeSource
 */
export function routesToGeoJSON(routes: RouteMap[]): FeatureCollection {
  console.log(`[routesToGeoJSON] Converting ${routes?.length || 0} routes to GeoJSON.`); // Log input count

  if (!routes || routes.length === 0) {
    console.log('[routesToGeoJSON] No routes provided, returning empty FeatureCollection.');
    return {
      type: 'FeatureCollection' as const,
      features: []
    };
  }

  const features = routes.map((route, index) => {
    let coordinates: [number, number] = [146.8087, -41.4419]; // Default to Tasmania
    let coordSource = 'default'; // Track where coordinates came from
    
    // Try all possible coordinate sources, with explicit [0,0] check
    // PRIORITY CHANGE: First try to get the starting point of the route (first coordinate of LineString)
    
    // Try first coordinate from route geojson (STARTING POINT)
    if (route.routes && route.routes.length > 0) {
      // Log route data for debugging
      console.log(`[routesToGeoJSON] Route ${route.persistentId || index} has ${route.routes.length} routes`);
      
      const firstRoute = route.routes[0];
      if (firstRoute.geojson && 
          firstRoute.geojson.features && 
          firstRoute.geojson.features.length > 0) {
        
        console.log(`[routesToGeoJSON] First route has ${firstRoute.geojson.features.length} features`);
        
        const firstFeature = firstRoute.geojson.features[0];
        if (firstFeature.geometry && 
            firstFeature.geometry.type === 'LineString' && 
            firstFeature.geometry.coordinates && 
            firstFeature.geometry.coordinates.length > 0) {
          
          const firstCoord = firstFeature.geometry.coordinates[0];
          // Check if the coordinate is valid (not [0,0])
          if (!(firstCoord[0] === 0 && firstCoord[1] === 0)) {
            coordinates = firstCoord;
            coordSource = 'first route coordinate';
          }
        }
      }
    }
    
    // Try mapState.center if route starting point not found
    if (coordSource === 'default' && route.mapState && route.mapState.center && 
        !(route.mapState.center[0] === 0 && route.mapState.center[1] === 0)) {
      coordinates = route.mapState.center;
      coordSource = 'mapState.center';
    }
    
    // Try boundingBox if previous methods failed
    if (coordSource === 'default' && route.boundingBox) {
      const [[minLng, minLat], [maxLng, maxLat]] = route.boundingBox;
      // Check if the bounding box is valid (not all zeros)
      if (!(minLng === 0 && minLat === 0 && maxLng === 0 && maxLat === 0)) {
        coordinates = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
        coordSource = 'boundingBox center';
      }
    }

    console.log(`[routesToGeoJSON] Route ${route.persistentId || index}: Using coords ${JSON.stringify(coordinates)} from ${coordSource}`);

    // Basic validation: Check if coordinates are numbers and within reasonable bounds
    if (typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number' ||
        isNaN(coordinates[0]) || isNaN(coordinates[1]) ||
        coordinates[0] < -180 || coordinates[0] > 180 ||
        coordinates[1] < -90 || coordinates[1] > 90 ||
        (coordinates[0] === 0 && coordinates[1] === 0)) { // Explicitly check for [0,0]
      console.warn(`[routesToGeoJSON] Invalid coordinates generated for route ${route.persistentId || index}: ${JSON.stringify(coordinates)}. Falling back to Tasmania.`);
      
      // Use Tasmania coordinates as a last resort
      coordinates = [146.8087, -41.4419]; // Tasmania
      coordSource = 'Tasmania fallback';
    }


    return {
      type: 'Feature' as const,
        id: route.persistentId || `route-${index}`,
        properties: {
          id: route.persistentId || `route-${index}`,
          routeType: route.type, // Add route type for marker styling
          routeData: route // Store the entire route object in properties
        },
        geometry: {
          type: 'Point' as const,
          coordinates: coordinates // Ensure correct order [longitude, latitude]
        }
      };
    });

  const featureCollection = {
    type: 'FeatureCollection' as const,
    features: features
  };

  // Log only a snippet if it's large
  const outputString = JSON.stringify(featureCollection, null, 2);
  console.log('[routesToGeoJSON] Generated FeatureCollection:', outputString.substring(0, 1000) + (outputString.length > 1000 ? '...' : '')); 

  return featureCollection;
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
