import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from 'react';
import { useRouteContext } from '../../map/context/RouteContext';
import { getPhotoIdentifier } from '../../photo/utils/clustering';

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
    const notifyPhotoChange = useCallback((changeType = 'update') => {
        if (routeContext) {
            routeContext.setChangedSections(prev => ({
                ...prev, 
                photos: true,
                photoChangeType: changeType // 'add', 'delete', or 'update'
            }));
        }
    }, [routeContext]);
    const addPhoto = (newPhotos) => {
        setPhotos(prev => [...prev, ...newPhotos]);
        notifyPhotoChange('add');
    };
    const deletePhoto = (photoUrl) => {
        console.log('[PhotoContext] Deleting photo with URL:', photoUrl);
        console.log('[PhotoContext] Current photos count before deletion:', photos.length);
        
        const identifier = getPhotoIdentifier(photoUrl);
        if (!identifier) {
            console.error('[PhotoContext] Failed to get identifier for photo, aborting deletion');
            return; // Abort deletion if we can't get an identifier
        }
        
        console.log('[PhotoContext] Deleting photo with identifier:', identifier);
        
        setPhotos(prev => {
            // Safety check - don't delete if we would remove all photos
            const newPhotos = prev.filter(p => {
                const photoId = getPhotoIdentifier(p.url);
                return photoId !== identifier;
            });
            
            // If we would delete all photos, something is wrong - abort
            if (newPhotos.length === 0 && prev.length > 1) {
                console.error('[PhotoContext] Attempted to delete all photos, aborting');
                return prev; // Return original array unchanged
            }
            
            console.log('[PhotoContext] Deleted photo, remaining count:', newPhotos.length);
            return newPhotos;
        });
        
        notifyPhotoChange('delete');
    };
    const updatePhoto = (photoUrl, updates) => {
        const identifier = getPhotoIdentifier(photoUrl);
        if (!identifier) {
            console.error('[PhotoContext] Failed to get identifier for photo update, aborting');
            return;
        }
        
        setPhotos(prev => prev.map(p => {
            const photoId = getPhotoIdentifier(p.url);
            return photoId === identifier ? { ...p, ...updates } : p;
        }));
        notifyPhotoChange('update');
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
        notifyPhotoChange('clear');
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
