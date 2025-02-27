import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, Stack } from '@mui/material';
import { Close as CloseIcon, NavigateNext as NextIcon, NavigateBefore as PrevIcon } from '@mui/icons-material';

export const PhotoPreviewModal = ({ photo, onClose, additionalPhotos }) => {
    const photos = additionalPhotos || [photo];
    const currentIndex = photos.findIndex(p => p.id === photo.id);
    const [selectedIndex, setSelectedIndex] = useState(currentIndex);
    const mainImageRef = useRef(null);
    const thumbnailRefs = useRef({});
    
    const handleNext = useCallback(() => {
        setSelectedIndex((prev) => (prev + 1) % photos.length);
    }, [photos.length]);
    
    const handlePrev = useCallback(() => {
        setSelectedIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }, [photos.length]);
    
    const selectedPhoto = photos[selectedIndex];
    
    // Load main image using direct image loading
    useEffect(() => {
        if (!mainImageRef.current) return;
        
        // Clear previous content
        while (mainImageRef.current.firstChild) {
            mainImageRef.current.removeChild(mainImageRef.current.firstChild);
        }
        
        // Use largeUrl if available, otherwise try mediumUrl, then fall back to url
        // This ensures we're using the most appropriate optimized version
        const imageUrl = selectedPhoto.largeUrl || selectedPhoto.mediumUrl || selectedPhoto.url;
        
        console.log('[PhotoPreviewModal] Using image URL:', {
            largeUrl: selectedPhoto.largeUrl,
            mediumUrl: selectedPhoto.mediumUrl,
            url: selectedPhoto.url,
            selected: imageUrl
        });
        
        // Create image element
        const img = document.createElement('img');
        img.alt = selectedPhoto.name;
        img.style.width = '100%';
        img.style.maxHeight = '70vh';
        img.style.objectFit = 'contain';
        
        // Set up error handler for fallback with retry logic
        img.onerror = () => {
            console.error('Failed to load photo:', imageUrl);
            
            // If we failed with largeUrl, try mediumUrl
            if (imageUrl === selectedPhoto.largeUrl && selectedPhoto.mediumUrl) {
                console.log('[PhotoPreviewModal] Retrying with mediumUrl');
                img.src = selectedPhoto.mediumUrl;
                return;
            }
            
            // If we failed with mediumUrl, try original url
            if (imageUrl === selectedPhoto.mediumUrl && selectedPhoto.url) {
                console.log('[PhotoPreviewModal] Retrying with original url');
                img.src = selectedPhoto.url;
                return;
            }
            
            // If all else fails, use fallback image
            img.src = '/images/photo-fallback.svg';
            img.alt = 'Failed to load photo';
        };
        
        // Set the source to start loading
        img.src = imageUrl;
        
        // Add to container
        mainImageRef.current.appendChild(img);
        
    }, [selectedPhoto]);
    
    // Load thumbnail images using direct image loading
    useEffect(() => {
        photos.forEach((p, index) => {
            const ref = thumbnailRefs.current[p.id];
            if (!ref) return;
            
            // Clear previous content
            while (ref.firstChild) {
                ref.removeChild(ref.firstChild);
            }
            
            // Create image element
            const img = document.createElement('img');
            img.alt = p.name;
            img.style.width = '60px';
            img.style.height = '60px';
            img.style.objectFit = 'cover';
            img.style.cursor = 'pointer';
            img.style.borderRadius = '4px';
            img.style.border = index === selectedIndex ? '2px solid #4AA4DE' : '2px solid transparent';
            
            // Add event listeners
            img.addEventListener('click', () => setSelectedIndex(index));
            img.addEventListener('mouseover', () => { img.style.opacity = '0.8'; });
            img.addEventListener('mouseout', () => { img.style.opacity = '1'; });
            
            // Use thumbnailUrl if available, otherwise try tinyThumbnailUrl, then fall back to url
            const thumbnailUrl = p.thumbnailUrl || p.tinyThumbnailUrl || p.url;
            
            // Set up error handler for fallback with retry logic
            img.onerror = () => {
                console.error('Failed to load thumbnail:', thumbnailUrl);
                
                // If we failed with thumbnailUrl, try tinyThumbnailUrl
                if (thumbnailUrl === p.thumbnailUrl && p.tinyThumbnailUrl) {
                    console.log('[PhotoPreviewModal] Retrying thumbnail with tinyThumbnailUrl');
                    img.src = p.tinyThumbnailUrl;
                    return;
                }
                
                // If we failed with tinyThumbnailUrl, try original url
                if (thumbnailUrl === p.tinyThumbnailUrl && p.url) {
                    console.log('[PhotoPreviewModal] Retrying thumbnail with original url');
                    img.src = p.url;
                    return;
                }
                
                // If all else fails, use fallback image
                img.src = '/images/photo-fallback.svg';
                img.alt = 'Failed to load photo';
                img.style.objectFit = 'contain';
            };
            
            // Set the source to start loading
            img.src = thumbnailUrl;
            
            // Add to container
            ref.appendChild(img);
        });
    }, [photos, selectedIndex]);
    
    return (_jsxs(Dialog, { 
        open: true, 
        onClose: onClose, 
        fullScreen: false, 
        maxWidth: false, 
        fullWidth: false, 
        sx: {
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
        }, 
        children: [
            _jsx(DialogTitle, { 
                children: _jsxs(Box, { 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    children: [
                        _jsx(Typography, { variant: "h6", children: selectedPhoto.name }), 
                        _jsx(IconButton, { onClick: onClose, size: "small", children: _jsx(CloseIcon, {}) })
                    ] 
                }) 
            }), 
            _jsxs(DialogContent, { 
                children: [
                    _jsxs(Box, { 
                        position: "relative", 
                        children: [
                            _jsx(Box, { 
                                ref: mainImageRef,
                                sx: {
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    minHeight: '200px'
                                } 
                            }), 
                            photos.length > 1 && (_jsxs(_Fragment, { 
                                children: [
                                    _jsx(IconButton, { 
                                        onClick: handlePrev, 
                                        sx: {
                                            position: 'absolute',
                                            left: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            bgcolor: 'rgba(255,255,255,0.8)',
                                            '&:hover': {
                                                bgcolor: 'rgba(255,255,255,0.9)'
                                            }
                                        }, 
                                        children: _jsx(PrevIcon, {}) 
                                    }), 
                                    _jsx(IconButton, { 
                                        onClick: handleNext, 
                                        sx: {
                                            position: 'absolute',
                                            right: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            bgcolor: 'rgba(255,255,255,0.8)',
                                            '&:hover': {
                                                bgcolor: 'rgba(255,255,255,0.9)'
                                            }
                                        }, 
                                        children: _jsx(NextIcon, {}) 
                                    })
                                ] 
                            }))
                        ] 
                    }), 
                    selectedPhoto.coordinates && (_jsxs(Typography, { 
                        variant: "body2", 
                        color: "text.secondary", 
                        sx: { mt: 2 }, 
                        children: [
                            "Location: ", 
                            selectedPhoto.coordinates.lat.toFixed(6), 
                            ", ", 
                            selectedPhoto.coordinates.lng.toFixed(6), 
                            selectedPhoto.altitude && ` • Altitude: ${selectedPhoto.altitude.toFixed(1)}m`
                        ] 
                    })), 
                    photos.length > 1 && (_jsx(Stack, { 
                        direction: "row", 
                        spacing: 1, 
                        sx: {
                            mt: 2,
                            overflowX: 'auto',
                            pb: 1
                        }, 
                        children: photos.map((p) => (
                            _jsx(Box, { 
                                ref: (el) => { thumbnailRefs.current[p.id] = el; },
                                sx: {
                                    width: 60,
                                    height: 60,
                                    borderRadius: 1
                                } 
                            }, p.id)
                        )) 
                    }))
                ] 
            })
        ] 
    }));
};
