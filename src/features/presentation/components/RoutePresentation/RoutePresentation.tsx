import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service';
import { PublicRouteMetadata } from '../../types/route.types';
import { SavedRouteState, LoadedRoute, ProcessedRoute } from '../../../map/types/route.types';
import { processPublicRoute } from '../../utils/routeProcessor';
import { PresentationMapView } from '../PresentationMapView';
import { Box, CircularProgress, Alert } from '@mui/material';
import { RouteProvider, useRouteContext } from '../../../map/context/RouteContext';
import { MapProvider, useMapContext } from '../../../map/context/MapContext';

export const RoutePresentation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<PublicRouteMetadata | null>(null);
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !route) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="error" sx={{ maxWidth: 'sm' }}>
          {error || 'Route not found'}
        </Alert>
      </Box>
    );
  }

  // Process route data using dedicated processor
  const { savedState: savedRouteState, processedRoutes } = route ? processPublicRoute(route) : { savedState: null, processedRoutes: [] };

  const RouteContent = () => {
    const { addRoute, setCurrentRoute } = useRouteContext();

    useEffect(() => {
      console.log('[RoutePresentation] Processing routes:', {
        count: processedRoutes.length,
        routes: processedRoutes.map((r: LoadedRoute) => ({
          id: r.id,
          routeId: r.routeId,
          hasGeojson: !!r.geojson,
          featureCount: r.geojson?.features?.length
        }))
      });

      if (processedRoutes.length > 0) {
        processedRoutes.forEach((route: LoadedRoute) => {
          console.log('[RoutePresentation] Adding route to context:', route.routeId);
          addRoute(route);
        });
        console.log('[RoutePresentation] Setting current route:', processedRoutes[0].routeId);
        setCurrentRoute(processedRoutes[0]); // Set first route as current
      }
    }, [processedRoutes, addRoute, setCurrentRoute]);

    return processedRoutes.length > 0 ? <PresentationMapView /> : null;
  };

  return (
    <RouteProvider>
      <RouteContent />
    </RouteProvider>
  );
};
