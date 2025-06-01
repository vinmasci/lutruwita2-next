# Route Detail Page: Initial Load Fixes for Map Zoom and Distance Markers

This document outlines the recent changes made to address issues with the initial display of the map and distance markers on the Route Detail Page, particularly for multi-stage (master) routes.

## Core Problems Addressed

1.  **Initial Map Zoom:** The map was not correctly zooming to the bounds of the entire route when the Route Detail Page first loaded. It worked correctly when individual day/stage tabs were selected.
2.  **Distance Markers on Master Route (Initial Load):** Distance markers were not appearing on the "Overview" (master route) tab when the page first loaded. They would appear if the "Overview" tab was re-selected or if another tab was selected and then the "Overview" tab was selected.

## Solutions Implemented

### 1. Initial Map Zoom to Route Bounds

*   **Issue:** Timing problem where the `MapView` instance or the route's coordinate bounds were not fully available when the initial camera adjustment logic was triggered.
*   **Solution in `RouteDetailView.swift`:**
    *   A helper function `adjustCameraToRouteBounds()` was created.
    *   This function uses `currentMapView.mapboxMap.camera(for: boundingBoxCoordinates, ...)` to calculate the appropriate `CameraOptions`.
    *   It's triggered by changes to `viewModel.route` (for tab selections) and also with a slight delay when `mapView` becomes available and in `.onAppear` to handle initial load scenarios.
    *   The delays were adjusted (currently 0.5s for `mapView` and 0.7s for `.onAppear`) to allow components to initialize.
*   **Solution in `RouteDetailViewModel.swift` (for `getCameraBounds()`):**
    *   The `getCameraBounds()` method was made more robust. If the currently selected `route` (e.g., master route) lacks direct coordinates, it now aggregates coordinates from all child segments in `self.routes` to calculate the overall bounds. This ensures valid bounds are available for the initial zoom, even for the master route.
*   **Animation in `EnhancedRouteMapView.swift`**:
    *   The `updateUIView` method was changed from `mapView.mapboxMap.setCamera(to: cameraPosition)` to `mapView.camera.ease(to: cameraPosition, duration: 0.75)`. This provides a smooth animated transition for all camera updates.

### 2. Distance Markers on Master Route (Initial Load)

*   **Issue:** Similar to the map zoom, the distance markers for the "Overview" (master route) were not appearing on initial load due to timing issues. Specifically, the `updateDistanceMarkers()` function was being called before all necessary data (consolidated coordinates for the master route) or map components (like `distanceMarkerMapView` and `distanceMarkersAnnotationManager`) were fully initialized and available to the ViewModel.
*   **Solution in `RouteDetailViewModel.swift`**:
    *   **`getConsolidatedCoordinatesForOverview()` Method:**
        *   A new private method was added to consolidate coordinates from all segments in `self.routes` if the master route is selected. It handles cases where the master route itself might not have direct coordinates. It also attempts to avoid duplicating coordinates at segment joins.
    *   **Modified `updateDistanceMarkers()`:**
        *   This function now checks if the "Overview" tab (`selectedRouteIndex == -1`) is active.
        *   If so, it calls `getConsolidatedCoordinatesForOverview()` to get the path for markers.
        *   Otherwise, for individual stages, it uses the coordinates of the currently selected `self.route`.
    *   **`isDataAndMapReadyForInitialMarkers` Flag and `attemptInitialMarkerSetup()` Method:**
        *   A `@Published var isDataAndMapReadyForInitialMarkers = false` flag was introduced.
        *   A private method `attemptInitialMarkerSetup()` was created. This method:
            *   Checks if data is loaded (`!isLoading`).
            *   Checks if `distanceMarkerMapView != nil` and `distanceMarkersAnnotationManager != nil`.
            *   Checks if `isDataAndMapReadyForInitialMarkers` is `false` (to run only once for the initial setup).
            *   If all conditions are met, it sets `isDataAndMapReadyForInitialMarkers = true` and calls `self.selectRoute(index: -1)`. Calling `selectRoute` ensures that `updateDistanceMarkers` is triggered with the correct context for the overview.
        *   `attemptInitialMarkerSetup()` is called from:
            *   The end of `processMultiRouteData` and `processRouteData` (after `self.isLoading = false`).
            *   `setupDistanceMarkers` (after `self.distanceMarkersAnnotationManager` is set).
        *   This ensures that the logic to display markers for the overview route on initial load is triggered reliably when all dependencies are met.

## Current Status

