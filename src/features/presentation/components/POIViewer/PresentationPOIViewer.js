import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, IconButton, Typography, Dialog, DialogContent, Modal } from '@mui/material';
import { Close } from '@mui/icons-material';
import { POI_CATEGORIES } from '../../../poi/types/poi.types';
import { getIconDefinition } from '../../../poi/constants/poi-icons';

export const PresentationPOIViewer = ({ poi, onClose }) => {
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    
    if (!poi)
        return null;
        
    const iconDef = getIconDefinition(poi.icon);
    // Add fallback color in case the category doesn't exist in POI_CATEGORIES
    const categoryColor = POI_CATEGORIES[poi.category]?.color || '#777777'; // Default gray color if category not found
    
    return (_jsxs(_Fragment, { children: [
        _jsx(Modal, { 
            open: Boolean(poi), 
            onClose: onClose,
            "aria-labelledby": "poi-viewer-modal",
            disableScrollLock: true,
            disableAutoFocus: true,
            keepMounted: true,
            sx: { 
                zIndex: 9999,
                // Ensure modal doesn't affect other fixed elements
                '& .MuiBackdrop-root': {
                    position: 'absolute'
                }
            },
            children: _jsxs(Box, { 
                sx: {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    bgcolor: 'rgba(35, 35, 35, 0.95)',
                    border: '1px solid rgba(30, 136, 229, 0.5)',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 4,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 9999
                }, 
                children: [
                    _jsxs(Box, {
                        sx: { 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            mb: 3
                        },
                        children: [
                            _jsxs(Box, { 
                                sx: { display: 'flex', alignItems: 'center', gap: 1 }, 
                                children: [
                                    _jsx("i", { 
                                        className: `lucide-${iconDef?.name}`, 
                                        style: {
                                            color: categoryColor,
                                            fontSize: '24px'
                                        } 
                                    }), 
                                    _jsx(Typography, { variant: "h6", color: "white", children: poi.name })
                                ]
                            }),
                            _jsx(IconButton, {
                                onClick: onClose,
                                sx: {
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                    }
                                },
                                children: _jsx(Close, {})
                            })
                        ]
                    }),
                    _jsxs(Box, { children: [
                        _jsx(Box, { 
                            sx: {
                                mb: 3,
                                p: 2,
                                borderRadius: '4px',
                                backgroundColor: 'rgba(45, 45, 45, 0.9)',
                            }, 
                            children: _jsx(Typography, { 
                                variant: "body1", 
                                color: "white",
                                sx: { whiteSpace: 'pre-wrap' }, 
                                children: poi.description || 'No description' 
                            })
                        }), 
                        poi.photos && poi.photos.length > 0 && (_jsxs(Box, { 
                            children: [
                                _jsxs(Typography, { 
                                    variant: "subtitle2", 
                                    color: "white", 
                                    sx: { mb: 1 }, 
                                    children: ["Photos (", poi.photos.length, ")"] 
                                }),
                                _jsx(Box, { 
                                    sx: {
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: 1
                                    }, 
                                    children: poi.photos.map((photo, index) => (
                                        _jsx(Box, { 
                                            onClick: () => setSelectedPhoto(photo.url), 
                                            sx: {
                                                aspectRatio: '1',
                                                backgroundColor: 'rgba(35, 35, 35, 0.9)',
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s',
                                                '&:hover': {
                                                    transform: 'scale(1.02)'
                                                }
                                            }, 
                                            children: _jsx("img", { 
                                                src: photo.url, 
                                                alt: photo.caption || `Photo ${index + 1}`, 
                                                style: {
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                } 
                                            }) 
                                        }, index)
                                    )) 
                                })
                            ] 
                        }))
                    ] })
                ] 
            }) 
        }), 
        _jsx(Modal, {
            open: Boolean(selectedPhoto),
            onClose: () => setSelectedPhoto(null),
            disableScrollLock: true,
            disableAutoFocus: true,
            keepMounted: true,
            sx: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000, // Higher than the POI viewer modal
                '& .MuiBackdrop-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    position: 'absolute'
                }
            },
            children: _jsxs(Box, {
                sx: {
                    position: 'relative',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    outline: 'none'
                },
                children: [
                    selectedPhoto && _jsx("img", {
                        src: selectedPhoto,
                        alt: "Full size photo",
                        style: {
                            maxWidth: '100%',
                            maxHeight: '90vh',
                            objectFit: 'contain'
                        }
                    }),
                    _jsx(IconButton, {
                        onClick: () => setSelectedPhoto(null),
                        sx: {
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            color: 'white',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.7)'
                            }
                        },
                        children: _jsx(Close, {})
                    })
                ]
            })
        })
    ] }));
};
