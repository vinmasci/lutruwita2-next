import { useEffect, useCallback, useRef } from 'react';
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
 * @param {Object} options.dragPreview - Current drag preview state, used to disable trace marker during drag operations
 * @returns {void}
 */
export const useMapEvents = ({
  mapInstance,
  isMapReady,
  currentRouteId,
  currentRoute,
  setHoverCoordinates,
  hoverCoordinates,
  routeCoordinatesRef,
  dragPreview
}) => {
  // Create a ref to track if we're currently dragging something
  const isDraggingRef = useRef(false);
  // Create a throttled mousemove handler - EXACT COPY from presentation mode
  const throttledMouseMoveHandler = useCallback(
    throttle((e) => {
      // Skip trace marker functionality on mobile devices or when any drag operation is in progress
      const isMobile = window.innerWidth <= 768;
      const isDragging = dragPreview !== null || isDraggingRef.current; // Check both dragPreview and isDraggingRef
      
      if (isMobile || isDragging) {
        // Clear hover coordinates on mobile or when dragging
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
    [mapInstance, currentRoute, hoverCoordinates, setHoverCoordinates, routeCoordinatesRef, dragPreview]
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
    
    // Add mousedown and mouseup handlers to track dragging
    const mousedownHandler = () => {
      isDraggingRef.current = true;
      // Clear hover coordinates when starting to drag
      if (hoverCoordinates) {
        setHoverCoordinates(null);
      }
    };
    
    const mouseupHandler = () => {
      isDraggingRef.current = false;
    };
    
    // Add event listeners
    map.on('mousemove', throttledMouseMoveHandler);
    map.on('mouseout', mouseoutHandler);
    map.on('mousedown', mousedownHandler);
    map.on('mouseup', mouseupHandler);
    
    // Also add document-level event listeners to catch mouseup events outside the map
    document.addEventListener('mousedown', mousedownHandler);
    document.addEventListener('mouseup', mouseupHandler);
    
    // Clean up event listeners when component unmounts
    return () => {
      map.off('mousemove', throttledMouseMoveHandler);
      map.off('mouseout', mouseoutHandler);
      map.off('mousedown', mousedownHandler);
      map.off('mouseup', mouseupHandler);
      document.removeEventListener('mousedown', mousedownHandler);
      document.removeEventListener('mouseup', mouseupHandler);
    };
  }, [mapInstance, isMapReady, currentRouteId, currentRoute, setHoverCoordinates, hoverCoordinates, throttledMouseMoveHandler]);
};
