import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useFirebaseRouteService } from '../services/firebaseRouteService';
import { useAuthenticatedRouteService } from '../services/authenticatedRouteService';
import { useAuth } from './AuthContext';
import { RouteMap } from '../services/routeService';

// Context type definition
interface SavedRoutesContextType {
  savedRoutes: RouteMap[];
  isLoading: boolean;
  error: string | null;
  saveRoute: (route: RouteMap) => Promise<boolean>;
  removeRoute: (routeId: string) => Promise<boolean>;
  isRouteSaved: (routeId: string) => boolean;
  refreshSavedRoutes: () => Promise<void>;
  clearSavedRoutes: () => Promise<void>;
}

// Create context
const SavedRoutesContext = createContext<SavedRoutesContextType | undefined>(undefined);

// Provider component
export const SavedRoutesProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [savedRoutes, setSavedRoutes] = useState<RouteMap[]>([]);
  const [savedRouteIds, setSavedRouteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();
  const firebaseRouteService = useFirebaseRouteService();
  const authenticatedRouteService = useAuthenticatedRouteService();

  // Initialize by loading routes from Firebase
  useEffect(() => {
    const initialize = async () => {
      if (isAuthenticated) {
        await loadSavedRoutesFromFirebase();
      }
      setIsInitialized(true);
    };
    initialize();
  }, [isAuthenticated]);

  // Load saved routes from Firebase
  const loadSavedRoutesFromFirebase = async () => {
    if (!isAuthenticated) {
      console.log('[SavedRoutesContext] Not authenticated, cannot load routes from Firebase');
      setSavedRoutes([]);
      setSavedRouteIds([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[SavedRoutesContext] Loading route IDs from Firebase');
      const routeIds = await firebaseRouteService.listSavedRoutes();
      
      console.log(`[SavedRoutesContext] Found ${routeIds.length} saved route IDs in Firebase`);
      setSavedRouteIds(routeIds);
      
      if (routeIds.length === 0) {
        setSavedRoutes([]);
        setIsLoading(false);
        return;
      }
      
      // Load route details for each saved route ID
      console.log('[SavedRoutesContext] Loading route details');
      const routeDetails: RouteMap[] = [];
      
      for (const routeId of routeIds) {
        try {
          const route = await authenticatedRouteService.loadUserRoute(routeId);
          if (route) {
            routeDetails.push(route);
          }
        } catch (error) {
          console.error(`Error loading route ${routeId}:`, error);
        }
      }
      
      console.log(`[SavedRoutesContext] Loaded ${routeDetails.length} route details`);
      setSavedRoutes(routeDetails);
    } catch (error) {
      console.error('Error loading routes from Firebase:', error);
      setError('Failed to load saved routes from Firebase');
      
      // Reset state on error
      setSavedRoutes([]);
      setSavedRouteIds([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh saved routes
  const refreshSavedRoutes = async () => {
    if (!isAuthenticated) {
      console.log('[SavedRoutesContext] Not authenticated, cannot refresh routes');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[SavedRoutesContext] Refreshing saved routes from Firebase');
      await loadSavedRoutesFromFirebase();
      console.log('[SavedRoutesContext] Refresh complete');
    } catch (error) {
      console.error('Error refreshing saved routes:', error);
      setError('Failed to refresh saved routes');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if a route is saved
  const isRouteSaved = useCallback((routeId: string): boolean => {
    return savedRouteIds.includes(routeId);
  }, [savedRouteIds]);

  // Save a route
  const saveRoute = async (route: RouteMap): Promise<boolean> => {
    try {
      // Check if already saved
      if (savedRouteIds.includes(route.persistentId)) {
        console.log(`[SavedRoutesContext] Route ${route.persistentId} already saved, skipping`);
        return true;
      }
      
      console.log(`[SavedRoutesContext] Saving route ${route.persistentId}`);
      
      if (!isAuthenticated) {
        console.log(`[SavedRoutesContext] Not authenticated, cannot save route to Firebase`);
        setError('Authentication required to save routes');
        return false;
      }
      
      try {
        console.log(`[SavedRoutesContext] Saving route ${route.persistentId} to Firebase`);
        await firebaseRouteService.saveRoute(route.persistentId);
        console.log(`[SavedRoutesContext] Successfully saved route ${route.persistentId} to Firebase`);
        
        // Update state immediately for UI responsiveness
        setSavedRouteIds(prev => [...prev, route.persistentId]);
        setSavedRoutes(prev => [...prev, route]);
        
        return true;
      } catch (error: any) {
        console.error('Error saving route to Firebase:', error);
        setError(`Failed to save route to Firebase: ${error.message || 'Unknown error'}`);
        return false;
      }
    } catch (error: any) {
      console.error('Error saving route:', error);
      setError(`Failed to save route: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  // Remove a saved route
  const removeRoute = async (routeId: string): Promise<boolean> => {
    try {
      // Check if route is saved
      if (!savedRouteIds.includes(routeId)) {
        console.log(`[SavedRoutesContext] Route ${routeId} not in saved routes, nothing to remove`);
        return true;
      }
      
      console.log(`[SavedRoutesContext] Removing route ${routeId}`);
      
      if (!isAuthenticated) {
        console.log(`[SavedRoutesContext] Not authenticated, cannot remove route from Firebase`);
        setError('Authentication required to remove routes');
        return false;
      }
      
      try {
        console.log(`[SavedRoutesContext] Removing route ${routeId} from Firebase`);
        await firebaseRouteService.removeRoute(routeId);
        console.log(`[SavedRoutesContext] Successfully removed route ${routeId} from Firebase`);
        
        // Check if this is the last route
        const isLastRoute = savedRouteIds.length === 1;
        
        // Update state immediately for UI responsiveness
        setSavedRouteIds(prev => prev.filter(id => id !== routeId));
        setSavedRoutes(prev => prev.filter(route => route.persistentId !== routeId));
        
        // If this was the last route, force a complete refresh to ensure UI updates correctly
        if (isLastRoute) {
          console.log('[SavedRoutesContext] Last route removed, forcing complete refresh');
          // Small delay to ensure Firebase operation completes
          setTimeout(() => {
            loadSavedRoutesFromFirebase();
          }, 300);
        }
        
        return true;
      } catch (error: any) {
        console.error('Error removing route from Firebase:', error);
        setError(`Failed to remove route from Firebase: ${error.message || 'Unknown error'}`);
        return false;
      }
    } catch (error: any) {
      console.error('Error removing route:', error);
      setError(`Failed to remove route: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  // Clear all saved routes
  const clearSavedRoutes = async () => {
    try {
      console.log('[SavedRoutesContext] Clearing all saved routes');
      setIsLoading(true);
      
      if (!isAuthenticated) {
        console.log(`[SavedRoutesContext] Not authenticated, cannot clear routes from Firebase`);
        setError('Authentication required to clear routes');
        return;
      }
      
      // Remove each route from Firebase
      for (const routeId of savedRouteIds) {
        try {
          console.log(`[SavedRoutesContext] Removing route ${routeId} from Firebase`);
          await firebaseRouteService.removeRoute(routeId);
        } catch (error) {
          console.error(`[SavedRoutesContext] Error removing route ${routeId}:`, error);
          // Continue with other routes
        }
      }
      
      // Reset state
      setSavedRouteIds([]);
      setSavedRoutes([]);
      
      console.log('[SavedRoutesContext] Successfully cleared all saved routes');
    } catch (error) {
      console.error('Error clearing saved routes:', error);
      setError('Failed to clear saved routes');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SavedRoutesContext.Provider
      value={{
        savedRoutes,
        isLoading,
        error,
        saveRoute,
        removeRoute,
        isRouteSaved,
        refreshSavedRoutes,
        clearSavedRoutes
      }}
    >
      {children}
    </SavedRoutesContext.Provider>
  );
};

// Hook to use the saved routes context
export const useSavedRoutes = () => {
  const context = useContext(SavedRoutesContext);
  if (context === undefined) {
    throw new Error('useSavedRoutes must be used within a SavedRoutesProvider');
  }
  return context;
};
