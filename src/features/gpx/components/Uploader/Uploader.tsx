import { useGpxProcessing } from '../../hooks/useGpxProcessing';
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
  const { processGpxFile, isProcessing: processingLoading, debugLog } = useGpxProcessing();
  const [error, setError] = useState(null);
  const { isMapReady } = useMapContext();
  const { 
    addRoute, 
    deleteRoute, 
    setCurrentRoute, 
    routes,
    updateRoute 
  } = useRouteContext();
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
      const result = await processGpxFile(file);
      if (result) {
        // Add missing properties required by normalizeRoute
        const enhancedResult = {
          ...result,
          rawGpx: '',
          statistics: {
            totalDistance: 0,
            elevationGain: 0,
            elevationLoss: 0,
            maxElevation: 0,
            minElevation: 0,
            averageSpeed: 0,
            movingTime: 0,
            totalTime: 0
          },
          status: {
            processingState: "completed" as "completed",
            progress: 100
          }
        };
        // Use normalizeRoute to ensure proper type and structure
        const processedRoute = normalizeRoute(enhancedResult);
        addRoute(processedRoute);
        // Only set as current route if it's the first one
        if (!routes.length) {
          setCurrentRoute(processedRoute);
        }
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
    
    // Find the route using the routeId
    const route = routes.find(r => r.routeId === fileId);
    if (!route) {
      console.error('[Uploader][DELETE] Could not find route with id:', fileId);
      return;
    }

    try {
      // First clean up map layers
      if (onDeleteRoute) {
        console.debug('[Uploader][DELETE] Calling onDeleteRoute with routeId:', fileId);
        onDeleteRoute(fileId);
      }

      // Brief delay to ensure map cleanup is complete
      setTimeout(() => {
        // Then update route context state
        console.debug('[Uploader][DELETE] Calling deleteRoute with routeId:', fileId);
        deleteRoute(fileId);
        console.debug('[Uploader][DELETE] Route deletion complete for:', fileId);
      }, 100);
    } catch (error) {
      console.error('[Uploader][DELETE] Error deleting route:', error);
      console.error('[Uploader][DELETE] Error details:', {
        fileId,
        error: error instanceof Error ? error.message : error
      });
    }
  };

  const handleFileRename = async (fileId: string, newName: string) => {
    try {
      // Simply update the name for this route
      updateRoute(fileId, { name: newName });
    } catch (error) {
      console.error('[Uploader] Error renaming route:', error);
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
        debugLog={debugLog}
        onFileAdd={handleFileAdd}
        onFileDelete={handleFileDelete}
        onFileRename={handleFileRename}
      />
    </ErrorBoundary>
  );
};

export default Uploader;
