import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ProcessedPhoto } from '../components/Uploader/PhotoUploader.types';
import { usePhotoService } from '../services/photoService';

interface PhotoContextType {
  photos: ProcessedPhoto[];
  setPhotos: (photos: ProcessedPhoto[]) => void;  // Add direct setter
  addPhoto: (photos: ProcessedPhoto[]) => void;
  deletePhoto: (photoId: string) => void;
  updatePhoto: (photoId: string, updates: Partial<ProcessedPhoto>) => void;
  loadPhotos: (newPhotos: ProcessedPhoto[]) => void;
  uploadLocalPhotos: () => Promise<ProcessedPhoto[]>;
  isUploading: boolean;
  uploadProgress: Record<string, number>;
}

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export const usePhotoContext = () => {
  const context = useContext(PhotoContext);
  if (!context) {
    throw new Error('usePhotoContext must be used within a PhotoProvider');
  }
  return context;
};

interface PhotoProviderProps {
  children: ReactNode;
}

export const PhotoProvider: React.FC<PhotoProviderProps> = ({ children }) => {
  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const photoService = usePhotoService();

  const addPhoto = (newPhotos: ProcessedPhoto[]) => {
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const deletePhoto = (photoId: string) => {
    // Get the photo to clean up resources if needed
    const photo = photos.find(p => p.id === photoId);
    
    // Clean up blob URLs if they exist
    if (photo?.isLocal && photo._blobs) {
      // Manually revoke the blob URLs
      if (photo.tinyThumbnailUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photo.tinyThumbnailUrl);
      }
      if (photo.thumbnailUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photo.thumbnailUrl);
      }
      if (photo.mediumUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photo.mediumUrl);
      }
      if (photo.url?.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
    }
    
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const updatePhoto = (photoId: string, updates: Partial<ProcessedPhoto>) => {
    setPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, ...updates } : p
    ));
  };

  const loadPhotos = (newPhotos: ProcessedPhoto[]) => {
    // Convert date strings to Date objects if needed
    const processedPhotos = newPhotos.map(photo => ({
      ...photo,
      dateAdded: photo.dateAdded instanceof Date ? photo.dateAdded : new Date(photo.dateAdded as any)
    }));

    // Replace existing photos entirely
    setPhotos(processedPhotos);
  };

  // Upload all local photos to Cloudinary
  const uploadLocalPhotos = useCallback(async () => {
    // Find all photos that are marked as local
    const localPhotos = photos.filter(p => p.isLocal === true);
    
    console.log('[PhotoContext] uploadLocalPhotos - Local photos found:', localPhotos.length);
    
    if (localPhotos.length === 0) {
      // No local photos to upload
      console.log('[PhotoContext] No local photos to upload');
      return photos;
    }
    
    setIsUploading(true);
    setUploadProgress({});
    
    try {
      console.log('[PhotoContext] Starting upload of local photos to Cloudinary');
      
      // Process each local photo
      const updatedPhotos = await Promise.all(
        localPhotos.map(async (photo) => {
          console.log(`[PhotoContext] Processing photo: ${photo.id}, name: ${photo.name}`);
          
          // Skip if no blobs
          if (!photo._blobs?.large) {
            console.log(`[PhotoContext] No large blob for photo ${photo.id}, skipping`);
            return photo;
          }
          
          try {
            console.log(`[PhotoContext] Creating File object from blob for ${photo.id}`);
            const fileObject = new File([photo._blobs.large], photo.name, { type: 'image/jpeg' });
            console.log(`[PhotoContext] File object created: size=${fileObject.size}, type=${fileObject.type}`);
            
            // Track progress for this photo
            const onProgress = (event: any) => {
              if (event.type === 'progress' && event.percent) {
                console.log(`[PhotoContext] Upload progress for ${photo.id}: ${event.percent.toFixed(2)}%`);
                setUploadProgress(prev => ({
                  ...prev,
                  [photo.id]: event.percent
                }));
              }
            };
            
            // Upload the large blob to Cloudinary
            console.log(`[PhotoContext] Uploading photo ${photo.id} to Cloudinary`);
            const result = await photoService.uploadPhoto(
              fileObject
            );
            
            console.log(`[PhotoContext] Upload successful for ${photo.id}`, {
              url: result.url,
              publicId: result.publicId
            });
            
            // Update the photo with Cloudinary URLs
            const updatedPhoto: ProcessedPhoto = {
              ...photo,
              url: result.url,
              tinyThumbnailUrl: result.tinyThumbnailUrl,
              thumbnailUrl: result.thumbnailUrl,
              mediumUrl: result.mediumUrl,
              largeUrl: result.largeUrl,
              publicId: result.publicId,
              isLocal: false, // No longer local
              _blobs: undefined // Remove blobs to free memory
            };
            
            // Update this photo in state
            updatePhoto(photo.id, updatedPhoto);
            
            // Clean up blob URLs
            console.log(`[PhotoContext] Cleaning up blob URLs for ${photo.id}`);
            if (photo.tinyThumbnailUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(photo.tinyThumbnailUrl);
            }
            if (photo.thumbnailUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(photo.thumbnailUrl);
            }
            if (photo.mediumUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(photo.mediumUrl);
            }
            if (photo.url?.startsWith('blob:')) {
              URL.revokeObjectURL(photo.url);
            }
            
            return updatedPhoto;
          } catch (error) {
            console.error(`[PhotoContext] Failed to upload photo ${photo.id}:`, error);
            // Return the original photo if upload failed
            return photo;
          }
        })
      );
      
      // Update all photos
      const allPhotos = [...photos];
      for (const updatedPhoto of updatedPhotos) {
        const index = allPhotos.findIndex(p => p.id === updatedPhoto.id);
        if (index !== -1) {
          allPhotos[index] = updatedPhoto;
        }
      }
      
      console.log('[PhotoContext] All photos processed, updated photos count:', 
        updatedPhotos.filter(p => !p.isLocal).length);
      
      setPhotos(allPhotos);
      return allPhotos;
    } catch (error) {
      console.error('[PhotoContext] Error uploading photos:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [photos, photoService, updatePhoto]);

  return (
    <PhotoContext.Provider value={{ 
      photos, 
      setPhotos, 
      addPhoto, 
      deletePhoto, 
      updatePhoto, 
      loadPhotos,
      uploadLocalPhotos,
      isUploading,
      uploadProgress
    }}>
      {children}
    </PhotoContext.Provider>
  );
};
