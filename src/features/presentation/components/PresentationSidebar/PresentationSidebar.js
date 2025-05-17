import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, Suspense, useEffect, lazy, useMemo } from 'react'; // Import useMemo
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Typography, IconButton, CircularProgress, Tooltip, Divider } from '@mui/material';
import { useRouteContext } from '../../../map/context/RouteContext';
import { useMapContext } from '../../../map/context/MapContext';
// Import route utility functions
import { getRouteDistance, getUnpavedPercentage, getElevationGain, getElevationLoss } from '../../../gpx/utils/routeUtils';
// Import climb detection utility
import { detectClimbs } from '../../../gpx/utils/climbUtils.js'; // Corrected path
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
    const { routes, currentRoute, setCurrentRoute, currentLoadedState } = useRouteContext(); // Get currentLoadedState
    const { map } = useMapContext();
    const { loadPOIsFromRoute, visibleCategories, toggleCategoryVisibility, setVisibleCategories } = usePOIContext(); // Added setVisibleCategories
    const { isPhotosVisible, togglePhotosVisibility } = usePhotoContext();
    const mapOverview = getMapOverviewData();
    const { routeVisibility, toggleRouteVisibility } = useRouteState();
    const [isNestedOpen, setIsNestedOpen] = useState(true);
    const [isMapOverviewOpen, setIsMapOverviewOpen] = useState(false);
    const [allComponentsDisabled, setAllComponentsDisabled] = useState(false);
    const [previouslyVisibleCategories, setPreviouslyVisibleCategories] = useState([]);
    const currentIndex = routes.findIndex(route => (route.id || route.routeId) === (currentRoute?.id || currentRoute?.routeId)); // Handle both id and routeId

    // Determine route type from currentLoadedState
    const routeType = currentLoadedState?.routeType || 'Single'; // Default to 'Single'

    // Calculate master route for Bikepacking type
    const masterRoute = useMemo(() => {
        if (routeType !== 'Bikepacking' || !routes || routes.length === 0) return null;

        // Create a combined route object with a unique ID
        const combinedRoute = {
            routeId: "master-route",
            id: "master-route",
            name: "Full Route",
            color: "#4a9eff", // Blue color for master route
            priority: 100, // High priority to ensure it renders on top
            statistics: {
                totalDistance: 0,
                elevationGain: 0,
                elevationLoss: 0
            },
            unpavedSections: [],
            description: "Combined route of all segments",
            _type: 'master' // Add a type identifier
        };

        let totalDistance = 0;
        let totalElevationGain = 0;
        let totalElevationLoss = 0;

        routes.forEach(route => {
            totalDistance += getRouteDistance(route);
            totalElevationGain += getElevationGain(route);
            totalElevationLoss += getElevationLoss(route);
        });

        combinedRoute.statistics.totalDistance = totalDistance;
        combinedRoute.statistics.elevationGain = totalElevationGain;
        combinedRoute.statistics.elevationLoss = totalElevationLoss;

        const allCoordinates = [];
        const allElevations = [];
        const allUnpavedSections = [];
        let currentCoordinateIndex = 0;

        routes.forEach(route => {
            if (!route.geojson?.features?.[0]?.geometry?.coordinates) return;

            const coordinates = route.geojson.features[0].geometry.coordinates;
            const elevations = route.geojson.features[0].properties?.coordinateProperties?.elevation || [];

            coordinates.forEach((coord, idx) => {
                allCoordinates.push(coord);
                allElevations.push(elevations[idx] || 0);
            });

            if (route.unpavedSections && route.unpavedSections.length > 0) {
                route.unpavedSections.forEach(section => {
                    allUnpavedSections.push({
                        ...section,
                        startIndex: section.startIndex + currentCoordinateIndex,
                        endIndex: section.endIndex + currentCoordinateIndex,
                        originalRouteName: route.name,
                        originalRouteId: route.routeId || route.id
                    });
                });
            }
            currentCoordinateIndex += coordinates.length;
        });

        combinedRoute.geojson = {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                properties: {
                    name: "Full Route",
                    coordinateProperties: {
                        elevation: allElevations
                    }
                },
                geometry: {
                    type: "LineString",
                    coordinates: allCoordinates
                }
            }]
        };
        combinedRoute.unpavedSections = allUnpavedSections;

        // Calculate unpaved percentage for master route
        combinedRoute.statistics.unpavedPercentage = getUnpavedPercentage(combinedRoute);

        // --- Calculate Climbs for Master Route ---
        try {
            if (allCoordinates.length > 1 && allElevations.length === allCoordinates.length) {
                // 1. Calculate cumulative distance for each point
                const elevationDataForClimbs = [];
                let cumulativeDistance = 0;
                elevationDataForClimbs.push({ distance: 0, elevation: allElevations[0] }); // Add first point

                for (let i = 1; i < allCoordinates.length; i++) {
                    const [lon1, lat1] = allCoordinates[i - 1];
                    const [lon2, lat2] = allCoordinates[i];
                    const R = 6371e3; // Earth's radius in meters
                    const φ1 = lat1 * Math.PI / 180;
                    const φ2 = lat2 * Math.PI / 180;
                    const Δφ = (lat2 - lat1) * Math.PI / 180;
                    const Δλ = (lon2 - lon1) * Math.PI / 180;
                    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const segmentDistance = R * c;
                    cumulativeDistance += segmentDistance;
                    elevationDataForClimbs.push({ distance: cumulativeDistance, elevation: allElevations[i] });
                }

                // 2. Detect climbs using the utility function
                combinedRoute.climbs = detectClimbs(elevationDataForClimbs);
                console.log(`[PresentationSidebar] Detected ${combinedRoute.climbs?.length || 0} climbs for master route.`);
            } else {
                combinedRoute.climbs = []; // No climbs if insufficient data
                console.log('[PresentationSidebar] Insufficient data to calculate climbs for master route.');
            }
        } catch (climbError) {
            console.error('[PresentationSidebar] Error calculating climbs for master route:', climbError);
            combinedRoute.climbs = []; // Set empty climbs on error
        }
        // --- End Climb Calculation ---

        return combinedRoute;
    }, [routeType, routes]);


    const updateRouteAndMap = (route) => {
        // Special handling for master route click
        if (route.id === 'master-route') {
            setCurrentRoute(route); // Just set the master route as current
            return;
        }

        // Original logic for regular routes
        if (route._type === 'loaded' && route._loadedState) {
            // Update POIs from the loaded state
            if (route._loadedState.pois) {
                loadPOIsFromRoute(route._loadedState.pois);
            }
            // Photos will be loaded by PresentationPhotoLayer when currentRoute changes
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

    // Function to render route item content (used for both master and stages)
    const renderRouteItemContent = (route, isMaster = false) => {
        const distanceKm = (getRouteDistance(route) / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        const unpavedPercent = getUnpavedPercentage(route);
        const elevGain = Math.round(getElevationGain(route)).toLocaleString();
        const elevLoss = Math.round(getElevationLoss(route)).toLocaleString();

        return _jsxs(_Fragment, {
            children: [
                _jsx(ListItemText, {
                    primary: _jsxs("span", {
                        style: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: '0' },
                        children: [
                            !isMaster && _jsx("span", { // Only show color swatch for stages
                                style: {
                                    display: 'inline-block',
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
                    secondary: _jsxs("span", {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1px',
                            fontSize: '0.75rem',
                            marginTop: '5px'
                        },
                        children: [
                            _jsxs("span", {
                                style: { display: 'flex', alignItems: 'center', gap: '8px' },
                                children: [
                                    _jsx("i", {
                                        className: "fa-solid fa-route",
                                        style: { color: '#4a9eff', fontSize: '0.8125rem' }
                                    }),
                                    _jsx("span", {
                                        style: { color: 'white' },
                                        children: `${distanceKm}km`
                                    })
                                ]
                            }),
                            _jsxs("span", {
                                style: { display: 'flex', alignItems: 'center', gap: '5px' },
                                children: [
                                    _jsx("i", {
                                        className: "fa-solid fa-person-biking-mountain",
                                        style: { color: '#4a9eff', fontSize: '0.8125rem' }
                                    }),
                                    _jsx("span", {
                                        style: { color: 'white' },
                                        children: `${unpavedPercent}% unpaved`
                                    })
                                ]
                            }),
                            _jsxs("span", {
                                style: { display: 'flex', alignItems: 'center', gap: '11px' },
                                children: [
                                    _jsx("i", {
                                        className: "fa-solid fa-up-right",
                                        style: { color: '#4a9eff', fontSize: '0.8125rem' }
                                    }),
                                    _jsx("span", {
                                        style: { color: 'white' },
                                        children: `${elevGain}m`
                                    }),
                                    _jsx("i", {
                                        className: "fa-solid fa-down-right",
                                        style: { color: '#4a9eff', fontSize: '0.8125rem', marginLeft: '8px' }
                                    }),
                                    _jsx("span", {
                                        style: { color: 'white' },
                                        children: `${elevLoss}m`
                                    })
                                ]
                            })
                        ]
                    })
                }),
                !isMaster && _jsx(Tooltip, { // Only show visibility toggle for stages
                    title: (routeVisibility[route.id || route.routeId]?.mainRoute ?? true) ? "Hide Route" : "Show Route",
                    placement: "left",
                    children: _jsx(IconButton, {
                        onClick: (e) => {
                            e.stopPropagation();
                            const stableId = route.id || route.routeId;
                            console.log('[PresentationSidebar] Toggling visibility for route:', {
                                id: route.id,
                                routeId: route.routeId,
                                name: route.name,
                                stableId,
                                currentVisibility: routeVisibility[stableId]
                            });
                            toggleRouteVisibility(stableId, 'mainRoute');
                            if (map) {
                                const possibleMainLayerIds = [`${stableId}-main-line`, `route-${stableId}-main-line`];
                                const possibleUnpavedLayerIds = [`unpaved-sections-layer-${stableId}`, `unpaved-sections-layer-route-${stableId}`];
                                const newVisibility = !(routeVisibility[stableId]?.mainRoute ?? true);
                                console.log(`[PresentationSidebar] Setting route visibility to ${newVisibility ? 'visible' : 'none'}`);
                                let foundMainLayer = false;
                                for (const layerId of possibleMainLayerIds) {
                                    if (map.getLayer(layerId)) {
                                        console.log(`[PresentationSidebar] Found main layer: ${layerId}`);
                                        map.setLayoutProperty(layerId, 'visibility', newVisibility ? 'visible' : 'none');
                                        const borderLayerId = layerId.replace('-main-line', '-main-border');
                                        if (map.getLayer(borderLayerId)) {
                                            map.setLayoutProperty(borderLayerId, 'visibility', newVisibility ? 'visible' : 'none');
                                        }
                                        foundMainLayer = true;
                                        break;
                                    }
                                }
                                let foundUnpavedLayer = false;
                                for (const layerId of possibleUnpavedLayerIds) {
                                    if (map.getLayer(layerId)) {
                                        console.log(`[PresentationSidebar] Found unpaved layer: ${layerId}`);
                                        map.setLayoutProperty(layerId, 'visibility', newVisibility ? 'visible' : 'none');
                                        foundUnpavedLayer = true;
                                        break;
                                    }
                                }
                                if (!foundMainLayer || !foundUnpavedLayer) {
                                    const allLayers = map.getStyle().layers.map(layer => layer.id);
                                    console.log('[PresentationSidebar] All map layers:', allLayers);
                                    const routeLayers = allLayers.filter(layerId =>
                                        layerId.includes(stableId) ||
                                        (route.routeId && layerId.includes(route.routeId))
                                    );
                                    console.log(`[PresentationSidebar] Found ${routeLayers.length} layers for route ${stableId}:`, routeLayers);
                                    routeLayers.forEach(layerId => {
                                        console.log(`[PresentationSidebar] Setting ${layerId} visibility to ${newVisibility ? 'visible' : 'none'}`);
                                        map.setLayoutProperty(layerId, 'visibility', newVisibility ? 'visible' : 'none');
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
        });
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
                    
                    // Climb Flags moved to be underneath line markers
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
                    }),
                    
                    // Divider after line markers and climb flags
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
                                                children: routeType === 'Bikepacking' ? "Navigation" : "Routes" // Change title for Bikepacking
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
                                _jsxs(List, {
                                    sx: { flex: 1, overflowY: 'auto', px: 3, py: 2, pb: 120 },
                                    children: [
                                        // Conditionally render Master Route for Bikepacking
                                        routeType === 'Bikepacking' && masterRoute && _jsxs(_Fragment, {
                                            children: [
                                                _jsx(Typography, {
                                                    variant: "subtitle2",
                                                    sx: {
                                                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                                        paddingBottom: '8px',
                                                        marginBottom: '12px', // Increased margin
                                                        fontWeight: 'bold',
                                                        color: '#4a9eff' // Blue color for heading
                                                    },
                                                    children: "Full Route"
                                                }),
                                                _jsx(ListItem, {
                                                    sx: {
                                                        backgroundColor: currentRoute?.id === masterRoute.id ? 'rgba(74, 158, 255, 0.15)' : 'rgba(35, 35, 35, 0.9)',
                                                        mb: 1.5,
                                                        borderRadius: 1,
                                                        transition: 'all 0.05s ease-in-out',
                                                        cursor: 'pointer',
                                                        border: currentRoute?.id === masterRoute.id ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid transparent',
                                                        '&:hover': {
                                                            backgroundColor: currentRoute?.id === masterRoute.id ? 'rgba(74, 158, 255, 0.2)' : 'rgba(45, 45, 45, 0.95)',
                                                            transform: 'scale(1.02)',
                                                            '& i': {
                                                                color: '#4a9eff !important'
                                                            }
                                                        },
                                                        '& i': {
                                                            transition: 'color 0.2s ease-in-out',
                                                            color: currentRoute?.id === masterRoute.id ? '#4a9eff !important' : '#0288d1'
                                                        },
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '8px 16px'
                                                    },
                                                    children: _jsx("div", {
                                                        style: { flex: 1, cursor: 'pointer', minWidth: '0', width: '100%' },
                                                        onClick: (e) => {
                                                            e.stopPropagation();
                                                            updateRouteAndMap(masterRoute);
                                                        },
                                                        onTouchStart: (e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            updateRouteAndMap(masterRoute);
                                                        },
                                                        children: renderRouteItemContent(masterRoute, true) // Pass true for isMaster
                                                    })
                                                }, masterRoute.id),
                                                _jsx(Typography, { // Stages Heading
                                                    variant: "subtitle2",
                                                    sx: {
                                                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                                        paddingBottom: '8px',
                                                        marginTop: '16px', // Add margin above stages
                                                        marginBottom: '12px', // Increased margin
                                                        fontWeight: 'bold',
                                                        color: '#4a9eff' // Blue color for heading
                                                    },
                                                    children: "Stages"
                                                })
                                            ]
                                        }),
                                        // Render individual routes (stages)
                                        routes.map((route) => (
                                            _jsx(ListItem, {
                                                sx: {
                                                    backgroundColor: currentRoute?.id === route.id ? 'rgba(74, 158, 255, 0.15)' : 'rgba(35, 35, 35, 0.9)',
                                                    mb: 1.5,
                                                    borderRadius: 1,
                                                    transition: 'all 0.05s ease-in-out',
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
                                                children: _jsx("div", {
                                                    style: { flex: 1, cursor: 'pointer', minWidth: '0', width: '100%' },
                                                    onClick: (e) => {
                                                        e.stopPropagation();
                                                        updateRouteAndMap(route);
                                                    },
                                                    onTouchStart: (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        updateRouteAndMap(route);
                                                    },
                                                    children: renderRouteItemContent(route, false) // Pass false for isMaster
                                                })
                                            }, route.id || route.routeId) // Use stable key
                                        ))
                                    ]
                                })
                            ]
                        })
                    })
                })
            ] }));
};
