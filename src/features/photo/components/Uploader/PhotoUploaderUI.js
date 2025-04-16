import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Alert, Box, Button, CircularProgress, Grid, IconButton, Paper, Typography, Divider } from '@mui/material';
import { CloudUpload as UploadIcon, Delete as DeleteIcon, Map as MapIcon, LocationOn as LocationIcon, DragIndicator as DragIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { usePhotoService } from '../../services/photoService';
import { useMapContext } from '../../../map/context/MapContext';

const PhotoUploaderUI = ({ isLoading, error, photos, selectedPhotos, onFileAdd, onFileDelete, onFileRename, onPhotoSelect, onAddToMap, onAddAsDraggable }) => {
    const { setDragPreview } = useMapContext();
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'image/*': ['.jpg', '.jpeg', '.png', '.gif']
        },
        multiple: true,
        onDrop: acceptedFiles => onFileAdd(acceptedFiles)
    });
    
    const photoService = usePhotoService();
    
    // Split photos into two groups: with GPS data and without GPS data
    const photosWithGps = photos.filter(p => p.hasGps);
    const photosWithoutGps = photos.filter(p => !p.hasGps);
    
    return (_jsxs(Box, { sx: { padding: '24px 16px', width: '100%' }, children: [
        
        // Dropzone
        _jsxs(Paper, { 
            ...getRootProps(), 
            elevation: 0, 
            sx: {
                p: 3,
                mb: 2,
                textAlign: 'center',
                backgroundColor: 'rgba(35, 35, 35, 0.9)',
                border: '2px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    backgroundColor: 'rgba(45, 45, 45, 0.9)',
                    border: '2px dashed rgba(255, 255, 255, 0.3)',
                }
            }, 
            children: [
                _jsx("input", { ...getInputProps() }),
                _jsx(UploadIcon, { sx: { fontSize: 48, mb: 2, opacity: 0.8 } }),
                _jsx(Typography, { 
                    variant: "body1", 
                    children: isDragActive
                        ? 'Drop photos here...'
                        : 'Drag & drop photos here or click to select' 
                }),
                _jsx(Typography, { 
                    variant: "body2", 
                    color: "text.secondary", 
                    sx: { mt: 1 }, 
                    children: "Supports: JPG, PNG, GIF" 
                })
            ] 
        }),
        
        
        // Error display
        error && (
            _jsxs(Alert, { 
                severity: "error", 
                sx: { mb: 2 }, 
                children: [
                    error.message,
                    error.details && (
                        _jsx(Typography, { 
                            variant: "caption", 
                            display: "block", 
                            children: error.details 
                        })
                    )
                ] 
            })
        ),
        
        // Loading indicator
        isLoading && (
            _jsx(Box, { 
                sx: { textAlign: 'center', my: 2 }, 
                children: _jsx(CircularProgress, { size: 32 }) 
            })
        ),
        
        // Photo grid - Photos WITH GPS data
        photosWithGps.length > 0 && (
            _jsxs(_Fragment, { children: [
                // Header with count and add to map button
                _jsxs(Box, { 
                    sx: {
                        display: 'flex',
                        flexDirection: 'column',
                        mb: 2,
                        mt: 3
                    }, 
                    children: [
                        _jsxs(Typography, { 
                            variant: "h6", 
                            sx: { fontSize: '1.1rem', mb: 1, fontWeight: 'bold' },
                            children: [
                                "Photos with GPS data (", 
                                photosWithGps.length,
                                ")"
                            ] 
                        }),
                        _jsx(Button, { 
                            variant: "contained", 
                            startIcon: _jsx(MapIcon, {}), 
                            disabled: photosWithGps.length === 0, 
                            onClick: onAddToMap, 
                            sx: { alignSelf: 'flex-start' },
                            children: "Add to Map" 
                        })
                    ] 
                }),
                
                // Photo grid for GPS photos
                _jsx(Grid, { 
                    container: true, 
                    spacing: 2, 
                    sx: { mt: 1 }, 
                    children: photosWithGps.map((photo) => (
                        _jsx(Grid, { 
                            item: true, 
                            xs: 12, 
                            sm: 6, 
                            key: photo.id,
                            children: _jsxs(Box, { 
                                sx: {
                                    position: 'relative',
                                    width: '100%',
                                    aspectRatio: '1/1',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)'
                                }, 
                                children: [
                                    // Image
                                    _jsx("img", {
                                        src: photo.thumbnailUrl || photo.localPreview || '/images/photo-fallback.svg',
                                        alt: photo.name || 'Photo',
                                        style: {
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            display: 'block'
                                        },
                                        onError: (e) => {
                                            e.target.src = '/images/photo-fallback.svg';
                                            e.target.style.objectFit = 'contain';
                                        }
                                    }),
                                    
                                    // Loading indicator
                                    photo.uploadStatus === 'uploading' && (
                                        _jsx(Box, {
                                            sx: {
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            },
                                            children: _jsx(CircularProgress, { size: 40 })
                                        })
                                    ),
                                    
                                    // GPS indicator (green)
                                    _jsx(Box, { 
                                        sx: {
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            backgroundColor: 'rgba(0,0,0,0.5)',
                                            borderRadius: '50%',
                                            padding: '2px',
                                            width: '20px',
                                            height: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }, 
                                        children: _jsx(LocationIcon, { 
                                            sx: {
                                                color: '#2ecc71', // Green color
                                                fontSize: 14
                                            } 
                                        }) 
                                    }),
                                    
                                    // Delete button
                                    _jsx(IconButton, { 
                                        size: "small", 
                                        onClick: (e) => {
                                            e.stopPropagation();
                                            onFileDelete(photo.id);
                                        }, 
                                        sx: {
                                            position: 'absolute',
                                            top: 8,
                                            left: 8,
                                            color: 'white',
                                            backgroundColor: 'rgba(0,0,0,0.5)',
                                            padding: '12px',
                                            width: '20px',
                                            height: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            '&:hover': {
                                                backgroundColor: 'rgba(0,0,0,0.7)'
                                            }
                                        }, 
                                        children: _jsx(DeleteIcon, { sx: { fontSize: 14 } }) 
                                    })
                                ] 
                            }) 
                        })
                    )) 
                })
            ] })
        ),
        
        // Divider between sections
        photos.length > 0 && _jsx(Divider, { sx: { my: 4, borderColor: 'rgba(255, 255, 255, 0.1)' } }),
        
        // Photo grid - Photos WITHOUT GPS data
        photosWithoutGps.length > 0 && (
            _jsxs(_Fragment, { children: [
                // Header with count and add as draggable button
                _jsxs(Box, { 
                    sx: {
                        display: 'flex',
                        flexDirection: 'column',
                        mb: 2
                    }, 
                    children: [
                        _jsxs(Typography, { 
                            variant: "h6", 
                            sx: { fontSize: '1.1rem', mb: 1, fontWeight: 'bold' },
                            children: [
                                "Photos without GPS data (", 
                                photosWithoutGps.length,
                                ")"
                            ] 
                        }),
                        _jsxs(Box, {
                            sx: { display: 'flex', flexDirection: 'column', gap: 1 },
                            children: [
                                _jsx(Typography, {
                                    variant: "body2",
                                    color: "text.secondary",
                                    children: "Drag photos directly onto the map to place them"
                                }),
                                _jsx(Button, { 
                                    variant: "contained", 
                                    startIcon: _jsx(DragIcon, {}), 
                                    disabled: photosWithoutGps.length === 0, 
                                    onClick: onAddAsDraggable, 
                                    sx: { 
                                        alignSelf: 'flex-start',
                                        backgroundColor: '#3498db', // Blue color to match the draggable marker style
                                        '&:hover': {
                                            backgroundColor: '#2980b9'
                                        }
                                    },
                                    children: "Add as Draggable Markers" 
                                })
                            ]
                        })
                    ] 
                }),
                
                // Photo grid for non-GPS photos
                _jsx(Grid, { 
                    container: true, 
                    spacing: 2, 
                    sx: { mt: 1 }, 
                    children: photosWithoutGps.map((photo) => (
                        _jsx(Grid, { 
                            item: true, 
                            xs: 12, 
                            sm: 6, 
                            key: photo.id,
                            children: _jsxs(Box, { 
                                sx: {
                                    position: 'relative',
                                    width: '100%',
                                    aspectRatio: '1/1',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    cursor: 'grab', // Show grab cursor to indicate draggability
                                },
                                onClick: () => {
                                    console.log('[PhotoUploaderUI] Photo clicked for drag:', photo.id);
                                    
                                    // Get current mouse position
                                    const mouseX = window.event?.clientX || 0;
                                    const mouseY = window.event?.clientY || 0;
                                    console.log('[PhotoUploaderUI] Mouse position at click:', { x: mouseX, y: mouseY });
                                    
                                    // Set the drag preview to this photo
                                    console.log('[PhotoUploaderUI] Setting dragPreview with photo:', photo.id);
                                    setDragPreview({
                                        type: 'photo',
                                        photo: photo,
                                        initialPosition: { x: mouseX, y: mouseY }
                                    });
                                    
                                    // Verify dragPreview was set
                                    setTimeout(() => {
                                        console.log('[PhotoUploaderUI] Verifying dragPreview was set');
                                    }, 100);
                                },
                                children: [
                                    // Image
                                    _jsx("img", {
                                        src: photo.thumbnailUrl || photo.localPreview || '/images/photo-fallback.svg',
                                        alt: photo.name || 'Photo',
                                        draggable: false, // Prevent the image from being draggable separately
                                        style: {
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            display: 'block',
                                            pointerEvents: 'none' // Prevent the image from capturing pointer events
                                        },
                                        onError: (e) => {
                                            e.target.src = '/images/photo-fallback.svg';
                                            e.target.style.objectFit = 'contain';
                                        }
                                    }),
                                    
                                    // Loading indicator
                                    photo.uploadStatus === 'uploading' && (
                                        _jsx(Box, {
                                            sx: {
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            },
                                            children: _jsx(CircularProgress, { size: 40 })
                                        })
                                    ),
                                    
                                    // Draggable indicator (blue) with tooltip
                                    _jsx(Box, { 
                                        sx: {
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            backgroundColor: 'rgba(0,0,0,0.5)',
                                            borderRadius: '50%',
                                            padding: '2px',
                                            width: '20px',
                                            height: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'grab',
                                            '&:hover::after': {
                                                content: '"Drag to map"',
                                                position: 'absolute',
                                                top: '-25px',
                                                right: '0',
                                                backgroundColor: 'rgba(0,0,0,0.8)',
                                                color: 'white',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                whiteSpace: 'nowrap'
                                            }
                                        }, 
                                        children: _jsx(DragIcon, { 
                                            sx: {
                                                color: '#3498db', // Blue color
                                                fontSize: 14
                                            } 
                                        }) 
                                    }),
                                    
                                    // Delete button
                                    _jsx(IconButton, { 
                                        size: "small", 
                                        onClick: (e) => {
                                            e.stopPropagation();
                                            onFileDelete(photo.id);
                                        }, 
                                        sx: {
                                            position: 'absolute',
                                            top: 8,
                                            left: 8,
                                            color: 'white',
                                            backgroundColor: 'rgba(0,0,0,0.5)',
                                            padding: '12px',
                                            width: '20px',
                                            height: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            '&:hover': {
                                                backgroundColor: 'rgba(0,0,0,0.7)'
                                            }
                                        }, 
                                        children: _jsx(DeleteIcon, { sx: { fontSize: 14 } }) 
                                    })
                                ] 
                            }) 
                        })
                    )) 
                })
            ] })
        )
    ] }));
};

export default PhotoUploaderUI;
