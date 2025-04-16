/**
 * Simple store for map overview data
 * This breaks the circular dependency between MapOverviewContext and RouteContext
 */

// The current map overview data
let mapOverviewData = {
  description: ''
};

// Listeners for changes to the map overview data
const listeners = new Set();

/**
 * Get the current map overview data
 * @returns {Object} The current map overview data
 */
export const getMapOverviewData = () => {
  return mapOverviewData;
};

/**
 * Set the map overview data
 * @param {Object} data The new map overview data
 */
export const setMapOverviewData = (data) => {
  mapOverviewData = data;
  // Notify all listeners
  listeners.forEach(listener => listener(data));
};

/**
 * Update just the description in the map overview data
 * @param {string} description The new description
 */
export const updateMapOverviewDescription = (description) => {
  mapOverviewData = {
    ...mapOverviewData,
    description
  };
  // Notify all listeners
  listeners.forEach(listener => listener(mapOverviewData));
};

/**
 * Subscribe to changes in the map overview data
 * @param {Function} listener The listener function to call when the data changes
 * @returns {Function} A function to unsubscribe the listener
 */
export const subscribeToMapOverviewChanges = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Mark the map overview as changed in the route context
 * This is called by the MapOverviewContext when the map overview is updated
 */
export const markMapOverviewChanged = () => {
  // This will be set by the RouteContext
  if (window.__markMapOverviewChanged) {
    console.log('[mapOverviewStore] Marking map overview as changed via window.__markMapOverviewChanged');
    window.__markMapOverviewChanged();
  } else {
    console.log('[mapOverviewStore] window.__markMapOverviewChanged not available, changes will be tracked locally in MapOverviewContext');
    // When RouteContext is not available, changes will be tracked locally in MapOverviewContext
    // No need to do anything here as the MapOverviewContext will handle it
  }
};

/**
 * Set the function to mark the map overview as changed
 * This is called by the RouteContext to provide the function
 * @param {Function} fn The function to call when the map overview is changed
 */
export const setMarkMapOverviewChangedFunction = (fn) => {
  window.__markMapOverviewChanged = fn;
};
