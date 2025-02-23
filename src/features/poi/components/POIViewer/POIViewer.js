import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, IconButton, Typography, Dialog, DialogContent, TextField, Button } from '@mui/material';
import { ChevronLeft, Close, Edit, Save, Cancel, Delete } from '@mui/icons-material';
import { DrawerHeader, DrawerContent } from '../POIDrawer/POIDrawer.styles';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import { createPOIPhotos } from '../../utils/photo';
import { usePOIContext } from '../../context/POIContext';

export const POIViewer = ({ poi: initialPoi, onClose, onUpdate }) => {
    const { pois, removePOI } = usePOIContext();
    const [poi, setPoi] = useState(initialPoi);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(initialPoi?.name || '');
    const [editedDescription, setEditedDescription] = useState(initialPoi?.description || '');
    const [newPhotos, setNewPhotos] = useState([]);

    // Initialize edited states
    useEffect(() => {
        if (initialPoi) {
            setEditedName(initialPoi.name);
            setEditedDescription(initialPoi.description || '');
        }
    }, [initialPoi]);

    // Keep POI data in sync with context
    useEffect(() => {
        if (initialPoi) {
            const updatedPoi = pois.find(p => p.id === initialPoi.id);
            if (updatedPoi) {
                setPoi(updatedPoi);
                // Update edited states if not in edit mode
                if (!isEditing) {
                    setEditedName(updatedPoi.name);
                    setEditedDescription(updatedPoi.description || '');
                }
            }
        }
    }, [pois, initialPoi, isEditing]);

    if (!poi) return null;

    const handleSave = () => {
        if (onUpdate) {
            const updates = {};
            if (editedName !== poi.name) updates.name = editedName;
            if (editedDescription !== poi.description) updates.description = editedDescription;
            
            // Always include photos in updates to handle both additions and deletions
            // Use the local state for existing photos to include any deletions
            updates.photos = [...(poi.photos || []), ...newPhotos];
            
            onUpdate(poi.id, updates);
        }
        setIsEditing(false);
        setNewPhotos([]);
    };

    const handleStartEditing = () => {
        setEditedName(poi.name);
        setEditedDescription(poi.description || '');
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setIsEditing(false);
        setEditedName(poi.name);
        setEditedDescription(poi.description || '');
        setNewPhotos([]);
    };

    const handleAddPhotos = async (files) => {
        const photos = await createPOIPhotos(files);
        setNewPhotos(prev => [...prev, ...photos]);
    };

    const handleRemoveNewPhoto = (index) => {
        const updatedPhotos = [...newPhotos];
        updatedPhotos.splice(index, 1);
        setNewPhotos(updatedPhotos);
    };

    const iconDef = getIconDefinition(poi.icon);
    const categoryColor = POI_CATEGORIES[poi.category].color;

    return _jsxs(_Fragment, { children: [
        _jsx(NestedDrawer, {
            anchor: "left",
            open: Boolean(poi),
            onClose: onClose,
            variant: "temporary",
            sx: {
                '& .MuiDrawer-paper': {
                    backgroundColor: 'rgba(0, 0, 0, 1)',
                    borderLeft: '1px solid #333',
                }
            },
            children: _jsxs(Box, {
                sx: {
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                },
                children: [
                    _jsxs(DrawerHeader, {
                        children: [
                            _jsx(IconButton, {
                                onClick: onClose,
                                sx: {
                                    mr: 1,
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                    }
                                },
                                children: _jsx(ChevronLeft, {})
                            }),
                            _jsxs(Box, {
                                sx: { display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 },
                                children: [
                                    _jsx("i", {
                                        className: `lucide-${iconDef?.name}`,
                                        style: {
                                            color: categoryColor,
                                            fontSize: '24px'
                                        }
                                    }),
                                    isEditing ? (
                                        _jsx(TextField, {
                                            value: editedName,
                                            onChange: (e) => setEditedName(e.target.value),
                                            variant: "standard",
                                            sx: {
                                                input: { color: 'white', fontSize: '1.25rem' },
                                                '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255, 255, 255, 0.42)' },
                                                '& .MuiInput-underline:hover:before': { borderBottomColor: 'rgba(255, 255, 255, 0.87)' },
                                            }
                                        })
                                    ) : (
                                        _jsx(Typography, { variant: "h6", children: poi.name })
                                    )
                                ]
                            })
                        ]
                    }),
                    _jsxs(DrawerContent, {
                        children: [
                            _jsxs(Box, {
                                sx: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    backgroundColor: 'rgba(45, 45, 45, 0.9)',
                                    padding: '12px',
                                    borderRadius: '4px',
                                    mb: 2
                                },
                                children: [
                                    _jsx("i", {
                                        className: `lucide-${iconDef?.name}`,
                                        style: {
                                            color: categoryColor,
                                            fontSize: '24px'
                                        }
                                    }),
                                    _jsx(Typography, {
                                        variant: "body2",
                                        color: "text.secondary",
                                        children: POI_CATEGORIES[poi.category].label
                                    })
                                ]
                            }),
                            _jsx(Box, {
                                sx: {
                                    mb: 3,
                                    p: 2,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(30, 136, 229, 0.1)',
                                    border: '1px solid rgba(30, 136, 229, 0.2)'
                                },
                                children: isEditing ? (
                                    _jsx(TextField, {
                                        fullWidth: true,
                                        multiline: true,
                                        minRows: 3,
                                        value: editedDescription,
                                        onChange: (e) => setEditedDescription(e.target.value),
                                        variant: "outlined",
                                        sx: {
                                            '& .MuiOutlinedInput-root': {
                                                color: 'white',
                                                bgcolor: 'rgba(0, 0, 0, 0.2)',
                                                '& fieldset': {
                                                    borderColor: 'rgba(255, 255, 255, 0.23)',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                                },
                                            },
                                        }
                                    })
                                ) : (
                                    _jsxs(_Fragment, {
                                        children: [
                                            _jsx(Typography, {
                                                variant: "overline",
                                                color: "info.light",
                                                sx: { display: 'block', mb: 1 },
                                                children: "Details"
                                            }),
                                            _jsx(Typography, {
                                                variant: "body1",
                                                sx: { whiteSpace: 'pre-wrap' },
                                                children: poi.description || 'No description'
                                            })
                                        ]
                                    })
                                )
                            }),
                            _jsxs(Box, {
                                children: [
                                    _jsxs(Box, {
                                        sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 },
                                        children: [
                                            _jsxs(Typography, {
                                                variant: "subtitle2",
                                                color: "text.secondary",
                                                children: ["Photos (", (poi.photos?.length || 0) + newPhotos.length, ")"]
                                            }),
                                            isEditing && (
                                                _jsxs(Button, {
                                                    component: "label",
                                                    variant: "outlined",
                                                    size: "small",
                                                    sx: { color: 'white', borderColor: 'rgba(255, 255, 255, 0.23)' },
                                                    children: [
                                                        "Add Photos",
                                                        _jsx("input", {
                                                            type: "file",
                                                            hidden: true,
                                                            multiple: true,
                                                            accept: "image/*",
                                                            onChange: (e) => {
                                                                const files = Array.from(e.target.files || []);
                                                                handleAddPhotos(files);
                                                            }
                                                        })
                                                    ]
                                                })
                                            )
                                        ]
                                    }),
                                    _jsxs(Box, {
                                        sx: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 1
                                        },
                                        children: [
                                            poi.photos?.map((photo, index) => (
                                                _jsxs(Box, {
                                                    onClick: () => setSelectedPhoto(photo.url),
                                                    sx: {
                                                        aspectRatio: '1',
                                                        backgroundColor: 'rgba(35, 35, 35, 0.9)',
                                                        borderRadius: 1,
                                                        overflow: 'hidden',
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.2s',
                                                        position: 'relative',
                                                        '&:hover': {
                                                            transform: 'scale(1.02)'
                                                        }
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
                                                        isEditing && (
                                                            _jsx(IconButton, {
                                                                size: "small",
                                                                onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    if (poi.photos) {
                                                                        const updatedPhotos = [...poi.photos];
                                                                        updatedPhotos.splice(index, 1);
                                                                        // Update both local state and trigger save
                                                                        setPoi({ ...poi, photos: updatedPhotos });
                                                                        if (onUpdate) {
                                                                            onUpdate(poi.id, { photos: updatedPhotos });
                                                                        }
                                                                    }
                                                                },
                                                                sx: {
                                                                    position: 'absolute',
                                                                    top: 4,
                                                                    right: 4,
                                                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                                    color: 'white',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                                                    }
                                                                },
                                                                children: _jsx(Close, { fontSize: "small" })
                                                            })
                                                        )
                                                    ]
                                                }, index)
                                            )),
                                            newPhotos.map((photo, index) => (
                                                _jsxs(Box, {
                                                    sx: {
                                                        aspectRatio: '1',
                                                        backgroundColor: 'rgba(35, 35, 35, 0.9)',
                                                        borderRadius: 1,
                                                        overflow: 'hidden',
                                                        position: 'relative',
                                                    },
                                                    children: [
                                                        _jsx("img", {
                                                            src: photo.url,
                                                            alt: photo.caption || `New photo ${index + 1}`,
                                                            style: {
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            }
                                                        }),
                                                        isEditing && (
                                                            _jsx(IconButton, {
                                                                size: "small",
                                                                onClick: () => handleRemoveNewPhoto(index),
                                                                sx: {
                                                                    position: 'absolute',
                                                                    top: 4,
                                                                    right: 4,
                                                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                                    color: 'white',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                                                    }
                                                                },
                                                                children: _jsx(Close, { fontSize: "small" })
                                                            })
                                                        )
                                                    ]
                                                }, `new-${index}`)
                                            ))
                                        ]
                                    })
                                ]
                            }),
                            _jsx(Box, {
                                sx: {
                                    mt: 3,
                                    display: 'flex',
                                    gap: 1,
                                    justifyContent: 'flex-end',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                                    pt: 2
                                },
                                children: !isEditing ? (
                                    _jsxs(_Fragment, {
                                        children: [
                                            _jsx(Button, {
                                                variant: "outlined",
                                                startIcon: _jsx(Delete, {}),
                                                onClick: () => {
                                                    removePOI(poi.id);
                                                    onClose();
                                                },
                                                sx: {
                                                    color: 'white',
                                                    borderColor: 'white',
                                                    '&:hover': {
                                                        borderColor: 'white',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.08)'
                                                    }
                                                },
                                                children: "Delete"
                                            }),
                                            _jsx(Button, {
                                                variant: "contained",
                                                startIcon: _jsx(Edit, {}),
                                                onClick: handleStartEditing,
                                                sx: {
                                                    backgroundColor: 'white',
                                                    color: 'black',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.9)'
                                                    }
                                                },
                                                children: "Edit"
                                            })
                                        ]
                                    })
                                ) : (
                                    _jsxs(_Fragment, {
                                        children: [
                                            _jsx(Button, {
                                                variant: "outlined",
                                                startIcon: _jsx(Cancel, {}),
                                                onClick: handleCancelEditing,
                                                sx: {
                                                    color: 'white',
                                                    borderColor: 'rgba(255, 255, 255, 0.23)',
                                                    '&:hover': {
                                                        borderColor: 'rgba(255, 255, 255, 0.5)'
                                                    }
                                                },
                                                children: "Cancel"
                                            }),
                                            _jsx(Button, {
                                                variant: "contained",
                                                startIcon: _jsx(Save, {}),
                                                onClick: handleSave,
                                                color: "primary",
                                                children: "Save"
                                            })
                                        ]
                                    })
                                )
                            })
                        ]
                    })
                ]
            })
        }),
        _jsxs(Dialog, {
            open: Boolean(selectedPhoto),
            onClose: () => setSelectedPhoto(null),
            maxWidth: "xl",
            fullWidth: true,
            children: [
                _jsx(IconButton, {
                    onClick: () => setSelectedPhoto(null),
                    sx: {
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: 'white',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.7)'
                        }
                    },
                    children: _jsx(Close, {})
                }),
                _jsx(DialogContent, {
                    sx: { p: 0 },
                    children: selectedPhoto && (
                        _jsx("img", {
                            src: selectedPhoto,
                            alt: "Full size",
                            style: {
                                width: '100%',
                                height: 'auto',
                                display: 'block'
                            }
                        })
                    )
                })
            ]
        })
    ]});
};

export default POIViewer;
