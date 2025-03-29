import { useEffect } from 'react';

/**
 * Hook to handle map events like mousemove and mouseout
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.mapInstance - Reference to the map instance
 * @param {boolean} options.isMapReady - Whether the map is ready
 * @param {Object} options.currentRouteId - Reference to the current route ID
 * @param {Object} options.currentRoute - The current route
 * @param {Function} options.setHoverCoordinates - Function to set hover coordinates
 * @param {Array} options.hoverCoordinates - Current hover coordinates
 * @returns {void}
 */
export const useMapEvents = ({
  mapInstance,
  isMapReady,
  currentRouteId,
  currentRoute,
  setHoverCoordinates,
  hoverCoordinates
}) => {
  // Add mousemove and mouseout event handlers
  useEffect(() => {
    if (!mapInstance.current || !isMapReady) return;
    
    const map = mapInstance.current;
    
    // Add mousemove event to set hover coordinates
    const mousemoveHandler = (e) => {
      // Get mouse coordinates
      const mouseCoords = [e.lngLat.lng, e.lngLat.lat];
      
      // Get all route sources directly from the map
      const style = map.getStyle();
      if (!style || !style.sources) return;
      
      // Find all sources that might contain route data
      let routeSources = Object.entries(style.sources)
        .filter(([id, source]) => 
          id.includes('-main') && 
          source.type === 'geojson' && 
          source.data?.features?.[0]?.geometry?.type === 'LineString'
        );
      
      // Try to find the active route - completely new approach
      let activeRouteSource = null;
      let activeRouteId = null;
      
      // If we have a current route from context, use it directly
      if (currentRoute) {
        // Reduced logging - only log in development mode with debug flag
        const shouldLog = process.env.NODE_ENV === 'development' && process.env.VITE_DEBUG_LOGGING === 'true';
        
        if (shouldLog) {
          console.log('[useMapEvents] Current route from context:', {
            id: currentRoute.id,
            routeId: currentRoute.routeId,
            type: currentRoute._type,
            name: currentRoute.name
          });
        }
        
        // Get all possible source IDs for this route
        const possibleSourceIds = [];
        
        // Add the route ID with -main suffix
        if (currentRoute.routeId) {
          possibleSourceIds.push(`${currentRoute.routeId}-main`);
          // Also try without 'route-' prefix if it has one
          if (currentRoute.routeId.startsWith('route-')) {
            possibleSourceIds.push(`${currentRoute.routeId.substring(6)}-main`);
          } else {
            // Or with 'route-' prefix if it doesn't
            possibleSourceIds.push(`route-${currentRoute.routeId}-main`);
          }
        }
        
        // Add the route.id with -main suffix
        if (currentRoute.id) {
          possibleSourceIds.push(`${currentRoute.id}-main`);
          possibleSourceIds.push(`route-${currentRoute.id}-main`);
        }
        
        if (shouldLog) {
          console.log('[useMapEvents] Possible source IDs:', possibleSourceIds);
          console.log('[useMapEvents] Available sources:', routeSources.map(([id]) => id));
        }
        
        // Try to find a matching source
        for (const sourceId of possibleSourceIds) {
          const foundSource = routeSources.find(([id]) => id === sourceId);
          if (foundSource) {
            activeRouteSource = foundSource[1];
            activeRouteId = sourceId.replace('-main', '');
            if (shouldLog) {
              console.log('[useMapEvents] Found matching source:', sourceId);
            }
            break;
          }
        }
        
        // If we still couldn't find a source, try a more aggressive approach
        if (!activeRouteSource) {
          if (shouldLog) {
            console.log('[useMapEvents] No exact match found, trying partial matches');
          }
          
          // Try to find any source that contains parts of the route ID
          for (const [id, source] of routeSources) {
            const routeIdPart = currentRoute.routeId || currentRoute.id;
            if (routeIdPart && id.includes(routeIdPart.replace('route-', ''))) {
              activeRouteSource = source;
              activeRouteId = id.replace('-main', '');
              if (shouldLog) {
                console.log('[useMapEvents] Found partial match:', id);
              }
              break;
            }
          }
        }
        
        // If we still couldn't find a source, log the issue but don't use a fallback
        if (!activeRouteSource) {
          // Keep error logs for important issues
          if (shouldLog) {
            console.error('[useMapEvents] Could not find source for current route:', {
              currentRoute: currentRoute.routeId || currentRoute.id,
              availableSources: routeSources.map(([id]) => id)
            });
          }
          
          // Clear hover coordinates and return
          if (hoverCoordinates) {
            setHoverCoordinates(null);
          }
          return;
        }
      } else {
        // No current route set, use the first route as fallback
        if (routeSources.length > 0) {
          activeRouteSource = routeSources[0][1];
          activeRouteId = routeSources[0][0].replace('-main', '');
          
          // Reduced logging - only log in development mode with debug flag
          const shouldLog = process.env.NODE_ENV === 'development' && process.env.VITE_DEBUG_LOGGING === 'true';
          if (shouldLog) {
            console.log('[useMapEvents] No current route, using first route as fallback:', activeRouteId);
          }
        }
      }
      
      // If we still don't have an active route, clear any marker and return
      if (!activeRouteSource) {
        if (hoverCoordinates) {
          setHoverCoordinates(null);
        }
        return;
      }
      
      // Get coordinates from the active route
      const coordinates = activeRouteSource.data.features[0].geometry.coordinates;
      
      // Find the closest point on the active route
      let closestPoint = null;
      let minDistance = Infinity;
      
      // Check all coordinates in the active route
      coordinates.forEach((coord) => {
        const dx = coord[0] - mouseCoords[0];
        const dy = coord[1] - mouseCoords[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = coord;
        }
      });
      
      // Define a threshold distance - only show marker when close to the route
      const distanceThreshold = 0.0045; // Approximately 500m at the equator
      
      // If we found a closest point on the active route and it's within the threshold
      if (closestPoint && minDistance < distanceThreshold) {
        setHoverCoordinates(closestPoint);
      } else {
        // If no point found or too far from route, clear the marker
        setHoverCoordinates(null); // Always clear coordinates when outside threshold
      }
    };
    
    // Add mouseout event to clear hover coordinates when cursor leaves the map
    const mouseoutHandler = () => {
      // Clear hover coordinates when mouse leaves the map
      setHoverCoordinates(null);
    };
    
    // Add event listeners
    map.on('mousemove', mousemoveHandler);
    map.on('mouseout', mouseoutHandler);
    
    // Clean up event listeners when component unmounts
    return () => {
      map.off('mousemove', mousemoveHandler);
      map.off('mouseout', mouseoutHandler);
    };
  }, [mapInstance, isMapReady, currentRouteId, currentRoute, setHoverCoordinates, hoverCoordinates]);
};
