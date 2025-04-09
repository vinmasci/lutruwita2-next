# Mobile Crash Fixes

## Problem Description

The application was experiencing crashes on mobile devices in presentation mode, particularly when viewing photos on the map. The console logs revealed two main issues:

1. **Mapbox GL Error with hover-point Layer**: 
   ```
   [Error] [PresentationMapView] – "Mapbox GL error:" – qo {error: Error: The layer 'hover-point' does not exist in the map's style., type: "error", target: Map, …}
   ```
   This error occurs when the code tries to modify a map layer that doesn't exist yet, causing rendering issues or crashes.

2. **Excessive Console Logging**:
   The application had over 200 console.log statements throughout the presentation components, which can impact performance, especially on mobile devices.

## Implemented Fixes

### 1. Fixed hover-point Layer Error

The error occurred because the code was trying to set layout properties on the 'hover-point' layer without first checking if the layer exists. This is particularly problematic during map style changes or when components try to access the layer before it's fully initialized.

#### Changes in PresentationMapView.js:

```javascript
// Before
if (hoverCoordinates) {
    try {
        const source = mapInstance.current.getSource('hover-point');
        if (source) {
            source.setData({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: hoverCoordinates
                },
                properties: {}
            });
            
            // Show the layer - This could fail if the layer doesn't exist
            mapInstance.current.setLayoutProperty('hover-point', 'visibility', 'visible');
        }
    } catch (error) {
        logger.error('PresentationMapView', 'Error updating hover point:', error);
    }
}

// After
if (hoverCoordinates) {
    try {
        // First check if the source exists
        if (mapInstance.current.getSource('hover-point')) {
            // Update the source data
            mapInstance.current.getSource('hover-point').setData({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: hoverCoordinates
                },
                properties: {}
            });
            
            // Check if the layer exists before trying to modify it
            if (mapInstance.current.getLayer('hover-point')) {
                // Show the layer
                mapInstance.current.setLayoutProperty('hover-point', 'visibility', 'visible');
            } else {
                // Layer doesn't exist, log this but don't crash
                logger.warn('PresentationMapView', 'hover-point layer does not exist, cannot set visibility');
            }
        } else {
            // Source doesn't exist, try to recreate it
            addHoverPointMarker(mapInstance.current);
        }
    } catch (error) {
        logger.error('PresentationMapView', 'Error updating hover point:', error);
    }
}
```

Similar improvements were made for hiding the layer when no coordinates are present.

### 2. Reduced Console Logging

Created a conditional logging utility to reduce console output in production:

#### New File: src/utils/conditionalLogger.js

```javascript
/**
 * Conditional logging utility to reduce console output in production
 * Only logs in development mode when VITE_DEBUG_LOGGING is enabled
 */

/**
 * Log a message only in development mode with debug logging enabled
 * @param {string} component - Component name for log prefix
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export const devLog = (component, message, data) => {
  if (process.env.NODE_ENV === 'development' && process.env.VITE_DEBUG_LOGGING === 'true') {
    if (data !== undefined) {
      console.log(`[${component}] ${message}`, data);
    } else {
      console.log(`[${component}] ${message}`);
    }
  }
};

/**
 * Log a warning only in development mode with debug logging enabled
 * @param {string} component - Component name for log prefix
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export const devWarn = (component, message, data) => {
  if (process.env.NODE_ENV === 'development' && process.env.VITE_DEBUG_LOGGING === 'true') {
    if (data !== undefined) {
      console.warn(`[${component}] ${message}`, data);
    } else {
      console.warn(`[${component}] ${message}`);
    }
  }
};

/**
 * Log an error in both development and production
 * @param {string} component - Component name for log prefix
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export const errorLog = (component, message, data) => {
  if (data !== undefined) {
    console.error(`[${component}] ${message}`, data);
  } else {
    console.error(`[${component}] ${message}`);
  }
};
```

This utility provides three functions:
- `devLog`: Only logs in development mode when debug logging is enabled
- `devWarn`: Only shows warnings in development mode when debug logging is enabled
- `errorLog`: Always logs errors in both development and production

## Technical Explanation

### Why These Fixes Work

1. **Hover-point Layer Error Fix**:
   - By adding proper checks before attempting to access or modify the layer, we prevent the application from crashing when the layer doesn't exist.
   - The code now gracefully handles cases where the layer or source might not be available yet.
   - If the source doesn't exist, we attempt to recreate it, providing a self-healing mechanism.

2. **Conditional Logging Utility**:
   - Reduces the performance impact of logging in production environments.
   - Each console.log statement consumes CPU cycles, allocates memory, and can cause layout thrashing when the console is open.
   - By conditionally enabling logs only in development mode, we improve performance in production.
   - The utility maintains a consistent logging format with component prefixes for better debugging.

## Additional Fixes for Photo Marker Flickering

After implementing the initial fixes, we discovered that photo markers and clusters were flickering when hovering over them in presentation mode. This was caused by:

1. **Excessive Re-rendering**: The component was updating state frequently when hovering over markers.
2. **Inefficient Highlighting Logic**: Multiple checks and console logs were being executed on every hover.
3. **No Debouncing**: State changes were happening too rapidly without any throttling.

### Implemented Solutions:

1. **Debounced State Updates**:
   ```javascript
   // Debounce the selected photo cluster update to prevent flickering
   const updateSelectedPhotoClusterRef = useRef(null);
   
   // Clear any existing timeout
   if (updateSelectedPhotoClusterRef.current) {
       clearTimeout(updateSelectedPhotoClusterRef.current);
   }
   
   // Use a timeout to debounce the update (prevents flickering)
   updateSelectedPhotoClusterRef.current = setTimeout(() => {
       // Update logic here
   }, 50); // 50ms debounce delay
   ```

2. **Replaced Console Logs with Conditional Logging**:
   All `console.log` statements in the PresentationPhotoLayer component were replaced with the conditional logging utility:
   ```javascript
   // Before
   console.log('Highlighting cluster because it is the selected cluster');
   
   // After
   devLog('PresentationPhotoLayer', 'Highlighting cluster because it is the selected cluster');
   ```

3. **Optimized Highlighting Logic**:
   The highlighting logic was streamlined to reduce unnecessary calculations and checks.

## Expected Results

These fixes should significantly reduce crashes and improve performance on mobile devices by:

1. Preventing errors when accessing map layers that don't exist yet
2. Reducing the performance impact of excessive logging
3. Providing more robust error handling throughout the application
4. Eliminating flickering when hovering over photo markers and clusters
5. Reducing unnecessary re-renders and state updates

The trade-off is slightly reduced debugging information in production, but this is a worthwhile compromise for stable performance.
