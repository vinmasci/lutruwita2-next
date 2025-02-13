# Route Loading System

## Overview
The route loading system handles loading saved routes from MongoDB and rendering them on the map. Routes can contain both paved and unpaved sections, which are stored in the database and need to be properly rendered.

## Components

### RouteContext
- Manages the state of loaded routes
- Handles loading routes from the server
- Maintains route visibility state

### RouteLayer
- Renders individual routes on the map
- Handles both main route lines and unpaved sections
- Manages layer visibility and click handlers

### useRouteState
- Manages visibility state for routes
- Controls which layers are visible/hidden
- Initializes visibility state for new routes

## Known Issues

### Route Re-rendering on Click (Fixed)
**Issue**: When clicking on a route in the loaded routes view, the route would re-render causing a visual flash where the line would turn white momentarily. This was happening because the click handler was triggering a full cleanup and re-render of the route layers.

**Fix**: Modified RouteLayer.tsx to prevent unnecessary re-rendering:
1. Removed the cleanupLayers function since we don't want to re-render layers
2. Added a check to only add layers if they don't exist:
```typescript
// Only add layers if they don't exist
if (!map.getSource(mainSourceId)) {
  // Add layers here...
}
```
3. Modified the click handler to just toggle hover layer visibility without re-rendering:
```typescript
const clickHandler = () => {
  // Just toggle hover layer visibility, no re-rendering
  if (visibility.mainRoute) {
    map.setLayoutProperty(hoverLayerId, 'visibility', 'visible');
  }
};
```
4. Removed layer cleanup from the cleanup function, only removing event listeners:
```typescript
return () => {
  // Just remove event listeners, don't cleanup layers
  map.off('click', mainLayerId, clickHandler);
  map.off('mouseenter', mainLayerId, mouseHandler);
  map.off('mousemove', mainLayerId, mouseHandler);
  map.off('mouseleave', mainLayerId, mouseleaveHandler);
};
```

This ensures that routes behave the same way as in the ADD GPX menu, where they smoothly highlight on hover/click without any visual flashing or re-rendering.

### Surface Data Not Saving for Additional Routes (Fixed)
**Issue**: When loading a route with one GPX file it loads fine, but when loading a subsequent route through Add GPX and updating the file, the surface data is not being saved with it. This is evident in the MongoDB data where the first route has unpaved sections but subsequent routes have an empty unpavedSections array.

**Fix**: The issue was resolved by moving the surface detection to happen during initial GPX processing in useClientGpxProcessing.ts, before the route is saved to MongoDB. Here are the changes made:

1. Added surface detection to useClientGpxProcessing.ts:
```typescript
export const useClientGpxProcessing = () => {
  const { map } = useMapContext(); // Get map instance for surface detection
  const [isLoading, setIsLoading] = useState(false);

  const processGpx = async (file: File): Promise<ProcessedRoute | null> => {
    // ... existing processing code ...

    const route = normalizeRoute({
      id,
      routeId: `route-${id}`,
      name: parsed.properties.name || file.name.replace(/\.gpx$/i, ''),
      color: '#ff4d4d',
      isVisible: true,
      gpxData: JSON.stringify(parsed),
      rawGpx,
      geojson,
      statistics,
      status: {
        processingState: 'completed',
        progress: 100
      }
    });

    // Add surface detection here
    if (map && route.geojson.features[0]) {
      const feature = route.geojson.features[0] as Feature<LineString>;
      try {
        const featureWithRouteId = {
          ...feature,
          properties: {
            ...feature.properties,
            routeId: route.routeId || route.id
          }
        };
        // Detect and save unpaved sections
        const sections = await addSurfaceOverlay(map, featureWithRouteId);
        route.unpavedSections = sections.map(section => ({
          startIndex: section.startIndex,
          endIndex: section.endIndex,
          coordinates: section.coordinates,
          surfaceType: section.surfaceType === 'unpaved' ? 'unpaved' :
                      section.surfaceType === 'gravel' ? 'gravel' : 'trail'
        }));
      } catch (error) {
        console.error('[useClientGpxProcessing] Surface detection error:', error);
      }
    }

    return route;
  };

  return {
    processGpx,
    isLoading
  };
};
```

2. Removed surface detection from MapView.tsx:
```typescript
// Removed this block from renderRouteOnMap function:
if (route._type === 'fresh' && (!route.unpavedSections || route.unpavedSections.length === 0)) {
  const feature = route.geojson.features[0] as Feature<LineString>;
  try {
    const featureWithRouteId = {
      ...feature,
      properties: {
        ...feature.properties,
        routeId: routeId
      }
    };
    // Detect and save unpaved sections
    const sections = await addSurfaceOverlay(map, featureWithRouteId);
    // Update route with unpaved sections
    route.unpavedSections = sections.map(section => ({
      startIndex: section.startIndex,
      endIndex: section.endIndex,
      coordinates: section.coordinates,
      surfaceType: section.surfaceType === 'unpaved' ? 'unpaved' :
                  section.surfaceType === 'gravel' ? 'gravel' : 'trail'
    }));
  } catch (error) {
    console.error('[MapView] Surface detection error:', error);
  }
}
```

This solution ensures that:
1. Surface detection happens during initial GPX processing
2. The surface data is included in the route object before it's normalized and added to context
3. The surface data is properly saved to MongoDB when the route is saved

**Example MongoDB Data After Fix**:
```javascript
routes: [
  {
    routeId: "route-2c2fec09-abed-47fe-a28f-b813ecb728d0",
    name: "Lutruwita Way- Day 1",
    unpavedSections: [/* 18 items */],
    // other fields...
  },
  {
    routeId: "route-aaef952c-a972-4348-ac78-59916d772ffd",
    name: "Lutruwita Way - Day 2",
    unpavedSections: [/* 15 items */], // Surface data now properly saved
    // other fields...
  }
]
```

### Route Deletion Issue in ADD GPX Menu (Fixed)
**Issue**: When viewing multiple routes in the ADD GPX menu after loading a file, deleting the second route automatically deleted the first route instead. This incorrect cascading deletion affected the user's ability to manage multiple routes independently.

**Fix**: The issue was resolved by ensuring consistent use of route identifiers throughout the deletion process:
1. Modified Uploader.tsx to properly find routes using both id and routeId:
```typescript
const route = routes.find(r => r.id === fileId || r.routeId === fileId);
```

2. Updated UploaderUI.tsx to consistently use routeId throughout:
   - Changed all id references to use routeId
   - Updated selection logic to use routeId comparisons
   - Fixed keyboard navigation to use routeId
   - Made editing state use routeId consistently

This ensures that when deleting a route, the correct route is identified and removed, fixing the issue where deleting the second route would incorrectly delete the first route.

## Data Flow

1. User loads a saved route
2. RouteContext fetches route data from MongoDB
3. Route data includes unpaved sections in the schema:
```typescript
unpavedSections: [{
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true },
  coordinates: { type: [[Number]], required: true },
  surfaceType: { 
    type: String, 
    enum: VALID_SURFACE_TYPES,
    required: true 
  }
}]
```
4. RouteLayer component renders both main route and unpaved sections
5. useRouteState manages visibility of these layers

## Best Practices

1. Always initialize visibility state for loaded routes
2. Only add layers when they don't exist to prevent re-rendering
3. Maintain separate visibility states for main route and unpaved sections
4. Use hover layer visibility toggling instead of re-rendering for route highlighting
5. Log visibility state changes for debugging
