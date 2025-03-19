import { useEffect, useRef, useCallback } from 'react';
import { useMapStyle } from '../../hooks/useMapStyle';
import { useRouteState } from "../../hooks/useRouteState";
import { useRouteContext } from "../../context/RouteContext";
import { queueRouteOperation, cleanupRouteLayers, safeRemoveLayer, safeRemoveSource } from '../../utils/mapOperationsUtils';

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
    
    // Track if this route has already been rendered
    const renderedRef = useRef(false);

    // Function to find and update layer visibility
    const updateLayerVisibility = useCallback(() => {
        if (!map || !route || !isStyleLoaded) return;
        
        // Get the stable route ID
        const routeId = route.id || route.routeId;
        
        // Get all layers in the map
        const allLayers = map.getStyle().layers.map(layer => layer.id);
        
        // Find all layers that might be related to this route
        const routeLayers = allLayers.filter(layerId => 
            layerId.includes(routeId) || 
            (route.routeId && layerId.includes(route.routeId))
        );
        
        // Find main line and border layers
        const mainLineLayers = routeLayers.filter(layerId => layerId.includes('-main-line'));
        const borderLayers = routeLayers.filter(layerId => layerId.includes('-main-border'));
        const surfaceLayers = routeLayers.filter(layerId => layerId.includes('unpaved-sections-layer'));
        
        // Get visibility state
        const visibility = routeVisibility[routeId] || { mainRoute: true, unpavedSections: true };
        
        // Update main line layers
        mainLineLayers.forEach(layerId => {
            map.setLayoutProperty(
                layerId,
                'visibility',
                visibility.mainRoute ? 'visible' : 'none'
            );
        });
        
        // Update border layers
        borderLayers.forEach(layerId => {
            map.setLayoutProperty(
                layerId,
                'visibility',
                visibility.mainRoute ? 'visible' : 'none'
            );
        });
        
        // Update surface layers
        surfaceLayers.forEach(layerId => {
            map.setLayoutProperty(
                layerId,
                'visibility',
                visibility.unpavedSections ? 'visible' : 'none'
            );
        });
    }, [map, route, isStyleLoaded, routeVisibility]);
    
    // Function to move route layers to front - ENHANCED VERSION
    const moveRouteToFront = useCallback(() => {
        if (!map || !route || !isStyleLoaded) return;
        
        // Get the stable route ID
        const routeId = route.id || route.routeId;
        
        // Extract IDs for comparison, handling different formats
        const routeIds = [
            routeId,
            route.id,
            route.routeId,
            // Handle 'route-' prefix variations
            routeId?.startsWith('route-') ? routeId.substring(6) : `route-${routeId}`
        ].filter(Boolean); // Remove any undefined/null values
        
        const currentRouteIds = [
            currentRoute?.id,
            currentRoute?.routeId,
            // Handle 'route-' prefix variations
            currentRoute?.id?.startsWith('route-') ? currentRoute.id.substring(6) : currentRoute?.id ? `route-${currentRoute.id}` : null,
            currentRoute?.routeId?.startsWith('route-') ? currentRoute.routeId.substring(6) : currentRoute?.routeId ? `route-${currentRoute.routeId}` : null
        ].filter(Boolean); // Remove any undefined/null values
        
        // Check if any of the route IDs match any of the current route IDs
        const isCurrentRoute = currentRoute && routeIds.some(id => 
            currentRouteIds.some(currentId => 
                id === currentId || id.toString() === currentId.toString()
            )
        );
        
        // Debug ID comparison for loaded routes
        if (route._type === 'loaded') {
            console.log('[RouteLayer] ID comparison for loaded route:', {
                routeIds,
                currentRouteIds,
                isCurrentRoute,
                routeType: route._type,
                loadedState: route._loadedState ? true : false
            });
        }
        
        // Only move to front if this is the current route
        if (isCurrentRoute) {
            console.log('[RouteLayer] Moving route to front:', routeId);
            
            // Find all layers for this route
            const mainLayerId = `${routeId}-main-line`;
            const borderLayerId = `${routeId}-main-border`;
            const surfaceLayerId = `unpaved-sections-layer-${routeId}`;
            
            // Get all layers in the map
            const style = map.getStyle();
            if (!style || !style.layers) {
                console.error('[RouteLayer] Map style not available');
                return;
            }
            
            // Find the topmost layer to move our layers above
            const lastLayerId = style.layers[style.layers.length - 1].id;
            
            // Move the layers to the front in the correct order
            try {
                // First move the border layer to the top
                if (map.getLayer(borderLayerId)) {
                    console.log('[RouteLayer] Moving border layer to front:', borderLayerId);
                    map.moveLayer(borderLayerId, lastLayerId);
                }
                
                // Then move the main line layer above the border
                if (map.getLayer(mainLayerId)) {
                    console.log('[RouteLayer] Moving main layer to front:', mainLayerId);
                    map.moveLayer(mainLayerId); // This will place it at the very top
                }
                
                // Finally move the surface layer above everything
                if (map.getLayer(surfaceLayerId)) {
                    console.log('[RouteLayer] Moving surface layer to front:', surfaceLayerId);
                    map.moveLayer(surfaceLayerId); // This will place it at the very top
                }
                
                console.log('[RouteLayer] Successfully moved route layers to front');
            } catch (error) {
                console.error(`[RouteLayer] Error moving current route layers to front:`, error);
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
            // Wait for the style to load before updating visibility
            setTimeout(updateLayerVisibility, 500);
        };
        
        map.on('style.load', styleChangeHandler);
        
        return () => {
            map.off('style.load', styleChangeHandler);
        };
    }, [map, updateLayerVisibility]);

    // Main effect for rendering the route
    useEffect(() => {
        try {
            // Skip rendering if the route has an error flag or is missing geojson data
            if (!map || !route || !isStyleLoaded || !route.geojson || route.error) {
                return;
            }

            // Get the stable route ID - ensure consistent ID usage
            const routeId = route.id || route.routeId;
            const mainLayerId = `${routeId}-main-line`;
            const borderLayerId = `${routeId}-main-border`;
            const hoverLayerId = `${routeId}-hover-line`;
            const mainSourceId = `${routeId}-main`;
            const visibility = routeVisibility[routeId] || { mainRoute: true, unpavedSections: true };
            
            // If the route is already rendered, skip rendering
            if (map.getLayer(mainLayerId) && renderedRef.current) {
                return;
            }

            // Queue the route rendering operation to ensure proper timing
            queueRouteOperation(map, route, (mapInstance, currentRoute) => {
                try {
                    // Initial validation of GeoJSON data
                    if (!currentRoute.geojson.features || !currentRoute.geojson.features.length) {
                        console.error('[RouteLayer] Invalid GeoJSON data:', {
                            routeId: currentRoute.routeId || currentRoute.id,
                            geojsonType: currentRoute.geojson.type,
                            featureCount: currentRoute.geojson.features?.length
                        });
                        return;
                    }

                    // Extract and validate geometry
                    const geometry = currentRoute.geojson.features[0].geometry;
                    if (!geometry || geometry.type !== 'LineString') {
                        console.error('[RouteLayer] Invalid GeoJSON structure:', {
                            featureType: geometry?.type,
                            expected: 'LineString'
                        });
                        return;
                    }

                    // Clean up existing layers and sources for this route
                    cleanupRouteLayers(mapInstance, routeId);

                    // Add main route source
                    mapInstance.addSource(mainSourceId, {
                        type: 'geojson',
                        data: currentRoute.geojson,
                        tolerance: 0.5
                    });

                    // Add border layer
                    mapInstance.addLayer({
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
                    mapInstance.addLayer({
                        id: mainLayerId,
                        type: 'line',
                        source: mainSourceId,
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round',
                            visibility: visibility.mainRoute ? 'visible' : 'none'
                        },
                        paint: {
                            'line-color': currentRoute.color || DEFAULT_COLORS.main,
                            'line-width': 3,
                            'line-opacity': 1
                        }
                    });

                    // Add hover layer (initially hidden) only for focused routes
                    if (currentRoute.isFocused) {
                        mapInstance.addLayer({
                            id: hoverLayerId,
                            type: 'line',
                            source: mainSourceId,
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round',
                                visibility: 'none'
                            },
                            paint: {
                                'line-color': currentRoute.color ? `${currentRoute.color}99` : DEFAULT_COLORS.hover,
                                'line-width': 5,
                                'line-opacity': 1
                            }
                        });
                    }

                    // Add combined surface layer for all routes
                    if (currentRoute.unpavedSections && currentRoute.unpavedSections.length > 0) {
                        const surfaceSourceId = `unpaved-sections-${routeId}`;
                        const surfaceLayerId = `unpaved-sections-layer-${routeId}`;

                        // Combine all unpaved sections into a single feature collection
                        const features = currentRoute.unpavedSections.map(section => ({
                            type: 'Feature',
                            properties: {
                                surface: section.surfaceType
                            },
                            geometry: {
                                type: 'LineString',
                                coordinates: section.coordinates
                            }
                        }));

                        mapInstance.addSource(surfaceSourceId, {
                            type: 'geojson',
                            data: {
                                type: 'FeatureCollection',
                                features
                            },
                            tolerance: 1, // Increase simplification tolerance
                            maxzoom: 14 // Limit detail at high zoom levels
                        });

                        mapInstance.addLayer({
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
                    if (currentRoute.isFocused) {
                        const mouseHandler = () => {
                            mapInstance.getCanvas().style.cursor = 'pointer';
                            if (visibility.mainRoute) {
                                mapInstance.setLayoutProperty(hoverLayerId, 'visibility', 'visible');
                            }
                        };

                        const mouseleaveHandler = () => {
                            mapInstance.getCanvas().style.cursor = '';
                            mapInstance.setLayoutProperty(hoverLayerId, 'visibility', 'none');
                        };

                        // Add click handler for toggling visibility
                        const clickHandler = () => {
                            // Just toggle hover layer visibility, no re-rendering
                            if (visibility.mainRoute) {
                                mapInstance.setLayoutProperty(hoverLayerId, 'visibility', 'visible');
                            }
                        };

                        mapInstance.on('click', mainLayerId, clickHandler);
                        mapInstance.on('mouseenter', mainLayerId, mouseHandler);
                        mapInstance.on('mousemove', mainLayerId, mouseHandler);
                        mapInstance.on('mouseleave', mainLayerId, mouseleaveHandler);
                    }
                    
                    // Mark this route as rendered
                    renderedRef.current = true;
                } catch (error) {
                    console.error('[RouteLayer] Error in route rendering operation:', error);
                }
            }, `render-route-${routeId}`);

            // Return cleanup function
            return () => {
                // Clean up event listeners when component unmounts
                if (map) {
                    map.off('click', mainLayerId);
                    map.off('mouseenter', mainLayerId);
                    map.off('mousemove', mainLayerId);
                    map.off('mouseleave', mainLayerId);
                }
            };
        }
        catch (error) {
            console.error('[RouteLayer] Error rendering route:', error);
        }
    }, [map, route, isStyleLoaded, routeVisibility]);

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
        
        // Get the stable route ID
        const routeId = route.id || route.routeId;
        
        // Extract IDs for comparison, handling different formats
        const routeIds = [
            routeId,
            route.id,
            route.routeId,
            // Handle 'route-' prefix variations
            routeId?.startsWith('route-') ? routeId.substring(6) : `route-${routeId}`
        ].filter(Boolean); // Remove any undefined/null values
        
        const currentRouteIds = [
            currentRoute?.id,
            currentRoute?.routeId,
            // Handle 'route-' prefix variations
            currentRoute?.id?.startsWith('route-') ? currentRoute.id.substring(6) : currentRoute?.id ? `route-${currentRoute.id}` : null,
            currentRoute?.routeId?.startsWith('route-') ? currentRoute.routeId.substring(6) : currentRoute?.routeId ? `route-${currentRoute.routeId}` : null
        ].filter(Boolean); // Remove any undefined/null values
        
        // Check if any of the route IDs match any of the current route IDs
        const isCurrentRoute = currentRoute && routeIds.some(id => 
            currentRouteIds.some(currentId => 
                id === currentId || id.toString() === currentId.toString()
            )
        );
        
        // Debug ID comparison for loaded routes in animation effect
        if (route._type === 'loaded') {
            console.log('[RouteLayer] Animation ID comparison for loaded route:', {
                routeIds,
                currentRouteIds,
                isCurrentRoute,
                routeType: route._type,
                loadedState: route._loadedState ? true : false
            });
        }
        
        if (!isCurrentRoute) {
            return;
        }
        
        // Move this route to front when it becomes the current route
        moveRouteToFront();
        
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
    }, [map, route, isStyleLoaded, currentRoute, moveRouteToFront]);

    return null;
};

export default RouteLayer;
