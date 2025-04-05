import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useCallback } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { deserializePhoto } from '../../../../features/photo/utils/photoUtils';
// Import route utility functions
import { getUnpavedPercentage } from '../../../gpx/utils/routeUtils';
import { usePhotoContext } from '../../../../features/photo/context/PhotoContext';
import { useMapContext } from '../../../map/context/MapContext';
import { ImageSliderWithLightbox } from '../ImageSlider/ImageSliderWithLightbox';

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

// Styled container for the slider that fills the available space
const SliderContainer = styled(Box)({
    height: '100%',
    width: '100%',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative'
});

export const PresentationRouteDescriptionPanel = ({ route }) => {
    const theme = useTheme();
    const { photos: globalPhotos } = usePhotoContext();
    const routePhotos = route?.description?.photos?.map(deserializePhoto) || [];
    const { map } = useMapContext();
    
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
    
    // Combine route and nearby photos
    const allPhotos = useMemo(() => {
        return [...routePhotos, ...nearbyPhotos];
    }, [routePhotos, nearbyPhotos]);


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
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)' 
                        },
                        children: [
                            _jsx(Typography, 
                                {
                                    variant: "subtitle2", 
                                    color: "white", 
                                    sx: { 
                                        fontSize: '0.8rem', 
                                        fontWeight: 500, 
                                        mr: 3, 
                                        fontFamily: 'Futura' 
                                    },
                                    children: `Overview: ${route?.name}`
                                }
                            ),
                            // Route statistics removed from description panel
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
                                    width: '60%',
                                    backgroundColor: EDITOR_BACKGROUND,
                                    padding: 2,
                                    overflowY: 'auto',
                                    color: 'white',
                                    fontFamily: 'Futura, sans-serif',
                                    '& a': {
                                        color: '#2196f3',
                                        textDecoration: 'underline'
                                    },
                                    display: 'flex',
                                    flexDirection: 'column'
                                },
                                children: route?.description?.description ? (
                                    // If description exists, render it
                                    _jsx(Box, {
                                        dangerouslySetInnerHTML: {
                                            __html: route.description.description
                                        }
                                    })
                                ) : (
                                    // If description is empty, show route title and stats
                                    _jsxs(Box, {
                                        sx: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 2,
                                            alignItems: 'flex-start'
                                        },
                                        children: [
                                            _jsx(Typography, {
                                                variant: "h5",
                                                sx: { 
                                                    color: 'white',
                                                    fontWeight: 500,
                                                    mb: 0 // Removed space between heading and stats
                                                },
                                                children: route?.name || 'Untitled Route'
                                            }),
                                            // Single row of stats
                                            _jsx(Box, {
                                                sx: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 3,
                                                    flexWrap: 'wrap'
                                                },
                                                children: [
                                                    // Distance stat
                                                    _jsxs(Typography, {
                                                        variant: "body2",
                                                        color: "text.secondary",
                                                        sx: {
                                                            fontSize: '0.75rem',
                                                            fontFamily: 'Futura',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            color: 'white'
                                                        },
                                                        children: [
                                                            _jsx("i", { 
                                                                className: "fa-solid fa-route", 
                                                                style: { color: '#0288d1' } 
                                                            }),
                                                            route?.statistics?.totalDistance 
                                                                ? `${(route.statistics.totalDistance / 1000).toFixed(1)} km` 
                                                                : 'N/A'
                                                        ]
                                                    }),
                                                    
                                                    // Elevation Gained stat
                                                    _jsxs(Typography, {
                                                        variant: "body2",
                                                        color: "text.secondary",
                                                        sx: {
                                                            fontSize: '0.75rem',
                                                            fontFamily: 'Futura',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            color: 'white'
                                                        },
                                                        children: [
                                                            _jsx("i", { 
                                                                className: "fa-solid fa-up-right", 
                                                                style: { color: '#0288d1' } 
                                                            }),
                                                            route?.statistics?.elevationGain 
                                                                ? `${route.statistics.elevationGain.toFixed(0)} m` 
                                                                : 'N/A'
                                                        ]
                                                    }),
                                                    
                                                    // Elevation Lost stat
                                                    _jsxs(Typography, {
                                                        variant: "body2",
                                                        color: "text.secondary",
                                                        sx: {
                                                            fontSize: '0.75rem',
                                                            fontFamily: 'Futura',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            color: 'white'
                                                        },
                                                        children: [
                                                            _jsx("i", { 
                                                                className: "fa-solid fa-down-right", 
                                                                style: { color: '#0288d1' } 
                                                            }),
                                                            route?.statistics?.elevationLoss 
                                                                ? `${route.statistics.elevationLoss.toFixed(0)} m` 
                                                                : 'N/A'
                                                        ]
                                                    }),
                                                    
                                                    // Unpaved stat (if available)
                                                    route?.unpavedSections && _jsxs(Typography, {
                                                        variant: "body2",
                                                        color: "text.secondary",
                                                        sx: {
                                                            fontSize: '0.75rem',
                                                            fontFamily: 'Futura',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            color: 'white'
                                                        },
                                                        children: [
                                                            _jsx("i", { 
                                                                className: "fa-solid fa-person-biking-mountain", 
                                                                style: { color: '#0288d1' } 
                                                            }),
                                                            getUnpavedPercentage(route) + '%'
                                                        ]
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                )
                            }),
                            // Photos section (right side)
                            _jsx(Box, {
                                sx: {
                                    width: '40%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                },
                                children: _jsx(SliderContainer, {
                                    children: _jsx(ImageSliderWithLightbox, {
                                        photos: allPhotos,
                                        simplifiedMode: true,
                                        maxPhotos: 20
                                    })
                                })
                            })
                        ]
                    })
                ]
            })
        ]
    });
};
