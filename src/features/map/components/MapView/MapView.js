import { useRef, useEffect, useState, useCallback } from 'react';
import React from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapInitializer } from './hooks/useMapInitializer';
import { useMapEvents } from './hooks/useMapEvents';
import { safelyRemoveMap } from '../../utils/mapCleanup';
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
import POIDetailsDrawer from '../../../poi/components/POIDetailsDrawer/POIDetailsDrawer';
import MapboxPOIMarker from '../../../poi/components/MapboxPOIMarker';
import POIDragPreview from '../../../poi/components/POIDragPreview/POIDragPreview';
import DraggablePOILayer from '../../../poi/components/DraggablePOILayer/DraggablePOILayer.jsx';
import { ClimbMarkers } from '../ClimbMarkers/ClimbMarkers';
import LineLayer from '../../../lineMarkers/components/LineLayer/LineLayer.jsx';
import DirectLineLayer from '../../../lineMarkers/components/LineLayer/DirectLineLayer.jsx';
import { LineProvider, useLineContext } from '../../../lineMarkers/context/LineContext.jsx';
import { MapOverviewProvider } from '../../../presentation/context/MapOverviewContext.jsx';
import './MapView.css';
import './photo-fix.css'; // Nuclear option to force photos behind UI components
import { Sidebar } from '../Sidebar';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { useClientGpxProcessing } from '../../../gpx/hooks/useClientGpxProcessing';
import { RouteLayer } from '../RouteLayer';
import { normalizeRoute } from '../../utils/routeUtils';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function MapViewContent() {
    const containerRef = useRef(null); // Add a ref for the container
    const { pois, updatePOIPosition, addPOI, updatePOI, poiMode, setPoiMode } = usePOIContext();
    const { isDrawing } = useLineContext();
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
        setChangedSections,
        loadedLineData
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

    // Update hover point when coordinates change - using GeoJSON source
    useEffect(() => {
        if (!mapInstance.current || !isMapReady) return;
        
        // Update the GeoJSON source if we have coordinates
        if (hoverCoordinates) {
            try {
                const source = mapInstance.current.getSource('hover-point');
                if (source) {
                    source.setData({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: hoverCoordinates
                        },
                        properties: {}
                    });
                    
                    // Show the layer
                    mapInstance.current.setLayoutProperty('hover-point', 'visibility', 'visible');
                }
            } catch (error) {
                console.error('[MapView] Error updating hover point:', error);
            }
        } else {
            // Hide the layer when no coordinates
            try {
                mapInstance.current.setLayoutProperty('hover-point', 'visibility', 'none');
            } catch (error) {
                // Ignore errors when hiding (might happen during initialization)
            }
        }
    }, [hoverCoordinates, isMapReady]);
    
    // Effect to fit bounds when current route changes
    useEffect(() => {
        if (!mapInstance.current || !isMapReady || !currentRoute?.geojson)
            return;
        
        // Get route bounds
        if (currentRoute.geojson?.features?.[0]?.geometry?.type === 'LineString') {
            const feature = currentRoute.geojson.features[0];
            const coordinates = feature.geometry.coordinates;
            
            if (coordinates && coordinates.length > 0) {
                try {
                    const bounds = new mapboxgl.LngLatBounds();
                    
                    coordinates.forEach((coord) => {
                        if (coord.length >= 2) {
                            bounds.extend([coord[0], coord[1]]);
                        }
                    });
                    
                    // Always fit bounds to show the entire route with substantial padding
                    mapInstance.current.fitBounds(bounds, {
                        padding: 200,  // Significant padding to zoom out and show more context
                        duration: 1500
                    });
                } catch (error) {
                    console.error('[MapView] Error fitting bounds to route:', error);
                }
            }
        }
    }, [mapInstance, isMapReady, currentRoute]);
    
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
        // Set cursor style based on POI or line drawing mode
        canvas.style.cursor = (poiMode === 'regular' || isDrawing) ? 'crosshair' : '';
        // Handle clicks only in regular POI mode
        if (poiMode === 'regular' && !isDrawing) {
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
    }, [poiMode, onPoiPlacementClick, isMapReady, dragPreview, isDrawing]);

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
            
            // Create POI with all details
            const poiDetails = {
                type: 'draggable',
                coordinates: selectedPOIDetails.coordinates,
                name: details.name,
                description: details.description,
                category: selectedPOIDetails.category,
                icon: selectedPOIDetails.iconName,
                // Include the Google Places link so POIContext can process it
                googlePlacesLink: details.googlePlacesLink
            };

            console.log('[POI_DETAILS_FOR_MONGODB]', JSON.stringify(poiDetails, null, 2));
            
            // Add POI to context
            console.log('Adding POI to context with coordinates:', {
                coordinates: poiDetails.coordinates,
                coordinatesString: `${poiDetails.coordinates[0].toFixed(6)}, ${poiDetails.coordinates[1].toFixed(6)}`
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

    // Create the MapProvider component
    const mapProviderProps = {
        value: {
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
        }
    };

    // Create the main container div
    const containerProps = {
        ref: containerRef,
        className: "w-full h-full relative"
    };

    // Create the MapHeader component
    const mapHeaderProps = {
        title: currentRoute?._loadedState?.name || currentRoute?.name || 'Untitled Route',
        color: headerSettings.color,
        logoUrl: headerSettings.logoUrl,
        username: headerSettings.username,
        type: currentRoute?._loadedState?.type || currentRoute?.type,
        eventDate: currentRoute?._loadedState?.eventDate || currentRoute?.eventDate
    };

    // Create the map container div
    const mapContainerProps = {
        className: "map-container",
        ref: mapRef
    };

    // Create the loading overlay
    const loadingOverlayProps = {
        sx: {
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
        }
    };

    // Create the CircularProgress component
    const circularProgressProps = {
        size: 60,
        sx: { mb: 2 }
    };

    // Create the Typography component
    const typographyProps = {
        variant: "h6",
        color: "white"
    };

    // Create the Sidebar component
    const sidebarProps = {
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
    };

    // Create the map layers div
    const mapLayersProps = {
        className: "map-layers"
    };

    // Create the DraggablePOILayer component
    const draggablePOILayerProps = {
        onPOIClick: handlePOIClick,
        onPOIDragEnd: handlePOIDragEnd,
        key: "draggable-pois"
    };

    // Create the PhotoLayer component
    const photoLayerProps = {
        key: "photo-layer"
    };

    // Create the LineLayer component
    const lineLayerProps = {
        key: "line-layer"
    };

    // Create the ClimbMarkers component
    const climbMarkersProps = {
        map: mapInstance.current,
        route: currentRoute,
        key: "climb-markers"
    };

    // Create the header customization container div
    const headerCustomizationContainerProps = {
        className: "header-customization-container",
        style: {
            position: 'absolute',
            top: '75px',
            right: '70px',
            zIndex: 1000
        }
    };

    // Create the HeaderCustomization component
    const headerCustomizationProps = {
        color: headerSettings.color,
        logoUrl: headerSettings.logoUrl,
        username: headerSettings.username,
        onSave: updateHeaderSettings
    };

    // Create the POIDragPreview component props if dragPreview exists
    const poiDragPreviewProps = dragPreview ? {
        icon: dragPreview.icon,
        category: dragPreview.category,
        onPlace: (coordinates) => {
            handlePOICreation(dragPreview.icon, dragPreview.category, coordinates);
            setDragPreview(null);
        }
    } : null;

    // Create the MapboxPOIMarker component props if selectedPOIDetails exists
    const mapboxPOIMarkerProps = selectedPOIDetails ? {
        poi: {
            id: 'temp-poi',
            type: 'draggable',
            coordinates: selectedPOIDetails.coordinates,
            name: getIconDefinition(selectedPOIDetails.iconName)?.label || '',
            category: selectedPOIDetails.category,
            icon: selectedPOIDetails.iconName
        }
    } : null;

    // Create the route filename div
    const routeFilenameProps = {
        className: "route-filename"
    };

    // Create the ElevationProfilePanel component
    const elevationProfilePanelProps = {
        route: currentRoute
    };

    // Create the DistanceMarkers component
    const distanceMarkersProps = {
        map: mapInstance.current
    };

    // Create the POIDetailsDrawer component props if selectedPOIDetails exists
    const poiDetailsDrawerProps = selectedPOIDetails ? {
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
    } : null;

    // Create the POIViewer component props if selectedPOI exists
    const poiViewerProps = selectedPOI ? {
        poi: selectedPOI,
        onClose: () => setSelectedPOI(null),
        onUpdate: updatePOI
    } : null;

    return React.createElement(MapProvider, mapProviderProps, 
        React.createElement('div', containerProps, [
            // MapHeader
            React.createElement(MapHeader, mapHeaderProps),
            
            // Map container
            React.createElement('div', mapContainerProps),
            
            // Loading overlay
            !isMapReady && React.createElement(Box, loadingOverlayProps, [
                React.createElement(CircularProgress, circularProgressProps),
                React.createElement(Typography, typographyProps, "Loading map...")
            ]),
            
            // Sidebar
            React.createElement(Sidebar, sidebarProps),
            
            // Map layers
            isMapReady && React.createElement('div', mapLayersProps, [
                React.createElement(DraggablePOILayer, draggablePOILayerProps),
                React.createElement(PhotoLayer, photoLayerProps),
                React.createElement(LineLayer, lineLayerProps),
                // Add DirectLineLayer for loaded line data
                loadedLineData && loadedLineData.length > 0 && React.createElement(DirectLineLayer, {
                    map: mapInstance.current,
                    lines: loadedLineData,
                    key: "direct-line-layer"
                }),
                currentRoute && React.createElement(ClimbMarkers, climbMarkersProps)
            ]),
            
            // Header customization
            isMapReady && React.createElement('div', headerCustomizationContainerProps,
                React.createElement(HeaderCustomization, headerCustomizationProps)
            ),
            
            // POI drag preview
            dragPreview && React.createElement(POIDragPreview, poiDragPreviewProps),
            
            // Selected POI details marker
            selectedPOIDetails && React.createElement(MapboxPOIMarker, mapboxPOIMarkerProps),
            
            // Unified route processing
            isMapReady && mapInstance.current && React.createElement(React.Fragment, null, [
                // Render routes using RouteLayer component
                React.createElement(React.Fragment, null,
                    routes.map(route => 
                        React.createElement(RouteLayer, {
                            map: mapInstance.current,
                            route: route,
                            key: route.id || route.routeId
                        })
                    )
                ),
                
                // Route information and components
                currentRoute && React.createElement(React.Fragment, null, [
                    React.createElement('div', routeFilenameProps, 
                        currentRoute._type === 'loaded' && currentRoute._loadedState 
                            ? currentRoute._loadedState.name 
                            : currentRoute.name || 'Untitled Route'
                    ),
                    React.createElement(ElevationProfilePanel, elevationProfilePanelProps),
                    React.createElement(DistanceMarkers, distanceMarkersProps)
                ])
            ]),
            
            // POI details drawer
            selectedPOIDetails && React.createElement(POIDetailsDrawer, poiDetailsDrawerProps),
            
            // Selected POI viewer
            selectedPOI && React.createElement(POIViewer, poiViewerProps)
        ])
    );
}

export default function MapView() {
    console.log('[MapView] Creating MapView component with provider structure: MapOverviewProvider → RouteProvider → LineProvider → MapViewContent');
    return React.createElement(MapOverviewProvider, { 
        children: React.createElement(RouteProvider, {
            children: React.createElement(LineProvider, {
                children: React.createElement(MapViewContent, {})
            })
        })
    });
}
