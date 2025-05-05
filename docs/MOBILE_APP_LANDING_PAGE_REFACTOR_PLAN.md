# Mobile App Landing Page Refactor Plan: Map-Centric View

## 1. Introduction

**Goal:** Redesign the mobile app's `HomeScreen` to feature a map-centric layout, aligning with the user-provided design image and requirements. This involves replacing the current list-based view with an interactive map displaying route clusters, implementing a mini route preview drawer, and adapting the filter functionality.

**User Requirements Summary:**

*   **Layout:** Top 2/3 map, bottom 1/3 compact route info/preview. Search bar and category scroll remain at the top.
*   **Map Features:**
    *   Display routes as clusters/pins.
    *   Clicking a pin opens a mini route preview drawer.
    *   Clicking the preview renders the full GPX route on the map.
    *   Include a "Find User Location" button.
    *   No scale or compass needed (though Mapbox might show a compass by default).
*   **Filtering:** Filter button in the search bar opens a drawer (not modal) with options similar to the web app.

## 2. Current State

*   **File:** `mobile/lutruwita-mobile/src/screens/HomeScreen.tsx`
*   **Description:** Currently displays a title, `MapTypeSelector` (category scroll), a `Searchbar` with a filter `IconButton`, and a `FlatList` rendering `RouteCard` components. Filters are handled by `useDynamicRouteFilters` and displayed in a `FilterModal`.

## 3. Desired State

A screen dominated by an interactive map showing route locations. Key elements:

1.  **Search Bar & Filter Button:** At the very top.
2.  **MapTypeSelector:** Below the search bar, allowing category filtering.
3.  **MapView:** Occupying the majority of the screen below the selectors, displaying route clusters/pins.
4.  **User Location Button:** Overlayed on the map.
5.  **Route List Drawer:** A drawer sliding up from the bottom displaying cards for all currently filtered/visible routes on the map.
6.  **Single Route Preview:** When a specific route pin on the map is clicked, the Route List Drawer is replaced or overlaid with a focused preview card for that single route.
7.  **Filter Drawer:** Slides up from the bottom when the filter icon is clicked.

## 4. Implementation Steps

### Step 4.1: Refactor HomeScreen Layout ✅

*   **File:** `mobile/lutruwita-mobile/src/screens/HomeScreen.tsx`
*   **Status:** COMPLETED
*   **Implementation Details:**
    * Removed the `FlatList` component previously used for displaying `RouteCard`s
    * Integrated `<MapboxGL.MapView>` component to take up the full screen
    * Positioned the `Searchbar` and `MapTypeSelector` components as floating elements on top of the map
    * Added a route count indicator at the bottom of the screen
    * Implemented a full-screen map layout with UI elements floating on top, similar to AllTrails

### Step 4.2: Implement Route Clustering on Map ✅

*   **Files:**
    *   `mobile/lutruwita-mobile/src/screens/HomeScreen.tsx` (Map integration)
    *   `mobile/lutruwita-mobile/src/utils/routeClusteringUtils.ts` (New file)
    *   `mobile/lutruwita-mobile/src/components/map/RouteMarker.tsx` (New file)
*   **Status:** COMPLETED
*   **Implementation Details:**
    * Created `routeClusteringUtils.ts` by adapting the photo clustering utilities
    * Implemented `routesToGeoJSON` function to convert route data to GeoJSON format
    * Added clustering functionality with dynamic radius based on zoom level
    * Created a `RouteMarker` component for displaying individual route pins
    * Implemented color-coding for route pins based on route type
    * Added click handlers for both clusters and individual route pins

### Step 4.3: Implement Route List Drawer & Single Preview ✅

*   **Files:**
    *   `mobile/lutruwita-mobile/src/components/map/RoutePreviewDrawer.tsx` (New file)
    *   `mobile/lutruwita-mobile/src/components/map/RouteListDrawer.tsx` (New file)
    *   `mobile/lutruwita-mobile/src/screens/HomeScreen.tsx` (Integration)
*   **Status:** COMPLETED
*   **Implementation Details:**
    * Created a new `RoutePreviewDrawer` component for displaying a single route preview when a pin is clicked
    * Implemented a separate `RouteListDrawer` component that shows all filtered routes in a scrollable list
    * Added a route count indicator at the bottom of the screen that opens the route list drawer when clicked
    * Enhanced route cards with proper image placeholders and formatted statistics
    * Added comma-separated thousands for elevation values and unpaved percentage display
    * Implemented proper navigation to the route detail page when a route is selected from either drawer
    * Used the same navigation approach as in SavedRoutesScreen (`navigation.navigate('Map', { mapId: routeId })`)

### Step 4.4: Implement Full Route Rendering on Map ✅

*   **File:** `mobile/lutruwita-mobile/src/screens/HomeScreen.tsx`
*   **Status:** COMPLETED
*   **Implementation Details:**
    * Added state management for tracking the currently displayed route
    * Implemented rendering of the full route line when a route is selected
    * Added camera adjustments to focus on the selected route
    * Implemented a mechanism to return to the cluster view
    * **Update:** Corrected `handleViewFullRoute` in `HomeScreen.tsx` to set `fullDisplayRouteId` state, triggering route rendering on the current map instead of navigating to a different screen.
    * **Update (2025-04-27):** Fixed an issue where clicking on an individual route marker would cause the camera to zoom away from the route to an incorrect location. Modified the `handleRouteFeaturePress` function to prevent unwanted camera movement when clicking on individual markers, ensuring the camera stays focused on the selected route.

