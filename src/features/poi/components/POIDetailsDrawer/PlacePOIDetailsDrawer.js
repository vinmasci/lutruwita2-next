// This file is commented out to disable Place POIs functionality while keeping draggable POIs
/*
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Typography, IconButton, Box, Button, TextField, ButtonBase, CircularProgress } from '@mui/material';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
import { ChevronLeft, Edit, Delete } from '@mui/icons-material';
import { IconGrid, IconGridItem, StyledTooltip, DrawerHeader, DrawerContent, DrawerFooter } from '../POIDrawer/POIDrawer.styles';
import { usePOIContext } from '../../context/POIContext';
import { usePlaceContext } from '../../../place/context/PlaceContext';
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import { ICON_PATHS } from '../../constants/icon-paths';
import { createPOIPhotos } from '../../utils/photo';
import { PhotoPreviewModal } from '../../../photo/components/PhotoPreview/PhotoPreviewModal';

const PlacePOIDetailsDrawer = ({ isOpen, onClose, placeId, placeName, description: initialDescription = '', photos: initialPhotos = [] }) => {
    const { pois } = usePOIContext();
    const { places, updatePlace } = usePlaceContext();
    const [hoveredIcon, setHoveredIcon] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [description, setDescription] = useState('');
    const [newPhotos, setNewPhotos] = useState([]);
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Initialize or update state when drawer opens with new place
    useEffect(() => {
        if (isOpen) {
            setDescription(initialDescription);
            setExistingPhotos(initialPhotos);
            setNewPhotos([]);
            setIsEditing(false);
            setIsSaving(false);
            setIsDirty(false);
        }
    }, [isOpen, initialDescription, initialPhotos]);

    const placePOIs = React.useMemo(() => {
        // Log for debugging
        console.log('[PlacePOIDetailsDrawer] Finding POIs for place:', {
            placeId,
            hasPlace: places && placeId ? !!places[placeId] : false,
            placeCoordinates: places && placeId && places[placeId] ? places[placeId].coordinates : null
        });
        
        return pois.filter((poi) => {
            // Basic type and placeId check
            if (poi.type !== 'place' || placeId === null) return false;
            
            // Match by placeId
            if (poi.placeId === placeId) return true;
            
            // Match by coordinates if the place has coordinates
            if (poi.coordinates && places && placeId && places[placeId]?.coordinates) {
                const placeCoords = places[placeId].coordinates;
                const poiCoords = poi.coordinates;
                
                // Check if coordinates match
                if (poiCoords[0] === placeCoords[0] && poiCoords[1] === placeCoords[1]) {
                    console.log('[PlacePOIDetailsDrawer] Found POI by coordinates match:', {
                        poiId: poi.id,
                        poiCoords,
                        placeCoords
                    });
                    return true;
                }
            }
            
            // Check all places for coordinate matches
            if (poi.coordinates && places) {
                for (const [id, place] of Object.entries(places)) {
                    if (place.coordinates && 
                        poi.coordinates[0] === place.coordinates[0] && 
                        poi.coordinates[1] === place.coordinates[1]) {
                        console.log('[PlacePOIDetailsDrawer] Found POI by coordinates in different place:', {
                            poiId: poi.id,
                            poiPlaceId: poi.placeId,
                            matchedPlaceId: id
                        });
                        return true;
                    }
                }
            }
            
            return false;
        });
    }, [pois, placeId, places]);

    const poiGroups = React.useMemo(() => placePOIs.reduce((acc, poi) => {
        if (!acc[poi.category]) {
            acc[poi.category] = [];
        }
        acc[poi.category].push(poi);
        return acc;
    }, {}), [placePOIs]);

    const handlePhotoChange = (event) => {
        if (event.target.files) {
            setNewPhotos(Array.from(event.target.files));
            setIsDirty(true);
        }
    };

    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
        setIsDirty(true);
    };

    const handleDeletePhoto = (index) => {
        setExistingPhotos(photos => photos.filter((_, i) => i !== index));
        setIsDirty(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!placeId) {
            console.error('Invalid place ID');
            return;
        }
        setIsSaving(true);
        try {
            const processedPhotos = await createPOIPhotos(newPhotos);
            const newPlacePhotos = processedPhotos.map(photo => ({
                url: photo.url,
                caption: photo.caption
            }));
            await updatePlace(placeId, {
                description,
                photos: [...existingPhotos, ...newPlacePhotos]
            });
            setNewPhotos([]);
            setIsEditing(false);
            setIsDirty(false);
        }
        catch (error) {
            console.error('Failed to save place details:', error);
        }
        finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (!isSaving) {
            setDescription(initialDescription);
            setExistingPhotos(initialPhotos);
            setNewPhotos([]);
            setIsEditing(false);
            setIsDirty(false);
        }
    };

    return _jsxs(NestedDrawer, {
        anchor: "left",
        open: isOpen,
        onClose: () => {
            if (!isSaving) {
                if (isDirty) {
                    if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                        handleCancel();
                        onClose();
                    }
                } else {
                    onClose();
                }
            }
        },
        variant: "persistent",
        sx: { zIndex: 1300 },
        children: [
            // Loading overlay
            isSaving && _jsx(Box, {
                sx: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                },
                children: _jsx(CircularProgress, {})
            }),

            // Header
            _jsxs(DrawerHeader, {
                children: [
                    _jsx(IconButton, {
                        onClick: () => {
                            if (!isSaving) {
                                if (isDirty) {
                                    if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                                        handleCancel();
                                        onClose();
                                    }
                                } else {
                                    onClose();
                                }
                            }
                        },
                        sx: {
                            color: 'white',
                            '&:hover': {
                                backgroundColor: 'rgb(45, 45, 45)'
                            }
                        },
                        children: _jsx(ChevronLeft, {})
                    }),
                    _jsx(Typography, {
                        variant: "h6",
                        children: placeName
                    })
                ]
            }),

            // Content
            _jsx(DrawerContent, {
                children: _jsx("form", {
                    onSubmit: handleSubmit,
                    style: { height: '100%' },
                    children: _jsxs(Box, {
                        sx: { display: 'flex', flexDirection: 'column', gap: 2, height: '100%' },
                        children: [
                            // Description section
                            _jsxs(Box, {
                                sx: { mb: 3 },
                                children: [
                                    _jsx(Typography, {
                                        variant: "subtitle2",
                                        color: "text.secondary",
                                        gutterBottom: true,
                                        children: "About this place"
                                    }),
                                    isEditing ? (
                                        _jsx(TextField, {
                                            label: "Description",
                                            value: description,
                                            onChange: handleDescriptionChange,
                                            multiline: true,
                                            rows: 4,
                                            fullWidth: true,
                                            variant: "outlined",
                                            size: "small",
                                            disabled: isSaving,
                                            sx: {
                                                backgroundColor: 'rgb(45, 45, 45)',
                                                '& .MuiOutlinedInput-root': {
                                                    '& fieldset': {
                                                        borderColor: 'rgb(255, 255, 255)',
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'rgb(255, 255, 255)',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: 'rgb(255, 255, 255)',
                                                    }
                                                },
                                                '& .MuiInputLabel-root': {
                                                    color: 'rgb(255, 255, 255)'
                                                },
                                                '& .MuiOutlinedInput-input': {
                                                    color: 'rgb(255, 255, 255)'
                                                }
                                            }
                                        })
                                    ) : (
                                        _jsx(Typography, {
                                            variant: "body1",
                                            sx: { whiteSpace: 'pre-wrap' },
                                            children: description || 'No description available'
                                        })
                                    )
                                ]
                            }),

                            // POIs section
                            Object.entries(poiGroups).map(([category, pois]) => {
                                const categoryInfo = POI_CATEGORIES[category];
                                return _jsxs(Box, {
                                    sx: { mb: 2 },
                                    children: [
                                        _jsx(Typography, {
                                            variant: "caption",
                                            sx: {
                                                color: 'white',
                                                mb: 0.5,
                                                display: 'block',
                                                fontSize: '0.7rem',
                                                opacity: 0.7,
                                                letterSpacing: '0.5px'
                                            },
                                            children: categoryInfo.label
                                        }),
                                        _jsx(IconGrid, {
                                            children: pois.map((poi) => {
                                                const iconDef = getIconDefinition(poi.icon);
                                                if (!iconDef) return null;
                                                return _jsxs(IconGridItem, {
                                                    onMouseEnter: () => setHoveredIcon(poi.id),
                                                    onMouseLeave: () => setHoveredIcon(null),
                                                    sx: {
                                                        position: 'relative',
                                                        width: '20px',
                                                        height: '20px',
                                                        backgroundColor: poi.style?.color || categoryInfo.color,
                                                        borderRadius: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    },
                                                    children: [
                                                        _jsx("i", {
                                                            className: ICON_PATHS[iconDef.name],
                                                            style: { fontSize: '12px', color: 'white' }
                                                        }),
                                                        hoveredIcon === poi.id && _jsx(StyledTooltip, {
                                                            children: poi.name
                                                        })
                                                    ]
                                                }, poi.id);
                                            })
                                        })
                                    ]
                                }, category);
                            }),

                            // Photos section
                            _jsxs(Box, {
                                sx: { mt: 2 },
                                children: [
                                    _jsx(Typography, {
                                        variant: "subtitle2",
                                        color: "text.secondary",
                                        gutterBottom: true,
                                        children: "Photos"
                                    }),
                                    isEditing && _jsxs(Button, {
                                        component: "label",
                                        variant: "outlined",
                                        fullWidth: true,
                                        disabled: isSaving,
                                        sx: {
                                            backgroundColor: 'rgb(45, 45, 45)',
                                            borderColor: 'rgb(255, 255, 255)',
                                            color: 'rgb(255, 255, 255)',
                                            '&:hover': {
                                                borderColor: 'rgb(255, 255, 255)',
                                                backgroundColor: 'rgb(45, 45, 45)'
                                            }
                                        },
                                        children: [
                                            "Add Photos",
                                            _jsx("input", {
                                                type: "file",
                                                hidden: true,
                                                multiple: true,
                                                accept: "image/*",
                                                onChange: handlePhotoChange,
                                                disabled: isSaving
                                            })
                                        ]
                                    }),
                                    existingPhotos && existingPhotos.length > 0 && _jsx(Box, {
                                        sx: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 1,
                                            mt: 2
                                        },
                                        children: existingPhotos.map((photo, index) => _jsxs(ButtonBase, {
                                            onClick: () => {
                                                if (!isSaving) {
                                                    const processedPhoto = {
                                                        id: String(index),
                                                        name: photo.caption || `Photo ${index + 1}`,
                                                        url: photo.url,
                                                        thumbnailUrl: photo.url,
                                                        dateAdded: new Date(),
                                                        hasGps: false
                                                    };
                                                    setSelectedPhoto(processedPhoto);
                                                }
                                            },
                                            sx: {
                                                display: 'block',
                                                width: '100%',
                                                aspectRatio: '1',
                                                backgroundColor: 'rgb(35, 35, 35)',
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                position: 'relative'
                                            },
                                            children: [
                                                _jsx("img", {
                                                    src: photo.url,
                                                    alt: photo.caption || `Photo ${index + 1}`,
                                                    style: {
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }
                                                }),
                                                isEditing && !isSaving && _jsx(IconButton, {
                                                    size: "small",
                                                    onClick: (e) => {
                                                        e.stopPropagation();
                                                        handleDeletePhoto(index);
                                                    },
                                                    sx: {
                                                        position: 'absolute',
                                                        top: 4,
                                                        right: 4,
                                                        backgroundColor: 'rgb(0, 0, 0)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgb(0, 0, 0)'
                                                        }
                                                    },
                                                    children: _jsx(Delete, {
                                                        sx: { fontSize: 16, color: 'white' }
                                                    })
                                                })
                                            ]
                                        }, index))
                                    }),
                                    isEditing && newPhotos.length > 0 && _jsx(Box, {
                                        sx: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 1,
                                            mt: 2
                                        },
                                        children: newPhotos.map((photo, index) => _jsxs(Box, {
                                            sx: {
                                                aspectRatio: '1',
                                                backgroundColor: 'rgb(35, 35, 35)',
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                position: 'relative'
                                            },
                                            children: [
                                                _jsx("img", {
                                                    src: URL.createObjectURL(photo),
                                                    alt: `Upload ${index + 1}`,
                                                    style: {
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }
                                                }),
                                                !isSaving && _jsx(IconButton, {
                                                    size: "small",
                                                    onClick: () => {
                                                        setNewPhotos(photos => {
                                                            const newPhotos = photos.filter((_, i) => i !== index);
                                                            if (newPhotos.length === 0 && description === initialDescription) {
                                                                setIsDirty(false);
                                                            }
                                                            return newPhotos;
                                                        });
                                                    },
                                                    sx: {
                                                        position: 'absolute',
                                                        top: 4,
                                                        right: 4,
                                                        backgroundColor: 'rgb(0, 0, 0)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgb(0, 0, 0)'
                                                        }
                                                    },
                                                    children: _jsx(Delete, {
                                                        sx: { fontSize: 16, color: 'white' }
                                                    })
                                                })
                                            ]
                                        }, index))
                                    })
                                ]
                            }),

                            // Footer buttons
                            _jsx(DrawerFooter, {
                                children: isEditing ? _jsxs(_Fragment, {
                                    children: [
                                        _jsx(Button, {
                                            variant: "text",
                                            onClick: handleCancel,
                                            fullWidth: true,
                                            disabled: isSaving,
                                            sx: { color: 'white' },
                                            children: "Cancel"
                                        }),
                                        _jsx(Button, {
                                            type: "submit",
                                            variant: "contained",
                                            fullWidth: true,
                                            disabled: isSaving || !isDirty,
                                            sx: {
                                                backgroundColor: 'rgb(255, 255, 255)',
                                                '&:hover': {
                                                    backgroundColor: 'rgb(255, 255, 255)',
                                                }
                                            },
                                            children: isSaving ? 'Saving...' : 'Save'
                                        })
                                    ]
                                }) : _jsx(Box, {
                                    sx: { display: 'flex', justifyContent: 'flex-end', width: '100%' },
                                    children: _jsx(Button, {
                                        onClick: () => setIsEditing(true),
                                        variant: "contained",
                                        size: "medium",
                                        startIcon: _jsx(Edit, {}),
                                        disabled: isSaving,
                                        sx: {
                                            backgroundColor: 'rgb(255, 255, 255)',
                                            '&:hover': {
                                                backgroundColor: 'rgb(255, 255, 255)'
                                            }
                                        },
                                        children: "EDIT"
                                    })
                                })
                            })
                        ]
                    })
                })
            }),

            // Photo preview modal
            selectedPhoto && _jsx(PhotoPreviewModal, {
                photo: selectedPhoto,
                onClose: () => setSelectedPhoto(null)
            })
        ]
    });
};

export default PlacePOIDetailsDrawer;
*/
