import { ProcessedRoute, SavedRouteState } from '../types/route.types';
import type { ProcessedRoute as GpxProcessedRoute } from '../../gpx/types/gpx.types';
import type { FeatureCollection } from 'geojson';

const createDefaultRoute = (id: string): ProcessedRoute => ({
  _type: 'fresh' as const,
  id,
  routeId: `route-${id}`,
  name: '',
  color: '#000000',
  isVisible: true,
  gpxData: '',
  rawGpx: '',
  geojson: {
    type: 'FeatureCollection',
    features: []
  } as FeatureCollection,
  statistics: {
    totalDistance: 0,
    elevationGain: 0,
    elevationLoss: 0,
    maxElevation: 0,
    minElevation: 0,
    averageSpeed: 0,
    movingTime: 0,
    totalTime: 0
  },
  status: {
    processingState: 'completed' as const,
    progress: 100
  },
  unpavedSections: []
});

const isGpxProcessedRoute = (route: any): route is GpxProcessedRoute => {
  return 'id' in route && 'geojson' in route && !('routes' in route);
};

const isSavedRouteState = (route: any): route is SavedRouteState => {
  return 'routes' in route && Array.isArray(route.routes);
};

// Type guard for surface type
const isValidSurfaceType = (type: string): type is 'unpaved' | 'gravel' | 'trail' => {
  return type === 'unpaved' || type === 'gravel' || type === 'trail';
};

export const normalizeRoute = (route: GpxProcessedRoute | SavedRouteState): ProcessedRoute => {
  // Handle saved route state
  if (isSavedRouteState(route)) {
    const firstRoute = route.routes[0];
    if (!firstRoute) {
      throw new Error('No route found in saved state');
    }

    const defaultRoute = createDefaultRoute(firstRoute.id);
    const unpavedSections = firstRoute.unpavedSections?.map(section => ({
      startIndex: section.startIndex,
      endIndex: section.endIndex,
      coordinates: section.coordinates,
      surfaceType: isValidSurfaceType(section.surfaceType) ? section.surfaceType : 'unpaved'
    })) || [];

    // Log the route data for debugging
    console.log('[normalizeRoute] Route data:', {
      routeId: firstRoute.routeId,
      persistentId: route.persistentId,
      hasLoadedState: !!route
    });

    return {
      ...defaultRoute,
      ...firstRoute,
      _type: 'loaded' as const,
      // Ensure persistentId is set on the route object
      persistentId: route.persistentId,
      // Ensure _loadedState has the persistentId
      _loadedState: {
        ...route,
        persistentId: route.persistentId
      },
      routeId: firstRoute.routeId || defaultRoute.routeId,
      color: firstRoute.color || defaultRoute.color,
      isVisible: firstRoute.isVisible ?? defaultRoute.isVisible,
      gpxData: firstRoute.gpxData || defaultRoute.gpxData,
      rawGpx: firstRoute.rawGpx || defaultRoute.rawGpx,
      geojson: firstRoute.geojson || defaultRoute.geojson,
      statistics: {
        ...defaultRoute.statistics,
        ...firstRoute.statistics
      },
      status: {
        ...defaultRoute.status,
        ...firstRoute.status,
        processingState: firstRoute.status?.processingState || 'completed'
      },
      unpavedSections
    };
  }

  // Handle fresh route
  if (isGpxProcessedRoute(route)) {
    const defaultRoute = createDefaultRoute(route.id);
    const unpavedSections = route.unpavedSections?.map(section => ({
      startIndex: section.startIndex,
      endIndex: section.endIndex,
      coordinates: section.coordinates,
      surfaceType: isValidSurfaceType(section.surfaceType) ? section.surfaceType : 'unpaved'
    })) || [];

    return {
      ...defaultRoute,
      ...route,
      _type: 'fresh' as const,
      routeId: route.routeId || defaultRoute.routeId,
      color: route.color || defaultRoute.color,
      isVisible: route.isVisible ?? defaultRoute.isVisible,
      gpxData: route.gpxData || defaultRoute.gpxData,
      rawGpx: route.rawGpx || defaultRoute.rawGpx,
      geojson: route.geojson || defaultRoute.geojson,
      statistics: {
        ...defaultRoute.statistics,
        ...route.statistics
      },
      status: {
        ...defaultRoute.status,
        ...route.status,
        processingState: route.status?.processingState || 'completed'
      },
      unpavedSections
    };
  }

  throw new Error('Invalid route format');
};

export const getRouteDistance = (route: ProcessedRoute): number => {
  return route.statistics?.totalDistance || 0;
};
