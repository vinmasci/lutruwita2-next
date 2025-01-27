import { useState, useEffect } from 'react';
import { useClientGpxProcessing } from '../../hooks/useClientGpxProcessing';
import { useMapContext } from '../../../map/context/MapContext';
import { GpxUploaderProps, UploadedFile } from './Uploader.types';
import UploaderUI from './UploaderUI';

const Uploader = ({ onUploadComplete }: GpxUploaderProps) => {
  console.log('[Uploader] Component initializing');
  const { processGpx, isLoading, error } = useClientGpxProcessing();
  const { isMapReady } = useMapContext();
  const [files, setFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    console.log('[Uploader] Component mounted');
  }, []);

  const handleFileAdd = async (file: File) => {
    console.log('[Uploader] File add triggered', { fileName: file.name });
    
    if (!isMapReady) {
      console.error('[Uploader] Map not ready for processing');
      return;
    }

    // Create an uploaded file with unique ID
    const uploadedFile: UploadedFile = Object.assign(file, {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    setFiles(prev => [...prev, uploadedFile]);

    const result = await processGpx(file);
    if (result) {
      onUploadComplete(result);
    }
  };

  const handleFileDelete = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleFileRename = (fileId: string, newName: string) => {
    setFiles(prev => prev.map(file => {
      if (file.id === fileId) {
        return {
          ...file,
          customName: newName
        };
      }
      return file;
    }));
  };

  return (
    <UploaderUI 
      files={files}
      isLoading={isLoading}
      error={error}
      onFileAdd={handleFileAdd}
      onFileDelete={handleFileDelete}
      onFileRename={handleFileRename}
    />
  );
};

export default Uploader;
