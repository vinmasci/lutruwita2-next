import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jsx as _jsx } from "react/jsx-runtime";
import { 
  getMapOverviewData, 
  setMapOverviewData, 
  updateMapOverviewDescription, 
  markMapOverviewChanged,
  subscribeToMapOverviewChanges
} from '../store/mapOverviewStore';
import { useRouteContext } from '../../map/context/RouteContext';

// Create the context
const MapOverviewContext = createContext(null);

/**
 * Provider component for the Map Overview context
 * This manages the global map overview data that applies to the entire file
 */
export const MapOverviewProvider = ({ children }) => {
  // State for the map overview content - initialized from the store
  const [mapOverview, setMapOverviewState] = useState(getMapOverviewData());
  
  // Track map overview changes locally if routeContext is not available
  const [localMapOverviewChanges, setLocalMapOverviewChanges] = useState(false);
  
  // Get access to the RouteContext to notify it of map overview changes
  let routeContext;
  try {
    routeContext = useRouteContext();
  } catch (error) {
    // This is expected when the MapOverviewProvider is used outside of a RouteProvider
    routeContext = null;
  }
  
  // Function to notify RouteContext of map overview changes
  const notifyMapOverviewChange = useCallback(() => {
    console.log('[MapOverviewContext] notifyMapOverviewChange called, routeContext available:', !!routeContext);
    
    // Always set local changes flag
    setLocalMapOverviewChanges(true);
    
    if (routeContext && routeContext.setChangedSections) {
      console.log('[MapOverviewContext] Setting mapOverview flag in changedSections');
      try {
        routeContext.setChangedSections(prev => {
          const newState = {...prev, mapOverview: true};
          console.log('[MapOverviewContext] New changedSections state:', newState);
          return newState;
        });
      } catch (error) {
        console.error('[MapOverviewContext] Error setting changedSections:', error);
      }
    } else {
      console.warn('[MapOverviewContext] routeContext not available or missing setChangedSections, tracking changes locally');
    }
  }, [routeContext]);
  
  // Expose whether there are map overview changes
  const hasMapOverviewChanges = useCallback(() => {
    // Check local changes first
    if (localMapOverviewChanges) return true;
    
    // If routeContext is available, check its changedSections
    if (routeContext && routeContext.changedSectionsRef && routeContext.changedSectionsRef.current) {
      return !!routeContext.changedSectionsRef.current.mapOverview;
    }
    
    return false;
  }, [localMapOverviewChanges, routeContext]);
  
  // Clear map overview changes
  const clearMapOverviewChanges = useCallback(() => {
    console.log('[MapOverviewContext] Clearing map overview changes');
    setLocalMapOverviewChanges(false);
    
    // Also clear in routeContext if available
    if (routeContext && routeContext.setChangedSections) {
      routeContext.setChangedSections(prev => {
        const newState = {...prev};
        delete newState.mapOverview;
        return newState;
      });
    }
  }, [routeContext]);
  
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
      
      // Also notify using our new function
      notifyMapOverviewChange();
    },
    
    // Helper function to update just the description
    updateDescription: (description) => {
      // Update the store, which will trigger the effect to update the local state
      updateMapOverviewDescription(description);
      
      // Mark map overview as changed
      markMapOverviewChanged();
      
      // Also notify using our new function
      notifyMapOverviewChange();
    },
    
    // Expose change tracking functions
    hasMapOverviewChanges,
    clearMapOverviewChanges,
    localMapOverviewChanges
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
