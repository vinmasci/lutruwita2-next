import { useCallback, useState, useEffect } from "react";
import { useEmbedRouteContext } from "../context/EmbedRouteContext.jsx";

/**
 * A hook that provides route state management for the embed view
 * This is a replacement for useRouteState that uses EmbedRouteContext instead of RouteContext
 */
export const useEmbedRouteState = () => {
    // Use the EmbedRouteContext instead of RouteContext
    const context = useEmbedRouteContext();
    const { 
        routes, 
        currentRoute, 
        focusRoute: contextFocusRoute, 
        unfocusRoute: contextUnfocusRoute,
        updateRoute: contextUpdateRoute
    } = context;
    
    const [error, setError] = useState(null);
    const [routeVisibility, setRouteVisibility] = useState({});
    
    // Get the currently focused route
    const getFocusedRoute = useCallback(() => {
        return routes.find(route => route.isFocused) || null;
    }, [routes]);
    
    // Focus a route and unfocus others
    const handleFocusRoute = useCallback((routeId) => {
        contextFocusRoute(routeId);
    }, [contextFocusRoute]);
    
    // Unfocus a route
    const handleUnfocusRoute = useCallback((routeId) => {
        contextUnfocusRoute(routeId);
    }, [contextUnfocusRoute]);
    
    // Initialize visibility state for new routes
    useEffect(() => {
        if (!routes) return;
        
        setRouteVisibility(prev => {
            const newVisibility = { ...prev };
            routes.forEach(route => {
                const routeId = route.routeId || route.id;
                // Always set visibility state for loaded routes
                if (route._type === 'loaded' || !newVisibility[routeId]) {
                    newVisibility[routeId] = {
                        mainRoute: true,
                        unpavedSections: true
                    };
                }
            });
            return newVisibility;
        });
    }, [routes]);
    
    // Only reset visibility for routes that no longer exist
    useEffect(() => {
        if (!routes) return;
        
        setRouteVisibility(prev => {
            const newVisibility = { ...prev };
            // Remove visibility state for routes that no longer exist
            Object.keys(newVisibility).forEach(routeId => {
                if (!routes.some(route => (route.routeId || route.id) === routeId)) {
                    delete newVisibility[routeId];
                }
            });
            return newVisibility;
        });
    }, [routes]);
    
    // Toggle route visibility
    const toggleRouteVisibility = useCallback((routeId, type) => {
        setRouteVisibility(prev => {
            const newState = { ...prev };
            if (!newState[routeId]) {
                newState[routeId] = { mainRoute: true, unpavedSections: true };
            }
            newState[routeId] = {
                ...newState[routeId],
                [type]: !newState[routeId][type]
            };
            return newState;
        });
    }, []);
    
    // Initialize route visibility for a specific set of routes
    const initializeRouteVisibility = useCallback((routesToInitialize) => {
        if (!routesToInitialize) return;
        
        setRouteVisibility(prev => {
            const newVisibility = { ...prev };
            routesToInitialize.forEach(route => {
                const routeId = route.routeId || route.id;
                if (!newVisibility[routeId]) {
                    newVisibility[routeId] = {
                        mainRoute: true,
                        unpavedSections: true
                    };
                }
            });
            return newVisibility;
        });
    }, []);
    
    return {
        // Current state
        routes,
        currentRoute,
        updateRoute: contextUpdateRoute,
        
        // Loading states
        isSaving: false,
        isLoading: false,
        error,
        
        // Visibility state
        routeVisibility,
        toggleRouteVisibility,
        initializeRouteVisibility,
        
        // Focus state
        focusRoute: handleFocusRoute,
        unfocusRoute: handleUnfocusRoute,
        getFocusedRoute,
        
        // Actions - simplified for embed view
        saveRoute: () => {},
        loadRoute: () => {},
        listRoutes: () => {},
        deleteRoute: () => {},
        clearError: () => setError(null),
    };
};

export default useEmbedRouteState;
