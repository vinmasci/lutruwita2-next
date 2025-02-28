import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { DistanceMarkers } from '../DistanceMarkers/DistanceMarkers';
import StyleControl, { MAP_STYLES } from '../StyleControl/StyleControl';
import SearchControl from '../SearchControl/SearchControl';
import { ElevationProfilePanel } from '../../../gpx/components/ElevationProfile/ElevationProfilePanel';
import { MapProvider } from '../../context/MapContext';
import { RouteProvider, useRouteContext } from '../../context/RouteContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import { PhotoLayer } from '../../../photo/components/PhotoLayer/PhotoLayer';
import { POIViewer } from '../../../poi/components/POIViewer/POIViewer';
import { getIconDefinition } from '../../../poi/constants/poi-icons';
import POIDetailsDrawer from '../../../poi/components/POIDetailsDrawer/POIDetailsDrawer';
import MapboxPOIMarker from '../../../poi/components/MapboxPOIMarker';
import POIDragPreview from '../../../poi/components/POIDragPreview/POIDragPreview';
import PlacePOILayer from '../../../poi/components/PlacePOILayer/PlacePOILayer';
import '../../../poi/components/PlacePOILayer/PlacePOILayer.css';
import './MapView.css';
import { Sidebar } from '../Sidebar';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useClientGpxProcessing } from '../../../gpx/hooks/useClientGpxProcessing';
import { RouteLayer } from '../RouteLayer';
import { normalizeRoute } from '../../utils/routeUtils';
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
// Debug function for road layer
const debugRoadLayer = (map) => {
    console.log('[DEBUG] Checking road layer...');
    // Log all available layers
    const style = map.getStyle();
    const allLayers = style?.layers || [];
    console.log('[DEBUG] All layers:', allLayers.map(l => ({
        id: l.id,
        type: l.type,
        source: l['source'],
        'source-layer': l['source-layer']
    })));
    // Check our specific layer
    const roadLayer = map.getLayer('custom-roads');
    console.log('[DEBUG] Road layer:', roadLayer);
    // Try to get some features
    if (map.isStyleLoaded()) {
        const bounds = map.getBounds();
        if (!bounds) {
            console.log('[DEBUG] No bounds available');
            return;
        }
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const features = map.queryRenderedFeatures([
            map.project(sw),
            map.project(ne)
        ], {
            layers: ['custom-roads']
        });
        console.log('[DEBUG] Found features:', features.length);
        if (features.length > 0) {
            console.log('[DEBUG] Sample feature:', {
                properties: features[0].properties,
                geometry: features[0].geometry
            });
        }
    }
};
function MapViewContent() {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [streetsLayersLoaded, setStreetsLayersLoaded] = useState(false);
    const { pois, updatePOIPosition, addPOI, updatePOI, poiMode, setPoiMode } = usePOIContext();
    const [mapReady, setMapReady] = useState(false);
    const [isGpxDrawerOpen, setIsGpxDrawerOpen] = useState(false);
    const currentRouteId = useRef(null);
    const [hoverCoordinates, setHoverCoordinates] = useState(null);
    const hoverMarkerRef = useRef(null);
    const { processGpx } = useClientGpxProcessing();
    const { addRoute, deleteRoute, setCurrentRoute, currentRoute, routes } = useRouteContext();
    // Function to add route click handler
    const addRouteClickHandler = useCallback((map, routeId) => {
        const mainLayerId = `${routeId}-main-line`;
        // Create click handler
        const clickHandler = (e) => {
            console.log('[MapView] Route layer clicked:', mainLayerId);
            const route = routes.find((r) => r.routeId === routeId);
            if (route) {
                console.log('[MapView] Found matching route:', route.routeId);
                setCurrentRoute(route);
            }
            else {
                console.log('[MapView] No matching route found for ID:', routeId);
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
        console.log('[MapView] Adding click handlers for routes:', routes);
        routes.forEach(route => {
            const routeId = route.routeId || `route-${route.id}`;
            console.log('[MapView] Checking for route layer:', `${routeId}-main-line`);
            if (map.getLayer(`${routeId}-main-line`)) {
                console.log('[MapView] Adding click handler for route:', routeId);
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
            el.style.width = '6px';
            el.style.height = '6px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = '#ee5253';
            el.style.border = '2px solid white';
            hoverMarkerRef.current = new mapboxgl.Marker(el)
                .setLngLat(hoverCoordinates)
                .addTo(mapInstance.current);
        }
    }, [hoverCoordinates]);
    // Reusable function to render a route on the map
    const renderRouteOnMap = useCallback(async (route, options = {}) => {
        if (!mapInstance.current || !isMapReady) {
            console.error('Map is not ready');
            return;
        }
        
        // Default options
        const { fitBounds = true } = options;
        
        const map = mapInstance.current;
        const routeId = route.routeId || `route-${route.id}`;
        console.log('[MapView] Rendering route:', routeId, 'with options:', { fitBounds });
        
        const mainLayerId = `${routeId}-main-line`;
        const borderLayerId = `${routeId}-main-border`;
        const mainSourceId = `${routeId}-main`;
        
        // Clean up existing layers
        if (map.getLayer(borderLayerId))
            map.removeLayer(borderLayerId);
        if (map.getLayer(mainLayerId))
            map.removeLayer(mainLayerId);
        if (map.getSource(mainSourceId))
            map.removeSource(mainSourceId);
            
        // Add the main route source and layers
        map.addSource(mainSourceId, {
            type: 'geojson',
            data: route.geojson,
            generateId: true,
            tolerance: 0.5
        });
        
        // Add main route layers
        map.addLayer({
            id: borderLayerId,
            type: 'line',
            source: mainSourceId,
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
                visibility: 'visible'
            },
            paint: {
                'line-color': '#ffffff',
                'line-width': 5,
                'line-opacity': 1
            }
        });
        
        map.addLayer({
            id: mainLayerId,
            type: 'line',
            source: mainSourceId,
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
                visibility: 'visible'
            },
            paint: {
                'line-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#ff8f8f',
                    route.color || '#ee5253'  // Use route color or default
                ],
                'line-width': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    5,
                    3
                ],
                'line-opacity': 1
            }
        });
        
        // Render unpaved sections if they exist
        if (route.unpavedSections?.length) {
            route.unpavedSections?.forEach((section, index) => {
                const sourceId = `unpaved-section-${routeId}-${index}`;
                const layerId = `unpaved-section-layer-${routeId}-${index}`;
                
                // Clean up existing
                if (map.getSource(sourceId)) {
                    map.removeLayer(layerId);
                    map.removeSource(sourceId);
                }
                
                // Add source with surface property
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {
                            surface: section.surfaceType
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: section.coordinates
                        }
                    }
                });
                
                // Add white dashed line for unpaved segments
                map.addLayer({
                    id: layerId,
                    type: 'line',
                    source: sourceId,
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': '#ffffff',  // Keep white for better visibility
                        'line-width': 2,
                        'line-dasharray': [1, 3]
                    }
                });
            });
        }
        
        // Add click handler
        addRouteClickHandler(map, routeId);
        
        // Only fit bounds if requested
        if (fitBounds) {
            // Get coordinates from the GeoJSON
            const feature = route.geojson.features[0];
            
            // Wait briefly for layers to be ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Fit bounds to show the route
            const bounds = new mapboxgl.LngLatBounds();
            feature.geometry.coordinates.forEach((coord) => {
                if (coord.length >= 2) {
                    bounds.extend([coord[0], coord[1]]);
                }
            });
            
            map.fitBounds(bounds, {
                padding: 50,
                maxZoom: 13,
                minZoom: 13
            });
        }
    }, [isMapReady, addRouteClickHandler]);
    // Effect to render current route when it changes
    useEffect(() => {
        if (!currentRoute || !mapInstance.current || !isMapReady)
            return;
        console.log('[MapView] Current route changed:', currentRoute.id);
        // For new routes (GPX uploads), use renderRouteOnMap
        if (currentRoute._type === 'fresh') {
            renderRouteOnMap(currentRoute).catch(error => {
                console.error('[MapView] Error rendering route:', error);
            });
        }
        // For loaded routes (from MongoDB), RouteLayer component handles rendering
    }, [currentRoute, isMapReady, renderRouteOnMap]);
    
    // Effect to re-render the route when its color changes
    useEffect(() => {
        if (!currentRoute || !mapInstance.current || !isMapReady || currentRoute._type !== 'fresh')
            return;
            
        console.log('[MapView] Checking for color change:', {
            routeId: currentRoute.routeId || currentRoute.id,
            color: currentRoute.color
        });
        
        // For fresh routes, re-render when color changes, but don't zoom to fit bounds
        renderRouteOnMap(currentRoute, { fitBounds: false }).catch(error => {
            console.error('[MapView] Error re-rendering route after color change:', error);
        });
    }, [currentRoute?.color, isMapReady, renderRouteOnMap]);

    // Function to directly update route color on the map without re-rendering
    const updateRouteColor = useCallback((routeId, color) => {
        if (!mapInstance.current || !isMapReady) return;
        
        const map = mapInstance.current;
        const mainLayerId = `${routeId}-main-line`;
        
        // Check if the layer exists
        if (map.getLayer(mainLayerId)) {
            console.log('[MapView] Directly updating route color for', mainLayerId, 'to', color);
            
            // Update the line-color paint property
            map.setPaintProperty(mainLayerId, 'line-color', [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                '#ff8f8f',
                color || '#ee5253'
            ]);
        }
    }, [isMapReady]);
    
    // Force re-render of route when route color changes
    const routeColorRef = useRef(currentRoute?.color);
    useEffect(() => {
        // Check if the color has changed
        if (currentRoute?.color !== routeColorRef.current) {
            console.log('[MapView] Route color changed from', routeColorRef.current, 'to', currentRoute?.color);
            
            // Update the color reference
            const oldColor = routeColorRef.current;
            routeColorRef.current = currentRoute?.color;
            
            if (currentRoute && mapInstance.current && isMapReady) {
                const routeId = currentRoute.routeId || `route-${currentRoute.id}`;
                
                // First try to update the color directly
                updateRouteColor(routeId, currentRoute.color);
                
                // If that doesn't work, fall back to re-rendering the route
                if (currentRoute._type === 'fresh') {
                    renderRouteOnMap(currentRoute, { fitBounds: false }).catch(error => {
                        console.error('[MapView] Error force re-rendering route after color change:', error);
                    });
                }
            }
        }
    }, [currentRoute, isMapReady, renderRouteOnMap, updateRouteColor]);
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
                console.log('[MapView] Map clicked in regular mode:', e.lngLat);
                if (onPoiPlacementClick) {
                    const coords = [e.lngLat.lng, e.lngLat.lat];
                    console.log('[MapView] Calling onPoiPlacementClick with coords:', coords);
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
        setSelectedPOIDetails({ iconName: icon, category, coordinates });
        setDetailsDrawerOpen(true);
        setPoiMode('none');
        setIsPOIDrawerOpen(false);
    };
    const handlePOIDetailsSave = async (details) => {
        if (!selectedPOIDetails)
            return;
        try {
            // Get current route ID
            const currentRouteId = currentRoute?.routeId || `route-${currentRoute?.id}`;
            // Create POI with all details
            const poiDetails = {
                type: 'draggable',
                coordinates: selectedPOIDetails.coordinates,
                name: details.name,
                description: details.description,
                category: selectedPOIDetails.category,
                icon: selectedPOIDetails.iconName,
            };
            console.log('[POI_DETAILS_FOR_MONGODB]', JSON.stringify(poiDetails, null, 2));
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
    // Initialize map
    useEffect(() => {
        if (!mapRef.current)
            return;
        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: MAP_STYLES.satellite.url,
            bounds: [[144.5, -43.7], [148.5, -40.5]], // Tasmania bounds
            fitBoundsOptions: {
                padding: 0,
                pitch: 45,
                bearing: 0
            },
            projection: 'globe',
            maxPitch: 85
        });
        // Add terrain
        map.on('load', () => {
            map.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14
            });
            // Set terrain configuration
            map.setTerrain({
                source: 'mapbox-dem',
                exaggeration: 1.5
            });
            map.on('zoom', () => {
                console.log('[MapView] Zoom changed:', map.getZoom());
            });
            // Add custom roads layer
            const tileUrl = 'https://api.maptiler.com/tiles/5dd3666f-1ce4-4df6-9146-eda62a200bcb/{z}/{x}/{y}.pbf?key=DFSAZFJXzvprKbxHrHXv';
            map.addSource('australia-roads', {
                type: 'vector',
                tiles: [tileUrl],
                minzoom: 12,
                maxzoom: 14
            });
            map.addLayer({
                id: 'custom-roads',
                type: 'line',
                source: 'australia-roads',
                'source-layer': 'lutruwita',
                minzoom: 12,
                maxzoom: 14,
                paint: {
                    'line-opacity': 1,
                    'line-color': [
                        'match',
                        ['get', 'surface'],
                        ['paved', 'asphalt', 'concrete', 'compacted', 'sealed', 'bitumen', 'tar'],
                        '#4A90E2',
                        ['unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth'],
                        '#D35400',
                        '#888888'
                    ],
                    'line-width': 2
                }
            });
            // Add debug call after layer is added
            map.once('idle', () => {
                debugRoadLayer(map);
            });
            setStreetsLayersLoaded(true);
            setIsMapReady(true);
            setMapReady(true);
        });
        // Add controls
        map.addControl(new SearchControl(), 'top-right');
        map.addControl(new mapboxgl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true
        }), 'top-right');
        map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
        map.addControl(new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true
        }), 'top-right');
        // Add style control last so it appears at bottom
        map.addControl(new StyleControl(), 'top-right');
        // Style controls
        const style = document.createElement('style');
        style.textContent = `
      .mapboxgl-ctrl-group {
        background-color: rgba(35, 35, 35, 0.9) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      .mapboxgl-ctrl-group button {
        width: 36px !important;
        height: 36px !important;
      }
      .mapboxgl-ctrl-icon {
        filter: invert(1);
      }
      .mapboxgl-ctrl-geolocate {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    `;
        document.head.appendChild(style);
        mapInstance.current = map;
        return () => {
            map.remove();
            document.head.removeChild(style);
        };
    }, []);
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
        }, children: _jsxs("div", { className: "w-full h-full relative", children: [_jsx("div", { ref: mapRef, style: { width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 } }), !isMapReady && (_jsxs(Box, { sx: {
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
                    }, children: [_jsx(CircularProgress, { size: 60, sx: { mb: 2 } }), _jsx(Typography, { variant: "h6", color: "white", children: "Loading map..." })] })), _jsx(Sidebar, { onUploadGpx: handleUploadGpx, onAddPhotos: () => { }, onAddPOI: handleAddPOI, mapReady: mapReady, onItemClick: () => { }, onToggleRoute: () => { }, onToggleGradient: () => { }, onToggleSurface: () => { }, onPlacePOI: () => { }, onDeleteRoute: handleDeleteRoute }), isMapReady && (_jsxs("div", { className: "map-layers", children: [_jsx(PhotoLayer, {}, "photo-layer"), _jsx(PlacePOILayer, {}, "place-poi-layer"), _jsx("div", { children: pois
                                .filter(poi => poi.type === 'draggable')
                                .map(poi => (_jsx(MapboxPOIMarker, { poi: poi, onDragEnd: handlePOIDragEnd, onClick: () => handlePOIClick(poi) }, poi.id))) }, "draggable-pois")] })), dragPreview && (_jsx(POIDragPreview, { icon: dragPreview.icon, category: dragPreview.category, onPlace: (coordinates) => {
                        handlePOICreation(dragPreview.icon, dragPreview.category, coordinates);
                        setDragPreview(null);
                    } })), selectedPOIDetails && (_jsx(MapboxPOIMarker, { poi: {
                        id: 'temp-poi',
                        type: 'draggable',
                        coordinates: selectedPOIDetails.coordinates,
                        name: getIconDefinition(selectedPOIDetails.iconName)?.label || '',
                        category: selectedPOIDetails.category,
                        icon: selectedPOIDetails.iconName
                    } })), isMapReady && mapInstance.current && (_jsxs(_Fragment, { children: [routes.filter(route => route._type === 'loaded').map(route => (_jsx(RouteLayer, { map: mapInstance.current, route: route }, route.routeId))), currentRoute && (_jsxs(_Fragment, { children: [_jsx("div", { className: "route-filename", children: currentRoute._type === 'loaded' && currentRoute._loadedState ? currentRoute._loadedState.name : currentRoute.name || 'Untitled Route' }), _jsx(ElevationProfilePanel, { route: currentRoute }), _jsx(DistanceMarkers, { map: mapInstance.current })] }))] })), selectedPOIDetails && (_jsx(POIDetailsDrawer, { isOpen: detailsDrawerOpen, onClose: () => {
                        setDetailsDrawerOpen(false);
                        setSelectedPOIDetails(null);
                        setPoiMode('none');
                        setIsPOIDrawerOpen(false);
                    }, iconName: selectedPOIDetails.iconName, category: selectedPOIDetails.category, onSave: handlePOIDetailsSave })), selectedPOI && (_jsx(POIViewer, { poi: selectedPOI, onClose: () => setSelectedPOI(null), onUpdate: updatePOI }))] }) }));
}
export default function MapView() {
    return (_jsx(RouteProvider, { children: _jsx(MapViewContent, {}) }));
}
