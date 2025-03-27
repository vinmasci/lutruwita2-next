import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import useUnifiedRouteProcessing from '../../../map/hooks/useUnifiedRouteProcessing';
import mapboxgl from 'mapbox-gl';
import SearchControl from '../SearchControl/SearchControl';
import 'mapbox-gl/dist/mapbox-gl.css';
import StyleControl, { MAP_STYLES } from '../StyleControl';
import PitchControl from '../../../map/components/PitchControl/PitchControl';
import { useRouteContext } from '../../../map/context/RouteContext';
import MapHeader from '../../../map/components/MapHeader/MapHeader';
import { Box, CircularProgress, Typography } from '@mui/material';
import { RouteLayer } from '../../../map/components/RouteLayer';
import { ClimbMarkers } from '../../../map/components/ClimbMarkers/ClimbMarkers';
import { PresentationSidebar } from '../PresentationSidebar';
import { PresentationElevationProfilePanel } from '../ElevationProfile/PresentationElevationProfilePanel';
import { PresentationPOILayer } from '../POILayer/PresentationPOILayer';
import { PresentationPhotoLayer } from '../PhotoLayer/PresentationPhotoLayer';
import { PresentationDistanceMarkers } from '../DistanceMarkers/PresentationDistanceMarkers';
import DirectPresentationLineLayer from '../LineLayer/DirectPresentationLineLayer.jsx';
import { MapProvider } from '../../../map/context/MapContext';
import { LineProvider } from '../../../lineMarkers/context/LineContext.jsx';
import { setupScaleListener } from '../../utils/scaleUtils';
import { setViewportHeight } from '../../../../utils/viewportUtils';
import './PresentationMapView.css';
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
export default function PresentationMapView(props) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const containerRef = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const { currentRoute, routes, currentLoadedState, headerSettings } = useRouteContext();
    const [hoverCoordinates, setHoverCoordinates] = useState(null);
    const hoverMarkerRef = useRef(null);
    const [isDistanceMarkersVisible, setIsDistanceMarkersVisible] = useState(true);
    const [isClimbFlagsVisible, setIsClimbFlagsVisible] = useState(true);
    const [isLineMarkersVisible, setIsLineMarkersVisible] = useState(true);
    
    // Set up scaling
    useEffect(() => {
        if (containerRef.current) {
            const cleanup = setupScaleListener(containerRef.current);
            return cleanup;
        }
    }, []);
    
    // Set up viewport height for mobile
    useEffect(() => {
        // Set the viewport height initially
        setViewportHeight();
        
        // Update on resize and orientation change
        const handleResize = () => {
            setViewportHeight();
        };
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);
    
    // Add initial scroll adjustment for mobile
    useEffect(() => {
        // Check if we're on mobile
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Small timeout to ensure the DOM is ready
            setTimeout(() => {
                // Force scroll to top
                window.scrollTo(0, 0);
            }, 100);
        }
    }, []);
    // Initialize routes using the unified route processing hook
    const { initialized: routesInitialized } = useUnifiedRouteProcessing(routes, {
        batchProcess: true,
        onInitialized: () => {
            console.log('[PresentationMapView] Routes initialized with unified approach');
        }
    });
    
    // Update hover marker when coordinates change - using GeoJSON source
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
                console.error('[PresentationMapView] Error updating hover point:', error);
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
            // Always fit bounds to show the entire route with substantial padding for maximum context
            mapInstance.current.fitBounds(bounds, {
                padding: 200,  // Significantly increased padding to zoom out much more
                duration: 1500
            });
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
        
        // Import and set map instance in the mapOperationsQueue
        import('../../../map/utils/mapOperationsQueue').then(({ setMapInstance }) => {
            setMapInstance(map);
            console.log('[PresentationMapView] Map instance set in mapOperationsQueue');
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
                
                // Add hover point source and layer
                map.addSource('hover-point', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [0, 0] // Initial coordinates
                        },
                        properties: {}
                    }
                });
                
                map.addLayer({
                    id: 'hover-point',
                    type: 'circle',
                    source: 'hover-point',
                    paint: {
                        'circle-radius': 8,
                        'circle-color': '#ff0000',
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff',
                        'circle-opacity': 0.8
                    }
                });
                
                // Initially hide the hover point layer
                map.setLayoutProperty('hover-point', 'visibility', 'none');
                
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
            // Skip trace marker functionality on mobile devices to prevent touch event interception
            // This fixes the double-press issue with POIs, line components, climb categories, and route list
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                // Clear any existing hover coordinates on mobile
                if (hoverCoordinates) {
                    setHoverCoordinates(null);
                }
                return;
            }
            
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
            const distanceThreshold = 0.0045; // Approximately 500m at the equator
            
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
                // Remove the hover point layer and source if they exist
                if (mapInstance.current.getLayer('hover-point')) {
                    mapInstance.current.removeLayer('hover-point');
                }
                if (mapInstance.current.getSource('hover-point')) {
                    mapInstance.current.removeSource('hover-point');
                }
                
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
    return (_jsx(MapProvider, { value: mapContextValue, children: _jsx(LineProvider, { children: _jsxs("div", { ref: containerRef, className: "presentation-flex-container", children: [
                _jsx(MapHeader, { 
                    title: currentRoute?._loadedState?.name || currentRoute?.name || 'Untitled Route',
                    color: headerSettings?.color || '#333333',
                    logoUrl: headerSettings?.logoUrl,
                    username: headerSettings?.username
                }),
                _jsx(PresentationSidebar, { 
                    isOpen: true,
                    isDistanceMarkersVisible: isDistanceMarkersVisible,
                    toggleDistanceMarkersVisibility: () => setIsDistanceMarkersVisible(!isDistanceMarkersVisible),
                    isClimbFlagsVisible: isClimbFlagsVisible,
                    toggleClimbFlagsVisibility: () => setIsClimbFlagsVisible(!isClimbFlagsVisible),
                    isLineMarkersVisible: isLineMarkersVisible,
                    toggleLineMarkersVisibility: () => setIsLineMarkersVisible(!isLineMarkersVisible)
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
                // First render non-current routes
                routes.filter(route => 
                    route.id !== currentRoute?.id && 
                    route.routeId !== currentRoute?.routeId
                ).map(route => {
                    return _jsx(RouteLayer, { 
                        map: mapInstance.current, 
                        route: route,
                        key: route.id || route.routeId // Ensure we have a stable key
                    }, route.id || route.routeId);
                }),
                
                // Then render the current route last to ensure it's on top
                currentRoute && _jsx(RouteLayer, { 
                    map: mapInstance.current, 
                    route: currentRoute,
                    key: currentRoute.id || currentRoute.routeId // Ensure we have a stable key
                }, currentRoute.id || currentRoute.routeId),
                _jsx(PresentationPOILayer, { map: mapInstance.current }),
                _jsx(PresentationPhotoLayer, {}),
                isLineMarkersVisible && _jsx(DirectPresentationLineLayer, { 
                  map: mapInstance.current, 
                  lines: props.lineData || [] 
                }),
                currentRoute && (_jsxs(_Fragment, { children: [
                    isDistanceMarkersVisible && _jsx(PresentationDistanceMarkers, { map: mapInstance.current, route: currentRoute }),
                    isClimbFlagsVisible && _jsx(ClimbMarkers, { map: mapInstance.current, route: currentRoute })
                ] })),
                currentRoute && (_jsx("div", { className: "elevation-container", children: _jsx(PresentationElevationProfilePanel, { route: currentRoute }) }))
            ] }))
        ] })
    ] }) }) }));
}
