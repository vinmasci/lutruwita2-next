/**
 * Custom Mapbox GL wrapper that disables the indoor plugin
 * 
 * This file serves as a drop-in replacement for the standard mapbox-gl import
 * It imports the original mapbox-gl library but removes or disables the indoor plugin
 * functionality to prevent errors during map cleanup.
 */

import mapboxgl from 'mapbox-gl';
import logger from '../utils/logger';

// Log that we're using the custom no-indoor version
logger.info('mapbox-gl-no-indoor', 'Using custom Mapbox GL without indoor plugin');

// Check if the IndoorManager exists and remove it
if (mapboxgl.IndoorManager) {
  try {
    // Save a reference to the original IndoorManager for debugging purposes
    const originalIndoorManager = mapboxgl.IndoorManager;
    
    // Replace the IndoorManager with a dummy version that does nothing
    mapboxgl.IndoorManager = function DummyIndoorManager() {
      logger.info('mapbox-gl-no-indoor', 'Created dummy IndoorManager instance');
      
      // Return an object with all the methods of the original IndoorManager
      // but they do nothing and return empty values
      return {
        // Common methods that might be called
        destroy: () => {
          logger.info('mapbox-gl-no-indoor', 'Called dummy IndoorManager.destroy()');
          return Promise.resolve();
        },
        onAdd: () => {
          logger.info('mapbox-gl-no-indoor', 'Called dummy IndoorManager.onAdd()');
          return null;
        },
        onRemove: () => {
          logger.info('mapbox-gl-no-indoor', 'Called dummy IndoorManager.onRemove()');
        },
        // Add any other methods that might be called
        enable: () => {
          logger.info('mapbox-gl-no-indoor', 'Called dummy IndoorManager.enable()');
        },
        disable: () => {
          logger.info('mapbox-gl-no-indoor', 'Called dummy IndoorManager.disable()');
        },
        // Add a toString method for debugging
        toString: () => '[DummyIndoorManager]'
      };
    };
    
    // Add a static disable method to the dummy IndoorManager
    mapboxgl.IndoorManager.disable = function() {
      logger.info('mapbox-gl-no-indoor', 'Called static IndoorManager.disable()');
    };
    
    // Add a static enable method to the dummy IndoorManager
    mapboxgl.IndoorManager.enable = function() {
      logger.info('mapbox-gl-no-indoor', 'Called static IndoorManager.enable()');
    };
    
    logger.info('mapbox-gl-no-indoor', 'Successfully replaced IndoorManager with dummy version');
  } catch (error) {
    logger.error('mapbox-gl-no-indoor', 'Error replacing IndoorManager:', error);
  }
}

