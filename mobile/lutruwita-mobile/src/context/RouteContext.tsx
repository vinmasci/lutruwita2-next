import React, { createContext, useContext, useState, useEffect } from 'react';
import { RouteMap, listPublicRoutes, loadPublicRoute, getMockRoutes } from '../services/routeService';

// Define the route state interface
interface RouteState {
  routes: RouteMap[];
  selectedRoute: RouteMap | null;
  isLoading: boolean;
  error: string | null;
}

// Define the route context interface
interface RouteContextType {
  routeState: RouteState;
  loadRoutes: (type?: string) => Promise<void>;
  loadRoute: (persistentId: string) => Promise<void>;
  clearSelectedRoute: () => void;
  useMockData: boolean;
  setUseMockData: (useMock: boolean) => void;
}

// Create the context
const RouteContext = createContext<RouteContextType | undefined>(undefined);

// Route provider component
export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [routeState, setRouteState] = useState<RouteState>({
    routes: [],
    selectedRoute: null,
    isLoading: false,
    error: null,
  });
  
  // Flag to use mock data for offline development
  const [useMockData, setUseMockData] = useState<boolean>(false);

  // Load routes from API or mock data
  const loadRoutes = async (type?: string) => {
    try {
      setRouteState(prev => ({ ...prev, isLoading: true, error: null }));
      
      let routes: RouteMap[];
      
      if (useMockData) {
        // Use mock data for offline development
        routes = getMockRoutes();
      } else {
        // Fetch from API
        routes = await listPublicRoutes(type);
      }
      
      setRouteState(prev => ({ 
        ...prev, 
        routes, 
        isLoading: false 
      }));
    } catch (error) {
      console.error('Error loading routes:', error);
      setRouteState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load routes' 
      }));
    }
  };

  // Load a specific route by ID
  const loadRoute = async (persistentId: string) => {
    try {
      setRouteState(prev => ({ ...prev, isLoading: true, error: null }));
      
      let route: RouteMap;
      
      if (useMockData) {
        // Find in mock data
        const mockRoute = getMockRoutes().find(r => r.persistentId === persistentId);
        if (!mockRoute) {
          throw new Error('Route not found');
        }
        route = mockRoute;
      } else {
        // Fetch from API
        route = await loadPublicRoute(persistentId);
      }
      
      setRouteState(prev => ({ 
        ...prev, 
        selectedRoute: route, 
        isLoading: false 
      }));
    } catch (error) {
      console.error('Error loading route:', error);
      setRouteState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load route' 
      }));
    }
  };

  // Clear the selected route
  const clearSelectedRoute = () => {
    setRouteState(prev => ({ ...prev, selectedRoute: null }));
  };

  // Load routes on initial mount
  useEffect(() => {
    loadRoutes();
  }, []);

  return (
    <RouteContext.Provider
      value={{
        routeState,
        loadRoutes,
        loadRoute,
        clearSelectedRoute,
        useMockData,
        setUseMockData,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
};

// Hook to use the route context
export const useRoute = () => {
  const context = useContext(RouteContext);
  if (context === undefined) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return context;
};
