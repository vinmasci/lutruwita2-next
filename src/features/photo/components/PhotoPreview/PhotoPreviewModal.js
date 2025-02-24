import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, Stack } from '@mui/material';
import { Close as CloseIcon, NavigateNext as NextIcon, NavigateBefore as PrevIcon } from '@mui/icons-material';
export const PhotoPreviewModal = ({ photo, onClose, additionalPhotos }) => {
    const photos = additionalPhotos || [photo];
    const currentIndex = photos.findIndex(p => p.id === photo.id);
    const [selectedIndex, setSelectedIndex] = useState(currentIndex);
    const handleNext = useCallback(() => {
        setSelectedIndex((prev) => (prev + 1) % photos.length);
    }, [photos.length]);
    const handlePrev = useCallback(() => {
        setSelectedIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }, [photos.length]);
    const selectedPhoto = photos[selectedIndex];
    return (_jsxs(Dialog, { open: true, onClose: onClose, fullScreen: false, maxWidth: false, fullWidth: false, sx: {
            '& .MuiDialog-container': {
                alignItems: 'center',
                justifyContent: 'center',
                '& .MuiPaper-root': {
                    width: '800px',
                    maxWidth: '80%',
                    m: 2,
                    borderRadius: 1
                }
            }
        }, children: [_jsx(DialogTitle, { children: _jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", children: [_jsx(Typography, { variant: "h6", children: selectedPhoto.name }), _jsx(IconButton, { onClick: onClose, size: "small", children: _jsx(CloseIcon, {}) })] }) }), _jsxs(DialogContent, { children: [_jsxs(Box, { position: "relative", children: [_jsx(Box, { component: "img", src: selectedPhoto.url, alt: selectedPhoto.name, sx: {
                                    width: '100%',
                                    maxHeight: '70vh',
                                    objectFit: 'contain'
                                } }), photos.length > 1 && (_jsxs(_Fragment, { children: [_jsx(IconButton, { onClick: handlePrev, sx: {
                                            position: 'absolute',
                                            left: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            bgcolor: 'rgba(255,255,255,0.8)',
                                            '&:hover': {
                                                bgcolor: 'rgba(255,255,255,0.9)'
                                            }
                                        }, children: _jsx(PrevIcon, {}) }), _jsx(IconButton, { onClick: handleNext, sx: {
                                            position: 'absolute',
                                            right: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            bgcolor: 'rgba(255,255,255,0.8)',
                                            '&:hover': {
                                                bgcolor: 'rgba(255,255,255,0.9)'
                                            }
                                        }, children: _jsx(NextIcon, {}) })] }))] }), selectedPhoto.coordinates && (_jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 2 }, children: ["Location: ", selectedPhoto.coordinates.lat.toFixed(6), ", ", selectedPhoto.coordinates.lng.toFixed(6), selectedPhoto.altitude && ` • Altitude: ${selectedPhoto.altitude.toFixed(1)}m`] })), photos.length > 1 && (_jsx(Stack, { direction: "row", spacing: 1, sx: {
                            mt: 2,
                            overflowX: 'auto',
                            pb: 1
                        }, children: photos.map((p, index) => (_jsx(Box, { component: "img", src: p.thumbnailUrl, alt: p.name, onClick: () => setSelectedIndex(index), sx: {
                                width: 60,
                                height: 60,
                                objectFit: 'cover',
                                cursor: 'pointer',
                                borderRadius: 1,
                                border: index === selectedIndex ? '2px solid #4AA4DE' : '2px solid transparent',
                                '&:hover': {
                                    opacity: 0.8
                                }
                            } }, p.id))) }))] })] }));
};
