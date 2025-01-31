import { useState } from 'react';
import { PhotoUploaderProps, ProcessedPhoto } from './PhotoUploader.types';
import PhotoUploaderUI from './PhotoUploaderUI';

const PhotoUploader = ({ onUploadComplete, onDeletePhoto }: PhotoUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string } | undefined>();
  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);

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
        
        // Set thumbnail size
        const maxSize = 200;
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
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('Failed to create thumbnail'));
      img.src = url;
    });
  };

  const handleFileAdd = async (file: File) => {
    console.log('[PhotoUploader] File add triggered', { fileName: file.name });
    
    if (!file.type.startsWith('image/')) {
      setError({ message: 'Invalid file type', details: 'Please upload an image file' });
      return;
    }

    try {
      setIsLoading(true);
      setError(undefined);
      
      const url = await processPhoto(file);
      const thumbnailUrl = await createThumbnail(url);
      
      const photo: ProcessedPhoto = {
        id: `photo-${Date.now()}`,
        name: file.name,
        url: url,
        thumbnailUrl: thumbnailUrl,
        dateAdded: new Date()
      };

      setPhotos(prev => [...prev, photo]);
      onUploadComplete(photo);
      
    } catch (error) {
      console.error('[PhotoUploader] Error processing file:', error);
      setError({
        message: 'Failed to process photo',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDelete = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
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
      onFileAdd={handleFileAdd}
      onFileDelete={handleFileDelete}
      onFileRename={handleFileRename}
    />
  );
};

export default PhotoUploader;
