# Presentation Mode Clustering Optimization

## Problem Statement

The presentation mode in our application is experiencing crashes on iOS devices when aggressive users interact with the map. The primary issue is that the map becomes overloaded with too many markers (POIs and photos), causing excessive memory usage and rendering overhead.

Key issues identified:

1. **Too Many DOM Elements**: Each marker is a complex DOM element with multiple nested divs, CSS effects, and event listeners.
2. **Frequent Re-rendering**: Markers are completely re-rendered on every zoom change, creating significant CPU/GPU load.
3. **Inefficient Clustering**: Current clustering settings are not aggressive enough to sufficiently reduce marker count.
4. **iOS Memory Limitations**: iOS devices have stricter memory constraints and are more prone to crashes when overloaded.

## Optimization Strategy

We will implement a two-pronged approach to address these issues:

### 1. More Aggressive Clustering

We will modify the clustering configuration to:

- **Increase Clustering Radius**: Expand the radius from 80px to 150-180px for photos and from 40px to 150-180px for POIs. This means markers that are further apart will be grouped into a single cluster.
- **Increase Maximum Zoom Level**: Raise the maxZoom from 12 to 16-18, which means clusters will stay grouped together much longer as users zoom in.
- **Add iOS-Specific Optimizations**: Apply even more aggressive clustering on iOS devices (radius: 200px, maxZoom: 18).

Current clustering configuration:

**Photos (Updated):**
```javascript
const createIndex = (radius = 150, maxZoom = 16, minPoints = 2) => {
    // iOS devices get even more aggressive clustering
    if (isIOS) {
        radius = 200;
        maxZoom = 18;
        minPoints = 2;
    }
    
    return new Supercluster({
        radius: radius,
        maxZoom: maxZoom,
        minZoom: 0,
        minPoints: minPoints,
        // Other configuration...
    });
};
```

**POIs (Updated):**
```javascript
const createIndex = (radius = 150, maxZoom = 16, minPoints = 2) => {
  // iOS devices get even more aggressive clustering
  if (isIOS) {
    radius = 200;
    maxZoom = 18;
    minPoints = 2;
  }

  return new Supercluster({
    radius: radius,
    maxZoom: maxZoom,
    minZoom: 0,
    minPoints: minPoints,
    // Other configuration...
  });
};
```

### 2. Reduced Re-rendering Frequency

We will optimize when clustering recalculations happen:

- **Throttle Zoom Events**: Only recalculate clusters when zoom changes by a significant amount (e.g., 0.5 levels).
- **Round Zoom Levels**: Use `Math.floor(zoom * 2) / 2` to reduce the frequency of recalculations.

Current implementation:
```javascript
useEffect(() => {
  if (!map || zoom === null) return;
  
  // Cluster POIs
  const clusters = clusterPOIs(filteredPOIs, zoom);
  setClusteredItems(clusters);
}, [map, zoom, visibleCategories, getPOIsForRoute]);
```

## Expected Benefits

1. **Reduced DOM Elements**: Fewer markers means fewer DOM elements, which is critical for iOS performance.
2. **Lower Memory Usage**: Fewer objects to track and render.
3. **Improved Rendering Performance**: Less work for the GPU/CPU on each frame.
4. **Smoother Interactions**: Less lag during zoom/pan operations.
5. **Crash Prevention**: By keeping the total number of elements manageable.

## Implementation Plan

1. Modify `src/features/presentation/utils/photoClusteringPresentation.js` to use more aggressive clustering.
2. Modify `src/features/poi/utils/clustering.js` to use more aggressive clustering.
3. Update the components that use these clustering functions to reduce re-rendering frequency.
4. Add iOS detection and apply even more aggressive settings for iOS devices.

## Testing Strategy

1. Test on iOS devices with varying amounts of POIs and photos.
2. Monitor memory usage using Safari Web Inspector.
3. Test with aggressive users who zoom/pan rapidly.
4. Verify that clustering is working as expected at different zoom levels.
