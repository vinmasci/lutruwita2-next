import { useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

/**
 * Component for handling fresh routes (newly uploaded GPX files)
 * 
 * @param {Object} props - Component props
 * @param {Object} props.mapInstance - Reference to the map instance
 * @param {boolean} props.isMapReady - Whether the map is ready
 * @param {Object} props.currentRoute - The current route
 * @param {Array} props.routes - All routes
 * @param {Function} props.addRouteClickHandler - Function to add route click handler
 * @returns {null} This component doesn't render anything
 */
const FreshRouteHandler = ({
  mapInstance,
  isMapReady,
  currentRoute,
  routes,
  addRouteClickHandler
}) => {
  // Reusable function to render a route on the map
  const renderRouteOnMap = useCallback(async (route, options = {}) => {
    if (!mapInstance.current || !isMapReady) {
      console.error('Map is not ready');
      return;
    }
    
    // Default options
    const { fitBounds = true } = options;
    
    const map = mapInstance.current;
    const routeId = route.routeId || `route-${route.id}`;
    console.log('[FreshRouteHandler] Rendering route:', routeId, 'with options:', { fitBounds });
    
    const mainLayerId = `${routeId}-main-line`;
    const borderLayerId = `${routeId}-main-border`;
    const mainSourceId = `${routeId}-main`;
    
    // Clean up existing layers
    if (map.getLayer(borderLayerId))
      map.removeLayer(borderLayerId);
    if (map.getLayer(mainLayerId))
      map.removeLayer(mainLayerId);
    if (map.getSource(mainSourceId))
      map.removeSource(mainSourceId);
        
    // Add the main route source and layers
    map.addSource(mainSourceId, {
      type: 'geojson',
      data: route.geojson,
      generateId: true,
      tolerance: 0.5
    });
    
    // Add main route layers
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
    
    map.addLayer({
      id: mainLayerId,
      type: 'line',
      source: mainSourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        visibility: 'visible'
      },
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#ff8f8f',
          route.color || '#ee5253'  // Use route color or default
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          5,
          3
        ],
        'line-opacity': 1
      }
    });
    
    // Render unpaved sections if they exist
    if (route.unpavedSections?.length) {
      route.unpavedSections?.forEach((section, index) => {
        const sourceId = `unpaved-section-${routeId}-${index}`;
        const layerId = `unpaved-section-layer-${routeId}-${index}`;
        
        // Clean up existing
        if (map.getSource(sourceId)) {
          map.removeLayer(layerId);
          map.removeSource(sourceId);
        }
        
        // Add source with surface property
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              surface: section.surfaceType
            },
            geometry: {
              type: 'LineString',
              coordinates: section.coordinates
            }
          }
        });
        
        // Add white dashed line for unpaved segments
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ffffff',  // Keep white for better visibility
            'line-width': 2,
            'line-dasharray': [1, 3]
          }
        });
      });
    }
    
    // Add click handler
    addRouteClickHandler(map, routeId);
    
    // Only fit bounds if requested
    if (fitBounds) {
      // Get coordinates from the GeoJSON
      const feature = route.geojson.features[0];
      
      // Wait briefly for layers to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fit bounds to show the route
      const bounds = new mapboxgl.LngLatBounds();
      feature.geometry.coordinates.forEach((coord) => {
        if (coord.length >= 2) {
          bounds.extend([coord[0], coord[1]]);
        }
      });
      
      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 13,
        minZoom: 13
      });
    }
  }, [isMapReady, mapInstance, addRouteClickHandler]);

  // Function to directly update route color on the map without re-rendering
  const updateRouteColor = useCallback((routeId, color) => {
    if (!mapInstance.current || !isMapReady) return;
    
    const map = mapInstance.current;
    const mainLayerId = `${routeId}-main-line`;
    
    // Check if the layer exists
    if (map.getLayer(mainLayerId)) {
      console.log('[FreshRouteHandler] Directly updating route color for', mainLayerId, 'to', color);
      
      // Update the line-color paint property
      map.setPaintProperty(mainLayerId, 'line-color', [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#ff8f8f',
        color || '#ee5253'
      ]);
    }
  }, [isMapReady, mapInstance]);

  // Effect to render current route when it changes
  useEffect(() => {
    if (!currentRoute || !mapInstance.current || !isMapReady || currentRoute._type !== 'fresh')
      return;
    
    // Log detailed information about the current route change
    console.log('[FreshRouteHandler] Current route changed:', {
      id: currentRoute.id,
      routeId: currentRoute.routeId || `route-${currentRoute.id}`,
      name: currentRoute.name || 'Unnamed',
      _type: currentRoute._type
    });
    
    // For new routes (GPX uploads), use renderRouteOnMap
    renderRouteOnMap(currentRoute).catch(error => {
      console.error('[FreshRouteHandler] Error rendering route:', error);
    });
    
    // Move the current route to the front
    const map = mapInstance.current;
    const currentRouteId = currentRoute.routeId || `route-${currentRoute.id}`;
    const currentMainLayerId = `${currentRouteId}-main-line`;
    const currentBorderLayerId = `${currentRouteId}-main-border`;
    
    // Move current route layers to front
    if (map.getLayer(currentMainLayerId)) {
      map.moveLayer(currentMainLayerId); // Move to the very top
      console.log(`[FreshRouteHandler] Moved current route layer ${currentMainLayerId} to front`);
    }
    
    if (map.getLayer(currentBorderLayerId)) {
      map.moveLayer(currentBorderLayerId); // Move to the very top
      console.log(`[FreshRouteHandler] Moved current route border layer ${currentBorderLayerId} to front`);
    }
    
    // Move all other routes to the back
    if (routes && routes.length > 0) {
      const map = mapInstance.current;
      routes.forEach(route => {
        // Skip the current route
        if (route.routeId === currentRoute.routeId || 
            route.id === currentRoute.id) {
          return;
        }
        
        const routeId = route.routeId || `route-${route.id}`;
        const mainLayerId = `${routeId}-main-line`;
        const borderLayerId = `${routeId}-main-border`;
        const surfaceLayerId = `unpaved-sections-layer-${routeId}`;
        
        // Move non-current route layers to back
        // Note: We're NOT using the second parameter to moveLayer, which would move it BEFORE that layer
        // Instead, we're moving the current route to the very top
        if (map.getLayer(mainLayerId)) {
          // Move to the very back by moving before the first layer
          const firstLayer = map.getStyle().layers[0].id;
          map.moveLayer(mainLayerId, firstLayer);
        }
        
        if (map.getLayer(borderLayerId)) {
          // Move to the very back by moving before the first layer
          const firstLayer = map.getStyle().layers[0].id;
          map.moveLayer(borderLayerId, firstLayer);
        }
        
        if (map.getLayer(surfaceLayerId)) {
          // Move to the very back by moving before the first layer
          const firstLayer = map.getStyle().layers[0].id;
          map.moveLayer(surfaceLayerId, firstLayer);
        }
      });
    }
  }, [currentRoute, isMapReady, renderRouteOnMap, routes, mapInstance]);
  
  // Effect to re-render the route when its color changes
  useEffect(() => {
    if (!currentRoute || !mapInstance.current || !isMapReady || currentRoute._type !== 'fresh')
      return;
        
    console.log('[FreshRouteHandler] Checking for color change:', {
      routeId: currentRoute.routeId || currentRoute.id,
      color: currentRoute.color
    });
    
    // For fresh routes, re-render when color changes, but don't zoom to fit bounds
    renderRouteOnMap(currentRoute, { fitBounds: false }).catch(error => {
      console.error('[FreshRouteHandler] Error re-rendering route after color change:', error);
    });
  }, [currentRoute?.color, isMapReady, renderRouteOnMap, currentRoute, mapInstance]);

  // This component doesn't render anything
  return null;
};

export default FreshRouteHandler;
