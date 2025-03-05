/**
 * Map Operations Queue
 * 
 * A utility for deferring map operations until the map instance is fully loaded and ready.
 * This solves timing issues where components try to use the map before it's initialized.
 */

// The map instance reference
let mapInstance = null;

// Queue of pending operations
const pendingOperations = [];

// Flag to track if we're currently processing operations
let isProcessing = false;

/**
 * Set the map instance and process any pending operations
 * @param {mapboxgl.Map} map - The Mapbox GL map instance
 */
export const setMapInstance = (map) => {
  mapInstance = map;
  
  if (!map) {
    mapInstance = null;
    return;
  }
  
  // Always set up a load event handler to ensure we catch the load event
  // even if the map.loaded() check returns a false negative
  map.once('load', () => {
    processPendingOperations();
  });
  
  // Also try to process immediately in case the map is already loaded
  // or the loaded() method is not reliable
  setTimeout(() => {
    processPendingOperations();
  }, 500);
};

/**
 * Queue an operation to be executed when the map is ready
 * @param {Function} operation - Function that takes the map instance as its parameter
 * @param {string} [name] - Optional name for debugging purposes
 * @returns {boolean} - Whether the operation was executed immediately or queued
 */
export const queueMapOperation = (operation, name = 'unnamed') => {
  // If map is available and loaded, execute immediately
  if (mapInstance && mapInstance.loaded && mapInstance.loaded()) {
    try {
      operation(mapInstance);
      return true;
    } catch (error) {
      console.error(`[MapOperationsQueue] Error executing operation ${name}:`, error);
      return false;
    }
  }
  
  // Otherwise, queue the operation
  pendingOperations.push({ operation, name });
  
  // Schedule a retry in case the map is available but not reporting as loaded correctly
  if (mapInstance) {
    setTimeout(() => {
      processPendingOperations();
    }, 1000);
  }
  
  return false;
};

/**
 * Process all pending operations in the queue
 */
const processPendingOperations = () => {
  // Prevent concurrent processing
  if (isProcessing) {
    return;
  }
  
  // Check if map is available
  if (!mapInstance) {
    return;
  }
  
  // Log the map's loaded state for debugging
  const isLoaded = mapInstance.loaded ? mapInstance.loaded() : false;
  
  // Even if the map reports as not loaded, we'll still try to process operations
  // after a certain number of retries, as the loaded() method might not be reliable
  const forceProcess = pendingOperations.length > 0 && pendingOperations[0].retryCount >= 3;
  
  if (!isLoaded && !forceProcess) {
    // Increment retry count for all operations
    pendingOperations.forEach(op => {
      op.retryCount = (op.retryCount || 0) + 1;
    });
    
    // Schedule another retry
    setTimeout(() => {
      processPendingOperations();
    }, 1000);
    return;
  }
  
  isProcessing = true;
  
  // Process all pending operations
  const operationsToProcess = [...pendingOperations];
  pendingOperations.length = 0; // Clear the queue
  
  for (const { operation, name } of operationsToProcess) {
    try {
      operation(mapInstance);
    } catch (error) {
      console.error(`[MapOperationsQueue] Error executing operation ${name}:`, error);
      // If there was an error, re-queue the operation for later
      pendingOperations.push({ operation, name, retryCount: 0 });
    }
  }
  
  isProcessing = false;
  
  // If there are still operations in the queue (due to errors), try again later
  if (pendingOperations.length > 0) {
    setTimeout(processPendingOperations, 1000);
  }
};

/**
 * Clear all pending operations
 */
export const clearOperations = () => {
  pendingOperations.length = 0;
};

/**
 * Get the current map instance (for special cases only)
 * @returns {mapboxgl.Map|null} The map instance or null if not available
 */
export const getMapInstance = () => {
  return mapInstance;
};

/**
 * Check if the map is ready
 * @returns {boolean} Whether the map instance is available and loaded
 */
export const isMapReady = () => {
  return mapInstance !== null && mapInstance.loaded && mapInstance.loaded();
};