### Step 4.8: Fix Mapbox Static Image Implementation Issues ⚠️

*   **Files:**
    *   `mobile/lutruwita-mobile/src/components/map/CleanStaticMap.tsx`
    *   `static-map-test.html` (Test file)
*   **Status:** IN PROGRESS
*   **Implementation Details:**
    * Created a test HTML file to debug Mapbox Static Images API path overlay issues
    * Identified that the path overlay syntax was incorrectly formatted in our implementation
    * The correct format for path overlays is `path-{strokeWidth}+{strokeColor}-{strokeOpacity}({encodedPolyline})`
    * Claude 3.7 Sonnet API struggled to correctly implement the Mapbox Static Images API path overlay syntax despite multiple attempts
    * Testing revealed that the encoded polyline format is required for proper path rendering

### Step 4.5: Convert FilterModal to FilterDrawer ✅

*   **Files:**
    *   `mobile/lutruwita-mobile/src/components/filters/FilterDrawer.tsx` (New file)
    *   `mobile/lutruwita-mobile/src/screens/HomeScreen.tsx` (Integration)
*   **Status:** COMPLETED
*   **Implementation Details:**
    * Created a new `FilterDrawer` component that slides up from the bottom
    * Maintained all the existing filter options and functionality
    * Implemented smooth animations for opening and closing
    * Integrated with the HomeScreen to display when the filter button is clicked

### Step 4.6: Add User Location Button ✅

*   **File:** `mobile/lutruwita-mobile/src/screens/HomeScreen.tsx`
*   **Status:** COMPLETED
*   **Implementation Details:**
    * Added a location button in the bottom-right corner of the map
    * Implemented permission requests for location access
    * Added functionality to center the map on the user's current location
    * Styled the button to match the overall UI design

### Step 4.7: Improve Map Marker Styling ✅

*   **Files:**
    *   `mobile/lutruwita-mobile/src/screens/HomeScreen.tsx`
    *   `mobile/lutruwita-mobile/src/components/map/RoutePreviewDrawer.tsx`
    *   `mobile/lutruwita-mobile/src/components/map/RouteListDrawer.tsx`
*   **Status:** COMPLETED
*   **Implementation Details:**
    * Fixed route marker display issues by properly connecting markers to the ShapeSource
    * Replaced custom markers with standardized black circle markers with white borders
    * Added "×" (multiplication symbol) on top of individual markers for better visibility
    * Made cluster markers match individual markers in size and style
    * Fixed distance stats in route drawers to properly display distances from both metadata and route statistics
    * Ensured consistent styling between cluster and individual markers
    * Adjusted text size for cluster counts to improve readability

## 5. Current Status and Next Steps

### Completed Features:
- ✅ Full-screen map view with floating UI elements
- ✅ Route clustering and pin display with proper coordinate handling
- ✅ Category selector with icons (All, Bikepacking, Event, Single, Tourism)
- ✅ Route preview drawer when clicking on a route pin
- ✅ Route list drawer showing all filtered routes
- ✅ Filter drawer with all filter options
- ✅ User location button
- ✅ Route count indicator
- ✅ Proper navigation to route detail page

### Placeholder Information / Areas Needing Attention:
- The estimated time calculation in the route preview is a very rough estimate (4km/h walking pace) and could be improved with a more sophisticated algorithm that takes elevation into account.
- The MapTypeSelector component uses generic icons that could be replaced with more specific icons for each route type.

### Future Enhancements:
- Add animations for transitions between map states (e.g., when zooming to a cluster or route)
- Implement caching of route data for better performance
- Add pull-to-refresh functionality for updating route data
- Optimize clustering for very large numbers of routes
- Add offline support for viewing downloaded routes

## 6. Relevant Files Summary

*   **Mobile App (`mobile/lutruwita-mobile/src/`)**
    *   `screens/HomeScreen.tsx`: Main screen with map-centric layout
    *   `components/filters/FilterDrawer.tsx`: Bottom drawer for filter options
    *   `components/filters/MapTypeSelector.tsx`: Horizontal scrollable category selector
    *   `components/map/RoutePreviewDrawer.tsx`: Bottom drawer for single route preview
    *   `components/map/RouteListDrawer.tsx`: Bottom drawer for displaying all filtered routes
    *   `components/map/RouteMarker.tsx`: Custom marker for route pins
    *   `utils/routeClusteringUtils.ts`: Utilities for route clustering
    *   `hooks/useDynamicRouteFilters.ts`: Contains filter logic
    *   `context/RouteContext.tsx`: Provides route data
    *   `services/routeService.ts`: Defines data types and API calls
    *   `utils/coordinateUtils.ts`: For handling coordinate formats
    *   `config/mapbox.ts`: Mapbox access token and style URLs
    *   `utils/unitUtils.ts`: For formatting distance/elevation
