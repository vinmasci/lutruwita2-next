import { useState } from 'react';
import { useGpxProcessing } from '../../hooks/useGpxProcessing';
import { GpxUploaderProps } from './Uploader.types';
import UploaderUI from './UploaderUI';

const Uploader = ({ onUploadComplete }: GpxUploaderProps) => {
  const { processGpx, isLoading, error } = useGpxProcessing();
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (file: File) => {
    setFile(file);
    processGpx(file)
      .then((result) => {
        if (result) {
          onUploadComplete(result);
        }
      });
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
