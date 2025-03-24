import { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Create a context for the embed view that mimics the RouteContext
const EmbedRouteContext = createContext(null);

/**
 * Provider component for the EmbedRouteContext
 * This is a simplified version of RouteProvider that doesn't depend on the actual RouteContext
 */
export const EmbedRouteProvider = ({ children, initialRoutes = [], initialCurrentRoute = null }) => {
    // State for routes and current route
    const [routes, setRoutes] = useState(initialRoutes);
    const [currentRoute, setCurrentRoute] = useState(initialCurrentRoute);
    
    // Focus/unfocus route functionality
    const focusRoute = useCallback((routeId) => {
        setRoutes(prev => prev.map(route => ({
            ...route,
            isFocused: route.routeId === routeId || route.id === routeId
        })));
    }, []);
    
    const unfocusRoute = useCallback((routeId) => {
        setRoutes(prev => prev.map(route => ({
            ...route,
            isFocused: (route.routeId === routeId || route.id === routeId) ? false : route.isFocused
        })));
    }, []);
    
    // Update route functionality
    const updateRoute = useCallback((routeId, updates) => {
        setRoutes(prev => prev.map(route => {
            if (route.routeId === routeId || route.id === routeId) {
                return {
                    ...route,
                    ...updates
                };
            }
            return route;
        }));
    }, []);
    
    // Reorder routes functionality
    const reorderRoutes = useCallback((oldIndex, newIndex) => {
        setRoutes(prev => {
            const newRoutes = [...prev];
            const [movedRoute] = newRoutes.splice(oldIndex, 1);
            newRoutes.splice(newIndex, 0, movedRoute);
            
            // Update order field for all routes
            return newRoutes.map((route, i) => ({
                ...route,
                order: i
            }));
        });
    }, []);
    
    // Create the context value with all necessary properties and functions
    const contextValue = useMemo(() => ({
        // Current state
        routes,
        currentRoute,
        setCurrentRoute,
        
        // Route operations
        focusRoute,
        unfocusRoute,
        updateRoute,
        reorderRoutes,
        
        // Add/delete operations (simplified for embed view)
        addRoute: (route) => setRoutes(prev => [...prev, route]),
        deleteRoute: (routeId) => setRoutes(prev => prev.filter(r => r.routeId !== routeId && r.id !== routeId)),
        
        // Saved routes state (empty for embed view)
        savedRoutes: [],
        isSaving: false,
        isLoading: false,
        isLoadedMap: true,
        currentLoadedState: null,
        currentLoadedPersistentId: null,
        hasUnsavedChanges: false,
        
        // Change tracking (no-op for embed view)
        setChangedSections: () => {},
        
        // Save/Load operations (no-op for embed view)
        saveCurrentState: () => {},
        loadRoute: () => {},
        listRoutes: () => {},
        deleteSavedRoute: () => {},
        clearCurrentWork: () => {},
        pendingRouteBounds: null,
        
        // Header settings
        headerSettings: {},
        updateHeaderSettings: () => {},
        
        // Line data
        loadedLineData: []
    }), [
        routes, 
        currentRoute, 
        setCurrentRoute, 
        focusRoute, 
        unfocusRoute, 
        updateRoute, 
        reorderRoutes
    ]);
    
    return (
        <EmbedRouteContext.Provider value={contextValue}>
            {children}
        </EmbedRouteContext.Provider>
    );
};

/**
 * Hook to use the EmbedRouteContext
 * This mimics the useRouteContext hook but uses the EmbedRouteContext instead
 */
export const useEmbedRouteContext = () => {
    const context = useContext(EmbedRouteContext);
    if (!context) {
        throw new Error('useEmbedRouteContext must be used within an EmbedRouteProvider');
    }
    return context;
};

export default EmbedRouteContext;
