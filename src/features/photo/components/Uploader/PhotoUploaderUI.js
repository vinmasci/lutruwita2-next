import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Alert, Box, Button, CircularProgress, Grid, IconButton, Paper, Typography } from '@mui/material';
import { CloudUpload as UploadIcon, Delete as DeleteIcon, Map as MapIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
const PhotoUploaderUI = ({ isLoading, error, photos, selectedPhotos, onFileAdd, onFileDelete, onFileRename, onPhotoSelect, onAddToMap }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'image/*': ['.jpg', '.jpeg', '.png', '.gif']
        },
        multiple: true,
        onDrop: acceptedFiles => onFileAdd(acceptedFiles)
    });
    return (_jsxs(Box, { sx: { padding: '24px 16px', width: '100%' }, children: [_jsxs(Paper, { ...getRootProps(), elevation: 0, sx: {
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
                }, children: [_jsx("input", { ...getInputProps() }), _jsx(UploadIcon, { sx: { fontSize: 48, mb: 2, opacity: 0.8 } }), _jsx(Typography, { variant: "body1", children: isDragActive
                            ? 'Drop photos here...'
                            : 'Drag & drop photos here or click to select' }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 1 }, children: "Supports: JPG, PNG, GIF" })] }), _jsx(Alert, { severity: "info", sx: {
                    mt: 2,
                    borderRadius: 3,
                    backgroundColor: 'rgba(35, 35, 35, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }, children: "Images must have GPS data to load onto map" }), error && (_jsxs(Alert, { severity: "error", sx: { mb: 2 }, children: [error.message, error.details && (_jsx(Typography, { variant: "caption", display: "block", children: error.details }))] })), isLoading && (_jsx(Box, { sx: { textAlign: 'center', my: 2 }, children: _jsx(CircularProgress, { size: 32 }) })), photos.length > 0 && (_jsxs(_Fragment, { children: [_jsxs(Box, { sx: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2
                        }, children: [_jsxs(Typography, { variant: "h6", children: [photos.filter(p => p.hasGps).length, " photo(s) with GPS data"] }), _jsx(Button, { variant: "contained", startIcon: _jsx(MapIcon, {}), disabled: !photos.some(p => p.hasGps), onClick: onAddToMap, children: "Add to Map" })] }), _jsx(Grid, { container: true, spacing: 2, sx: { mt: 1 }, children: photos.map((photo) => (_jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Box, { sx: {
                                    position: 'relative',
                                    width: '100%',
                                    aspectRatio: '1/1',
                                    borderRadius: 1,
                                    overflow: 'hidden'
                                }, children: [_jsx(Box, { component: "img", src: photo.thumbnailUrl, alt: photo.name, sx: {
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            display: 'block'
                                        } }), photo.hasGps && (_jsx(Box, { sx: {
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
                                        }, children: _jsx(LocationIcon, { sx: {
                                                color: '#2ecc71',
                                                fontSize: 14
                                            } }) })), _jsx(IconButton, { size: "small", onClick: (e) => {
                                            e.stopPropagation();
                                            onFileDelete(photo.id);
                                        }, sx: {
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
                                        }, children: _jsx(DeleteIcon, { sx: { fontSize: 14 } }) })] }) }, photo.id))) })] }))] }));
};
export default PhotoUploaderUI;
