# Indoor Plugin Cleanup Fix

## Issue

The application was experiencing crashes on mobile devices in presentation mode with the following error:

```
[Warning] [mapCleanup] – "Error during map.remove():" – TypeError: undefined is not an object (evaluating 'this._map.indoor')
TypeError: undefined is not an object (evaluating 'this._map.indoor')
```

This error occurs during the map cleanup process when trying to access the `indoor` property of the map, which is either undefined or null. The issue is specifically related to the Mapbox GL indoor plugin's cleanup process.

## Root Cause Analysis

The error occurs because:

1. When a map instance with an indoor plugin is being removed, the plugin tries to access `this._map.indoor` during its destroy method.
2. However, in our application, we're not actively using the indoor plugin (which is designed for indoor mapping of buildings), so this property is undefined.
3. The error happens specifically in the `destroy` method of the indoor manager, which is called during the map's `remove` method.
4. This issue is more prevalent on mobile devices, possibly due to memory constraints or timing differences in the cleanup process.

## Solution

After investigating several approaches, we identified that the fundamental issue is that we're trying to clean up resources that don't need cleanup in presentation and embed modes.

### Key Insight

In presentation mode and embed mode, there's actually no need to clean up the map when the component unmounts. These are standalone views that don't get unmounted during normal operation - they're only unmounted when the user navigates away from the page entirely, at which point the browser will clean up all resources anyway.

### Implementation

We modified the `safelyRemoveMap` function in `mapCleanup.js` to automatically detect if we're in presentation or embed mode and skip the cleanup in those cases:

```javascript
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
```

This approach:
1. Avoids the errors by not calling the problematic cleanup code in presentation and embed modes
2. Lets the browser handle resource cleanup when the page is unloaded in these modes
3. Preserves the normal cleanup behavior in creation mode, ensuring the "Clear Map" functionality works correctly
4. Is more maintainable since the logic is centralized in one place

## Why This Works

1. **Browser Cleanup**: When a user navigates away from a page, the browser automatically cleans up all resources, including WebGL contexts, DOM elements, and JavaScript objects.
2. **Standalone Views**: Presentation and embed modes are standalone views that are only unmounted when the user leaves the page entirely.
3. **Avoiding Complexity**: By skipping cleanup in these specific modes, we avoid the complexity of trying to patch the Mapbox GL library or create custom wrappers.

## Future Considerations

1. **Regular Map Views**: For regular map views that are created and destroyed frequently within the same page, we should continue to use the `safelyRemoveMap` function to ensure proper cleanup.
2. **Mapbox GL Updates**: If the Mapbox GL library is updated, we should check if the indoor plugin behavior has changed and adjust our solution accordingly.
3. **Memory Usage**: Monitor memory usage to ensure this approach doesn't lead to memory leaks in long-running sessions.
