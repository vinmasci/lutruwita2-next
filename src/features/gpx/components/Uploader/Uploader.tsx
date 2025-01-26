import { useState } from 'react';
import { useClientGpxProcessing } from '../../hooks/useClientGpxProcessing';
import { GpxUploaderProps } from './Uploader.types';
import UploaderUI from './UploaderUI';

const Uploader = ({ onUploadComplete }: GpxUploaderProps) => {
  const { processGpx, isLoading, error } = useClientGpxProcessing();
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = async (file: File) => {
    setFile(file);
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
