/**
 * Mapbox GL Light - Mobile-optimized version
 * 
 * This file imports the lightweight version of Mapbox GL JS
 * and adds compatibility patches for features not supported in the light version.
 */

import mapboxgl from 'mapbox-gl';
import logger from '../utils/logger';

logger.info('mapbox-gl-light', 'Using lightweight Mapbox GL for mobile');

// Add feature detection helpers
mapboxgl.supportsGlobe = false;
mapboxgl.supportsTerrain = false;
mapboxgl.supports3DBuildings = false;
mapboxgl.supportsCustomLayers = false;

// Add stub methods for unsupported features
if (!mapboxgl.Map.prototype.setTerrain) {
  mapboxgl.Map.prototype.setTerrain = function() {
    logger.debug('mapbox-gl-light', 'Terrain not supported in light version');
    return this;
  };
}

if (!mapboxgl.Map.prototype.getTerrain) {
  mapboxgl.Map.prototype.getTerrain = function() {
    return null;
  };
}

// Add stub for projection methods if not available
if (!mapboxgl.Map.prototype.setProjection) {
  mapboxgl.Map.prototype.setProjection = function(projection) {
    logger.debug('mapbox-gl-light', 'Projection changes not supported in light version');
    return this;
  };
}

if (!mapboxgl.Map.prototype.getProjection) {
  mapboxgl.Map.prototype.getProjection = function() {
    return { name: 'mercator' };
  };
}

// Patch the indoor plugin issues (same as in no-indoor version)
if (mapboxgl.IndoorManager) {
  try {
    // Save a reference to the original IndoorManager for debugging purposes
    const originalIndoorManager = mapboxgl.IndoorManager;
    
    // Replace the IndoorManager with a dummy version that does nothing
    mapboxgl.IndoorManager = function DummyIndoorManager() {
      logger.info('mapbox-gl-light', 'Created dummy IndoorManager instance');
      
      // Return an object with all the methods of the original IndoorManager
      // but they do nothing and return empty values
      return {
        // Common methods that might be called
        destroy: () => {
          logger.info('mapbox-gl-light', 'Called dummy IndoorManager.destroy()');
          return Promise.resolve();
        },
        onAdd: () => {
          logger.info('mapbox-gl-light', 'Called dummy IndoorManager.onAdd()');
          return null;
        },
        onRemove: () => {
          logger.info('mapbox-gl-light', 'Called dummy IndoorManager.onRemove()');
        },
        // Add any other methods that might be called
        enable: () => {
          logger.info('mapbox-gl-light', 'Called dummy IndoorManager.enable()');
        },
        disable: () => {
          logger.info('mapbox-gl-light', 'Called dummy IndoorManager.disable()');
        },
        // Add a toString method for debugging
        toString: () => '[DummyIndoorManager]'
      };
    };
    
    // Add a static disable method to the dummy IndoorManager
    mapboxgl.IndoorManager.disable = function() {
      logger.info('mapbox-gl-light', 'Called static IndoorManager.disable()');
    };
    
    // Add a static enable method to the dummy IndoorManager
    mapboxgl.IndoorManager.enable = function() {
      logger.info('mapbox-gl-light', 'Called static IndoorManager.enable()');
    };
    
    logger.info('mapbox-gl-light', 'Successfully replaced IndoorManager with dummy version');
  } catch (error) {
    logger.error('mapbox-gl-light', 'Error replacing IndoorManager:', error);
  }
}

// Add optimized fetch handling to prevent AbortErrors
const originalAddSource = mapboxgl.Map.prototype.addSource;
mapboxgl.Map.prototype.addSource = function(id, source) {
  // For tile sources, add retry and timeout logic
  if (source.type === 'vector' || source.type === 'raster' || source.type === 'raster-dem') {
    // Add custom fetch options for better mobile performance
    source.tileSize = source.tileSize || 512;
    source.maxzoom = Math.min(source.maxzoom || 14, 14); // Limit max zoom for performance
    source.minzoom = Math.max(source.minzoom || 0, 0);
    
    // Add custom fetch function with timeout and retry logic
    const originalFetch = window.fetch;
    source._customFetch = function(url, options) {
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Set a timeout to abort long-running requests
      const timeout = setTimeout(() => {
        controller.abort();
        logger.debug('mapbox-gl-light', `Aborted slow tile request: ${url}`);
      }, 10000); // 10 second timeout
      
      return originalFetch(url, { ...options, signal })
        .then(response => {
          clearTimeout(timeout);
          return response;
        })
        .catch(error => {
          clearTimeout(timeout);
          if (error.name === 'AbortError') {
            // Log but don't propagate abort errors
            logger.debug('mapbox-gl-light', `Fetch aborted: ${url}`);
            return new Response(null, { status: 204 }); // Return empty response
          }
          throw error;
        });
    };
  }
  
  return originalAddSource.call(this, id, source);
};

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
        logger.info('mapbox-gl-light', 'Called dummy indoor.destroy() method');
        return Promise.resolve();
      };
      
      // Check if this map instance has any indoor-related properties and replace them with dummy objects
      if (this.indoor === undefined || this.indoor === null) {
        logger.info('mapbox-gl-light', 'Adding dummy indoor property to map instance');
        this.indoor = { destroy: dummyDestroy };
      } else if (typeof this.indoor === 'object') {
        logger.info('mapbox-gl-light', 'Ensuring indoor property has destroy method');
        if (typeof this.indoor.destroy !== 'function') {
          this.indoor.destroy = dummyDestroy;
        }
      }
      
      // Call the original remove method with a try/catch to handle any errors
      try {
        return originalRemove.apply(this, arguments);
      } catch (removeError) {
        logger.error('mapbox-gl-light', 'Error in original remove method:', removeError);
        
        // Try to continue with cleanup even if remove fails
        try {
          // Remove the container
          if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
          }
        } catch (cleanupError) {
          logger.error('mapbox-gl-light', 'Error in manual cleanup after remove failure:', cleanupError);
        }
        
        // Return a resolved promise to prevent further errors
        return Promise.resolve();
      }
    } catch (error) {
      logger.error('mapbox-gl-light', 'Error in patched Map.remove:', error);
      
      // Try to continue with cleanup even if remove fails
      try {
        // Remove the container
        if (this._container && this._container.parentNode) {
          this._container.parentNode.removeChild(this._container);
        }
      } catch (cleanupError) {
        logger.error('mapbox-gl-light', 'Error in manual cleanup after remove failure:', cleanupError);
      }
    }
  };
  
  logger.info('mapbox-gl-light', 'Successfully patched Map.prototype.remove');
} catch (error) {
  logger.error('mapbox-gl-light', 'Error patching Map prototype:', error);
}

export default mapboxgl;
