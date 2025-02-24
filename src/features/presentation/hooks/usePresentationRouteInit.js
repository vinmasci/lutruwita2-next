import { useEffect, useState } from 'react';
import { useRouteContext } from '../../map/context/RouteContext';
import { normalizeRoute } from '../../map/utils/routeUtils';
/**
 * Hook specifically for presentation mode route initialization
 * Implements optimizations learned from creation mode without modifying it
 */
export const usePresentationRouteInit = ({ routes, onInitialized }) => {
    const { addRoute, setCurrentRoute } = useRouteContext();
    const [initialized, setInitialized] = useState(false);
    useEffect(() => {
        if (initialized || !routes.length)
            return;
        console.log('[PresentationRouteInit] Starting route initialization');
        // Initialize all routes in a single batch
        const initializeRoutes = () => {
            routes.forEach(route => {
                const normalizedRoute = normalizeRoute(route);
                console.log('[PresentationRouteInit] Adding route:', normalizedRoute.routeId);
                addRoute(normalizedRoute);
            });
            // Set initial route
            console.log('[PresentationRouteInit] Setting initial route');
            setCurrentRoute(routes[0]);
            setInitialized(true);
            onInitialized?.();
        };
        initializeRoutes();
    }, [routes, initialized, addRoute, setCurrentRoute, onInitialized]);
    return {
        initialized,
        reset: () => setInitialized(false)
    };
};
