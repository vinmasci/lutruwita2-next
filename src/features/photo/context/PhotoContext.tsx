import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProcessedPhoto } from '../components/Uploader/PhotoUploader.types';
import { SerializedPhoto } from '../../map/types/route.types';

interface PhotoContextType {
  photos: ProcessedPhoto[];
  setPhotos: (photos: ProcessedPhoto[]) => void;  // Add direct setter
  addPhoto: (photos: ProcessedPhoto[]) => void;
  deletePhoto: (photoId: string) => void;
  updatePhoto: (photoId: string, updates: Partial<ProcessedPhoto>) => void;
  loadPhotos: (newPhotos: SerializedPhoto[]) => void;
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

  const addPhoto = (newPhotos: ProcessedPhoto[]) => {
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const deletePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const updatePhoto = (photoId: string, updates: Partial<ProcessedPhoto>) => {
    setPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, ...updates } : p
    ));
  };

  const loadPhotos = (newPhotos: SerializedPhoto[]) => {
    // Convert SerializedPhoto to ProcessedPhoto
    const processedPhotos = newPhotos.map(photo => ({
      ...photo,
      dateAdded: new Date(photo.dateAdded)
    }));

    // Replace existing photos entirely
    setPhotos(processedPhotos);
  };

  return (
    <PhotoContext.Provider value={{ photos, setPhotos, addPhoto, deletePhoto, updatePhoto, loadPhotos }}>
      {children}
    </PhotoContext.Provider>
  );
};
