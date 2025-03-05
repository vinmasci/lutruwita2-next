import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { PresentationElevationProfile } from './PresentationElevationProfile';
import { styled } from '@mui/material/styles';
import { Box, ButtonBase } from '@mui/material';
import { IconButton } from '@mui/material';
import { useMapContext } from '../../../map/context/MapContext';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow'; // Added Play icon for fly-by
import { PresentationRouteDescriptionPanel } from '../RouteDescription';
import { PresentationWeatherProfilePanel } from '../WeatherProfile';

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

export const PresentationElevationProfilePanel = ({ route, header }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('elevation'); // 'elevation' | 'description' | 'weather'
    const [isMaximized, setIsMaximized] = useState(false);
    const [isFlyByActive, setIsFlyByActive] = useState(false); // Added state for fly-by functionality
    const { map } = useMapContext();
    
    // Default height is 300px, maximized height is 600px
    const panelHeight = isMaximized ? 600 : 300;

    // Function to start the flyby animation - improved TDF-style implementation
    const startFlyby = (route) => {
        if (!map || !route?.geojson?.features?.[0]?.geometry?.coordinates) {
            console.error('[Flyby] No map or route coordinates available');
            return;
        }
        
        // Get route coordinates
        const allCoords = route.geojson.features[0].geometry.coordinates;
        
        // Adaptive sampling based on route complexity and length
        // For longer routes, we sample more aggressively
        // Increased sampling density for smoother animation
        const routeLength = allCoords.length;
        const targetPoints = Math.min(150, Math.max(60, Math.floor(routeLength / 15))); // More points for smoother animation
        const sampleRate = Math.max(1, Math.floor(routeLength / targetPoints));
        
        // Sample coordinates but ensure we keep points where direction changes significantly
        let sampledCoords = [];
        let lastDirection = null;
        
        for (let i = 0; i < allCoords.length; i++) {
            // Always include first and last points
            if (i === 0 || i === allCoords.length - 1) {
                sampledCoords.push(allCoords[i]);
                continue;
            }
            
            // Regular sampling
            if (i % sampleRate === 0) {
                // Check if this is a significant direction change
                if (i > 0 && i < allCoords.length - 1) {
                    const prevPoint = allCoords[i-1];
                    const currentPoint = allCoords[i];
                    const nextPoint = allCoords[i+1];
                    
                    const prevBearing = calculateBearing(prevPoint, currentPoint);
                    const nextBearing = calculateBearing(currentPoint, nextPoint);
                    
                    // If direction changes significantly, include this point
                    const bearingDiff = Math.abs(prevBearing - nextBearing);
                    const normalizedDiff = bearingDiff > 180 ? 360 - bearingDiff : bearingDiff;
                    
                    if (normalizedDiff > 20) { // Significant turn
                        sampledCoords.push(allCoords[i]);
                    } else if (i % sampleRate === 0) {
                        sampledCoords.push(allCoords[i]);
                    }
                } else {
                    sampledCoords.push(allCoords[i]);
                }
            }
        }
        
        // Ensure we have enough points for a smooth animation
        if (sampledCoords.length < 40) { // Increased minimum points for smoother animation
            const newSampleRate = Math.floor(routeLength / 40);
            sampledCoords = allCoords.filter((_, i) => i % newSampleRate === 0 || i === 0 || i === allCoords.length - 1);
        }
        
        console.log('[Flyby] Starting TDF-style flyby with', sampledCoords.length, 'points');
        
        // Calculate look-ahead points for smoother camera movement
        // Looking much further ahead with stronger weighting for smoother turns
        const lookAheadPoints = sampledCoords.map((coord, i) => {
            if (i >= sampledCoords.length - 1) return coord;
            
            // Look ahead 3-4 points if possible for a more forward-facing view
            const lookAheadIndex = Math.min(i + 4, sampledCoords.length - 1);
            const lookAheadPoint = sampledCoords[lookAheadIndex];
            
            // Weight look-ahead position more heavily (40% instead of 30%)
            // This creates a more forward-facing camera that anticipates turns
            return [
                coord[0] * 0.6 + lookAheadPoint[0] * 0.4,
                coord[1] * 0.6 + lookAheadPoint[1] * 0.4
            ];
        });
        
        // Set initial camera position with a more dramatic entry
        // and more forward-looking perspective
        map.easeTo({
            center: sampledCoords[0],
            zoom: 15, // Slightly closer zoom for more detail
            pitch: 80, // Even more dramatic tilt to look further into the distance
            bearing: calculateBearing(
                sampledCoords[0], 
                sampledCoords[Math.min(3, sampledCoords.length - 1)] // Look further ahead for initial bearing
            ),
            duration: 1500,
            easing: (t) => {
                // Cubic easing for smoother acceleration
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            }
        });
        
        // Animate through points
        let currentIndex = 1;
        
        const flyToNextPoint = () => {
            if (currentIndex >= sampledCoords.length) {
                console.log('[Flyby] Flyby complete');
                
                // Calculate the bounds of the entire route
                const bounds = new mapboxgl.LngLatBounds();
                allCoords.forEach(coord => {
                    bounds.extend(coord);
                });
                
                // Calculate the center of the route
                const center = bounds.getCenter();
                
                // Calculate a bearing that looks back at the route
                // If we're at the end, look back toward the start
                const endPoint = sampledCoords[sampledCoords.length - 1];
                const startPoint = sampledCoords[0];
                const midPoint = sampledCoords[Math.floor(sampledCoords.length / 2)];
                
                // Calculate bearing from end to start (reversed to look back)
                const bearingToStart = (calculateBearing(endPoint, startPoint) + 180) % 360;
                
                // First transition: Turn around to look back at the route
                map.easeTo({
                    center: endPoint,
                    bearing: bearingToStart,
                    pitch: 60,
                    duration: 1500,
                    easing: (t) => {
                        // Ease in-out cubic for smooth turn
                        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    },
                    // When this transition completes, zoom out to show the entire route
                    callback: () => {
                        // Second transition: Zoom out more to show the entire route with more context
                        map.fitBounds(bounds, {
                            padding: 250, // Increased padding for more zoom out (100 → 250)
                            pitch: 35, // Lower pitch for more overhead view (45 → 35)
                            duration: 3000, // Longer duration for more dramatic effect (2500 → 3000)
                            easing: (t) => {
                                // Ease out cubic - smooth deceleration
                                return 1 - Math.pow(1 - t, 3);
                            }
                        });
                    }
                });
                
                setIsFlyByActive(false); // Reset the button state when animation completes
                return;
            }
            
            // Calculate bearing with a smoother, more forward-facing approach
            const currentPoint = sampledCoords[currentIndex];
            
            // Look ahead multiple points for bearing calculation
            const lookAheadBearingIndex = Math.min(currentIndex + 3, sampledCoords.length - 1);
            const bearingTargetPoint = sampledCoords[lookAheadBearingIndex];
            
            // Calculate the direct bearing to the look-ahead point
            const directBearing = calculateBearing(currentPoint, bearingTargetPoint);
            
            // If we have a previous bearing, smooth the transition
            const prevBearing = currentIndex > 1 ? map.getBearing() : directBearing;
            
            // Smooth bearing changes by blending previous and new bearings
            // This creates less sharp turns and a more forward-facing camera
            const bearingBlendFactor = 0.7; // Higher value = smoother turns, less responsive
            const bearing = prevBearing * bearingBlendFactor + directBearing * (1 - bearingBlendFactor);
            
            // Calculate distance to next point to adjust speed
            const nextPoint = sampledCoords[Math.min(currentIndex + 1, sampledCoords.length - 1)];
            const dx = nextPoint[0] - currentPoint[0];
            const dy = nextPoint[1] - currentPoint[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Adjust duration based on distance (faster for longer segments)
            // This creates a more consistent apparent speed
            // Reduced durations for more continuous movement
            const baseDuration = 600; // Reduced from 800ms to 600ms for faster transitions
            const duration = Math.max(400, Math.min(800, baseDuration * (distance * 5000))); // Reduced min/max durations
            
            // Dynamic pitch based on position in route
            // Higher pitch throughout for a more "looking into the distance" effect
            const routeProgress = currentIndex / sampledCoords.length;
            const pitch = 75 + Math.sin(routeProgress * Math.PI) * -5; // Higher base pitch (75 vs 60)
            
            // Use the look-ahead point for smoother camera movement
            const cameraTarget = lookAheadPoints[currentIndex];
            
            // Move camera to next point with dynamic parameters
            map.easeTo({
                center: cameraTarget,
                bearing: bearing,
                pitch: pitch,
                duration: duration,
                easing: (t) => {
                    // Smoother easing function (ease in-out quad)
                    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                },
                essential: true
            });
            
            // Schedule next point with more overlap for smoother transitions
            currentIndex++;
            setTimeout(flyToNextPoint, duration * 0.7); // Increased overlap (0.9 → 0.7) for more continuous movement
        };
        
        // Start animation after initial positioning
        setTimeout(flyToNextPoint, 1500);
    };

    // Function to handle fly-by button click
    const handleFlyByClick = () => {
        const newState = !isFlyByActive;
        setIsFlyByActive(newState);
        
        if (newState) {
            // Start the flyby animation
            startFlyby(route);
        } else {
            // If we want to cancel an in-progress flyby, we could add that logic here
            console.log('[Flyby] Flyby cancelled by user');
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
                    right: '150px', // Increased to make room for the new fly-by button
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
                    // Fly-by button (blue play button)
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
                        children: _jsx(PlayArrowIcon, { 
                            fontSize: "medium",
                            sx: { 
                                transform: isFlyByActive ? 'scale(1.2)' : 'none' // Scale up icon when active
                            }
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
                    ? route && _jsx(PresentationElevationProfile, { route: route })
                    : activeTab === 'description'
                    ? route && _jsx(PresentationRouteDescriptionPanel, { route: route })
                    : route && _jsx(PresentationWeatherProfilePanel, { route: route })
            })
        ] 
    });
};
