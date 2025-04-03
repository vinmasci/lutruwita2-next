# WebGL Map Tracer Implementation

This document describes the implementation of the WebGL-based map tracer in the Lutruwita2 application, which replaces the previous GeoJSON-based implementation to significantly improve performance in presentation mode.

## Problem

The previous map tracer implementation used a GeoJSON source and layer to display a point that follows the mouse cursor along the route. This approach had several performance issues:

1. **High CPU Usage**: Updating a GeoJSON source on every mouse move is CPU-intensive, especially for routes with thousands of coordinates.
2. **Rendering Inefficiency**: The GeoJSON approach requires Mapbox GL to re-render the entire layer on each update.
3. **Slow Updates**: The tracer would lag behind the mouse cursor, especially on complex routes.
4. **Elevation Profile Sync Issues**: The lag in tracer updates caused synchronization issues with the elevation profile marker.

## Solution

We implemented a custom WebGL-based tracer layer that renders directly with WebGL, bypassing the GeoJSON update cycle. This approach is similar to how high-performance mapping applications like RWGPS handle their map tracers.

### Key Components

1. **TracerLayer.js**: A custom WebGL layer that implements Mapbox GL's CustomLayerInterface to render a point directly with WebGL.
2. **PresentationMapView.js**: Updated to use the WebGL tracer layer and handle style changes properly.

## Implementation Details

### TracerLayer.js

The TracerLayer class implements the following key features:

- **WebGL Rendering**: Uses WebGL shaders to render a point with a smooth edge and outline.
- **Ready State Tracking**: Tracks when the layer is fully initialized and ready to accept coordinate updates.
- **Coordinate Buffering**: Stores coordinates that are set before the layer is ready.
- **Error Handling**: Robust error handling for WebGL context issues.
- **Resource Cleanup**: Proper cleanup of WebGL resources when the layer is removed.

```javascript
// Key parts of the implementation
class TracerLayer {
  constructor(coordinates) {
    this.id = 'tracer-layer';
    this.type = 'custom';
    this.renderingMode = '2d';
    this.coordinates = coordinates || null;
    this.visible = false;
    this.isReady = false; // Track if the layer is fully initialized
    this.pendingCoordinates = null; // Store coordinates set before layer is ready
  }
  
  // Called when the layer is added to the map
  onAdd(map, gl) {
    // Initialize WebGL resources
    // Set isReady = true when done
  }
  
  // Update the tracer coordinates
  updateCoordinates(coordinates) {
    // If not ready, store coordinates for later
    // Otherwise, update the WebGL buffer
  }
  
  // Render the tracer
  render(gl, matrix) {
    // Use WebGL to render the point
  }
  
  // Called when the layer is removed
  onRemove() {
    // Clean up WebGL resources
  }
}
```

### PresentationMapView.js

The PresentationMapView component was updated to:

1. **Create and Add the WebGL Tracer**: Replace the GeoJSON source and layer with the WebGL tracer.
2. **Handle Style Changes**: Properly reset and re-add the tracer layer when the map style changes.
3. **Optimize Coordinate Finding**: Use a two-pass approach to efficiently find the closest point on the route.
4. **Reduce Throttle Delay**: Decrease the throttle delay for smoother updates.

```javascript
// Key optimizations in PresentationMapView.js

// 1. Create and add the WebGL tracer layer
const tracerLayer = new TracerLayer();
map.addLayer(tracerLayer);
tracerLayerRef.current = tracerLayer;

// 2. Handle style changes
map.on('style.load', () => {
  // Reset and re-add the tracer layer
  tracerLayerRef.current = null;
  
  const tracerLayer = new TracerLayer();
  map.addLayer(tracerLayer);
  tracerLayerRef.current = tracerLayer;
  
  // Re-apply coordinates if needed
});

// 3. Optimize coordinate finding with two-pass approach
// First pass: Coarse sampling to find approximate segment
// Second pass: Fine-grained search in the best segment

// 4. Reduce throttle delay
const throttledMouseMoveHandler = useCallback(throttle((e) => {
  // Handler code
}, 100), []); // Reduced from 250ms to 100ms
```

## Performance Improvements

The WebGL tracer implementation offers several key advantages:

1. **Reduced CPU Usage**: By offloading rendering to the GPU, we significantly reduce CPU usage.
2. **Eliminated GeoJSON Updates**: No more expensive GeoJSON source updates on every mouse move.
3. **Better Performance with Large Routes**: The two-pass coordinate finding algorithm is much more efficient for routes with tens of thousands of coordinates.
4. **Smoother Animation**: The reduced throttle delay and more efficient rendering provide a smoother experience.
5. **Improved Elevation Profile Sync**: The tracer and elevation profile marker stay in sync better due to faster updates.

## Comparison with RWGPS

RWGPS (Ride With GPS) uses a similar WebGL-based approach for their map tracer, which is why their implementation is so performant even with complex routes. Our implementation follows the same pattern:

1. Use a custom WebGL layer instead of GeoJSON
2. Implement efficient coordinate finding
3. Handle style changes properly
4. Optimize for visual quality and performance

## Future Improvements

Potential future improvements to the WebGL tracer implementation:

1. **Spatial Indexing**: Implement a more sophisticated spatial index for even faster coordinate finding.
2. **WebGL 2.0**: Upgrade to WebGL 2.0 for better performance and features.
3. **Animation Effects**: Add smooth animation effects for tracer movement.
4. **Multi-route Support**: Extend the tracer to work with multiple routes simultaneously.
5. **Elevation Visualization**: Add elevation data visualization to the tracer.
