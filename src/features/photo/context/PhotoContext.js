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
        // console.log(`[PhotoContext] notifyPhotoChange called with type: ${changeType}`); // *** ADDED LOGGING ***
        if (routeContext) {
            // console.log('[PhotoContext] Calling routeContext.setChangedSections to set photos: true'); // *** ADDED LOGGING ***
            routeContext.setChangedSections(prev => {
                const newState = { // *** ADDED LOGGING ***
                    ...prev,
                    photos: true,
                    photoChangeType: changeType // 'add', 'delete', or 'update'
                };
                // console.log('[PhotoContext] New changedSections state:', newState); // *** ADDED LOGGING ***
                return newState;
            });
        } else {
            // console.log('[PhotoContext] routeContext not available, cannot notify.'); // *** ADDED LOGGING ***
        }
    }, [routeContext]);
    const addPhoto = (newPhotos) => {
        // Ensure all new photos have a caption field
        const photosWithCaption = newPhotos.map(photo => ({
            ...photo,
            caption: photo.caption || '' // Ensure caption exists
        }));
        
        console.log('[PhotoContext] Adding photos with captions:', photosWithCaption.length);
        
        setPhotos(prev => [...prev, ...photosWithCaption]);
        notifyPhotoChange('add');
    };
    const deletePhoto = (photoUrl) => {
        // console.log('[PhotoContext] Deleting photo with URL:', photoUrl);
        // console.log('[PhotoContext] Current photos count before deletion:', photos.length);

        // Log all current photo identifiers for debugging
        // console.log('[PhotoContext] Current photo identifiers:',
        //     photos.map(p => ({ id: getPhotoIdentifier(p.url), url: p.url.substring(0, 30) + '...' })));

        const identifier = getPhotoIdentifier(photoUrl);
        if (!identifier) {
            console.error('[PhotoContext] Failed to get identifier for photo, aborting deletion');
            return; // Abort deletion if we can't get an identifier
        }

        // console.log('[PhotoContext] Deleting photo with identifier:', identifier);

        // Create a copy of the photos array for comparison
        const photosBefore = [...photos];

        setPhotos(prev => {
            // Safety check - don't delete if we would remove all photos
            const newPhotos = prev.filter(p => {
                const photoId = getPhotoIdentifier(p.url);
                const shouldKeep = photoId !== identifier;
                // if (!shouldKeep) {
                //     console.log(`[PhotoContext] Removing photo with ID: ${photoId}`);
                // }
                return shouldKeep;
            });

            // If we would delete all photos, something is wrong - abort
            if (newPhotos.length === 0 && prev.length > 1) {
                console.error('[PhotoContext] Attempted to delete all photos, aborting');
                return prev; // Return original array unchanged
            }

            // Check if any photos were actually removed
            if (newPhotos.length === prev.length) {
                console.warn('[PhotoContext] No photos were removed! Identifier not found:', identifier);
                // console.log('[PhotoContext] Available identifiers:',
                //     prev.map(p => getPhotoIdentifier(p.url)));
            } else {
                // console.log(`[PhotoContext] Successfully removed ${prev.length - newPhotos.length} photo(s)`);
            }

            // console.log('[PhotoContext] Deleted photo, remaining count:', newPhotos.length);
            // console.log('[PhotoContext] Remaining photo IDs:', newPhotos.map(p => getPhotoIdentifier(p.url)));
            return newPhotos;
        });

        // Double-check that the photo was actually removed by comparing arrays
        // setTimeout(() => {
        //     if (photos.length === photosBefore.length) {
        //         console.warn('[PhotoContext] Photo deletion may not have been applied to state!');
        //         console.log('[PhotoContext] Photos before:', photosBefore.map(p => getPhotoIdentifier(p.url)));
        //         console.log('[PhotoContext] Photos after:', photos.map(p => getPhotoIdentifier(p.url)));
        //     } else {
        //         console.log('[PhotoContext] Photo deletion confirmed, photos count reduced from',
        //             photosBefore.length, 'to', photos.length);
        //     }
        // }, 0);

        // Ensure we mark this as a deletion in the RouteContext
        // console.log('[PhotoContext] Notifying RouteContext of photo deletion');
        notifyPhotoChange('delete');
    };
    const updatePhoto = (photoUrl, updates) => {
        const identifier = getPhotoIdentifier(photoUrl);
        if (!identifier) {
            console.error('[PhotoContext] Failed to get identifier for photo update, aborting');
            return;
        }
        
        // Log the update for debugging
        console.log('[PhotoContext] Updating photo with identifier:', identifier);
        console.log('[PhotoContext] Updates:', updates);
        
        setPhotos(prev => prev.map(p => {
            const photoId = getPhotoIdentifier(p.url);
            if (photoId === identifier) {
                // Initialize caption as empty string if it doesn't exist and we're trying to update it
                if (updates.caption !== undefined && p.caption === undefined) {
                    console.log('[PhotoContext] Adding caption field to photo that didn\'t have one');
                    return { ...p, caption: '', ...updates };
                }
                return { ...p, ...updates };
            }
            return p;
        }));
        notifyPhotoChange('update');
    };
    const loadPhotos = (newPhotos) => {
        console.log('[PhotoContext] Loading photos:', newPhotos ? newPhotos.length : 0);

        if (!newPhotos || newPhotos.length === 0) {
            console.log('[PhotoContext] No photos to load, clearing photos array');
            setPhotos([]);
            return;
        }

        // Log photo identifiers for debugging
        if (newPhotos.length > 0) {
            console.log('[PhotoContext] Loading photos with identifiers:',
                newPhotos.map(p => getPhotoIdentifier(p.url)));
        }

        // Convert SerializedPhoto to ProcessedPhoto and ensure caption field exists
        const processedPhotos = newPhotos.map(photo => {
            // Ensure caption field exists, initialize as empty string if it doesn't
            const hasCaption = photo.caption !== undefined;
            if (!hasCaption) {
                console.log('[PhotoContext] Adding missing caption field to photo:', getPhotoIdentifier(photo.url));
            }
            
            return {
                ...photo,
                caption: photo.caption || '', // Ensure caption exists
                dateAdded: new Date(photo.dateAdded || Date.now())
            };
        });

        // Replace existing photos entirely
        setPhotos(processedPhotos);
        console.log('[PhotoContext] Photos loaded successfully:', processedPhotos.length);

        // Don't notify RouteContext when loading photos from route
        // as this is not a user-initiated change
    };

    const clearPhotos = () => {
        // Clear all photos by setting to an empty array
        setPhotos([]);
        notifyPhotoChange('clear');
        // console.log('[PhotoContext] All photos cleared');
    };
    const togglePhotosVisibility = useCallback(() => {
        setIsPhotosVisible(prev => !prev);
        // console.log('[PhotoContext] Photos visibility toggled:', !isPhotosVisible);
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
