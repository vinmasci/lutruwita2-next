import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Button, IconButton, Snackbar, Alert, ImageList, ImageListItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { RichTextEditor } from './RichTextEditor';
import { fileToProcessedPhoto, deserializePhoto, serializePhoto } from '../../../../features/photo/utils/photoUtils';
import { useRouteContext } from '../../../../features/map/context/RouteContext';
import { usePhotoService } from '../../../../features/photo/services/photoService';

const BACKGROUND_COLOR = 'rgba(26, 26, 26, 0.9)';
const EDITOR_BACKGROUND = 'rgb(35, 35, 35)';
const BUTTON_COLOR = '#2196f3'; // Material UI Blue

export const RouteDescriptionPanel = ({ route }) => {
    const { updateRoute, routes } = useRouteContext();
    const photoService = usePhotoService();
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState([]);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        console.debug('[RouteDescriptionPanel] Route changed:', {
            routeId: route?.routeId,
            hasDescription: !!route?.description
        });

        setDescription('');
        setPhotos([]);

        if (route?.description) {
            setDescription(route.description.description ?? '');
            setPhotos((route.description.photos || []).map(deserializePhoto));
        }
    }, [route?.routeId]);

    useEffect(() => {
        if (!route?.routeId) return;

        const currentRoute = routes.find(r => r.routeId === route.routeId);
        if (!currentRoute) return;

        const hasChanges = 
            currentRoute.description?.description !== description ||
            currentRoute.description?.photos?.length !== photos.length;

        if (hasChanges) {
            const timeoutId = setTimeout(() => {
                const descriptionData = {
                    description: description || '',
                    photos: photos.map(serializePhoto)
                };
                updateRoute(route.routeId, {
                    description: descriptionData
                });
            }, 500);

            return () => clearTimeout(timeoutId);
        }
    }, [description, photos, route?.routeId, routes, updateRoute]);

    const handlePhotoChange = (event) => {
        if (event.target.files) {
            const newPhotos = Array.from(event.target.files).map(file => ({
                ...fileToProcessedPhoto(file),
                file
            }));
            setPhotos([...photos, ...newPhotos]);
        }
    };

    const handleDeletePhoto = (photoId) => {
        setPhotos(photos.filter(photo => photo.id !== photoId));
    };

    const handleSave = async () => {
        if (!route?.routeId) return;
        
        try {
            setIsSaving(true);

            const uploadPromises = photos
                .filter(photo => photo.file)
                .map(async photo => {
                    if (!photo.file) return photo;
                    
                    const result = await photoService.uploadPhoto(photo.file);
                    return {
                        ...photo,
                        url: result.url,
                        thumbnailUrl: result.thumbnailUrl,
                        file: undefined
                    };
                });

            const uploadedPhotos = await Promise.all(uploadPromises);
            const updatedPhotos = photos.map(photo => {
                const uploaded = uploadedPhotos.find(up => up.id === photo.id);
                return uploaded || photo;
            });

            await updateRoute(route.routeId, {
                description: {
                    description: description || '',
                    photos: updatedPhotos.map(serializePhoto)
                }
            });

            setPhotos(updatedPhotos);
            setShowSaveSuccess(true);
        } catch (error) {
            console.error('[RouteDescriptionPanel] Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseSnackbar = () => {
        setShowSaveSuccess(false);
    };

    return _jsxs(_Fragment, {
        children: [
            _jsxs(Box, {
                sx: {
                    display: 'flex',
                    height: '100%',
                    backgroundColor: BACKGROUND_COLOR,
                    padding: 2,
                    gap: 2,
                    fontFamily: 'Futura, sans-serif'
                },
                children: [
                    _jsxs(Box, {
                        sx: {
                            width: '40%',
                            marginRight: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2
                        },
                        children: [
                            _jsxs(Box, {
                                sx: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1
                                },
                                children: [
                                    _jsxs(Box, {
                                        sx: {
                                            backgroundColor: '#1e1e1e',
                                            borderRadius: '12px',
                                            padding: '12px 16px',
                                            mb: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2
                                        },
                                        children: [
                                            _jsx("i", {
                                                className: "fa-solid fa-circle-info",
                                                style: {
                                                    color: '#2196f3',
                                                    fontSize: '1.2rem'
                                                }
                                            }),
                                            _jsxs("div", {
                                                style: {
                                                    color: '#a8c7fa',
                                                    fontSize: '0.85rem',
                                                    fontFamily: 'Futura, sans-serif'
                                                },
                                                children: [
                                                    "If you have already added photos using the \"Add GPS Photo\" service, your photos will be automatically displayed in view mode.",
                                                    _jsx("br", {}),
                                                    _jsx("br", {}),
                                                    "Add photos here if they do not have GPS information attributed to them."
                                                ]
                                            })
                                        ]
                                    }),
                                    _jsxs(Button, {
                                        component: "label",
                                        variant: "outlined",
                                        fullWidth: true,
                                        sx: {
                                            borderColor: BUTTON_COLOR,
                                            color: BUTTON_COLOR,
                                            borderWidth: 2,
                                            fontFamily: 'Futura, sans-serif',
                                            '&:hover': {
                                                borderColor: BUTTON_COLOR,
                                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                                borderWidth: 2
                                            }
                                        },
                                        children: [
                                            "Add Photos",
                                            _jsx("input", {
                                                type: "file",
                                                hidden: true,
                                                multiple: true,
                                                accept: "image/*",
                                                onChange: handlePhotoChange
                                            })
                                        ]
                                    }),
                                ]
                            }),
                            _jsx(Box, {
                                sx: {
                                    overflowY: 'auto',
                                    flex: 1,
                                    '& .MuiImageList-root': {
                                        padding: 0,
                                        margin: 0
                                    }
                                },
                                children: _jsx(ImageList, {
                                    variant: "masonry",
                                    cols: 2,
                                    gap: 8,
                                    children: photos.map((photo, index) => (
                                        _jsxs(ImageListItem, {
                                            sx: {
                                                position: 'relative',
                                                '&:hover .delete-button': {
                                                    opacity: 1
                                                }
                                            },
                                            children: [
                                                _jsx("img", {
                                                    src: photo.url,
                                                    alt: `Upload ${index + 1}`,
                                                    loading: "lazy",
                                                    style: {
                                                        borderRadius: '4px',
                                                        width: '100%',
                                                        display: 'block'
                                                    }
                                                }),
                                                _jsx(IconButton, {
                                                    className: "delete-button",
                                                    onClick: () => handleDeletePhoto(photo.id),
                                                    sx: {
                                                        position: 'absolute',
                                                        top: 4,
                                                        right: 4,
                                                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                        opacity: 0,
                                                        transition: 'opacity 0.2s',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                                        }
                                                    },
                                                    size: "small",
                                                    children: _jsx(DeleteIcon, {
                                                        sx: { color: 'white', fontSize: 16 }
                                                    })
                                                })
                                            ]
                                        }, photo.id)
                                    ))
                                })
                            })
                        ]
                    }),
                    _jsxs(Box, {
                        sx: {
                            width: '60%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            backgroundColor: EDITOR_BACKGROUND,
                            height: '100%',
                            overflowY: 'auto'
                        },
                        children: [
                            _jsx(Box, {
                                sx: {
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    overflowY: 'auto'
                                },
                                children: _jsx(RichTextEditor, {
                                    value: description,
                                    onChange: setDescription
                                })
                            }),
                            _jsx(Button, {
                                variant: "outlined",
                                onClick: handleSave,
                                disabled: isSaving,
                                sx: {
                                    marginTop: 'auto',
                                    borderColor: BUTTON_COLOR,
                                    color: BUTTON_COLOR,
                                    borderWidth: 2,
                                    fontFamily: 'Futura, sans-serif',
                                    '&:hover': {
                                        borderColor: BUTTON_COLOR,
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                        borderWidth: 2
                                    }
                                },
                                children: isSaving ? "Saving..." : "Save Description"
                            })
                        ]
                    })
                ]
            }),
            _jsx(Snackbar, {
                open: showSaveSuccess,
                autoHideDuration: 3000,
                onClose: handleCloseSnackbar,
                anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
                children: _jsx(Alert, {
                    onClose: handleCloseSnackbar,
                    severity: "info",
                    sx: {
                        width: '100%',
                        fontFamily: 'Futura, sans-serif'
                    },
                    children: "Description saved successfully"
                })
            })
        ]
    });
};
