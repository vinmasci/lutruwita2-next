import { useClientGpxProcessing } from '../../hooks/useClientGpxProcessing';
import { useMapContext } from '../../../map/context/MapContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { GpxUploaderProps } from './Uploader.types';
import { ProcessedRoute as GpxProcessedRoute } from '../../types/gpx.types';
import { ProcessedRoute as MapProcessedRoute, normalizeRoute } from '../../../map/types/route.types';
import UploaderUI from './UploaderUI';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '../../../../components/ErrorBoundary';
import { Box, Typography, Button } from '@mui/material';

const Uploader = ({ onUploadComplete, onDeleteRoute }: GpxUploaderProps) => {
  console.log('[Uploader] Component initializing');
  const { processGpx, isLoading: processingLoading, error } = useClientGpxProcessing();
  const { isMapReady } = useMapContext();
  const { addRoute, deleteRoute, setCurrentRoute, routes } = useRouteContext();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Only set initializing to false once map is ready
    if (isMapReady) {
      setInitializing(false);
    }
  }, [isMapReady]);

  // Show loading state only during actual processing, not initialization
  const isLoading = !initializing && processingLoading;

  // Don't show anything during initialization
  if (initializing) {
    return null;
  }

  const handleFileAdd = async (file: File) => {
    console.log('[Uploader] File add triggered', { fileName: file.name });
    
    if (!isMapReady) {
      console.error('[Uploader] Map not ready for processing');
      return;
    }

    try {
      const fileContent = await file.text();
      const result = await processGpx(file);
      if (result) {
        // Use normalizeRoute to ensure proper type and structure
        const processedRoute = normalizeRoute(result);
        addRoute(processedRoute);
        setCurrentRoute(processedRoute);
        onUploadComplete(processedRoute);
      }
    } catch (error) {
      console.error('[Uploader] Error processing file:', error);
    }
  };

  const handleFileDelete = (fileId: string) => {
    console.debug('[Uploader][DELETE] Starting deletion process for file:', fileId);
    console.debug('[Uploader][DELETE] Current routes:', routes.map(r => ({
      id: r.id,
      routeId: r.routeId,
      name: r.name,
      type: r._type
    })));
    
    // Find the route using the fileId (which could be either id or routeId)
    const route = routes.find(r => r.id === fileId || r.routeId === fileId);
    if (!route) {
      console.error('[Uploader][DELETE] Could not find route with id:', fileId);
      return;
    }

    // Get the routeId - if it's not set, use the id
    const routeId = route.routeId || `route-${route.id}`;
    console.debug('[Uploader][DELETE] Found route to delete:', { 
      id: route.id, 
      routeId, 
      name: route.name,
      type: route._type,
      totalRoutes: routes.length,
      otherRouteIds: routes.filter(r => r.id !== fileId).map(r => ({
        id: r.id,
        routeId: r.routeId
      }))
    });

    try {
      // First clean up map layers
      if (onDeleteRoute) {
        console.debug('[Uploader][DELETE] Calling onDeleteRoute with routeId:', routeId);
        onDeleteRoute(routeId);
      }

      // Brief delay to ensure map cleanup is complete
      setTimeout(() => {
        // Then update route context state
        console.debug('[Uploader][DELETE] Calling deleteRoute with routeId:', routeId);
        deleteRoute(routeId);
        console.debug('[Uploader][DELETE] Route deletion complete for:', routeId);
      }, 100);
    } catch (error) {
      console.error('[Uploader][DELETE] Error deleting route:', error);
      console.error('[Uploader][DELETE] Error details:', {
        fileId,
        routeId,
        error: error instanceof Error ? error.message : error
      });
    }
  };

  const handleFileRename = async (fileId: string, newName: string) => {
    try {
      // Find the existing route in context
      const existingRoute = routes.find((r: MapProcessedRoute) => r.id === fileId);
      if (!existingRoute) {
        console.error('[Uploader] Route not found for rename:', fileId);
        return;
      }

      // Create a new file with the same content but new name
      const file = new File([existingRoute.rawGpx], newName, { type: 'application/gpx+xml' });
      const result = await processGpx(file);
      
      if (result) {
        // Use normalizeRoute and override specific fields
        const updatedRoute = {
          ...normalizeRoute(result),
          id: existingRoute.id,
          routeId: existingRoute.routeId || existingRoute.id,
          name: newName
        };
        addRoute(updatedRoute);
        setCurrentRoute(updatedRoute);
        onUploadComplete(updatedRoute);
      }
    } catch (error) {
      console.error('[Uploader] Error processing file:', error);
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>
            Something went wrong with the GPX uploader.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            sx={{ mt: 1 }}
          >
            Reload Page
          </Button>
        </Box>
      }
    >
      <UploaderUI 
        isLoading={isLoading}
        error={error}
        onFileAdd={handleFileAdd}
        onFileDelete={handleFileDelete}
        onFileRename={handleFileRename}
      />
    </ErrorBoundary>
  );
};

export default Uploader;
