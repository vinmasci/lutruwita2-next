import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { Box, Button, IconButton, Snackbar, Alert, Typography, styled } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { RichTextEditor } from './RichTextEditor';
import { fileToProcessedPhoto, deserializePhoto, serializePhoto } from '../../../../features/photo/utils/photoUtils';
import { useRouteContext } from '../../../../features/map/context/RouteContext';
import { usePhotoService } from '../../../../features/photo/services/photoService';
import { usePhotoContext } from '../../../../features/photo/context/PhotoContext';
import { autoSaveDescriptionToFirebase } from '../../../../services/firebaseDescriptionAutoSaveService';
import { useAuth0 } from '@auth0/auth0-react';
import { useAutoSave } from '../../../../context/AutoSaveContext';

// @ts-ignore - Import ImageSliderWithLightbox
import ImageSliderWithLightbox from '../../../../features/presentation/components/ImageSlider/ImageSliderWithLightbox';

const BACKGROUND_COLOR = 'rgba(26, 26, 26, 0.9)';
const EDITOR_BACKGROUND = 'rgb(35, 35, 35)';
const BUTTON_COLOR = '#2196f3'; // Material UI Blue

// Styled container for the slider that fills the available space
const SliderContainer = styled(Box)({
  height: '100%',
  width: '100%',
  borderRadius: '4px',
  overflow: 'hidden',
  position: 'relative'
});

// Function to check if a point is near a route
const isPointNearRoute = (
  point,
  route,
  threshold = 0.001 // Approximately 100 meters at the equator
) => {
  if (!route.geojson || !route.geojson.features || route.geojson.features.length === 0) {
    return false;
  }

  // Find LineString features in the GeoJSON
  const lineFeatures = route.geojson.features.filter(
    feature => feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString'
  );

  if (lineFeatures.length === 0) {
    return false;
  }

  // Check each line feature
  for (const feature of lineFeatures) {
    let coordinates;

    if (feature.geometry.type === 'LineString') {
      coordinates = feature.geometry.coordinates;
    } else if (feature.geometry.type === 'MultiLineString') {
      // Flatten MultiLineString coordinates
      coordinates = feature.geometry.coordinates.flat();
    } else {
      continue;
    }

    // Check each segment of the line
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [lng1, lat1] = coordinates[i];
      const [lng2, lat2] = coordinates[i + 1];

      // Check if point is near this segment
      if (isPointNearSegment(point, { lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }, threshold)) {
        return true;
      }
    }
  }

  return false;
};

// Helper function to check if a point is near a line segment
const isPointNearSegment = (
  point,
  start,
  end,
  threshold
) => {
  // Calculate the squared distance from point to line segment
  const squaredDistance = getSquaredDistanceToSegment(point, start, end);
  
  // Compare with threshold squared (to avoid taking square root)
  return squaredDistance <= threshold * threshold;
};

// Calculate squared distance from point to line segment
const getSquaredDistanceToSegment = (
  point,
  start,
  end
) => {
  const { lat: x, lng: y } = point;
  const { lat: x1, lng: y1 } = start;
  const { lat: x2, lng: y2 } = end;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return dx * dx + dy * dy;
};

