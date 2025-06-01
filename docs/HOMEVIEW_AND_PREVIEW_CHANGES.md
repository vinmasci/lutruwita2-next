# Summary of Changes to Home View and Route Preview (May 20, 2025)

This document summarizes the iterative changes made to the CyaTrails mobile app's `HomeView` and related components, focusing on initial map display, route preview drawer UI, and data parsing.

## 1. Initial Map Display (`HomeView.swift`)

*   **Default Camera Position:**
    *   The initial default `cameraPosition` in `HomeView` was changed from Tasmania to a zoomed-out view of Australia.
        *   Coordinates: `-25.2744` (lat), `133.7751` (lon)
        *   Zoom level: Adjusted from `6.0` (Tasmania) to `4.0` and then to `3.0` for a wider view of Australia.
    *   The `.onAppear` logic was updated to reflect this new default for Australia if no specific country filter (like New Zealand) was active.
*   **User Location Prioritization:**
    *   Imported `CoreLocation`.
    *   Added a `LocationManager` class (`ObservableObject`) to handle location permissions and updates.
    *   In `HomeView.onAppear`:
        *   Location permission is requested via `locationManager.requestLocationPermission()`.
        *   If permission is granted and location is available, `cameraPosition` is set to the user's current location with a zoom level of `14.0`.
        *   If location is unavailable or permission denied, it falls back to the Australia-wide view (or New Zealand if that filter is active).
    *   **Note:** This requires `NSLocationWhenInUseUsageDescription` to be set in the app's `Info.plist`.
*   **Map Auto-Zooming:**
    *   The call to `adjustCameraToFitCoordinates` in `MapViewRepresentable.updateUIView` was temporarily commented out to prevent the map from immediately zooming into loaded route markers, thus preserving the initial user location or Australia-wide view.

## 2. Route Preview Drawer UI (`RoutePreviewDrawer.swift` & `HomeView.swift`)

This involved several iterations to fix the "View Details" button overlapping the bottom tab bar icons and to reduce excessive whitespace.

*   **Initial Attempts (Padding & Overlay Structure):**
    *   Increased bottom padding within `RoutePreviewDrawer.swift`'s content `VStack`.
    *   Modified how `RoutePreviewDrawer` was presented in `HomeView.swift`'s `.overlay` modifier, trying different container `VStack` and `ZStack` configurations.
    *   Attempted to use `@Environment(\.safeAreaInsets)` in `RoutePreviewDrawer.swift` to adjust padding dynamically, which led to compiler errors and was reverted.
*   **Height Adjustment:**
    *   The `drawerHeight` in `RoutePreviewDrawer.swift` (defined as a percentage of screen height) was increased from `0.25` (25%) to `0.35` (35%) to provide more vertical space.
*   **Whitespace Reduction:**
    *   A `Spacer()` within the main content `VStack` of `RoutePreviewDrawer.swift` (between the stats row and the "View Details" button) was removed. This was causing the excessive whitespace when combined with large bottom padding.
*   **Final Layout Approach (Emulating `ElevationDrawerView`):**
    *   **`RoutePreviewDrawer.swift`:**
        *   The `VStack` forming the drawer panel (the white box) had `.edgesIgnoringSafeArea(.bottom)` applied, allowing its background to extend to the screen edge.
        *   Internal content padding (e.g., `.padding(.bottom, 20)`) is used to keep elements visible above the very bottom.
    *   **`HomeView.swift`:**
        *   The `RoutePreviewDrawer` is presented in an `.overlay` using a `Group { VStack { Spacer(); RoutePreviewDrawer(...) } }`. The outer `VStack` respects safe areas, positioning the drawer above the tab bar, while the `Spacer()` pushes it to the bottom of this safe area-respecting container.

## 3. Data Display in Route Preview Drawer

*   **Location String (`RoutePreviewDrawer.swift`):**
    *   A computed property `locationDisplayString` was added to format the location more robustly:
        *   Shows "State, Country" if both are available.
        *   Falls back to "Country" if state is missing.
        *   Falls back to "State" if country is missing.
        *   Defaults to "Unknown Location" if neither is available.
