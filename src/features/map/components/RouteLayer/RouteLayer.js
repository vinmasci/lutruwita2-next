import { useEffect, useRef, useCallback } from 'react';
import { useMapStyle } from '../../hooks/useMapStyle';
import { useRouteState } from "../../hooks/useRouteState";
import { useRouteContext } from "../../context/RouteContext";

// Material UI colors
const DEFAULT_COLORS = {
    main: '#f44336', // Red
    hover: '#ff5252'  // Lighter red
};

export const RouteLayer = ({ map, route }) => {
    const isStyleLoaded = useMapStyle(map);
    const { routeVisibility, toggleRouteVisibility } = useRouteState();
    const { currentRoute } = useRouteContext();

    // Keep track of the previous color to detect changes
    const prevColorRef = useRef(route?.color);
    
    // Animation interval reference
    const animationIntervalRef = useRef(null);
    
    // Track animation state
    const animationState = useRef({
        growing: true,
        mainWidth: 3,
        borderWidth: 5
    });

    // Function to find and update layer visibility
    const updateLayerVisibility = useCallback(() => {
        if (!map || !route || !isStyleLoaded) return;
        
        // Get the stable route ID
        const routeId = route.id || route.routeId;
        
        // Get all layers in the map
        const allLayers = map.getStyle().layers.map(layer => layer.id);
        console.log('[RouteLayer] All map layers:', allLayers);
        
        // Find all layers that might be related to this route
        const routeLayers = allLayers.filter(layerId => 
            layerId.includes(routeId) || 
            (route.routeId && layerId.includes(route.routeId))
        );
        
        console.log(`[RouteLayer] Found ${routeLayers.length} layers for route ${routeId}:`, routeLayers);
        
        // Find main line and border layers
        const mainLineLayers = routeLayers.filter(layerId => layerId.includes('-main-line'));
        const borderLayers = routeLayers.filter(layerId => layerId.includes('-main-border'));
        const surfaceLayers = routeLayers.filter(layerId => layerId.includes('unpaved-sections-layer'));
        
        // Get visibility state
        const visibility = routeVisibility[routeId] || { mainRoute: true, unpavedSections: true };
        
        console.log(`[RouteLayer] Updating visibility for route ${routeId}:`, {
            visibility,
            mainLineLayers,
            borderLayers,
            surfaceLayers
        });
        
        // Update main line layers
        mainLineLayers.forEach(layerId => {
            console.log(`[RouteLayer] Setting ${layerId} visibility to ${visibility.mainRoute ? 'visible' : 'none'}`);
            map.setLayoutProperty(
                layerId,
                'visibility',
                visibility.mainRoute ? 'visible' : 'none'
            );
        });
        
        // Update border layers
        borderLayers.forEach(layerId => {
            console.log(`[RouteLayer] Setting ${layerId} visibility to ${visibility.mainRoute ? 'visible' : 'none'}`);
            map.setLayoutProperty(
                layerId,
                'visibility',
                visibility.mainRoute ? 'visible' : 'none'
            );
        });
        
        // Update surface layers
        surfaceLayers.forEach(layerId => {
            console.log(`[RouteLayer] Setting ${layerId} visibility to ${visibility.unpavedSections ? 'visible' : 'none'}`);
            map.setLayoutProperty(
                layerId,
                'visibility',
                visibility.unpavedSections ? 'visible' : 'none'
            );
        });
    }, [map, route, isStyleLoaded, routeVisibility]);
    
    // Function to move route layers to front
    const moveRouteToFront = useCallback(() => {
        if (!map || !route || !isStyleLoaded) return;
        
        // Get the stable route ID
        const routeId = route.id || route.routeId;
        
        // Check if this is the current route
        const isCurrentRoute = currentRoute && (
            currentRoute.id === route.id || 
            currentRoute.routeId === route.routeId
        );
        
        // Only move to front if this is the current route
        if (isCurrentRoute) {
            console.log(`[RouteLayer] Moving route ${routeId} to front`);
            
            // Get all layers in the map
            const style = map.getStyle();
            if (!style || !style.layers) return;
            
            // Find all layers for this route
            const mainLayerId = `${routeId}-main-line`;
            const borderLayerId = `${routeId}-main-border`;
            const surfaceLayerId = `unpaved-sections-layer-${routeId}`;
            
            // Move layers to front in correct order (border first, then main line, then surface)
            // This ensures proper stacking order
            if (map.getLayer(borderLayerId)) {
                map.moveLayer(borderLayerId);
            }
            
            if (map.getLayer(mainLayerId)) {
                map.moveLayer(mainLayerId);
            }
            
            if (map.getLayer(surfaceLayerId)) {
                map.moveLayer(surfaceLayerId);
            }
        }
    }, [map, route, isStyleLoaded, currentRoute]);

    // Effect to update layer visibility when routeVisibility changes
    useEffect(() => {
        updateLayerVisibility();
    }, [updateLayerVisibility]);
    
    // Effect to move current route to front when currentRoute changes
    useEffect(() => {
        moveRouteToFront();
    }, [moveRouteToFront, currentRoute]);
    
    // Also update visibility when the map style changes
    useEffect(() => {
        if (!map) return;
        
        const styleChangeHandler = () => {
            console.log('[RouteLayer] Map style changed, updating layer visibility');
            // Wait for the style to load before updating visibility
            setTimeout(updateLayerVisibility, 500);
        };
        
        map.on('style.load', styleChangeHandler);
        
        return () => {
            map.off('style.load', styleChangeHandler);
        };
    }, [map, updateLayerVisibility]);

    useEffect(() => {
        try {
            // Skip rendering if the route has an error flag or is missing geojson data
            if (!map || !route || !isStyleLoaded || !route.geojson || route.error) {
                console.log(`[RouteLayer] Skipping route rendering:`, {
                    routeId: route?.id || route?.routeId,
                    hasMap: !!map,
                    hasRoute: !!route,
                    isStyleLoaded,
                    hasGeojson: !!route?.geojson,
                    hasError: !!route?.error
                });
                return;
            }

            const routeId = route.id || route.routeId;
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
            try {
                // Add main route source
                map.addSource(mainSourceId, {
                    type: 'geojson',
                    data: route.geojson,
                    tolerance: 0.5
                });
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
                    visibility: visibility.mainRoute ? 'visible' : 'none'
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

            // Log the layer ID for debugging
            console.log(`[RouteLayer] Added layer with ID: ${mainLayerId}`);

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
                
                // Log that unpaved sections were added
                console.log(`[RouteLayer] Added unpaved sections layer for route ${routeId} with ${features.length} sections`);
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

    // Effect to update the line color when the route color changes
    useEffect(() => {
        if (!map || !route || !isStyleLoaded) return;
        
            const currentColor = route.color;
            const prevColor = prevColorRef.current;
            
            // Only update if the color has changed
            if (currentColor !== prevColor) {
                const routeId = route.id || route.routeId;
            const mainLayerId = `${routeId}-main-line`;
            const hoverLayerId = `${routeId}-hover`;
            
            // Update main layer color
            if (map.getLayer(mainLayerId)) {
                map.setPaintProperty(
                    mainLayerId,
                    'line-color',
                    currentColor || DEFAULT_COLORS.main
                );
            } else {
                console.warn(`[RouteLayer] Main layer (${mainLayerId}) not found`);
            }
            
            // Update hover layer color if it exists
            if (map.getLayer(hoverLayerId)) {
                map.setPaintProperty(
                    hoverLayerId,
                    'line-color',
                    currentColor ? `${currentColor}99` : DEFAULT_COLORS.hover
                );
            }
            
            // Update the ref for next comparison
            prevColorRef.current = currentColor;
        }
    }, [map, route, isStyleLoaded, route?.color]); // Add route.color as a direct dependency

    // Animation effect for the current route
    useEffect(() => {
        // Clear any existing animation interval
        if (animationIntervalRef.current) {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
        }
        
        // Only animate for the current route when map is ready
        if (!map || !route || !isStyleLoaded || !currentRoute) {
            return;
        }
        
        // Check if this is the current route
        const isCurrentRoute = currentRoute && (
            currentRoute.id === route.id || 
            currentRoute.routeId === route.routeId
        );
        
        if (!isCurrentRoute) {
            return;
        }
        
        // Move this route to front when it becomes the current route
        moveRouteToFront();
        
        const routeId = route.id || route.routeId;
        const mainLayerId = `${routeId}-main-line`;
        const borderLayerId = `${routeId}-main-border`;
        
        // Reset animation state
        animationState.current = {
            growing: true,
            mainWidth: 3,
            borderWidth: 5
        };
        
        // Start the animation interval - using a slower interval for more visible effect
        animationIntervalRef.current = setInterval(() => {
            const state = animationState.current;
            
            // Calculate new widths with larger steps for more visible effect
            if (state.growing) {
                state.mainWidth += 0.2;
                state.borderWidth += 0.2;
                if (state.mainWidth >= 6) {
                    state.growing = false;
                }
            } else {
                state.mainWidth -= 0.2;
                state.borderWidth -= 0.2;
                if (state.mainWidth <= 3) {
                    state.growing = true;
                }
            }
            
            // Apply new widths to layers
            if (map.getLayer(mainLayerId)) {
                map.setPaintProperty(mainLayerId, 'line-width', state.mainWidth);
            }
            
            if (map.getLayer(borderLayerId)) {
                map.setPaintProperty(borderLayerId, 'line-width', state.borderWidth);
            }
        }, 50); // 50ms interval for smoother animation
        
        // Cleanup function
        return () => {
            if (animationIntervalRef.current) {
                clearInterval(animationIntervalRef.current);
                animationIntervalRef.current = null;
            }
            
            // Reset widths when unmounting
            if (map && map.getLayer(mainLayerId)) {
                map.setPaintProperty(mainLayerId, 'line-width', 3);
            }
            
            if (map && map.getLayer(borderLayerId)) {
                map.setPaintProperty(borderLayerId, 'line-width', 5);
            }
        };
    }, [map, route, isStyleLoaded, route?.isFocused]);

    return null;
};

export default RouteLayer;
