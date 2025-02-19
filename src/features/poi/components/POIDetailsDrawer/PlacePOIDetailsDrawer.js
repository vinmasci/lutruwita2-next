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
    const { updatePlace } = usePlaceContext();
    const [hoveredIcon, setHoveredIcon] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [description, setDescription] = useState(initialDescription);
    const [newPhotos, setNewPhotos] = useState([]);
    const [existingPhotos, setExistingPhotos] = useState(initialPhotos);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    // Reset form state when drawer opens/closes or place changes
    useEffect(() => {
        if (isOpen) {
            setDescription(initialDescription);
            setNewPhotos([]);
            setExistingPhotos(initialPhotos);
            setIsEditing(false);
            setIsSaving(false);
        }
    }, [isOpen, placeId, initialDescription, initialPhotos]);
    // Get POIs associated with this place and memoize to prevent unnecessary recalculations
    const placePOIs = React.useMemo(() => pois.filter((poi) => poi.type === 'place' &&
        placeId !== null &&
        poi.placeId === placeId), [pois, placeId]);
    // Group POIs by category
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
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!placeId) {
            console.error('Invalid place ID');
            return;
        }
        setIsSaving(true);
        try {
            // Process new photos first
            const processedPhotos = await createPOIPhotos(newPhotos);
            // Convert processed photos to PlacePhoto format
            const newPlacePhotos = processedPhotos.map(photo => ({
                url: photo.url,
                caption: photo.caption
            }));
            // Update place with new data
            await updatePlace(placeId, {
                description,
                photos: [...existingPhotos, ...newPlacePhotos]
            });
            // Clear state and close drawer
            setNewPhotos([]);
            setIsEditing(false);
            onClose();
        }
        catch (error) {
            console.error('Failed to save place details:', error);
        }
        finally {
            setIsSaving(false);
        }
    };
    return (_jsxs(NestedDrawer, { anchor: "left", open: isOpen, onClose: () => {
            if (!isSaving) {
                setIsEditing(false);
                onClose();
            }
        }, variant: "persistent", sx: {
            zIndex: 1300 // Higher than POIDrawer
        }, children: [isSaving && (_jsx(Box, { sx: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgb(0, 0, 0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }, children: _jsx(CircularProgress, {}) })), _jsxs(DrawerHeader, { children: [_jsx(IconButton, { onClick: () => {
                            if (!isSaving) {
                                onClose();
                            }
                        }, sx: {
                            color: 'white',
                            '&:hover': {
                                backgroundColor: 'rgb(45, 45, 45)'
                            }
                        }, children: _jsx(ChevronLeft, {}) }), _jsx(Typography, { variant: "h6", children: placeName })] }), _jsx(DrawerContent, { children: _jsx("form", { onSubmit: handleSubmit, style: { height: '100%' }, children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }, children: [_jsxs(Box, { sx: { mb: 3 }, children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "About this place" }), isEditing ? (_jsx(TextField, { label: "Description", value: description, onChange: (e) => setDescription(e.target.value), multiline: true, rows: 4, fullWidth: true, variant: "outlined", size: "small", disabled: isSaving, sx: {
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
                                        } })) : (_jsx(Typography, { variant: "body1", sx: { whiteSpace: 'pre-wrap' }, children: description || 'No description available' }))] }), Object.entries(poiGroups).map(([category, pois]) => {
                                const categoryInfo = POI_CATEGORIES[category];
                                return (_jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "caption", sx: {
                                                color: 'white',
                                                mb: 0.5,
                                                display: 'block',
                                                fontSize: '0.7rem',
                                                opacity: 0.7,
                                                letterSpacing: '0.5px'
                                            }, children: categoryInfo.label }), _jsx(IconGrid, { children: pois.map((poi) => {
                                                const iconDef = getIconDefinition(poi.icon);
                                                if (!iconDef)
                                                    return null;
                                                return (_jsxs(IconGridItem, { onMouseEnter: () => setHoveredIcon(poi.id), onMouseLeave: () => setHoveredIcon(null), sx: {
                                                        position: 'relative',
                                                        width: '20px',
                                                        height: '20px',
                                                        backgroundColor: poi.style?.color || categoryInfo.color,
                                                        borderRadius: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }, children: [_jsx("i", { className: ICON_PATHS[iconDef.name], style: { fontSize: '12px', color: 'white' } }), hoveredIcon === poi.id && (_jsx(StyledTooltip, { children: poi.name }))] }, poi.id));
                                            }) })] }, category));
                            }), _jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "Photos" }), isEditing && (_jsxs(Button, { component: "label", variant: "outlined", fullWidth: true, disabled: isSaving, sx: {
                                            backgroundColor: 'rgb(45, 45, 45)',
                                            borderColor: 'rgb(255, 255, 255)',
                                            color: 'rgb(255, 255, 255)',
                                            '&:hover': {
                                                borderColor: 'rgb(255, 255, 255)',
                                                backgroundColor: 'rgb(45, 45, 45)'
                                            }
                                        }, children: ["Add Photos", _jsx("input", { type: "file", hidden: true, multiple: true, accept: "image/*", onChange: handlePhotoChange, disabled: isSaving })] })), existingPhotos && existingPhotos.length > 0 && (_jsx(Box, { sx: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 1,
                                            mt: 2
                                        }, children: existingPhotos.map((photo, index) => (_jsxs(ButtonBase, { onClick: () => {
                                                if (!isSaving) {
                                                    // Convert PlacePhoto to ProcessedPhoto format
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
                                            }, sx: {
                                                display: 'block',
                                                width: '100%',
                                                aspectRatio: '1',
                                                backgroundColor: 'rgb(35, 35, 35)',
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }, children: [_jsx("img", { src: photo.url, alt: photo.caption || `Photo ${index + 1}`, style: {
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    } }), isEditing && !isSaving && (_jsx(IconButton, { size: "small", onClick: (e) => {
                                                        e.stopPropagation(); // Prevent opening preview when deleting
                                                        setExistingPhotos(photos => photos.filter((_, i) => i !== index));
                                                    }, sx: {
                                                        position: 'absolute',
                                                        top: 4,
                                                        right: 4,
                                                        backgroundColor: 'rgb(0, 0, 0)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgb(0, 0, 0)'
                                                        }
                                                    }, children: _jsx(Delete, { sx: { fontSize: 16, color: 'white' } }) }))] }, index))) })), isEditing && newPhotos.length > 0 && (_jsx(Box, { sx: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 1,
                                            mt: 2
                                        }, children: newPhotos.map((photo, index) => (_jsxs(Box, { sx: {
                                                aspectRatio: '1',
                                                backgroundColor: 'rgb(35, 35, 35)',
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }, children: [_jsx("img", { src: URL.createObjectURL(photo), alt: `Upload ${index + 1}`, style: {
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    } }), !isSaving && (_jsx(IconButton, { size: "small", onClick: () => setNewPhotos(photos => photos.filter((_, i) => i !== index)), sx: {
                                                        position: 'absolute',
                                                        top: 4,
                                                        right: 4,
                                                        backgroundColor: 'rgb(0, 0, 0)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgb(0, 0, 0)'
                                                        }
                                                    }, children: _jsx(Delete, { sx: { fontSize: 16, color: 'white' } }) }))] }, index))) }))] }), _jsx(DrawerFooter, { children: isEditing ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "text", onClick: () => {
                                                if (!isSaving) {
                                                    setDescription(initialDescription);
                                                    setNewPhotos([]);
                                                    setIsEditing(false);
                                                }
                                            }, fullWidth: true, disabled: isSaving, sx: { color: 'white' }, children: "Cancel" }), _jsx(Button, { type: "submit", variant: "contained", fullWidth: true, disabled: isSaving, sx: {
                                                backgroundColor: 'rgb(255, 255, 255)',
                                                '&:hover': {
                                                    backgroundColor: 'rgb(255, 255, 255)',
                                                }
                                            }, children: isSaving ? 'Saving...' : 'Save' })] })) : (_jsx(Box, { sx: { display: 'flex', justifyContent: 'flex-end', width: '100%' }, children: _jsx(Button, { onClick: () => setIsEditing(true), variant: "contained", size: "medium", startIcon: _jsx(Edit, {}), disabled: isSaving, sx: {
                                            backgroundColor: 'rgb(255, 255, 255)',
                                            '&:hover': {
                                                backgroundColor: 'rgb(255, 255, 255)'
                                            }
                                        }, children: "EDIT" }) })) })] }) }) }), selectedPhoto && (_jsx(PhotoPreviewModal, { photo: selectedPhoto, onClose: () => setSelectedPhoto(null) }))] }, `${placeId}-${isOpen}`));
};
export default PlacePOIDetailsDrawer;
