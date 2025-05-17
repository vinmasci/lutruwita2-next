import { useEffect, useRef, useCallback, useState } from 'react';
import { useMapStyle } from '../../../../map/hooks/useMapStyle';
import { useEmbedRouteState } from "../hooks/useEmbedRouteState";
import { queueRouteOperation, cleanupRouteLayers } from '../../../../map/utils/mapOperationsUtils';

// Material UI colors
const DEFAULT_COLORS = {
    main: '#f44336', // Red
    hover: '#ff5252'  // Lighter red
};

/**
 * Helper function to check if a color is a valid hex color
 * @param {string} color - The color to check
 * @returns {boolean} - True if the color is a valid hex color
 */
const isValidHexColor = (color) => {
    return typeof color === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(color);
};

/**
 * Helper function to convert a hex color to RGBA
 * @param {string} hex - The hex color to convert
 * @param {number} alpha - The alpha value (0-1)
 * @returns {string} - The RGBA color string
 */
const hexToRgba = (hex, alpha = 1) => {
    // Default to red if hex is invalid
    if (!isValidHexColor(hex)) {
        return `rgba(244, 67, 54, ${alpha})`; // Default red with alpha
    }
    
    // Remove the hash
    hex = hex.replace('#', '');
    
    // Convert 3-digit hex to 6-digit
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Return the rgba string
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Helper function to get a valid color with opacity for Mapbox
 * @param {string} color - The base color
 * @param {number} opacity - The opacity value (0-1)
 * @returns {string} - A valid color string with opacity
 */
const getColorWithOpacity = (color, opacity = 0.6) => {
    // If it's a valid hex color, convert to rgba
    if (isValidHexColor(color)) {
        return hexToRgba(color, opacity);
    }
    
    // If it's already an rgba color, try to parse and update the alpha
    if (typeof color === 'string' && color.startsWith('rgba(')) {
        try {
            // Extract the RGB values
            const rgbMatch = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/);
            if (rgbMatch) {
                return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
            }
        } catch (e) {
            console.error('[EmbedRouteLayer] Error parsing rgba color:', e);
        }
    }
    
    // If it's an rgb color, convert to rgba
    if (typeof color === 'string' && color.startsWith('rgb(')) {
        try {
            // Extract the RGB values
            const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
            if (rgbMatch) {
                return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
            }
        } catch (e) {
            console.error('[EmbedRouteLayer] Error parsing rgb color:', e);
        }
    }
    
    // For any other format or if parsing fails, return the default color with opacity
    return `rgba(244, 67, 54, ${opacity})`; // Default red with alpha
};

