import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Alert, Box, Button, CircularProgress, Grid, IconButton, Paper, Typography } from '@mui/material';
import { CloudUpload as UploadIcon, Delete as DeleteIcon, Map as MapIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { usePhotoService } from '../../services/photoService';

const PhotoUploaderUI = ({ isLoading, error, photos, selectedPhotos, onFileAdd, onFileDelete, onFileRename, onPhotoSelect, onAddToMap }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'image/*': ['.jpg', '.jpeg', '.png', '.gif']
        },
        multiple: true,
        onDrop: acceptedFiles => onFileAdd(acceptedFiles)
    });
    
    const photoService = usePhotoService();
    
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
        
        // Info alert
        _jsx(Alert, { 
            severity: "info", 
            sx: {
                mt: 2,
                mb: 3, // Added more spacing under the info box
                borderRadius: 3,
                backgroundColor: 'rgba(35, 35, 35, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }, 
            children: "Images must have GPS data to load onto map" 
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
        
        // Photo grid
        photos.length > 0 && (
            _jsxs(_Fragment, { children: [
                // Header with count and add to map button
                _jsxs(Box, { 
                    sx: {
                        display: 'flex',
                        flexDirection: 'column',
                        mb: 2
                    }, 
                    children: [
                        _jsxs(Typography, { 
                            variant: "body1", 
                            sx: { fontSize: '0.9rem', mb: 1 },
                            children: [
                                photos.filter(p => p.hasGps).length, 
                                " photo(s) with GPS data"
                            ] 
                        }),
                        _jsx(Button, { 
                            variant: "contained", 
                            startIcon: _jsx(MapIcon, {}), 
                            disabled: !photos.some(p => p.hasGps), 
                            onClick: onAddToMap, 
                            sx: { alignSelf: 'flex-start' },
                            children: "Add to Map" 
                        })
                    ] 
                }),
                
                // Photo grid
                _jsx(Grid, { 
                    container: true, 
                    spacing: 2, 
                    sx: { mt: 1 }, 
                    children: photos.map((photo) => (
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
                                    
                                    // GPS indicator
                                    photo.hasGps && (
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
                                                    color: '#2ecc71',
                                                    fontSize: 14
                                                } 
                                            }) 
                                        })
                                    ),
                                    
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
