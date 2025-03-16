# Map Tracer Threshold Update

## Overview

This document describes the update made to the map tracer feature's detection threshold across all modes (creation, presentation, and embed).

## Changes Made

The map tracer feature shows a marker on both the map and the elevation profile when hovering over the map, indicating the position on the route closest to the cursor. Previously, the marker would only appear when the cursor was within approximately 100m of the route. This threshold has been increased to approximately 200m to make the feature more user-friendly and easier to use.

### Technical Details

The distance threshold value was updated from 0.0009 to 0.0018 in the following files:

1. `src/features/presentation/components/EmbedMapView/EmbedMapView.jsx`
2. `src/features/presentation/components/PresentationMapView/PresentationMapView.js`
3. `src/features/map/components/MapView/MapView.js`

The threshold is used in the mousemove event handler to determine when to show the hover marker:

```javascript
// Define a threshold distance - only show marker when close to the route
const distanceThreshold = 0.0018; // Approximately 200m at the equator

// If we found a closest point on the active route and it's within the threshold
if (closestPoint && minDistance < distanceThreshold) {
    setHoverCoordinates(closestPoint);
} else {
    // If no point found or too far from route, clear the marker
    setHoverCoordinates(null);
}
```

## Benefits

1. **Improved User Experience**: The larger detection range makes it easier for users to interact with the map tracer feature, especially on touch devices or when using a trackpad.

2. **Consistency Across Modes**: The same threshold is now used in all modes (creation, presentation, and embed), ensuring a consistent user experience.

3. **Better Accessibility**: Users with motor control difficulties will find it easier to use the map tracer feature with the larger detection range.

## Implementation Notes

The distance threshold is measured in degrees of longitude/latitude, which means the actual distance in meters varies depending on the latitude. At the equator, 0.0018 degrees is approximately 200 meters, but this distance decreases as you move towards the poles. For Tasmania (around 42°S), the actual distance is somewhat less, but still provides a good balance between precision and usability.
