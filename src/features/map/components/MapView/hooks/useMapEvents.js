import { useEffect, useCallback } from 'react';
import { throttle } from 'lodash';
import { findClosestPointOnRoute, createRouteSpatialGrid } from '../../../../../utils/routeUtils';

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
 * @param {Object} options.routeCoordinatesRef - Reference to the route coordinates spatial grid
 * @returns {void}
 */
export const useMapEvents = ({
  mapInstance,
  isMapReady,
  currentRouteId,
  currentRoute,
  setHoverCoordinates,
  hoverCoordinates,
  routeCoordinatesRef
}) => {
  // Create a throttled mousemove handler - EXACT COPY from presentation mode
  const throttledMouseMoveHandler = useCallback(
    throttle((e) => {
      // Skip trace marker functionality on mobile devices
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        // Clear hover coordinates on mobile
        if (hoverCoordinates) {
          setHoverCoordinates(null);
        }
        return;
      }

      if (!mapInstance.current) return; // Ensure map instance exists

      const mouseCoords = [e.lngLat.lng, e.lngLat.lat];
      
      // Check if we have a spatial grid for the current route
      if (!routeCoordinatesRef?.current && currentRoute?.geojson?.features?.[0]?.geometry?.coordinates) {
        // Create the spatial grid on-demand if it doesn't exist
        const coordinates = currentRoute.geojson.features[0].geometry.coordinates;
        routeCoordinatesRef.current = createRouteSpatialGrid(coordinates);
        console.log('[useMapEvents] ✅ Created spatial grid for route tracer optimization on-demand');
      }
      
      // Use the shared utility function to find the closest point
      const closestPoint = findClosestPointOnRoute(mouseCoords, routeCoordinatesRef.current);
      
      // Simply update the state with the closest point or null
      setHoverCoordinates(closestPoint);
      
    }, 50), // Using exact same throttle delay as presentation mode (50ms)
    [mapInstance, currentRoute, hoverCoordinates, setHoverCoordinates, routeCoordinatesRef]
  );

  // Add mousemove and mouseout event handlers
  useEffect(() => {
    if (!mapInstance.current || !isMapReady) return;
    
    const map = mapInstance.current;
    
    // Add mouseout event to clear hover coordinates when cursor leaves the map
    const mouseoutHandler = () => {
      // Clear hover coordinates when mouse leaves the map
      setHoverCoordinates(null);
    };
    
    // Add event listeners
    map.on('mousemove', throttledMouseMoveHandler);
    map.on('mouseout', mouseoutHandler);
    
    // Clean up event listeners when component unmounts
    return () => {
      map.off('mousemove', throttledMouseMoveHandler);
      map.off('mouseout', mouseoutHandler);
    };
  }, [mapInstance, isMapReady, currentRouteId, currentRoute, setHoverCoordinates, hoverCoordinates, throttledMouseMoveHandler]);
};
