import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { setMapOverviewData, getMapOverviewData } from '../../store/mapOverviewStore';
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
  const { currentRoute, currentLoadedState } = useRouteContext();
  const hasLoadedRef = useRef(false);
  const loadAttemptedRef = useRef(false);

  // First, check if the map overview data is already in the route data
  useEffect(() => {
    // If we already have map overview data or have already loaded it, skip
    if (getMapOverviewData()?.description || hasLoadedRef.current) {
      return;
    }

    // Check if the current route or loaded state has map overview data
    if (currentRoute?._loadedState?.mapOverview) {
      console.log('[MapOverviewLoader] Using map overview data from currentRoute._loadedState:', currentRoute._loadedState.mapOverview);
      setMapOverviewData(currentRoute._loadedState.mapOverview);
      hasLoadedRef.current = true;
      return;
    }

    if (currentLoadedState?.mapOverview) {
      console.log('[MapOverviewLoader] Using map overview data from currentLoadedState:', currentLoadedState.mapOverview);
      setMapOverviewData(currentLoadedState.mapOverview);
      hasLoadedRef.current = true;
      return;
    }
  }, [currentRoute, currentLoadedState]);

  // If no map overview data is found in the route data, fetch it from the API
  useEffect(() => {
    // Skip if we already have data or have already attempted to load
    if (getMapOverviewData()?.description || hasLoadedRef.current || loadAttemptedRef.current) {
      return;
    }

    // Function to fetch map overview data
    const fetchMapOverviewData = async () => {
      try {
        // Mark that we've attempted to load
        loadAttemptedRef.current = true;
        
        setIsLoading(true);
        setError(null);

        // Get the persistentId from the URL params or from the current route
        const routeId = persistentId || currentRoute?.persistentId || currentRoute?.routeId;
        
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
        hasLoadedRef.current = true;
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
