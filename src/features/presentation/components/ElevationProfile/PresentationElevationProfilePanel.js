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

    // Function to start the flyby animation - using the existing implementation
    const startFlyby = (route) => {
        if (!map || !route?.geojson?.features?.[0]?.geometry?.coordinates) {
            console.error('[Flyby] No map or route coordinates available');
            return;
        }
        
        // Get route coordinates
        const allCoords = route.geojson.features[0].geometry.coordinates;
        
        // Sample every Nth point (to reduce number of animation steps)
        const sampleRate = Math.max(1, Math.floor(allCoords.length / 30)); // ~30 points total
        const sampledCoords = allCoords.filter((_, i) => i % sampleRate === 0);
        
        console.log('[Flyby] Starting flyby with', sampledCoords.length, 'points');
        
        // Set initial camera position
        map.easeTo({
            center: sampledCoords[0],
            zoom: 14, // Original zoom level
            pitch: 45, // Tilted view
            bearing: 0,
            duration: 1000
        });
        
        // Animate through points
        let currentIndex = 1;
        
        const flyToNextPoint = () => {
            if (currentIndex >= sampledCoords.length) {
                console.log('[Flyby] Flyby complete');
                setIsFlyByActive(false); // Reset the button state when animation completes
                return;
            }
            
            // Calculate bearing to face direction of travel
            const currentPoint = sampledCoords[currentIndex];
            const nextPoint = sampledCoords[Math.min(currentIndex + 1, sampledCoords.length - 1)];
            const bearing = calculateBearing(currentPoint, nextPoint);
            
            console.log('[Flyby] Moving to point', currentIndex, 'of', sampledCoords.length);
            
            // Move camera to next point
            map.easeTo({
                center: currentPoint,
                bearing: bearing,
                pitch: 60,
                duration: 1000,
                easing: (t) => t, // Linear easing
                essential: true
            });
            
            // Schedule next point
            currentIndex++;
            setTimeout(flyToNextPoint, 1200); // Slightly longer than animation to avoid jerky movement
        };
        
        // Start animation after initial positioning
        setTimeout(flyToNextPoint, 1200);
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
