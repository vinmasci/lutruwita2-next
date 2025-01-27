import { ProcessedRoute, GPXProcessingError } from '../../types/gpx.types';

export interface GpxUploaderProps {
  onUploadComplete: (result: ProcessedRoute) => void;
}

export interface UploadedFile extends File {
  id: string;
  customName?: string;
  isProcessing?: boolean;
}

export interface UploaderUIProps {
  files: UploadedFile[];
  isLoading: boolean;
  error: GPXProcessingError | null;
  onFileAdd: (file: File) => void;
  onFileDelete: (fileId: string) => void;
  onFileRename: (fileId: string, newName: string) => void;
}
