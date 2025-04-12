import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { PresentationElevationProfile } from './PresentationElevationProfile';
import { styled } from '@mui/material/styles';
import { Box, ButtonBase } from '@mui/material';
import { IconButton } from '@mui/material';
import { useMapContext } from '../../../map/context/MapContext';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow'; // Play icon for fly-by
import StopIcon from '@mui/icons-material/Stop'; // Stop icon for fly-by
import DownloadIcon from '@mui/icons-material/Download'; // Download icon for GPX export
import { downloadRouteAsGpx } from '../../../../utils/gpx/export'; // Import GPX export utility
import { PresentationRouteDescriptionPanel } from '../RouteDescription';
import { PresentationWeatherProfilePanel } from '../WeatherProfile';
import mapboxgl from 'mapbox-gl'; // Import mapboxgl
import logger from '../../../../utils/logger';

const ElevationPanel = styled(Box)(({ theme }) => ({
    position: 'fixed',
    bottom: 0,
    left: '56px', // Width of the sidebar
    right: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    transition: theme.transitions.create('transform', {
        duration: theme.transitions.duration.standard,
        easing: theme.transitions.easing.easeInOut,
    }),
    zIndex: 102,
    height: 300,
    '&.collapsed': {
        transform: 'translateY(300px)'
    }
}));

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

const TabButton = ({ tab, label, activeTab, onClick, isCollapsed, setIsCollapsed }) => _jsx(ButtonBase, {
    onClick: () => {
        if (isCollapsed) {
            setIsCollapsed(false);
        }
        onClick();
    },
    sx: {
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        color: 'white',
        padding: '8px 16px', // Increased padding for bigger tabs
        fontSize: '16px', // Increased font size for better readability
        fontWeight: activeTab === tab ? 'bold' : 'normal', // Bold text for active tab
        borderRadius: '4px 4px 0 0',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: activeTab === tab ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        marginRight: '8px', // Increased margin for better spacing
        '&:hover': {
            backgroundColor: 'rgba(45, 45, 45, 0.9)'
        }
    },
    children: label
});

