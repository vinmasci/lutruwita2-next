import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, IconButton, Typography, Dialog, DialogContent } from '@mui/material';
import { ChevronLeft, Close } from '@mui/icons-material';
import { DrawerHeader, DrawerContent } from '../../../poi/components/POIDrawer/POIDrawer.styles';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
import { POI_CATEGORIES } from '../../../poi/types/poi.types';
import { getIconDefinition } from '../../../poi/constants/poi-icons';
export const PresentationPOIViewer = ({ poi, onClose }) => {
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    if (!poi)
        return null;
    const iconDef = getIconDefinition(poi.icon);
    // Add fallback color in case the category doesn't exist in POI_CATEGORIES
    const categoryColor = POI_CATEGORIES[poi.category]?.color || '#777777'; // Default gray color if category not found
    return (_jsxs(_Fragment, { children: [_jsx(NestedDrawer, { anchor: "left", open: Boolean(poi), onClose: onClose, variant: "temporary", sx: {
                    '& .MuiDrawer-paper': {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        borderLeft: '1px solid #333',
                    }
                }, children: _jsxs(Box, { sx: {
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }, children: [_jsxs(DrawerHeader, { children: [_jsx(IconButton, { onClick: onClose, sx: {
                                        mr: 1,
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                        }
                                    }, children: _jsx(ChevronLeft, {}) }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }, children: [_jsx("i", { className: `lucide-${iconDef?.name}`, style: {
                                                color: categoryColor,
                                                fontSize: '24px'
                                            } }), _jsx(Typography, { variant: "h6", children: poi.name })] })] }), _jsxs(DrawerContent, { children: [_jsxs(Box, { sx: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        backgroundColor: 'rgba(45, 45, 45, 0.9)',
                                        padding: '12px',
                                        borderRadius: '4px',
                                        mb: 2
                                    }, children: [_jsx("i", { className: `lucide-${iconDef?.name}`, style: {
                                                color: categoryColor,
                                                fontSize: '24px'
                                            } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: POI_CATEGORIES[poi.category]?.label || 'Unknown Category' })] }), _jsxs(Box, { sx: {
                                        mb: 3,
                                        p: 2,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(30, 136, 229, 0.1)',
                                        border: '1px solid rgba(30, 136, 229, 0.2)'
                                    }, children: [_jsx(Typography, { variant: "overline", color: "info.light", sx: { display: 'block', mb: 1 }, children: "Details" }), _jsx(Typography, { variant: "body1", sx: { whiteSpace: 'pre-wrap' }, children: poi.description || 'No description' })] }), poi.photos && poi.photos.length > 0 && (_jsxs(Box, { children: [_jsxs(Typography, { variant: "subtitle2", color: "text.secondary", sx: { mb: 1 }, children: ["Photos (", poi.photos.length, ")"] }), _jsx(Box, { sx: {
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                gap: 1
                                            }, children: poi.photos.map((photo, index) => (_jsx(Box, { onClick: () => setSelectedPhoto(photo.url), sx: {
                                                    aspectRatio: '1',
                                                    backgroundColor: 'rgba(35, 35, 35, 0.9)',
                                                    borderRadius: 1,
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s',
                                                    '&:hover': {
                                                        transform: 'scale(1.02)'
                                                    }
                                                }, children: _jsx("img", { src: photo.url, alt: photo.caption || `Photo ${index + 1}`, style: {
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    } }) }, index))) })] }))] })] }) }), _jsxs(Dialog, { open: Boolean(selectedPhoto), onClose: () => setSelectedPhoto(null), maxWidth: "xl", fullWidth: true, children: [_jsx(IconButton, { onClick: () => setSelectedPhoto(null), sx: {
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: 'white',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.7)'
                            }
                        }, children: _jsx(Close, {}) }), _jsx(DialogContent, { sx: { p: 0 }, children: selectedPhoto && (_jsx("img", { src: selectedPhoto, alt: "Full size", style: {
                                width: '100%',
                                height: 'auto',
                                display: 'block'
                            } })) })] })] }));
};
