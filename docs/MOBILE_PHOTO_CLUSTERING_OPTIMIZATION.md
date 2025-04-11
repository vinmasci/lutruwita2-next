# Mobile Photo Clustering Optimization

## Problem Description

The photo clustering in presentation mode was causing performance issues on mobile devices. The supercluster implementation was too resource-intensive for mobile phones to handle efficiently, leading to:

1. **Excessive DOM Elements**: Too many markers being rendered simultaneously
2. **High Memory Usage**: Each marker/cluster requires memory for DOM elements and event listeners
3. **Frequent Re-rendering**: Clusters recalculated on zoom changes causing significant CPU/GPU load
4. **Poor Performance**: Especially on iOS devices with stricter memory constraints

## Implemented Solutions

We've implemented two major optimizations to address these issues:

### 1. Limit Visible Markers/Clusters

The first optimization focuses on reducing the total number of DOM elements created by limiting the number of markers/clusters rendered at any given time:

```javascript
// Helper function to determine marker limit based on device capabilities
const getMarkerLimit = () => {
  const isMobile = window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isLowEndDevice = navigator.deviceMemory && navigator.deviceMemory <= 4;
  
  if (isIOS) return 30;  // Most restrictive for iOS
  if (isLowEndDevice) return 40;  // Restrictive for low-end Android
  if (isMobile) return 50;  // Standard mobile limit
  return 200;  // Desktop can handle more
};
```

The implementation:
1. Filters markers to only include those within the current viewport (with a small buffer)
2. Calculates distance from viewport center to prioritize markers
3. Prioritizes clusters with more photos (higher point_count)
4. Sorts by distance and priority, then applies the device-specific limit
5. Only renders the limited set of markers/clusters

### 2. More Aggressive Clustering for Mobile

The second optimization makes the clustering itself more aggressive on mobile devices:

```javascript
// Mobile devices get more aggressive clustering
if (isMobile()) {
    radius = 150; // Increase radius for more aggressive clustering
    maxZoom = 6;  // Lower maxZoom to keep clusters longer
    minPoints = 2;
}

// Low-end devices get even more aggressive clustering
if (isLowEndDevice()) {
    radius = 180;
    maxZoom = 5;
    minPoints = 2;
}

// iOS devices get the most aggressive clustering
if (isIOS) {
    radius = 200; // Significantly larger radius
    maxZoom = 5;  // Very low maxZoom to maintain clusters longer
    minPoints = 2;
}
```

Additional optimizations include:
1. More aggressive zoom rounding for mobile (whole numbers vs 0.5 increments)
2. Extra aggressive clustering at lower zoom levels
3. Device-specific clustering parameters based on capabilities

## Technical Details

### Marker Limiting Implementation

The marker limiting is implemented in `PresentationPhotoLayer.js` using a memoized function that:

1. Gets the current viewport bounds and center
2. Determines the appropriate marker limit based on device
3. Filters markers to those within the viewport (with buffer)
4. Calculates distance from center and assigns priority
5. Sorts by distance and priority, then applies the limit
6. Creates React elements only for the limited set

### Clustering Optimization Implementation

The clustering optimizations are implemented in `photoClusteringPresentation.js`:

1. Device detection functions to identify mobile, iOS, and low-end devices
2. Device-specific clustering parameters in the `createIndex` function
3. More aggressive settings for lower zoom levels
4. More aggressive zoom rounding for mobile devices
5. Device-specific options in the main clustering function

## Expected Benefits

1. **Reduced DOM Elements**: Fewer markers means fewer DOM elements, directly addressing one of the biggest performance bottlenecks
2. **Lower Memory Usage**: Predictable and controlled memory usage within acceptable bounds
3. **Improved Rendering Performance**: Less work for the GPU/CPU on each frame
4. **Smoother Interactions**: Less lag during zoom/pan operations
5. **Crash Prevention**: By keeping the total number of elements manageable
6. **Better Battery Life**: Less rendering work means less CPU/GPU usage

## Testing Recommendations

1. Test on various mobile devices, especially iOS
2. Test with routes that have many photos
3. Test aggressive zooming and panning to ensure stability
4. Monitor memory usage and frame rate
5. Verify that clustering appears appropriate at different zoom levels

## Future Considerations

1. **Dynamic Adjustment**: Consider implementing dynamic marker limits based on device performance
2. **Simplified Marker Rendering**: Create simplified versions of markers specifically for mobile
3. **Lazy Loading**: Implement true lazy loading of photo thumbnails
4. **Alternative Cluster Expansion**: On mobile, consider showing a list of photos in a cluster instead of zooming in
