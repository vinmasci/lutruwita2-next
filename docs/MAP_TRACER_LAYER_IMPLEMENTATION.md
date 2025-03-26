# Map Tracer Layer Implementation

## Overview

This document describes the implementation of the map tracer as a Mapbox GL layer instead of a marker in presentation mode, and outlines the work needed to implement the same approach in creation and embed modes.

## Problem

The map tracer marker, which shows the closest point on a route when hovering over the map, was implemented as a `mapboxgl.Marker` with an HTML element. Even though the HTML element had `pointerEvents: 'none'` set, the marker itself was still intercepting clicks, preventing them from reaching POIs and other interactive elements underneath.

## Solution in Presentation Mode

We've implemented a solution in presentation mode that renders the tracer as a Mapbox GL layer instead of a marker. This places the tracer behind interactive elements like POIs while maintaining the same visual appearance.

### Implementation Details

1. **Added GeoJSON Source and Layer**
   ```javascript
   // Add hover point source and layer during map initialization
   map.addSource('hover-point', {
     type: 'geojson',
     data: {
       type: 'Feature',
       geometry: {
         type: 'Point',
         coordinates: [0, 0] // Initial coordinates
       },
       properties: {}
     }
   });
   
   map.addLayer({
     id: 'hover-point',
     type: 'circle',
     source: 'hover-point',
     paint: {
       'circle-radius': 8,
       'circle-color': '#ff0000',
       'circle-stroke-width': 2,
       'circle-stroke-color': '#ffffff',
       'circle-opacity': 0.8
     }
   });
   
   // Initially hide the layer
   map.setLayoutProperty('hover-point', 'visibility', 'none');
   ```

2. **Replaced Marker Update Logic**
   ```javascript
   // Update the GeoJSON source when coordinates change
   useEffect(() => {
     if (!mapInstance.current || !isMapReady) return;
     
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
           
           // Show the layer
           mapInstance.current.setLayoutProperty('hover-point', 'visibility', 'visible');
         }
       } catch (error) {
         console.error('[PresentationMapView] Error updating hover point:', error);
       }
     } else {
       // Hide the layer when no coordinates
       try {
         mapInstance.current.setLayoutProperty('hover-point', 'visibility', 'none');
       } catch (error) {
         // Ignore errors when hiding (might happen during initialization)
       }
     }
   }, [hoverCoordinates, isMapReady]);
   ```

3. **Added Cleanup**
   ```javascript
   // In the cleanup function of the map initialization useEffect
   return () => {
     if (mapInstance.current) {
       // Remove the hover point layer and source if they exist
       if (mapInstance.current.getLayer('hover-point')) {
         mapInstance.current.removeLayer('hover-point');
       }
       if (mapInstance.current.getSource('hover-point')) {
         mapInstance.current.removeSource('hover-point');
       }
       
       mapInstance.current.remove();
       mapInstance.current = null;
     }
     document.head.removeChild(style);
   };
   ```

### Benefits

1. **Improved Interaction**: POIs and other interactive elements can now be clicked even when the tracer is present, as the tracer is rendered as a map layer behind them.

2. **Maintained Performance**: The implementation maintains the same performance characteristics as before, as we're only changing how the tracer is visualized, not how the closest point is calculated.

3. **Consistent Visual Appearance**: The tracer still appears as a red dot with a white border, maintaining visual consistency with the previous implementation.

## Pending Implementation in Other Modes

The same approach needs to be implemented in:

1. **Creation Mode** (`src/features/map/components/MapView/MapView.js`)
2. **Embed Mode** (`src/features/presentation/components/EmbedMapView/EmbedMapView.jsx`)

### Implementation Steps for Other Modes

To implement this solution in creation and embed modes, follow these steps:

1. **Add GeoJSON Source and Layer**
   - Add the hover point source and layer during map initialization
   - Initially set the layer visibility to 'none'

2. **Replace Marker Update Logic**
   - Remove the existing marker creation/removal code
   - Replace it with code that updates the GeoJSON source data
   - Show/hide the layer based on whether coordinates are available

3. **Add Cleanup**
   - Add code to remove the layer and source during cleanup

### Considerations

- Ensure the layer is added before any interactive layers to maintain proper z-ordering
- Keep all existing logic for detecting the closest point on the route
- Only change how the marker is visualized, not how it's calculated

## Conclusion

The map tracer has been successfully implemented as a Mapbox GL layer in presentation mode, solving the issue of the tracer intercepting clicks. The same approach should be implemented in creation and embed modes to ensure consistent behavior across the application.

## Known Limitations

### Map Style Changes

The current implementation has a limitation: when changing map styles (e.g., from satellite to streets view), the tracer layer disappears. This happens because Mapbox GL removes all custom layers when the map style changes.

To address this issue, we would need to:

1. Listen for the 'styledata' event on the map
2. Re-add the hover point source and layer when the style changes
3. Update the layer with the current hover coordinates

```javascript
map.on('styledata', () => {
  // Check if the hover-point source exists
  if (!map.getSource('hover-point')) {
    // Re-add the source and layer
    map.addSource('hover-point', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0]
        },
        properties: {}
      }
    });
    
    map.addLayer({
      id: 'hover-point',
      type: 'circle',
      source: 'hover-point',
      paint: {
        'circle-radius': 8,
        'circle-color': '#ff0000',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.8
      }
    });
    
    // Hide the layer initially
    map.setLayoutProperty('hover-point', 'visibility', 'none');
    
    // If we have current hover coordinates, update the source
    if (hoverCoordinates) {
      map.getSource('hover-point').setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: hoverCoordinates
        },
        properties: {}
      });
      map.setLayoutProperty('hover-point', 'visibility', 'visible');
    }
  }
});
```

### Interaction with Other HTML Elements

Another limitation is that we cannot control the stacking order between Mapbox GL layers (like our tracer) and HTML elements (like photo markers) using CSS z-index. This makes it challenging to implement a similar approach for other elements like photo markers while maintaining their current styling and functionality.

For elements that require complex styling and interaction (like photo markers with thumbnails and hover effects), converting them to Mapbox GL layers would be significantly more complex and might not be worth the effort.
