# Camera Scrolling Between Routes in Presentation Mode

## Overview

In the Lutruwita2 application, camera scrolling between routes in presentation mode is handled by a specific function in the `PresentationMapView.tsx` component. This document explains how this functionality works.

## File Location

The camera scrolling functionality is implemented in:
```
src/features/presentation/components/PresentationMapView/PresentationMapView.tsx
```

## Implementation Details

The camera scrolling functionality is implemented as a React `useEffect` hook in the `PresentationMapView.tsx` component. This hook watches for changes to the `currentRoute` state and animates the camera transition when a new route is selected.

```javascript
// Update map state when route changes
useEffect(() => {
  if (!isMapReady || !mapInstance.current || !currentRoute?.geojson) return;

  // Get route bounds
  if (currentRoute.geojson?.features?.[0]?.geometry?.type === 'LineString') {
    const feature = currentRoute.geojson.features[0] as Feature<LineString>;
    const coordinates = feature.geometry.coordinates;
    
    if (coordinates && coordinates.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      coordinates.forEach((coord) => {
        if (coord.length >= 2) {
          bounds.extend([coord[0], coord[1]]);
        }
      });

      // Find the middle coordinate of the route
      const middleIndex = Math.floor(coordinates.length / 2);
      const middleCoord = coordinates[middleIndex];

      if (!previousRouteRef.current) {
        // For the first route, fit bounds to set initial zoom
        mapInstance.current.fitBounds(bounds, {
          padding: 50,
          duration: 1500
        });
      } else {
        // For subsequent routes, pan to middle coordinate maintaining zoom
        mapInstance.current.easeTo({
          center: [middleCoord[0], middleCoord[1]],
          zoom: mapInstance.current.getZoom(),
          duration: 1500,
          essential: true
        });
      }

      // Update previous route reference
      previousRouteRef.current = currentRoute.routeId || null;
    }
  }
}, [isMapReady, currentRoute]);
```

## How It Works

The function handles two different cases:

1. **First Route Display**: When `previousRouteRef.current` is null (indicating this is the first route being displayed), it uses `mapInstance.current.fitBounds()` to zoom and center the map to show the entire route. This sets the initial view.

2. **Subsequent Route Transitions**: For all subsequent route changes, it uses `mapInstance.current.easeTo()` to smoothly pan to the middle coordinate of the new route while maintaining the current zoom level. This creates a smooth transition between routes.

The animation duration is set to 1500ms (1.5 seconds) for a smooth transition between routes.

## Key Components

- **previousRouteRef**: A React ref that keeps track of the previously displayed route to determine if this is the first route or a subsequent one.
- **mapInstance**: A reference to the Mapbox GL map instance.
- **currentRoute**: The currently selected route from the RouteContext.
- **LngLatBounds**: A Mapbox GL utility for calculating the bounding box of a set of coordinates.
- **easeTo**: A Mapbox GL method for smoothly animating the camera to a new position.

## Route Initialization

The routes are initialized in presentation mode using the `usePresentationRouteInit` hook, which adds all routes to the context and sets the initial route. However, the actual camera movement between routes is handled by the useEffect hook described above.

## Triggering Route Changes

Route changes are triggered when the user interacts with the sidebar or other UI elements that call the `setCurrentRoute` function from the RouteContext. When the `currentRoute` state changes, the useEffect hook detects this change and animates the camera accordingly.
