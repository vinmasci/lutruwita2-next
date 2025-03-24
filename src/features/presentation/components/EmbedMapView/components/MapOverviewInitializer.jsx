import { useEffect } from 'react';
import { setMapOverviewData } from '../../../../presentation/store/mapOverviewStore';

/**
 * MapOverviewInitializer component
 * 
 * This component initializes the map overview data from the routeData.
 * It sets the map overview data in the mapOverviewStore when the routeData changes.
 */
const MapOverviewInitializer = ({ routeData }) => {
  useEffect(() => {
    if (routeData && routeData.mapOverview) {
      console.log('[MapOverviewInitializer] Setting map overview data:', routeData.mapOverview);
      setMapOverviewData(routeData.mapOverview);
    } else {
      console.log('[MapOverviewInitializer] No map overview data found in routeData');
    }
  }, [routeData]);

  // This component doesn't render anything
  return null;
};

export default MapOverviewInitializer;
