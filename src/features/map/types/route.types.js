export const normalizeRoute = (route) => {
    return {
        ...route,
        routeId: route.routeId || `route-${route.id}`
    };
};
