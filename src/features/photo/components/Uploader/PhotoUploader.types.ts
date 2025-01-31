export interface PhotoUploaderProps {
  onUploadComplete: (photo: ProcessedPhoto) => void;
  onDeletePhoto?: (photoId: string) => void;
}

export interface PhotoUploaderUIProps {
  isLoading: boolean;
  error?: { message: string; details?: string };
  onFileAdd: (file: File) => void;
  onFileDelete: (photoId: string) => void;
  onFileRename: (photoId: string, newName: string) => void;
}

export interface ProcessedPhoto {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  dateAdded: Date;
}
