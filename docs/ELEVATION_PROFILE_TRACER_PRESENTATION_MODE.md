# Elevation Profile Tracer in Presentation Mode

## Overview

This document describes the implementation of the elevation profile tracer feature in presentation mode. The goal was to implement a feature that shows a marker on both the map and the elevation profile that corresponds to the current hover position on the map, as described in `docs/ELEVATION_PROFILE_TRACER.md`.

## Implementation Details

### Issues Discovered

After examining the codebase, we discovered several issues that were preventing the elevation profile tracer from working in presentation mode:

1. **Duplicate Component Files**: The project has both JavaScript and TypeScript versions of the PresentationMapView component:
   - `src/features/presentation/components/PresentationMapView/PresentationMapView.js`
   - `src/features/presentation/components/PresentationMapView/PresentationMapView.tsx`

2. **Missing Functionality in JavaScript Version**: The application was using the JavaScript version, which was missing critical functionality:
   - The mousemove event handler to detect the closest point on the route was missing
   - The hover marker display code was missing

3. **Incomplete Implementation**: While the PresentationElevationProfile component was already set up to use hover coordinates from the MapContext, the coordinates were never being set in presentation mode.

### Changes Made

We made the following changes to implement the elevation profile tracer in presentation mode:

1. **Added Mousemove Event Handler**: Added code to the JavaScript version of PresentationMapView that:
   - Detects when the user hovers over the map
   - Finds all route sources in the map
   - Identifies the active route source
   - Calculates the closest point on the route to the mouse position
   - Sets the hover coordinates in the MapContext when the mouse is close enough to the route
   - Clears the hover coordinates when the mouse moves away from the route

2. **Added Hover Marker Display**: Added code to display a marker on the map:
   - Added a hoverMarkerRef to track the marker instance
   - Added a useEffect hook that creates/updates the marker when hover coordinates change
   - Styled the marker as a red dot with white border to match the elevation profile marker

### How It Works

The implementation follows the same pattern as in creation mode:

1. When the user hovers over the map, the mousemove event handler calculates the closest point on the active route
2. If the mouse is close enough to the route, it sets the hover coordinates in the MapContext
3. The useEffect hook creates/updates a marker on the map at these coordinates
4. The PresentationElevationProfile component, which was already listening for these coordinates, displays a matching marker on the elevation profile

## Lessons Learned

1. **Code Duplication Issues**: Having both .js and .tsx versions of the same component led to inconsistencies. The TypeScript version had the complete implementation, but the JavaScript version that was actually being used was missing critical functionality.

2. **Context Sharing Works**: The MapContext was correctly set up to share hover coordinates between components. Once we properly set the hover coordinates in the JavaScript version, the elevation profile component automatically displayed the marker.

3. **Complete Implementation**: For features like this, both sides of the implementation need to be complete:
   - Setting the hover coordinates in the MapContext
   - Displaying the marker on the map
   - Displaying the marker on the elevation profile

## Future Improvements

1. **Consolidate Duplicate Files**: Consider consolidating the JavaScript and TypeScript versions of components to avoid similar issues in the future.

2. **Add Tests**: Add tests to verify that the elevation profile tracer works correctly in both creation and presentation modes.

3. **Improve Performance**: The current implementation recalculates the closest point on every mouse move. This could potentially be optimized for better performance, especially for routes with many points.