*   **Firebase Data Parsing (`FirebaseService.swift` - `listRoutes` method):**
    *   The parsing of `RouteMetadata` for `RouteListItem` was updated to align with the user-provided Firebase structure for master route documents:
        *   `country`: Determined by checking `statistics.countries` array (prioritizing "New Zealand" if present, then the first country in the array).
        *   `state`: Taken from the first element of `statistics.states` array.
        *   `lga`: Taken from the first element of `statistics.lgas` array.
        *   `isLoop`: Read from `statistics.isLoop`.
        *   `type`: Read from top-level `routeType` field.
        *   `isPublic`, `createdAt`, `updatedAt`: Read from top-level fields.
    *   The parsing of `RouteStatistics` was updated to:
        *   Attempt to read `elevationGain`, `elevationLoss`, `maxElevation`, `minElevation` from the `statistics` map in Firebase, defaulting to `0`.
        *   Prioritize `statistics.elevationGain` but fall back to `statistics.totalAscent` for `elevationGain`.
*   **Distance Calculation (`RouteModels.swift` - `RouteStatistics.formattedDistance`):**
    *   Initially, the code assumed `totalDistance` from Firebase was in meters and divided by `1000.0` to get kilometers.
    *   **Correction:** Based on user feedback and data (`totalDistance: 632.3` for a ~632km route), the `/ 1000.0` division was **removed**. The code now assumes the `totalDistance` field from Firebase is already in kilometers.
*   **Route Type Parsing for `RouteListItem` (`FirebaseService.swift` - `listRoutes` method):**
    *   Corrected the parsing for `RouteListItem.type` to use the top-level `routeType` field from the Firebase document (e.g., "Bikepacking") instead of defaulting or using an incorrect field. This ensures the correct route type is displayed in logs and potentially used in UI elements.

## 4. Filter Controls UI (`HomeView.swift`)

*   The top padding for the `VStack` containing the filter pills was increased from `10` to `50` to prevent them from being obscured by the device's status bar/notch area.
*   **Country Filter Removal:** The UI for the country filter (Australia, New Zealand) was removed from `HomeView`. The `selectedCountry` property in `RouteListViewModel` and related logic in `FirebaseService` for country filtering were also implicitly made redundant for this view but might still exist for other filter views.
*   **Distance Filter Addition:**
    *   A new distance filter UI was added to `HomeView`, allowing users to select from predefined ranges: "All Distances", "0-50km", "50-100km", "100-200km", "200-500km", "500km +".
    *   `RouteListViewModel.swift` was updated with a new `@Published var selectedDistanceFilter: String?` property to store the selected range string.
    *   `FirebaseService.swift`'s `listRoutes` method was updated to accept this `distanceFilter` string and apply corresponding `isGreaterThanOrEqualTo` and `isLessThanOrEqualTo` (or just `isGreaterThan`) conditions to the `statistics.totalDistance` field in Firestore queries.
    *   Other filter field names in `FirebaseService.swift` (`listRoutes`) were also corrected to match the Firebase schema (e.g., querying `routeType` for type filters, and fields under `statistics` for country, state, and loop filters).

## Remaining Data-Dependent Issues:

*   **Distance Accuracy:** The accuracy of the displayed distance for routes like "NZ Sth Island Trail Mix" is entirely dependent on the `statistics.totalDistance` value in its Firebase master document being the correct numerical value in kilometers.
*   **Location Accuracy:** Similarly, the displayed location depends on the `statistics.countries` and `statistics.states` arrays in the Firebase master document being correct.

## 5. Unpaved Sections Rendering on Home Map (Ongoing Issue - May 20, 2025)

*   **Problem**: Unpaved sections are not rendering on the HomeView map, even though the data is present and the same utility function (`RouteStyleUtils.addUnpavedSectionsOnly`) works on the Route Detail page.
*   **Symptoms**: Console logs indicate that the drawing logic for unpaved sections is reached, but the layers are not appearing. The log `Unpaved drawn for: 0 routes.` persists.
*   **Attempts**:
    *   Ensured `RouteStyleUtils.addUnpavedSectionsOnly` is called with flattened coordinates for the entire route.
    *   Implemented cleanup logic in `HomeView`'s `MapViewRepresentable` to remove and track unpaved layers using assumed and then corrected layer/source IDs.
    *   Ensured style modifications happen only after the map style is loaded.
