import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, ButtonBase } from '@mui/material';
import { StyledDrawer, DrawerHeader, DrawerContent, DrawerFooter } from '../POIDrawer/POIDrawer.styles';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import { PhotoPreviewModal } from '../../../photo/components/PhotoPreview/PhotoPreviewModal';
const POIDetailsDrawer = ({ isOpen, onClose, iconName, category, onSave }) => {
    // Get the icon definition for default name
    const iconDef = getIconDefinition(iconName);
    // Add fallback color in case the category doesn't exist in POI_CATEGORIES
    const categoryColor = POI_CATEGORIES[category]?.color || '#777777'; // Default gray color if category not found
    // State for form fields
    const [name, setName] = useState(iconDef?.label || '');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState([]);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    // Reset form when drawer opens with new POI
    useEffect(() => {
        if (isOpen) {
            setName(iconDef?.label || '');
            setDescription('');
            setPhotos([]);
        }
    }, [isOpen, iconDef]);
    const handlePhotoChange = (event) => {
        if (event.target.files) {
            setPhotos(Array.from(event.target.files));
        }
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            name,
            description,
            photos
        });
    };
    return (_jsxs(NestedDrawer, { anchor: "left", open: isOpen, onClose: onClose, variant: "persistent", sx: {
            zIndex: 1300 // Higher than POIDrawer
        }, children: [_jsxs(StyledDrawer, { children: [_jsx(DrawerHeader, { children: _jsx(Typography, { variant: "h6", children: "Add POI Details" }) }), _jsx(DrawerContent, { children: _jsx("form", { onSubmit: handleSubmit, style: { height: '100%' }, children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }, children: [_jsxs(Box, { sx: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            backgroundColor: 'rgb(45, 45, 45)',
                                            padding: '12px',
                                            borderRadius: '4px'
                                        }, children: [_jsx("i", { className: iconDef?.name, style: {
                                                    color: categoryColor,
                                                    fontSize: '24px'
                                                } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: POI_CATEGORIES[category]?.label || 'Unknown Category' })] }), _jsx(TextField, { label: "Name", value: name, onChange: (e) => setName(e.target.value), fullWidth: true, variant: "outlined", size: "small", sx: {
                                            backgroundColor: 'rgb(35, 35, 35)',
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
                                        } }), _jsx(TextField, { label: "Description (optional)", value: description, onChange: (e) => setDescription(e.target.value), multiline: true, rows: 4, fullWidth: true, variant: "outlined", size: "small", sx: {
                                            backgroundColor: 'rgb(35, 35, 35)',
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
                                        } }), _jsxs(Button, { component: "label", variant: "outlined", fullWidth: true, sx: {
                                            backgroundColor: 'rgb(35, 35, 35)',
                                            borderColor: 'rgb(255, 255, 255)',
                                            color: 'rgb(255, 255, 255)',
                                            '&:hover': {
                                                borderColor: 'rgb(255, 255, 255)',
                                                backgroundColor: 'rgb(45, 45, 45)'
                                            }
                                        }, children: ["Add Photos", _jsx("input", { type: "file", hidden: true, multiple: true, accept: "image/*", onChange: handlePhotoChange })] }), photos.length > 0 && (_jsx(Box, { sx: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 1
                                        }, children: photos.map((photo, index) => (_jsx(ButtonBase, { onClick: () => {
                                                const url = URL.createObjectURL(photo);
                                                const processedPhoto = {
                                                    id: String(index),
                                                    name: photo.name || `Photo ${index + 1}`,
                                                    url: url,
                                                    thumbnailUrl: url,
                                                    dateAdded: new Date(),
                                                    hasGps: false
                                                };
                                                setSelectedPhoto(processedPhoto);
                                            }, sx: {
                                                display: 'block',
                                                width: '100%',
                                                aspectRatio: '1',
                                                backgroundColor: 'rgb(35, 35, 35)',
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }, children: _jsx("img", { src: URL.createObjectURL(photo), alt: `Upload ${index + 1}`, style: {
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                } }) }, index))) })), _jsxs(DrawerFooter, { children: [_jsx(Button, { variant: "text", onClick: onClose, fullWidth: true, sx: { color: 'white' }, children: "Cancel" }), _jsx(Button, { type: "submit", variant: "contained", fullWidth: true, sx: {
                                                    backgroundColor: POI_CATEGORIES[category]?.color || '#777777',
                                                    '&:hover': {
                                                        backgroundColor: POI_CATEGORIES[category]?.color || '#777777'
                                                    }
                                                }, children: "Save" })] })] }) }) })] }), selectedPhoto && (_jsx(PhotoPreviewModal, { photo: selectedPhoto, onClose: () => setSelectedPhoto(null) }))] }));
};
export default POIDetailsDrawer;
