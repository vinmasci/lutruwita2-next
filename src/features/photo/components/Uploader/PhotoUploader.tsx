import { useState } from 'react';
import exifr from 'exifr';
import { PhotoUploaderProps, ProcessedPhoto } from './PhotoUploader.types';
import PhotoUploaderUI from './PhotoUploaderUI';
import { usePhotoService } from '../../services/photoService';

const PhotoUploader = ({
  onUploadComplete,
  onDeletePhoto,
  onAddToMap
}: PhotoUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string }>();
  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const photoService = usePhotoService();

  const handleFileAdd = async (files: File[]) => {
    if (files.length === 0) return;

    setIsLoading(true);
    setError(undefined);
    
    try {
      // Process files one by one to show individual progress
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`Invalid file type for ${file.name}`);
        }

        const photoId = `photo-${Date.now()}-${Math.random()}`;
        
        // Initialize progress for this file
        setUploadProgress(prev => ({
          ...prev,
          [photoId]: 0
        }));
        
        // Upload to S3 with progress tracking
        const { url, thumbnailUrl, metadata } = await photoService.uploadPhotoWithProgress(
          file,
          (progressEvent) => {
            if (progressEvent.type === 'progress') {
              setUploadProgress(prev => ({
                ...prev,
                [photoId]: progressEvent.percent
              }));
            } else if (progressEvent.type === 'retry') {
              setUploadStatus(`Retrying upload (${progressEvent.attempt}/${progressEvent.maxRetries})...`);
            } else if (progressEvent.type === 'error') {
              setUploadStatus(`Error: ${progressEvent.error}`);
            } else if (progressEvent.type === 'complete') {
              setUploadStatus(null);
              // Set progress to 100% when complete
              setUploadProgress(prev => ({
                ...prev,
                [photoId]: 100
              }));
            }
          }
        );
        
        // Extract GPS data from metadata
        const hasGps = Boolean(metadata?.gps?.latitude && metadata?.gps?.longitude);

        const photo: ProcessedPhoto = {
          id: photoId,
          name: file.name,
          url,
          thumbnailUrl,
          dateAdded: new Date(),
          hasGps,
          ...(hasGps && {
            coordinates: {
              lat: metadata.gps.latitude,
              lng: metadata.gps.longitude
            },
            altitude: metadata.gps.altitude
          })
        };

        // Add to local state for preview
        setPhotos(prev => [...prev, photo]);
        // Auto-select the photo
        setSelectedPhotos(prev => {
          const next = new Set(prev);
          next.add(photoId);
          return next;
        });
      }

      setIsLoading(false);
      setUploadStatus(null);
    } catch (error) {
      console.error('[PhotoUploader] Error processing files:', error);
      setError({
        message: 'Failed to process photos',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setIsLoading(false);
      setUploadStatus(null);
    }
  };

  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleAddToMap = () => {
    // Get all photos that have GPS coordinates
    const photosToAdd = photos.filter(p => p.hasGps);
    if (photosToAdd.length > 0) {
      // Only call onUploadComplete when actually adding to map
      onUploadComplete(photosToAdd);
      if (onAddToMap) {
        onAddToMap(photosToAdd);
      }
      // Clear photos and selection after adding to map
      setPhotos([]);
      setSelectedPhotos(new Set());
      setUploadProgress({});
    }
  };

  const handleFileDelete = async (photoId: string) => {
    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;

      // Delete from S3 first
      await photoService.deletePhoto(photo.url);

      // Then update local state
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setSelectedPhotos(prev => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
      
      // Remove progress tracking for this photo
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next[photoId];
        return next;
      });

      if (onDeletePhoto) {
        onDeletePhoto(photoId);
      }
    } catch (error) {
      console.error('[PhotoUploader] Delete error:', error);
      setError({
        message: 'Failed to delete photo',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleFileRename = (photoId: string, newName: string) => {
    setPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, name: newName } : p
    ));
  };

  return (
    <PhotoUploaderUI 
      isLoading={isLoading}
      error={error}
      photos={photos}
      selectedPhotos={selectedPhotos}
      uploadProgress={uploadProgress}
      uploadStatus={uploadStatus}
      onFileAdd={handleFileAdd}
      onFileDelete={handleFileDelete}
      onFileRename={handleFileRename}
      onPhotoSelect={handlePhotoSelect}
      onAddToMap={handleAddToMap}
    />
  );
};

export default PhotoUploader;
