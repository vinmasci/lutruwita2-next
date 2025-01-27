# GPX Implementation Status

## USE MAPTILER FOR SURFACE DATA

## Important Context
We have an existing server implementation that:
- Lives in the `server/` directory
- Handles complex GPX processing
- Includes surface detection
- Uses Express server on port 3001
- Has map matching capabilities

We're currently bypassing this server temporarily to:
1. Get basic GPX functionality working
2. Simplify the implementation
3. Test core features
4. Keep the server code for later use

The server code remains in place but unused while we implement client-side processing first.

## 📦 CURRENT UPLOAD BOX LOCATION
The file upload box uses lazy loading for better performance:

1. Main Sidebar Component:
```
src/features/map/components/Sidebar/Sidebar.tsx  <-- Uses React.lazy() for Uploader
```

2. Upload Button Implementation:
```
src/features/map/components/Sidebar/SidebarListItems.tsx  <-- Contains the Upload button
```

3. Lazy-Loaded Upload Logic:
```
src/features/gpx/components/Uploader/Uploader.tsx       <-- Lazy-loaded component
src/features/gpx/hooks/useClientGpxProcessing.ts       <-- Only initializes when needed
src/features/gpx/utils/gpxParser.ts                    <-- Converts GPX to GeoJSON
```

The Uploader component and its dependencies (including the useClientGpxProcessing hook) are now only loaded when the user clicks the upload button, improving initial load performance and preventing premature hook initialization.

## Phase 1: ✅ Client-Side Implementation (COMPLETED)
Successfully implemented:
- Client-side GPX to GeoJSON conversion
- Direct map display
- Removed server dependency
- Functional upload box in sidebar
- All validation points passed
- All error handling in place

## Phase 2: ✅ Map Matching Implementation (COMPLETED)

### Current Implementation Status

#### ✅ Completed
- Added Mapbox access token from environment
- Created `src/features/gpx/services/mapMatchingService.ts`
- Implemented point batching (100 points per request)
- Modified `gpxParser.ts` to handle matched tracks
- Implemented automatic map matching without UI controls
- Added error handling for failed matches
- Fixed route display and point skipping issues
- Implemented clean route visualization

