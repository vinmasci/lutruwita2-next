import React, { createContext, useContext } from 'react';
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

// Create context with default values
const SavedRoutesContext = createContext<SavedRoutesContextType>({
  savedRoutes: [],
  isLoading: false,
  error: null,
  saveRoute: async () => false,
  removeRoute: async () => false,
  isRouteSaved: () => false,
  refreshSavedRoutes: async () => {},
  clearSavedRoutes: async () => {},
});

// Provider component
export const MockSavedRoutesProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Mock implementation that doesn't use Firebase
  const mockContextValue: SavedRoutesContextType = {
    savedRoutes: [],
    isLoading: false,
    error: null,
    saveRoute: async () => {
      console.log('[MockSavedRoutesContext] saveRoute called (mock implementation)');
      return true;
    },
    removeRoute: async () => {
      console.log('[MockSavedRoutesContext] removeRoute called (mock implementation)');
      return true;
    },
    isRouteSaved: () => {
      console.log('[MockSavedRoutesContext] isRouteSaved called (mock implementation)');
      return false;
    },
    refreshSavedRoutes: async () => {
      console.log('[MockSavedRoutesContext] refreshSavedRoutes called (mock implementation)');
    },
    clearSavedRoutes: async () => {
      console.log('[MockSavedRoutesContext] clearSavedRoutes called (mock implementation)');
    },
  };

  return (
    <SavedRoutesContext.Provider value={mockContextValue}>
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

// Export the context for compatibility with existing code
export default SavedRoutesContext;
