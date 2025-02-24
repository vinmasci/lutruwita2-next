import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { PresentationPOILayer } from '../POILayer/PresentationPOILayer';
import { PresentationPhotoLayer } from '../PhotoLayer/PresentationPhotoLayer';
import { MapProvider } from '../../../map/context/MapContext';
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const MapContainer = styled(Box)({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.6) 100%)',
        pointerEvents: 'none'
    }
});
export const HeroMap = ({ route }) => {
    const mapRef = useRef(null);
    const map = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [hoverCoordinates, setHoverCoordinates] = useState(null);
    useEffect(() => {
        if (!mapRef.current)
            return;
        map.current = new mapboxgl.Map({
            container: mapRef.current,
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            zoom: 14,
            pitch: 65, // Higher pitch for more dramatic terrain view
            bearing: 30, // Angled view
            projection: 'globe',
            maxPitch: 85,
            interactive: false // Disable map interactions for hero section
        });
        map.current.on('load', () => {
            if (!map.current)
                return;
            // Add terrain
            map.current.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14
            });
            map.current.setTerrain({
                source: 'mapbox-dem',
                exaggeration: 1.5
            });
            // Add route source
            map.current.addSource('route', {
                type: 'geojson',
                data: route.geojson
            });
            // Add route border
            map.current.addLayer({
                id: 'route-border',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 5
                }
            });
            // Add main route
            map.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#ee5253',
                    'line-width': 3
                }
            });
            // Fit to route bounds
            const bounds = new mapboxgl.LngLatBounds();
            const coordinates = route.geojson.features[0].geometry.coordinates;
            coordinates.forEach((coord) => {
                bounds.extend(coord);
            });
            map.current.fitBounds(bounds, {
                padding: 100,
                duration: 0
            });
            setIsMapReady(true);
        });
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [route]);
    const mapContextValue = useMemo(() => ({
        map: map.current,
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
    return (_jsx(MapProvider, { value: mapContextValue, children: _jsxs(MapContainer, { children: [_jsx("div", { ref: mapRef, style: { width: '100%', height: '100%' } }), isMapReady && map.current && (_jsxs(_Fragment, { children: [_jsx(PresentationPOILayer, { map: map.current }), _jsx(PresentationPhotoLayer, {})] }))] }) }));
};
