import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from 'react';
const PhotoContext = createContext(undefined);
export const usePhotoContext = () => {
    const context = useContext(PhotoContext);
    if (!context) {
        throw new Error('usePhotoContext must be used within a PhotoProvider');
    }
    return context;
};
export const PhotoProvider = ({ children }) => {
    const [photos, setPhotos] = useState([]);
    const addPhoto = (newPhotos) => {
        setPhotos(prev => [...prev, ...newPhotos]);
    };
    const deletePhoto = (photoId) => {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
    };
    const updatePhoto = (photoId, updates) => {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...updates } : p));
    };
    const loadPhotos = (newPhotos) => {
        // Convert SerializedPhoto to ProcessedPhoto
        const processedPhotos = newPhotos.map(photo => ({
            ...photo,
            dateAdded: new Date(photo.dateAdded)
        }));
        // Replace existing photos entirely
        setPhotos(processedPhotos);
    };
    return (_jsx(PhotoContext.Provider, { value: { photos, setPhotos, addPhoto, deletePhoto, updatePhoto, loadPhotos }, children: children }));
};
