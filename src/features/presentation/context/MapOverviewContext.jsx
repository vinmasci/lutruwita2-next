import { createContext, useContext, useState, useEffect } from 'react';
import { jsx as _jsx } from "react/jsx-runtime";
import { 
  getMapOverviewData, 
  setMapOverviewData, 
  updateMapOverviewDescription, 
  markMapOverviewChanged,
  subscribeToMapOverviewChanges
} from '../store/mapOverviewStore';

// Create the context
const MapOverviewContext = createContext(null);

/**
 * Provider component for the Map Overview context
 * This manages the global map overview data that applies to the entire file
 */
export const MapOverviewProvider = ({ children }) => {
  // State for the map overview content - initialized from the store
  const [mapOverview, setMapOverviewState] = useState(getMapOverviewData());
  
  // Effect to update the local state when the store changes
  useEffect(() => {
    // Subscribe to changes in the store
    const unsubscribe = subscribeToMapOverviewChanges((newData) => {
      setMapOverviewState(newData);
    });
    
    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Value object to be provided to consumers
  const value = {
    mapOverview,
    setMapOverview: (newMapOverview) => {
      // Update the store, which will trigger the effect to update the local state
      setMapOverviewData(newMapOverview);
      
      // Mark map overview as changed
      markMapOverviewChanged();
    },
    
    // Helper function to update just the description
    updateDescription: (description) => {
      // Update the store, which will trigger the effect to update the local state
      updateMapOverviewDescription(description);
      
      // Mark map overview as changed
      markMapOverviewChanged();
    }
  };

  return _jsx(MapOverviewContext.Provider, {
    value: value,
    children: children
  });
};

/**
 * Hook to use the Map Overview context
 * @returns {Object} The map overview context value
 */
export const useMapOverview = () => {
  const context = useContext(MapOverviewContext);
  if (!context) {
    throw new Error('useMapOverview must be used within a MapOverviewProvider');
  }
  return context;
};
