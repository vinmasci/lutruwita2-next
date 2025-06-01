import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useRouteContext } from '../../map/context/RouteContext';
import { getPhotoIdentifier } from '../../photo/utils/clustering';
import { autoSavePhotosToFirebase } from '../../../services/firebasePhotoAutoSaveService';
import { useAuth0 } from '@auth0/auth0-react';

// REMOVED top-level dynamic import of useAutoSave

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
    
    // Get the current user ID from Auth0
    const { user } = useAuth0();
    const userId = user?.sub;
    
    const [useAutoSaveHook, setUseAutoSaveHook] = useState(null);
    const [autoSaveContextAvailable, setAutoSaveContextAvailable] = useState(false);

    // State to manage dirty status for photos related to a loaded permanent route
    const [lastLoadedPermanentRouteIdForPhotos, setLastLoadedPermanentRouteIdForPhotos] = useState(null);
    const [photosDirtySinceLastLoad, setPhotosDirtySinceLastLoad] = useState(false);

    useEffect(() => {
        // Attempt to dynamically import useAutoSave on component mount
        const importAutoSave = async () => {
            try {
                console.log('[PhotoContext] Attempting dynamic import of AutoSaveContext...');
                const AutoSaveModule = await import('../../../context/AutoSaveContext');
                if (AutoSaveModule && AutoSaveModule.useAutoSave) {
                    console.log('[PhotoContext] Successfully imported useAutoSave hook.');
                    setUseAutoSaveHook(() => AutoSaveModule.useAutoSave); // Store the hook function itself
                    setAutoSaveContextAvailable(true);
                } else {
                    console.warn('[PhotoContext] Dynamic import of AutoSaveContext succeeded, but useAutoSave hook is not available on the module.');
                    setAutoSaveContextAvailable(false);
                }
            } catch (error) {
                console.error('[PhotoContext] Failed to dynamically import AutoSaveContext:', error);
                setAutoSaveContextAvailable(false);
            }
        };
        importAutoSave();
    }, []); // Empty dependency array ensures this runs once on mount

    // Get AutoSaveContext if the hook is available
    // This will re-run when useAutoSaveHook changes
    const autoSave = useAutoSaveHook ? useAutoSaveHook() : null;
    const currentLoadedPermanentRouteIdFromAutoSave = autoSave?.loadedPermanentRouteId;

    // Effect to reset dirty flag when the loaded permanent route in AutoSaveContext changes
    useEffect(() => {
        if (currentLoadedPermanentRouteIdFromAutoSave !== lastLoadedPermanentRouteIdForPhotos) {
            console.log(`[PhotoContext] Permanent route changed or cleared. Old: ${lastLoadedPermanentRouteIdForPhotos}, New: ${currentLoadedPermanentRouteIdFromAutoSave}. Resetting photosDirtySinceLastLoad.`);
            setPhotosDirtySinceLastLoad(false);
            setLastLoadedPermanentRouteIdForPhotos(currentLoadedPermanentRouteIdFromAutoSave);
        }
    }, [currentLoadedPermanentRouteIdFromAutoSave, lastLoadedPermanentRouteIdForPhotos]);

    useEffect(() => {
        if (useAutoSaveHook) {
            console.log('[PhotoContext] useAutoSaveHook is available. Value of autoSave from useAutoSaveHook() during render-effect:', autoSave);
        } else if (autoSaveContextAvailable === false && useAutoSaveHook === null) {
            // This condition means the import attempt finished but failed or hook wasn't found
            console.log('[PhotoContext] AutoSaveContext was determined to be unavailable or import failed.');
        } else {
            // This means import is still in progress or initial state
            console.log('[PhotoContext] useAutoSaveHook is not yet available (likely still loading).');
        }
    }, [useAutoSaveHook, autoSave, autoSaveContextAvailable]);
    
    // Auto-save photos to Firebase when they change
    useEffect(() => {
        // Check if we're in presentation mode by looking at the URL
        const isPresentationMode = window.location.pathname.includes('/presentation/') || 
                                  window.location.pathname.includes('/preview/') ||
                                  window.location.pathname.includes('/route/');
        
        // Skip auto-save if in presentation mode
        if (isPresentationMode) {
            console.log('[PhotoContext] Skipping auto-save - in presentation mode');
            return;
        }
        
        // Skip auto-save if no user
        if (!userId) {
            console.log('[PhotoContext] Skipping auto-save - no user ID');
            return;
        }
        
        // Get the route from RouteContext if available
        const route = routeContext?.currentRoute;
        const currentLoadedPermanentRouteId = autoSave?.loadedPermanentRouteId || null;

        // Enhanced logging for debugging auto-save conditions
        console.log('[PhotoContext] Auto-save check:', {
            hasRoute: !!route,
            currentRouteDetails: route ? { id: route.id, name: route.name } : null, // Log some route details if available
            currentLoadedPermanentRouteId: currentLoadedPermanentRouteId,
            autoSaveContextState: autoSave ? { loadedPermanentRouteId: autoSave.loadedPermanentRouteId, autoSaveId: autoSave.autoSaveId } : null
        });
        
        // Skip auto-save if no route is available AND no permanent route is loaded
        if (!route && !currentLoadedPermanentRouteId) {
            console.log('[PhotoContext] Skipping auto-save - no current route and no permanent route loaded');
            return;
        }
        
            console.log('[PhotoContext] Proceeding with auto-save. Details:', {
            photosCount: photos.length,
            userId,
            routeAvailable: !!route,
            currentLoadedPermanentRouteId: currentLoadedPermanentRouteId,
            photosDirtySinceLastLoad: photosDirtySinceLastLoad
        });

        // If a permanent route is loaded, only save if photos are dirty since that route was loaded.
        // This prevents overwriting permanent photos if `loadPhotos` (e.g. with an empty array due to load failure or new route)
        // was the last thing to change the `photos` state for this permanent route.
        if (currentLoadedPermanentRouteId && !photosDirtySinceLastLoad) {
            console.log('[PhotoContext] Skipping auto-save for permanent route - photos not dirty since this permanent route context was established.');
            return;
        }
        
        // Auto-save photos to Firebase (even if photos array is empty, to handle deletions)
        // Use currentLoadedPermanentRouteId directly, as loadedPermanentRouteId was redundant
        autoSavePhotosToFirebase(photos, route, userId, autoSave, currentLoadedPermanentRouteId)
            .then(autoSaveId => {
                if (autoSaveId) {
                    console.log('[PhotoContext] Photos auto-saved successfully with ID:', autoSaveId);
                    // If save was to a permanent route and it was successful, mark as no longer dirty
                    if (currentLoadedPermanentRouteId) {
                        setPhotosDirtySinceLastLoad(false);
                    }
                } else {
                    console.warn('[PhotoContext] Photos auto-save did not return an ID');
                }
            })
            .catch(error => {
                console.error('[PhotoContext] Error auto-saving photos:', error);
            });
    }, [photos, userId, routeContext?.currentRoute, autoSave?.loadedPermanentRouteId, useAutoSaveHook, photosDirtySinceLastLoad, currentLoadedPermanentRouteIdFromAutoSave]);
    // Dependency changed from 'autoSave' object to 'autoSave?.loadedPermanentRouteId' (specific value)
    // and 'useAutoSaveHook' (to re-run when hook is available)
    // Added photosDirtySinceLastLoad and currentLoadedPermanentRouteIdFromAutoSave (which is autoSave?.loadedPermanentRouteId)
    
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
        
        // Ensure all new photos have a caption field, preserve isManuallyPlaced, and critically, preserve coordinates
        const photosWithCaptionAndCoords = newPhotos.map(photo => {
            const newPhotoObject = {
                ...photo,
                caption: photo.caption || '', // Ensure caption exists
                isManuallyPlaced: photo.isManuallyPlaced || false // Preserve or initialize isManuallyPlaced flag
            };
            // Explicitly ensure coordinates are carried over if they exist on the incoming photo object
            if (photo.coordinates) {
                newPhotoObject.coordinates = photo.coordinates;
            }
            return newPhotoObject;
        });
        
        console.log('[PhotoContext] Adding photos with captions and ensuring coordinates:', photosWithCaptionAndCoords.length);
        
        // Log the first few processed photos to see if captions were added
        if (photosWithCaptionAndCoords.length > 0) {
            console.log('[PhotoContext] First few photos after adding captions:', 
                photosWithCaptionAndCoords.slice(0, 3).map(p => ({
                    url: p.url ? p.url.substring(0, 30) + '...' : 'no-url',
                    caption: p.caption,
                    hasCaption: p.caption !== undefined
                }))
            );
        }
        
        setPhotos(prev => [...prev, ...photosWithCaptionAndCoords]);
        
        // Track changes for each new photo
        photosWithCaptionAndCoords.forEach(photo => {
            const photoId = getPhotoIdentifier(photo.url);
            if (photoId) {
                trackPhotoChange(photoId);
            }
        });
        setPhotosDirtySinceLastLoad(true);
        notifyPhotoChange('add');
    };
    const deletePhoto = async (photoUrl) => {
        console.log('[PhotoContext] Deleting photo with URL:', photoUrl);
        console.log('[PhotoContext] Current photos count before deletion:', photos.length);

        const identifier = getPhotoIdentifier(photoUrl);
        if (!identifier) {
            console.error('[PhotoContext] Failed to get identifier for photo, aborting deletion');
            return; // Abort deletion if we can't get an identifier
        }

        console.log('[PhotoContext] Deleting photo with identifier:', identifier);

        // Find the photo to get its publicId before removing it
        const photoToDelete = photos.find(p => getPhotoIdentifier(p.url) === identifier);
        
        // Create a copy of the photos array for comparison
        const photosBefore = [...photos];

        setPhotos(prev => {
            // Safety check - don't delete if we would remove all photos
            const newPhotos = prev.filter(p => {
                const photoId = getPhotoIdentifier(p.url);
                const shouldKeep = photoId !== identifier;
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
            } else {
                console.log(`[PhotoContext] Successfully removed ${prev.length - newPhotos.length} photo(s)`);
            }

            console.log('[PhotoContext] Deleted photo, remaining count:', newPhotos.length);
            return newPhotos;
        });

        // Remove the photo from tracked changes if it was being tracked
        if (identifier && changedPhotos.has(identifier)) {
            setChangedPhotos(prev => {
                const newSet = new Set(prev);
                newSet.delete(identifier);
                return newSet;
            });
        }
        
        // If the photo has a publicId, delete it from Cloudinary
        if (photoToDelete && photoToDelete.publicId) {
            try {
                console.log('[PhotoContext] Deleting photo from Cloudinary with publicId:', photoToDelete.publicId);
                
                // Import the deleteFromCloudinary function dynamically
                const { deleteFromCloudinary } = await import('../../../utils/cloudinary');
                
                // Delete the photo from Cloudinary
                const result = await deleteFromCloudinary(photoToDelete.publicId);
                
                if (result) {
                    console.log('[PhotoContext] Successfully deleted photo from Cloudinary');
                } else {
                    console.warn('[PhotoContext] Failed to delete photo from Cloudinary');
                }
            } catch (error) {
                console.error('[PhotoContext] Error deleting photo from Cloudinary:', error);
            }
        }
        
        // Ensure we mark this as a deletion in the RouteContext
        console.log('[PhotoContext] Notifying RouteContext of photo deletion');
        setPhotosDirtySinceLastLoad(true);
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
        setPhotosDirtySinceLastLoad(true);
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
        setPhotosDirtySinceLastLoad(true);
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
        setPhotosDirtySinceLastLoad(false); // Explicitly mark as not dirty after a load operation
        
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
        setPhotosDirtySinceLastLoad(true); // Clearing photos is a "dirtying" action
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
