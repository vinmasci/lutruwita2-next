import { useCallback, useState } from "react";
import { useRouteContext } from "../context/RouteContext";
import { RouteListItem } from "../types/route.types";

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
  
  // Loading states
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  saveRoute: (options: SaveRouteOptions) => Promise<void>;
  loadRoute: (id: string) => Promise<void>;
  listRoutes: (filters?: { type?: string; isPublic?: boolean }) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useRouteState = (): UseRouteStateReturn => {
  const {
    routes,
    currentRoute,
    savedRoutes,
    isSaving,
    isLoading,
    saveCurrentState,
    loadRoute: contextLoadRoute,
    listRoutes: contextListRoutes,
    deleteSavedRoute,
  } = useRouteContext();

  const [error, setError] = useState<string | null>(null);

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
    
    // Loading states
    isSaving,
    isLoading,
    error,
    
    // Actions
    saveRoute,
    loadRoute,
    listRoutes,
    deleteRoute,
    clearError,
  };
};
