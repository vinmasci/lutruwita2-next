import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { setMapOverviewData } from '../../store/mapOverviewStore';
import { useRouteContext } from '../../../map/context/RouteContext';

/**
 * MapOverviewLoader component
 * 
 * This component fetches the map overview data directly from MongoDB
 * for the presentation mode and sets it in the mapOverviewStore.
 */
const MapOverviewLoader = () => {
  const { persistentId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentRoute } = useRouteContext();

  useEffect(() => {
    // Function to fetch map overview data
    const fetchMapOverviewData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the persistentId from the URL params or from the current route
        const routeId = persistentId || currentRoute?.persistentId;
        
        if (!routeId) {
          console.warn('[MapOverviewLoader] No persistentId available, cannot fetch map overview data');
          setIsLoading(false);
          return;
        }

        console.log('[MapOverviewLoader] Fetching map overview data for route:', routeId);
        
        // Make an API call to fetch the map overview data
        // Use a query parameter approach instead of path parameter
        const response = await fetch(`/api/routes?id=${routeId}&mapoverview=true`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch map overview data: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[MapOverviewLoader] Map overview data fetched successfully:', data);
        
        // Set the map overview data in the store
        setMapOverviewData(data);
      } catch (err) {
        console.error('[MapOverviewLoader] Error fetching map overview data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch the map overview data when the component mounts
    fetchMapOverviewData();
  }, [persistentId, currentRoute]);

  // This component doesn't render anything
  return null;
};

export default MapOverviewLoader;
