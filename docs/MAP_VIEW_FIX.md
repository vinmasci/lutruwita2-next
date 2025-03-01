# MapView.js Fix for Scaling Issue

## Problem
The creation mode only fills about 75% of the browser window, while presentation mode fills the entire window.

## Solution
We need to make two changes to the MapView.js file:

1. Add a custom attribute to the map div element so the mapScaleUtils.js can find it
2. Ensure the map container is properly referenced for scaling

## Changes to Make

### 1. Find this line (around line 1000-1100):
```javascript
_jsx("div", { ref: mapRef, style: { width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 } })
```

### Change it to:
```javascript
_jsx("div", { ref: mapRef, "ref": "mapRef", style: { width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 } })
```

This adds the custom attribute `ref="mapRef"` that our updated mapScaleUtils.js is looking for.

## Explanation

The mapScaleUtils.js file has been updated to look for an element with the attribute `[ref="mapRef"]` to ensure the map area fills the container. This change makes the MapView component compatible with that update.

The presentation mode already has a similar structure with its `.presentation-map-area` class, and now the creation mode will have the same scaling behavior.
