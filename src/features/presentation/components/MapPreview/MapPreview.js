import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
export const MapPreview = ({ center, zoom, routes = [], className = '', disableFitBounds = false }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    useEffect(() => {
        if (!mapContainer.current)
            return;
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: center,
            zoom: zoom,
            interactive: false, // Disable map interactions for preview
            attributionControl: false,
            animate: false // Disable all map animations
        });
        // Clean up on unmount
        return () => {
            if (map.current) {
                map.current.remove();
            }
        };
    }, [center, zoom]);
    useEffect(() => {
        if (!map.current || !routes.length)
            return;
        // Wait for map to load before adding sources and layers
        map.current.once('load', () => {
            const bounds = new mapboxgl.LngLatBounds();
            routes.forEach((route, index) => {
                if (!route.geojson)
                    return;
                // Add the route source
                map.current?.addSource(`route-${index}`, {
                    type: 'geojson',
                    data: route.geojson
                });
                // Add unpaved sections source if they exist
                if (route.unpavedSections && route.unpavedSections.length > 0) {
                    const features = route.unpavedSections.map(section => ({
                        type: 'Feature',
                        properties: {
                            surface: section.surfaceType
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: section.coordinates
                        }
                    }));
                    map.current?.addSource(`unpaved-${index}`, {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features
                        }
                    });
                }
                // Add border layer
                map.current?.addLayer({
                    id: `route-${index}-border`,
                    type: 'line',
                    source: `route-${index}`,
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': '#ffffff',
                        'line-width': 4
                    }
                });
                // Add main route layer
                map.current?.addLayer({
                    id: `route-${index}`,
                    type: 'line',
                    source: `route-${index}`,
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': route.customMapOptions?.color || '#ee5253',
                        'line-width': 3
                    }
                });
                // Add unpaved sections layer if they exist (on top of main route)
                if (route.unpavedSections && route.unpavedSections.length > 0) {
                    map.current?.addLayer({
                        id: `unpaved-${index}`,
                        type: 'line',
                        source: `unpaved-${index}`,
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        paint: {
                            'line-color': '#ffffff',
                            'line-width': 1,
                            'line-dasharray': [0.3, 3]
                        }
                    });
                }
                // Extend bounds with this route's coordinates
                if (route.geojson?.features?.[0]?.geometry?.coordinates) {
                    route.geojson.features[0].geometry.coordinates.forEach((coord) => {
                        bounds.extend(coord);
                    });
                }
            });
            
            // Check if we should skip fitting bounds
            const shouldFitBounds = !disableFitBounds && 
                                   !routes.some(route => route.customMapOptions?.disableFitBounds);
            
            // Fit bounds to include all routes without animation if not disabled
            if (!bounds.isEmpty() && shouldFitBounds) {
                // Get the maximum zoom level from route options or use default
                const maxZoom = Math.max(
                    ...routes
                        .filter(route => route.customMapOptions?.maxZoom)
                        .map(route => route.customMapOptions.maxZoom),
                    15 // Default max zoom is higher than before
                );
                
                map.current?.fitBounds(bounds, {
                    padding: 20,
                    maxZoom: maxZoom,
                    animate: false // Disable animation
                });
            }
        });
    }, [routes, disableFitBounds]);
    return (_jsx("div", { ref: mapContainer, className: `w-full h-full ${className}` }));
};
