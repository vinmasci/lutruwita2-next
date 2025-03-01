# Implementing a Deferred Operations Queue for Map Operations

## Problem Statement

In our application, we're encountering an issue where map operations (like zooming to a route) are attempted before the map instance is fully initialized or available. This results in errors like:

```
[Warning] [RouteContext] Map instance not available for positioning (RouteContext.js, line 463)
```

Even though the map is visually rendered and the user can interact with it, the JavaScript map instance might not be fully initialized or properly connected to all components that need to use it.

## Solution: Deferred Operations Queue

A Deferred Operations Queue is a pattern that decouples the timing of requests from their execution. Instead of components trying to directly access the map instance, they queue operations to be performed when the map is ready.

## Implementation Guide

### 1. Create the Map Operations Queue Module

Create a new file `src/features/map/utils/mapOperationsQueue.js`:

```javascript
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
  
  // Wait for the map to be fully loaded before processing operations
  if (map && !map.loaded()) {
    console.log('[MapOperationsQueue] Map not fully loaded, waiting for load event');
    map.once('load', () => {
      console.log('[MapOperationsQueue] Map load event fired, processing pending operations');
      processPendingOperations();
    });
  } else if (map) {
    console.log('[MapOperationsQueue] Map already loaded, processing pending operations immediately');
    processPendingOperations();
  }
};

/**
 * Queue an operation to be executed when the map is ready
 * @param {Function} operation - Function that takes the map instance as its parameter
 * @param {string} [name] - Optional name for debugging purposes
 * @returns {boolean} - Whether the operation was executed immediately or queued
 */
export const queueMapOperation = (operation, name = 'unnamed') => {
  // If map is available and loaded, execute immediately
  if (mapInstance && mapInstance.loaded()) {
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
  return false;
};

/**
 * Process all pending operations in the queue
 */
const processPendingOperations = () => {
  // Prevent concurrent processing
  if (isProcessing) return;
  
  // Check if map is available and loaded
  if (!mapInstance || !mapInstance.loaded()) {
    console.log('[MapOperationsQueue] Map not ready, deferring operation processing');
    return;
  }
  
  isProcessing = true;
  console.log(`[MapOperationsQueue] Processing ${pendingOperations.length} pending operations`);
  
  // Process all pending operations
  while (pendingOperations.length > 0) {
    const { operation, name } = pendingOperations.shift();
    try {
      console.log(`[MapOperationsQueue] Executing queued operation: ${name}`);
      operation(mapInstance);
    } catch (error) {
      console.error(`[MapOperationsQueue] Error executing operation ${name}:`, error);
    }
  }
  
  isProcessing = false;
  console.log('[MapOperationsQueue] Finished processing operations');
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
  return mapInstance && mapInstance.loaded() ? mapInstance : null;
};

/**
 * Check if the map is ready
 * @returns {boolean} Whether the map instance is available and loaded
 */
export const isMapReady = () => {
  return mapInstance !== null && mapInstance.loaded();
};
```

### 2. Initialize the Queue in MapView Component

Modify `src/features/map/components/MapView/MapView.js` to set the map instance in the queue:

```javascript
import { setMapInstance } from '../../utils/mapOperationsQueue';

// In the useEffect where the map is initialized:
useEffect(() => {
  if (!mapRef.current) return;
  
  // Create map with Tasmania as default bounds
  const map = new mapboxgl.Map({
    container: mapRef.current,
    style: MAP_STYLES.satellite.url,
    bounds: [[144.5, -43.7], [148.5, -40.5]], // Tasmania bounds (default)
    fitBoundsOptions: {
      padding: 0,
      pitch: 0,
      bearing: 0
    },
    projection: 'globe',
    maxPitch: 85
  });
  
  // Set the map instance in the queue
  setMapInstance(map);
  
  // Rest of the map initialization code...
  
  mapInstance.current = map;
  
  // When the map is fully loaded
  map.on('load', () => {
    // Make sure the map instance is set in the queue again after load
    setMapInstance(map);
    
    // Rest of the load event handler...
  });
  
  return () => {
    map.remove();
    // Clear the map instance when component unmounts
    setMapInstance(null);
  };
}, []);
```

### 3. Update RouteContext to Use the Queue

