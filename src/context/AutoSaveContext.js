import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Context for managing global auto-save state
 * This provides a central place to track auto-save information
 * that can be accessed by any component in the application
 */
const AutoSaveContext = createContext(null);

/**
 * Provider component for the AutoSaveContext
 */
export const AutoSaveProvider = ({ children }) => {
  // State for auto-save information
  const [autoSaveState, setAutoSaveState] = useState({
    autoSaveId: null, // ID of the current auto-save document (could be from gpx_auto_saves or user_saved_routes)
    routeId: null,    // ID of the specific route within the auto-save (relevant for multi-route auto-saves)
    loadedPermanentRouteId: null, // ID of a permanent route if one is loaded for editing
    lastSaved: null,
    status: 'idle', // 'idle', 'saving', 'saved', 'error', 'loaded_permanent'
    error: null,
    history: [], // For potential undo/redo functionality
  });

  /**
   * Update the auto-save state
   * @param {Object} updates - The updates to apply to the state
   */
  const updateAutoSave = useCallback((updates) => {
    console.log('[AutoSaveContext] Updating auto-save state:', updates);
    setAutoSaveState(prev => ({
      ...prev,
      ...updates,
      lastSaved: updates.lastSaved || new Date(),
    }));
  }, []);

/**
 * Clear the auto-save state
 */
const clearAutoSave = useCallback(() => {
  console.log('[AutoSaveContext] Clearing auto-save state');
  setAutoSaveState({
    autoSaveId: null,
    routeId: null,
    loadedPermanentRouteId: null, // Reset this as well
    lastSaved: null,
    status: 'idle',
    error: null,
    history: [],
  });
}, []);

/**
 * Set the ID of a loaded permanent route.
 * This indicates that auto-saves should target this permanent route.
 * @param {string|null} permanentRouteId - The ID of the loaded permanent route, or null if none.
 */
const setLoadedPermanentRoute = useCallback((permanentRouteId) => {
  if (permanentRouteId) {
    console.log('[AutoSaveContext] Setting loaded permanent route ID:', permanentRouteId);
    setAutoSaveState(prev => ({
      ...prev,
      loadedPermanentRouteId: permanentRouteId,
      autoSaveId: permanentRouteId, // The permanent route ID becomes the primary ID for auto-save operations
      routeId: null, // Clear any temporary routeId
      status: 'loaded_permanent', // New status to indicate a permanent route is active
      error: null,
    }));
  } else {
    console.log('[AutoSaveContext] Clearing loaded permanent route ID.');
    // If clearing, revert to standard idle state, potentially loading a temporary auto-save if one exists.
    // For now, just reset. A more sophisticated flow might check for existing gpx_auto_saves.
    setAutoSaveState(prev => ({
      ...prev,
      loadedPermanentRouteId: null,
      autoSaveId: null, // Explicitly clear autoSaveId for a new session
      routeId: null,    // Explicitly clear routeId for a new session
      status: 'idle',
    }));
  }
}, []);

/**
 * Reset the auto-save state but keep the autoSaveId
 * This is used when a route is deleted but the auto-save document still exists
 * with other routes
 */
const resetAutoSave = useCallback(() => {
  console.log('[AutoSaveContext] Resetting auto-save state but keeping autoSaveId');
  setAutoSaveState(prev => ({
    ...prev,
    routeId: null,
    status: 'idle',
    error: null,
  }));
}, []);

  /**
   * Set an error in the auto-save state
   * @param {Error} error - The error that occurred
   */
  const setAutoSaveError = useCallback((error) => {
    console.error('[AutoSaveContext] Auto-save error:', error);
    setAutoSaveState(prev => ({
      ...prev,
      status: 'error',
      error: error.message || 'Unknown error',
    }));
  }, []);

  /**
   * Start an auto-save operation
   * This updates the status to 'saving'
   */
  const startAutoSave = useCallback(() => {
    console.log('[AutoSaveContext] Starting auto-save');
    setAutoSaveState(prev => ({
      ...prev,
      status: 'saving',
      error: null,
      // If starting a new save and a permanent route was loaded,
      // this implies we are saving the permanent route.
      // If no permanent route is loaded, this is for a temporary gpx_auto_save.
      // The autoSaveId in state should already be set correctly by setLoadedPermanentRoute or previous ops.
    }));
  }, []);

  /**
   * Complete an auto-save operation
   * This updates the status to 'saved' and sets the autoSaveId (which could be permanent or temporary)
   * @param {string} newAutoSaveId - The ID of the document that was saved (could be from gpx_auto_saves or user_saved_routes)
   * @param {string} savedRouteId - The ID of the specific route within the save
   */
  const completeAutoSave = useCallback((newAutoSaveId, savedRouteId) => {
    console.log('[AutoSaveContext] Completing auto-save:', { newAutoSaveId, savedRouteId });
    setAutoSaveState(prev => {
      const isPermanentSave = prev.loadedPermanentRouteId && prev.loadedPermanentRouteId === newAutoSaveId;
      return {
        ...prev,
        autoSaveId: newAutoSaveId, // This is the ID of the document where data was saved
        routeId: savedRouteId,     // The specific route ID within that document
        lastSaved: new Date(),
        status: isPermanentSave ? 'loaded_permanent_saved' : 'saved', // Differentiate if it was a permanent save
        error: null,
      };
    });
  }, []);

  // Value to provide to consumers
  const value = {
    ...autoSaveState,
    updateAutoSave,
    clearAutoSave,
    resetAutoSave,
    setAutoSaveError,
    startAutoSave,
    completeAutoSave,
    setLoadedPermanentRoute, // Expose the new function
  };

  return React.createElement(
    AutoSaveContext.Provider,
    { value: value },
    children
  );
};

/**
 * Hook for using the AutoSaveContext
 * @returns {Object} The auto-save context value
 */
export const useAutoSave = () => {
  const context = useContext(AutoSaveContext);
  if (!context) {
    throw new Error('useAutoSave must be used within an AutoSaveProvider');
  }
  return context;
};

export default AutoSaveContext;
