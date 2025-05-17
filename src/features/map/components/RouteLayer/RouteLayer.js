import { useEffect, useRef, useCallback } from 'react';
import { useMapStyle } from '../../hooks/useMapStyle';
import { useRouteState } from "../../hooks/useRouteState";
import { useRouteContext } from "../../context/RouteContext"; // Keep this import
import { queueRouteOperation, cleanupRouteLayers, safeRemoveLayer, safeRemoveSource } from '../../utils/mapOperationsUtils';
import logger from '../../../../utils/logger';

// Material UI colors
const DEFAULT_COLORS = {
    main: '#f44336', // Red
    hover: '#ff5252'  // Lighter red
};

export const RouteLayer = ({ map, route }) => {
    const isStyleLoaded = useMapStyle(map);
    const { routeVisibility, toggleRouteVisibility } = useRouteState();
    // Get setCurrentRoute and the full routes array from the context
    const { currentRoute, setCurrentRoute, routes } = useRouteContext();

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
    
    // Track if this route has already been rendered - reset when route changes
    const renderedRef = useRef(false);
    
    // Track if we've already moved this route to front after rendering
    const movedToFrontAfterRenderRef = useRef(false);
    
    // Reset rendered state when route changes
    useEffect(() => {
        renderedRef.current = false;
        movedToFrontAfterRenderRef.current = false;
    }, [route?.id, route?.routeId]);

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
        
        // Debug ID comparison for loaded routes - reduced logging for mobile
        if (route._type === 'loaded') {
            // Only log minimal info on mobile
            if (window.innerWidth <= 768) {
                logger.debug('RouteLayer', `ID comparison: isCurrentRoute=${isCurrentRoute}`);
            } else {
                logger.debug('RouteLayer', 'ID comparison for loaded route', {
                    isCurrentRoute,
                    routeType: route._type
                });
            }
        }
        
        // Only move to front if this is the current route
        if (isCurrentRoute) {
            logger.info('RouteLayer', 'Moving route to front:', routeId);
            
            // Find all layers for this route
            const mainLayerId = `${routeId}-main-line`;
            const borderLayerId = `${routeId}-main-border`;
            const surfaceLayerId = `unpaved-sections-layer-${routeId}`;
            
            // Get all layers in the map
            const style = map.getStyle();
            if (!style || !style.layers) {
                logger.error('RouteLayer', 'Map style not available');
                return;
            }
            
            // Find the topmost layer to move our layers above
            const lastLayerId = style.layers[style.layers.length - 1].id;
            
            // Move the layers to the front in the correct order
            try {
                // First move the border layer to the top
                if (map.getLayer(borderLayerId)) {
                    logger.debug('RouteLayer', 'Moving border layer to front:', borderLayerId);
                    map.moveLayer(borderLayerId, lastLayerId);
                }
                
                // Then move the main line layer above the border
                if (map.getLayer(mainLayerId)) {
                    logger.debug('RouteLayer', 'Moving main layer to front:', mainLayerId);
                    map.moveLayer(mainLayerId); // This will place it at the very top
                }
                
                // Finally move the surface layer above everything
                if (map.getLayer(surfaceLayerId)) {
                    logger.debug('RouteLayer', 'Moving surface layer to front:', surfaceLayerId);
                    map.moveLayer(surfaceLayerId); // This will place it at the very top
                }
                
                logger.debug('RouteLayer', 'Successfully moved route layers to front');
            } catch (error) {
                logger.error('RouteLayer', 'Error moving current route layers to front:', error);
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
    
    // Additional effect to ensure current route is moved to front after rendering
    useEffect(() => {
        // Only proceed if we have all the necessary pieces
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
        
        // Only move to front if this is the current route and we haven't already moved it
        if (isCurrentRoute && renderedRef.current && !movedToFrontAfterRenderRef.current) {
            logger.debug('RouteLayer', 'Moving current route to front after rendering:', routeId);
            
            // Add a small delay to ensure all map operations have completed
            setTimeout(() => {
                moveRouteToFront();
                movedToFrontAfterRenderRef.current = true;
            }, 500);
        }
    }, [map, route, isStyleLoaded, currentRoute, moveRouteToFront, renderedRef.current]);
    
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
                console.log('[RouteLayer] Skipping route rendering due to missing requirements:', {
                    hasMap: !!map,
                    hasRoute: !!route,
                    isStyleLoaded,
                    hasGeojson: !!route?.geojson,
                    hasError: !!route?.error,
                    routeId: route?.id || route?.routeId
                });
                return;
            }

            // Get the stable route ID - ensure consistent ID usage
            const routeId = route.id || route.routeId;
            const mainLayerId = `${routeId}-main-line`;
            const borderLayerId = `${routeId}-main-border`;
            const hoverLayerId = `${routeId}-hover-line`;
            const mainSourceId = `${routeId}-main`;
            const visibility = routeVisibility[routeId] || { mainRoute: true, unpavedSections: true };
            
            // Log route data for debugging
            console.log('[RouteLayer] Rendering route:', {
                routeId,
                name: route.name,
                hasGeojson: !!route.geojson,
                featureCount: route.geojson?.features?.length || 0,
                geometryType: route.geojson?.features?.[0]?.geometry?.type,
                coordinatesCount: route.geojson?.features?.[0]?.geometry?.coordinates?.length || 0,
                alreadyRendered: renderedRef.current && map.getLayer(mainLayerId)
            });
            
            // If the route is already rendered, skip rendering
            if (map.getLayer(mainLayerId) && renderedRef.current) {
                console.log(`[RouteLayer] Route ${routeId} already rendered, skipping`);
                return;
            }

            // Queue the route rendering operation to ensure proper timing
            queueRouteOperation(map, route, (mapInstance, currentRoute) => {
                try {
                    // Log the GeoJSON data for debugging
                    console.log('[RouteLayer] GeoJSON data for route:', {
                        routeId: currentRoute.routeId || currentRoute.id,
                        geojson: currentRoute.geojson,
                        isObject: typeof currentRoute.geojson === 'object',
                        hasFeatures: !!currentRoute.geojson.features,
                        featuresIsArray: Array.isArray(currentRoute.geojson.features),
                        featuresLength: currentRoute.geojson.features?.length || 0
                    });

                    // Initial validation of GeoJSON data
                    if (!currentRoute.geojson.features || !currentRoute.geojson.features.length) {
                        logger.error('RouteLayer', 'Invalid GeoJSON data', {
                            routeId: currentRoute.routeId || currentRoute.id
                        });
                        
                        // Try to fix the GeoJSON data if it's a string
                        if (typeof currentRoute.geojson === 'string') {
                            try {
                                console.log('[RouteLayer] Attempting to parse GeoJSON string');
                                currentRoute.geojson = JSON.parse(currentRoute.geojson);
                                console.log('[RouteLayer] Successfully parsed GeoJSON string');
                            } catch (parseError) {
                                console.error('[RouteLayer] Failed to parse GeoJSON string:', parseError);
                                return;
                            }
                        } else {
                            return;
                        }
                    }

                    // Extract and validate geometry
                    const geometry = currentRoute.geojson.features[0]?.geometry;
                    if (!geometry || geometry.type !== 'LineString') {
                        logger.error('RouteLayer', 'Invalid GeoJSON structure', {
                            featureType: geometry?.type,
                            expected: 'LineString'
                        });
                        
                        // Log more details about the geometry
                        console.log('[RouteLayer] Invalid geometry details:', {
                            geometry,
                            geometryType: geometry?.type,
                            hasCoordinates: !!geometry?.coordinates,
                            coordinatesLength: geometry?.coordinates?.length || 0
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
                    // Use the 'route' prop for its own unpavedSections, not 'currentRoute' from context
                    logger.debug('RouteLayer', `Checking unpavedSections for specific segment ${routeId}:`, route.unpavedSections);
                    if (route.unpavedSections && route.unpavedSections.length > 0) {
                        logger.info('RouteLayer', `Rendering unpavedSections for specific segment ${routeId}`, route.unpavedSections);
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
                        logger.debug('RouteLayer', `Unpaved layer ${surfaceLayerId} for route ${routeId} visibility set to: ${visibility.unpavedSections ? 'visible' : 'none'}`);
                    }

                    // --- Event Handlers ---

                    // Mouse enter/move handler (for cursor and optional hover effect)
                    const mouseHandler = () => {
                        mapInstance.getCanvas().style.cursor = 'pointer';
                        // Optional: Show hover effect if needed (using hoverLayerId)
                        // if (mapInstance.getLayer(hoverLayerId) && visibility.mainRoute) {
                        //     mapInstance.setLayoutProperty(hoverLayerId, 'visibility', 'visible');
                        // }
                    };

                    // Mouse leave handler
                    const mouseleaveHandler = () => {
                        mapInstance.getCanvas().style.cursor = '';
                        // Optional: Hide hover effect
                        // if (mapInstance.getLayer(hoverLayerId)) {
                        //     mapInstance.setLayoutProperty(hoverLayerId, 'visibility', 'none');
                        // }
                    };

                    // Click handler to set the current route
                    const clickHandler = (e) => {
                        // Prevent clicks from propagating to other layers if needed
                        // e.originalEvent.stopPropagation();

                        // Find the full route object from the context's routes array
                        const clickedRoute = routes.find(r => (r.id || r.routeId) === routeId);

                        if (clickedRoute) {
                            logger.debug('RouteLayer', 'Route clicked, setting as current:', routeId);
                            setCurrentRoute(clickedRoute);
                        } else {
                            logger.warn('RouteLayer', 'Clicked route not found in context:', routeId);
                        }
                    };

                    // Attach listeners to the main line layer
                    mapInstance.on('click', mainLayerId, clickHandler);
                    mapInstance.on('mouseenter', mainLayerId, mouseHandler);
                    mapInstance.on('mousemove', mainLayerId, mouseHandler); // Keep mousemove for consistent cursor
                    mapInstance.on('mouseleave', mainLayerId, mouseleaveHandler);

                    // Mark this route as rendered
                    renderedRef.current = true;
                    
                    // Reset the moved to front flag when re-rendering
                    movedToFrontAfterRenderRef.current = false;
                } catch (error) {
                    logger.error('RouteLayer', 'Error in route rendering operation:', error);
                }
            }, `render-route-${routeId}`);

    // Return cleanup function
    return () => {
        // Clean up event listeners when component unmounts or route changes
        if (map) {
            try {
                // Get the stable route ID
                const routeId = route?.id || route?.routeId;
                if (!routeId) return;
                
                // Create a list of all possible layer IDs that might have event handlers
                const mainLayerId = `${routeId}-main-line`;
                const borderLayerId = `${routeId}-main-border`;
                const hoverLayerId = `${routeId}-hover-line`;
                const surfaceLayerId = `unpaved-sections-layer-${routeId}`;
                
                // List of all layer IDs to clean up
                const layersToCleanup = [
                    mainLayerId,
                    borderLayerId,
                    hoverLayerId,
                    surfaceLayerId,
                    // Add variations with 'route-' prefix
                    `route-${routeId}-main-line`,
                    `route-${routeId}-main-border`,
                    `route-${routeId}-hover-line`,
                    `unpaved-sections-layer-route-${routeId}`
                ];
                
                // Remove all event handlers from all possible layers
                layersToCleanup.forEach(layerId => {
                    try {
                        if (map.getLayer(layerId)) {
                            logger.debug('RouteLayer', `Removing event handlers from layer: ${layerId}`);
                            map.off('click', layerId);
                            map.off('mouseenter', layerId);
                            map.off('mousemove', layerId);
                            map.off('mouseleave', layerId);
                        }
                    } catch (layerError) {
                        // Log error but don't crash if map/layer is gone
                        logger.warn('RouteLayer', `Error cleaning up listeners for ${layerId}:`, layerError.message);
                    }
                });
                
                // Also remove any layers and sources that might still exist
                layersToCleanup.forEach(layerId => {
                    try {
                        if (map.getLayer(layerId)) {
                            logger.debug('RouteLayer', `Removing layer during cleanup: ${layerId}`);
                            map.removeLayer(layerId);
                        }
                    } catch (layerError) {
                        // Ignore errors when removing layers
                    }
                });
                
                // Remove sources
                const sourcesToCleanup = [
                    `${routeId}-main`,
                    `unpaved-section-${routeId}`,
                    `unpaved-sections-${routeId}`,
                    // Add variations with 'route-' prefix
                    `route-${routeId}-main`,
                    `unpaved-section-route-${routeId}`,
                    `unpaved-sections-route-${routeId}`
                ];
                
                sourcesToCleanup.forEach(sourceId => {
                    try {
                        if (map.getSource(sourceId)) {
                            logger.debug('RouteLayer', `Removing source during cleanup: ${sourceId}`);
                            map.removeSource(sourceId);
                        }
                    } catch (sourceError) {
                        // Ignore errors when removing sources
                    }
                });
            } catch (cleanupError) {
                // Log error but don't crash if map is gone
                logger.warn('RouteLayer', 'Error during comprehensive cleanup:', cleanupError.message);
            }
        }
    };
        }
        catch (error) {
            logger.error('RouteLayer', 'Error rendering route:', error);
        }
        // Add setCurrentRoute and routes to dependency array
    }, [map, route, isStyleLoaded, routeVisibility, setCurrentRoute, routes]);

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

    // Animation effect for the current route - disabled on mobile devices
    useEffect(() => {
        // Clear any existing animation interval
        if (animationIntervalRef.current) {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
        }
        
        // Check if device is mobile - disable animation completely on mobile
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            return; // Skip animation entirely on mobile devices
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
        
        // Debug ID comparison for loaded routes in animation effect - reduced logging
        if (route._type === 'loaded') {
            logger.debug('RouteLayer', 'Animation ID comparison', {
                isCurrentRoute,
                routeType: route._type
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