export const PresentationElevationProfilePanel = ({ route, header, isFlyByActive: externalIsFlyByActive, handleFlyByClick: externalHandleFlyByClick }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('elevation'); // 'elevation' | 'description' | 'weather' (mapOverview removed)
    const [isMaximized, setIsMaximized] = useState(false);
    const [internalIsFlyByActive, setInternalIsFlyByActive] = useState(false); // Internal state for fly-by functionality
    const { map } = useMapContext();
    
    // Refs to store animation timeouts and animation frame so we can cancel them
    const animationTimeoutsRef = useRef([]);
    const animationFrameRef = useRef(null);
    const routeBoundsRef = useRef(null);
    
    // Use external state and handler if provided, otherwise use internal ones
    const isFlyByActive = externalIsFlyByActive !== undefined ? externalIsFlyByActive : internalIsFlyByActive;
    const setIsFlyByActive = externalIsFlyByActive !== undefined ? () => {} : setInternalIsFlyByActive;
    
    // Default height is 300px, maximized height is 600px
    const panelHeight = isMaximized ? 600 : 300;

    // Function to stop the flyby animation
    const stopFlyby = () => {
        // Clear all pending animation timeouts
        animationTimeoutsRef.current.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        animationTimeoutsRef.current = [];
        
        // Also clear any requestAnimationFrame
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        
        logger.info('Flyby', 'Flyby stopped by user');
        
        // If we have stored route bounds, fit to them
        if (routeBoundsRef.current && map) {
            map.fitBounds(routeBoundsRef.current, {
                padding: 200,
                pitch: 75, // High pitch to look ahead
                duration: 1000,
                easing: (t) => {
                    // Ease out cubic - smooth deceleration
                    return 1 - Math.pow(1 - t, 3);
                }
            });
        }
        
        // Reset the active state
        setIsFlyByActive(false);
    };

    // Function to start the flyby animation - Ultra-smooth Tour de France style implementation
    const startFlyby = (route) => {
        if (!map || !route?.geojson?.features?.[0]?.geometry?.coordinates) {
            logger.error('Flyby', 'No map or route coordinates available');
            return;
        }
        
        // Import turf functions dynamically to ensure they're available
        const turf = window.turf || {};
        if (!turf.along || !turf.lineString || !turf.length) {
            logger.info('Flyby', 'Turf.js functions not available. Using fallback animation.');
            // If turf isn't available, we'll continue with our enhanced version using manual calculations
        }
        
        // Clear any existing timeouts and animation frames
        animationTimeoutsRef.current.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        animationTimeoutsRef.current = [];
        
        // Also clear any requestAnimationFrame
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        
        // Get route coordinates
        const allCoords = route.geojson.features[0].geometry.coordinates;
        
        // Calculate bounds for the intro and outro animations
        const bounds = new mapboxgl.LngLatBounds();
        allCoords.forEach(coord => {
            bounds.extend(coord);
        });
        
        // Store the bounds for later use when stopping
        routeBoundsRef.current = bounds;
        
        // Create a GeoJSON LineString from the route coordinates
        const routeLine = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: allCoords
            }
        };
        
        // Calculate the total route length in kilometers
        let routeLength;
        if (turf.length) {
            routeLength = turf.length(routeLine, { units: 'kilometers' });
        } else {
            // Manual calculation if turf isn't available
            let totalDistance = 0;
            for (let i = 1; i < allCoords.length; i++) {
                const dx = allCoords[i][0] - allCoords[i-1][0];
                const dy = allCoords[i][1] - allCoords[i-1][1];
                // Convert approximate degrees to kilometers (111.32 km per degree at the equator)
                totalDistance += Math.sqrt(dx * dx + dy * dy) * 111.32;
            }
            routeLength = totalDistance;
        }
        
        logger.info('Flyby', `Route length: ${routeLength.toFixed(2)}km`);
        
        // Calculate the overall bearing from start to end for initial orientation
        const overallBearing = calculateBearing(
            allCoords[0], 
            allCoords[allCoords.length - 1]
        );
        
        // Use extremely few points to eliminate shakiness - massive spacing between points
        // We'll aim for points every 500-1000 meters depending on route length
        const pointSpacing = Math.max(0.5, Math.min(1.0, routeLength / 20)); // in kilometers
        const numPoints = Math.ceil(routeLength / pointSpacing);
        
        logger.info('Flyby', `Creating ${numPoints} interpolated points for smooth animation`);
        
        // Generate evenly spaced points along the route
        let smoothedPoints = [];
        
        if (turf.along) {
            // Use turf.js for precise point interpolation if available
            for (let i = 0; i <= numPoints; i++) {
                const distance = (i / numPoints) * routeLength;
                const point = turf.along(routeLine, distance, { units: 'kilometers' });
                
                // Extract coordinates and add elevation if available
                const baseCoord = point.geometry.coordinates;
                
                // Find the closest original point to get elevation data
                let closestOrigIndex = 0;
                let minDist = Infinity;
                
                for (let j = 0; j < allCoords.length; j++) {
                    const dx = baseCoord[0] - allCoords[j][0];
                    const dy = baseCoord[1] - allCoords[j][1];
                    const dist = dx * dx + dy * dy;
                    
                    if (dist < minDist) {
                        minDist = dist;
                        closestOrigIndex = j;
                    }
                }
                
                // Get elevation from closest original point if available
                const elevation = allCoords[closestOrigIndex].length > 2 ? 
                    allCoords[closestOrigIndex][2] : 0;
                
                // Add elevation to the interpolated point
                const coordWithElevation = [...baseCoord];
                if (elevation !== undefined) {
                    coordWithElevation[2] = elevation;
                }
                
                smoothedPoints.push(coordWithElevation);
            }
        } else {
            // Manual linear interpolation if turf isn't available
            // This is less precise but still works
            let currentDistance = 0;
            let targetDistance = 0;
            
            // Always include the first point
            smoothedPoints.push(allCoords[0]);
            
            for (let i = 1; i < allCoords.length; i++) {
                const prevPoint = allCoords[i-1];
                const currentPoint = allCoords[i];
                
                // Calculate segment distance
                const dx = currentPoint[0] - prevPoint[0];
                const dy = currentPoint[1] - prevPoint[1];
                const segmentDistance = Math.sqrt(dx * dx + dy * dy) * 111.32; // km
                
                // Add points along this segment
                while (currentDistance + segmentDistance > targetDistance) {
                    // How far along this segment should the point be?
                    const ratio = (targetDistance - currentDistance) / segmentDistance;
                    
                    // Interpolate position
                    const lon = prevPoint[0] + ratio * dx;
                    const lat = prevPoint[1] + ratio * dy;
                    
                    // Interpolate elevation if available
                    let elevation;
                    if (prevPoint.length > 2 && currentPoint.length > 2) {
                        elevation = prevPoint[2] + ratio * (currentPoint[2] - prevPoint[2]);
                    }
                    
                    // Create the interpolated point
                    const interpolatedPoint = [lon, lat];
                    if (elevation !== undefined) {
                        interpolatedPoint[2] = elevation;
                    }
                    
                    smoothedPoints.push(interpolatedPoint);
                    targetDistance += pointSpacing;
                    
                    // Break if we've gone beyond this segment
                    if (targetDistance > currentDistance + segmentDistance) {
                        break;
                    }
                }
                
                currentDistance += segmentDistance;
            }
            
            // Always include the last point
            if (smoothedPoints[smoothedPoints.length - 1] !== allCoords[allCoords.length - 1]) {
                smoothedPoints.push(allCoords[allCoords.length - 1]);
            }
        }
        
        logger.info('Flyby', `Generated ${smoothedPoints.length} smooth points for animation`);
        
        // Pre-calculate camera parameters for each point to ensure smooth transitions
        const cameraParams = smoothedPoints.map((point, index) => {
            // Calculate bearing by looking ahead
            const lookAheadIndex = Math.min(index + 10, smoothedPoints.length - 1);
            let bearing;
            
            if (index >= smoothedPoints.length - 20) {
                // Near the end, use overall bearing to avoid spinning
                bearing = overallBearing;
            } else {
                bearing = calculateBearing(point, smoothedPoints[lookAheadIndex]);
            }
            
            // Use a fixed pitch value to eliminate vertical movement
            const pitch = 60; // Fixed pitch for all points
            
            // Calculate zoom level - slightly closer for climbs, wider for descents
            let zoom = 14;
            
            if (index > 0 && index < smoothedPoints.length - 1) {
                const prevPoint = smoothedPoints[index - 1];
                const nextPoint = smoothedPoints[index + 1];
                
                if (point.length > 2 && prevPoint.length > 2 && nextPoint.length > 2) {
                    const prevElevation = prevPoint[2] || 0;
                    const currentElevation = point[2] || 0;
                    const nextElevation = nextPoint[2] || 0;
                    
                    // Calculate average gradient
                    const elevationChange = (nextElevation - prevElevation);
                    
                    // Adjust zoom based on gradient
                    if (elevationChange > 5) {
                        // Climbing - zoom in slightly
                        zoom = 14.5;
                    } else if (elevationChange < -5) {
                        // Descending - zoom out slightly
                        zoom = 13.5;
                    }
                }
            }
            
            return {
                center: point,
                bearing,
                pitch,
                zoom
            };
        });
        
        // Extreme smoothing for camera parameters to create ultra-smooth movements
        // Apply a moving average filter to bearings with a massive window
        const smoothingWindow = 50; // Increased from 30 to 50 for ultra-smooth turns
        
        // First pass: Apply a large moving average window to bearings
        for (let i = 0; i < cameraParams.length; i++) {
            // Smooth bearing with a moving average
            let bearingSum = 0;
            let count = 0;
            
            for (let j = Math.max(0, i - smoothingWindow); j <= Math.min(cameraParams.length - 1, i + smoothingWindow); j++) {
                // Handle bearing wraparound (0-360)
                let bearingDiff = cameraParams[j].bearing - cameraParams[i].bearing;
                if (bearingDiff > 180) bearingDiff -= 360;
                if (bearingDiff < -180) bearingDiff += 360;
                
                bearingSum += cameraParams[i].bearing + bearingDiff;
                count++;
            }
            
            // Update with smoothed bearing
            if (count > 0) {
                cameraParams[i].bearing = (bearingSum / count) % 360;
                if (cameraParams[i].bearing < 0) cameraParams[i].bearing += 360;
            }
        }
        
        // Second pass: Apply extreme exponential smoothing to virtually eliminate side-to-side movement
        let prevBearing = cameraParams[0].bearing;
        for (let i = 1; i < cameraParams.length; i++) {
            // Use an extremely heavy weighting to previous bearing to minimize turning
            const bearingBlendFactor = 0.995; // Increased to 0.995 (99.5%) for almost no turning
            
            // Handle bearing wraparound for smooth blending
            let bearingDiff = cameraParams[i].bearing - prevBearing;
            if (bearingDiff > 180) bearingDiff -= 360;
            if (bearingDiff < -180) bearingDiff += 360;
            
            // Apply the blend
            const smoothedBearing = (prevBearing + bearingDiff * (1 - bearingBlendFactor)) % 360;
            cameraParams[i].bearing = smoothedBearing < 0 ? smoothedBearing + 360 : smoothedBearing;
            prevBearing = cameraParams[i].bearing;
            
            // Only smooth zoom, pitch is now fixed
            const alpha = 0.01; // Further reduced for even smoother transitions
            cameraParams[i].zoom = alpha * cameraParams[i].zoom + (1 - alpha) * cameraParams[i-1].zoom;
        }
        
        // Third pass: Apply another round of smoothing for extremely gradual turns
        // This creates an almost cinematic effect with virtually no rotation
        prevBearing = cameraParams[0].bearing;
        for (let i = 1; i < cameraParams.length; i++) {
            // Use an even higher blend factor for the third pass
            const bearingBlendFactor = 0.998; // Increased to 0.998 (99.8%) for virtually no turning
            
            // Handle bearing wraparound for smooth blending
            let bearingDiff = cameraParams[i].bearing - prevBearing;
            if (bearingDiff > 180) bearingDiff -= 360;
            if (bearingDiff < -180) bearingDiff += 360;
            
            // Apply the blend
            const smoothedBearing = (prevBearing + bearingDiff * (1 - bearingBlendFactor)) % 360;
            cameraParams[i].bearing = smoothedBearing < 0 ? smoothedBearing + 360 : smoothedBearing;
            prevBearing = cameraParams[i].bearing;
        }
        
        // Set up animation state
        const animationState = {
            startTime: null,
            // Use a consistent speed per kilometer (500ms per km) - extremely fast
            // This ensures the perceived speed is the same for all routes
            duration: routeLength * 500, 
            cameraParams,
            smoothedPoints
        };
        
        // Store animation state in a ref for access in animation loop
        const animationStateRef = { current: animationState };
        
        // Set initial camera position
        map.easeTo({
            center: smoothedPoints[0],
            zoom: cameraParams[0].zoom,
            pitch: cameraParams[0].pitch,
            bearing: cameraParams[0].bearing,
            duration: 1500,
            easing: (t) => {
                // Cubic easing for smoother acceleration
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            }
        });
        
        // Wait for initial positioning to complete
        const initialTimeoutId = setTimeout(() => {
            // Start the animation loop
            const animate = (timestamp) => {
                // Initialize start time on first frame
                if (!animationStateRef.current.startTime) {
                    animationStateRef.current.startTime = timestamp;
                }
                
                // Calculate progress (0 to 1)
                const elapsed = timestamp - animationStateRef.current.startTime;
                const progress = Math.min(1, elapsed / animationStateRef.current.duration);
                
                // Calculate the exact position along the path
                const exactIndex = progress * (smoothedPoints.length - 1);
                
                // If we've reached the end, finish the animation
                if (progress >= 1) {
                    logger.info('Flyby', 'Flyby complete');
                    
                    // Zoom out to show the entire route
                    map.fitBounds(bounds, {
                        padding: 200,
                        pitch: 45,
                        duration: 2500,
                        easing: (t) => {
                            // Ease out cubic - smooth deceleration
                            return 1 - Math.pow(1 - t, 3);
                        }
                    });
                    
                    setIsFlyByActive(false);
                    return;
                }
                
                // Interpolate between the two nearest points
                const lowerIndex = Math.floor(exactIndex);
                const upperIndex = Math.min(smoothedPoints.length - 1, lowerIndex + 1);
                const fraction = exactIndex - lowerIndex;
                
                // Get the camera parameters for the two points
                const lowerParams = cameraParams[lowerIndex];
                const upperParams = cameraParams[upperIndex];
                
                // Interpolate camera parameters
                const interpolatedParams = {
                    center: [
                        lowerParams.center[0] + fraction * (upperParams.center[0] - lowerParams.center[0]),
                        lowerParams.center[1] + fraction * (upperParams.center[1] - lowerParams.center[1])
                    ],
                    zoom: lowerParams.zoom + fraction * (upperParams.zoom - lowerParams.zoom),
                    pitch: lowerParams.pitch + fraction * (upperParams.pitch - lowerParams.pitch)
                };
                
                // Handle bearing interpolation specially to avoid spinning
                let bearingDiff = upperParams.bearing - lowerParams.bearing;
                // Adjust for bearing wraparound
                if (bearingDiff > 180) bearingDiff -= 360;
                if (bearingDiff < -180) bearingDiff += 360;
                
                interpolatedParams.bearing = (lowerParams.bearing + fraction * bearingDiff) % 360;
                if (interpolatedParams.bearing < 0) interpolatedParams.bearing += 360;
                
                // Use easeTo with a much longer duration for ultra-smooth transitions between frames
                map.easeTo({
                    center: interpolatedParams.center,
                    zoom: interpolatedParams.zoom,
                    pitch: interpolatedParams.pitch,
                    bearing: interpolatedParams.bearing,
                    duration: 200, // Much longer duration for ultra-smooth transitions
                    easing: t => t // Linear easing for consistent motion
                });
                
                // Camera shake removed completely as requested
                
                // Continue animation
                animationFrameRef.current = requestAnimationFrame(animate);
            };
            
            // Start the animation loop
            animationFrameRef.current = requestAnimationFrame(animate);
            
        }, 1500);
        
        // Store timeout ID for cancellation
        animationTimeoutsRef.current.push(initialTimeoutId);
    };

    // Function to handle fly-by button click
    const handleFlyByClick = () => {
        if (externalHandleFlyByClick) {
            // Use external handler if provided
            externalHandleFlyByClick();
        } else {
            // Otherwise use internal handler
            const newState = !internalIsFlyByActive;
            setInternalIsFlyByActive(newState);
            
            if (newState) {
                // Start the flyby animation
                startFlyby(route);
            } else {
                // Stop the flyby animation
                stopFlyby();
            }
        }
    };

    return _jsxs(ElevationPanel, { 
        className: isCollapsed ? 'collapsed' : '',
        sx: { 
            height: panelHeight,
            '&.collapsed': {
                transform: `translateY(${panelHeight}px)`
            }
        },
        children: [
            // Tab buttons - no background container
            _jsxs("div", { 
                style: {
                    position: 'absolute',
                    top: '-32px', // Adjusted to accommodate larger buttons
                    right: '200px', // Increased to make room for the new buttons
                    display: 'flex',
                    alignItems: 'flex-end',
                    zIndex: 103
                    // No background or border styling
                }, 
                children: [
                    _jsx(TabButton, {
                        tab: 'elevation',
                        label: 'Elevation',
                        activeTab: activeTab,
                        onClick: () => setActiveTab('elevation'),
                        isCollapsed: isCollapsed,
                        setIsCollapsed: setIsCollapsed
                    }),
                    _jsx(TabButton, {
                        tab: 'description',
                        label: 'Description',
                        activeTab: activeTab,
                        onClick: () => setActiveTab('description'),
                        isCollapsed: isCollapsed,
                        setIsCollapsed: setIsCollapsed
                    }),
                    _jsx(TabButton, {
                        tab: 'weather',
                        label: 'Weather',
                        activeTab: activeTab,
                        onClick: () => setActiveTab('weather'),
                        isCollapsed: isCollapsed,
                        setIsCollapsed: setIsCollapsed
                    })
                ]
            }),
            // Control buttons (maximize/minimize) as separate circular buttons
            _jsxs("div", { 
                style: {
                    position: 'absolute',
                    top: '-32px', // Adjusted to accommodate larger buttons
                    right: '16px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '10px', // Space between buttons
                    zIndex: 103
                }, 
                children: [
                    // Fly-by button (blue play/stop button)
                    _jsx(IconButton, { 
                        onClick: handleFlyByClick,
                        // Change appearance based on active state
                        sx: {
                            color: 'white',
                            backgroundColor: isFlyByActive ? '#1565c0' : '#2196f3', // Darker blue when active
                            border: '1px solid rgba(255, 255, 255, 0.8)', // Thin white stroke
                            borderRadius: '50%', // Make it circular
                            padding: '8px', // Larger button
                            width: '36px', // Fixed width
                            height: '36px', // Fixed height
                            boxShadow: isFlyByActive ? '0 0 8px #2196f3' : 'none', // Add glow effect when active
                            '&:hover': {
                                backgroundColor: isFlyByActive ? '#0d47a1' : '#1976d2' // Darker blue on hover
                            }
                        }, 
                        children: isFlyByActive 
                            ? _jsx(StopIcon, { fontSize: "medium" }) // Show stop icon when active
                            : _jsx(PlayArrowIcon, { fontSize: "medium" }) // Show play icon when inactive
                    }),
                    // Download GPX button (black background)
                    _jsx(IconButton, { 
                        onClick: () => downloadRouteAsGpx(route),
                        sx: {
                            color: 'white',
                            backgroundColor: 'rgba(26, 26, 26, 0.9)', // Black background to match other buttons
                            border: '1px solid rgba(255, 255, 255, 0.8)', // Thin white stroke
                            borderRadius: '50%', // Make it circular
                            padding: '8px', // Larger button
                            width: '36px', // Fixed width
                            height: '36px', // Fixed height
                            '&:hover': {
                                backgroundColor: 'rgba(45, 45, 45, 0.9)' // Darker on hover
                            }
                        }, 
                        children: _jsx(DownloadIcon, { 
                            fontSize: "medium"
                        })
                    }),
                    _jsx(IconButton, { 
                        onClick: () => setIsMaximized(!isMaximized), 
                        disabled: isCollapsed,
                        sx: {
                            color: 'white',
                            backgroundColor: 'rgba(26, 26, 26, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.8)', // Thin white stroke
                            borderRadius: '50%', // Make it circular
                            padding: '8px', // Larger button
                            width: '36px', // Fixed width
                            height: '36px', // Fixed height
                            opacity: isCollapsed ? 0.5 : 1,
                            '&:hover': {
                                backgroundColor: isCollapsed ? 'rgba(26, 26, 26, 0.9)' : 'rgba(45, 45, 45, 0.9)'
                            }
                        }, 
                        children: isMaximized ? _jsx(FullscreenExitIcon, { fontSize: "medium" }) : _jsx(FullscreenIcon, { fontSize: "medium" }) 
                    }),
                    _jsx(IconButton, { 
                        onClick: () => setIsCollapsed(!isCollapsed), 
                        sx: {
                            color: 'white',
                            backgroundColor: 'rgba(26, 26, 26, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.8)', // Thin white stroke
                            borderRadius: '50%', // Make it circular
                            padding: '8px', // Larger button
                            width: '36px', // Fixed width
                            height: '36px', // Fixed height
                            '&:hover': {
                                backgroundColor: 'rgba(45, 45, 45, 0.9)'
                            }
                        }, 
                        children: isCollapsed ? _jsx(KeyboardArrowUpIcon, { fontSize: "medium" }) : _jsx(KeyboardArrowDownIcon, { fontSize: "medium" }) 
                    })
                ] 
            }),
            header,
            _jsx(Box, {
                sx: {
                    height: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    '& > *': {
                        flex: 1,
                        minHeight: 0
                    }
                },
                children: activeTab === 'elevation' 
                    ? route && _jsx(PresentationElevationProfile, { route: route, key: "elevation" })
                    : activeTab === 'description'
                    ? route && _jsx(PresentationRouteDescriptionPanel, { route: route, key: "description" })
                    : activeTab === 'weather'
                    ? route && _jsx(PresentationWeatherProfilePanel, { route: route, key: "weather" })
                    : null
            })
        ] 
    });
};
