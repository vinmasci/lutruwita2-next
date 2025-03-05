import { useCallback, useState, useEffect } from "react";
import { useRouteContext } from "../context/RouteContext";
export const useRouteState = () => {
    const context = useRouteContext();
    const { routes, currentRoute, savedRoutes, isSaving, isLoading, focusRoute: contextFocusRoute, unfocusRoute: contextUnfocusRoute, saveCurrentState, loadRoute: contextLoadRoute, listRoutes: contextListRoutes, deleteSavedRoute, updateRoute: contextUpdateRoute, } = context;
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
        if (!routes)
            return;
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
        if (!routes)
            return;
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
    const saveRoute = useCallback(async ({ name, type, isPublic }) => {
        try {
            setError(null);
            await saveCurrentState(name, type, isPublic);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to save route";
            setError(errorMessage);
            throw err;
        }
    }, [saveCurrentState]);
    const loadRoute = useCallback(async (id) => {
        try {
            setError(null);
            await contextLoadRoute(id);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to load route";
            setError(errorMessage);
            throw err;
        }
    }, [contextLoadRoute]);
    const listRoutes = useCallback(async (filters) => {
        try {
            setError(null);
            await contextListRoutes(filters);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to list routes";
            setError(errorMessage);
            throw err;
        }
    }, [contextListRoutes]);
    const deleteRoute = useCallback(async (id) => {
        try {
            setError(null);
            await deleteSavedRoute(id);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete route";
            setError(errorMessage);
            throw err;
        }
    }, [deleteSavedRoute]);
    const clearError = useCallback(() => {
        setError(null);
    }, []);
    return {
        // Current state
        routes,
        currentRoute,
        savedRoutes,
        updateRoute: contextUpdateRoute,
        // Loading states
        isSaving,
        isLoading,
        error,
        // Visibility state
        routeVisibility,
        toggleRouteVisibility,
        // Focus state
        focusRoute: handleFocusRoute,
        unfocusRoute: handleUnfocusRoute,
        getFocusedRoute,
        // Actions
        saveRoute,
        loadRoute,
        listRoutes,
        deleteRoute,
        clearError,
    };
};