// This is a simplified version of RouteLayer that doesn't use RouteContext
export const EmbedRouteLayer = ({ map, route, currentRoute }) => {
    const isStyleLoaded = useMapStyle(map);
    const { routeVisibility, toggleRouteVisibility, initializeRouteVisibility } = useEmbedRouteState();
    
    // Initialize route visibility when the route changes
    useEffect(() => {
        if (route) {
            initializeRouteVisibility([route]);
        }
    }, [route, initializeRouteVisibility]);

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
            console.log('[EmbedRouteLayer] ID comparison for loaded route:', {
                routeIds,
                currentRouteIds,
                isCurrentRoute,
                routeType: route._type,
                loadedState: route._loadedState ? true : false
            });
        }
        
        // Only move to front if this is the current route
        if (isCurrentRoute) {
            console.log('[EmbedRouteLayer] Moving route to front:', routeId);
            
            // Find all layers for this route
            const mainLayerId = `${routeId}-main-line`;
            const borderLayerId = `${routeId}-main-border`;
            const surfaceLayerId = `unpaved-sections-layer-${routeId}`;
            
            // Get all layers in the map
            const style = map.getStyle();
            if (!style || !style.layers) {
                console.error('[EmbedRouteLayer] Map style not available');
                return;
            }
            
            // Find the topmost layer to move our layers above
            const lastLayerId = style.layers[style.layers.length - 1].id;
            
            // Move the layers to the front in the correct order
            try {
                // First move the border layer to the top
                if (map.getLayer(borderLayerId)) {
                    console.log('[EmbedRouteLayer] Moving border layer to front:', borderLayerId);
                    map.moveLayer(borderLayerId, lastLayerId);
                }
                
                // Then move the main line layer above the border
                if (map.getLayer(mainLayerId)) {
                    console.log('[EmbedRouteLayer] Moving main layer to front:', mainLayerId);
                    map.moveLayer(mainLayerId); // This will place it at the very top
                }
                
                // Finally move the surface layer above everything
                if (map.getLayer(surfaceLayerId)) {
                    console.log('[EmbedRouteLayer] Moving surface layer to front:', surfaceLayerId);
                    map.moveLayer(surfaceLayerId); // This will place it at the very top
                }
                
                console.log('[EmbedRouteLayer] Successfully moved route layers to front');
            } catch (error) {
                console.error(`[EmbedRouteLayer] Error moving current route layers to front:`, error);
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
                        console.error('[EmbedRouteLayer] Invalid GeoJSON data:', {
                            routeId: currentRoute.routeId || currentRoute.id,
                            geojsonType: currentRoute.geojson.type,
                            featureCount: currentRoute.geojson.features?.length
                        });
                        return;
                    }

                    // Extract and validate geometry
                    const geometry = currentRoute.geojson.features[0].geometry;
                    if (!geometry || geometry.type !== 'LineString') {
                        console.error('[EmbedRouteLayer] Invalid GeoJSON structure:', {
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
                        // Use the getColorWithOpacity helper to ensure a valid color with opacity
                        const hoverColor = currentRoute.color 
                            ? getColorWithOpacity(currentRoute.color, 0.6) // 0.6 opacity (similar to 99 in hex)
                            : DEFAULT_COLORS.hover;
                            
                        console.log(`[EmbedRouteLayer] Using hover color: ${hoverColor} for route: ${routeId}`);
                        
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
                                'line-color': hoverColor,
                                'line-width': 5,
                                'line-opacity': 1
                            }
                        });
                    }

                    // Add combined surface layer for all routes
                    if (currentRoute.unpavedSections && currentRoute.unpavedSections.length > 0) {
                        const surfaceSourceId = `unpaved-sections-${routeId}`;
                        const surfaceLayerId = `unpaved-sections-layer-${routeId}`;

                        // Get the main route coordinates
                        const mainCoordinates = currentRoute.geojson.features[0].geometry.coordinates;
                        
                        // Combine all unpaved sections into a single feature collection
                        const features = currentRoute.unpavedSections
                            .filter(section => section.coordinates && section.coordinates.length > 0)
                            .map(section => {
                                console.log(`[EmbedRouteLayer] Using coordinates for unpaved section: ${section.surfaceType}, ${section.coordinates.length} points`);
                                
                                return {
                                    type: 'Feature',
                                    properties: {
                                        surface: section.surfaceType
                                    },
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: section.coordinates
                                    }
                                };
                            });

                        // Filter out features with empty coordinates
                        const validFeatures = features.filter(feature => 
                            feature.geometry.coordinates && 
                            feature.geometry.coordinates.length > 1
                        );
                        
                        if (validFeatures.length > 0) {
                            mapInstance.addSource(surfaceSourceId, {
                                type: 'geojson',
                                data: {
                                    type: 'FeatureCollection',
                                    features: validFeatures
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
                            
                            console.log(`[EmbedRouteLayer] Added unpaved sections layer with ${validFeatures.length} features`);
                        } else {
                            console.warn('[EmbedRouteLayer] No valid unpaved section features to render');
                        }
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
                    console.error('[EmbedRouteLayer] Error in route rendering operation:', error);
                    // Don't try to use setError here as it's not available
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
            console.error('[EmbedRouteLayer] Error rendering route:', error);
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
                // Use the getColorWithOpacity helper to ensure a valid color with opacity
                const hoverColor = currentColor 
                    ? getColorWithOpacity(currentColor, 0.6) // 0.6 opacity (similar to 99 in hex)
                    : DEFAULT_COLORS.hover;
                
                map.setPaintProperty(
                    hoverLayerId,
                    'line-color',
                    hoverColor
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
            console.log('[EmbedRouteLayer] Animation ID comparison for loaded route:', {
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

export default EmbedRouteLayer;
