import React, { createContext, useContext, useState, useCallback } from 'react';
import { ProcessedRoute } from '../../gpx/types/gpx.types';

interface RouteContextType {
  routes: ProcessedRoute[];
  currentRoute: ProcessedRoute | null;
  addRoute: (route: ProcessedRoute) => void;
  deleteRoute: (routeId: string) => void;
  setCurrentRoute: (route: ProcessedRoute | null) => void;
}

const RouteContext = createContext<RouteContextType | null>(null);

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [routes, setRoutes] = useState<ProcessedRoute[]>([]);
  const [currentRoute, setCurrentRoute] = useState<ProcessedRoute | null>(null);

  const addRoute = useCallback((route: ProcessedRoute) => {
    setRoutes(prev => {
      // Remove any existing route with the same ID
      const filtered = prev.filter(r => r.id !== route.id);
      // Add the new/updated route
      return [...filtered, route];
    });
  }, []);

  const deleteRoute = useCallback((routeId: string) => {
    setRoutes(prev => prev.filter(route => route.routeId !== routeId));
    setCurrentRoute(prev => prev?.routeId === routeId ? null : prev);
  }, []);

  return (
    <RouteContext.Provider value={{
      routes,
      currentRoute,
      addRoute,
      deleteRoute,
      setCurrentRoute
    }}>
      {children}
    </RouteContext.Provider>
  );
};

export const useRouteContext = () => {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRouteContext must be used within a RouteProvider');
  }
  return context;
};