*   **Current Suspicion**: The asynchronous nature of layer addition within `RouteStyleUtils.addUnpavedSectionsOnly` (due to `DispatchQueue.main.asyncAfter`) might be interacting poorly with the `updateUIView` lifecycle, or there are silent failures within the utility function when called from `HomeView`.
*   **Console Log Snippet (Illustrative of the issue when "NZ Sth Island Trail Mix" is tapped and loaded):**
    ```
    📍 Location updated: -37.90408865136442, 145.00205365458768
    👆 Tapped route (via distance check): NPm5zoKKnHCqE8NKHfbt
    📱 Received notification for tapped route: NPm5zoKKnHCqE8NKHfbt
    🔄 Loading full route coordinates for route: NPm5zoKKnHCqE8NKHfbt
    ✅ Found 6 route segments
    🔍 Processing segment with routeId: route-6f97a766-e638-47f7-b913-6ca77deb2e42
    ✅ Found 3441 coordinates for segment route-6f97a766-e638-47f7-b913-6ca77deb2e42
    🔍 Processing segment with routeId: route-543b25f1-bf44-4750-aedb-f6630e03d524
    ✅ Found 6751 coordinates for segment route-543b25f1-bf44-4750-aedb-f6630e03d524
    🔍 Processing segment with routeId: route-e1546a8b-0cac-42d9-a80e-a749469632aa
    ✅ Found 4941 coordinates for segment route-e1546a8b-0cac-42d9-a80e-a749469632aa
    🔍 Processing segment with routeId: route-55cad4b5-06b4-4705-94de-fcfdc183b87f
    ✅ Found 5718 coordinates for segment route-55cad4b5-06b4-4705-94de-fcfdc183b87f
    🔍 Processing segment with routeId: route-21868db9-8c4e-4584-87fc-61ec2d78f548
    ✅ Found 6746 coordinates for segment route-21868db9-8c4e-4584-87fc-61ec2d78f548
    🔍 Processing segment with routeId: route-683dd1ae-983b-4930-af5b-478c1b191756
    ✅ Found 5546 coordinates for segment route-683dd1ae-983b-4930-af5b-478c1b191756
    ✅ Loaded 6 coordinate segments for route NPm5zoKKnHCqE8NKHfbt
    ✅ Updated route NPm5zoKKnHCqE8NKHfbt with 6 coordinate segments
    🔄 viewModel.routes changed, updating displayedRouteMarkers with 1 routes
    🗺️ Getting route markers for map display
    🔍 Route: NPm5zoKKnHCqE8NKHfbt, name: NZ Sth Island Trail Mix
    🔍 startCoordinate: Optional(CyaTrails.Coordinates(lng: 170.174423, lat: -43.858329))
    🔍 routeCoordinates count: 6
    🔍 startCoordinate values: lat=-43.858329, lng=170.174423
    🔍 clCoordinate values: lat=-43.858329, lng=170.174423
    🗺️ Created 1 markers from 1 routes for HomeView map
    🗺️ Updated HomeView map with 6 styled routes. Unpaved drawn for: 0 routes.
    ```

## 6. Custom Route Start Markers (Resolved - May 20, 2025)

*   **Goal**: Change the route start markers on the `HomeView` map from the default colored circles to custom black circles with a white stroke and a white "⚑" (flag) icon inside.
*   **Initial Attempts (SymbolAnnotation & SwiftUI Rendering - Problematic)**:
    *   `SymbolAnnotation` approach was abandoned due to API/SDK compatibility issues.
    *   Rendering a SwiftUI view (`FlagMarkerView.swift`) to a `UIImage` using `ViewRenderUtils.renderSwiftUIViewToImage` for `PointAnnotation`s initially failed to render markers and later led to "AttributeGraph: cycle detected" errors in the console, indicating SwiftUI update/layout issues.
    *   Attempts to stabilize SwiftUI rendering included:
        *   Refining `renderSwiftUIViewToImage` to ensure proper view hierarchy setup and layout passes.
        *   Deferring `PointAnnotationManager.annotations` updates in `HomeView.swift` using `DispatchQueue.main.async`.
