import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, ImageList, ImageListItem, Modal, IconButton, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { deserializePhoto } from '../../../../features/photo/utils/photoUtils';
import { getRouteDistance, getElevationGain, getUnpavedPercentage } from '../../../gpx/utils/routeUtils';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';

const EDITOR_BACKGROUND = 'rgb(35, 35, 35)';

const DescriptionContent = styled('div')({
    width: '100%',
    height: '100%',
    padding: 0,
    backgroundColor: '#1a1a1a'
});

export const PresentationRouteDescriptionPanel = ({ route }) => {
    const theme = useTheme();
    const photos = route?.description?.photos?.map(deserializePhoto) || [];
    const [modalOpen, setModalOpen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    const handlePhotoClick = (index) => {
        setCurrentPhotoIndex(index);
        setModalOpen(true);
    };

    const handlePrevPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    };

    const handleNextPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    };

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowLeft') {
            handlePrevPhoto();
        } else if (event.key === 'ArrowRight') {
            handleNextPhoto();
        } else if (event.key === 'Escape') {
            setModalOpen(false);
        }
    };

    return _jsxs("div", {
        className: "route-description",
        children: [
            _jsxs(DescriptionContent, {
                children: [
                    _jsxs(Box, {
                        sx: {
                            px: 2,
                            py: 1,
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: '#1a1a1a',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            gap: 3,
                            mr: 3
                        },
                        children: [
                            _jsx(Typography, {
                                variant: "subtitle2",
                                color: "white",
                                sx: {
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    fontFamily: 'Futura'
                                },
                                children: `Overview: ${route?.name}`
                            }),
                            _jsxs(Box, {
                                sx: {
                                    display: 'flex',
                                    gap: 3,
                                    ml: 'auto'
                                },
                                children: [
                                    _jsx(Typography, {
                                        variant: "body2",
                                        sx: { 
                                            fontSize: '0.75rem',
                                            fontFamily: 'Futura',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            color: 'rgba(255, 255, 255, 0.7)'
                                        },
                                        children: [
                                            _jsx("i", { 
                                                className: "fa-solid fa-route",
                                                style: { color: '#0288d1' }
                                            }),
                                            `${(getRouteDistance(route) / 1000).toFixed(1)} km`
                                        ]
                                    }),
                                    _jsx(Typography, {
                                        variant: "body2",
                                        sx: { 
                                            fontSize: '0.75rem',
                                            fontFamily: 'Futura',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            color: 'rgba(255, 255, 255, 0.7)'
                                        },
                                        children: [
                                            _jsx("i", { 
                                                className: "fa-solid fa-up-right",
                                                style: { color: '#0288d1' }
                                            }),
                                            `${Math.round(getElevationGain(route)).toLocaleString()} m`
                                        ]
                                    }),
                                    _jsx(Typography, {
                                        variant: "body2",
                                        sx: { 
                                            fontSize: '0.75rem',
                                            fontFamily: 'Futura',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            color: 'rgba(255, 255, 255, 0.7)'
                                        },
                                        children: [
                                            _jsx("i", { 
                                                className: "fa-solid fa-down-right",
                                                style: { color: '#0288d1' }
                                            }),
                                            `${Math.round(route?.statistics?.elevationLost || 0).toLocaleString()} m`
                                        ]
                                    }),
                                    _jsx(Typography, {
                                        variant: "body2",
                                        sx: { 
                                            fontSize: '0.75rem',
                                            fontFamily: 'Futura',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            color: 'rgba(255, 255, 255, 0.7)'
                                        },
                                        children: [
                                            _jsx("i", { 
                                                className: "fa-solid fa-person-biking-mountain",
                                                style: { color: '#0288d1' }
                                            }),
                                            `${getUnpavedPercentage(route)}%`
                                        ]
                                    })
                                ]
                            })
                        ]
                    }),
                    _jsxs(Box, {
                        sx: {
                            display: 'flex',
                            gap: 2,
                            p: 2,
                            height: 'calc(100% - 40px)', // Subtract header height
                            overflow: 'hidden'
                        },
                        children: [
                            _jsx(Box, {
                                sx: {
                                    width: '40%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    overflowY: 'auto',
                                    '& .MuiImageList-root': {
                                        padding: 0,
                                        margin: 0,
                                        overflow: 'visible'
                                    }
                                },
                                children: _jsx(Box, {
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
                                        sx: {
                                            width: '100%'
                                        },
                                        children: photos.map((photo, index) => (
                                            _jsx(ImageListItem, {
                                                onClick: () => handlePhotoClick(index),
                                                sx: {
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        opacity: 0.8,
                                                        transition: 'opacity 0.2s'
                                                    }
                                                },
                                                children: _jsx("img", {
                                                    src: photo.url,
                                                    alt: `Photo ${index + 1}`,
                                                    loading: "lazy",
                                                    style: {
                                                        borderRadius: '4px',
                                                        width: '100%',
                                                        display: 'block'
                                                    }
                                                })
                                            }, photo.id)
                                        ))
                                    })
                                })
                            }),
                            _jsx(Box, {
                                sx: {
                                    width: '60%',
                                    backgroundColor: EDITOR_BACKGROUND,
                                    padding: 2,
                                    overflowY: 'auto',
                                    color: 'white',
                                    fontFamily: 'Futura, sans-serif',
                                    '& a': {
                                        color: '#2196f3',
                                        textDecoration: 'underline'
                                    }
                                },
                                dangerouslySetInnerHTML: {
                                    __html: route?.description?.description || ''
                                }
                            })
                        ]
                    })
                ]
            }),
            _jsx(Modal, {
                open: modalOpen,
                onClose: () => setModalOpen(false),
                onKeyDown: handleKeyDown,
                sx: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& .MuiBackdrop-root': {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)'
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
                        photos[currentPhotoIndex] && _jsx("img", {
                            src: photos[currentPhotoIndex].url,
                            alt: `Photo ${currentPhotoIndex + 1}`,
                            style: {
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                objectFit: 'contain'
                            }
                        }),
                        _jsx(Box, {
                            sx: {
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                color: 'white',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            },
                            children: [
                                _jsx("span", {
                                    children: `${currentPhotoIndex + 1} of ${photos.length}`
                                }),
                                _jsx(IconButton, {
                                    onClick: () => setModalOpen(false),
                                    sx: {
                                        color: 'white',
                                        padding: 0.5,
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                        }
                                    },
                                    children: _jsx(CloseIcon, { fontSize: "small" })
                                })
                            ]
                        }),
                        _jsx(IconButton, {
                            onClick: handlePrevPhoto,
                            sx: {
                                position: 'absolute',
                                left: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'white',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                }
                            },
                            children: _jsx(ChevronLeftIcon, {})
                        }),
                        _jsx(IconButton, {
                            onClick: handleNextPhoto,
                            sx: {
                                position: 'absolute',
                                right: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'white',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                }
                            },
                            children: _jsx(ChevronRightIcon, {})
                        })
                    ]
                })
            })
        ]
    });
};
