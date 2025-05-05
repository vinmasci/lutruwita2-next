import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteMap } from '../services/routeService';
import { useAuthenticatedRouteService } from '../services/authenticatedRouteService';
import { useAuth } from './AuthContext';

// No more AsyncStorage keys since we're not caching

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
  const authenticatedRouteService = useAuthenticatedRouteService();

  // Initialize by loading routes from server
  useEffect(() => {
    const initialize = async () => {
      if (isAuthenticated) {
        await loadSavedRoutesFromServer();
      }
      setIsInitialized(true);
    };
    initialize();
  }, [isAuthenticated]);

  // Load saved routes directly from server
  const loadSavedRoutesFromServer = async () => {
    if (!isAuthenticated) {
      console.log('[SavedRoutesContext] Not authenticated, cannot load routes from server');
      setSavedRoutes([]);
      setSavedRouteIds([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[SavedRoutesContext] Loading routes from server');
      const serverRoutes = await authenticatedRouteService.listUserRoutes();
      
      // Get route IDs
      const serverRouteIds = serverRoutes.map(route => route.persistentId);
      
      // Update state
      console.log(`[SavedRoutesContext] Setting ${serverRouteIds.length} saved route IDs from server`);
      setSavedRouteIds(serverRouteIds);
      
      console.log(`[SavedRoutesContext] Setting ${serverRoutes.length} saved routes from server`);
      setSavedRoutes(serverRoutes);
    } catch (error) {
      console.error('Error loading routes from server:', error);
      setError('Failed to load saved routes from server');
      
      // Reset state on error
      setSavedRoutes([]);
      setSavedRouteIds([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh saved routes - just reload from server
  const refreshSavedRoutes = async () => {
    if (!isAuthenticated) {
      console.log('[SavedRoutesContext] Not authenticated, cannot refresh routes');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[SavedRoutesContext] Refreshing saved routes from server');
      await loadSavedRoutesFromServer();
      console.log('[SavedRoutesContext] Refresh complete');
    } catch (error) {
      console.error('Error refreshing saved routes:', error);
      setError('Failed to refresh saved routes');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if a route is saved - memoized to prevent unnecessary re-renders
  const isRouteSaved = useCallback((routeId: string): boolean => {
    // Add extra logging to debug the issue
    console.log(`[SavedRoutesContext] Checking if route ${routeId} is saved`);
    console.log(`[SavedRoutesContext] Current savedRouteIds:`, savedRouteIds);
    
    // Make sure we're working with a clean array of IDs
    const cleanSavedRouteIds = savedRouteIds.filter(id => id && id.trim() !== '');
    
    // Check if the route ID is in the cleaned array
    const isSaved = cleanSavedRouteIds.includes(routeId);
    console.log(`[SavedRoutesContext] Route ${routeId} is ${isSaved ? 'saved' : 'not saved'}`);
    
    return isSaved;
  }, [savedRouteIds]);

  // Save a route - only to server
  const saveRoute = async (route: RouteMap): Promise<boolean> => {
    try {
      // Check if already saved
      if (savedRouteIds.includes(route.persistentId)) {
        console.log(`[SavedRoutesContext] Route ${route.persistentId} already saved, skipping`);
        return true;
      }
      
      console.log(`[SavedRoutesContext] Saving route ${route.persistentId}`);
      
      if (!isAuthenticated) {
        console.log(`[SavedRoutesContext] Not authenticated, cannot save route to server`);
        setError('Authentication required to save routes');
        return false;
      }
      
      try {
        console.log(`[SavedRoutesContext] Saving route ${route.persistentId} to server`);
        await authenticatedRouteService.saveRoute(route.persistentId);
        console.log(`[SavedRoutesContext] Successfully saved route ${route.persistentId} to server`);
        
        // Update state immediately for UI responsiveness
        setSavedRouteIds(prev => [...prev, route.persistentId]);
        setSavedRoutes(prev => [...prev, route]);
        
        // Refresh from server to ensure consistency
        await loadSavedRoutesFromServer();
        
        console.log(`[SavedRoutesContext] Successfully saved route ${route.persistentId}`);
        return true;
      } catch (error: any) {
        console.error('Error saving route to server:', error);
        
        // If it's a 405 error, it might be an API configuration issue
        if (error.message && error.message.includes('405')) {
          console.warn('[SavedRoutesContext] API returned 405 Method Not Allowed - this is likely an API configuration issue');
          console.error('[SavedRoutesContext] CRITICAL ERROR: Cannot save route to server due to 405 Method Not Allowed');
          setError('Failed to save route to server: API configuration issue (405 Method Not Allowed)');
          return false;
        } else {
          setError(`Failed to save route to server: ${error.message || 'Unknown error'}`);
          return false;
        }
      }
    } catch (error: any) {
      console.error('Error saving route:', error);
      setError(`Failed to save route: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  // Remove a saved route - only from server
  const removeRoute = async (routeId: string): Promise<boolean> => {
    try {
      // Check if route is saved
      if (!savedRouteIds.includes(routeId)) {
        console.log(`[SavedRoutesContext] Route ${routeId} not in saved routes, nothing to remove`);
        return true;
      }
      
      console.log(`[SavedRoutesContext] Removing route ${routeId}`);
      
      if (!isAuthenticated) {
        console.log(`[SavedRoutesContext] Not authenticated, cannot remove route from server`);
        setError('Authentication required to remove routes');
        return false;
      }
      
      try {
        console.log(`[SavedRoutesContext] Removing route ${routeId} from server`);
        await authenticatedRouteService.removeRoute(routeId);
        console.log(`[SavedRoutesContext] Successfully removed route ${routeId} from server`);
        
        // Update state immediately for UI responsiveness
        setSavedRouteIds(prev => prev.filter(id => id !== routeId));
        setSavedRoutes(prev => prev.filter(route => route.persistentId !== routeId));
        
        // Refresh from server to ensure consistency
        await loadSavedRoutesFromServer();
        
        console.log(`[SavedRoutesContext] Successfully unsaved route ${routeId}`);
        return true;
      } catch (error: any) {
        console.error('Error removing route from server:', error);
        
        // If it's a 405 error, it might be an API configuration issue
        if (error.message && error.message.includes('405')) {
          console.warn('[SavedRoutesContext] API returned 405 Method Not Allowed - this is likely an API configuration issue');
          console.error('[SavedRoutesContext] CRITICAL ERROR: Cannot remove route from server due to 405 Method Not Allowed');
          setError('Failed to remove route from server: API configuration issue (405 Method Not Allowed)');
          return false;
        } else {
          setError(`Failed to remove route from server: ${error.message || 'Unknown error'}`);
          return false;
        }
      }
    } catch (error: any) {
      console.error('Error removing route:', error);
      setError(`Failed to remove route: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  // Clear all saved routes - only from server
  const clearSavedRoutes = async () => {
    try {
      console.log('[SavedRoutesContext] Clearing all saved routes');
      setIsLoading(true);
      
      if (!isAuthenticated) {
        console.log(`[SavedRoutesContext] Not authenticated, cannot clear routes from server`);
        setError('Authentication required to clear routes');
        return;
      }
      
      // Remove each route from the server
      for (const routeId of savedRouteIds) {
        try {
          console.log(`[SavedRoutesContext] Removing route ${routeId} from server`);
          await authenticatedRouteService.removeRoute(routeId);
        } catch (error) {
          console.error(`[SavedRoutesContext] Error removing route ${routeId}:`, error);
          // Continue with other routes
        }
      }
      
      // Reset state
      setSavedRouteIds([]);
      setSavedRoutes([]);
      
      // Refresh from server to ensure consistency
      await loadSavedRoutesFromServer();
      
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
