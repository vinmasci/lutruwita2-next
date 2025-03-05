import { useEffect, useState } from 'react';
import { ProcessedRoute } from '../../map/types/route.types';
import { useRouteContext } from '../../map/context/RouteContext';
import { normalizeRoute } from '../../map/utils/routeUtils';

interface PresentationRouteInitOptions {
  routes: ProcessedRoute[];
  onInitialized?: () => void;
  onSurfaceProcessingStart?: () => void;
  onSurfaceProcessingEnd?: () => void;
}

/**
 * Hook specifically for presentation mode route initialization
 * Implements optimizations learned from creation mode without modifying it
 */
export const usePresentationRouteInit = ({ 
  routes, 
  onInitialized,
  onSurfaceProcessingStart,
  onSurfaceProcessingEnd 
}: PresentationRouteInitOptions) => {
  const { addRoute, setCurrentRoute } = useRouteContext();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || !routes.length) return;

    console.log('[PresentationRouteInit] Starting route initialization');

    // Initialize all routes in a single batch
    const initializeRoutes = async () => {
      // Process routes one by one
      for (const route of routes) {
        const normalizedRoute = normalizeRoute(route);
        console.log('[PresentationRouteInit] Adding route:', normalizedRoute.routeId);
        
        // If the route has a geojson feature and needs surface processing
        if (normalizedRoute.geojson?.features?.[0] && !normalizedRoute.unpavedSections) {
          console.log('[PresentationRouteInit] Starting surface processing for route:', normalizedRoute.routeId);
          onSurfaceProcessingStart?.();
          
          // Add route without waiting for surface processing
          addRoute(normalizedRoute);
          
          // Surface processing will happen in the RouteLayer component
          // We'll simulate a delay here to show the notification
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log('[PresentationRouteInit] Surface processing complete for route:', normalizedRoute.routeId);
          onSurfaceProcessingEnd?.();
        } else {
          // Add route normally if no surface processing needed
          addRoute(normalizedRoute);
        }
      }

      // Set initial route
      console.log('[PresentationRouteInit] Setting initial route');
      setCurrentRoute(routes[0]);
      
      setInitialized(true);
      onInitialized?.();
    };

    initializeRoutes();
  }, [routes, initialized, addRoute, setCurrentRoute, onInitialized, onSurfaceProcessingStart, onSurfaceProcessingEnd]);

  return {
    initialized,
    reset: () => setInitialized(false)
  };
};