*   **Final Approach (Core Graphics Rendering - Successful)**:
    *   Inspired by the stable Core Graphics implementation for distance markers (`DISTANCE_MARKERS_IMPLEMENTATION.md`), the flag marker image generation was switched to direct Core Graphics drawing.
    *   A new function `createFlagMarkerImageCG(size: CGSize)` was added to `ViewRenderUtils.swift`. This function programmatically draws the black circle, white stroke, and white "⚑" icon.
    *   `HomeView.swift`'s `MapViewRepresentable` was updated to call `createFlagMarkerImageCG` instead of `renderSwiftUIViewToImage` for generating the `PointAnnotation` images.
    *   This resolved the rendering issues and "AttributeGraph" errors.
*   **Visual and Behavioral Refinements**:
    *   **Icon Size:** The font size of the "⚑" icon within `createFlagMarkerImageCG` was increased from 12pt to 16pt for better visibility.
    *   **Marker Persistence:** To ensure the flag marker remains visible when its associated route is tapped and the route polyline is drawn, the explicit clearing of `routeStartEndPointAnnotationManager.annotations = []` in `HomeView.swift`'s `updateUIView` was removed. The manager now updates by diffing the new annotation set.

## 7. Home View UI and Map Controls (May 20, 2025)

*   **Map Ornaments Removed (`HomeView.swift` - `MapViewRepresentable`):**
    *   The Mapbox map's default scale bar (`mapView.ornaments.options.scaleBar.visibility = .hidden`) and compass (`mapView.ornaments.options.compass.visibility = .hidden`) were hidden to simplify the map interface.
*   **Country Filter Removed (`HomeView.swift`):**
    *   The UI for filtering routes by country (e.g., "Australia", "New Zealand") was removed from the `HomeView`.
    *   The corresponding `@State private var selectedCountry: String?` in `HomeView` was removed.
    *   The default camera position logic in `HomeView.onAppear` was simplified to fall back to Australia if user location is unavailable, as the New Zealand-specific camera adjustment tied to the country filter is no longer relevant.
*   **Distance Filter Added (`HomeView.swift`, `RouteListViewModel.swift`, `FirebaseService.swift`):**
    *   **UI (`HomeView.swift`):** A new horizontal `ScrollView` with `FilterPillButton`s was added for distance filtering. Options include: "All Distances", "0-50km", "50-100km", "100-200km", "200-500km", "500km +".
    *   **ViewModel (`RouteListViewModel.swift`):**
        *   A new `@Published var selectedDistanceFilter: String?` property was added to store the string representation of the selected distance range (e.g., "0-50", "500+").
        *   The `loadRoutes()` method was updated to include this `selectedDistanceFilter` in the `filters` dictionary passed to `FirebaseService`.
        *   An observer was added to `selectedDistanceFilter` to automatically call `loadRoutes()` upon change.
    *   **Service (`FirebaseService.swift` - `listRoutes` method):**
        *   The method now checks for the `distanceFilter` key in the `filters` dictionary.
        *   Based on the string value (e.g., "0-50", "50-100", "500+"), it constructs appropriate Firestore query conditions using `whereField("statistics.totalDistance", isGreaterThanOrEqualTo: minValue)` and/or `whereField("statistics.totalDistance", isLessThanOrEqualTo: maxValue)`.
        *   The `type` filter was corrected to query the `routeType` field.
        *   Filters for `country`, `state`, and `isLoop` were updated to query their respective fields under the `statistics` map (e.g., `statistics.countries`, `statistics.isLoop`).
    *   **Note on Firestore Indexing:** The combination of range filters on `statistics.totalDistance` and ordering by `updatedAt` may require a composite index in Firestore for optimal performance and correctness.
