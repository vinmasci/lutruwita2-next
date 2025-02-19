import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, TextField, Button, IconButton, Snackbar, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { RichTextEditor } from './RichTextEditor';
import { fileToProcessedPhoto, deserializePhoto, serializePhoto } from '../../../../features/photo/utils/photoUtils';
import { useRouteContext } from '../../../../features/map/context/RouteContext';
export const RouteDescriptionPanel = ({ route }) => {
    const { updateRoute } = useRouteContext();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState([]);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    useEffect(() => {
        if (route?.description) {
            setTitle(route.description.title || '');
            setDescription(route.description.description || '');
            setPhotos((route.description.photos || []).map(deserializePhoto));
        }
    }, [route]);
    const handlePhotoChange = (event) => {
        if (event.target.files) {
            const newPhotos = Array.from(event.target.files).map(fileToProcessedPhoto);
            setPhotos([...photos, ...newPhotos]);
        }
    };
    const handleTitleChange = (event) => {
        setTitle(event.target.value);
    };
    const handleDeletePhoto = (photoId) => {
        setPhotos(photos.filter(photo => photo.id !== photoId));
    };
    const handleSave = () => {
        if (route?.routeId) {
            updateRoute(route.routeId, {
                description: {
                    title,
                    description,
                    photos: photos.map(serializePhoto)
                }
            });
            setShowSaveSuccess(true);
        }
    };
    const handleCloseSnackbar = () => {
        setShowSaveSuccess(false);
    };
    return (_jsxs(_Fragment, { children: [_jsxs(Box, { sx: {
                    display: 'flex',
                    height: '100%',
                    backgroundColor: 'rgba(26, 26, 26, 0.9)',
                    padding: 2
                }, children: [_jsxs(Box, { sx: {
                            width: '200px',
                            marginRight: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1
                        }, children: [_jsxs(Button, { component: "label", variant: "outlined", color: "info", fullWidth: true, sx: {
                                    backgroundColor: 'rgb(35, 35, 35)',
                                    borderColor: 'rgb(41, 182, 246)',
                                    color: 'rgb(41, 182, 246)',
                                    borderWidth: 2,
                                    '&:hover': {
                                        borderColor: 'rgb(41, 182, 246)',
                                        backgroundColor: 'rgba(41, 182, 246, 0.1)',
                                        borderWidth: 2
                                    }
                                }, children: ["Add Photos", _jsx("input", { type: "file", hidden: true, multiple: true, accept: "image/*", onChange: handlePhotoChange })] }), _jsx(Box, { sx: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: 1,
                                    overflowY: 'auto',
                                    flex: 1
                                }, children: photos.map((photo, index) => (_jsxs(Box, { sx: {
                                        width: '100%',
                                        aspectRatio: '1',
                                        backgroundColor: 'rgb(35, 35, 35)',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }, children: [_jsx("img", { src: photo.url, alt: `Upload ${index + 1}`, style: {
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            } }), _jsx(IconButton, { onClick: () => handleDeletePhoto(photo.id), sx: {
                                                position: 'absolute',
                                                top: 4,
                                                right: 4,
                                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                                }
                                            }, size: "small", children: _jsx(DeleteIcon, { sx: { color: 'white', fontSize: 16 } }) })] }, photo.id))) })] }), _jsxs(Box, { sx: {
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2
                        }, children: [_jsx(TextField, { label: "Title", value: title, onChange: handleTitleChange, fullWidth: true, variant: "outlined", size: "small", sx: {
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
                                } }), _jsx(Box, { sx: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }, children: _jsx(RichTextEditor, { value: description, onChange: setDescription }) }), _jsx(Button, { variant: "outlined", onClick: handleSave, color: "info", sx: {
                                    marginTop: 'auto',
                                    borderColor: 'rgb(41, 182, 246)',
                                    color: 'rgb(41, 182, 246)',
                                    borderWidth: 2,
                                    '&:hover': {
                                        borderColor: 'rgb(41, 182, 246)',
                                        backgroundColor: 'rgba(41, 182, 246, 0.1)',
                                        borderWidth: 2
                                    }
                                }, children: "Save Description" })] })] }), _jsx(Snackbar, { open: showSaveSuccess, autoHideDuration: 3000, onClose: handleCloseSnackbar, anchorOrigin: { vertical: 'bottom', horizontal: 'center' }, children: _jsx(Alert, { onClose: handleCloseSnackbar, severity: "info", sx: { width: '100%' }, children: "Description saved successfully" }) })] }));
};
