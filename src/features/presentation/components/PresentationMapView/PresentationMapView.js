import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { usePresentationRouteInit } from '../../hooks/usePresentationRouteInit';
import mapboxgl from 'mapbox-gl';
import SearchControl from '../SearchControl/SearchControl';
import 'mapbox-gl/dist/mapbox-gl.css';
import StyleControl, { MAP_STYLES } from '../StyleControl';
import { useRouteContext } from '../../../map/context/RouteContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import { RouteLayer } from '../../../map/components/RouteLayer';
import { PresentationSidebar } from '../PresentationSidebar';
import { PresentationElevationProfilePanel } from '../ElevationProfile/PresentationElevationProfilePanel';
import { PresentationPOILayer } from '../POILayer/PresentationPOILayer';
import { PresentationPhotoLayer } from '../PhotoLayer/PresentationPhotoLayer';
import { PresentationDistanceMarkers } from '../DistanceMarkers/PresentationDistanceMarkers';
import { MapProvider } from '../../../map/context/MapContext';
import './PresentationMapView.css';
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
export default function PresentationMapView() {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const { currentRoute, routes, currentLoadedState } = useRouteContext();
    const [hoverCoordinates, setHoverCoordinates] = useState(null);
    const hoverMarkerRef = useRef(null);
    // Initialize routes using our presentation-specific hook
    const { initialized: routesInitialized } = usePresentationRouteInit({
        routes,
        onInitialized: () => {
            console.log('[PresentationMapView] Routes initialized');
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
            el.style.width = '10px';
            el.style.height = '10px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = '#ff0000';
            el.style.border = '2px solid white';
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
            console.log('[PresentationMapView] Updating currentRouteIdRef from', 
                currentRouteIdRef.current, 'to', currentRoute.routeId);
            currentRouteIdRef.current = currentRoute.routeId;
        }
    }, [currentRoute]);

    // Update map state when route changes
    useEffect(() => {
        if (!isMapReady || !mapInstance.current || !currentRoute?.geojson)
            return;
        console.log('[PresentationMapView] Handling route change:', {
            routeId: currentRoute.routeId,
            geojsonType: currentRoute.geojson.type,
            featureCount: currentRoute.geojson.features?.length,
            isPreviousRoute: previousRouteRef.current !== null,
            currentRouteIdRef: currentRouteIdRef.current
        });
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
    // Initialize map
    useEffect(() => {
        if (!mapRef.current)
            return;
        console.log('[PresentationMapView] Initializing map...');
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
        // Log map initialization events
        map.on('load', () => {
            console.log('[PresentationMapView] Map loaded');
            // Add terrain synchronously
            map.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14
            });
            map.setTerrain({
                source: 'mapbox-dem',
                exaggeration: 1.5
            });
            setIsMapReady(true);
        });
        map.on('style.load', () => {
            console.log('[PresentationMapView] Style loaded');
        });
        map.on('zoom', () => {
            const zoom = map.getZoom();
            console.log('[PresentationMapView] Zoom changed:', zoom, 'Floor:', Math.floor(zoom));
        });
        map.on('error', (e) => {
            console.error('[PresentationMapView] Map error:', e);
        });
        
        // Add mousemove event to set hover coordinates
        map.on('mousemove', (e) => {
            // Get mouse coordinates
            const mouseCoords = [e.lngLat.lng, e.lngLat.lat];
            console.log('[PresentationMapView] Mouse move:', mouseCoords);
            
            // Get all route sources directly from the map
            const style = map.getStyle();
            if (!style || !style.sources) {
                console.log('[PresentationMapView] No style or sources available');
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
            
            console.log('[PresentationMapView] Found route sources:', routeSources.map(([id]) => id));
            
            // Try to find the active route
            let activeRouteSource = null;
            let activeRouteId = null;
            
            // First check if we have a current route ID from the ref
            if (currentRouteIdRef.current) {
                console.log('[PresentationMapView] Current route ID from ref:', currentRouteIdRef.current);
                
                const currentSourceId = `${currentRouteIdRef.current}-main`;
                
                // Find this source in our routeSources
                const foundSource = routeSources.find(([id]) => id === currentSourceId);
                if (foundSource) {
                    activeRouteSource = foundSource[1];
                    activeRouteId = currentRouteIdRef.current;
                    console.log('[PresentationMapView] Found active route from ref:', currentRouteIdRef.current);
                } else {
                    console.log('[PresentationMapView] Could not find source for current route ID from ref:', currentSourceId);
                }
            }
            
            // If we couldn't find the route from the ref, try from the context
            if (!activeRouteSource && currentRoute) {
                console.log('[PresentationMapView] Current route from context:', {
                    id: currentRoute.id,
                    routeId: currentRoute.routeId,
                    name: currentRoute.name || 'Unnamed'
                });
                
                const routeId = currentRoute.routeId || `route-${currentRoute.id}`;
                const sourceId = `${routeId}-main`;
                
                console.log('[PresentationMapView] Looking for source ID from context:', sourceId);
                
                // Find this source in our routeSources
                const foundSource = routeSources.find(([id]) => id === sourceId);
                if (foundSource) {
                    activeRouteSource = foundSource[1];
                    activeRouteId = routeId;
                    console.log('[PresentationMapView] Found active route from context:', routeId);
                    
                    // Update the ref if it's different
                    if (currentRouteIdRef.current !== routeId) {
                        console.log('[PresentationMapView] Updating currentRouteIdRef from', currentRouteIdRef.current, 'to', routeId);
                        currentRouteIdRef.current = routeId;
                    }
                } else {
                    console.log('[PresentationMapView] Could not find source for current route from context:', sourceId);
                }
            } else if (!activeRouteSource) {
                console.log('[PresentationMapView] No current route in context or ref');
            }
            
            // If we couldn't find the active route from context or ref, try to find it another way
            if (!activeRouteSource && routeSources.length > 0) {
                // Fallback to first route if no current route
                console.log('[PresentationMapView] No active route found, using first route source as fallback');
                activeRouteSource = routeSources[0][1];
                activeRouteId = routeSources[0][0].replace('-main', '');
                console.log('[PresentationMapView] Using first route as active (fallback):', activeRouteId);
            }
            
            // If we don't have an active route, clear any marker and return
            if (!activeRouteSource) {
                console.log('[PresentationMapView] No active route source found');
                if (hoverCoordinates) {
                    setHoverCoordinates(null);
                }
                return;
            }
            
            // Get coordinates from the active route
            const geoJsonData = activeRouteSource.data;
            const coordinates = geoJsonData.features[0].geometry.coordinates;
            
            console.log('[PresentationMapView] Route has', coordinates.length, 'coordinates');
            
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
            
            console.log('[PresentationMapView] Closest point:', closestPoint, 'with distance:', minDistance);
            
            // Define a threshold distance - only show marker when close to the route
            const distanceThreshold = 0.005; // Approximately 500m at the equator
            
            // If we found a closest point on the active route and it's within the threshold
            if (closestPoint && minDistance < distanceThreshold) {
                console.log('[PresentationMapView] Setting hover coordinates:', closestPoint);
                setHoverCoordinates(closestPoint);
            } else {
                // If no point found or too far from route, clear the marker
                if (hoverCoordinates) {
                    console.log('[PresentationMapView] Clearing hover coordinates');
                    setHoverCoordinates(null);
                }
            }
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
    return (_jsx(MapProvider, { value: mapContextValue, children: _jsxs("div", { className: "w-full h-full relative", children: [_jsx("div", { ref: mapRef, style: { width: 'calc(100vw - 56px)', height: '100vh', position: 'fixed', top: 0, left: '56px' } }), !isMapReady && (_jsxs(Box, { sx: {
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
                    }, children: [_jsx(CircularProgress, { size: 60, sx: { mb: 2 } }), _jsx(Typography, { variant: "h6", color: "white", children: "Loading map..." })] })), _jsx(PresentationSidebar, { isOpen: true }), isMapReady && mapInstance.current && (_jsxs(_Fragment, { children: [routes.map(route => (_jsx(RouteLayer, { map: mapInstance.current, route: route }, route.routeId))), _jsx(PresentationPOILayer, { map: mapInstance.current }), _jsx(PresentationPhotoLayer, {}), currentRoute && (_jsxs(_Fragment, { children: [_jsx(PresentationDistanceMarkers, { map: mapInstance.current, route: currentRoute }), _jsx("div", { className: "route-filename", children: currentRoute.name || "Unnamed Route" })] })), currentRoute && (_jsx("div", { className: "elevation-container", children: _jsx(PresentationElevationProfilePanel, { route: currentRoute }) }))] }))] }) }));
}
