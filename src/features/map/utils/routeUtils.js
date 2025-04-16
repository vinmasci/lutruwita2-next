const createDefaultRoute = (id) => ({
    _type: 'fresh',
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
    },
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
    },
    unpavedSections: []
});
const isGpxProcessedRoute = (route) => {
    return 'id' in route && 'geojson' in route && !('routes' in route);
};
const isSavedRouteState = (route) => {
    return 'routes' in route && Array.isArray(route.routes);
};
// Type guard for surface type
const isValidSurfaceType = (type) => {
    return type === 'unpaved' || type === 'gravel' || type === 'trail';
};
export const normalizeRoute = (route) => {
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
        
        // Ensure type, eventDate, and isPublic are properly copied from the top-level route object
        // This fixes the issue where the save modal doesn't remember these values
        return {
            ...defaultRoute,
            ...firstRoute,
            _type: 'loaded',
            _loadedState: route,
            routeId: firstRoute.routeId || defaultRoute.routeId,
            color: firstRoute.color || defaultRoute.color,
            isVisible: firstRoute.isVisible ?? defaultRoute.isVisible,
            gpxData: firstRoute.gpxData || defaultRoute.gpxData,
            rawGpx: firstRoute.rawGpx || defaultRoute.rawGpx,
            geojson: firstRoute.geojson || defaultRoute.geojson,
            // Explicitly copy these fields from the top-level route object
            type: route.type || firstRoute.type || 'tourism',
            isPublic: route.isPublic !== undefined ? route.isPublic : (firstRoute.isPublic !== undefined ? firstRoute.isPublic : true),
            eventDate: route.eventDate || firstRoute.eventDate || null,
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
            _type: 'fresh',
            routeId: route.routeId || defaultRoute.routeId,
            color: route.color || defaultRoute.color,
            isVisible: route.isVisible ?? defaultRoute.isVisible,
            gpxData: route.gpxData || defaultRoute.gpxData,
            rawGpx: route.rawGpx || defaultRoute.rawGpx,
            geojson: route.geojson || defaultRoute.geojson,
            // Ensure type, isPublic, and eventDate are explicitly set for fresh routes as well
            type: route.type || 'tourism',
            isPublic: route.isPublic !== undefined ? route.isPublic : true,
            eventDate: route.eventDate || null,
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
export const getRouteDistance = (route) => {
    return route.statistics?.totalDistance || 0;
};
