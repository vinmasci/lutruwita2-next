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
    
    // Refs to store animation timeouts so we can cancel them
    const animationTimeoutsRef = useRef([]);
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

    // Function to start the flyby animation - improved implementation with reduced spinning
    const startFlyby = (route) => {
        if (!map || !route?.geojson?.features?.[0]?.geometry?.coordinates) {
            logger.error('Flyby', 'No map or route coordinates available');
            return;
        }
        
        // Clear any existing timeouts
        animationTimeoutsRef.current.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        animationTimeoutsRef.current = [];
        
        // Get route coordinates
        const allCoords = route.geojson.features[0].geometry.coordinates;
        
        // Calculate the actual route distance
        let totalRouteDistance = 0;
        for (let i = 1; i < allCoords.length; i++) {
            // Use the calculateBearing function we already have to get distance
            const dx = allCoords[i][0] - allCoords[i-1][0];
            const dy = allCoords[i][1] - allCoords[i-1][1];
            // This is a simplified distance calculation in degrees
            totalRouteDistance += Math.sqrt(dx * dx + dy * dy);
        }
        
        // Convert approximate degrees to kilometers (111.32 km per degree at the equator)
        const distanceInKm = totalRouteDistance * 111.32;
        
        // Sample more points for longer routes: 10 points per km with min/max limits
        const targetPoints = Math.min(300, Math.max(50, Math.ceil(distanceInKm * 10)));
        
        logger.info('Flyby', `Route length: ${distanceInKm.toFixed(2)}km, sampling ${targetPoints} points`);
        
        // Calculate sample rate based on route length
        const routeLength = allCoords.length;
        const sampleRate = Math.max(1, Math.floor(routeLength / targetPoints));
        
        // Sample coordinates evenly
        let sampledCoords = [];
        for (let i = 0; i < allCoords.length; i += sampleRate) {
            sampledCoords.push(allCoords[i]);
        }
        
        // Always include the last point
        if (sampledCoords[sampledCoords.length - 1] !== allCoords[allCoords.length - 1]) {
            sampledCoords.push(allCoords[allCoords.length - 1]);
        }
        
        logger.info('Flyby', 'Starting flyby with', sampledCoords.length, 'points');
        
        // Calculate the overall bearing from start to end
        const overallBearing = calculateBearing(
            sampledCoords[0], 
            sampledCoords[sampledCoords.length - 1]
        );
        
        // Calculate bounds for the intro and outro animations
        const bounds = new mapboxgl.LngLatBounds();
        allCoords.forEach(coord => {
            bounds.extend(coord);
        });
        
        // Store the bounds for later use when stopping
        routeBoundsRef.current = bounds;
        
        // Set initial camera position
        map.easeTo({
            center: sampledCoords[0],
            zoom: 15,
            pitch: 75, // High pitch to look ahead
            bearing: overallBearing, // Use the overall bearing for consistent direction
            duration: 1500,
            easing: (t) => {
                // Cubic easing for smoother acceleration
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            }
        });
        
        // Animate through points
        let currentIndex = 1;
        let prevBearing = overallBearing;
        
        const flyToNextPoint = () => {
            if (currentIndex >= sampledCoords.length) {
                logger.info('Flyby', 'Flyby complete');
                
                // Simply zoom out to show the entire route
                map.fitBounds(bounds, {
                    padding: 200,
                    pitch: 45, // Reduced pitch for overview
                    duration: 2500,
                    easing: (t) => {
                        // Ease out cubic - smooth deceleration
                        return 1 - Math.pow(1 - t, 3);
                    }
                });
                
                setIsFlyByActive(false); // Reset the button state when animation completes
                return;
            }
            
            const currentPoint = sampledCoords[currentIndex];
            
            // Look ahead for bearing calculation
            const lookAheadIndex = Math.min(currentIndex + 5, sampledCoords.length - 1);
            
            // Calculate bearing to look-ahead point
            let targetBearing;
            
            // If we're near the end, use the overall bearing to avoid spinning
            if (currentIndex > sampledCoords.length - 10) {
                targetBearing = overallBearing;
            } else {
                targetBearing = calculateBearing(currentPoint, sampledCoords[lookAheadIndex]);
            }
            
            // Smooth bearing changes with very heavy weighting to previous bearing
            // This creates much less spinning
            const bearingBlendFactor = 0.9; // Very high value = minimal turning
            const bearing = prevBearing * bearingBlendFactor + targetBearing * (1 - bearingBlendFactor);
            prevBearing = bearing; // Save for next iteration
            
            // Calculate distance to next point to adjust speed
            const nextPoint = sampledCoords[Math.min(currentIndex + 1, sampledCoords.length - 1)];
            const dx = nextPoint[0] - currentPoint[0];
            const dy = nextPoint[1] - currentPoint[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Adjust duration based on route length to maintain consistent speed
            // Increased base duration for slower animation to allow terrain to load
            const baseDuration = 800; // Doubled base duration for slower animation
            
            // Scale duration inversely with total route length
            // Longer routes = shorter durations between points, but still slower overall
            const scaleFactor = Math.min(1.0, 10 / Math.max(1, distanceInKm));
            const adjustedBaseDuration = baseDuration * scaleFactor;
            
            // Calculate final duration based on distance between points
            // Increased min/max durations for slower animation
            const duration = Math.max(400, Math.min(1200, adjustedBaseDuration * (distance * 5000)));
            
            // Dynamically adjust pitch based on elevation change
            // Get elevation data for current and next point (if available)
            const currentElevation = currentPoint.length > 2 ? currentPoint[2] : 0;
            const nextElevation = nextPoint.length > 2 ? nextPoint[2] : 0;
            
            // Calculate elevation change
            const elevationChange = nextElevation - currentElevation;
            
            // Adjust pitch based on elevation change:
            // - When going uphill (positive change): decrease pitch (more top-down view)
            // - When going downhill (negative change): increase pitch (more immersive view)
            // - Use a scale factor to control sensitivity
            const basePitch = 75; // Default pitch
            const minPitch = 30; // Minimum pitch (most top-down) - lowered for more dramatic effect
            const maxPitch = 80; // Maximum pitch (most immersive) - increased for more dramatic effect
            const pitchScaleFactor = 0.5; // Increased sensitivity to elevation changes (10x more sensitive)
            
            // Calculate pitch adjustment (positive elevationChange = lower pitch)
            const pitchAdjustment = -elevationChange * pitchScaleFactor;
            
            // Log elevation changes and pitch for debugging
            if (Math.abs(elevationChange) > 1) {
                logger.info('Flyby', `Elevation change: ${elevationChange.toFixed(2)}m, Pitch adjustment: ${pitchAdjustment.toFixed(2)}°`);
            }
            
            // Apply adjustment and clamp to min/max range
            const pitch = Math.max(minPitch, Math.min(maxPitch, basePitch + pitchAdjustment));
            
            // Move camera to next point with smooth parameters
            map.easeTo({
                center: currentPoint,
                bearing: bearing,
                pitch: pitch,
                duration: duration,
                easing: (t) => t, // Linear easing for more consistent speed
                essential: true
            });
            
            // Schedule next point with more overlap for smoother transitions
            // Increased delay between points to allow more time for terrain to load
            currentIndex++;
            const timeoutId = setTimeout(flyToNextPoint, duration * 0.85);
            animationTimeoutsRef.current.push(timeoutId); // Store timeout ID for cancellation
        };
        
        // Start animation after initial positioning
        const initialTimeoutId = setTimeout(flyToNextPoint, 1500);
        animationTimeoutsRef.current.push(initialTimeoutId); // Store timeout ID for cancellation
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
