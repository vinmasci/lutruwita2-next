import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { throttle } from 'lodash'; // Import throttle
import useUnifiedRouteProcessing from '../../../map/hooks/useUnifiedRouteProcessing';
import mapboxgl from '../../../../lib/mapbox-gl-no-indoor';
import { safelyRemoveMap } from '../../../map/utils/mapCleanup';
import logger from '../../../../utils/logger';
import SearchControl from '../SearchControl/SearchControl';
import 'mapbox-gl/dist/mapbox-gl.css';
import StyleControl, { MAP_STYLES } from '../StyleControl';
import PitchControl from '../../../map/components/PitchControl/PitchControl';
import { useRouteContext } from '../../../map/context/RouteContext';
import MapHeader from '../../../map/components/MapHeader/MapHeader';
import FloatingCountdownTimer from '../../../map/components/MapHeader/FloatingCountdownTimer';
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
    const isInitializedRef = useRef(false); // Track if map has been initialized
    const [isMapReady, setIsMapReady] = useState(false);
    const { currentRoute, routes, currentLoadedState, headerSettings } = useRouteContext();
    const [hoverCoordinates, setHoverCoordinates] = useState(null);
    const setHoverCoordinatesRef = useRef(setHoverCoordinates); // Ref for state setter
    const routeCoordinatesRef = useRef(null); // Ref for route coordinates
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
    
    // Add initial scroll adjustment for mobile with multiple attempts
    useEffect(() => {
        // Check if we're on mobile
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Function to scroll to top with options
            const scrollToTop = () => {
                // Try to use scrollIntoView if available
                if (containerRef.current) {
                    containerRef.current.scrollIntoView({ 
                        behavior: 'auto', 
                        block: 'start' 
                    });
                }
                
                // Also use window.scrollTo as a fallback
                window.scrollTo(0, 0);
            };
            
            // Make multiple scroll attempts with increasing timeouts
            // First attempt - immediate
            scrollToTop();
            
            // Second attempt - short delay
            setTimeout(scrollToTop, 100);
            
            // Third attempt - medium delay
            setTimeout(scrollToTop, 500);
            
            // Fourth attempt - longer delay after content should be loaded
            setTimeout(scrollToTop, 1000);
            
            // Final attempt - very long delay
            setTimeout(scrollToTop, 2000);
        }
    }, []);
    // Initialize routes using the unified route processing hook
    const { initialized: routesInitialized } = useUnifiedRouteProcessing(routes, {
        batchProcess: true,
        onInitialized: () => {
            logger.info('PresentationMapView', 'Routes initialized with unified approach');
            console.log('[PresentationMapView] ✅ Routes initialized with unified approach');
        }
    });
    
    // Log when routes change to track re-processing
    useEffect(() => {
        console.log('[PresentationMapView] 🔄 Routes changed, count:', routes?.length || 0);
        if (routes && routes.length > 0) {
            console.log('[PresentationMapView] First route ID:', routes[0]?.id || routes[0]?.routeId);
        }
    }, [routes]);

    // Effect to update the ref for setHoverCoordinates
    useEffect(() => {
        setHoverCoordinatesRef.current = setHoverCoordinates;
    }, [setHoverCoordinates]);

    // Effect to cache route coordinates
    useEffect(() => {
        if (currentRoute?.geojson?.features?.[0]?.geometry?.coordinates) {
            routeCoordinatesRef.current = currentRoute.geojson.features[0].geometry.coordinates;
        } else {
            routeCoordinatesRef.current = null; // Clear cache if no coordinates
        }
    }, [currentRoute]);
    
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
                logger.error('PresentationMapView', 'Error updating hover point:', error);
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
        console.log('[PresentationMapView] 🔄 Current route changed:', currentRoute?.routeId || currentRoute?.id);
        
        if (!isMapReady || !mapInstance.current || !currentRoute?.geojson) {
            console.log('[PresentationMapView] ⏭️ Skipping map update - map not ready or no geojson');
            return;
        }
        
        console.log('[PresentationMapView] Updating map for route:', {
            routeId: currentRoute.routeId || currentRoute.id,
            hasGeojson: !!currentRoute.geojson,
            featuresCount: currentRoute.geojson?.features?.length || 0
        });
        
        // Get route bounds
        if (currentRoute.geojson?.features?.[0]?.geometry?.type === 'LineString') {
            const feature = currentRoute.geojson.features[0];
            const coordinates = feature.geometry.coordinates;
            
            console.log('[PresentationMapView] Route has', coordinates?.length || 0, 'coordinates');
            
            if (coordinates && coordinates.length > 0) {
                console.time('fitBounds');
                const bounds = new mapboxgl.LngLatBounds();
                coordinates.forEach((coord) => {
                    if (coord.length >= 2) {
                        bounds.extend([coord[0], coord[1]]);
                    }
                });
                
                // Always fit bounds to show the entire route with substantial padding for maximum context
                console.log('[PresentationMapView] Fitting bounds to route');
                mapInstance.current.fitBounds(bounds, {
                    padding: 200,  // Significantly increased padding to zoom out much more
                    duration: 1500
                });
                console.timeEnd('fitBounds');
                
                // Update previous route reference
                previousRouteRef.current = currentRoute.routeId;
                console.log('[PresentationMapView] ✅ Map updated for route');
            }
        }
    }, [isMapReady, currentRoute]);
    // Function to handle device type changes (e.g., orientation changes)
    const handleDeviceTypeChange = useCallback(() => {
        if (!mapInstance.current) return;
        
        const isMobile = window.innerWidth <= 768;
        const map = mapInstance.current;
        
        
        // Update projection if needed - always use mercator on mobile for better performance
        const currentProjection = map.getProjection().name;
        const targetProjection = isMobile ? 'mercator' : 'globe';
        
        if (currentProjection !== targetProjection) {
            try {
                map.setProjection(targetProjection);
            } catch (error) {
                logger.error('PresentationMapView', 'Error setting projection:', error);
                // Fallback to mercator if there's an error
                if (currentProjection !== 'mercator') {
                    try {
                        map.setProjection('mercator');
                    } catch (innerError) {
                        logger.error('PresentationMapView', 'Error setting fallback projection:', innerError);
                    }
                }
            }
        }
        
        // Update terrain exaggeration - use flat terrain on mobile
        if (map.getTerrain()) {
            try {
                map.setTerrain({
                    source: 'mapbox-dem',
                    exaggeration: isMobile ? 0.0 : 1.5 // No exaggeration on mobile for better performance
                });
            } catch (error) {
                logger.error('PresentationMapView', 'Error updating terrain:', error);
            }
        }
        
        // Update pitch if needed - use flat view on mobile
        const currentPitch = map.getPitch();
        const targetPitch = isMobile ? 0 : 45;
        
        if (Math.abs(currentPitch - targetPitch) > 5) {
            try {
                map.setPitch(targetPitch);
            } catch (error) {
                logger.error('PresentationMapView', 'Error setting pitch:', error);
                // Try to set pitch to 0 as a fallback
                if (currentPitch !== 0) {
                    try {
                        map.setPitch(0);
                    } catch (innerError) {
                        logger.error('PresentationMapView', 'Error setting fallback pitch:', innerError);
                    }
                }
            }
        }
    }, []);
    
    // Add resize listener to handle orientation changes
    useEffect(() => {
        window.addEventListener('resize', handleDeviceTypeChange);
        return () => {
            window.removeEventListener('resize', handleDeviceTypeChange);
        };
    }, [handleDeviceTypeChange]);

    // Throttled mousemove handler using refs and increased sampling/delay
    const throttledMouseMoveHandler = useCallback(throttle((e) => {
        // Skip trace marker functionality on mobile devices
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            // Use ref to set state
            if (setHoverCoordinatesRef.current) setHoverCoordinatesRef.current(null);
            return;
        }

        if (!mapInstance.current) return; // Ensure map instance exists

        const map = mapInstance.current;
        const mouseCoords = [e.lngLat.lng, e.lngLat.lat];

        // Use cached coordinates from ref
        const coordinates = routeCoordinatesRef.current;
        if (!coordinates || coordinates.length === 0) {
             if (setHoverCoordinatesRef.current) setHoverCoordinatesRef.current(null);
             return;
        }

        // Find the closest point on the active route (optimized with increased sampling)
        let closestPoint = null;
        let minDistanceSq = Infinity; // Use squared distance to avoid sqrt
        const sampleRate = 20; // Check every 20th point

        for (let i = 0; i < coordinates.length; i += sampleRate) {
            const coord = coordinates[i];
            if (coord && coord.length >= 2) {
                // Simplified distance calculation (squared Euclidean distance)
                const dx = coord[0] - mouseCoords[0];
                const dy = coord[1] - mouseCoords[1];
                const distanceSq = dx * dx + dy * dy;

                if (distanceSq < minDistanceSq) {
                    minDistanceSq = distanceSq;
                    closestPoint = [coord[0], coord[1]];
                }
            }
        }

        // Define a threshold distance (squared) - approx 1km
        // 1km is roughly 0.009 degrees latitude, squared is ~0.000081
        const distanceThresholdSq = 0.000081;

        // Use ref to set state
        if (closestPoint && minDistanceSq < distanceThresholdSq) {
            if (setHoverCoordinatesRef.current) setHoverCoordinatesRef.current(closestPoint);
        } else {
            if (setHoverCoordinatesRef.current) setHoverCoordinatesRef.current(null);
        }
    }, 250), []); // Empty dependency array - relies on refs
    
    // Initialize map
    useEffect(() => {
        // Prevent duplicate initialization
        if (isInitializedRef.current) {
            console.log('[PresentationMapView] ⏭️ Map already initialized, skipping initialization');
            return;
        }
        
        console.log('[PresentationMapView] 🚀 Map initialization starting');
        console.time('mapInitialization');
        
        if (!mapRef.current) {
            console.log('[PresentationMapView] ⚠️ Map ref not available, aborting initialization');
            return;
        }
            
        // Flag to track if component is mounted
        let isMounted = true;
            
        // Check if device is mobile
        const initialIsMobile = window.innerWidth <= 768;
        console.log('[PresentationMapView] Device is mobile:', initialIsMobile);
        
        // Create map with error handling
        let map;
        try {
            console.log('[PresentationMapView] Creating Mapbox instance');
            console.time('mapboxCreate');
            map = new mapboxgl.Map({
                container: mapRef.current,
                style: MAP_STYLES.satellite.url,
                bounds: [[144.5, -43.7], [148.5, -40.5]], // Tasmania bounds
                fitBoundsOptions: {
                    padding: 0,
                    pitch: initialIsMobile ? 0 : 45, // Use flat view on mobile
                    bearing: 0
                },
                projection: 'mercator', // Always use mercator for better performance
                maxPitch: initialIsMobile ? 0 : 85, // Limit pitch on mobile
                width: '100%',
                height: '100%',
                failIfMajorPerformanceCaveat: false, // Don't fail on performance issues
                preserveDrawingBuffer: true, // Needed for screenshots
                attributionControl: false, // We'll add this manually
                antialias: initialIsMobile ? false : true, // Disable antialiasing on mobile for better performance
                // Disable the indoor plugin since we don't need it
                // This prevents the indoor plugin from being initialized and causing errors
                disableIndoorPlugin: true,
                // Disable any other unnecessary plugins
                disableScrollZoom: false,
                disableTouchZoom: false,
                disableRotation: false,
                disablePitch: false
            });
            console.timeEnd('mapboxCreate');
            console.log('[PresentationMapView] ✅ Mapbox instance created');
            
            // Explicitly disable the indoor plugin if it exists
            if (mapboxgl.IndoorManager && typeof mapboxgl.IndoorManager.disable === 'function') {
                try {
                    mapboxgl.IndoorManager.disable();
                    logger.info('PresentationMapView', 'Successfully disabled IndoorManager');
                } catch (error) {
                    logger.warn('PresentationMapView', 'Error disabling IndoorManager:', error);
                }
            }
        } catch (error) {
            logger.error('PresentationMapView', 'Error creating map instance:', error);
            return;
        }
        
        // Add error handling for map, including special handling for aborted fetches
        map.on('error', (e) => {
            // Check if this is an aborted fetch error
            if (e && e.error && e.error.name === 'AbortError' && e.error.message && e.error.message.includes('Fetch is aborted')) {
                // Handle aborted fetch errors gracefully - these often happen during cleanup and are normal
                logger.debug('PresentationMapView', 'Fetch aborted during map operation - this is normal during cleanup');
            } else {
                // Log other errors normally
                logger.error('PresentationMapView', 'Mapbox GL error:', e);
            }
        });
        
        // Import and set map instance in the mapOperationsQueue
        import('../../../map/utils/mapOperationsQueue').then(({ setMapInstance }) => {
            if (isMounted) {
                setMapInstance(map);
                logger.info('PresentationMapView', 'Map instance set in mapOperationsQueue');
            }
        }).catch(error => {
            logger.error('PresentationMapView', 'Error importing mapOperationsQueue:', error);
        });
        // Log map initialization events
        map.on('load', () => {
            console.log('[PresentationMapView] 🔄 Mapbox load event fired');
            
            // Check if component is still mounted *before* starting setup
            if (!isMounted) {
                logger.info('PresentationMapView', 'Map loaded but component already unmounted, skipping setup');
                console.log('[PresentationMapView] ⚠️ Component unmounted before map load setup could start');
                // No need to call safelyRemoveMap here, the main cleanup function will handle it
                return;
            }
            
            console.time('mapLoadSetup');
            
            try {
                console.log('[PresentationMapView] Adding terrain source and layers');
                // Add terrain synchronously
                if (!map.getSource('mapbox-dem')) {
                    map.addSource('mapbox-dem', {
                        type: 'raster-dem',
                        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                        tileSize: 512,
                        maxzoom: 14
                    });
                    console.log('[PresentationMapView] ✅ Added terrain source');
                }
                
                // Get current device type
                const isCurrentlyMobile = window.innerWidth <= 768;
                
                // Set terrain with appropriate exaggeration based on device
                // Use no exaggeration on mobile for better performance
                map.setTerrain({
                    source: 'mapbox-dem',
                    exaggeration: isCurrentlyMobile ? 0.0 : 1.5
                });
                
                // Add 3D buildings layer only on non-mobile devices
                if (!isCurrentlyMobile) {
                    try {
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
                        logger.error('PresentationMapView', 'Error adding 3D buildings layer:', error);
                    }
                }
                
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
                logger.error('PresentationMapView', 'Error setting up terrain:', error);
            }
            
            setIsMapReady(true);
            console.timeEnd('mapLoadSetup');
            console.log('[PresentationMapView] ✅ Map is ready');
            console.timeEnd('mapInitialization');
        });
        map.on('style.load', () => {
            // Style loaded
        });
        map.on('zoom', () => {
            const zoom = map.getZoom();
        });

        // Add throttled mousemove event listener using the memoized handler
        map.on('mousemove', throttledMouseMoveHandler);

        // Add mouseout event to clear hover coordinates
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
        
        // Mark as initialized to prevent duplicate initialization
        isInitializedRef.current = true;
        console.log('[PresentationMapView] ✅ Map initialization flag set');
        
        return () => {
            // Mark component as unmounted
            isMounted = false;
            
            // Remove the style element
            if (style && style.parentNode) {
                document.head.removeChild(style);
            }
            
            // In presentation mode, we intentionally skip map cleanup to avoid errors
            // The browser will handle cleanup when the page is unloaded
            logger.info('PresentationMapView', 'Skipping map cleanup in presentation mode');
            
            // Just clear the map instance reference
            mapInstance.current = null;
            
            // Do NOT reset isInitializedRef here - we want to prevent re-initialization
            // even if the component is unmounted and remounted

            // Ensure map cleanup happens if component unmounts *during* setup
            return () => {
                if (!isMounted) {
                    logger.info('PresentationMapView', 'Cleanup called after unmount');
                    // If mapInstance exists and hasn't been cleaned up, do it now
                    if (mapInstance.current) {
                         logger.info('PresentationMapView', 'Performing delayed map cleanup');
                         safelyRemoveMap(mapInstance.current);
                         mapInstance.current = null;
                    }
                } else {
                     logger.info('PresentationMapView', 'Normal cleanup');
                     // Normal cleanup logic (already handled by the main return)
                }
            };
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
    return (_jsx(MapProvider, { value: mapContextValue, children: _jsx(LineProvider, { children: _jsxs("div", { id: "presentation-top", ref: containerRef, className: "presentation-flex-container", children: [
                _jsx(MapHeader, { 
                    title: currentRoute?._loadedState?.name || currentRoute?.name || 'Untitled Route', // Reverted title logic
                    color: headerSettings?.color || '#333333',
                    logoUrl: headerSettings?.logoUrl,
                    username: headerSettings?.username,
                    type: currentLoadedState?.type, // Keep using currentLoadedState for type
                    eventDate: currentLoadedState?.eventDate // Keep using currentLoadedState for eventDate
                }),
                
                // Floating Countdown Timer
                currentLoadedState?.type === 'event' && currentLoadedState?.eventDate && 
                _jsx(FloatingCountdownTimer, { eventDate: currentLoadedState.eventDate }),
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
