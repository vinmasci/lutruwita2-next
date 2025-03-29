/**
 * Utility functions for cleaning up map elements
 */

/**
 * Removes all mapboxgl markers from the map
 * This is necessary because mapboxgl.Marker adds DOM elements to the map
 * that aren't removed when clearing layers and sources
 * 
 * @param {Object} map - The mapboxgl map instance
 */
export const removeAllMapboxMarkers = (map) => {
  if (!map) return;
  
  console.log('[mapCleanup] Removing all mapboxgl markers from the map');
  
  try {
    // Find all marker elements in the map container
    const mapContainer = map.getContainer();
    if (!mapContainer) {
      console.warn('[mapCleanup] Map container not found');
      return;
    }
    
    // Find all marker elements
    // Mapbox adds markers as elements with the class 'mapboxgl-marker'
    const markerElements = mapContainer.querySelectorAll('.mapboxgl-marker');
    console.log(`[mapCleanup] Found ${markerElements.length} mapboxgl markers to remove`);
    
    // Remove each marker element from the DOM
    markerElements.forEach((element, index) => {
      try {
        console.log(`[mapCleanup] Removing marker element ${index + 1}`);
        element.remove();
      } catch (error) {
        console.error(`[mapCleanup] Error removing marker element ${index + 1}:`, error);
      }
    });
    
    console.log('[mapCleanup] Finished removing mapboxgl markers');
  } catch (error) {
    console.error('[mapCleanup] Error removing mapboxgl markers:', error);
  }
};

/**
 * Performs a comprehensive cleanup of a mapboxgl map instance
 * This ensures all resources are properly released before the map is destroyed
 * 
 * @param {Object} map - The mapboxgl map instance
 * @returns {Promise} A promise that resolves when cleanup is complete
 */
export const performFullMapCleanup = (map) => {
  return new Promise((resolve) => {
    if (!map) {
      console.log('[mapCleanup] No map instance provided for cleanup');
      resolve();
      return;
    }
    
    console.log('[mapCleanup] Starting comprehensive map cleanup');
    
    try {
      // First remove all markers
      removeAllMapboxMarkers(map);
      
      // Get all sources and layers from the map
      let style;
      try {
        style = map.getStyle();
      } catch (error) {
        console.warn('[mapCleanup] Could not get map style, map may already be destroyed:', error);
        resolve();
        return;
      }
      
      if (!style || !style.layers || !style.sources) {
        console.warn('[mapCleanup] Map style, layers, or sources not available');
        resolve();
        return;
      }
      
      // Remove all layers first
      const layerIds = style.layers.map(layer => layer.id);
      console.log(`[mapCleanup] Found ${layerIds.length} layers to remove`);
      
      layerIds.forEach(layerId => {
        try {
          if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
        } catch (error) {
          console.warn(`[mapCleanup] Error removing layer ${layerId}:`, error);
        }
      });
      
      // Then remove all sources
      const sourceIds = Object.keys(style.sources);
      console.log(`[mapCleanup] Found ${sourceIds.length} sources to remove`);
      
      sourceIds.forEach(sourceId => {
        try {
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
        } catch (error) {
          console.warn(`[mapCleanup] Error removing source ${sourceId}:`, error);
        }
      });
      
      // Remove any event listeners
      try {
        // Common event types to clean up
        const eventTypes = [
          'load', 'idle', 'error', 'data', 'styledata', 'sourcedata', 'dataloading',
          'styledataloading', 'sourcedataloading', 'styleimagemissing', 'resize',
          'webglcontextlost', 'webglcontextrestored', 'remove', 'mousedown', 'mouseup',
          'mouseover', 'mouseout', 'mousemove', 'click', 'dblclick', 'contextmenu',
          'touchstart', 'touchend', 'touchcancel', 'touchmove', 'movestart', 'move',
          'moveend', 'dragstart', 'drag', 'dragend', 'zoomstart', 'zoom', 'zoomend',
          'rotatestart', 'rotate', 'rotateend', 'pitchstart', 'pitch', 'pitchend',
          'boxzoomstart', 'boxzoomend', 'boxzoomcancel', 'wheel'
        ];
        
        // Remove all event listeners
        eventTypes.forEach(eventType => {
          try {
            // Remove all listeners for this event type
            map.off(eventType);
          } catch (error) {
            console.warn(`[mapCleanup] Error removing ${eventType} listeners:`, error);
          }
        });
        
        console.log('[mapCleanup] Removed event listeners');
      } catch (error) {
        console.warn('[mapCleanup] Error removing event listeners:', error);
      }
      
      // Clear any pending animations or timers
      try {
        map.stop();
        console.log('[mapCleanup] Stopped all animations');
      } catch (error) {
        console.warn('[mapCleanup] Error stopping animations:', error);
      }
      
      console.log('[mapCleanup] Comprehensive map cleanup completed');
      
      // Add a small delay to ensure all async operations complete
      setTimeout(() => {
        resolve();
      }, 100);
    } catch (error) {
      console.error('[mapCleanup] Error during map cleanup:', error);
      // Still resolve the promise even if there was an error
      resolve();
    }
  });
};

/**
 * Safely removes a map instance with comprehensive cleanup
 * 
 * @param {Object} map - The mapboxgl map instance
 * @param {Function} setMapInstance - Optional function to clear the map instance reference
 * @returns {Promise} A promise that resolves when the map is removed
 */
export const safelyRemoveMap = async (map, setMapInstance = null) => {
  if (!map) return Promise.resolve();
  
  console.log('[mapCleanup] Safely removing map instance');
  
  try {
    // Perform full cleanup first
    await performFullMapCleanup(map);
    
    // Then remove the map
    map.remove();
    console.log('[mapCleanup] Map instance removed');
    
    // Clear the map instance reference if a setter was provided
    if (typeof setMapInstance === 'function') {
      setMapInstance(null);
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('[mapCleanup] Error safely removing map:', error);
    return Promise.resolve(); // Still resolve to allow continuation
  }
};