Modify `src/features/map/context/RouteContext.js` to use the queue instead of directly accessing the map:

```javascript
import { queueMapOperation } from '../utils/mapOperationsQueue';

// Replace the map positioning effect with:
useEffect(() => {
  if (!pendingRouteBounds) {
    return;
  }
  
  console.log('[RouteContext] Route bounds available, queueing positioning operation');
  
  // Queue the positioning operation
  queueMapOperation((map) => {
    try {
      if (pendingRouteBounds.type === 'bounds') {
        console.log('[RouteContext] Positioning using bounds with', pendingRouteBounds.coordinates.length, 'coordinates');
        
        // Create bounds from all coordinates
        const bounds = new mapboxgl.LngLatBounds();
        pendingRouteBounds.coordinates.forEach(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            bounds.extend([coord[0], coord[1]]);
          }
        });
        
        // Fit bounds to show the entire route
        map.fitBounds(bounds, {
          padding: 50,
          duration: 1500
        });
        console.log('[RouteContext] Successfully fit map to route bounds');
      } else if (pendingRouteBounds.type === 'point') {
        console.log('[RouteContext] Positioning using point:', pendingRouteBounds.point);
        
        // Zoom to the point
        map.easeTo({
          center: [pendingRouteBounds.point[0], pendingRouteBounds.point[1]],
          zoom: 10, // Zoomed out a bit for context
          duration: 1500,
          essential: true
        });
        console.log('[RouteContext] Successfully positioned map to point');
      }
      
      // Apply map style if available
      if (pendingRouteBounds.mapStyle) {
        console.log('[RouteContext] Applying map style:', pendingRouteBounds.mapStyle);
        map.setStyle(pendingRouteBounds.mapStyle);
      }
    } catch (error) {
      console.error('[RouteContext] Error during map positioning:', error);
    }
    
    // Clear the pending bounds after positioning
    setPendingRouteBounds(null);
  }, 'routePositioning');
  
}, [pendingRouteBounds]);
```

### 4. Update Other Components That Use the Map

Any other component that needs to perform operations on the map should use the queue:

```javascript
import { queueMapOperation } from '../../utils/mapOperationsQueue';

// Instead of:
if (map && map.loaded()) {
  map.fitBounds(bounds);
}

// Use:
queueMapOperation(map => {
  map.fitBounds(bounds);
}, 'fitBoundsOperation');
```

## Benefits of This Approach

1. **Bulletproof Timing**: Operations are guaranteed to execute when the map is ready, eliminating race conditions.

2. **Decoupled Components**: Components don't need direct access to the map instance, reducing dependencies.

3. **Simplified Error Handling**: Centralized error handling for map operations.

4. **Better Debugging**: Named operations make it easier to track what's happening.

5. **Resilient to Component Unmounting**: If a component queues an operation and then unmounts, the operation will still be executed when the map is ready.

## Usage Examples

### Zooming to a Location

```javascript
import { queueMapOperation } from '../utils/mapOperationsQueue';

const zoomToLocation = (coordinates) => {
  queueMapOperation(map => {
    map.flyTo({
      center: coordinates,
      zoom: 12,
      duration: 1000
    });
  }, 'zoomToLocation');
};
```

### Adding a Marker

```javascript
import { queueMapOperation } from '../utils/mapOperationsQueue';
import mapboxgl from 'mapbox-gl';

const addMarker = (coordinates) => {
  queueMapOperation(map => {
    new mapboxgl.Marker()
      .setLngLat(coordinates)
      .addTo(map);
  }, 'addMarker');
};
```

### Changing Map Style

```javascript
import { queueMapOperation } from '../utils/mapOperationsQueue';

const changeMapStyle = (styleUrl) => {
  queueMapOperation(map => {
    map.setStyle(styleUrl);
  }, 'changeMapStyle');
};
```

## Conclusion

The Deferred Operations Queue pattern provides a robust solution to the timing issues we're experiencing with map operations. By decoupling the timing of requests from their execution, we ensure that operations are only performed when the map is fully ready, eliminating errors and providing a better user experience.

This approach is particularly valuable in React applications where components may mount, update, and unmount at different times, and where asynchronous resources like maps may not be immediately available when components need them.
