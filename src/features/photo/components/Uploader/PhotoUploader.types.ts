export interface PhotoUploaderProps {
  onUploadComplete: (photos: ProcessedPhoto[]) => void;
  onDeletePhoto?: (photoId: string) => void;
  onAddToMap?: (photos: ProcessedPhoto[]) => void;
}

export interface PhotoUploaderUIProps {
  isLoading: boolean;
  error?: { message: string; details?: string };
  photos: ProcessedPhoto[];
  selectedPhotos: Set<string>;
  onFileAdd: (files: File[]) => void;
  onFileDelete: (photoId: string) => void;
  onFileRename: (photoId: string, newName: string) => void;
  onPhotoSelect: (photoId: string) => void;
  onAddToMap: () => void;
}

export interface ProcessedPhoto {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  dateAdded: Date;
  hasGps: boolean;
}