#### 🎯 Improvements Made
1. Route Display:
   - Simplified to a single route layer
   - Added white border (8px) for better visibility
   - Implemented red line (#ee5253, 6px) for main route
   - Removed individual point markers
   - Removed duplicate route display

2. Map Matching Optimization:
   - Switched to 'driving' profile for better road matching
   - Lowered confidence threshold (0.6) to accept more matches
   - Increased radius multiplier (3) for better parallel road handling
   - Improved point interpolation (5 points, 20m threshold)
   - Added overview=full parameter for complete route coverage

### Map Matching Service Implementation
```typescript
// src/features/gpx/services/mapMatchingService.ts
interface MatchingOptions {
  confidenceThreshold?: number;
  radiusMultiplier?: number;
  maxGapDistance?: number;
  interpolationPoints?: number;
}

export const matchTrackToRoads = async (
  points: [number, number][],
  options: MatchingOptions = {}
) => {
  const {
    confidenceThreshold = 0.6,
    radiusMultiplier = 3,
    maxGapDistance = 0.0002,
    interpolationPoints = 5
  } = options;
  
  // Get coordinates from Mapbox API
  const matchedCoordinates = await getMatchedCoordinates(points);
  
  return matchedCoordinates;
};
```

## Phase 3: 🚀 Surface Detection Implementation (IN PROGRESS - PIVOTED TO MAPTILER)

### Pivot to MapTiler Implementation
We've pivoted from using our own server implementation to using MapTiler for surface detection due to:
1. Better data coverage for Tasmania
2. More reliable surface data
3. Simplified architecture without needing to maintain our own database

### Current Implementation Status
- [x] Added MapTiler source to map initialization
- [x] Created new surface detection service using MapTiler vector tiles
- [x] Implemented surface type querying logic
- [x] Added road layer visualization

### Recent Changes (27/01/2025)
1. Fixed map matching issues:
   - Lowered confidence threshold from 0.6 to 0.3 to accept more matches
   - Increased search radius multiplier from 3 to 5 for better rural area matching
   - Increased max gap distance to 50 meters for rural tracks
   - Added fallback to use original points when no matches found
   - Improved best match selection logic

2. Fixed type conversion issues:
   - Switched from OpenLayers to Mapbox GL JS types
   - Updated surface detection to properly work with MapTiler data
   - Added proper zoom level handling for MapTiler data (12-14)

3. Fixed GPX Upload Flow:
   - Updated MapView to handle both File and ProcessedRoute:
     ```typescript
     handleUploadGpx = async (file?: File, processedRoute?: ProcessedRoute) => {
       const result = processedRoute || (file ? await processGpx(file) : null);
       // ... display logic
     }
     ```
   - Fixed Sidebar to properly pass processed routes:
     ```typescript
     handleUploadComplete = async (result: ProcessedRoute) => {
       await props.onUploadGpx(undefined, result);
     };
     ```
   - Updated type definitions to support the new flow
   - Fixed component communication chain

4. Multiple Hook Initialization Issue:
   - Seeing multiple "[useClientGpxProcessing] Hook initializing" logs at startup
   - This is expected behavior in development due to React's Strict Mode
   - Strict Mode intentionally double-mounts components to help detect side effects
   - Not an issue in production builds where double-mounting doesn't occur
   - Added proper cleanup in useEffect to handle multiple mounts gracefully

### Console Output During GPX Upload
```
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
[Log] [Uploader] Component initializing (Uploader.tsx, line 24)
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
[Log] [Uploader] Component initializing (Uploader.tsx, line 24)
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
[Log] [Uploader] Component mounted (Uploader.tsx, line 29)
[Log] [Uploader] Component mounted (Uploader.tsx, line 29)
[Log] [Uploader] File change triggered – {fileName: "Test.gpx"} (Uploader.tsx, line 32)
[Log] [useClientGpxProcessing] Starting GPX processing – {fileName: "Test.gpx"} (useClientGpxProcessing.ts, line 13)
[Log] [useClientGpxProcessing] Parsing GPX file (useClientGpxProcessing.ts, line 17)
[Log] [Uploader] Component initializing (Uploader.tsx, line 24)
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
[Log] [Uploader] Component initializing (Uploader.tsx, line 24)
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
[Log] [useClientGpxProcessing] Matching track to roads (useClientGpxProcessing.ts, line 23)
[Log] [useClientGpxProcessing] Checking map initialization – {isMapReady: true} (useClientGpxProcessing.ts, line 30)
[Log] [useClientGpxProcessing] Creating GeoJSON (useClientGpxProcessing.ts, line 35)
[Log] [useClientGpxProcessing] Processing complete – {routeId: "9c21ba0b-baba-495d-8328-c12499bd444b"} (useClientGpxProcessing.ts, line 75)
[Error] Roads layer not found or style not fully loaded
	(anonymous function) (surfaceService.ts:53)
	detectUnpavedSections (surfaceService.ts:51)
	(anonymous function) (MapView.tsx:55)
	addUnpavedSections (MapView.tsx:51)
	(anonymous function) (MapView.tsx:135)
	handleUploadGpx (MapView.tsx:89)
	(anonymous function) (Sidebar.tsx:51)
	handleUploadComplete (Sidebar.tsx:50)
	(anonymous function) (Uploader.tsx:40)
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
[Log] [Uploader] Component initializing (Uploader.tsx, line 24)
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
[Log] [Uploader] Component initializing (Uploader.tsx, line 24)
[Log] [useClientGpxProcessing] Hook initializing (useClientGpxProcessing.ts, line 8)
```

### Current Issues
1. Surface Detection Investigation (27/01/2025 Update):
   - Identified and fixed several surface detection issues:
     * Added proper waiting for vector tile loading using source.loaded() checks
     * Implemented robust map movement and zoom handling
     * Added 10-pixel radius for feature querying to better catch nearby roads
     * Fixed TypeScript issues with proper Point objects for bbox queries
   - Current debugging shows:
     * Map and terrain are loading correctly
     * Roads source and layer are present
     * Vector tiles are reporting as loaded
     * Initial zoom level is too low (6.09)
     * Even after forcing zoom to 13, no features are found
   - Next steps for investigation:
     * Verify if the source-layer name 'lutruwita' is correct
     * Consider increasing the query radius beyond 10 pixels
     * Verify vector tile data is actually available at zoom level 13
     * Add more detailed logging of tile loading states

2. Multiple Hook Initialization:
   - Hook initializes multiple times during development
   - Caused by React's Strict Mode double-mounting
   - Not a functional issue, just development behavior
   - Can be verified by running production build

3. React Hook Error:
```
[Error] GPX processing error: – {code: "PARSING_ERROR", message: "Invalid hook call. Hooks can only be called inside…for tips about how to debug and fix this problem.", details: "throwInvalidHookError'http://localhost:3000/node_m…eatures/gpx/hooks/useClientGpxProcessing.ts:26:54"}
```
This error occurs because we were trying to call useMapContext() inside the processGpx function, which is not allowed by React's rules of hooks. We've fixed this by moving the hook call to the top level of the custom hook, but there might be remaining issues with map initialization timing.

### Next Steps
1. Fix surface detection loading:
   - Verify MapTiler vector tile data:
     * Check if tiles are actually loading at zoom 13
     * Verify source-layer name 'lutruwita' in vector tiles
     * Test with different zoom levels (12-14 range)
   - Improve feature detection:
     * Try larger query radius (20-30 pixels)
     * Add debug visualization of query areas
     * Test with known road coordinates
   - Add more robust error handling:
     * Better logging of tile loading states
     * Visual feedback when features aren't found
     * Fallback options for failed queries

2. Fix map initialization:
   - Ensure map is fully loaded before allowing GPX processing
   - Add proper state management for map readiness
   - Improve error messaging for initialization issues
   - Add loading states during initialization

3. Test with sample routes to verify fixes:
   - Test various GPX file sizes
   - Verify surface detection accuracy
   - Check performance with large routes
   - Validate error handling

### Latest Surface Detection Debug Logs (27/01/2025)
```
[Log] [MapView] Starting surface detection at: "2025-01-27T06:09:12.005Z"
[Log] [surfaceService] Starting surface detection...
[Log] [surfaceService] Map loaded: true
[Log] [surfaceService] Terrain loaded: {source: "mapbox-dem", exaggeration: 1.5}
[Log] [surfaceService] Roads source: tt {id: "australia-roads", dispatcher: zy, type: "vector", ...}
[Log] [surfaceService] Roads layer: {id: "custom-roads", type: "line", source: "australia-roads", ...}
[Log] [surfaceService] Route feature: {type: "Feature", coordinates: 10254, bbox: undefined, ...}
[Log] [surfaceService] Vector tiles loaded
[Log] [surfaceService] Adjusting zoom level from 6.097050510596247 to 13
[Log] [surfaceService] Test point query: {point: [147.138725, -41.443981], features: 0, properties: undefined}
```

Analysis of these logs shows:
1. Initial State:
   - Map and terrain are properly loaded
   - Roads source and layer exist with correct IDs
   - Route has 10,254 coordinates to process

2. Loading Sequence:
   - Vector tiles report as loaded
   - Initial zoom is 6.09 (too far out)
   - Zoom is adjusted to 13
   - Test point query finds 0 features

3. Key Insights:
   - All components appear correctly configured
   - Vector tiles report as loaded but may not have data
   - Zoom adjustment happens but might need more time to load new tiles
   - Feature query might need larger radius or different approach

This suggests our next debugging steps should focus on:
1. Verifying actual tile data at zoom 13
2. Adding delay after zoom change
3. Testing with larger query radius
4. Adding visual debug overlays
