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
  uploadProgress: Record<string, number>;
  uploadStatus: string | null;
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
  tinyThumbnailUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
  dateAdded: Date;
  hasGps: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  rotation?: number;  // For image orientation
  altitude?: number;  // Optional altitude data
  isLocal?: boolean;  // Flag to indicate if the photo is stored locally or on Cloudinary
  _blobs?: {          // Temporary storage for blobs (not serialized)
    tiny?: Blob;
    thumbnail?: Blob;
    medium?: Blob;
    large?: Blob;
  };
  publicId?: string;  // Cloudinary public ID
  uploadStatus?: string; // Status of the upload
}

export interface PhotoMarker {
  id: string;
  photo: ProcessedPhoto;
  marker: mapboxgl.Marker;
}

export interface ProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error' | 'retry';
  percent?: number;
  loaded?: number;
  total?: number;
  file?: string;
  url?: string;
  error?: string;
  attempt?: number;
  maxRetries?: number;
  delay?: number;
}
