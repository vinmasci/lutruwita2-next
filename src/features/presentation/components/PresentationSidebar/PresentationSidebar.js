import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, Suspense, useEffect, lazy } from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Typography, IconButton, CircularProgress, Tooltip, Divider } from '@mui/material';
import { useRouteContext } from '../../../map/context/RouteContext';
import { useMapContext } from '../../../map/context/MapContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { getMapOverviewData } from '../../../presentation/store/mapOverviewStore';
import { useRouteState } from '../../../map/hooks/useRouteState';
import { deserializePhoto } from '../../../photo/utils/photoUtils';
import { ErrorBoundary } from '../../../../components/ErrorBoundary';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import { ListOrdered, Camera, CameraOff, AlertTriangle, Tent, Coffee, Mountain, Building, Bus, MapPinCheck, FlagTriangleRight, Ruler, Settings2, Eye, EyeOff, PowerOff, CirclePower, Map, FileText, ChevronLeft } from 'lucide-react';
import { StyledDrawer, NestedDrawer } from './PresentationSidebar.styles';

// Lazy-load the Map Overview drawer component
const LazyMapOverviewDrawer = lazy(() => import('../MapOverview/PresentationMapOverviewDrawer'));

export const PresentationSidebar = ({ isOpen, isDistanceMarkersVisible, toggleDistanceMarkersVisibility, isClimbFlagsVisible, toggleClimbFlagsVisibility, isLineMarkersVisible, toggleLineMarkersVisibility }) => {
    const { routes, currentRoute, setCurrentRoute } = useRouteContext();
    const { map } = useMapContext();
    const { loadPOIsFromRoute, visibleCategories, toggleCategoryVisibility } = usePOIContext();
    const { addPhoto, isPhotosVisible, togglePhotosVisibility } = usePhotoContext();
    const mapOverview = getMapOverviewData();
    const { routeVisibility, toggleRouteVisibility } = useRouteState();
    const [isNestedOpen, setIsNestedOpen] = useState(true);
    const [isMapOverviewOpen, setIsMapOverviewOpen] = useState(false);
    const [allComponentsDisabled, setAllComponentsDisabled] = useState(false);
    const [previouslyVisibleCategories, setPreviouslyVisibleCategories] = useState([]);
    const currentIndex = routes.findIndex(route => route.id === currentRoute?.id);

    const updateRouteAndMap = (route) => {
        if (route._type === 'loaded' && route._loadedState) {
            // Update POIs and photos from the loaded state
            if (route._loadedState.pois) {
                loadPOIsFromRoute(route._loadedState.pois);
            }
            if (route._loadedState.photos) {
                addPhoto(route._loadedState.photos.map(deserializePhoto));
            }
        }
        // Just update the current route - the map view will handle fitting bounds
        setCurrentRoute(route);
    };

    const handleNavigate = (direction) => {
        const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < routes.length) {
            updateRouteAndMap(routes[nextIndex]);
        }
    };

    // Toggle all components on/off
    const toggleAllComponents = () => {
        setAllComponentsDisabled(prev => !prev);
        
        // If we're enabling components, restore previous state
        // If we're disabling components, hide everything
        if (allComponentsDisabled) {
            // Re-enable components
            if (!isPhotosVisible) togglePhotosVisibility();
            if (!isDistanceMarkersVisible) toggleDistanceMarkersVisibility();
            if (!isClimbFlagsVisible) toggleClimbFlagsVisibility();
            if (!isLineMarkersVisible) toggleLineMarkersVisibility();
            
            // Directly restore previously visible POI categories
            // This prevents duplication by setting the exact state rather than toggling
            setVisibleCategories(previouslyVisibleCategories);
        } else {
            // Store currently visible categories before disabling
            setPreviouslyVisibleCategories([...visibleCategories]);
            
            // Disable all components
            if (isPhotosVisible) togglePhotosVisibility();
            if (isDistanceMarkersVisible) toggleDistanceMarkersVisibility();
            if (isClimbFlagsVisible) toggleClimbFlagsVisibility();
            if (isLineMarkersVisible) toggleLineMarkersVisibility();
            
            // Clear all POI categories
            setVisibleCategories([]);
        }
    };

    // Common style for all list item buttons to ensure consistent spacing
    const listItemButtonStyle = {
        marginTop: '8px',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
        },
        '&:hover .MuiListItemIcon-root svg': {
            color: '#2196f3' // Changed from #ff4d4f (red) to #2196f3 (Material UI info blue)
        }
    };

    return (_jsxs(ErrorBoundary, { children: [
        _jsx(StyledDrawer, { 
            variant: "permanent", 
            anchor: "left", 
            children: _jsxs(List, { 
                children: [
                    // Routes icon at the very top
                    _jsx(Tooltip, { 
                        title: "Routes", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => {
                                // Close map overview drawer if it's open
                                if (isMapOverviewOpen) {
                                    setIsMapOverviewOpen(false);
                                }
                                // Toggle routes drawer
                                setIsNestedOpen(!isNestedOpen);
                            },
                            'data-active': isNestedOpen,
                            sx: {
                                ...listItemButtonStyle,
                                '&[data-active="true"] .MuiListItemIcon-root svg': {
                                    color: 'white' // Changed from blue to white
                                }
                            }, 
                            children: _jsx(ListItemIcon, { 
                                children: isNestedOpen ? _jsx(ChevronLeft, { color: "white" }) : _jsx(ListOrdered, { color: "white" }) 
                            }) 
                        }) 
                    }),
                    
                    // Add Map Overview icon below Routes icon - disabled if no map overview data
                    _jsx(Tooltip, { 
                        title: mapOverview?.description ? "Map Overview" : "No Map Overview Available", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => {
                                // Only toggle if there's map overview data
                                if (mapOverview?.description) {
                                    // Close route list drawer if it's open
                                    if (isNestedOpen) {
                                        setIsNestedOpen(false);
                                    }
                                    // Toggle map overview drawer
                                    setIsMapOverviewOpen(!isMapOverviewOpen);
                                }
                            },
                            'data-active': isMapOverviewOpen,
                            disabled: !mapOverview?.description,
                            sx: {
                                ...listItemButtonStyle,
                                '&[data-active="true"] .MuiListItemIcon-root svg': {
                                    color: 'white'
                                },
                                '&.Mui-disabled': {
                                    opacity: 0.5,
                                    cursor: 'not-allowed'
                                }
                            }, 
                            children: _jsx(ListItemIcon, { 
                                children: isMapOverviewOpen ? 
                                    _jsx(ChevronLeft, { color: "white" }) : 
                                    _jsx(FileText, { color: mapOverview?.description ? "white" : "rgba(255, 255, 255, 0.3)" }) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Divider, { 
                        sx: { 
                            my: 1, 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)' 
                        } 
                    }),
                    
                    // Power toggle moved below Routes
                    _jsx(Tooltip, { 
                        title: allComponentsDisabled ? "Enable All Components" : "Disable All Components", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: toggleAllComponents,
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: allComponentsDisabled ? 
                                    _jsx(PowerOff, { color: "#ff4d4f" }) : 
                                    _jsx(CirclePower, { color: "#4caf50" }) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Divider, { 
                        sx: { 
                            my: 1, 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)' 
                        } 
                    }),
                    
                    _jsx(Tooltip, { 
                        title: isPhotosVisible ? "Hide Photos" : "Show Photos", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: togglePhotosVisibility,
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: isPhotosVisible ? 
                                    _jsx(Camera, { color: '#4caf50' }) : 
                                    _jsx(CameraOff, { color: '#ff4d4f' }) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Tooltip, { 
                        title: isDistanceMarkersVisible ? "Hide Distance Markers" : "Show Distance Markers", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: toggleDistanceMarkersVisibility,
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(Ruler, { 
                                    color: isDistanceMarkersVisible ? '#4caf50' : '#ff4d4f' 
                                }) 
                            }) 
                        }) 
                    }),
                    
                    // Line markers moved to be underneath distance markers
                    _jsx(Tooltip, { 
                        title: "Line Markers", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: toggleLineMarkersVisibility,
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(Settings2, { 
                                    color: isLineMarkersVisible ? '#4caf50' : '#ff4d4f' 
                                }) 
                            }) 
                        }) 
                    }),
                    
                    // Divider after line markers
                    _jsx(Divider, { 
                        sx: { 
                            my: 1, 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)' 
                        } 
                    }),
                    
                    // POI Category Toggles
                    _jsx(Tooltip, { 
                        title: "Road Information", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => toggleCategoryVisibility('road-information'),
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(AlertTriangle, { 
                                    color: visibleCategories.includes('road-information') ? '#4caf50' : '#ff4d4f' 
                                }) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Tooltip, { 
                        title: "Trail Information", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => toggleCategoryVisibility('trail-information'),
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(Map, { 
                                    color: visibleCategories.includes('trail-information') ? '#4caf50' : '#ff4d4f' 
                                }) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Tooltip, { 
                        title: "Accommodation", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => toggleCategoryVisibility('accommodation'),
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(Tent, { 
                                    color: visibleCategories.includes('accommodation') ? '#4caf50' : '#ff4d4f' 
                                }) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Tooltip, { 
                        title: "Food & Drink", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => toggleCategoryVisibility('food-drink'),
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(Coffee, { 
                                    color: visibleCategories.includes('food-drink') ? '#4caf50' : '#ff4d4f' 
                                }) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Tooltip, { 
                        title: "Natural Features", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => toggleCategoryVisibility('natural-features'),
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(Mountain, { 
                                    color: visibleCategories.includes('natural-features') ? '#4caf50' : '#ff4d4f' 
                                }) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Tooltip, { 
                        title: "Town Services", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => toggleCategoryVisibility('town-services'),
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(Building, { 
                                    color: visibleCategories.includes('town-services') ? '#4caf50' : '#ff4d4f' 
                                }) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Tooltip, { 
                        title: "Transportation", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => toggleCategoryVisibility('transportation'),
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(Bus, { 
                                    color: visibleCategories.includes('transportation') ? '#4caf50' : '#ff4d4f' 
                                }) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Tooltip, { 
                        title: "Event Information", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => toggleCategoryVisibility('event-information'),
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(MapPinCheck, { 
                                    color: visibleCategories.includes('event-information') ? '#4caf50' : '#ff4d4f' 
                                }) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Tooltip, { 
                        title: "Climb Flags", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: toggleClimbFlagsVisibility,
                            sx: listItemButtonStyle, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(FlagTriangleRight, { 
                                    color: isClimbFlagsVisible ? '#4caf50' : '#ff4d4f' 
                                }) 
                            }) 
                        }) 
                    })
                ] 
            }) 
        }),
        // Add Map Overview drawer
        _jsx(NestedDrawer, {
            variant: "persistent",
            anchor: "left",
            open: isMapOverviewOpen,
            customWidth: 528, // Double width (264*2) for Map Overview to match creation mode
            sx: {
                '& .MuiDrawer-paper': {
                    top: '64px', // Position below the header
                    height: 'calc(100% - 64px)', // Adjust height to account for header
                    marginLeft: '56px', // Account for the sidebar width
                    paddingTop: '0px', // Remove any top padding
                    backgroundColor: 'rgba(26, 26, 26, 0.6)', // Increased transparency (0.6 alpha)
                    backdropFilter: 'blur(3px)' // Reduced blur effect
                }
            },
            children: _jsx(Suspense, {
                fallback: _jsx(CircularProgress, {}),
                children: _jsx(LazyMapOverviewDrawer, {})
            })
        }),
        
        // Routes drawer
        _jsx(NestedDrawer, { 
            variant: "persistent", 
            anchor: "left", 
            open: isNestedOpen,
            sx: {
                '& .MuiDrawer-paper': {
                    top: '64px', // Position below the header
                    height: 'calc(100% - 64px)', // Adjust height to account for header
                    marginLeft: '56px', // Account for the sidebar width
                    paddingTop: '0px' // Remove any top padding
                }
            },
            children: _jsx(Suspense, { 
                fallback: _jsx(CircularProgress, {}), 
                children: _jsxs(Box, { 
                    sx: { display: 'flex', flexDirection: 'column', height: '100%' }, 
                    children: [
                        _jsx(Box, { 
                            sx: { p: 3, pb: 0 }, 
                            children: _jsxs(Box, { 
                                sx: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 2
                                }, 
                                children: [
                                    _jsx(Typography, { 
                                        variant: "h5", 
                                        component: "h2", 
                                        sx: { fontWeight: 600, color: 'white' }, 
                                        children: "Routes" 
                                    }), 
                                    _jsxs(Box, { 
                                        sx: { display: 'flex', alignItems: 'center', gap: 1 }, 
                                        children: [
                                            _jsx(Tooltip, { 
                                                title: "Previous route", 
                                                children: _jsx("span", { 
                                                    children: _jsx(IconButton, { 
                                                        onClick: () => handleNavigate('prev'), 
                                                        disabled: currentIndex <= 0, 
                                                        sx: {
                                                            color: 'white',
                                                            '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' }
                                                        }, 
                                                        children: _jsx(NavigateBeforeIcon, {}) 
                                                    }) 
                                                }) 
                                            }), 
                                            _jsx(Typography, { 
                                                variant: "body2", 
                                                sx: { color: 'rgba(255, 255, 255, 0.7)' }, 
                                                children: `${currentIndex + 1} of ${routes.length}` 
                                            }), 
                                            _jsx(Tooltip, { 
                                                title: "Next route", 
                                                children: _jsx("span", { 
                                                    children: _jsx(IconButton, { 
                                                        onClick: () => handleNavigate('next'), 
                                                        disabled: currentIndex >= routes.length - 1, 
                                                        sx: {
                                                            color: 'white',
                                                            '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' }
                                                        }, 
                                                        children: _jsx(NavigateNextIcon, {}) 
                                                    }) 
                                                }) 
                                            })
                                        ] 
                                    })
                                ] 
                            }) 
                        }), 
                        _jsx(List, { 
                            sx: { flex: 1, overflowY: 'auto', px: 3, py: 2, pb: 120 }, 
                            children: routes.map((route) => (
                                _jsxs(ListItem, { 
                                    sx: {
                                        backgroundColor: currentRoute?.id === route.id ? 'rgba(74, 158, 255, 0.15)' : 'rgba(35, 35, 35, 0.9)',
                                        mb: 1.5,
                                        borderRadius: 1,
                                        transition: 'all 0.05s ease-in-out', // Even faster transition
                                        cursor: 'pointer',
                                        border: currentRoute?.id === route.id ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid transparent',
                                        '&:hover': {
                                            backgroundColor: currentRoute?.id === route.id ? 'rgba(74, 158, 255, 0.2)' : 'rgba(45, 45, 45, 0.95)',
                                            transform: 'scale(1.02)',
                                            '& i': {
                                                color: '#4a9eff !important'
                                            }
                                        },
                                        '& i': {
                                            transition: 'color 0.2s ease-in-out',
                                            color: currentRoute?.id === route.id ? '#4a9eff !important' : '#0288d1'
                                        },
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 16px'
                                    }, 
                                    children: [
                                    _jsx("div", {
                                        style: { flex: 1, cursor: 'pointer', minWidth: '0', width: '100%' },
                                        onClick: (e) => {
                                            // Stop propagation to prevent map from capturing the event
                                            e.stopPropagation();
                                            // Immediately update the route without requiring a second click
                                            updateRouteAndMap(route);
                                        },
                                        // Add touchstart event handler for mobile devices
                                        onTouchStart: (e) => {
                                            // Prevent default to avoid any browser-specific touch behaviors
                                            e.preventDefault();
                                            // Stop propagation to ensure no other elements capture this event
                                            e.stopPropagation();
                                            // Immediately update the route on touch start for mobile responsiveness
                                            updateRouteAndMap(route);
                                        },
                                        children: _jsx(ListItemText, { 
                                            primary: _jsxs("div", {
                                                style: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: '0' },
                                                children: [
                                                    _jsx("div", {
                                                        style: {
                                                            width: '8px',
                                                            height: '16px',
                                                            backgroundColor: route.color || '#f44336', // Use route color or default red
                                                            borderRadius: '2px',
                                                            border: '1px solid rgba(255, 255, 255, 0.5)'
                                                        }
                                                    }),
                                                    _jsx("span", { children: route.name })
                                                ]
                                            }),
                                            sx: { 
                                                color: 'white',
                                                '& .MuiTypography-root': {
                                                    wordWrap: 'break-word',
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'break-word',
                                                    whiteSpace: 'normal'
                                                }
                                            },
                                        secondary: _jsxs("div", {
                                            style: { 
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1px',
                                                fontSize: '0.75rem',
                                                marginTop: '5px'
                                            },
                                            children: [
                                                _jsxs("div", {
                                                    style: { display: 'flex', alignItems: 'center', gap: '8px' },
                                                    children: [
                                                        _jsx("i", { 
                                                            className: "fa-solid fa-route",
                                                            style: { color: '#4a9eff', fontSize: '0.8125rem' }
                                                        }),
                                                        _jsx("span", {
                                                            style: { color: 'white' },
                                                            children: `${(route.statistics.totalDistance / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}km`
                                                        })
                                                    ]
                                                }),
                                                _jsxs("div", {
                                                    style: { display: 'flex', alignItems: 'center', gap: '5px' },
                                                    children: [
                                                        _jsx("i", { 
                                                            className: "fa-solid fa-person-biking-mountain",
                                                            style: { color: '#4a9eff', fontSize: '0.8125rem' }
                                                        }),
                                                        _jsx("span", {
                                                            style: { color: 'white' },
                                                            children: `${(() => {
                                                                if (!route.unpavedSections || !route.statistics.totalDistance) return '0';
                                                                const pointCount = route.geojson.features[0].properties.coordinateProperties.elevation.length;
                                                                let unpavedDistance = 0;
                                                                for (const section of route.unpavedSections) {
                                                                    const sectionStartDist = (section.startIndex / (pointCount - 1)) * route.statistics.totalDistance;
                                                                    const sectionEndDist = (section.endIndex / (pointCount - 1)) * route.statistics.totalDistance;
                                                                    unpavedDistance += sectionEndDist - sectionStartDist;
                                                                }
                                                                return ((unpavedDistance / route.statistics.totalDistance) * 100).toFixed(0);
                                                            })()}% unpaved`
                                                        })
                                                    ]
                                                }),
                                                _jsxs("div", {
                                                    style: { display: 'flex', alignItems: 'center', gap: '11px' },
                                                    children: [
                                                        _jsx("i", { 
                                                            className: "fa-solid fa-up-right",
                                                            style: { color: '#4a9eff', fontSize: '0.8125rem' }
                                                        }),
                                                        _jsx("span", {
                                                            style: { color: 'white' },
                                                            children: `${Math.round(route.statistics.elevationGain).toLocaleString() || 0}m`
                                                        }),
                                                        _jsx("i", { 
                                                            className: "fa-solid fa-down-right",
                                                            style: { color: '#4a9eff', fontSize: '0.8125rem', marginLeft: '8px' }
                                                        }),
                                                        _jsx("span", {
                                                            style: { color: 'white' },
                                                            children: `${Math.round(route.statistics.elevationLoss).toLocaleString() || 0}m`
                                                        })
                                                    ]
                                                })
                                            ]
                                        })
                                        })
                                        }),
                                        _jsx(Tooltip, {
                                            title: (routeVisibility[route.id || route.routeId]?.mainRoute ?? true) ? "Hide Route" : "Show Route",
                                            placement: "left",
                                            children: _jsx(IconButton, {
                                                onClick: (e) => {
                                                    e.stopPropagation();
                                                    
                                                    // Use the stable ID (id first, then routeId)
                                                    const stableId = route.id || route.routeId;
                                                    
                                                    // Log the route ID for debugging
                                                    console.log('[PresentationSidebar] Toggling visibility for route:', {
                                                        id: route.id,
                                                        routeId: route.routeId,
                                                        name: route.name,
                                                        stableId,
                                                        currentVisibility: routeVisibility[stableId]
                                                    });
                                                    
                                                    // Toggle visibility
                                                    toggleRouteVisibility(stableId, 'mainRoute');
                                                    
                                                    // Direct manipulation of the map layers
                                                    if (map) {
                                                        // Try different layer ID formats for the main route
                                                        const possibleMainLayerIds = [
                                                            `${stableId}-main-line`,
                                                            `route-${stableId}-main-line`
                                                        ];
                                                        
                                                        // Try different layer ID formats for the unpaved sections
                                                        const possibleUnpavedLayerIds = [
                                                            `unpaved-sections-layer-${stableId}`,
                                                            `unpaved-sections-layer-route-${stableId}`
                                                        ];
                                                        
                                                        const newVisibility = !(routeVisibility[stableId]?.mainRoute ?? true);
                                                        console.log(`[PresentationSidebar] Setting route visibility to ${newVisibility ? 'visible' : 'none'}`);
                                                        
                                                        // Find and update the main route layers
                                                        let foundMainLayer = false;
                                                        for (const layerId of possibleMainLayerIds) {
                                                            if (map.getLayer(layerId)) {
                                                                console.log(`[PresentationSidebar] Found main layer: ${layerId}`);
                                                                
                                                                // Update main line visibility
                                                                map.setLayoutProperty(
                                                                    layerId,
                                                                    'visibility',
                                                                    newVisibility ? 'visible' : 'none'
                                                                );
                                                                
                                                                // Also update border visibility
                                                                const borderLayerId = layerId.replace('-main-line', '-main-border');
                                                                if (map.getLayer(borderLayerId)) {
                                                                    map.setLayoutProperty(
                                                                        borderLayerId,
                                                                        'visibility',
                                                                        newVisibility ? 'visible' : 'none'
                                                                    );
                                                                }
                                                                
                                                                foundMainLayer = true;
                                                                break;
                                                            }
                                                        }
                                                        
                                                        // Find and update the unpaved sections layers
                                                        let foundUnpavedLayer = false;
                                                        for (const layerId of possibleUnpavedLayerIds) {
                                                            if (map.getLayer(layerId)) {
                                                                console.log(`[PresentationSidebar] Found unpaved layer: ${layerId}`);
                                                                
                                                                // Update unpaved sections visibility
                                                                map.setLayoutProperty(
                                                                    layerId,
                                                                    'visibility',
                                                                    newVisibility ? 'visible' : 'none'
                                                                );
                                                                
                                                                foundUnpavedLayer = true;
                                                                break;
                                                            }
                                                        }
                                                        
                                                        // If we couldn't find the layers by ID, try searching all layers
                                                        if (!foundMainLayer || !foundUnpavedLayer) {
                                                            // Get all layers in the map
                                                            const allLayers = map.getStyle().layers.map(layer => layer.id);
                                                            console.log('[PresentationSidebar] All map layers:', allLayers);
                                                            
                                                            // Find layers that might be related to this route
                                                            const routeLayers = allLayers.filter(layerId => 
                                                                layerId.includes(stableId) || 
                                                                (route.routeId && layerId.includes(route.routeId))
                                                            );
                                                            
                                                            console.log(`[PresentationSidebar] Found ${routeLayers.length} layers for route ${stableId}:`, routeLayers);
                                                            
                                                            // Update all found layers
                                                            routeLayers.forEach(layerId => {
                                                                console.log(`[PresentationSidebar] Setting ${layerId} visibility to ${newVisibility ? 'visible' : 'none'}`);
                                                                map.setLayoutProperty(
                                                                    layerId,
                                                                    'visibility',
                                                                    newVisibility ? 'visible' : 'none'
                                                                );
                                                            });
                                                        }
                                                    }
                                                },
                                                size: "small",
                                                sx: {
                                                    color: 'white',
                                                    padding: '4px',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                                    }
                                                },
                                                children: (routeVisibility[route.id || route.routeId]?.mainRoute ?? true) ? 
                                                    _jsx(Eye, { size: 18, color: '#4caf50' }) : 
                                                    _jsx(EyeOff, { size: 18, color: '#ff4d4f' })
                                            })
                                        })
                                    ] 
                                }, route.id)
                            )) 
                        })
                    ] 
                }) 
            }) 
        })
    ] }));
};
