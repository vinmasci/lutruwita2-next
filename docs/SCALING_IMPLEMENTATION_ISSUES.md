# Scaling Implementation Issues

## Overview

This document outlines the issues encountered while trying to implement proper scaling in the creation mode of the application. The goal was to make the creation mode match the presentation mode's scaling behavior, which works perfectly.

## Current Status

- **Presentation Mode**: Works perfectly. The content fills the entire browser window while maintaining proper scaling.
- **Creation Mode**: Currently only fills about 75% of the browser window, despite having access to working code in the presentation mode.
  - **Update**: We've made changes to the container structure in MapView.js to match the presentation mode, but the map itself still doesn't fill the entire viewport. Interestingly, the UI components (sidebar, etc.) are properly scaled and fill the screen, but the map component itself is still only filling about 75% of the available space.

## Implementation Attempts

We attempted to implement the same scaling functionality in the creation mode that exists in the presentation mode. Despite having a working reference implementation in `src/features/presentation/utils/scaleUtils.js`, the implementation in `src/features/map/utils/mapScaleUtils.js` has been problematic.

### What Should Work

The presentation mode uses the following approach:

```javascript
// Calculate the width and height needed to fill the viewport after scaling
const scaledWidth = Math.ceil(windowWidth / scale);
const scaledHeight = Math.ceil(windowHeight / scale);

// Set the container size to compensate for scaling
container.style.width = `${scaledWidth}px`;
container.style.height = `${scaledHeight}px`;
```

This approach ensures that the content fills the entire viewport by calculating the inverse of the scale factor and applying it to the container dimensions.

### Implementation Challenges

Despite having this working code as a reference, the implementation in creation mode has been inconsistent. The main issues have been:

1. Initially implementing a different approach that tried to adjust the sidebar width instead of properly scaling the container
2. Not properly copying the working implementation from presentation mode
3. Making basic coding mistakes despite having a working reference implementation

### Recent Changes

We've made the following changes to try to fix the issue:

1. Updated the MapView.js component to use a similar container structure to the presentation mode
2. Changed the map container from using inline styles with fixed dimensions to using CSS classes
3. Ensured the mapScaleUtils.js implementation matches the scaleUtils.js implementation

However, while the UI components now scale properly and fill the screen, the map itself still only fills about 75% of the viewport. This suggests there might be additional styling or configuration specific to the map component that needs to be addressed.

### Latest Attempts

#### Attempt 1: Fixing the Map Area Selector

We identified an issue in `mapScaleUtils.js` where it was trying to find the map area using an incorrect selector:

```javascript
// Incorrect selector - React refs don't create actual HTML attributes called "ref"
const mapArea = container.querySelector('[ref="mapRef"]');
```

We updated this to use the correct class selector to match the actual DOM structure:

```javascript
// Updated selector to match the actual class in the DOM
const mapArea = container.querySelector('.map-container');
```

Unfortunately, this change did not resolve the issue. The map still only filled about 75% of the viewport in creation mode.

#### Attempt 2: Explicitly Setting Map Dimensions

After comparing the Mapbox GL initialization between presentation mode and creation mode, we noticed that in presentation mode, the map is explicitly given width and height of 100%, while in creation mode these properties were missing:

**Presentation Mode (working correctly):**
```javascript
const map = new mapboxgl.Map({
  container: mapRef.current,
  style: MAP_STYLES.satellite.url,
  // ... other properties ...
  width: '100%',
  height: '100%'  // Explicitly setting height and width
});
```

**Creation Mode (problematic):**
```javascript
const map = new mapboxgl.Map({
  container: mapRef.current,
  style: MAP_STYLES.satellite.url,
  // ... other properties ...
  // No width and height specified
});
```

We updated the creation mode's Mapbox GL initialization to explicitly set width and height to 100%, matching the presentation mode:

```javascript
const map = new mapboxgl.Map({
  container: mapRef.current,
  style: MAP_STYLES.satellite.url,
  // ... other properties ...
  width: '100%',
  height: '100%'  // Added explicit dimensions
});
```

This change improved the situation, but the map still only filled the entire viewport after resizing the browser window, not on initial load.

#### Attempt 3: Manually Triggering Scale Function on Initial Load

We identified that the scaling function was only being applied when the window was resized, not on initial load. To fix this, we added code to manually trigger the scaling function after the map is loaded:

```javascript
map.on('load', () => {
  // ... existing code ...
  
  // Manually trigger the scaling function after the map is loaded
  const mapContainer = document.querySelector('.w-full.h-full.relative');
  if (mapContainer) {
    // Import the adjustMapScale function
    const { adjustMapScale } = require('../../utils/mapScaleUtils');
    // Call it directly to ensure proper scaling on initial load
    adjustMapScale(mapContainer);
  }
});
```

This change helps ensure that the map is properly scaled to fill the entire viewport on initial load, not just after resizing the browser window.

#### Attempt 4: Using a Container Ref and useEffect Hook

To further improve the scaling behavior, we adopted the same approach used in the presentation mode by adding a containerRef and setting up the scaling in a useEffect hook:

```javascript
function MapViewContent() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const containerRef = useRef(null); // Add a ref for the container
  
  // Set up scaling using the same approach as in PresentationMapView
  useEffect(() => {
    if (containerRef.current) {
      const cleanupScaleListener = setupMapScaleListener(containerRef.current);
      return () => {
        if (cleanupScaleListener) {
          cleanupScaleListener();
        }
      };
    }
  }, []);
  
  // ... rest of the component ...
  
  return (
    <MapProvider value={...}>
      <div ref={containerRef} className="w-full h-full relative">
        {/* Component content */}
      </div>
    </MapProvider>
  );
}
```

This approach ensures that the scaling is set up properly when the component mounts, and cleaned up when it unmounts, just like in the presentation mode.

## Next Steps

The solution requires further investigation:

1. Compare the Mapbox GL initialization between presentation mode and creation mode
2. Check for any CSS differences in how the map container is styled
3. Investigate if there are any Mapbox-specific settings that might be affecting the map's dimensions
4. Look for any resize event handlers that might be interfering with the scaling

## Conclusion

While we've made progress by properly implementing the scaling for the UI components, there appears to be an additional issue specific to the map component itself. The fact that the UI components scale correctly but the map doesn't suggests that this is likely a Mapbox GL configuration issue rather than a general scaling problem.
