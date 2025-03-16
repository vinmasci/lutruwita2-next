import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from 'react';
import { useRouteContext } from '../../map/context/RouteContext';
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
    const [isPhotosVisible, setIsPhotosVisible] = useState(true);
    
    // Get access to the RouteContext to notify it of photo changes
    let routeContext;
    try {
        routeContext = useRouteContext();
    } catch (error) {
        // This is expected when the PhotoProvider is used outside of a RouteProvider
        routeContext = null;
    }
    
    // Function to notify RouteContext of photo changes
    const notifyPhotoChange = useCallback(() => {
        if (routeContext) {
            routeContext.setChangedSections(prev => ({...prev, photos: true}));
        }
    }, [routeContext]);
    const addPhoto = (newPhotos) => {
        setPhotos(prev => [...prev, ...newPhotos]);
        notifyPhotoChange();
    };
    const deletePhoto = (photoId) => {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
        notifyPhotoChange();
    };
    const updatePhoto = (photoId, updates) => {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...updates } : p));
        notifyPhotoChange();
    };
    const loadPhotos = (newPhotos) => {
        // Convert SerializedPhoto to ProcessedPhoto
        const processedPhotos = newPhotos.map(photo => ({
            ...photo,
            dateAdded: new Date(photo.dateAdded)
        }));
        // Replace existing photos entirely
        setPhotos(processedPhotos);
        // Don't notify RouteContext when loading photos from route
        // as this is not a user-initiated change
    };
    
    const clearPhotos = () => {
        // Clear all photos by setting to an empty array
        setPhotos([]);
        notifyPhotoChange();
        console.log('[PhotoContext] All photos cleared');
    };
    const togglePhotosVisibility = useCallback(() => {
        setIsPhotosVisible(prev => !prev);
        console.log('[PhotoContext] Photos visibility toggled:', !isPhotosVisible);
    }, [isPhotosVisible]);
    
    return (_jsx(PhotoContext.Provider, { 
        value: { 
            photos, 
            setPhotos, 
            addPhoto, 
            deletePhoto, 
            updatePhoto, 
            loadPhotos, 
            clearPhotos,
            isPhotosVisible,
            togglePhotosVisibility
        }, 
        children: children 
    }));
};
