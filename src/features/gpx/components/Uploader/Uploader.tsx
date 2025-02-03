import { useClientGpxProcessing } from '../../hooks/useClientGpxProcessing';
import { useMapContext } from '../../../map/context/MapContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { GpxUploaderProps } from './Uploader.types';
import { ProcessedRoute } from '../../types/gpx.types';
import UploaderUI from './UploaderUI';
import { useEffect, useState } from 'react';

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
        addRoute(result);
        setCurrentRoute(result);
        onUploadComplete(result);
      }
    } catch (error) {
      console.error('[Uploader] Error processing file:', error);
    }
  };

  const handleFileDelete = (fileId: string) => {
    // Find the route using the fileId (which is the route's id)
    const route = routes.find(r => r.id === fileId);
    if (route?.routeId) {
      // First clean up map layers
      if (onDeleteRoute) {
        onDeleteRoute(route.routeId);
      }
      // Then update route context state
      deleteRoute(route.routeId);
    } else {
      console.error('[Uploader] Could not find route with id:', fileId);
    }
  };

  const handleFileRename = async (fileId: string, newName: string) => {
    try {
      // Find the existing route in context
      const existingRoute = routes.find((r: ProcessedRoute) => r.id === fileId);
      if (!existingRoute) {
        console.error('[Uploader] Route not found for rename:', fileId);
        return;
      }

      // Create a new file with the same content but new name
      const file = new File([existingRoute.rawGpx], newName, { type: 'application/gpx+xml' });
      const result = await processGpx(file);
      
      if (result) {
        const updatedRoute = {
          ...result,
          id: existingRoute.id,
          routeId: existingRoute.routeId,
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
    <UploaderUI 
      isLoading={isLoading}
      error={error}
      onFileAdd={handleFileAdd}
      onFileDelete={handleFileDelete}
      onFileRename={handleFileRename}
    />
  );
};

export default Uploader;
