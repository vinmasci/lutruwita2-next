import { ProcessedRoute, GPXProcessingError } from '../../types/gpx.types';

export interface GpxUploaderProps {
  onUploadComplete: (result: ProcessedRoute) => void;
}

export interface UploaderUIProps {
  file: File | null;
  isLoading: boolean;
  error: GPXProcessingError | null;
  onFileChange: (file: File) => void;
}
