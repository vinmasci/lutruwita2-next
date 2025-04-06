import { useEffect, useRef } from 'react';
import { setMapOverviewData, getMapOverviewData } from '../../../../presentation/store/mapOverviewStore';

/**
 * MapOverviewInitializer component
 * 
 * This component initializes the map overview data from the routeData.
 * It sets the map overview data in the mapOverviewStore when the routeData changes.
 */
const MapOverviewInitializer = ({ routeData }) => {
  const initializedRef = useRef(false);

  useEffect(() => {
    // Skip if we already have map overview data
    if (getMapOverviewData()?.description) {
      return;
    }
    
    // Check if routeData has mapOverview
    if (routeData && routeData.mapOverview) {
      console.log('[MapOverviewInitializer] Setting map overview data:', routeData.mapOverview);
      setMapOverviewData(routeData.mapOverview);
      initializedRef.current = true;
    } else {
      console.log('[MapOverviewInitializer] No map overview data found in routeData');
      
      // If no direct mapOverview, check if it's in the currentRoute
      if (routeData?.currentRoute?._loadedState?.mapOverview) {
        console.log('[MapOverviewInitializer] Found map overview data in currentRoute._loadedState');
        setMapOverviewData(routeData.currentRoute._loadedState.mapOverview);
        initializedRef.current = true;
      }
    }
  }, [routeData]);

  // This component doesn't render anything
  return null;
};

export default MapOverviewInitializer;
