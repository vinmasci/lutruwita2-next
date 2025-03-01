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
  console.log('[MapOperationsQueue] Setting map instance');
  mapInstance = map;
  
  if (!map) {
    console.log('[MapOperationsQueue] Map instance is null, clearing instance');
    mapInstance = null;
    return;
  }
  
  // Always set up a load event handler to ensure we catch the load event
  // even if the map.loaded() check returns a false negative
  map.once('load', () => {
    console.log('[MapOperationsQueue] Map load event fired, processing pending operations');
    processPendingOperations();
  });
  
  // Also try to process immediately in case the map is already loaded
  // or the loaded() method is not reliable
  console.log('[MapOperationsQueue] Attempting to process operations immediately');
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
      console.log(`[MapOperationsQueue] Executing operation immediately: ${name}`);
      operation(mapInstance);
      return true;
    } catch (error) {
      console.error(`[MapOperationsQueue] Error executing operation ${name}:`, error);
      return false;
    }
  }
  
  // Otherwise, queue the operation
  console.log(`[MapOperationsQueue] Queueing operation: ${name}`);
  pendingOperations.push({ operation, name });
  
  // Schedule a retry in case the map is available but not reporting as loaded correctly
  if (mapInstance) {
    console.log('[MapOperationsQueue] Map instance exists, scheduling a retry in 1 second');
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
    console.log('[MapOperationsQueue] Already processing operations, skipping');
    return;
  }
  
  // Check if map is available
  if (!mapInstance) {
    console.log('[MapOperationsQueue] Map not available, deferring operation processing');
    return;
  }
  
  // Log the map's loaded state for debugging
  const isLoaded = mapInstance.loaded ? mapInstance.loaded() : false;
  console.log(`[MapOperationsQueue] Map loaded state: ${isLoaded}`);
  
  // Even if the map reports as not loaded, we'll still try to process operations
  // after a certain number of retries, as the loaded() method might not be reliable
  const forceProcess = pendingOperations.length > 0 && pendingOperations[0].retryCount >= 3;
  
  if (!isLoaded && !forceProcess) {
    console.log('[MapOperationsQueue] Map not ready, incrementing retry count and deferring processing');
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
  console.log(`[MapOperationsQueue] Processing ${pendingOperations.length} pending operations`);
  
  // Process all pending operations
  const operationsToProcess = [...pendingOperations];
  pendingOperations.length = 0; // Clear the queue
  
  for (const { operation, name } of operationsToProcess) {
    try {
      console.log(`[MapOperationsQueue] Executing queued operation: ${name}`);
      operation(mapInstance);
    } catch (error) {
      console.error(`[MapOperationsQueue] Error executing operation ${name}:`, error);
      // If there was an error, re-queue the operation for later
      pendingOperations.push({ operation, name, retryCount: 0 });
    }
  }
  
  isProcessing = false;
  console.log('[MapOperationsQueue] Finished processing operations');
  
  // If there are still operations in the queue (due to errors), try again later
  if (pendingOperations.length > 0) {
    console.log(`[MapOperationsQueue] ${pendingOperations.length} operations remain in queue, retrying in 1 second`);
    setTimeout(processPendingOperations, 1000);
  }
};

/**
 * Clear all pending operations
 */
export const clearOperations = () => {
  console.log(`[MapOperationsQueue] Clearing ${pendingOperations.length} pending operations`);
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
