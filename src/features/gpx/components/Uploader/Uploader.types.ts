import { ProcessedRoute, GPXProcessingError } from '../../types/gpx.types';

export interface GpxUploaderProps {
  onUploadComplete: (result: ProcessedRoute) => void;
}

export interface UploadedFile extends File {
  id: string;
  routeId?: string;  // MapView's route ID
  customName?: string;
  isProcessing?: boolean;
  content: string;
}

export interface UploaderUIProps {
  files: UploadedFile[];
  isLoading: boolean;
  error: GPXProcessingError | null;
  selectedFileId: string | null;
  onFileAdd: (file: File) => void;
  onFileDelete: (fileId: string) => void;
  onFileRename: (fileId: string, newName: string) => void;
  onFileSelect: (fileId: string) => void;
}
