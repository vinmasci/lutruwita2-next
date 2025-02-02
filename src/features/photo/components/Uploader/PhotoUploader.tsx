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
        
        // Set thumbnail size (larger for better quality)
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
          
          // Extract EXIF data
          const exif = await exifr.parse(file, { gps: true });
          const hasGps = Boolean(exif?.latitude && exif?.longitude);
          
          // Log EXIF data for debugging
          console.log('[PhotoUploader] EXIF data for', file.name, ':', exif);
          console.log('[PhotoUploader] GPS data present:', hasGps);

          const photo: ProcessedPhoto = {
            id: `photo-${Date.now()}-${Math.random()}`,
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

          console.log('[PhotoUploader] Processed photo:', photo);
          return photo;
        })
      );

      console.log('[PhotoUploader] All processed photos:', processedPhotos);
      setPhotos(prev => [...prev, ...processedPhotos]);
      onUploadComplete(processedPhotos);
    } catch (error) {
      console.error('[PhotoUploader] Error processing files:', error);
      setError({
        message: 'Failed to process photos',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
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
    if (selectedPhotosList.length > 0 && onAddToMap) {
      onAddToMap(selectedPhotosList);
    }
    // Clear selection after adding to map
    setSelectedPhotos(new Set());
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
