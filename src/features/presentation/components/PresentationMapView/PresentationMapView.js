import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { usePresentationRouteInit } from '../../hooks/usePresentationRouteInit';
import mapboxgl from 'mapbox-gl';
import SearchControl from '../SearchControl/SearchControl';
import 'mapbox-gl/dist/mapbox-gl.css';
import StyleControl, { MAP_STYLES } from '../StyleControl';
import PitchControl from '../../../map/components/PitchControl/PitchControl';
import { useRouteContext } from '../../../map/context/RouteContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import { RouteLayer } from '../../../map/components/RouteLayer';
import { PresentationSidebar } from '../PresentationSidebar';
import { PresentationElevationProfilePanel } from '../ElevationProfile/PresentationElevationProfilePanel';
import { PresentationPOILayer } from '../POILayer/PresentationPOILayer';
import { PresentationPhotoLayer } from '../PhotoLayer/PresentationPhotoLayer';
import { PresentationDistanceMarkers } from '../DistanceMarkers/PresentationDistanceMarkers';
import { MapProvider } from '../../../map/context/MapContext';
import { setupScaleListener } from '../../utils/scaleUtils';
import './PresentationMapView.css';
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
export default function PresentationMapView() {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const containerRef = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const { currentRoute, routes, currentLoadedState } = useRouteContext();
    const [hoverCoordinates, setHoverCoordinates] = useState(null);
    const hoverMarkerRef = useRef(null);
    const [isDistanceMarkersVisible, setIsDistanceMarkersVisible] = useState(true);
    
    // Set up scaling
    useEffect(() => {
        if (containerRef.current) {
            const cleanup = setupScaleListener(containerRef.current);
            return cleanup;
        }
    }, []);
    // Initialize routes using our presentation-specific hook
    const { initialized: routesInitialized } = usePresentationRouteInit({
        routes,
        onInitialized: () => {
            // Routes initialized
        }
    });
    // Update hover marker when coordinates change
    useEffect(() => {
        if (!mapInstance.current) return;
        
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
            el.style.pointerEvents = 'none'; // Make marker non-interactive to allow clicks to pass through
            
            // Create and add the marker without popup
            hoverMarkerRef.current = new mapboxgl.Marker(el)
                .setLngLat(hoverCoordinates)
                .addTo(mapInstance.current);
        }
    }, [hoverCoordinates]);
    
    // Store previous route reference
    // Store previous route reference and current route ID
    const previousRouteRef = useRef(null);
    const currentRouteIdRef = useRef(null);
    // Update currentRouteIdRef when currentRoute changes
    useEffect(() => {
        if (currentRoute?.routeId) {
            currentRouteIdRef.current = currentRoute.routeId;
        }
    }, [currentRoute]);

    // Update map state when route changes
    useEffect(() => {
        if (!isMapReady || !mapInstance.current || !currentRoute?.geojson)
            return;
        // Get route bounds
        if (currentRoute.geojson?.features?.[0]?.geometry?.type === 'LineString') {
            const feature = currentRoute.geojson.features[0];
            const coordinates = feature.geometry.coordinates;
            if (coordinates && coordinates.length > 0) {
                const bounds = new mapboxgl.LngLatBounds();
                coordinates.forEach((coord) => {
                    if (coord.length >= 2) {
                        bounds.extend([coord[0], coord[1]]);
                    }
                });
                // Find the middle coordinate of the route
                const middleIndex = Math.floor(coordinates.length / 2);
                const middleCoord = coordinates[middleIndex];
                if (!previousRouteRef.current) {
                    // For the first route, fit bounds to set initial zoom
                    mapInstance.current.fitBounds(bounds, {
                        padding: 50,
                        duration: 1500
                    });
                }
                else {
                    // For subsequent routes, pan to middle coordinate maintaining zoom
                    mapInstance.current.easeTo({
                        center: [middleCoord[0], middleCoord[1]],
                        zoom: mapInstance.current.getZoom(),
                        duration: 1500,
                        essential: true
                    });
                }
                // Update previous route reference
                previousRouteRef.current = currentRoute.routeId;
            }
        }
    }, [isMapReady, currentRoute]);
    // Function to handle device type changes (e.g., orientation changes)
    const handleDeviceTypeChange = useCallback(() => {
        if (!mapInstance.current) return;
        
        const isMobile = window.innerWidth <= 768;
        const map = mapInstance.current;
        
        
        // Update projection if needed
        const currentProjection = map.getProjection().name;
        const targetProjection = isMobile ? 'mercator' : 'globe';
        
        if (currentProjection !== targetProjection) {
            map.setProjection(targetProjection);
        }
        
        // Update terrain exaggeration
        if (map.getTerrain()) {
            map.setTerrain({
                source: 'mapbox-dem',
                exaggeration: isMobile ? 1.0 : 1.5
            });
        }
        
        // Update pitch if needed
        const currentPitch = map.getPitch();
        const targetPitch = isMobile ? 0 : 45;
        
        if (Math.abs(currentPitch - targetPitch) > 5) {
            map.setPitch(targetPitch);
        }
    }, []);
    
    // Add resize listener to handle orientation changes
    useEffect(() => {
        window.addEventListener('resize', handleDeviceTypeChange);
        return () => {
            window.removeEventListener('resize', handleDeviceTypeChange);
        };
    }, [handleDeviceTypeChange]);
    
    // Initialize map
    useEffect(() => {
        if (!mapRef.current)
            return;
        // Check if device is mobile
        const initialIsMobile = window.innerWidth <= 768;
        
        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: MAP_STYLES.satellite.url,
            bounds: [[144.5, -43.7], [148.5, -40.5]], // Tasmania bounds
            fitBoundsOptions: {
                padding: 0,
                pitch: initialIsMobile ? 0 : 45, // Use flat view on mobile
                bearing: 0
            },
            projection: initialIsMobile ? 'mercator' : 'globe', // Use mercator on mobile for better performance
            maxPitch: 85,
            width: '100%',
            height: '100%'
        });
        // Log map initialization events
        map.on('load', () => {
            try {
                // Add terrain synchronously
                
                map.addSource('mapbox-dem', {
                    type: 'raster-dem',
                    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    tileSize: 512,
                    maxzoom: 14
                });
                
                // Get current device type
                const isCurrentlyMobile = window.innerWidth <= 768;
                
                // Set terrain with appropriate exaggeration based on device
                map.setTerrain({
                    source: 'mapbox-dem',
                    exaggeration: isCurrentlyMobile ? 1.0 : 1.5 // Less exaggeration on mobile for better performance
                });
                
                // Add 3D buildings layer
                map.addLayer({
                    'id': '3d-buildings',
                    'source': 'composite',
                    'source-layer': 'building',
                    'filter': ['==', 'extrude', 'true'],
                    'type': 'fill-extrusion',
                    'minzoom': 15,
                    'paint': {
                        'fill-extrusion-color': '#aaa',
                        'fill-extrusion-height': [
                            'interpolate', ['linear'], ['zoom'],
                            15, 0,
                            15.05, ['get', 'height']
                        ],
                        'fill-extrusion-base': [
                            'interpolate', ['linear'], ['zoom'],
                            15, 0,
                            15.05, ['get', 'min_height']
                        ],
                        'fill-extrusion-opacity': 0.6
                    }
                });
                
            } catch (error) {
                console.error('[PresentationMapView] Error setting up terrain:', error);
            }
            
            setIsMapReady(true);
        });
        map.on('style.load', () => {
            // Style loaded
        });
        map.on('zoom', () => {
            const zoom = map.getZoom();
        });
        map.on('error', (e) => {
            console.error('[PresentationMapView] Map error:', e);
        });
        
        // Add mousemove event to set hover coordinates
        map.on('mousemove', (e) => {
            // Get mouse coordinates
            const mouseCoords = [e.lngLat.lng, e.lngLat.lat];
            
            // Get all route sources directly from the map
            const style = map.getStyle();
            if (!style || !style.sources) {
                return;
            }
            
            // Find all sources that might contain route data
            let routeSources = Object.entries(style.sources)
                .filter(([id, source]) => {
                    if (id.includes('-main') && source.type === 'geojson') {
                        const geoJsonSource = source;
                        if (typeof geoJsonSource.data === 'object' && 
                            geoJsonSource.data !== null && 
                            'features' in geoJsonSource.data && 
                            Array.isArray(geoJsonSource.data.features) && 
                            geoJsonSource.data.features.length > 0 &&
                            geoJsonSource.data.features[0].geometry?.type === 'LineString') {
                            return true;
                        }
                    }
                    return false;
                });
            
            
            // Try to find the active route
            let activeRouteSource = null;
            let activeRouteId = null;
            
            // First check if we have a current route ID from the ref
            if (currentRouteIdRef.current) {
                const currentSourceId = `${currentRouteIdRef.current}-main`;
                
                // Find this source in our routeSources
                const foundSource = routeSources.find(([id]) => id === currentSourceId);
                if (foundSource) {
                    activeRouteSource = foundSource[1];
                    activeRouteId = currentRouteIdRef.current;
                }
            }
            
            // If we couldn't find the route from the ref, try from the context
            if (!activeRouteSource && currentRoute) {
                const routeId = currentRoute.routeId || `route-${currentRoute.id}`;
                const sourceId = `${routeId}-main`;
                
                // Find this source in our routeSources
                const foundSource = routeSources.find(([id]) => id === sourceId);
                if (foundSource) {
                    activeRouteSource = foundSource[1];
                    activeRouteId = routeId;
                    // Update the ref if it's different
                    if (currentRouteIdRef.current !== routeId) {
                        currentRouteIdRef.current = routeId;
                    }
                }
            }
            
            // If we couldn't find the active route from context or ref, try to find it another way
            if (!activeRouteSource && routeSources.length > 0) {
                // Fallback to first route if no current route
                activeRouteSource = routeSources[0][1];
                activeRouteId = routeSources[0][0].replace('-main', '');
            }
            
            // If we don't have an active route, clear any marker and return
            if (!activeRouteSource) {
                if (hoverCoordinates) {
                    setHoverCoordinates(null);
                }
                return;
            }
            
            // Get coordinates from the active route
            const geoJsonData = activeRouteSource.data;
            const coordinates = geoJsonData.features[0].geometry.coordinates;
            
            
            // Find the closest point on the active route
            let closestPoint = null;
            let minDistance = Infinity;
            
            // Check all coordinates in the active route
            coordinates.forEach((coord) => {
                if (coord.length >= 2) {
                    const dx = coord[0] - mouseCoords[0];
                    const dy = coord[1] - mouseCoords[1];
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPoint = [coord[0], coord[1]];
                    }
                }
            });
            
            
            // Define a threshold distance - only show marker when close to the route
            const distanceThreshold = 0.0009; // Approximately 100m at the equator
            
            // If we found a closest point on the active route and it's within the threshold
            if (closestPoint && minDistance < distanceThreshold) {
                setHoverCoordinates(closestPoint);
            } else {
                // If no point found or too far from route, clear the marker
                setHoverCoordinates(null); // Always clear coordinates when outside threshold
            }
        });
        
        // Add mouseout event to clear hover coordinates when cursor leaves the map
        map.on('mouseout', () => {
            // Clear hover coordinates when mouse leaves the map
            setHoverCoordinates(null);
        });

        // Add Mapbox controls first
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
        
        // Check if device is mobile to add pitch control
        const controlIsMobile = window.innerWidth <= 768;
        if (controlIsMobile) {
            map.addControl(new PitchControl({
                isMobile: true,
                pitchStep: 15
            }), 'top-right');
        }
        
        // Add custom controls after
        map.addControl(new SearchControl(), 'top-right');
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
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
            document.head.removeChild(style);
        };
    }, []);
    const mapContextValue = useMemo(() => ({
        map: mapInstance.current,
        dragPreview: null,
        setDragPreview: () => { },
        isMapReady,
        isInitializing: false,
        hoverCoordinates,
        setHoverCoordinates,
        onPoiPlacementClick: undefined,
        setPoiPlacementClick: () => { },
        poiPlacementMode: false,
        setPoiPlacementMode: () => { }
    }), [isMapReady, hoverCoordinates]);
    return (_jsx(MapProvider, { value: mapContextValue, children: _jsxs("div", { ref: containerRef, className: "presentation-flex-container", children: [
                _jsx(PresentationSidebar, { 
                    isOpen: true,
                    isDistanceMarkersVisible: isDistanceMarkersVisible,
                    toggleDistanceMarkersVisibility: () => setIsDistanceMarkersVisible(!isDistanceMarkersVisible)
                }),
        _jsxs("div", { className: "presentation-map-area", children: [
            _jsx("div", { ref: mapRef, className: "map-container" }),
            !isMapReady && (_jsxs(Box, { sx: {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }, children: [_jsx(CircularProgress, { size: 60, sx: { mb: 2 } }), _jsx(Typography, { variant: "h6", color: "white", children: "Loading map..." })] })),
            isMapReady && mapInstance.current && (_jsxs(_Fragment, { children: [
                routes.map(route => {
                    // Debug route IDs
                    console.log('[PresentationMapView] Route:', {
                        id: route.id,
                        routeId: route.routeId,
                        name: route.name,
                        layerId: `${route.id || route.routeId}-main-line`
                    });
                    return _jsx(RouteLayer, { 
                        map: mapInstance.current, 
                        route: route,
                        key: route.id || route.routeId // Ensure we have a stable key
                    }, route.id || route.routeId);
                }),
                _jsx(PresentationPOILayer, { map: mapInstance.current }),
                _jsx(PresentationPhotoLayer, {}),
                currentRoute && (_jsxs(_Fragment, { children: [
                    isDistanceMarkersVisible && _jsx(PresentationDistanceMarkers, { map: mapInstance.current, route: currentRoute }),
                    _jsx("div", { className: "route-filename", children: currentRoute._loadedState?.name || currentRoute.name || "Unnamed Route" })
                ] })),
                currentRoute && (_jsx("div", { className: "elevation-container", children: _jsx(PresentationElevationProfilePanel, { route: currentRoute }) }))
            ] }))
        ] })
    ] }) }));
}
