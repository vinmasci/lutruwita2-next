import { ProcessedRoute } from '../../types/gpx.types';

export interface GpxUploaderProps {
  onUploadComplete: (result: ProcessedRoute) => void;
}
