import { ProcessedRoute } from '../../types/gpx.types';

export interface GpxUploaderProps {
  onUploadComplete: (result: ProcessedRoute) => void;
}

export interface UploaderUIProps {
  file: File | null;
  isLoading: boolean;
  error: string | null;
  onFileChange: (file: File) => void;
}
