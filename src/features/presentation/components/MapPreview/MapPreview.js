import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Helper function to detect mobile devices
const isMobileDevice = () => {
  return window.innerWidth <= 768;
};
export const MapPreview = ({ center, zoom, routes = [], className = '', disableFitBounds = false }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [isMobile, setIsMobile] = useState(isMobileDevice());
    
    // Update mobile state on resize
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(isMobileDevice());
        };
        
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    useEffect(() => {
        if (!mapContainer.current)
            return;
        
        // Apply mobile-specific optimizations
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: center,
            zoom: zoom,
            interactive: false, // Disable map interactions for preview
            attributionControl: false,
            animate: false, // Disable all map animations
            pitch: 0, // Use flat view for better performance
            antialias: !isMobile, // Disable antialiasing on mobile for better performance
            preserveDrawingBuffer: true, // Needed for screenshots
            failIfMajorPerformanceCaveat: false // Don't fail on performance issues
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
            // Skip 3D terrain on mobile for better performance
            if (!isMobile) {
                try {
                    map.current.setTerrain({
                        source: 'mapbox-dem',
                        exaggeration: 1.0
                    });
                } catch (error) {
                    console.error('[MapPreview] Error setting terrain:', error);
                }
            }
            
            const bounds = new mapboxgl.LngLatBounds();
            routes.forEach((route, index) => {
                if (!route.geojson)
                    return;
                // Check if source already exists before adding it
                try {
                    // Try to get the source - if it exists, this won't throw an error
                    if (!map.current?.getSource(`route-${index}`)) {
                        // Source doesn't exist, so add it
                        map.current?.addSource(`route-${index}`, {
                            type: 'geojson',
                            data: route.geojson
                        });
                    } else {
                        // Source exists, update its data
                        map.current?.getSource(`route-${index}`)?.setData(route.geojson);
                    }
                } catch (error) {
                    console.error(`[MapPreview] Error handling route-${index} source:`, error);
                }
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
                    
                    // Check if unpaved source already exists
                    try {
                        if (!map.current?.getSource(`unpaved-${index}`)) {
                            map.current?.addSource(`unpaved-${index}`, {
                                type: 'geojson',
                                data: {
                                    type: 'FeatureCollection',
                                    features
                                }
                            });
                        } else {
                            // Update existing source
                            map.current?.getSource(`unpaved-${index}`)?.setData({
                                type: 'FeatureCollection',
                                features
                            });
                        }
                    } catch (error) {
                        console.error(`[MapPreview] Error handling unpaved-${index} source:`, error);
                    }
                }
                // Add border layer if it doesn't exist
                try {
                    if (!map.current?.getLayer(`route-${index}-border`)) {
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
                    }
                } catch (error) {
                    console.error(`[MapPreview] Error handling route-${index}-border layer:`, error);
                }
                
                // Add main route layer if it doesn't exist
                try {
                    if (!map.current?.getLayer(`route-${index}`)) {
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
                    }
                } catch (error) {
                    console.error(`[MapPreview] Error handling route-${index} layer:`, error);
                }
                
                // Add unpaved sections layer if they exist (on top of main route)
                if (route.unpavedSections && route.unpavedSections.length > 0) {
                    try {
                        if (!map.current?.getLayer(`unpaved-${index}`)) {
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
                    } catch (error) {
                        console.error(`[MapPreview] Error handling unpaved-${index} layer:`, error);
                    }
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
