import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { Box, ImageList, ImageListItem, Modal, IconButton, Typography, useTheme, Chip, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { deserializePhoto } from '../../../../features/photo/utils/photoUtils';
import { getRouteDistance, getElevationGain, getUnpavedPercentage } from '../../../gpx/utils/routeUtils';
import { usePhotoContext } from '../../../../features/photo/context/PhotoContext';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import PhotoIcon from '@mui/icons-material/Photo';
import { useMapContext } from '../../../map/context/MapContext';

const EDITOR_BACKGROUND = 'rgb(35, 35, 35)';

// Note: Bearing calculation function kept for potential future use
// Function to calculate bearing between two points
const calculateBearing = (start, end) => {
    const startLat = start[1] * Math.PI / 180;
    const startLng = start[0] * Math.PI / 180;
    const endLat = end[1] * Math.PI / 180;
    const endLng = end[0] * Math.PI / 180;
    
    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
};

// Function to check if a point is near a route
const isPointNearRoute = (
    point,
    route,
    threshold = 0.001 // Approximately 100 meters at the equator
) => {
    if (!route.geojson || !route.geojson.features || route.geojson.features.length === 0) {
        return false;
    }

    // Find LineString features in the GeoJSON
    const lineFeatures = route.geojson.features.filter(
        feature => feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString'
    );

    if (lineFeatures.length === 0) {
        return false;
    }

    // Check each line feature
    for (const feature of lineFeatures) {
        let coordinates;

        if (feature.geometry.type === 'LineString') {
            coordinates = feature.geometry.coordinates;
        } else if (feature.geometry.type === 'MultiLineString') {
            // Flatten MultiLineString coordinates
            coordinates = feature.geometry.coordinates.flat();
        } else {
            continue;
        }

        // Check each segment of the line
        for (let i = 0; i < coordinates.length - 1; i++) {
            const [lng1, lat1] = coordinates[i];
            const [lng2, lat2] = coordinates[i + 1];

            // Check if point is near this segment
            if (isPointNearSegment(point, { lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }, threshold)) {
                return true;
            }
        }
    }

    return false;
};

// Helper function to check if a point is near a line segment
const isPointNearSegment = (
    point,
    start,
    end,
    threshold
) => {
    // Calculate the squared distance from point to line segment
    const squaredDistance = getSquaredDistanceToSegment(point, start, end);
    
    // Compare with threshold squared (to avoid taking square root)
    return squaredDistance <= threshold * threshold;
};

// Calculate squared distance from point to line segment
const getSquaredDistanceToSegment = (
    point,
    start,
    end
) => {
    const { lat: x, lng: y } = point;
    const { lat: x1, lng: y1 } = start;
    const { lat: x2, lng: y2 } = end;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return dx * dx + dy * dy;
};

const DescriptionContent = styled('div')({
    width: '100%',
    height: '100%',
    padding: 0,
    backgroundColor: '#1a1a1a'
});

export const PresentationRouteDescriptionPanel = ({ route }) => {
    const theme = useTheme();
    const { photos: globalPhotos } = usePhotoContext();
    const routePhotos = route?.description?.photos?.map(deserializePhoto) || [];
    const [modalOpen, setModalOpen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [currentPhotoSet, setCurrentPhotoSet] = useState('route'); // 'route' or 'nearby'
    const { map } = useMapContext();
    
    // Fly-by functionality removed - now only available in the elevation panel
    
    // Filter photos that are near the current route
    const nearbyPhotos = useMemo(() => {
        if (!route || !globalPhotos.length) {
            return [];
        }

        // Get IDs of photos already in the route description
        const existingPhotoIds = new Set(routePhotos.map(p => p.id));
        
        return globalPhotos.filter(photo => 
            photo.coordinates && 
            isPointNearRoute(photo.coordinates, route) &&
            !existingPhotoIds.has(photo.id) // Exclude photos already in the route description
        );
    }, [route, globalPhotos, routePhotos]);
    
    // Combined photos for the modal
    const allPhotos = useMemo(() => {
        return currentPhotoSet === 'route' ? routePhotos : nearbyPhotos;
    }, [currentPhotoSet, routePhotos, nearbyPhotos]);

    const handlePhotoClick = (index, photoSet) => {
        setCurrentPhotoSet(photoSet);
        setCurrentPhotoIndex(index);
        setModalOpen(true);
    };

    const handlePrevPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1));
    };

    const handleNextPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0));
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
                            _jsxs(Box, {
                                sx: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
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
                                    })
                                    // Fly-by button removed - now only available in the elevation panel
                                ]
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
                                    children: _jsxs(Box, {
                                    sx: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0
                                    },
                                    children: [
                                        // Route photos section
                                        _jsxs(Box, {
                                            sx: {
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1
                                            },
                                            children: [
                                                routePhotos.length > 0 && _jsx(Typography, {
                                                    variant: "subtitle2",
                                                    sx: {
                                                        color: 'white',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 500
                                                    },
                                                    children: "Route Photos"
                                                }),
                                                _jsx(ImageList, {
                                                    variant: "masonry",
                                                    cols: 2,
                                                    gap: 8,
                                                    sx: {
                                                        width: '100%',
                                                        margin: 0
                                                    },
                                                    children: routePhotos.map((photo, index) => (
                                                        _jsx(ImageListItem, {
                                                            onClick: () => handlePhotoClick(index, 'route'),
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
                                            ]
                                        }),
                                        
                                        // Nearby photos section
                                        nearbyPhotos.length > 0 && _jsxs(Box, {
                                            sx: {
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1
                                            },
                                            children: [
                                                _jsxs(Box, {
                                                    sx: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1
                                                    },
                                                    children: [
                                                        _jsx(Typography, {
                                                            variant: "subtitle2",
                                                            sx: {
                                                                color: 'white',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 500
                                                            },
                                                            children: "Nearby Photos"
                                                        }),
                                                        _jsx(Chip, {
                                                            icon: _jsx(PhotoIcon, { fontSize: "small" }),
                                                            label: `${nearbyPhotos.length}`,
                                                            size: "small",
                                                            sx: {
                                                                backgroundColor: 'rgba(41, 182, 246, 0.2)',
                                                                color: 'rgb(41, 182, 246)',
                                                                fontSize: '0.7rem'
                                                            }
                                                        })
                                                    ]
                                                }),
                                                _jsx(ImageList, {
                                                    variant: "masonry",
                                                    cols: 2,
                                                    gap: 8,
                                                    sx: {
                                                        width: '100%',
                                                        margin: 0
                                                    },
                                                    children: nearbyPhotos.map((photo, index) => (
                                                        _jsx(ImageListItem, {
                                                            onClick: () => handlePhotoClick(index, 'nearby'),
                                                            sx: {
                                                                cursor: 'pointer',
                                                                '&:hover': {
                                                                    opacity: 0.8,
                                                                    transition: 'opacity 0.2s'
                                                                },
                                                                position: 'relative'
                                                            },
                                                            children: [
                                                                _jsx("img", {
                                                                    src: photo.url,
                                                                    alt: `Nearby Photo ${index + 1}`,
                                                                    loading: "lazy",
                                                                    style: {
                                                                        borderRadius: '4px',
                                                                        width: '100%',
                                                                        display: 'block'
                                                                    }
                                                                }),
                                                                _jsx(Box, {
                                                                    sx: {
                                                                        position: 'absolute',
                                                                        top: 4,
                                                                        right: 4,
                                                                        backgroundColor: 'rgba(41, 182, 246, 0.7)',
                                                                        borderRadius: '50%',
                                                                        width: 20,
                                                                        height: 20,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    },
                                                                    children: _jsx(PhotoIcon, { 
                                                                        sx: { 
                                                                            color: 'white',
                                                                            fontSize: '0.8rem'
                                                                        } 
                                                                    })
                                                                })
                                                            ]
                                                        }, photo.id)
                                                    ))
                                                })
                                            ]
                                        })
                                    ]
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
                        allPhotos[currentPhotoIndex] && _jsx("img", {
                            src: allPhotos[currentPhotoIndex].url,
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
                                    children: `${currentPhotoIndex + 1} of ${allPhotos.length}`
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
