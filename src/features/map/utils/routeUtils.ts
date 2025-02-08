import { ProcessedRoute, SavedRouteState } from '../types/route.types';
import type { ProcessedRoute as GpxProcessedRoute } from '../../gpx/types/gpx.types';
import type { FeatureCollection } from 'geojson';

const createDefaultRoute = (id: string): ProcessedRoute => ({
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
    processingState: 'completed',
    progress: 100
  }
});

const isGpxProcessedRoute = (route: any): route is GpxProcessedRoute => {
  return 'id' in route && 'geojson' in route && !('routes' in route);
};

const isSavedRouteState = (route: any): route is SavedRouteState => {
  return 'routes' in route && Array.isArray(route.routes);
};

export const normalizeRoute = (route: GpxProcessedRoute | SavedRouteState): ProcessedRoute => {
  // Handle saved route state
  if (isSavedRouteState(route)) {
    const firstRoute = route.routes[0];
    if (!firstRoute) {
      throw new Error('No route found in saved state');
    }

    const defaultRoute = createDefaultRoute(firstRoute.id);
    return {
      ...defaultRoute,
      ...firstRoute,
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
        ...firstRoute.status
      }
    };
  }

  // Handle fresh route
  if (isGpxProcessedRoute(route)) {
    const defaultRoute = createDefaultRoute(route.id);
    return {
      ...defaultRoute,
      ...route,
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
        ...route.status
      }
    };
  }

  throw new Error('Invalid route format');
};

export const getRouteDistance = (route: ProcessedRoute): number => {
  return route.statistics?.totalDistance || 0;
};
