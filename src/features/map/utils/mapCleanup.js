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
