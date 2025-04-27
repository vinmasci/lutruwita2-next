import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback, useRef } from 'react';
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
    const [changedPhotos, setChangedPhotos] = useState(new Set());
    
    // Get access to the RouteContext to notify it of photo changes
    let routeContext;
    try {
        routeContext = useRouteContext();
    } catch (error) {
        // This is expected when the PhotoProvider is used outside of a RouteProvider
        routeContext = null;
    }
    
    // Track photo changes
    const trackPhotoChange = useCallback((photoId) => {
        // console.log(`[PhotoContext] Tracking change for photo: ${photoId}`);
        setChangedPhotos(prev => {
            const newSet = new Set(prev);
            newSet.add(photoId);
            return newSet;
        });
    }, []);
    
    // Clear tracked changes after commit
    const clearPhotoChanges = useCallback(() => {
        console.log('[PhotoContext] Clearing tracked photo changes');
        setChangedPhotos(new Set());
    }, []);
    
    // Get photos that have changes
    const getChangedPhotos = useCallback(() => {
        return photos.filter(photo => {
            const photoId = getPhotoIdentifier(photo.url);
            return changedPhotos.has(photoId);
        });
    }, [photos, changedPhotos]);
    
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
        // Log the first few photos to see if they have captions
        if (newPhotos.length > 0) {
            console.log('[PhotoContext] First few photos before adding captions:', 
                newPhotos.slice(0, 3).map(p => ({
                    url: p.url ? p.url.substring(0, 30) + '...' : 'no-url',
                    caption: p.caption,
                    hasCaption: p.caption !== undefined
                }))
            );
        }
        
        // Ensure all new photos have a caption field and preserve isManuallyPlaced flag
        const photosWithCaption = newPhotos.map(photo => ({
            ...photo,
            caption: photo.caption || '', // Ensure caption exists
            isManuallyPlaced: photo.isManuallyPlaced || false // Preserve or initialize isManuallyPlaced flag
        }));
        
        console.log('[PhotoContext] Adding photos with captions:', photosWithCaption.length);
        
        // Log the first few processed photos to see if captions were added
        if (photosWithCaption.length > 0) {
            console.log('[PhotoContext] First few photos after adding captions:', 
                photosWithCaption.slice(0, 3).map(p => ({
                    url: p.url ? p.url.substring(0, 30) + '...' : 'no-url',
                    caption: p.caption,
                    hasCaption: p.caption !== undefined
                }))
            );
        }
        
        setPhotos(prev => [...prev, ...photosWithCaption]);
        
        // Track changes for each new photo
        photosWithCaption.forEach(photo => {
            const photoId = getPhotoIdentifier(photo.url);
            if (photoId) {
                trackPhotoChange(photoId);
            }
        });
        
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

        // Remove the photo from tracked changes if it was being tracked
        if (identifier && changedPhotos.has(identifier)) {
            setChangedPhotos(prev => {
                const newSet = new Set(prev);
                newSet.delete(identifier);
                return newSet;
            });
        }
        
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
        
        // Track this photo as changed
        trackPhotoChange(identifier);
        
        notifyPhotoChange('update');
    };

    // Update the position of a photo (for manually placed/draggable photos)
    const updatePhotoPosition = (photoUrl, newCoordinates) => {
        const identifier = getPhotoIdentifier(photoUrl);
        if (!identifier) {
            console.error('[PhotoContext] Failed to get identifier for photo position update, aborting');
            return;
        }
        
        console.log('[PhotoContext] Updating photo position with identifier:', identifier);
        console.log('[PhotoContext] New coordinates:', newCoordinates);
        
        setPhotos(prev => prev.map(p => {
            const photoId = getPhotoIdentifier(p.url);
            if (photoId === identifier) {
                return { 
                    ...p, 
                    coordinates: newCoordinates,
                    // Ensure the photo is marked as manually placed if it's being repositioned
                    isManuallyPlaced: true
                };
            }
            return p;
        }));
        
        // Track this photo as changed
        trackPhotoChange(identifier);
        
        notifyPhotoChange('update');
    };
    // Cache for photo identifiers to avoid reloading the same photos
    const photoIdentifiersCache = useRef(new Set());

    // Helper function to normalize URLs for protocol-agnostic comparison
    const normalizeUrl = (url) => {
        if (!url) return '';
        // Remove protocol (http:// or https://) from the URL for comparison
        return url.replace(/^https?:\/\//, '');
    };

    // Helper function to ensure HTTPS URLs
    const ensureHttpsUrl = (url) => {
        if (typeof url === 'string' && url.startsWith('http:')) {
            return url.replace('http:', 'https:');
        }
        return url;
    };

    const loadPhotos = (newPhotos) => {
        if (!newPhotos || newPhotos.length === 0) {
            setPhotos([]);
            photoIdentifiersCache.current.clear();
            return;
        }

        // CRITICAL FIX: PRESERVE CAPTIONS DURING PROCESSING
        // First, create a deep copy of all photos to ensure we don't lose any properties
        const photosCopy = newPhotos.map(photo => {
            // Create a complete copy of the photo object
            const photoCopy = { ...photo };
            
            // Explicitly preserve caption if it exists
            if (photo.caption !== undefined && photo.caption !== null) {
                photoCopy.caption = photo.caption;
            }
            
            return photoCopy;
        });

        // Now ensure all URLs use HTTPS
        const photosWithHttps = photosCopy.map(photo => {
            // Create a new object to avoid modifying the original
            const photoWithHttps = { ...photo };
            
            // Only modify the URL properties
            if (photoWithHttps.url) {
                photoWithHttps.url = ensureHttpsUrl(photoWithHttps.url);
            }
            if (photoWithHttps.thumbnailUrl) {
                photoWithHttps.thumbnailUrl = ensureHttpsUrl(photoWithHttps.thumbnailUrl);
            }
            
            // Verify caption is still preserved after URL conversion
            if (photo.caption !== undefined && photo.caption !== null) {
                if (photoWithHttps.caption !== photo.caption) {
                    // Force restore the caption
                    photoWithHttps.caption = photo.caption;
                }
            }
            
            return photoWithHttps;
        });

        // Extract identifiers from new photos using normalized URLs
        const newPhotoIdentifiers = photosWithHttps.map(p => getPhotoIdentifier(normalizeUrl(p.url)));

        // Convert SerializedPhoto to ProcessedPhoto and ensure caption field exists
        const processedPhotos = photosWithHttps.map(photo => {
            // IMPORTANT: Check if caption exists and is not null
            const hasCaption = photo.caption !== undefined && photo.caption !== null;
            
            // Create a new object with all properties from the original photo
            const processedPhoto = {
                ...photo,
                // CRITICAL: Preserve the original caption if it exists
                caption: hasCaption ? photo.caption : '',
                dateAdded: new Date(photo.dateAdded || Date.now()),
                // Preserve isManuallyPlaced flag if it exists, otherwise initialize to false
                isManuallyPlaced: photo.isManuallyPlaced || false
            };
            
            return processedPhoto;
        });

        // Replace existing photos entirely
        setPhotos(processedPhotos);
        
        // Update the cache with the new photo identifiers
        photoIdentifiersCache.current = new Set(newPhotoIdentifiers);

        // Don't notify RouteContext when loading photos from route
        // as this is not a user-initiated change
    };

    const clearPhotos = () => {
        // Clear all photos by setting to an empty array
        setPhotos([]);
        // Clear all tracked changes
        clearPhotoChanges();
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
            updatePhotoPosition,
            loadPhotos, 
            clearPhotos,
            isPhotosVisible,
            togglePhotosVisibility,
            // Expose change tracking functions
            changedPhotos,
            trackPhotoChange,
            clearPhotoChanges,
            getChangedPhotos
        }, 
        children: children 
    }));
};
