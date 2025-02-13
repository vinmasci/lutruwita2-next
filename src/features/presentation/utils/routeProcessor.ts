import { Feature, FeatureCollection, LineString } from 'geojson';
import { LoadedRoute, SavedRouteState } from '../../map/types/route.types';
import { PublicRouteMetadata } from '../types/route.types';
import { DraggablePOI, PlaceNamePOI } from '../../poi/types/poi.types';
import { SerializedPhoto } from '../../photo/types/photo.types';

/**
 * Validates GeoJSON data structure
 */
const validateGeoJSON = (geojson: any): geojson is FeatureCollection => {
  if (!geojson || typeof geojson !== 'object') {
    console.error('[RouteProcessor] Invalid GeoJSON: not an object');
    return false;
  }

  if (geojson.type !== 'FeatureCollection') {
    console.error('[RouteProcessor] Invalid GeoJSON: not a FeatureCollection');
    return false;
  }

  if (!Array.isArray(geojson.features) || geojson.features.length === 0) {
    console.error('[RouteProcessor] Invalid GeoJSON: no features');
    return false;
  }

  const firstFeature = geojson.features[0];
  if (!firstFeature.geometry || firstFeature.geometry.type !== 'LineString') {
    console.error('[RouteProcessor] Invalid GeoJSON: first feature not a LineString');
    return false;
  }

  return true;
};

/**
 * Processes a public route into the format expected by the map components
 */
export const processPublicRoute = (route: PublicRouteMetadata): {
  savedState: SavedRouteState;
  processedRoutes: LoadedRoute[];
} => {
  console.log('[RouteProcessor] Processing route:', {
    id: route.id,
    name: route.name,
    routeCount: route.routes.length
  });

  // Create saved state
  const savedState: SavedRouteState = {
    id: route.id,
    name: route.name,
    type: 'tourism',
    isPublic: true,
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
    userId: '',
    viewCount: route.viewCount,
    routes: [], // Will be populated with processed routes
    mapState: route.mapState || {
      zoom: 12,
      center: [146.8087, -41.4419], // Tasmania default
      bearing: 0,
      pitch: 0
    },
    pois: route.pois || { draggable: [], places: [] },
    photos: route.photos || []
  };

  // Process each route
  const processedRoutes = route.routes
    .map((routeData, index) => {
      // Validate GeoJSON
      if (!validateGeoJSON(routeData.geojson)) {
        console.error('[RouteProcessor] Invalid GeoJSON in route:', routeData.routeId);
        return null;
      }

      // Create loaded route
      const loadedRoute: LoadedRoute = {
        id: `${route.id}-${index}`,
        routeId: routeData.routeId || `${route.id}-${index}`,
        name: routeData.name || `Route ${index + 1}`,
        color: '#4a9eff',
        isVisible: true,
        isFocused: index === 0,
        gpxData: '',
        rawGpx: '',
        geojson: routeData.geojson,
        statistics: {
          totalDistance: routeData.statistics?.totalDistance || 0,
          elevationGain: routeData.statistics?.elevationGain || 0,
          elevationLoss: routeData.statistics?.elevationLoss || 0,
          maxElevation: routeData.statistics?.maxElevation || 0,
          minElevation: routeData.statistics?.minElevation || 0,
          averageSpeed: routeData.statistics?.averageSpeed || 0,
          movingTime: routeData.statistics?.movingTime || 0,
          totalTime: routeData.statistics?.totalTime || 0
        },
        _type: 'loaded',
        _loadedState: savedState,
        status: {
          processingState: 'completed',
          progress: 100
        },
        unpavedSections: routeData.unpavedSections || []
      };

      return loadedRoute;
    })
    .filter((route): route is LoadedRoute => route !== null);

  // Update saved state with processed routes
  savedState.routes = processedRoutes;

  console.log('[RouteProcessor] Processing complete:', {
    routeCount: processedRoutes.length,
    routes: processedRoutes.map(r => ({
      id: r.id,
      hasGeojson: !!r.geojson,
      featureCount: r.geojson?.features?.length
    })),
    poiCount: savedState.pois.draggable.length + savedState.pois.places.length,
    photoCount: savedState.photos.length
  });

  return { savedState, processedRoutes };
};
