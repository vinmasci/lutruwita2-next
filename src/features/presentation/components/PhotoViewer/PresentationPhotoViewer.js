import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, IconButton, Typography, Dialog, DialogContent } from '@mui/material';
import { ChevronLeft, Close } from '@mui/icons-material';
import { DrawerHeader, DrawerContent } from '../../../poi/components/POIDrawer/POIDrawer.styles';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
export const PresentationPhotoViewer = ({ photo, onClose }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    if (!photo)
        return null;
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    return (_jsxs(_Fragment, { children: [_jsx(NestedDrawer, { anchor: "left", open: Boolean(photo), onClose: onClose, variant: "temporary", sx: {
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
                                    }, children: _jsx(ChevronLeft, {}) }), _jsx(Box, { sx: { display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }, children: _jsx(Typography, { variant: "h6", children: photo.name }) })] }), _jsxs(DrawerContent, { children: [_jsx(Box, { onClick: () => setIsFullscreen(true), sx: {
                                        width: '100%',
                                        aspectRatio: '4/3',
                                        backgroundColor: 'rgba(35, 35, 35, 0.9)',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        mb: 2,
                                        '&:hover': {
                                            opacity: 0.9
                                        }
                                    }, children: _jsx("img", { src: photo.url, alt: photo.name, style: {
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            transform: photo.rotation ? `rotate(${photo.rotation}deg)` : undefined
                                        } }) }), _jsxs(Box, { sx: {
                                        backgroundColor: 'rgba(45, 45, 45, 0.9)',
                                        padding: '12px',
                                        borderRadius: '4px',
                                        mb: 2
                                    }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 1 }, children: ["Taken on ", formatDate(photo.dateAdded)] }), photo.hasGps && photo.coordinates && (_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["Location: ", photo.coordinates.lat.toFixed(6), ", ", photo.coordinates.lng.toFixed(6), photo.altitude && ` • ${photo.altitude.toFixed(0)}m`] }))] })] })] }) }), _jsxs(Dialog, { open: isFullscreen, onClose: () => setIsFullscreen(false), maxWidth: "xl", fullWidth: true, children: [_jsx(IconButton, { onClick: () => setIsFullscreen(false), sx: {
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: 'white',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.7)'
                            }
                        }, children: _jsx(Close, {}) }), _jsx(DialogContent, { sx: { p: 0 }, children: _jsx("img", { src: photo.url, alt: photo.name, style: {
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                transform: photo.rotation ? `rotate(${photo.rotation}deg)` : undefined
                            } }) })] })] }));
};
