import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service';
import { PublicRouteMetadata, PublicRouteDetails } from '../../types/route.types';
import { SavedRouteState, LoadedRoute, ProcessedRoute } from '../../../map/types/route.types';
import { PresentationMapView } from '../PresentationMapView';
import { Box, CircularProgress, Alert } from '@mui/material';
import { RouteProvider, useRouteContext } from '../../../map/context/RouteContext';
import { MapProvider, useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import { deserializePhoto } from '../../../map/types/route.types';

export const RoutePresentation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<PublicRouteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const routeData = await publicRouteService.loadRoute(id);
        console.log('Fetched route data:', routeData);
        setRoute(routeData.route);
      } catch (error) {
        setError('Failed to load route');
        console.error('Error fetching route:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [id]);

  // Just add required fields to server routes
  const routes = useMemo(() => {
    if (!route) return [];
    console.log('[RoutePresentation] Using server routes:', route.name);
    return route.routes.map(routeData => ({
      ...routeData,
      _type: 'loaded' as const,
      _loadedState: route,
      id: routeData.routeId, // Required by LoadedRoute
      isVisible: true, // Required by LoadedRoute
      status: {
        processingState: 'completed' as const,
        progress: 100
      }
    }));
  }, [route]);

  // Create a memoized component for route content
  const RouteContent: React.FC<{ route: PublicRouteDetails }> = React.memo(({ route }) => {
    const { addRoute, setCurrentRoute } = useRouteContext();
    const { addPhoto } = usePhotoContext();
    const { loadPOIsFromRoute } = usePOIContext();
    const [initialized, setInitialized] = useState(false);
    
    // Initialize routes once when processed data is available
    useEffect(() => {
      if (initialized || !routes.length) return;

      // Batch route initialization
      const initializeRoutes = () => {
        // Add all routes in a single batch
        routes.forEach((route: LoadedRoute) => {
          console.log('[RoutePresentation] Adding route to context:', route.routeId);
          addRoute(route);
        });

        // Set initial route once all routes are added
        console.log('[RoutePresentation] Setting initial route:', routes[0].routeId);
        // Set initial route
        setCurrentRoute(routes[0]);
        
        // Load photos and POIs
        if (route.photos) {
          addPhoto(route.photos.map(deserializePhoto));
        }
        if (route.pois) {
          loadPOIsFromRoute(route.pois);
        }
        
        setInitialized(true);
      };

      initializeRoutes();
    }, [routes, initialized, addRoute, setCurrentRoute]);

    return routes.length > 0 ? <PresentationMapView /> : null;
  });

  // Set display name for debugging
  RouteContent.displayName = 'RouteContent';

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error || !route) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="error" sx={{ maxWidth: 'sm' }}>
          {error || 'Route not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <RouteProvider>
      <RouteContent route={route} />
    </RouteProvider>
  );
};
