import { useState } from 'react';
import exifr from 'exifr';
import { PhotoUploaderProps, ProcessedPhoto } from './PhotoUploader.types';
import PhotoUploaderUI from './PhotoUploaderUI';

const PhotoUploader = ({
  onUploadComplete,
  onDeletePhoto,
  onAddToMap
}: PhotoUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string }>();
  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  const processPhoto = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const createThumbnail = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const maxSize = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => reject(new Error('Failed to create thumbnail'));
      img.src = url;
    });
  };

  const handleFileAdd = async (files: File[]) => {
    if (files.length === 0) return;

    setIsLoading(true);
    setError(undefined);
    
    try {
      const processedPhotos = await Promise.all(
        files.map(async (file) => {
          if (!file.type.startsWith('image/')) {
            throw new Error(`Invalid file type for ${file.name}`);
          }

          const url = await processPhoto(file);
          const thumbnailUrl = await createThumbnail(url);
          
          const exif = await exifr.parse(file, { gps: true });
          const hasGps = Boolean(exif?.latitude && exif?.longitude);

          const photoId = `photo-${Date.now()}-${Math.random()}`;

          const photo: ProcessedPhoto = {
            id: photoId,
            name: file.name,
            url,
            thumbnailUrl,
            dateAdded: new Date(),
            hasGps,
            ...(hasGps && {
              coordinates: {
                lat: exif.latitude,
                lng: exif.longitude
              },
              altitude: exif.altitude
            })
          };

          // Add to local state only, don't call onUploadComplete yet
          setPhotos(prev => [...prev, photo]);
          // Auto-select the photo
          setSelectedPhotos(prev => {
            const next = new Set(prev);
            next.add(photoId);
            return next;
          });

          return photo;
        })
      );

      setIsLoading(false);
    } catch (error) {
      console.error('[PhotoUploader] Error processing files:', error);
      setError({
        message: 'Failed to process photos',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setIsLoading(false);
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
    const selectedPhotosList = photos.filter(p => selectedPhotos.has(p.id));
    if (selectedPhotosList.length > 0) {
      // Only call onUploadComplete when actually adding to map
      onUploadComplete(selectedPhotosList);
      if (onAddToMap) {
        onAddToMap(selectedPhotosList);
      }
      // Clear photos and selection after adding to map
      setPhotos([]);
      setSelectedPhotos(new Set());
    }
  };

  const handleFileDelete = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      next.delete(photoId);
      return next;
    });
    if (onDeletePhoto) {
      onDeletePhoto(photoId);
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
      onFileAdd={handleFileAdd}
      onFileDelete={handleFileDelete}
      onFileRename={handleFileRename}
      onPhotoSelect={handlePhotoSelect}
      onAddToMap={handleAddToMap}
    />
  );
};

export default PhotoUploader;
