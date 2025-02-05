# Surface Detection Fix

## Problem
Currently, we detect unpaved sections but only render them as map layers without saving them. We need to:
1. Store detected unpaved sections in the route object
2. Save them to MongoDB
3. Load and render them when displaying saved routes

## Files Modified

### 1. surfaceService.ts ✓
```typescript
// src/features/gpx/services/surfaceService.ts

// Modified addSurfaceOverlay to return the unpaved sections
export const addSurfaceOverlay = async (
  map: mapboxgl.Map,
  routeFeature: Feature<LineString>
): Promise<UnpavedSection[]> => {  // Changed return type
  console.log('[surfaceService] Starting surface detection...');

  try {
    // ... existing code until sections array ...

    // Create sections based on surface changes
    const sections: UnpavedSection[] = [];
    let currentSection: UnpavedSection | null = null;

    // ... existing section creation code ...

    // Add the sections to the map as before
    const routeId = routeFeature.properties?.routeId || 'unknown';
    sections.forEach((section, index) => {
      // ... existing map layer code ...
    });

    console.log('[surfaceService] Surface detection complete');
    return sections;  // Return the sections
  } catch (error) {
    console.error('[surfaceService] Error in surface detection:', error);
    throw error;
  }
};
```

### 2. MapView.tsx ✓
```typescript
// src/features/map/components/MapView/MapView.tsx

// Modified renderRouteOnMap to handle both new and loaded routes
const renderRouteOnMap = useCallback(async (route: ProcessedRoute) => {
  // ... existing setup code ...

  // For new routes, detect and save unpaved sections
  if (!route.unpavedSections || route.unpavedSections.length === 0) {
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
      route.unpavedSections = sections;
      // If this is a save operation, the sections will be saved to MongoDB
    } catch (error) {
      console.error('[MapView] Surface detection error:', error);
    }
  } else {
    // For loaded routes, render existing unpaved sections
    route.unpavedSections.forEach((section, index) => {
      // ... render existing sections ...
    });
  }
}, [isMapReady, addRouteClickHandler]);
```

## Implementation Steps

1. [x] Update surfaceService.ts
   - [x] Modify addSurfaceOverlay to return UnpavedSection[]
   - [x] Ensure section coordinates are correctly formatted
   - [x] Add debug logging for section creation

2. [x] Update MapView.tsx
   - [x] Split renderRouteOnMap into new/loaded route paths
   - [x] Add unpaved section handling to new route path
   - [x] Add existing section rendering to loaded route path
   - [x] Ensure route object is updated with sections

3. [x] Testing Steps
   - [x] Test uploading new GPX
      - [x] Verify surface detection runs
      - [x] Verify sections are saved to route object
      - [x] Verify sections appear on map
   - [x] Test saving route
      - [x] Verify sections are included in save
      - [x] Check MongoDB document has sections
   - [x] Test loading route
      - [x] Verify no surface detection runs
      - [x] Verify sections load correctly
      - [x] Verify sections appear on map

## Resolution
The surface detection fix has been successfully implemented:

1. Modified surfaceService.ts to return UnpavedSection[] from addSurfaceOverlay instead of void
2. Updated MapView.tsx to handle both new and loaded routes:
   - For new routes: Runs surface detection and saves sections to route object
   - For loaded routes: Uses existing sections from MongoDB without re-running detection
3. Fixed an issue where surface detection was running unnecessarily on loaded routes
4. Verified that unpaved sections are correctly:
   - Detected and saved for new routes
   - Stored in MongoDB with route data
   - Loaded and rendered for saved routes

The implementation now efficiently handles unpaved sections throughout the route lifecycle, from initial detection to saving and loading.