export const RouteDescriptionPanel = ({ route }) => {
    console.log('🔥🔥🔥 [RouteDescriptionPanel] COMPONENT INITIALIZED 🔥🔥🔥');
    console.log('🔥 [RouteDescriptionPanel] Received route prop:', {
        route: route,
        routeId: route?.routeId,
        routeName: route?.name,
        routeDescription: route?.description,
        routeType: typeof route?.description
    });

    const { 
        updateRoute, 
        routes, 
        masterDescription, 
        updateMasterDescription, 
        currentLoadedPersistentId,
        currentLoadedState 
    } = useRouteContext();

    console.log('🔥 [RouteDescriptionPanel] RouteContext values:', {
        masterDescription: masterDescription,
        masterDescriptionLength: masterDescription?.length || 0,
        currentLoadedPersistentId: currentLoadedPersistentId,
        currentLoadedState: currentLoadedState,
        routesCount: routes?.length || 0,
        updateMasterDescriptionFunction: typeof updateMasterDescription
    });

    const photoService = usePhotoService();
    const { photos: globalPhotos } = usePhotoContext();
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState([]);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mapPhotosAdded, setMapPhotosAdded] = useState(false);
    
    console.log('🔥 [RouteDescriptionPanel] Local state:', {
        description: description,
        descriptionLength: description?.length || 0,
        photosCount: photos?.length || 0
    });
    
    // Add these lines to get the user ID and auto-save context
    const { user, isAuthenticated } = useAuth0();
    const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
    const autoSave = useAutoSave();

    // Determine if this is a master route description or individual segment description
    const isMasterRoute = useMemo(() => {
        console.log('🔥 [RouteDescriptionPanel] Calculating isMasterRoute...');
        
        // This is a master route if:
        // 1. We have a currentLoadedPersistentId (loaded from saved route)
        // 2. The route represents the overall collection, not an individual segment
        // 3. We're showing the "Overview" description (not a specific segment description)
        
        const hasLoadedRoute = !!currentLoadedPersistentId;
        const routeHasSegmentDescription = route?.description && typeof route.description === 'object';
        
        console.log('🔥 [RouteDescriptionPanel] isMasterRoute calculation:', {
            hasLoadedRoute,
            routeHasSegmentDescription,
            currentLoadedPersistentId,
            routeDescription: route?.description,
            routeDescriptionType: typeof route?.description
        });
        
        // If we have a loaded route and the route doesn't have a segment-specific description object,
        // then this is likely the master route description
        const result = hasLoadedRoute && !routeHasSegmentDescription;
        
        console.log('🔥 [RouteDescriptionPanel] isMasterRoute result:', result);
        return result;
    }, [currentLoadedPersistentId, route?.description]);

    console.log('🔥 [RouteDescriptionPanel] isMasterRoute final value:', isMasterRoute);
    console.log('🔵 [RDP DEBUG] Evaluating isMasterRoute. currentLoadedPersistentId:', currentLoadedPersistentId, 'route?.description type:', typeof route?.description, 'isMasterRoute:', isMasterRoute);


    // Filter photos that are near the current route
    const nearbyPhotos = useMemo(() => {
        if (!route || !globalPhotos.length) {
            return [];
        }

        return globalPhotos.filter(photo => 
            photo.coordinates && 
            isPointNearRoute(photo.coordinates, route)
        );
    }, [route, globalPhotos]);

    // Combine route and nearby photos
    const allPhotos = useMemo(() => {
        return [...photos, ...nearbyPhotos];
    }, [photos, nearbyPhotos]);

    // Keep local state in sync with route changes and master description
    useEffect(() => {
        console.log('🔵 [RDP DEBUG] Main Sync useEffect: TRIGGERED. Dependencies: route, masterDescription, isMasterRoute.');
        console.log('🔵 [RDP DEBUG] Main Sync useEffect: Current isMasterRoute:', isMasterRoute);
        console.log('🔵 [RDP DEBUG] Main Sync useEffect: Current masterDescription from context:', masterDescription);
        console.log('🔵 [RDP DEBUG] Main Sync useEffect: Current route prop:', route);

        if (isMasterRoute) {
            console.log('🔵 [RDP DEBUG] Main Sync useEffect: Condition MET (isMasterRoute is true).');
            console.log('🔵 [RDP DEBUG] Main Sync useEffect: Setting local description from masterDescription. Value:', `"${masterDescription || ''}"`);
            setDescription(masterDescription || '');
            // Photos for master route are typically handled globally or not part of its direct description object
            // setPhotos([]); // Decided by existing logic if master route should have its own 'photos' array in description
        } else if (route) {
            console.log('🔵 [RDP DEBUG] Main Sync useEffect: Condition MET (isMasterRoute is false, route exists).');
            // For individual segment routes, use the route's own description
            if (typeof route.description === 'string') {
                console.log('🔵 [RDP DEBUG] Main Sync useEffect: route.description is a string. Value:', `"${route.description}"`);
                setDescription(route.description);
                // setPhotos([]); // Assuming segment string description doesn't have photos
            } else if (route.description && typeof route.description === 'object') {
                console.log('🔵 [RDP DEBUG] Main Sync useEffect: route.description is an object. Value:', route.description);
                const newDesc = route.description.description ?? '';
                const newPhotos = (route.description.photos || []).map(deserializePhoto);
                console.log('🔵 [RDP DEBUG] Main Sync useEffect: Setting local description to:', `"${newDesc}"`, 'and photos count:', newPhotos.length);
                setDescription(newDesc);
                setPhotos(newPhotos);
            } else {
                console.log('🔵 [RDP DEBUG] Main Sync useEffect: route.description is not a string or valid object. Clearing local description.');
                setDescription('');
                setPhotos([]);
            }
        } else {
            console.log('🔵 [RDP DEBUG] Main Sync useEffect: Condition NOT MET (isMasterRoute is false, no route prop). Clearing local description.');
            setDescription('');
            setPhotos([]);
        }
        
        // setMapPhotosAdded(false); // Reset flag when route changes - This seems to be handled by another effect. Let's keep it focused.
        
        // Log final state *after* potential setDescription call (will reflect in next render or if logged asynchronously)
        // To see immediate effect, log the value being passed to setDescription above.
    }, [route, masterDescription, isMasterRoute]);

    // Add debugging for when masterDescription changes
    useEffect(() => {
        console.log('🔵 [RDP DEBUG] masterDescription (from context) CHANGED. New value:', `"${masterDescription}"`, 'Length:', masterDescription?.length || 0);
    }, [masterDescription]);

    // Add debugging for when currentLoadedPersistentId changes
    useEffect(() => {
        console.log('🔵 [RDP DEBUG] currentLoadedPersistentId (from context) CHANGED. New value:', currentLoadedPersistentId);
    }, [currentLoadedPersistentId]);

    // Add debugging for when route prop changes
    useEffect(() => {
        console.log('🔵 [RDP DEBUG] route prop CHANGED. New value:', route);
    }, [route]);

    // Add debugging for when local description state changes
    useEffect(() => {
        console.log('� [RDP DEBUG] Local description state CHANGED. New value:', `"${description}"`, 'Length:', description?.length || 0);
    }, [description]);

    // Add nearby photos from the map to the description panel
    useEffect(() => {
        if (!route || mapPhotosAdded || nearbyPhotos.length === 0) {
            return;
        }

        // Get IDs of photos already in the description
        const existingPhotoIds = new Set(photos.map(p => p.id));
        
        // Filter out photos that are already in the description
        const newPhotos = nearbyPhotos.filter(p => !existingPhotoIds.has(p.id));
        
        if (newPhotos.length > 0) {
            console.log('🔥 [RouteDescriptionPanel] Adding nearby photos from map:', newPhotos.length);
            setPhotos(prev => [...prev, ...newPhotos]);
            setMapPhotosAdded(true);
        }
    }, [route, photos, nearbyPhotos, mapPhotosAdded]);

    // Debounced update - handle master route vs segment route differently
    useEffect(() => {
        console.log('🔥 [RouteDescriptionPanel] Debounced update useEffect triggered');
        
        if (!route?.routeId) {
            console.log('🔥 [RouteDescriptionPanel] No route ID, skipping update');
            return;
        }

        // For master routes, update the master description
        if (isMasterRoute) {
            const currentMasterDescription = masterDescription || '';
            
            console.log('🔥 [RouteDescriptionPanel] Master route update check:', {
                currentMasterDescription,
                newDescription: description,
                areEqual: currentMasterDescription === description
            });
            
            if (currentMasterDescription !== description) {
                console.log('🔥 [RouteDescriptionPanel] Master description needs update, scheduling...');

                const timeoutId = setTimeout(() => {
                    console.log('🔥 [RouteDescriptionPanel] Executing master description update');
                    updateMasterDescription(description);
                }, 500); // Debounce updates

                return () => {
                    console.log('🔥 [RouteDescriptionPanel] Clearing master description update timeout');
                    clearTimeout(timeoutId);
                };
            } else {
                console.log('🔥 [RouteDescriptionPanel] Master description unchanged, no update needed');
            }
        } else {
            console.log('🔥 [RouteDescriptionPanel] Segment route update check');
            // For individual segments, update the route description
            const currentRoute = routes.find(r => r.routeId === route.routeId);
            if (!currentRoute) {
                console.log('🔥 [RouteDescriptionPanel] Current route not found in routes array');
                return;
            }

            const hasChanges = 
                currentRoute.description?.description !== description ||
                currentRoute.description?.photos?.length !== photos.length;

            console.log('🔥 [RouteDescriptionPanel] Segment route change check:', {
                currentDescription: currentRoute.description?.description,
                newDescription: description,
                currentPhotosLength: currentRoute.description?.photos?.length,
                newPhotosLength: photos.length,
                hasChanges
            });

            if (hasChanges) {
                console.log('🔥 [RouteDescriptionPanel] Segment route needs update, scheduling...');

                const timeoutId = setTimeout(() => {
                    console.log('🔥 [RouteDescriptionPanel] Executing segment route update');
                    const routeId = route.routeId;
                    const updates = {
                        description: {
                            description: description ?? '',
                            photos: photos.map(serializePhoto)
                        }
                    };
                    updateRoute(routeId, updates);
                }, 500); // Debounce updates

                return () => {
                    console.log('🔥 [RouteDescriptionPanel] Clearing segment route update timeout');
                    clearTimeout(timeoutId);
                };
            } else {
                console.log('🔥 [RouteDescriptionPanel] Segment route unchanged, no update needed');
            }
        }
    }, [description, photos, route?.routeId, routes, updateRoute, isMasterRoute, masterDescription, updateMasterDescription]);
    
    // Add a new useEffect for auto-saving to Firebase
    useEffect(() => {
        if (!route?.routeId || !userId) return;
        if (isSaving) return; // isSaving is for manual save, not auto-save loop

        // Determine the current description and photos from the route/master context for comparison
        let currentSavedDescription = '';
        let currentSavedPhotos = [];

        if (isMasterRoute) {
            currentSavedDescription = masterDescription || '';
            // Master route description doesn't typically have photos directly in its description object for comparison
        } else if (route) {
            if (typeof route.description === 'string') {
                currentSavedDescription = route.description;
            } else if (route.description && typeof route.description === 'object') {
                currentSavedDescription = route.description.description ?? '';
                currentSavedPhotos = (route.description.photos || []).map(deserializePhoto);
            }
        }

        // Compare current local state (description, photos) with the last saved state
        const descriptionChanged = currentSavedDescription !== description;
        const photosChanged = photos.length !== currentSavedPhotos.length ||
                              photos.some((p, i) => p.id !== currentSavedPhotos[i]?.id); // Simple ID check for photo changes

        if (!descriptionChanged && !photosChanged) {
            console.log('🔥 [RouteDescriptionPanel] Auto-save skipped: No changes detected.');
            return; // No changes, so don't auto-save
        }
        
        // Create a description object that matches the MongoDB structure
        const descriptionData = {
            description: description ?? '',
            photos: photos.map(serializePhoto)
        };
        
        // Debounce the auto-save to avoid too many writes
        const timeoutId = setTimeout(() => {
            console.log('🔥 [RouteDescriptionPanel] Auto-saving description to Firebase:', {
                routeId: route.routeId,
                descriptionLength: description?.length || 0,
                photoCount: photos.length
            });
            
            autoSaveDescriptionToFirebase(descriptionData, route, userId, autoSave)
                .then(autoSaveId => {
                    if (autoSaveId) {
                        console.log('🔥 [RouteDescriptionPanel] Description auto-saved successfully with ID:', autoSaveId);
                    } else {
                        console.warn('🔥 [RouteDescriptionPanel] Description auto-save did not return an ID');
                    }
                })
                .catch(error => {
                    console.error('🔥 [RouteDescriptionPanel] Error auto-saving description:', error);
                });
        }, 1000); // 1 second debounce
        
        return () => clearTimeout(timeoutId);
    }, [description, photos, route, userId, autoSave, isSaving, isMasterRoute, masterDescription]); // Added isMasterRoute, masterDescription to dependencies

    const handlePhotoChange = (event) => {
        if (event.target.files) {
            const newPhotos = Array.from(event.target.files).map(file => ({
                ...fileToProcessedPhoto(file),
                file
            }));
            setPhotos([...photos, ...newPhotos]);
        }
    };

    const handleDeletePhoto = (photoId) => {
        setPhotos(photos.filter(photo => photo.id !== photoId));
    };

    const handleSave = async () => {
        console.log('🔥🔥🔥 [RouteDescriptionPanel] HANDLE SAVE CLICKED 🔥🔥🔥');
        
        if (!route?.routeId) {
            console.log('🔥 [RouteDescriptionPanel] No route ID, aborting save');
            return;
        }
        
        try {
            setIsSaving(true);
            console.log('🔥 [RouteDescriptionPanel] Save started');

            // Upload any new photos that have File objects
            const uploadPromises = photos
                .filter(photo => photo.file)
                .map(async photo => {
                    if (!photo.file) return photo;
                    
                    const result = await photoService.uploadPhoto(photo.file);
                    return {
                        ...photo,
                        url: result.url,
                        thumbnailUrl: result.thumbnailUrl,
                        file: undefined // Clear the file after upload
                    };
                });

            const uploadedPhotos = await Promise.all(uploadPromises);

            // Update photos array with uploaded photos
            const updatedPhotos = photos.map(photo => {
                const uploaded = uploadedPhotos.find(up => up.id === photo.id);
                return uploaded || photo;
            });

            if (isMasterRoute) {
                console.log('🔥 [RouteDescriptionPanel] Saving master description:', description);
                // For master routes, just update the master description
                updateMasterDescription(description);
                console.log('🔥 [RouteDescriptionPanel] Master description saved');
            } else {
                console.log('🔥 [RouteDescriptionPanel] Saving segment description:', {
                    routeId: route.routeId,
                    description: description,
                    photosCount: updatedPhotos.length
                });
                // For individual segments, update the route with new description including uploaded photos
                const routeId = route.routeId;
                const updates = {
                    description: {
                        description: description ?? '',
                        photos: updatedPhotos.map(serializePhoto)
                    }
                };
                await updateRoute(routeId, updates);
                console.log('🔥 [RouteDescriptionPanel] Segment description saved');
            }

            setPhotos(updatedPhotos);
            setShowSaveSuccess(true);
        } catch (error) {
            console.error('🔥 [RouteDescriptionPanel] Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseSnackbar = () => {
        setShowSaveSuccess(false);
    };

    console.log('🔥 [RouteDescriptionPanel] Rendering component with:', {
        isMasterRoute,
        description,
        descriptionLength: description?.length || 0,
        routeName: route?.name || 'Untitled Route'
    });

    return _jsxs(_Fragment, {
        children: [
            _jsxs(Box, { 
                sx: { 
                    display: 'flex', 
                    flexDirection: 'column',
                    height: '100%', 
                    backgroundColor: 'rgba(26, 26, 26, 0.9)'
                },
                children: [
                    /* Header */
                    _jsx(Box, {
                        sx: { 
                            px: 2, 
                            py: 1, 
                            display: 'flex', 
                            alignItems: 'center', 
                            backgroundColor: '#1a1a1a',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)' 
                        },
                        children: _jsx(Typography, 
                            {
                                variant: "subtitle2", 
                                color: "white", 
                                sx: { 
                                    fontSize: '0.8rem', 
                                    fontWeight: 500, 
                                    mr: 3, 
                                    fontFamily: 'Lato' 
                                },
                                children: `${isMasterRoute ? 'Master Route Overview' : 'Segment Overview'}: ${route?.name || 'Untitled Route'}`
                            }
                        )
                    }),
                    
                    /* Content */
                    _jsxs(Box, { 
                        sx: { 
                            display: 'flex', 
                            height: 'calc(100% - 40px)', // Subtract header height
                            padding: 2,
                            overflow: 'hidden'
                        },
                        children: [
                            /* Left side - Text fields */
                            _jsxs(Box, { 
                                sx: { 
                                    width: '60%',
                                    backgroundColor: EDITOR_BACKGROUND,
                                    padding: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    marginRight: 2
                                },
                                children: [
                                    _jsx(Box, { 
                                        sx: { 
                                            flex: 1, 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            gap: 2,
                                            overflowY: 'auto' // Make description area scrollable
                                        },
                                        children: _jsx(RichTextEditor, {
                                            value: description,
                                            onChange: setDescription
                                        })
                                    }),
                                    _jsx(Button, {
                                        variant: "contained",
                                        color: "info",
                                        onClick: handleSave,
                                        disabled: isSaving,
                                        sx: {
                                            marginTop: 'auto'
                                        },
                                        children: isSaving ? "Saving..." : "Save Description"
                                    })
                                ]
                            }),

                            /* Right side - Photo section */
                            _jsx(Box, {
                                sx: {
                                    width: '40%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                },
                                children: _jsx(SliderContainer, {
                                    children: allPhotos.length > 0 && (
                                        // @ts-ignore - Ignoring type checking for ImageSliderWithLightbox
                                        _jsx(ImageSliderWithLightbox, {
                                            photos: allPhotos,
                                            simplifiedMode: true,
                                            maxPhotos: 20
                                        })
                                    )
                                })
                            })
                        ]
                    })
                ]
            }),
            _jsx(Snackbar, {
                open: showSaveSuccess,
                autoHideDuration: 3000,
                onClose: handleCloseSnackbar,
                anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
                children: _jsx(Alert, {
                    onClose: handleCloseSnackbar,
                    severity: "info",
                    sx: { width: '100%' },
                    component: "div",
                    children: "Description saved successfully"
                })
            })
        ]
    });
};

export default RouteDescriptionPanel;
