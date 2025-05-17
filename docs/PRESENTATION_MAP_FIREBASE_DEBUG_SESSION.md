# Debugging Presentation Map Firebase Data Loading (Session Summary)

This document summarizes the debugging session to resolve issues with `PresentationMapView.js` not correctly loading and rendering route data, including multi-segment routes and unpaved surface layers, from Firebase.

## Initial Problem

The `PresentationMapView.js` component was failing to display routes fetched from Firebase. Issues included:
-   Map not zooming to the route.
-   Route lines not rendering.
-   Later, multi-segment routes only showing the first segment.
-   Unpaved surface layers not appearing.

The editor view (`MapView.js`) was working correctly with similar data.

## Debugging Steps and Resolutions

1.  **Understanding the Data Flow:**
    *   Confirmed `PresentationMapView.js` relies on `RoutePresentation.js` to fetch data via `firebasePublicRouteService.getPublicRoute` and populate the `RouteContext`.
    *   `RoutePresentation.js` uses `normalizeRoute` from `src/features/map/utils/routeUtils.js` to process the fetched data.

2.  **GeoJSON Integrity for `PresentationMapView`:**
    *   **Issue:** Initial logs showed `PresentationMapView` receiving `currentRoute` with `hasGeojson: false` or a malformed GeoJSON structure, preventing map operations like `fitBounds`.
    *   **Fix 1 (`normalizeRoute`):** Modified `normalizeRoute` to ensure it always constructs a structurally valid GeoJSON object (e.g., with `type: "FeatureCollection"`, `type: "Feature"`, `geometry: { type: "LineString", coordinates: [] }`), even if source coordinates were initially missing.
    *   **Fix 2 (`RoutePresentation.js`):** Ensured that the `RouteContent` sub-component within `RoutePresentation.js` uses the *normalized* route data (specifically `routes[0]`) when calling `setCurrentLoadedState` in the `RouteContext`. Previously, it might have been using the raw, pre-normalized data for this specific state update. This resolved the primary issue of the first route segment not rendering and the map not zooming.

3.  **Rendering All Route Segments:**
    *   **Issue:** After the initial fix, only the first segment of multi-segment routes was rendering, although logs showed `PresentationMapView` attempting to render all `RouteLayer` components.
    *   **Investigation:** Determined that `firebasePublicRouteService.js` was assigning the GeoJSON of the *first segment* to *all* segments in the `route.routes` array it returned.
    *   **Fix 3 (`firebasePublicRouteService.js`):** Modified `getPublicRoute` to iterate through each route segment (from `user_saved_routes/{id}/data/routes`) and asynchronously fetch its *specific* coordinate data from `user_saved_routes/{id}/routes/{segmentId}/data/coords`. It then constructs a unique GeoJSON object for each segment. This ensured each `RouteLayer` instance received the correct geometry.

