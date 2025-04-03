# Presentation Mode Performance Analysis (Updated 2025-04-03)

This document summarizes the investigation into performance issues and crashes experienced in Presentation Mode, particularly on mobile devices.

## Initial Findings (Based on Logging)

1.  **Duplicate Map Initialization:**
    *   **Observation:** Logs showed `[PresentationMapView] 🚀 Map initialization starting` twice, indicating the resource-intensive Mapbox GL initialization was running multiple times.
    *   **Impact:** High resource consumption, potential instability.
    *   **Status:** **Resolved**. Implemented an `isInitializedRef` flag in `PresentationMapView.js` to prevent the initialization `useEffect` from running more than once per component lifecycle.

2.  **Component Unmounting During Initialization:**
    *   **Observation:** Logs like `[PresentationMapView] ⚠️ Component unmounted during map load...` indicated that `PresentationMapView` was being unmounted and remounted during the loading process. This also caused duplicate *route* initialization logic in `RoutePresentation.js`.
    *   **Impact:** State loss, race conditions, memory leaks, crashes (especially on mobile).
    *   **Status:** **Resolved**. Addressed by:
        *   Using `React.memo` on the `RouteContent` component within `RoutePresentation.js`.
        *   Adding a stable `key={route.persistentId}` prop to `RouteContent`.
        *   Implementing a module-level `isRoutePresentationInitialized` flag in `RoutePresentation.js` to prevent duplicate route/POI/photo/line loading logic even across remounts.

3.  **Excessive Clustering Recalculations:**
    *   **Observation:** Frequent recalculations of POI and Photo clusters on zoom changes, even minor ones.
    *   **Impact:** High CPU usage, potential UI freezes.
    *   **Status:** **Partially Addressed (Previously)**. Throttling was likely added in previous sessions, but the core issue might be dependency arrays triggering recalculations too often. *Further investigation may be needed if clustering remains slow.*

4.  **Large Route Data Size:**
    *   **Observation:** Initial route data payload can be large (~1.4MB observed), containing many coordinates.
    *   **Impact:** Increased memory and CPU usage during loading and processing.
    *   **Status:** **Not Addressed**. This requires longer-term strategies like server-side simplification or chunked loading.

## Map Trace Hover Marker Performance Investigation

*   **Observation:** The hover marker that follows the route line felt sluggish, even on desktop.
*   **Initial Cause:** The `mousemove` event handler in `PresentationMapView.js` was performing expensive calculations on every event:
    *   Iterating through all route coordinates (potentially thousands).
    *   Looking up the route source from the map style object repeatedly.
    *   Updating a GeoJSON source frequently, triggering map redraws.
*   **Optimizations Implemented:**
    1.  **Disabled on Mobile:** The feature is now completely disabled on mobile (`window.innerWidth <= 768`) to avoid performance hits.
    2.  **Throttling:** The `mousemove` handler is throttled using `lodash.throttle` to run at most every 250ms.
    3.  **Coordinate Sampling:** Instead of checking every coordinate, the code now samples every 20th coordinate, significantly reducing calculations.
    4.  **Ref Usage for Stability:**
        *   The `setHoverCoordinates` state setter function is stored in a `useRef` (`setHoverCoordinatesRef`) to avoid adding it as a dependency to the `useCallback` for the throttled handler.
        *   The current route's coordinates are cached in a `useRef` (`routeCoordinatesRef`) and updated via a separate `useEffect`, preventing the throttled handler from depending directly on `currentRoute`.
    5.  **Optimized Distance Calculation:** Uses squared Euclidean distance to avoid `Math.sqrt()`.
*   **Impact:** These changes significantly reduced the computational load of the hover marker, making it much more responsive on desktop.

## Summary & Remaining Concerns

*   The primary causes of the initial crashes (duplicate initialization, component remounting) have been addressed.
*   The map trace hover marker performance has been significantly improved on desktop and disabled on mobile.
*   **Potential Remaining Issues:**
    *   Clustering performance might still need further optimization if UI freezes persist during zooming.
    *   Large data payloads could still cause high memory usage on initial load.

Further testing, especially on target mobile devices, is recommended to confirm stability and performance.
