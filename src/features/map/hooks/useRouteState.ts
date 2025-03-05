import { useCallback, useState, useEffect } from "react";
import { useRouteContext } from "../context/RouteContext";
import { RouteListItem, ProcessedRoute } from "../types/route.types";

interface RouteVisibilityState {
  mainRoute: boolean;
  unpavedSections: boolean;
}

interface SaveRouteOptions {
  name: string;
  type: "tourism" | "event" | "bikepacking" | "single";
  isPublic: boolean;
}

interface UseRouteStateReturn {
  // Current state
  routes: ReturnType<typeof useRouteContext>["routes"];
  currentRoute: ReturnType<typeof useRouteContext>["currentRoute"];
  savedRoutes: RouteListItem[];
  updateRoute: ReturnType<typeof useRouteContext>["updateRoute"];
  
  // Loading states
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Visibility state
  routeVisibility: Record<string, RouteVisibilityState>;
  toggleRouteVisibility: (routeId: string, type: keyof RouteVisibilityState) => void;
  
  // Focus state
  focusRoute: (routeId: string) => void;
  unfocusRoute: (routeId: string) => void;
  getFocusedRoute: () => ProcessedRoute | null;
  
  // Actions
  saveRoute: (options: SaveRouteOptions) => Promise<void>;
  loadRoute: (id: string) => Promise<void>;
  listRoutes: (filters?: { type?: string; isPublic?: boolean }) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useRouteState = (): UseRouteStateReturn => {
  const context = useRouteContext();
  const {
    routes,
    currentRoute,
    savedRoutes,
    isSaving,
    isLoading,
    focusRoute: contextFocusRoute,
    unfocusRoute: contextUnfocusRoute,
    saveCurrentState,
    loadRoute: contextLoadRoute,
    listRoutes: contextListRoutes,
    deleteSavedRoute,
    updateRoute: contextUpdateRoute,
  } = context;

  const [error, setError] = useState<string | null>(null);
  const [routeVisibility, setRouteVisibility] = useState<Record<string, RouteVisibilityState>>({});

  // Get the currently focused route
  const getFocusedRoute = useCallback((): ProcessedRoute | null => {
    return routes.find(route => route.isFocused) || null;
  }, [routes]);

  // Focus a route and unfocus others
  const handleFocusRoute = useCallback((routeId: string) => {
    contextFocusRoute(routeId);
  }, [contextFocusRoute]);

  // Unfocus a route
  const handleUnfocusRoute = useCallback((routeId: string) => {
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

  const toggleRouteVisibility = useCallback((routeId: string, type: keyof RouteVisibilityState) => {
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

  const saveRoute = useCallback(
    async ({ name, type, isPublic }: SaveRouteOptions) => {
      try {
        setError(null);
        await saveCurrentState(name, type, isPublic);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save route";
        setError(errorMessage);
        throw err;
      }
    },
    [saveCurrentState]
  );

  const loadRoute = useCallback(
    async (id: string) => {
      try {
        setError(null);
        await contextLoadRoute(id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load route";
        setError(errorMessage);
        throw err;
      }
    },
    [contextLoadRoute]
  );

  const listRoutes = useCallback(
    async (filters?: { type?: string; isPublic?: boolean }) => {
      try {
        setError(null);
        await contextListRoutes(filters);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to list routes";
        setError(errorMessage);
        throw err;
      }
    },
    [contextListRoutes]
  );

  const deleteRoute = useCallback(
    async (id: string) => {
      try {
        setError(null);
        await deleteSavedRoute(id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete route";
        setError(errorMessage);
        throw err;
      }
    },
    [deleteSavedRoute]
  );

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
