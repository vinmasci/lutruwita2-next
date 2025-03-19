import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapInitializer } from './hooks/useMapInitializer';
import { useMapEvents } from './hooks/useMapEvents';
import useUnifiedRouteProcessing from '../../hooks/useUnifiedRouteProcessing';
import { DistanceMarkers } from '../DistanceMarkers/DistanceMarkers';
import StyleControl, { MAP_STYLES } from '../StyleControl/StyleControl';
import SearchControl from '../SearchControl/SearchControl';
import PitchControl from '../PitchControl/PitchControl';
import { ElevationProfilePanel } from '../../../gpx/components/ElevationProfile/ElevationProfilePanel';
import { MapProvider } from '../../context/MapContext';
import { RouteProvider, useRouteContext } from '../../context/RouteContext';
import MapHeader from '../MapHeader/MapHeader';
import HeaderCustomization from '../HeaderCustomization/HeaderCustomization';
import { usePOIContext } from '../../../poi/context/POIContext';
import { PhotoLayer } from '../../../photo/components/PhotoLayer/PhotoLayer';
import { POIViewer } from '../../../poi/components/POIViewer/POIViewer';
import { getIconDefinition } from '../../../poi/constants/poi-icons';
import { createPOIPhotos } from '../../../poi/utils/photo';
import POIDetailsDrawer from '../../../poi/components/POIDetailsDrawer/POIDetailsDrawer';
import MapboxPOIMarker from '../../../poi/components/MapboxPOIMarker';
import POIDragPreview from '../../../poi/components/POIDragPreview/POIDragPreview';
// import PlacePOILayer from '../../../poi/components/PlacePOILayer/PlacePOILayer';
import DraggablePOILayer from '../../../poi/components/DraggablePOILayer/DraggablePOILayer.jsx';
import { ClimbMarkers } from '../ClimbMarkers/ClimbMarkers';
import { DraggableTextboxTabsLayer, TextboxTabsProvider } from '../../../presentation/components/TextboxTabs';
// import '../../../poi/components/PlacePOILayer/PlacePOILayer.css';
import './MapView.css';
import './photo-fix.css'; // Nuclear option to force photos behind UI components
import { Sidebar } from '../Sidebar';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useClientGpxProcessing } from '../../../gpx/hooks/useClientGpxProcessing';
import { RouteLayer } from '../RouteLayer';
import { normalizeRoute } from '../../utils/routeUtils';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function MapViewContent() {
    const containerRef = useRef(null); // Add a ref for the container
    const { pois, updatePOIPosition, addPOI, updatePOI, poiMode, setPoiMode } = usePOIContext();
    const [isGpxDrawerOpen, setIsGpxDrawerOpen] = useState(false);
    const currentRouteId = useRef(null);
    const [hoverCoordinates, setHoverCoordinates] = useState(null);
    const hoverMarkerRef = useRef(null);
    const { processGpx } = useClientGpxProcessing();
    const { 
        addRoute, 
        deleteRoute, 
        setCurrentRoute, 
        currentRoute, 
        routes,
        headerSettings,
        updateHeaderSettings,
        setChangedSections
    } = useRouteContext();
    
    // Function to notify RouteContext of map state changes
    const notifyMapStateChange = useCallback(() => {
        setChangedSections(prev => ({...prev, mapState: true}));
    }, [setChangedSections]);
    
    // Initialize map using the extracted hook
    const {
        mapRef,
        mapInstance,
        isMapReady,
        isInitializing,
        streetsLayersLoaded,
        mapReady
    } = useMapInitializer({
        notifyMapStateChange,
        containerRef
    });
    
    // Set up map event handlers
    useMapEvents({
        mapInstance,
        isMapReady,
        currentRouteId,
        currentRoute,
        setHoverCoordinates,
        hoverCoordinates
    });

    // Function to add route click handler
    const addRouteClickHandler = useCallback((map, routeId) => {
        const mainLayerId = `${routeId}-main-line`;
        // Create click handler
        const clickHandler = (e) => {
            const route = routes.find((r) => r.routeId === routeId);
            if (route) {
                setCurrentRoute(route);
            }
        };
        // Remove existing handler if any
        map.off('click', mainLayerId, clickHandler);
        // Add new click handler
        map.on('click', mainLayerId, clickHandler);
    }, [routes, setCurrentRoute]);

    // Effect to add click handlers for existing routes when map loads
    useEffect(() => {
        if (!mapInstance.current || !isMapReady)
            return;
        const map = mapInstance.current;
        
        routes.forEach(route => {
            const routeId = route.routeId || `route-${route.id}`;
            if (map.getLayer(`${routeId}-main-line`)) {
                addRouteClickHandler(map, routeId);
            }
        });
    }, [isMapReady, routes, addRouteClickHandler]);

    // Update hover marker when coordinates change
    useEffect(() => {
        if (!mapInstance.current)
            return;
        // Remove existing marker
        if (hoverMarkerRef.current) {
            hoverMarkerRef.current.remove();
            hoverMarkerRef.current = null;
        }
        // Add new marker if we have coordinates
        if (hoverCoordinates) {
            const el = document.createElement('div');
            el.className = 'hover-marker';
            el.style.width = '16px';
            el.style.height = '16px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = '#ff0000';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
            
            // Create and add the marker without popup
            hoverMarkerRef.current = new mapboxgl.Marker(el)
                .setLngLat(hoverCoordinates)
                .addTo(mapInstance.current);
        }
    }, [hoverCoordinates]);
    
    // Initialize routes using the unified approach - moved to component top level
    const { initialized: routesInitialized } = useUnifiedRouteProcessing(routes, {
        batchProcess: true,
        onInitialized: () => {
            console.log('[MapView] Routes initialized with unified approach');
        }
    });
    
    // Animation effect removed as requested
    const handleUploadGpx = async (file, processedRoute) => {
        if (!file && !processedRoute) {
            setIsGpxDrawerOpen(true);
            return;
        }
        try {
            // Process the new GPX file or use provided processed route
            const gpxResult = processedRoute || (file ? await processGpx(file) : null);
            if (!gpxResult) {
                console.error('[MapView] No GPX result available');
                return;
            }
            // Normalize the new route
            const normalizedRoute = normalizeRoute(gpxResult);
            console.log('[MapView] Normalized route:', normalizedRoute);
            // Add to existing routes
            addRoute(normalizedRoute);
            // Set as current route
            setCurrentRoute(normalizedRoute);
            setIsGpxDrawerOpen(false);
        }
        catch (error) {
            console.error('[MapView] Error processing GPX:', error);
        }
    };

    const [isPOIDrawerOpen, setIsPOIDrawerOpen] = useState(false);
    const [dragPreview, setDragPreview] = useState(null);
    const [onPoiPlacementClick, setPoiPlacementClick] = useState(undefined);

    // Update cursor style and click handler based on POI mode
    useEffect(() => {
        if (!mapInstance.current || !isMapReady)
            return;
        const map = mapInstance.current;
        const canvas = map.getCanvas();
        if (!canvas)
            return;
        // Set cursor style based on POI mode
        canvas.style.cursor = poiMode === 'regular' ? 'crosshair' : '';
        // Handle clicks only in regular POI mode
        if (poiMode === 'regular') {
            const clickHandler = (e) => {
                if (onPoiPlacementClick) {
                    const coords = [e.lngLat.lng, e.lngLat.lat];
                    onPoiPlacementClick(coords);
                }
            };
            map.on('click', clickHandler);
            return () => {
                map.off('click', clickHandler);
                canvas.style.cursor = '';
            };
        }
    }, [poiMode, onPoiPlacementClick, isMapReady, dragPreview]);

    const handleAddPOI = () => {
        const newIsOpen = !isPOIDrawerOpen;
        setIsPOIDrawerOpen(newIsOpen);
        setPoiMode(newIsOpen ? 'regular' : 'none');
        if (!newIsOpen) {
            setPoiPlacementClick(undefined);
        }
    };

    const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
    const [selectedPOIDetails, setSelectedPOIDetails] = useState(null);
    const [selectedPOI, setSelectedPOI] = useState(null);

    const handlePOIClick = (poi) => {
        setSelectedPOI(poi);
    };

    const handlePOICreation = (icon, category, coordinates) => {
        console.log('handlePOICreation called with:', {
            icon,
            category,
            coordinates,
            coordinatesString: `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`
        });
        
        // Check if coordinates are valid
        if (!coordinates || coordinates.length !== 2 || 
            typeof coordinates[0] !== 'number' || 
            typeof coordinates[1] !== 'number') {
            console.error('Invalid coordinates:', coordinates);
            return;
        }
        
        // Log the current map center for comparison
        if (mapInstance.current) {
            const center = mapInstance.current.getCenter();
            console.log('Map center vs POI coordinates:', {
                mapCenter: [center.lng, center.lat],
                mapCenterString: `${center.lng.toFixed(6)}, ${center.lat.toFixed(6)}`,
                poiCoordinates: coordinates,
                poiCoordinatesString: `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`,
                difference: {
                    lng: coordinates[0] - center.lng,
                    lat: coordinates[1] - center.lat
                }
            });
        }
        
        // Clear any existing temporary POI details
        setSelectedPOIDetails(null);
        
        // Wait a moment for the UI to update before setting new details
        setTimeout(() => {
            console.log('Setting selectedPOIDetails with coordinates:', coordinates);
            setSelectedPOIDetails({ iconName: icon, category, coordinates });
            setDetailsDrawerOpen(true);
            setPoiMode('none');
            setIsPOIDrawerOpen(false);
        }, 0);
    };

    const handlePOIDetailsSave = async (details) => {
        if (!selectedPOIDetails)
            return;
        try {
            // Get current route ID
            const currentRouteId = currentRoute?.routeId || `route-${currentRoute?.id}`;
            
            console.log('POI details before saving:', {
                selectedPOIDetails,
                details,
                coordinatesString: `${selectedPOIDetails.coordinates[0].toFixed(6)}, ${selectedPOIDetails.coordinates[1].toFixed(6)}`
            });
            
            // Process photos if they exist
            let processedPhotos = [];
            if (details.photos && details.photos.length > 0) {
                console.log(`Processing ${details.photos.length} photos for POI`);
                processedPhotos = await createPOIPhotos(details.photos);
            }
            
            // Create POI with all details including photos
            const poiDetails = {
                type: 'draggable',
                coordinates: selectedPOIDetails.coordinates,
                name: details.name,
                description: details.description,
                category: selectedPOIDetails.category,
                icon: selectedPOIDetails.iconName,
                photos: processedPhotos
            };
            
            console.log('[POI_DETAILS_FOR_MONGODB]', JSON.stringify(poiDetails, null, 2));
            
            // Add POI to context
            console.log('Adding POI to context with coordinates:', {
                coordinates: poiDetails.coordinates,
                coordinatesString: `${poiDetails.coordinates[0].toFixed(6)}, ${poiDetails.coordinates[1].toFixed(6)}`,
                photoCount: processedPhotos.length
            });
            
            addPOI(poiDetails);
            
            // Clear temporary marker and close drawer
            setSelectedPOIDetails(null);
            setDetailsDrawerOpen(false);
        }
        catch (error) {
            console.error('Error saving POI:', error);
        }
    };

    const handleDeleteRoute = (routeId) => {
        console.log('[MapView][DELETE] Starting deletion process for route:', routeId);
        console.log('[MapView][DELETE] Current routes:', routes.map(r => ({
            id: r.id,
            routeId: r.routeId,
            name: r.name,
            _type: r._type
        })));
        if (!mapInstance.current) {
            console.error('[MapView][DELETE] Map instance not available');
            return;
        }
        const map = mapInstance.current;
        const style = map.getStyle();
        if (!style || !style.layers) {
            console.error('[MapView][DELETE] Map style or layers not available');
            return;
        }
        // Step 1: Find all layers associated with this route
        console.log('[MapView][DELETE] Finding layers for route:', routeId);
        const allLayers = style.layers
            .map(layer => layer.id)
            .filter(id => id.includes(routeId) || // Matches any layer containing the routeId
            id.startsWith(`unpaved-section-layer-${routeId}`) // Matches unpaved section layers
        );
        console.log('[MapView][DELETE] Found map style layers:', allLayers);
        // Add known layer patterns that might not be caught by the filter
        const knownLayerPatterns = [
            `${routeId}-main-border`,
            `${routeId}-main-line`,
            `${routeId}-hover`,
            `${routeId}-surface`,
            `${routeId}-unpaved-line`
        ];
        console.log('[MapView][DELETE] Added known layer patterns:', knownLayerPatterns);
        // Combine all layer IDs and remove duplicates
        const layersToRemove = [...new Set([...allLayers, ...knownLayerPatterns])];
        console.log('[MapView][DELETE] Final layers to remove:', layersToRemove);
        // Step 2: Remove all layers first
        console.log('[MapView][DELETE] Starting layer removal process');
        layersToRemove.forEach(layerId => {
            if (map.getLayer(layerId)) {
                try {
                    console.log('[MapView][DELETE] Removing layer:', layerId);
                    map.removeLayer(layerId);
                    console.log('[MapView][DELETE] Successfully removed layer:', layerId);
                }
                catch (error) {
                    console.error('[MapView][DELETE] Error removing layer:', layerId, error);
                }
            }
            else {
                console.log('[MapView][DELETE] Layer not found:', layerId);
            }
        });
        // Step 3: Find all sources associated with this route
        const mainSourceId = `${routeId}-main`;
        const unpavedSourceId = `${routeId}-unpaved`;
        const unpavedSectionPattern = `unpaved-section-${routeId}-`;
        // Get all source IDs from the style
        const allSources = Object.keys(style.sources || {})
            .filter(id => id === mainSourceId ||
            id === unpavedSourceId ||
            id.startsWith(unpavedSectionPattern));
        console.log('[MapView][DELETE] Found sources to remove:', allSources);
        // Step 4: Remove all sources after a brief delay to ensure layers are fully removed
        setTimeout(() => {
            console.log('[MapView][DELETE] Starting source removal process after delay');
            allSources.forEach(sourceId => {
                if (map.getSource(sourceId)) {
                    try {
                        console.log('[MapView][DELETE] Removing source:', sourceId);
                        map.removeSource(sourceId);
                        console.log('[MapView][DELETE] Successfully removed source:', sourceId);
                    }
                    catch (error) {
                        console.error('[MapView][DELETE] Error removing source:', sourceId, error);
                    }
                }
                else {
                    console.log('[MapView][DELETE] Source not found:', sourceId);
                }
            });
            // Log state after source removal
            const currentStyle = map.getStyle();
            console.log('[MapView][DELETE] Remaining sources:', Object.keys(currentStyle?.sources || {}));
        }, 100); // Small delay to ensure layers are fully removed
        // Step 5: Delete from context
        console.log('[MapView][DELETE] Calling deleteRoute with ID:', routeId);
        deleteRoute(routeId);
        // Clear local reference
        if (currentRouteId.current === routeId) {
            console.log('[MapView][DELETE] Clearing current route reference:', currentRouteId.current);
            currentRouteId.current = null;
        }
        // Log final state
        console.log('[MapView][DELETE] Deletion process complete for route:', routeId);
    };

    // Handle POI drag end
    const handlePOIDragEnd = useCallback((poi, newCoordinates) => {
        updatePOIPosition(poi.id, newCoordinates);
    }, [updatePOIPosition]);

    return (_jsx(MapProvider, { value: {
            map: mapInstance.current,
            isMapReady,
            isInitializing,
            hoverCoordinates,
            setHoverCoordinates,
            onPoiPlacementClick,
            setPoiPlacementClick,
            dragPreview,
            setDragPreview,
            poiPlacementMode: poiMode === 'regular',
            setPoiPlacementMode: (mode) => setPoiMode(mode ? 'regular' : 'none')
        }, children: _jsxs("div", { ref: containerRef, className: "w-full h-full relative", children: [
                    _jsx(MapHeader, { 
                        title: currentRoute?._loadedState?.name || currentRoute?.name || 'Untitled Route',
                        color: headerSettings.color,
                        logoUrl: headerSettings.logoUrl,
                        username: headerSettings.username
                    }),
                    _jsx("div", { className: "map-container", ref: mapRef }), 
                    
                    !isMapReady && (_jsxs(Box, { sx: {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }, children: [
                        _jsx(CircularProgress, { size: 60, sx: { mb: 2 } }), 
                        _jsx(Typography, { variant: "h6", color: "white", children: "Loading map..." })
                    ] })), 
                    
                    _jsx(Sidebar, { 
                        onUploadGpx: handleUploadGpx, 
                        onAddPhotos: () => { }, 
                        onAddPOI: handleAddPOI, 
                        mapReady: mapReady, 
                        onItemClick: () => { }, 
                        onToggleRoute: () => { }, 
                        onToggleGradient: () => { }, 
                        onToggleSurface: () => { }, 
                        onPlacePOI: () => { }, 
                        onDeleteRoute: handleDeleteRoute 
                    }), 
                    
                    isMapReady && (_jsxs("div", { className: "map-layers", children: [
                        /* Place POI Layer commented out */
                        /* _jsx(PlacePOILayer, {}, "place-poi-layer") */
                        _jsx(DraggablePOILayer, {
                            onPOIClick: handlePOIClick,
                            onPOIDragEnd: handlePOIDragEnd
                        }, "draggable-pois"),
                        _jsx(DraggableTextboxTabsLayer, {}, "draggable-textbox-tabs"),
                        _jsx(PhotoLayer, {}, "photo-layer"),
                        currentRoute && (_jsx(ClimbMarkers, { 
                            map: mapInstance.current, 
                            route: currentRoute 
                        }, "climb-markers"))
                    ] })), 
                    
                    isMapReady && (_jsx("div", { 
                        className: "header-customization-container", 
                        style: { 
                            position: 'absolute', 
                            top: '75px', 
                            right: '70px', 
                            zIndex: 1000 
                        }, 
                        children: _jsx(HeaderCustomization, {
                            color: headerSettings.color,
                            logoUrl: headerSettings.logoUrl,
                            username: headerSettings.username,
                            onSave: updateHeaderSettings
                        })
                    })),
                    
                    dragPreview && (_jsx(POIDragPreview, { 
                        icon: dragPreview.icon, 
                        category: dragPreview.category, 
                        onPlace: (coordinates) => {
                            handlePOICreation(dragPreview.icon, dragPreview.category, coordinates);
                            setDragPreview(null);
                        } 
                    })), 
                    
                    selectedPOIDetails && (_jsx(MapboxPOIMarker, { 
                        poi: {
                            id: 'temp-poi',
                            type: 'draggable',
                            coordinates: selectedPOIDetails.coordinates,
                            name: getIconDefinition(selectedPOIDetails.iconName)?.label || '',
                            category: selectedPOIDetails.category,
                            icon: selectedPOIDetails.iconName
                        } 
                    })), 
                    
                    // Unified route processing
                    isMapReady && mapInstance.current && (_jsxs(_Fragment, { children: [
                        // Render routes using RouteLayer component
                        _jsx(_Fragment, {
                            children: routes.map(route => (
                                _jsx(RouteLayer, {
                                    map: mapInstance.current,
                                    route: route
                                }, route.id || route.routeId)
                            ))
                        }),
                        
                        // Route information and components
                        currentRoute && (_jsxs(_Fragment, { children: [
                            _jsx("div", { 
                                className: "route-filename", 
                                children: currentRoute._type === 'loaded' && currentRoute._loadedState 
                                    ? currentRoute._loadedState.name 
                                    : currentRoute.name || 'Untitled Route' 
                            }),
                            _jsx(ElevationProfilePanel, { route: currentRoute }),
                            _jsx(DistanceMarkers, { map: mapInstance.current })
                        ] }))
                    ] })),
                    
                    selectedPOIDetails && (_jsx(POIDetailsDrawer, { 
                        isOpen: detailsDrawerOpen, 
                        onClose: () => {
                            setDetailsDrawerOpen(false);
                            setSelectedPOIDetails(null);
                            setPoiMode('none');
                            setIsPOIDrawerOpen(false);
                        }, 
                        iconName: selectedPOIDetails.iconName, 
                        category: selectedPOIDetails.category, 
                        onSave: handlePOIDetailsSave
                    })), 
                    
                    selectedPOI && (_jsx(POIViewer, { 
                        poi: selectedPOI, 
                        onClose: () => setSelectedPOI(null), 
                        onUpdate: updatePOI,
                        displayMode: "modal"
                    }))
                ] }) 
            })
    );
}

export default function MapView() {
    return (
        _jsx(RouteProvider, { 
            children: _jsx(TextboxTabsProvider, {
                children: _jsx(MapViewContent, {})
            }) 
        })
    );
}
