/**
 * Map Registry
 * 
 * A global registry to track active map instances across component lifecycles.
 * This prevents duplicate initialization even if components remount.
 */

// Map of active map instances by ID
const mapRegistry = new Map();

// Map of initialization status by ID
const initializationStatus = new Map();

// Map of cancellation tokens by ID
const cancellationTokens = new Map();

/**
 * Register a map instance with the registry
 * @param {string} id - Unique identifier for the map
 * @param {Object} instance - The mapboxgl map instance
 */
export const registerMap = (id, instance) => {
  mapRegistry.set(id, instance);
  console.log(`[MapRegistry] Registered map with ID: ${id}`);
};

/**
 * Get a registered map instance by ID
 * @param {string} id - Unique identifier for the map
 * @returns {Object|null} The mapboxgl map instance or null if not found
 */
export const getRegisteredMap = (id) => {
  return mapRegistry.get(id);
};

/**
 * Unregister a map instance from the registry
 * @param {string} id - Unique identifier for the map
 */
export const unregisterMap = (id) => {
  mapRegistry.delete(id);
  console.log(`[MapRegistry] Unregistered map with ID: ${id}`);
};

/**
 * Check if a map is registered with the given ID
 * @param {string} id - Unique identifier for the map
 * @returns {boolean} Whether the map is registered
 */
export const isMapRegistered = (id) => {
  return mapRegistry.has(id);
};

/**
 * Set the initialization status for a map
 * @param {string} id - Unique identifier for the map
 * @param {string} status - The initialization status ('initializing', 'initialized', 'failed')
 */
export const setInitializationStatus = (id, status) => {
  initializationStatus.set(id, status);
  console.log(`[MapRegistry] Map ${id} initialization status: ${status}`);
};

/**
 * Get the initialization status for a map
 * @param {string} id - Unique identifier for the map
 * @returns {string|null} The initialization status or null if not found
 */
export const getInitializationStatus = (id) => {
  return initializationStatus.get(id);
};

/**
 * Create a cancellation token for a map initialization
 * @param {string} id - Unique identifier for the map
 * @returns {Object} The cancellation token
 */
export const createCancellationToken = (id) => {
  const token = {
    cancelled: false,
    cancel: function() {
      this.cancelled = true;
      console.log(`[MapRegistry] Cancelled initialization for map ${id}`);
    },
    isCancelled: function() {
      return this.cancelled;
    }
  };
  
  cancellationTokens.set(id, token);
  return token;
};

/**
 * Get the cancellation token for a map
 * @param {string} id - Unique identifier for the map
 * @returns {Object|null} The cancellation token or null if not found
 */
export const getCancellationToken = (id) => {
  return cancellationTokens.get(id);
};

/**
 * Remove the cancellation token for a map
 * @param {string} id - Unique identifier for the map
 */
export const removeCancellationToken = (id) => {
  cancellationTokens.delete(id);
};

/**
 * Get all registered map IDs
 * @returns {Array} Array of map IDs
 */
export const getAllMapIds = () => {
  return Array.from(mapRegistry.keys());
};

/**
 * Get the count of registered maps
 * @returns {number} The number of registered maps
 */
export const getMapCount = () => {
  return mapRegistry.size;
};

/**
 * Clear all registrations (use with caution)
 */
export const clearAllRegistrations = () => {
  mapRegistry.clear();
  initializationStatus.clear();
  cancellationTokens.clear();
  console.log('[MapRegistry] Cleared all map registrations');
};