4.  **Rendering Unpaved Surface Layers:**
    *   **Issue:** The unpaved surface layer (dashed white line) was not appearing. Logs from `RouteLayer.js` showed `currentRoute.unpavedSections` (and later `route.unpavedSections`) as an empty array.
    *   **Investigation & Schema Discovery:**
        *   A screenshot provided by the user revealed the Firebase structure for unpaved data: `user_saved_routes/{routeId}/routes/{segmentId}/data/unpaved` (Document) -> `data` (field, array of unpaved section objects, each with its own `coordinates` array of `{lat, lng}` objects and `surfaceType`).
        *   The `firebasePublicRouteService.js` was not fetching this nested unpaved data.
        *   `normalizeRoute` was initially looking for `unpavedSections` on the parent route object instead of the per-segment data.
        *   `RouteLayer.js` was initially using `currentRoute.unpavedSections` (from context, which would be the first segment's data) instead of its own `route.unpavedSections` prop.
    *   **Fix 4 (`firebasePublicRouteService.js`):** Updated `getPublicRoute` to fetch the `unpaved` document for each route segment from `user_saved_routes/{firebaseRouteId}/routes/{itemRouteId}/data/unpaved`. It then processes this data (maps coordinates) and attaches it as `unpavedSections` to each `routeItem` in the `route.routes` array.
    *   **Fix 5 (`normalizeRoute`):** Modified `normalizeRoute` to prioritize using `firstRoute.unpavedSections` (the segment's own unpaved data, now populated by Fix 4) over `route.unpavedSections` (the parent's).
    *   **Fix 6 (`RouteLayer.js`):** Changed `RouteLayer.js` to use `route.unpavedSections` (from its own props) for rendering the unpaved layer, ensuring it uses the data specific to its segment. This resolved the unpaved layer rendering.

5.  **Side Issue - MapOverviewLoader 404s:**
    *   **Issue:** Console showed 404 errors from `MapOverviewLoader.jsx`.
    *   **Fix 7 (`PresentationMapOverviewDrawer.jsx`):** Removed the import and usage of `<MapOverviewLoader />` as the functionality was no longer needed.

## Outcome

After these iterative fixes, `PresentationMapView.js` correctly loads and renders multi-segment routes from Firebase, including their individual geometries and unpaved surface layers. The related console errors have been resolved.

---

## Post-Resolution: Climb Marker Consistency (Follow-up)

After the initial fixes, an issue was identified where climb markers were not rendering consistently or were missing in `PresentationMapView.js`.

6.  **Rendering Climb Markers for Each Segment:**
    *   **Issue:** Climb markers were only being processed and rendered for the `currentRoute` (typically the first segment) in `PresentationMapView.js`. If this segment had no climbs, no markers would appear for the entire multi-segment route, even if other segments contained climbs.
    *   **Initial Fix Attempt (`PresentationMapView.js`):** Modified `PresentationMapView.js` to loop through all `routes` (segments) and render a `<ClimbMarkers>` component for each. This successfully rendered markers for all segments.
    *   **Problem with Initial Fix:** This approach led to a new inconsistency. The `PresentationElevationProfilePanel` is designed to show the elevation profile for only the `currentRoute`. Rendering climb markers for *all* segments while the elevation profile showed only one created a mismatch in displayed information.

7.  **Aligning Climb Marker Logic with Elevation Profile:**
    *   **Issue:** The climb markers on the map (from `ClimbMarkers.js`) and the climbs implicitly shown/calculated by the `PresentationElevationProfile.tsx` component were not using the exact same logic for processing elevation data, potentially leading to different climb detections.
    *   **Investigation:**
        *   `PresentationElevationProfile.tsx` calculates the `distance` for each elevation point using the formula: `(i / (pointCount - 1)) * totalDistance`, where `totalDistance` is `route.statistics.totalDistance` (in meters).
        *   `ClimbMarkers.js` was initially using a more complex Haversine-based calculation for cumulative distances.
    *   **Fix 8 (Reverting `PresentationMapView.js` change):** The change to render `ClimbMarkers` for each segment in `PresentationMapView.js` was reverted. Both `ClimbMarkers` and `PresentationElevationProfilePanel` should operate on the `currentRoute` to maintain consistency in what is being displayed and analyzed.
    *   **Fix 9 (`ClimbMarkers.js`):** Modified `ClimbMarkers.js` to adopt the same distance calculation logic as `PresentationElevationProfile.tsx`. Specifically, it now prepares its `elevationProfileData` by calculating `distance` for each point as `(i / (pointCount - 1)) * totalDistance` before passing it to the `detectClimbs` utility. This ensures both components use an identical basis for climb detection.

## Final Outcome for Climb Markers

With these adjustments, `ClimbMarkers.js` now processes the `currentRoute` using the same elevation data preparation and climb detection logic as `PresentationElevationProfile.tsx`. This ensures that the climb markers displayed on the map are consistent with the climbs represented in the elevation profile for the currently focused route segment.
