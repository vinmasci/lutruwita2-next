import { useState, useEffect } from 'react';
import { useClientGpxProcessing } from '../../hooks/useClientGpxProcessing';
import { useMapContext } from '../../../map/context/MapContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { GpxUploaderProps, UploadedFile } from './Uploader.types';
import UploaderUI from './UploaderUI';

const Uploader = ({ onUploadComplete }: GpxUploaderProps) => {
  console.log('[Uploader] Component initializing');
  const { processGpx, isLoading, error } = useClientGpxProcessing();
  const { isMapReady } = useMapContext();
  const { deleteRoute } = useRouteContext();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Uploader] Component mounted');
  }, []);

  const handleFileAdd = async (file: File) => {
    console.log('[Uploader] File add triggered', { fileName: file.name });
    
    if (!isMapReady) {
      console.error('[Uploader] Map not ready for processing');
      return;
    }

    try {
      // Read file content first
      const fileContent = await file.text();
      
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const routeId = `route-${fileId}`;

      // Create an uploaded file with unique ID and content
      const uploadedFile: UploadedFile = Object.assign(new File([fileContent], file.name, { type: file.type }), {
        id: fileId,
        routeId: routeId,
        content: fileContent
      });

      setFiles(prev => [...prev, uploadedFile]);

      const result = await processGpx(uploadedFile);
      if (result) {
        onUploadComplete(result);
      }
    } catch (error) {
      console.error('[Uploader] Error processing file:', error);
    }
  };

  const handleFileDelete = (fileId: string) => {
    // Find the file to get its route ID
    const file = files.find(f => f.id === fileId);
    if (file) {
      // Delete route using the route ID format
      const routeId = `route-${fileId}`;
      deleteRoute(routeId);
    }
    
    // Remove from local state
    setFiles(prev => prev.filter(file => file.id !== fileId));
    
    // Clear selected file if it was the deleted one
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
    }
  };

  const handleFileRename = async (fileId: string, newName: string) => {
    // Update local files state
    setFiles(prev => prev.map(file => {
      if (file.id === fileId) {
        return {
          ...file,
          customName: newName
        };
      }
      return file;
    }));

    const file = files.find(f => f.id === fileId);
    if (file) {
      try {
        // Create a new file with the new name but same content
        const newFile = new File([file.content], newName, { type: file.type });
        const result = await processGpx(newFile);
        if (result) {
          onUploadComplete({
            ...result,
            name: newName
          });
        }
      } catch (error) {
        console.error('[Uploader] Error processing file:', error);
      }
    }
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  return (
    <UploaderUI 
      files={files}
      isLoading={isLoading}
      error={error}
      selectedFileId={selectedFileId}
      onFileAdd={handleFileAdd}
      onFileDelete={handleFileDelete}
      onFileRename={handleFileRename}
      onFileSelect={handleFileSelect}
    />
  );
};

export default Uploader;
