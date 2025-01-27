import { useState, useEffect } from 'react';
import { useClientGpxProcessing } from '../../hooks/useClientGpxProcessing';
import { useMapContext } from '../../../map/context/MapContext';
import { GpxUploaderProps } from './Uploader.types';
import UploaderUI from './UploaderUI';

const Uploader = ({ onUploadComplete }: GpxUploaderProps) => {
  console.log('[Uploader] Component initializing');
  const { processGpx, isLoading, error } = useClientGpxProcessing();
  const { isMapReady } = useMapContext();
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    console.log('[Uploader] Component mounted');
  }, []);

  const handleFileChange = async (file: File) => {
    console.log('[Uploader] File change triggered', { fileName: file.name });
    setFile(file);
    
    if (!isMapReady) {
      console.error('[Uploader] Map not ready for processing');
      return;
    }

    const result = await processGpx(file);
    if (result) {
      onUploadComplete(result);
    }
  };

  return (
    <UploaderUI 
      file={file}
      isLoading={isLoading}
      error={error}
      onFileChange={handleFileChange}
    />
  );
};

export default Uploader;