*   The initial map zoom to the route bounds (overview or segment) is working correctly with an animated transition.
*   Distance markers are now displayed correctly for individual day/stage tabs.
*   Distance markers are also displayed correctly for the "Overview" (master route) tab, including on the initial load of the Route Detail Page.
*   **Stage Selection Override Fix (May 20, 2025):**
    *   **Issue:** After the initial distance marker fix, clicking a stage tab immediately after page load sometimes resulted in the view reverting to the "Overview" tab. This was due to complex interactions between the initial setup logic and user-initiated tab selections.
    *   **Further Refinements in `RouteDetailViewModel.swift` (May 20, 2025 - Iteration 2 & 3):**
        *   **`selectRoute(index: Int)` Method:**
            *   Refactored to more robustly update `selectedRouteIndex` whenever the `index` parameter differs from the current state.
            *   Ensures that `self.route` and associated data (POIs, lines, photos) are correctly updated based on the new `selectedRouteIndex`.
            *   `updateDistanceMarkers()` is now called if `selectedRouteIndex` changes OR if the main `route` object instance changes, ensuring markers refresh accurately.
            *   The `userHasInteractedWithTabs` flag is set to `true` if `index != -1` (a specific stage is selected).
        *   **`attemptInitialMarkerSetup()` Method:**
            *   The `isDataAndMapReadyForInitialMarkers` flag is now set to `true` *before* the conditional call to `self.selectRoute(index: -1)`. This change aims to prevent re-entrancy issues more effectively if `selectRoute(-1)` were to trigger further view updates that might re-invoke `attemptInitialMarkerSetup()`.
            *   The method still checks `userHasInteractedWithTabs`. If `true`, it skips calling `self.selectRoute(index: -1)`, respecting any prior user tab selection.
        *   **Unique Marker Image Names (May 20, 2025 - Iteration 4):**
            *   **Issue:** Distance markers were not appearing on initial load. Mapbox logs indicated "Required image 'marker-XXXkm' is missing."
            *   **Solution in `RouteDetailViewModel.swift` (within `addCustomDistanceMarkers`):** Marker image names made unique by appending a light/dark mode suffix (e.g., `marker-10km-dark`).
        *   **Centralized Readiness Logic & Style Loaded Callback (May 20, 2025 - Iterations 5-7):**
            *   **Issue:** Markers still not appearing on initial load. The root cause was identified as marker rendering being attempted before the Mapbox style was fully loaded and ready.
            *   **Solution in `RouteDetailViewModel.swift`:**
                *   Introduced `isMapStyleLoaded: Bool` flag.
                *   Added `mapStyleDidLoad(mapView: MapView)` method, intended to be called by `EnhancedRouteMapView` when the Mapbox map's style finishes loading. This method sets `isMapStyleLoaded = true`.
                *   Created a new private method `triggerMarkerUpdateIfReady()`. This method now acts as the sole gatekeeper for calling `updateDistanceMarkers()`. It only proceeds if:
                    1.  Data is loaded and basic map components are initialized (`isDataAndMapReadyForInitialMarkers == true`).
                    2.  The Mapbox style is loaded (`isMapStyleLoaded == true`).
                    3.  The `MapView` instance (`distanceMarkerMapView`) is available.
                *   `attemptInitialMarkerSetup()` (called after data load and map component setup) now sets `isDataAndMapReadyForInitialMarkers` and calls `triggerMarkerUpdateIfReady()`. If necessary (first time, no user interaction, not on overview), it first calls `selectRoute(index: -1)` which then also calls `triggerMarkerUpdateIfReady()`.
                *   `mapStyleDidLoad()` also calls `triggerMarkerUpdateIfReady()`.
                *   `selectRoute()` also calls `triggerMarkerUpdateIfReady()` after updating its state.
                *   State-modifying operations in `attemptInitialMarkerSetup` are wrapped in `DispatchQueue.main.async` to mitigate "Publishing changes from within view updates" warnings.
            *   **Solution in `EnhancedRouteMapView.swift`:**
                *   The `makeUIView` function was modified to set up an `onStyleLoaded` observer on the `MapView`. When this event fires, it calls `coordinator.parent.viewModel.mapStyleDidLoad(mapView: mapView)`.
                *   The `applyTerrain` function was also updated to call `viewModel.mapStyleDidLoad(mapView: mapView)` if the style is already loaded when `applyTerrain` is invoked, and also within its own `onStyleLoaded` observer, ensuring the ViewModel is notified regardless of how/when the style load completes relative to terrain logic.
    *   These combined changes aim to create a clearer and more predictable state transition for tab selections and ensure reliable rendering of distance markers by explicitly waiting for the map style to be loaded.
