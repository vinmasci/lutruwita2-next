import { useState, useEffect, useRef } from 'react';
import { useEmbedRouteContext } from '../context/EmbedRouteContext.jsx';

/**
 * Normalizes a route object to ensure consistent structure across all modes
 * This is a copy of the normalizeRoute function from useUnifiedRouteProcessing
 * @param {Object} route - The route object to normalize
 * @returns {Object} - The normalized route object
 */
export const normalizeRoute = (route) => {
    // Ensure route has a unique ID
    const routeId = route.routeId || route.id || `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine the route type
    const routeType = route._type || (route._loadedState ? 'loaded' : 'fresh');
    
    // Create a normalized route object
    return {
        ...route,
        routeId,
        _type: routeType,
        // Ensure other required properties exist
        color: route.color || '#ee5253',
        name: route.name || 'Untitled Route',
        // Add any other required properties
    };
};

/**
 * A modified version of useUnifiedRouteProcessing for the embed view
 * This uses useEmbedRouteContext instead of useRouteContext
 * @param {Array} routes - Array of route objects to process
 * @param {Object} options - Configuration options
 * @param {Function} options.onInitialized - Callback function to run after initialization
 * @param {boolean} options.batchProcess - Whether to process routes in a batch (default: true)
 * @returns {Object} - Initialization state and reset function
 */
const useEmbedRouteProcessing = (routes, options = {}) => {
    const { addRoute, setCurrentRoute } = useEmbedRouteContext();
    const [initialized, setInitialized] = useState(false);
    const { onInitialized, batchProcess = true } = options;
    
    // Use a ref to track the routes that have been processed
    const processedRoutesRef = useRef(new Set());
    
    // Use a ref to track the previous routes array length
    const prevRoutesLengthRef = useRef(0);
    
    // Use a ref to track if initialization is in progress
    const initializingRef = useRef(false);

    useEffect(() => {
        // Skip if already initialized or no routes
        if (initialized || !routes.length) return;
        
        // Skip if initialization is already in progress
        if (initializingRef.current) return;
        
        // Skip if the routes array hasn't changed
        if (prevRoutesLengthRef.current === routes.length && 
            routes.every(route => processedRoutesRef.current.has(route.routeId || route.id))) {
            return;
        }
        
        // Set initializing flag
        initializingRef.current = true;
        
        // Process all routes in a single batch
        const processRoutes = () => {
            console.log('[useEmbedRouteProcessing] Processing routes:', routes.length);
            
            // Process routes in a batch to avoid multiple re-renders
            const processedRoutes = routes.map(route => normalizeRoute(route));
            
            // Track which routes we've already processed
            const routeIdsToProcess = new Set();
            const routesToProcess = [];
            
            // Filter out routes that have already been processed
            processedRoutes.forEach(route => {
                const routeId = route.routeId || route.id;
                if (!processedRoutesRef.current.has(routeId)) {
                    routeIdsToProcess.add(routeId);
                    routesToProcess.push(route);
                }
            });
            
            if (routesToProcess.length === 0) {
                console.log('[useEmbedRouteProcessing] No new routes to process');
                setInitialized(true);
                initializingRef.current = false;
                onInitialized?.();
                return;
            }
            
            console.log('[useEmbedRouteProcessing] Processing new routes:', routesToProcess.length);
            
            if (batchProcess) {
                // Batch process all routes at once
                routesToProcess.forEach(route => {
                    const routeId = route.routeId || route.id;
                    addRoute(route);
                    processedRoutesRef.current.add(routeId);
                });
                
                // Set initial route if we haven't set one yet
                if (!processedRoutesRef.current.has(processedRoutes[0].routeId || processedRoutes[0].id)) {
                    setCurrentRoute(processedRoutes[0]);
                }
            } else {
                // Process routes one by one (for backward compatibility)
                routesToProcess.forEach((route, index) => {
                    const routeId = route.routeId || route.id;
                    addRoute(route);
                    processedRoutesRef.current.add(routeId);
                    
                    // Set the first route as current if we haven't set one yet
                    if (index === 0 && !processedRoutesRef.current.has(processedRoutes[0].routeId || processedRoutes[0].id)) {
                        setCurrentRoute(route);
                    }
                });
            }
            
            // Update the previous routes length
            prevRoutesLengthRef.current = routes.length;
            
            // Mark as initialized
            setInitialized(true);
            initializingRef.current = false;
            onInitialized?.();
        };
        
        processRoutes();
    }, [routes, initialized, addRoute, setCurrentRoute, onInitialized, batchProcess]);

    // Reset function that clears the processed routes set
    const reset = () => {
        processedRoutesRef.current.clear();
        prevRoutesLengthRef.current = 0;
        initializingRef.current = false;
        setInitialized(false);
    };

    return {
        initialized,
        reset
    };
};

export default useEmbedRouteProcessing;
