import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProcessedPhoto } from '../components/Uploader/PhotoUploader.types';

interface PhotoContextType {
  photos: ProcessedPhoto[];
  addPhoto: (photo: ProcessedPhoto) => void;
  deletePhoto: (photoId: string) => void;
  updatePhoto: (photoId: string, updates: Partial<ProcessedPhoto>) => void;
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

  const addPhoto = (photo: ProcessedPhoto) => {
    setPhotos(prev => [...prev, photo]);
  };

  const deletePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const updatePhoto = (photoId: string, updates: Partial<ProcessedPhoto>) => {
    setPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, ...updates } : p
    ));
  };

  return (
    <PhotoContext.Provider value={{ photos, addPhoto, deletePhoto, updatePhoto }}>
      {children}
    </PhotoContext.Provider>
  );
};
