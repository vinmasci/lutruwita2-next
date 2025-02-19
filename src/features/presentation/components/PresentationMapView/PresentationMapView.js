import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useEffect, useState, useMemo } from 'react';
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
    // Initialize routes using our presentation-specific hook
    const { initialized: routesInitialized } = usePresentationRouteInit({
        routes,
        onInitialized: () => {
            console.log('[PresentationMapView] Routes initialized');
        }
    });
    // Store previous route reference
    const previousRouteRef = useRef(null);
    // Update map state when route changes
    useEffect(() => {
        if (!isMapReady || !mapInstance.current || !currentRoute?.geojson)
            return;
        console.log('[PresentationMapView] Handling route change:', {
            routeId: currentRoute.routeId,
            geojsonType: currentRoute.geojson.type,
            featureCount: currentRoute.geojson.features?.length,
            isPreviousRoute: previousRouteRef.current !== null
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
                    }, children: [_jsx(CircularProgress, { size: 60, sx: { mb: 2 } }), _jsx(Typography, { variant: "h6", color: "white", children: "Loading map..." })] })), _jsx(PresentationSidebar, { isOpen: true }), isMapReady && mapInstance.current && (_jsxs(_Fragment, { children: [routes.map(route => (_jsx(RouteLayer, { map: mapInstance.current, route: route }, route.routeId))), _jsx(PresentationPOILayer, { map: mapInstance.current }), _jsx(PresentationPhotoLayer, {}), currentRoute && (_jsxs(_Fragment, { children: [_jsx(PresentationDistanceMarkers, { map: mapInstance.current, route: currentRoute }), _jsx("div", { className: "route-filename", children: "The Lutruwita Way" })] })), currentRoute && (_jsx("div", { className: "elevation-container", children: _jsx(PresentationElevationProfilePanel, { route: currentRoute }) }))] }))] }) }));
}
