# Elevation Profile Tracer Implementation

## Overview

The goal is to implement a "map tracer" feature that shows a marker on the elevation profile that corresponds to the current hover position on the map. When a user hovers over the map, a marker should appear on the route at that position, and simultaneously, a corresponding marker should appear on the elevation profile showing the same position.

## Implementation Progress

### Current Status

We have successfully implemented the full functionality of the map tracer:

1. When hovering over the map, we now detect the closest point on the active route and display a marker at that position.
2. The hover coordinates are passed to the MapContext via the `setHoverCoordinates` function.
3. The marker is styled with a red color and white border to match the design requirements.
4. The elevation profile displays a matching red marker at the corresponding position.
5. The marker only appears when hovering near the active route, preventing erratic behavior when moving away from the route.
6. The elevation text is displayed in white for better visibility against dark backgrounds.

### Implementation Details

The implementation involved several key changes:

1. **Direct Route Source Detection**: Instead of relying on the routes array from the React state, we now directly access the map's style sources to find all route sources. This ensures we can detect routes even if they're not properly tracked in the state.

2. **Active Route Prioritization**: We implemented a priority-based system for route detection:
   - First tries to find the active route using a stored route ID reference
   - If that fails, falls back to using the current route from the React context
   - Only uses the first route as a last resort fallback

3. **Closest Point Calculation**: For the active route, we calculate the closest point to the mouse coordinates and display a marker at that position.

4. **Distance Threshold**: Added a distance threshold (approximately 500m) to only show the marker when close to the route, preventing erratic behavior when moving away from the route.

5. **Marker Styling**: Both markers (map and elevation profile) are styled as red dots with white borders for visual consistency.
   - Map marker: Red dot with white border
   - Elevation profile marker: Matching red dot with white border
   - Elevation text: White text positioned above the marker for better visibility

6. **Tooltip Removal**: We removed the tooltip that was showing the coordinates to keep the UI clean.

## Technical Implementation

The main implementation is in two files:

1. **src/features/map/components/MapView/MapView.js**
   - Handles the map display and interactions
   - Detects the closest point on the active route when hovering
   - Sets the `hoverCoordinates` in the MapContext
   - Maintains a reference to the current route ID for reliable tracking
   - Implements distance threshold to prevent marker from appearing when too far from route

2. **src/features/gpx/components/ElevationProfile/ElevationProfile.tsx**
   - Uses the `hoverCoordinates` from MapContext to display a marker on the elevation profile
   - Converts the geographic coordinates to elevation profile coordinates
   - Displays a red marker with white border to match the map marker
   - Shows elevation value in white text above the marker

The communication between these components is handled through the MapContext, which provides the shared state for the hover coordinates.

## Completed Improvements

1. ✅ **Active Route Only**: Modified the route detection logic to only consider the active route instead of all routes.
   - Implemented a priority-based system for route detection
   - Added persistent tracking of the current route ID

2. ✅ **Distance Threshold**: Added a threshold to only show the marker when close to the route.
   - Prevents erratic behavior when moving away from the route
   - Threshold set to approximately 500m (0.005 degrees)

3. ✅ **Consistent Marker Styling**: Updated both markers to use the same styling.
   - Red dot with white border on both map and elevation profile
   - Reduced elevation profile marker size for better visual appearance
   - Adjusted border width for cleaner appearance

4. ✅ **Improved Text Visibility**: Enhanced the elevation text display.
   - Changed text color to white for better visibility
   - Positioned text slightly higher above the marker
   - Added bold font weight for better readability

5. ✅ **Error Handling**: Added additional error handling and logging for better debugging.
