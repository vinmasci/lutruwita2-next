import { useEffect } from 'react';
import { useMapStyle } from '../../hooks/useMapStyle';
import { useRouteState } from "../../hooks/useRouteState";

// Material UI colors
const DEFAULT_COLORS = {
    main: '#f44336', // Red
    hover: '#ff5252'  // Lighter red
};

export const RouteLayer = ({ map, route }) => {
    const isStyleLoaded = useMapStyle(map);
    const { routeVisibility, toggleRouteVisibility } = useRouteState();

    useEffect(() => {
        try {
            console.log('[RouteLayer] Initializing with:', {
                map: !!map,
                routeId: route?.routeId,
                hasGeojson: !!route?.geojson,
                isStyleLoaded
            });
            if (!map || !route || !isStyleLoaded || !route.geojson) {
                console.log('[RouteLayer] Missing required props:', {
                    map: !!map,
                    route: !!route,
                    isStyleLoaded,
                    hasGeojson: !!route?.geojson
                });
                return;
            }

            const routeId = route.routeId;
            const mainLayerId = `${routeId}-main-line`;
            const borderLayerId = `${routeId}-main-border`;
            const hoverLayerId = `${routeId}-hover`;
            const mainSourceId = `${routeId}-main`;
            const visibility = routeVisibility[routeId] || { mainRoute: true, unpavedSections: true };

            // Initial validation of GeoJSON data
            if (!route.geojson.features || !route.geojson.features.length) {
                console.error('[RouteLayer] Invalid GeoJSON data:', {
                    routeId: route.routeId,
                    geojsonType: route.geojson.type,
                    featureCount: route.geojson.features?.length
                });
                return;
            }

            // Extract and validate geometry
            const geometry = route.geojson.features[0].geometry;
            if (!geometry || geometry.type !== 'LineString') {
                console.error('[RouteLayer] Invalid GeoJSON structure:', {
                    featureType: geometry?.type,
                    expected: 'LineString'
                });
                return;
            }

            // Ensure map style is loaded and source doesn't exist
            const sourceExists = map.getSource(mainSourceId);
            const style = map.getStyle();
            if (!style || !style.layers) {
                console.error('[RouteLayer] Map style not fully loaded');
                return;
            }

            console.log('[RouteLayer] Source check:', {
                sourceId: mainSourceId,
                exists: sourceExists,
                mapStyle: style.name,
                layerCount: style.layers.length,
                terrain: !!map.getTerrain()
            });

            // Clean up existing layers and source if they exist
            if (sourceExists) {
                const layersToRemove = [borderLayerId, mainLayerId, hoverLayerId, `unpaved-sections-layer-${routeId}`];
                layersToRemove.forEach(layerId => {
                    if (map.getLayer(layerId)) {
                        map.removeLayer(layerId);
                    }
                });

                const sourcesToRemove = [mainSourceId, `unpaved-sections-${routeId}`];
                sourcesToRemove.forEach(sourceId => {
                    if (map.getSource(sourceId)) {
                        map.removeSource(sourceId);
                    }
                });
            }

            // Add new source and layers
            console.log('[RouteLayer] Adding source:', mainSourceId);
            try {
                // Add main route source
                map.addSource(mainSourceId, {
                    type: 'geojson',
                    data: route.geojson,
                    tolerance: 0.5
                });
                console.log('[RouteLayer] Source added successfully');
            }
            catch (error) {
                console.error('[RouteLayer] Error adding source:', error);
                return;
            }

            // Add border layer
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

            // Add main route layer
            map.addLayer({
                id: mainLayerId,
                type: 'line',
                source: mainSourceId,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                    visibility: visibility.mainRoute ? 'visible' : 'none'
                },
                paint: {
                    'line-color': route.color || DEFAULT_COLORS.main,
                    'line-width': 3,
                    'line-opacity': 1
                }
            });

            // Add hover layer (initially hidden) only for focused routes
            if (route.isFocused) {
                map.addLayer({
                    id: hoverLayerId,
                    type: 'line',
                    source: mainSourceId,
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                        visibility: 'none'
                    },
                    paint: {
                        'line-color': route.color ? `${route.color}99` : DEFAULT_COLORS.hover,
                        'line-width': 5,
                        'line-opacity': 1
                    }
                });
            }

            // Add combined surface layer for all routes
            if (route.unpavedSections && route.unpavedSections.length > 0) {
                const surfaceSourceId = `unpaved-sections-${routeId}`;
                const surfaceLayerId = `unpaved-sections-layer-${routeId}`;

                // Combine all unpaved sections into a single feature collection
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

                map.addSource(surfaceSourceId, {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features
                    },
                    tolerance: 1, // Increase simplification tolerance
                    maxzoom: 14 // Limit detail at high zoom levels
                });

                map.addLayer({
                    id: surfaceLayerId,
                    type: 'line',
                    source: surfaceSourceId,
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                        visibility: visibility.unpavedSections ? 'visible' : 'none'
                    },
                    paint: {
                        'line-color': '#ffffff',
                        'line-width': 2,
                        'line-dasharray': [1, 3]
                    }
                });
            }

            // Add hover handlers only for focused routes
            if (route.isFocused) {
                const mouseHandler = () => {
                    map.getCanvas().style.cursor = 'pointer';
                    if (visibility.mainRoute) {
                        map.setLayoutProperty(hoverLayerId, 'visibility', 'visible');
                    }
                };

                const mouseleaveHandler = () => {
                    map.getCanvas().style.cursor = '';
                    map.setLayoutProperty(hoverLayerId, 'visibility', 'none');
                };

                // Add click handler for toggling visibility
                const clickHandler = () => {
                    // Just toggle hover layer visibility, no re-rendering
                    if (visibility.mainRoute) {
                        map.setLayoutProperty(hoverLayerId, 'visibility', 'visible');
                    }
                };

                map.on('click', mainLayerId, clickHandler);
                map.on('mouseenter', mainLayerId, mouseHandler);
                map.on('mousemove', mainLayerId, mouseHandler);
                map.on('mouseleave', mainLayerId, mouseleaveHandler);

                return () => {
                    // Just remove event listeners, don't cleanup layers
                    map.off('click', mainLayerId, clickHandler);
                    map.off('mouseenter', mainLayerId, mouseHandler);
                    map.off('mousemove', mainLayerId, mouseHandler);
                    map.off('mouseleave', mainLayerId, mouseleaveHandler);
                };
            }
        }
        catch (error) {
            console.error('[RouteLayer] Error rendering route:', error);
        }
    }, [map, route, isStyleLoaded, routeVisibility, toggleRouteVisibility]);

    return null;
};

export default RouteLayer;