// Patch the Map prototype to handle indoor plugin references
try {
  const MapPrototype = mapboxgl.Map.prototype;
  
  // Store the original remove method
  const originalRemove = MapPrototype.remove;
  
  // Replace the remove method with our version that handles indoor plugin errors
  MapPrototype.remove = function() {
    try {
      // Create a dummy destroy function
      const dummyDestroy = () => {
        logger.info('mapbox-gl-no-indoor', 'Called dummy indoor.destroy() method');
        return Promise.resolve();
      };
      
      // Check if this map instance has any indoor-related properties and replace them with dummy objects
      if (this.indoor === undefined || this.indoor === null) {
        logger.info('mapbox-gl-no-indoor', 'Adding dummy indoor property to map instance');
        this.indoor = { destroy: dummyDestroy };
      } else if (typeof this.indoor === 'object') {
        logger.info('mapbox-gl-no-indoor', 'Ensuring indoor property has destroy method');
        if (typeof this.indoor.destroy !== 'function') {
          this.indoor.destroy = dummyDestroy;
        }
      }
      
      // Check if any controls are indoor-related and remove them
      if (this._controls && Array.isArray(this._controls)) {
        const indoorControls = this._controls.filter(control => 
          control && 
          control.constructor && 
          control.constructor.name && 
          control.constructor.name.includes('Indoor')
        );
        
        // Remove indoor controls from the controls array
        if (indoorControls.length > 0) {
          logger.info('mapbox-gl-no-indoor', `Found ${indoorControls.length} indoor controls to remove`);
          
          // Remove each indoor control
          indoorControls.forEach(control => {
            try {
              // Call onRemove if it exists
              if (typeof control.onRemove === 'function') {
                control.onRemove(this);
              }
              
              // Remove the control from the _controls array
              const index = this._controls.indexOf(control);
              if (index !== -1) {
                this._controls.splice(index, 1);
              }
            } catch (error) {
              logger.warn('mapbox-gl-no-indoor', 'Error removing indoor control:', error);
            }
          });
        }
      }
      
      // Add a global error handler for the specific indoor error
      try {
        if (typeof window !== 'undefined' && !window._indoorErrorHandlerAdded) {
          // Create a function to handle the specific error
          const handleIndoorError = (event) => {
            const error = event.error || event.reason;
            if (error && error.message && (
                error.message.includes("'this._map.indoor'") || 
                error.message.includes("'this.indoor.destroy'") ||
                error.message.includes("undefined is not an object (evaluating 'this.indoor.destroy')")
            )) {
              // Prevent the default error handling
              event.preventDefault();
              // Log the error but don't let it crash the app
              logger.warn('mapbox-gl-no-indoor', 'Caught and handled indoor plugin error:', error.message);
              return true;
            }
            return false;
          };
          
          // Add error event listeners
          window.addEventListener('error', handleIndoorError);
          window.addEventListener('unhandledrejection', handleIndoorError);
          window._indoorErrorHandlerAdded = true;
          logger.info('mapbox-gl-no-indoor', 'Added global error handlers for indoor plugin errors');
        }
      } catch (errorHandlerError) {
        logger.warn('mapbox-gl-no-indoor', 'Error setting up global error handler:', errorHandlerError);
      }
      
      // Patch the Map object itself to ensure it has a valid indoor property
      // This is a more aggressive approach to ensure the indoor property exists
      try {
        // Define the indoor property with a getter that always returns a valid object
        Object.defineProperty(this, 'indoor', {
          configurable: true,
          get: function() {
            // This getter ensures that this.indoor always returns a valid object with a destroy method
            return {
              destroy: function() {
                logger.info('mapbox-gl-no-indoor', 'Called getter-defined indoor.destroy() method');
                return Promise.resolve();
              }
            };
          }
        });
      } catch (definePropertyError) {
        logger.warn('mapbox-gl-no-indoor', 'Error defining indoor property:', definePropertyError);
      }
      
      // Call the original remove method with a try/catch to handle any errors
      try {
        return originalRemove.apply(this, arguments);
      } catch (removeError) {
        logger.error('mapbox-gl-no-indoor', 'Error in original remove method:', removeError);
        
        // Try to continue with cleanup even if remove fails
        try {
          // Remove the container
          if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
          }
        } catch (cleanupError) {
          logger.error('mapbox-gl-no-indoor', 'Error in manual cleanup after remove failure:', cleanupError);
        }
        
        // Return a resolved promise to prevent further errors
        return Promise.resolve();
      }
    } catch (error) {
      logger.error('mapbox-gl-no-indoor', 'Error in patched Map.remove:', error);
      
      // Try to continue with cleanup even if remove fails
      try {
        // Remove the container
        if (this._container && this._container.parentNode) {
          this._container.parentNode.removeChild(this._container);
        }
      } catch (cleanupError) {
        logger.error('mapbox-gl-no-indoor', 'Error in manual cleanup after remove failure:', cleanupError);
      }
    }
  };
  
  logger.info('mapbox-gl-no-indoor', 'Successfully patched Map.prototype.remove');
} catch (error) {
  logger.error('mapbox-gl-no-indoor', 'Error patching Map prototype:', error);
}

// Export the modified mapboxgl object
export default mapboxgl;
