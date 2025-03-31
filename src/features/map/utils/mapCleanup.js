/**
 * Utility functions for cleaning up map elements
 */
import logger from '../../../utils/logger';

/**
 * Removes all mapboxgl markers from the map
 * This is necessary because mapboxgl.Marker adds DOM elements to the map
 * that aren't removed when clearing layers and sources
 * 
 * @param {Object} map - The mapboxgl map instance
 */
export const removeAllMapboxMarkers = (map) => {
  if (!map) return;
  
  logger.info('mapCleanup', 'Removing all mapboxgl markers from the map');
  
  try {
    // Find all marker elements in the map container
    const mapContainer = map.getContainer();
    if (!mapContainer) {
      logger.warn('mapCleanup', 'Map container not found');
      return;
    }
    
    // Find all marker elements
    // Mapbox adds markers as elements with the class 'mapboxgl-marker'
    const markerElements = mapContainer.querySelectorAll('.mapboxgl-marker');
    logger.info('mapCleanup', `Found ${markerElements.length} mapboxgl markers to remove`);
    
    // Remove each marker element from the DOM
    markerElements.forEach((element, index) => {
      try {
        // Skip detailed marker removal logs on mobile
        if (window.innerWidth > 768) {
          logger.debug('mapCleanup', `Removing marker element ${index + 1}`);
        }
        element.remove();
      } catch (error) {
        logger.error('mapCleanup', `Error removing marker element ${index + 1}:`, error);
      }
    });
    
    logger.info('mapCleanup', 'Finished removing mapboxgl markers');
  } catch (error) {
    logger.error('mapCleanup', 'Error removing mapboxgl markers:', error);
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
      logger.info('mapCleanup', 'No map instance provided for cleanup');
      resolve();
      return;
    }
    
    logger.info('mapCleanup', 'Starting comprehensive map cleanup');
    
    try {
      // First remove all markers
      removeAllMapboxMarkers(map);
      
      // Get all sources and layers from the map
      let style;
      try {
        style = map.getStyle();
      } catch (error) {
        logger.warn('mapCleanup', 'Could not get map style, map may already be destroyed:', error);
        resolve();
        return;
      }
      
      if (!style || !style.layers || !style.sources) {
        logger.warn('mapCleanup', 'Map style, layers, or sources not available');
        resolve();
        return;
      }
      
      // Remove all layers first
      const layerIds = style.layers.map(layer => layer.id);
      logger.info('mapCleanup', `Found ${layerIds.length} layers to remove`);
      
      layerIds.forEach(layerId => {
        try {
          if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
        } catch (error) {
          logger.warn('mapCleanup', `Error removing layer ${layerId}:`, error);
        }
      });
      
      // Then remove all sources
      const sourceIds = Object.keys(style.sources);
      logger.info('mapCleanup', `Found ${sourceIds.length} sources to remove`);
      
      sourceIds.forEach(sourceId => {
        try {
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
        } catch (error) {
          logger.warn('mapCleanup', `Error removing source ${sourceId}:`, error);
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
            logger.warn('mapCleanup', `Error removing ${eventType} listeners:`, error);
          }
        });
        
        logger.info('mapCleanup', 'Removed event listeners');
      } catch (error) {
        logger.warn('mapCleanup', 'Error removing event listeners:', error);
      }
      
      // Clear any pending animations or timers
      try {
        map.stop();
        logger.info('mapCleanup', 'Stopped all animations');
      } catch (error) {
        logger.warn('mapCleanup', 'Error stopping animations:', error);
      }
      
      logger.info('mapCleanup', 'Comprehensive map cleanup completed');
      
      // Add a small delay to ensure all async operations complete
      setTimeout(() => {
        resolve();
      }, 100);
    } catch (error) {
      logger.error('mapCleanup', 'Error during map cleanup:', error);
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
  
  // Check if we're in presentation or embed mode
  const isPresentationMode = window.location.pathname.includes('/presentation/');
  const isEmbedMode = window.location.pathname.includes('/embed/');
  
  // Skip cleanup in presentation and embed modes
  if (isPresentationMode || isEmbedMode) {
    logger.info('mapCleanup', `Skipping map cleanup in ${isPresentationMode ? 'presentation' : 'embed'} mode`);
    
    // Just clear the map instance reference if a setter was provided
    if (typeof setMapInstance === 'function') {
      setMapInstance(null);
    }
    
    return Promise.resolve();
  }
  
  logger.info('mapCleanup', 'Safely removing map instance');
  
  try {
    // Handle the indoor plugin issue that causes crashes
    try {
      // Create a dummy destroy method for the indoor plugin
      const dummyDestroy = () => {
        logger.info('mapCleanup', 'Called dummy indoor.destroy() method');
      };
      
      // First, try to patch the map's indoor property if it exists but is null or missing destroy
      if (map.indoor === null) {
        try {
          // Replace null with an object that has a destroy method
          map.indoor = { destroy: dummyDestroy };
          logger.info('mapCleanup', 'Replaced null indoor property with dummy object');
        } catch (indoorError) {
          logger.warn('mapCleanup', 'Error replacing null indoor property:', indoorError);
        }
      } else if (map.indoor && typeof map.indoor.destroy !== 'function') {
        try {
          // Add a destroy method if it doesn't exist
          map.indoor.destroy = dummyDestroy;
          logger.info('mapCleanup', 'Added dummy destroy method to indoor property');
        } catch (indoorError) {
          logger.warn('mapCleanup', 'Error adding destroy method to indoor property:', indoorError);
        }
      }
      
      // Also try to patch the map prototype to handle cases where 'this.indoor' is accessed
      try {
        // Get the map's constructor prototype
        const mapProto = Object.getPrototypeOf(map);
        
        // Check if the indoor getter exists and try to patch it
        const indoorDescriptor = Object.getOwnPropertyDescriptor(mapProto, 'indoor');
        if (indoorDescriptor && indoorDescriptor.get) {
          // We can't modify the getter directly, but we can ensure the map instance has a valid indoor property
          if (!map.indoor || typeof map.indoor.destroy !== 'function') {
            map.indoor = { destroy: dummyDestroy };
            logger.info('mapCleanup', 'Added indoor property with destroy method to map instance');
          }
        }
      } catch (protoError) {
        logger.warn('mapCleanup', 'Error patching map prototype:', protoError);
      }
      
      // Patch the global mapboxgl object if available to handle cases where 'this.indoor' is accessed directly
      try {
        if (typeof window !== 'undefined' && window.mapboxgl) {
          // Try to find the indoor manager prototype
          const mapboxgl = window.mapboxgl;
          
          // Check if there's an indoor manager class or prototype
          if (mapboxgl.IndoorManager) {
            const indoorManagerProto = mapboxgl.IndoorManager.prototype;
            
            // Patch the destroy method if it exists
            if (indoorManagerProto && typeof indoorManagerProto.destroy === 'function') {
              // Save the original method
              const originalDestroy = indoorManagerProto.destroy;
              
              // Replace with a safer version that checks for null/undefined
              indoorManagerProto.destroy = function() {
                try {
                  // Check if this.indoor exists before trying to destroy it
                  if (this.indoor === null || this.indoor === undefined) {
                    this.indoor = { destroy: dummyDestroy };
                    logger.info('mapCleanup', 'Added dummy indoor object in IndoorManager.destroy');
                  } else if (typeof this.indoor.destroy !== 'function') {
                    this.indoor.destroy = dummyDestroy;
                    logger.info('mapCleanup', 'Added dummy destroy method to indoor in IndoorManager.destroy');
                  }
                  
                  // Check if this._map exists and has an indoor property
                  if (!this._map) {
                    this._map = { indoor: { destroy: dummyDestroy } };
                    logger.info('mapCleanup', 'Added dummy _map object in IndoorManager.destroy');
                  } else if (!this._map.indoor) {
                    this._map.indoor = { destroy: dummyDestroy };
                    logger.info('mapCleanup', 'Added dummy indoor property to _map in IndoorManager.destroy');
                  }
                  
                  // Call the original method
                  return originalDestroy.apply(this, arguments);
                } catch (error) {
                  logger.warn('mapCleanup', 'Error in patched IndoorManager.destroy:', error);
                  // Return a resolved promise to prevent further errors
                  return Promise.resolve();
                }
              };
              
              logger.info('mapCleanup', 'Successfully patched IndoorManager.destroy method');
            }
          }
          
          // Also try to patch any existing IndoorManager instances
          // This is important because the prototype patch only affects new instances
          try {
            // Find all map containers
            const mapContainers = document.querySelectorAll('.mapboxgl-map');
            
            // For each container, try to find and patch any indoor manager instances
            mapContainers.forEach((container, index) => {
              try {
                // Try to access the map instance using the _mapboxgl property that Mapbox adds
                if (container._mapboxgl && container._mapboxgl.map) {
                  const mapInstance = container._mapboxgl.map;
                  
                  // Check if this map has any controls that might be indoor managers
                  if (mapInstance._controls && Array.isArray(mapInstance._controls)) {
                    mapInstance._controls.forEach(control => {
                      // Check if this control is an indoor manager
                      if (control && 
                          control.constructor && 
                          control.constructor.name && 
                          control.constructor.name.includes('Indoor')) {
                        
                        // Patch this specific instance
                        if (typeof control.destroy === 'function') {
                          // Save the original method
                          const originalInstanceDestroy = control.destroy;
                          
                          // Replace with our safer version
                          control.destroy = function() {
                            try {
                              // Ensure this._map and this._map.indoor exist
                              if (!this._map) {
                                this._map = { indoor: { destroy: dummyDestroy } };
                              } else if (!this._map.indoor) {
                                this._map.indoor = { destroy: dummyDestroy };
                              }
                              
                              // Ensure this.indoor exists and has a destroy method
                              if (!this.indoor) {
                                this.indoor = { destroy: dummyDestroy };
                              } else if (typeof this.indoor.destroy !== 'function') {
                                this.indoor.destroy = dummyDestroy;
                              }
                              
                              // Call the original method
                              return originalInstanceDestroy.apply(this, arguments);
                            } catch (error) {
                              logger.warn('mapCleanup', 'Error in patched instance destroy:', error);
                              return Promise.resolve();
                            }
                          };
                          
                          logger.info('mapCleanup', `Patched destroy method on indoor control instance ${index}`);
                        }
                      }
                    });
                  }
                }
              } catch (containerError) {
                logger.warn('mapCleanup', `Error patching indoor manager for container ${index}:`, containerError);
              }
            });
          } catch (instancePatchError) {
            logger.warn('mapCleanup', 'Error patching indoor manager instances:', instancePatchError);
          }
        }
      } catch (globalPatchError) {
        logger.warn('mapCleanup', 'Error patching global mapboxgl object:', globalPatchError);
      }
      
      // Add a global error handler for the specific indoor error
      try {
        if (typeof window !== 'undefined') {
          // Create a function to handle the specific error
          const handleIndoorError = (event) => {
            const error = event.error || event.reason;
            if (error && error.message && (
                error.message.includes("'this._map.indoor'") || 
                error.message.includes("'this.indoor.destroy'")
            )) {
              // Prevent the default error handling
              event.preventDefault();
              // Log the error but don't let it crash the app
              logger.warn('mapCleanup', 'Caught and handled indoor plugin error:', error.message);
              return true;
            }
            return false;
          };
          
          // Add error event listeners if they don't already exist
          if (!window._indoorErrorHandlerAdded) {
            window.addEventListener('error', handleIndoorError);
            window.addEventListener('unhandledrejection', handleIndoorError);
            window._indoorErrorHandlerAdded = true;
            logger.info('mapCleanup', 'Added global error handlers for indoor plugin errors');
          }
        }
      } catch (errorHandlerError) {
        logger.warn('mapCleanup', 'Error setting up global error handler:', errorHandlerError);
      }
      
      // Check if the map has an indoor property and safely remove it
      if (map._controls) {
        // Find and remove any indoor controls
        const indoorControls = map._controls.filter(control => 
          control.constructor && 
          control.constructor.name && 
          control.constructor.name.includes('Indoor')
        );
        
        // Safely remove each indoor control
        indoorControls.forEach(control => {
          try {
            // Patch the control to prevent indoor property access errors
            if (control._map) {
              // Ensure the control's map reference has a valid indoor property
              if (!control._map.indoor || control._map.indoor === null) {
                control._map.indoor = { destroy: dummyDestroy };
              } else if (typeof control._map.indoor.destroy !== 'function') {
                control._map.indoor.destroy = dummyDestroy;
              }
            }
            
            // Patch the control itself if it has an indoor property
            if (control.indoor === null) {
              control.indoor = { destroy: dummyDestroy };
            } else if (control.indoor && typeof control.indoor.destroy !== 'function') {
              control.indoor.destroy = dummyDestroy;
            }
            
            // Directly patch the destroy method on the control if it exists
            if (typeof control.destroy === 'function') {
              const originalDestroy = control.destroy;
              control.destroy = function() {
                try {
                  // Ensure this._map exists and has an indoor property before calling destroy
                  if (!this._map) {
                    this._map = { indoor: { destroy: dummyDestroy } };
                  } else if (!this._map.indoor) {
                    this._map.indoor = { destroy: dummyDestroy };
                  }
                  
                  // Call the original method with a try/catch to prevent errors
                  try {
                    return originalDestroy.apply(this, arguments);
                  } catch (innerError) {
                    logger.warn('mapCleanup', 'Error in patched control.destroy:', innerError);
                    return Promise.resolve();
                  }
                } catch (error) {
                  logger.warn('mapCleanup', 'Error in control.destroy wrapper:', error);
                  return Promise.resolve();
                }
              };
              logger.info('mapCleanup', 'Patched control.destroy method');
            }
            
            // Try to call the onRemove method if it exists
            if (typeof control.onRemove === 'function') {
              // Wrap the onRemove method to catch errors
              const originalOnRemove = control.onRemove;
              control.onRemove = function(mapInstance) {
                try {
                  // Ensure this._map exists and has an indoor property before calling onRemove
                  if (!this._map) {
                    this._map = { indoor: { destroy: dummyDestroy } };
                  } else if (!this._map.indoor) {
                    this._map.indoor = { destroy: dummyDestroy };
                  }
                  
                  // Call the original method with a try/catch to prevent errors
                  try {
                    return originalOnRemove.call(this, mapInstance);
                  } catch (innerError) {
                    logger.warn('mapCleanup', 'Error in patched control.onRemove:', innerError);
                  }
                } catch (error) {
                  logger.warn('mapCleanup', 'Error in control.onRemove wrapper:', error);
                }
              };
              
              // Now call the wrapped onRemove method
              control.onRemove(map);
              logger.info('mapCleanup', 'Called patched control.onRemove method');
            }
            
            // Try to clear any indoor properties on the map after control removal
            if (map.indoor) {
              // Replace with dummy object instead of null to handle any late destroy() calls
              map.indoor = { destroy: dummyDestroy };
            }
          } catch (indoorError) {
            // Silently catch errors but don't let them stop the cleanup
            logger.warn('mapCleanup', 'Error cleaning up indoor control:', indoorError);
          }
        });
      }
      
      // Directly patch the map.remove method to handle indoor plugin errors
      try {
        if (map.remove && typeof map.remove === 'function') {
          const originalRemove = map.remove;
          map.remove = function() {
            try {
              // Ensure any indoor manager references are properly handled
              if (this._controls) {
                this._controls.forEach(control => {
                  // Check if this is an indoor control
                  if (control && 
                      control.constructor && 
                      control.constructor.name && 
                      control.constructor.name.includes('Indoor')) {
                    
                    // Ensure the control has a valid _map reference with indoor property
                    if (control._map) {
                      if (!control._map.indoor) {
                        control._map.indoor = { destroy: dummyDestroy };
                      }
                    }
                    
                    // Ensure the control has a valid indoor property
                    if (!control.indoor) {
                      control.indoor = { destroy: dummyDestroy };
                    }
                  }
                });
              }
              
              // Call the original remove method
              return originalRemove.apply(this, arguments);
            } catch (error) {
              // Log the error but don't let it crash the app
              logger.warn('mapCleanup', 'Error in patched map.remove:', error);
              
              // Try to continue with cleanup even if remove fails
              try {
                // Remove all controls manually
                if (this._controls && Array.isArray(this._controls)) {
                  // Make a copy of the array since we'll be modifying it
                  const controls = [...this._controls];
                  controls.forEach(control => {
                    if (control && typeof control.onRemove === 'function') {
                      try {
                        control.onRemove(this);
                      } catch (controlError) {
                        logger.warn('mapCleanup', 'Error removing control:', controlError);
                      }
                    }
                  });
                }
                
                // Remove the container
                if (this._container && this._container.parentNode) {
                  this._container.parentNode.removeChild(this._container);
                }
              } catch (cleanupError) {
                logger.warn('mapCleanup', 'Error in manual cleanup after remove failure:', cleanupError);
              }
            }
          };
          logger.info('mapCleanup', 'Successfully patched map.remove method');
        }
      } catch (patchError) {
        logger.warn('mapCleanup', 'Error patching map.remove method:', patchError);
      }
    } catch (indoorError) {
      // Silently catch errors but don't let them stop the cleanup
      logger.warn('mapCleanup', 'Error handling indoor plugin:', indoorError);
    }
    
    // Perform full cleanup first
    await performFullMapCleanup(map);
    
    // Then remove the map with error handling
    try {
      map.remove();
      logger.info('mapCleanup', 'Map instance removed');
    } catch (removeError) {
      logger.warn('mapCleanup', 'Error during map.remove():', removeError);
      // Continue despite the error
    }
    
    // Clear the map instance reference if a setter was provided
    if (typeof setMapInstance === 'function') {
      setMapInstance(null);
    }
    
    return Promise.resolve();
  } catch (error) {
    logger.error('mapCleanup', 'Error safely removing map:', error);
    
    // Even if there was an error, try to clear the map instance reference
    if (typeof setMapInstance === 'function') {
      setMapInstance(null);
    }
    
    return Promise.resolve(); // Still resolve to allow continuation
  }
};
