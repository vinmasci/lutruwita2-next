import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { Box, Button, IconButton, Snackbar, Alert, Typography, styled } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { RichTextEditor } from './RichTextEditor';
import { fileToProcessedPhoto, deserializePhoto, serializePhoto } from '../../../../features/photo/utils/photoUtils';
import { useRouteContext } from '../../../../features/map/context/RouteContext';
import { usePhotoService } from '../../../../features/photo/services/photoService';
import { usePhotoContext } from '../../../../features/photo/context/PhotoContext';

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
    const { updateRoute, routes } = useRouteContext();
    const photoService = usePhotoService();
    const { photos: globalPhotos } = usePhotoContext();
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState([]);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mapPhotosAdded, setMapPhotosAdded] = useState(false);

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

    // Keep local state in sync with route changes
    useEffect(() => {
        console.debug('[RouteDescriptionPanel] Route description changed:', {
            hasRoute: !!route,
            hasDescription: !!route?.description,
            descriptionLength: route?.description?.description?.length || 0
        });

        if (route?.description) {
            setDescription(route.description.description ?? '');
            setPhotos((route.description.photos || []).map(deserializePhoto));
            setMapPhotosAdded(false); // Reset flag when route changes
        }
    }, [route?.description]);

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
            console.debug('[RouteDescriptionPanel] Adding nearby photos from map:', newPhotos.length);
            setPhotos(prev => [...prev, ...newPhotos]);
            setMapPhotosAdded(true);
        }
    }, [route, photos, nearbyPhotos, mapPhotosAdded]);

    // Debounced update to route
    useEffect(() => {
        if (!route?.routeId) return;

        const currentRoute = routes.find(r => r.routeId === route.routeId);
        if (!currentRoute) return;

        const hasChanges = 
            currentRoute.description?.description !== description ||
            currentRoute.description?.photos?.length !== photos.length;

        if (hasChanges) {
            console.debug('[RouteDescriptionPanel] Updating route with new description:', {
                routeId: route.routeId,
                descriptionLength: description?.length || 0,
                photoCount: photos.length
            });

            const timeoutId = setTimeout(() => {
                const routeId = route.routeId;
                const updates = {
                    description: {
                        description: description ?? '',
                        photos: photos.map(serializePhoto)
                    }
                };
                updateRoute(routeId, updates);
            }, 500); // Debounce updates

            return () => clearTimeout(timeoutId);
        }
    }, [description, photos, route?.routeId, routes, updateRoute]);

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
        if (!route?.routeId) return;
        
        try {
            setIsSaving(true);

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

            // Update route with new description including uploaded photos
            const routeId = route.routeId;
            const updates = {
                description: {
                    description: description ?? '',
                    photos: updatedPhotos.map(serializePhoto)
                }
            };
            await updateRoute(routeId, updates);

            setPhotos(updatedPhotos);
            setShowSaveSuccess(true);
        } catch (error) {
            console.error('[RouteDescriptionPanel] Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseSnackbar = () => {
        setShowSaveSuccess(false);
    };

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
                                children: `Overview: ${route?.name || 'Untitled Route'}`
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
