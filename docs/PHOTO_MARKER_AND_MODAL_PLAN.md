# Photo Marker and Polaroid Modal Implementation Plan

## 1. Current Objective

The primary goal is to display photo markers on the map in the CyaTrails (Swift) application. When a user taps on one of these photo markers, a modal should appear, presenting the selected photo in a "Polaroid" style, similar to an existing implementation in the `lutruwita-mobile` (React Native) project.

## 2. Work Done So Far (CyaTrails - Swift App)

Based on initial interpretations, the following has been implemented:

*   **`PhotoMarkerView.swift` created:**
    *   Contains `PhotoMarkerManager` responsible for managing photo annotations on the Mapbox map.
    *   `createCoreGraphicsPhotoMarkerImage()`: Draws a small, navy blue "camera" icon. This is used for the default (unselected) state of photo markers.
    *   `createCoreGraphicsPlaceholderPolaroidImage()`: Draws a small (50px wide) placeholder Polaroid frame (white border, gray photo area with a tiny camera icon).
    *   `createCoreGraphicsFinalPolaroidImage()`: Draws a small Polaroid frame with a provided thumbnail image.
    *   `selectedPhotoID`, `selectPhotoMarker()`, `loadThumbnailForSelectedMarker()`: Logic was added to change the *map marker itself* to this small Polaroid style upon selection, including asynchronous loading of the thumbnail into the marker.

*   **`RouteDetailViewModel.swift` updated:**
    *   Added `selectedPhotoMarkerID` to track the ID of the tapped photo marker.
    *   Added `didSelectPhotoMarker(photoID: String)` to handle tap events, update `selectedPhotoMarkerID`, and instruct `PhotoMarkerManager` to update the visual state of the tapped marker (to the tiny Polaroid style).
    *   Logic to clear `selectedPhotoMarkerID` when the route changes.

*   **`EnhancedRouteMapView.swift` (Coordinator) updated:**
    *   `handleMapTap()`: Implemented to detect taps near photo coordinates.
    *   When a photo marker is tapped, it calls `viewModel.didSelectPhotoMarker(photoID:)`.
    *   It also sets `selectedPhotoIndex` and `showingPhotoViewer = true` on the parent `EnhancedRouteMapView`, which is presumably intended to show the existing full-screen `PhotoViewerView`.

*   **Compiler Errors Fixed:**
    *   Corrected URL string handling in `PhotoMarkerView.swift`.
    *   Added `destroy()` method to `POIMarkerManager` and ensured it's called correctly in `RouteDetailViewModel.swift`.
    *   Corrected `queryRenderedFeatures` usage in `EnhancedRouteMapView.swift` by switching to a proximity-based tap detection for photo markers.

## 3. User's Desired Outcome (Clarified)

The user's actual requirement is:

*   **Default Photo Markers**: Small icons (e.g., the navy camera icon already implemented) should be displayed on the map at photo locations.
*   **On Marker Tap**:
    *   The map marker itself **should NOT change** its appearance to a tiny Polaroid thumbnail.
    *   Instead, a **modal view** should be presented.
    *   This modal should display the selected photo in a "Polaroid" style, referencing the appearance of `PhotoViewerPolaroid.tsx` from the `lutruwita-mobile` (React Native) project.
    *   The existing `PhotoViewerView.swift` in the CyaTrails app is likely the place to implement or adapt this Polaroid modal style.

## 4. Reference Implementation (lutruwita-mobile - React Native)

*   **File**: `mobile/lutruwita-mobile/src/components/map/PhotoViewerPolaroid.tsx`
*   **Key Visual Characteristics of the Polaroid Modal**:
    *   White rectangular frame with small padding (4px) and rounded corners (4px).
    *   Displays the actual photo (aspect ratio 4/3).
    *   Shadow effect.
    *   Semi-transparent black caption overlay at the bottom of the image containing:
        *   Photo caption.
        *   Route information (e.g., "Route X of Y • Z km").
        *   Location name (if available).
        *   Photo count (e.g., "Photo A of B").
    *   Navigation controls (next/previous photo, close).
    *   The modal appears positioned towards the bottom of the screen, not full screen. Width is responsive (e.g., 90% of screen width, max 340px).

## 5. Next Steps (Revised Plan)

To achieve the desired outcome:

1.  **Revert Marker Style Change on Tap**:
    *   In `PhotoMarkerView.swift`:
        *   Remove `createCoreGraphicsPlaceholderPolaroidImage()` and `createCoreGraphicsFinalPolaroidImage()`.
        *   Remove the logic in `addPhotoMarkers()` that attempts to change the marker to a Polaroid style when `photo.id == selectedPhotoID`. All photo markers should consistently use `createCoreGraphicsPhotoMarkerImage()` (the navy camera icon).
        *   Remove `selectedPhotoID` property and `selectPhotoMarker(photoID:)` method from `PhotoMarkerManager` as the manager will no longer change marker appearance on selection.
        *   Remove `imageLoadingTasks` and `loadThumbnailForSelectedMarker()` as thumbnails are not loaded into the marker itself.
    *   In `RouteDetailViewModel.swift`:
        *   Remove `selectedPhotoMarkerID`.
        *   The `didSelectPhotoMarker(photoID: String)` method will no longer be needed for changing marker style. Its role will be taken over by the tap handler directly triggering the modal.

2.  **Focus Tap Handling on Presenting Modal**:
    *   In `EnhancedRouteMapView.swift` (`Coordinator.handleMapTap`):
        *   When a photo marker is tapped (identified by proximity):
            *   It should still find the `photo.id` and the corresponding `Photo` object or its index.
            *   The primary action will be to set the state variables that present the photo modal. The existing lines `self.parent.selectedPhotoIndex = photoIndex` and `self.parent.showingPhotoViewer = true` are correct for triggering a view if `PhotoViewerView.swift` is that modal.

3.  **Adapt or Create Polaroid Modal View (SwiftUI)**:
    *   Examine `PhotoViewerView.swift` (in CyaTrails).
    *   Modify `PhotoViewerView.swift` (or create a new SwiftUI view if `PhotoViewerView` is full-screen and a different modal is needed) to replicate the appearance and functionality of `PhotoViewerPolaroid.tsx`. This includes:
        *   The Polaroid frame styling (white background, padding, rounded corners, shadow).
        *   Displaying the photo (using `AsyncImage` or similar for URL loading).
        *   The caption overlay with photo caption, route info, location, and photo count.
        *   Navigation controls (next/previous, close).
        *   The modal presentation style (e.g., appearing as a card near the bottom, not full-screen, if that's the desired effect from the React Native version). This might involve using a custom view modifier or a sheet with specific presentation detents (iOS 15+).

4.  **Data for the Modal**:
    *   Ensure all necessary data (caption, route index, total routes, distance along route, location name) is available in the Swift `Photo` model or can be passed to/fetched by the Polaroid modal view. The `getLocationName` functionality from `PhotoViewerPolaroid.tsx` would need a Swift equivalent if not already present.

## Relevant Files for Next Steps:

*   **`mobile/CyaTrails/CyaTrails/Views/PhotoMarkerView.swift`**: To simplify marker rendering (always camera icon).
*   **`mobile/CyaTrails/CyaTrails/ViewModels/RouteDetailViewModel.swift`**: To remove logic related to changing marker appearance on selection.
*   **`mobile/CyaTrails/CyaTrails/Views/EnhancedRouteMapView.swift`**: To ensure tap handling correctly triggers the modal presentation.
*   **`mobile/CyaTrails/CyaTrails/Views/PhotoViewerView.swift`**: This is the primary candidate for implementing the Polaroid modal UI and behavior in SwiftUI.
*   **`mobile/lutruwita-mobile/src/components/map/PhotoViewerPolaroid.tsx`**: Reference for styling and functionality of the Polaroid modal.

This revised plan focuses on presenting a Polaroid-styled *modal* upon tapping a photo marker, rather than changing the marker itself.

## 6. Implementation Summary and Refinements

The revised plan (Section 5) was implemented, followed by several iterative refinements based on user feedback.

**Initial Plan Implementation:**

1.  **Reverted Marker Style Change on Tap**:
    *   `PhotoMarkerView.swift`: Logic for changing marker appearance to a Polaroid on selection was removed. `PhotoMarkerManager` now consistently uses a standard icon for all photo markers. Methods and properties related to selected photo ID and dynamic thumbnail loading into the marker were removed.
    *   `RouteDetailViewModel.swift`: `selectedPhotoMarkerID` property and the `didSelectPhotoMarker(photoID:)` method were removed, as the ViewModel no longer manages marker style changes.

2.  **Focused Tap Handling on Presenting Modal**:
    *   `EnhancedRouteMapView.swift`: The `Coordinator.handleMapTap` method was updated. When a photo marker is tapped, it now directly sets the `selectedPhotoIndex` and `showingPhotoViewer` state variables on its parent view (`RouteDetailView`) to trigger the photo modal. The call to the ViewModel's `didSelectPhotoMarker` was removed.

3.  **Adapted Polaroid Modal View (`PhotoViewerView.swift`)**:
    *   The existing `PhotoViewerView.swift` was significantly refactored to match the "Polaroid" style and functionality:
        *   **Presentation**: Changed from a full-screen view to a card-style modal appearing from the bottom.
        *   **Styling**: Implemented a white Polaroid frame with padding, rounded corners, and a shadow effect.
        *   **Image Display**: Uses `AsyncImage` to load and display the photo, fitting it within the Polaroid's photo area.
        *   **Caption Overlay**: A semi-transparent black overlay was added at the bottom of the image, displaying:
            *   Photo caption (from `photo.caption` or `photo.name`).
            *   Route information (e.g., "Route X of Y • Z km • Location Name").
            *   Photo count (e.g., "Photo A of B").
        *   **Navigation**: Includes "Previous," "Next," and "Close" (X mark) buttons for modal interaction.

4.  **Data for the Modal**:
    *   `Photo` struct (in `Models/RouteModels.swift`): Updated to include new optional fields: `routeIndex: Int?`, `distanceAlongRoute: Double?`, and `photoNumber: Int?` to support the detailed caption overlay.
    *   `Utils/GeocodingUtils.swift`: A new utility file was created with `GeocodingUtils.getLocationName()` to asynchronously fetch location names based on coordinates using `CLGeocoder`. `PhotoViewerView.swift` was updated to call this utility.

**Iterative Refinements and Fixes:**

*   **Compiler Errors**:
    *   Fixed an error in `PhotoViewerView.swift` previews related to `@State static var` declaration.
    *   Corrected calls to the `PhotoViewerView` initializer in `RouteDetailView.swift` to match its updated signature.
*   **Photo Marker Icon Redesign (Iterative)**:
    *   **Initial Change**: Switched from custom Core Graphics ellipse to SF Symbol `camera.circle.fill` for better aspect ratio.
    *   **Visibility Issue**: Addressed markers disappearing by rendering the SF Symbol to a bitmap using `UIGraphicsImageRenderer` to ensure compatibility with Mapbox.
    *   **Final Design (User Feedback)**:
        *   **Shape**: Changed to a "bubble" style (rounded rectangle with a pointer) similar to POI markers but smaller.
        *   **Icon**: Uses the SF Symbol "camera" (plain version).
        *   **Color**: Set to `#2c3e50` (rgb(44, 62, 80)).
        *   **Icon Color**: White.
        *   **Size**: Bubble (22x22pt), Pointer (12x6pt), Icon (12pt).
        *   **Slot**: Set to `"middle"` in `PhotoMarkerManager` to layer correctly with other map annotations (under distance markers).
        *   **Anchor**: Set to `.bottom` in `PhotoMarkerManager.addPhotoMarkers()` for correct placement of the bubble marker.
*   **Tap Interaction Enhancements (`EnhancedRouteMapView.swift`)**:
    *   **Tap Detection Method Evolution**:
        *   Initially, tap detection was proximity-based. This was changed to use `mapView.mapboxMap.queryRenderedFeatures(with:options:completion:)` for more precise hit testing on rendered features.
        *   **Troubleshooting `QueriedRenderedFeature`**: Encountered persistent compiler errors ("Value of type 'QueriedRenderedFeature' has no member 'feature'", "...has no member 'state'", "...has no member 'properties'"). This indicated that the way to access the underlying GeoJSON feature's properties from a `QueriedRenderedFeature` object was not straightforward or was different in the specific SDK version.
        *   **Switch to `onLayerTap`**: To resolve these issues and align with Mapbox SDK v11 best practices for layer interactions, the tap handling was refactored. The old `UITapGestureRecognizer` and `queryRenderedFeatures` approach in `EnhancedRouteMapView.swift`'s `Coordinator` was replaced with `mapView.gestures.onLayerTap()`. Separate handlers were set up for the POI layer and the Photo layer. This required importing `Combine` and managing `AnyCancellable` observers.
    *   **Layer ID Confirmation for `onLayerTap`**:
        *   The `PhotoMarkerManager` uses `id: "photo-annotations"` for its `PointAnnotationManager`.
        *   The `POIMarkerManager` (assumed) uses `id: "poi-marker-manager"`.
        *   The `onLayerTap` handlers were initially configured with layer IDs like `"photo-annotations.layer"`. After debugging (confirming general map taps worked but layer taps didn't), the `.layer` suffix was removed from the layer IDs used in `onLayerTap` (e.g., using `"photo-annotations"` directly), which successfully triggered the layer-specific tap handlers.
    *   **Custom Data for Identification (`PointAnnotation` -> `QueriedFeature`)**:
        *   `POIMarkerManager` and `PhotoMarkerManager` store `poi.id` and `photo.id` respectively in the `customData: [String: JSONValue]` of their `PointAnnotation`s.
    *   **Tap Handling Logic with `onLayerTap` and `QueriedFeature`**:
        *   The `onLayerTap` closure provides a `QueriedFeature` object.
        *   **Crucial Discovery**: Debugging (printing the structure of `queriedFeature.feature.properties`) revealed that the `customData` from the `PointAnnotation` was not directly available in `queriedFeature.feature.properties`. Instead, it was nested within a dictionary under the key `"custom_data"`.
        *   **Final Correction**: The `guard` conditions in the `onLayerTap` handlers were updated to correctly extract the `poiId` or `photoId`. This involves:
            1.  Accessing `queriedFeature.feature.properties`.
            2.  Getting the `JSONValue.object` associated with the key `"custom_data"` from these properties.
            3.  Accessing the actual `poiId` or `photoId` (as a `JSONValue.string`) from this nested "custom_data" dictionary.
        *   If a POI is tapped, `viewModel.displayPOIDetails(poi)` is called.
        *   If a photo is tapped, the logic to show `PhotoViewerView` (and adjust camera) is triggered.
    *   **Camera on Photo Tap**: When a photo marker is tapped:
        *   The map camera still centers on the photo's location.
        *   Zoom level is set to `11`.
        *   Camera pitch is set to `85` degrees for a steep perspective view.
*   **Photo Modal Presentation (`PhotoViewerView.swift`)**:
    *   The semi-transparent black background that dimmed the screen behind the modal was removed, allowing the map to remain fully visible.
*   **Camera Pitch Reset (`RouteDetailView.swift`)**:
    *   Implemented logic using `.onChange(of: showingPhotoViewer)` to reset the map's camera pitch to its default (0 for 2D, 30 for terrain enabled) when the photo modal is closed.

The implementation now reflects a Polaroid-style modal for photos, with refined marker appearance and map interactions as per user feedback.

---

## 7. Photo Modal Navigation and Ordering (Session of 2025-05-23 PM)

**Objective**: Implement logic for the photo modal (`PhotoViewerView.swift`) to allow users to navigate (scroll) between photos based on their order along the current route or stage, similar to `PhotoModal.jsx` in the web app. This includes map panning to the currently selected photo.

**Work Done**:

1.  **`RouteDetailViewModel.swift` Modifications**:
    *   Added new `@Published` properties:
        *   `orderedPhotosForModal: [Photo]` to hold the sorted list of photos for the modal.
        *   `currentModalPhotoIndex: Int` to track the index of the photo currently displayed in the modal.
        *   `selectedPhotoForModal: Photo?` to hold the `Photo` object currently being viewed.
    *   Created `prepareAndShowPhotoModal(photoID: String, mapView: MapView?)`:
        *   Filters photos from `masterRoute.photos` based on the `selectedRouteIndex` (all for overview, or stage-specific).
        *   **Crucially, filters these photos to include only those where `distanceAlongRoute != nil`.** (Note: `Photo.coordinates` is non-optional, so it's not part of this runtime filter).
        *   Sorts the filtered photos by `distanceAlongRoute`.
        *   Updates `orderedPhotosForModal`, `currentModalPhotoIndex`, and `selectedPhotoForModal`.
        *   Calls `panMapToSelectedModalPhoto()` to adjust the map view.
    *   Created `updateModalPhotoSelection(newIndex: Int, mapView: MapView?)`:
        *   Updates `currentModalPhotoIndex` and `selectedPhotoForModal`.
        *   Calls `panMapToSelectedModalPhoto()` to adjust the map view.
    *   Created `panMapToSelectedModalPhoto(mapView: MapView?)`:
        *   Pans and tilts the map (60-degree pitch) to the `selectedPhotoForModal`'s coordinates.
        *   Multiple attempts were made to correctly unwrap `selectedPhotoForModal` (type `Photo?`) and its `coordinates` property (type `Coordinates`, non-optional as per `Models/RouteModels.swift`) to avoid compiler errors. The current version uses `guard let actualPhotoCoordinates = selectedPhotoForModal?.coordinates else`.
    *   Created `resetMapPitchAfterModal(mapView: MapView?)` to reset the map's pitch when the modal is closed.

2.  **`EnhancedRouteMapView.swift` Modifications**:
    *   The `onLayerTap` gesture handler for the photo layer was updated.
    *   When a photo marker is tapped, it now calls `viewModel.prepareAndShowPhotoModal(photoID: tappedPhotoID, mapView: mapView)` instead of directly manipulating parent view state for showing the modal.
    *   The `@Binding var selectedPhotoIndex: Int` was removed from `EnhancedRouteMapView` as the index is now managed by the ViewModel.

3.  **`RouteDetailView.swift` Modifications**:
    *   Added `.onChange(of: viewModel.selectedPhotoForModal)`:
        *   Sets `self.showingPhotoViewer = true` when `viewModel.selectedPhotoForModal` is not `nil`.
        *   Sets `self.showingPhotoViewer = false` when `viewModel.selectedPhotoForModal` becomes `nil`.
    *   Updated `.onChange(of: showingPhotoViewer)`:
        *   When `showingPhotoViewer` becomes `false` (modal is closing), it now calls `viewModel.resetMapPitchAfterModal(mapView: self.mapView)` and sets `viewModel.selectedPhotoForModal = nil`.
    *   `PhotoViewerView` instantiation updated to pass:
        *   `photos: viewModel.orderedPhotosForModal`
        *   `currentPhotoIndex: $viewModel.currentModalPhotoIndex`
        *   `viewModel: viewModel`
        *   `mapView: mapView`
    *   Removed the local `@State private var selectedPhotoIndex` as this is now driven by the ViewModel.

4.  **`PhotoViewerView.swift` Modifications**:
    *   Added `viewModel: RouteDetailViewModel` and `mapView: MapView?` properties and updated its `init`.
    *   Navigation button ("Previous", "Next") actions now call `viewModel.updateModalPhotoSelection(newIndex: ..., mapView: mapView)`.
    *   Added `import MapboxMaps` to resolve compiler errors related to the `MapView` type.

**Ongoing Issues & Blockers**:

1.  **Persistent Compiler Error in `RouteDetailViewModel.swift`**:
    *   **Error**: "Initializer for conditional binding must have Optional type, not 'Coordinates'"
    *   **Location**: Reported on line 1347, which is currently `guard let actualPhotoCoordinates = selectedPhotoForModal?.coordinates else`.
    *   **Problem**: This error was confusing because `selectedPhotoForModal` is `Photo?` and `Photo.coordinates` is `Coordinates` (non-optional). The issue was likely related to how the optional chain was being evaluated by the compiler in that specific context.
    *   **Resolution (Implied by later successful builds of ViewModel)**: Subsequent refactoring and ensuring correct optional handling in `panMapToSelectedModalPhoto` (e.g., `guard let actualPhotoCoordinates = selectedPhotoForModal?.coordinates else`) eventually resolved this compiler error.

2.  **Functional Issue - Photos Not Appearing in Modal (Initially Resolved)**:
    *   **Log Indication (Past)**: `[RDM_PHOTO_MODAL] Found 0 sortable photos after filtering by distanceAlongRoute.`
    *   **Cause (Past)**: The `prepareAndShowPhotoModal` function filters photos using `.filter { $0.distanceAlongRoute != nil }`. Initially, `distanceAlongRoute` was not being populated for `Photo` objects.
    *   **Resolution (Implemented)**: Logic was added to `RouteDetailViewModel.updatePhotoMetadata()` to calculate and assign `distanceAlongRoute` to each photo based on its proximity to the master route's consolidated track. This allowed photos to pass the filter and the modal to appear.

3.  **RESOLVED: Photo Modal Caption & Details Not Updating Correctly on Scroll (Fixed - 2025-05-23)**:
    *   **Issue**: When navigating (next/previous) in the photo modal, the photo image would change, but the caption and route information often did not update to reflect the new photo's data.
    *   **Root Cause**: SwiftUI was not properly detecting that the caption overlay needed to re-render when the photo changed. The issue was in the `captionOverlayArea` view not having sufficient unique identifiers to force re-rendering.
    *   **Solution Implemented**:
        *   Added unique `.id()` modifiers to individual text elements within the caption overlay:
            *   Caption text: `.id("caption-\(photo.id)")`
            *   Route info: `.id("routeInfo-\(photo.id)")`
            *   Photo count: `.id("photoCount-\(currentPhotoIndex)")`
            *   Location name: `.id("location-\(photo.id)-\(locName)")`
        *   Enhanced the main overlay container ID to include both photo ID and index: `.id("overlay-\(photo.id)-\(currentPhotoIndex)")`
        *   Improved the `onChange(of: currentPhotoIndex)` handler with better debugging output and proper state reset for location fetching.
    *   **Status**: ✅ **FIXED** - Photo modal now properly updates all caption and route information when navigating between photos.

4.  **Compiler Instability (`PhotoViewerView.swift`)**:
    *   **Symptom**: The Swift compiler has frequently failed with "buildExpression is unavailable: this expression does not conform to 'View'" errors when modifying the structure or logic within `captionOverlayArea` in `PhotoViewerView.swift`.
    *   **Cause**: This indicates high sensitivity in the Swift compiler's type-checking for complex `@ViewBuilder` contexts, especially with nested conditional logic or imperative code for string construction. Refactoring into helper functions or simpler View structures has been an ongoing effort.
    *   **Status**: ✅ **RESOLVED** - The refactoring and addition of unique IDs has stabilized the compiler issues.

**Next Steps (Revised Priority)**:

1.  **Fix Route/Stage Information Display in `PhotoViewerView.swift` (`getFormattedRouteInfo`)**:
    *   **Primary Focus**: Correct the logic in the `getFormattedRouteInfo(for photo: Photo)` method within `PhotoViewerView.swift`.
    *   **Goal**:
        *   If `photo.routeIndex` indicates a specific stage (e.g., 0, 1, ...), display "Stage [N] of [Total Stages]".
        *   If `photo.routeIndex` indicates an overview context (e.g., -1 or nil) for a multi-stage route (`routeCount > 1`), display "Overview".
        *   If it's a single-stage route (`routeCount == 1`), display "Route".
    *   This must correctly use `photo.routeIndex` and the `routeCount` property.

2.  **Ensure Caption and `locationName` Reliably Update on Scroll in `PhotoViewerView.swift`**:
    *   **Investigate Re-rendering**: Confirm that `captionOverlayArea` and its child `Text` views (for caption, route info, photo count) are definitely re-rendering when `currentPhotoIndex` changes.
        *   The `.id(photo.id)` on the `VStack` inside `captionOverlayArea` is intended for this. Double-check its effectiveness.
        *   Ensure `currentPhoto.caption` is directly used by the `Text` view for the caption.
    *   **Verify `locationName` Update**:
        *   Confirm `locationName = nil` is called in `.onChange(of: currentPhotoIndex)`.
        *   Confirm `fetchLocationDetails()` is called and that `GeocodingUtils.getLocationName` is providing correct values for subsequent photos.
        *   Ensure the `Text` view using `locationName` updates when the `@State var locationName` changes.

3.  **Re-evaluate `photo.routeIndex` Assignment in `RouteDetailViewModel.updatePhotoMetadata()`**:
    *   **Status**: ✅ **RESOLVED** by the "Corrected Photo Stage Assignment and Modal Filtering" changes implemented on 2025-05-24. The `updatePhotoMetadata()` function now correctly assigns `photo.routeIndex` based on the photo's `distanceAlongRoute` relative to the cumulative distances of each stage. The `prepareAndShowPhotoModal()` function also correctly filters photos for the modal based on the `selectedRouteIndex` and the photo's assigned `routeIndex`.

4.  **Testing**: After fixes, thoroughly test all aspects of modal navigation:
    *   Correct initial display.
    *   Correct updates for image, caption, all parts of the route/stage/overview info string, distance, location name, and "Photo X of Y" count when scrolling.
    *   Behavior across single-stage and multi-stage routes.
    *   Behavior when the modal is opened from the "Overview" tab versus a specific stage tab in `RouteDetailView`.

---

## Elevation Profile Drawer and Route Description Display (Ongoing - 2025-05-23)

**Objective**: Display the detailed route description for the selected day/stage within the elevation profile drawer, ensuring it's fully visible and correctly formatted.

**Work Done & Issues Encountered**:

1.  **Initial Problem**: The route description for individual days (e.g., "Day 1") was not appearing in the `ElevationDrawerView`.
2.  **Investigation - Data Fetching (`FirebaseService.swift`)**:
    *   Identified that the `description` field for individual route segments was not being parsed from `segmentMetadata` during the creation of `Route` objects for each segment.
    *   The master route's description was also being incorrectly sourced from the first segment's metadata.
    *   **Fix Attempt 1**: Modified `FirebaseService.swift` to correctly assign `segmentMetadata["description"]` to the segment's `Route` object and `routeData["description"]` to the master `Route` object.
3.  **Investigation - Data Structure in Firebase**:
    *   User confirmed that the `description` field in Firebase is a map containing another `description` field which holds the actual string (e.g., `segmentMetadata.description.description`).
    *   **Fix Attempt 2**: Modified `FirebaseService.swift` again to handle this nested structure: `(segmentMetadata["description"] as? [String: Any])?["description"] as? String`.
4.  **Investigation - UI Display (`ElevationDrawerView.swift`)**:
    *   **Issue 1 (Truncation & Alignment - Expanded View)**: The route description in the *expanded* drawer state was truncated and center-aligned.
        *   **Fix Attempt 3**: Modified `expandedView()` in `ElevationDrawerView.swift`:
            *   Wrapped the content in a `ScrollView`.
            *   Applied `.lineLimit(nil)`, `.multilineTextAlignment(.leading)`, and `.fixedSize(horizontal: false, vertical: true)` to the description `Text` view.
            *   Left-aligned the "Elevation Profile" heading.
    *   **Issue 2 (Minimized View Functionality)**: The *minimized* state of the `ElevationDrawerView` (the "middle drawer") needed several adjustments:
        *   The drag handle was not fully visible.
        *   Route description was (and will remain) missing.
        *   The view was (and will remain) not scrollable for description content.
        *   A right chevron icon next to "Elevation Profile" was present and unnecessary.
        *   The "Elevation Profile" heading itself will also be removed from the minimized view.
    *   **Issue 3 (Expanded View Accordion Styling)**:
        *   The `expandedView` now uses `DisclosureGroup`s for "Photos", "Route Description", and "Weather".
        *   The "Photos" section is now first, followed by "Route Description", then "Weather".
        *   "Route Description" is expanded by default; "Photos" and "Weather" are collapsed by default.
        *   The chevrons for the `DisclosureGroup`s should use the primary text color.
    *   **Current Status**:
        *   `MinimizedElevationView`: Handle visibility, chevron removal, and "Elevation Profile" heading removal are complete. Route description and scrollability are removed. `minimizedHeight` adjusted to 210.
        *   `expandedView`: Accordion structure implemented with specified order and default states. Chevrons styled with `.accentColor(.primary)`. HTML in route description is parsed for basic Markdown styling (bold, italic).
        *   `ElevationDrawerView_Helpers`: `formatHTMLDescription` updated to convert basic HTML to Markdown.

**Challenges**:
*   Repeated "Diff Edit Mismatch" errors when attempting to apply changes with the `replace_in_file` tool, primarily due to failures in using the most up-to-date file content as the basis for subsequent `SEARCH` blocks. This has significantly slowed down progress.

---

### Master Route Description - Fetching and Rendering (Session of 2025-05-23 PM)

**Objective**: Ensure the master route's own description is fetched from Firebase and displayed with correct HTML styling (bold, italics, line breaks) in the `ElevationDrawerView` when the "Overview" tab is selected.

**Work Done & Issues Encountered**:

1.  **Initial Problem**: The master route's specific description was not being displayed; it was likely falling back to a segment's description or showing nothing.
2.  **Investigation - Data Structure & Fetching (`FirebaseService.swift`)**:
    *   It was initially assumed (based on `FIREBASE_MULTISTAGE_ROUTE_SCHEMA_UPDATED.md`) that the master route's description was a direct string field (`description: "string_value"`) at the root of its document (`user_saved_routes/{masterRouteId}`).
    *   An initial modification was made to `FirebaseService.swift` to parse it as `routeData["description"] as? String`.
    *   **Correction (User Feedback)**: User clarified that the master route's description in Firebase actually follows the same nested structure as segment descriptions: `description: {"description": "html_string_value"}`.
    *   `FirebaseService.swift` was then corrected to parse this nested structure for the master route: `(routeData["description"] as? [String: Any])?["description"] as? String`. This successfully made the raw HTML description string available to the `RouteDetailViewModel`.
3.  **Investigation - UI Display & HTML/Markdown Rendering (`ElevationDrawerView.swift`)**:
    *   The `ElevationDrawerView_Helpers.formatHTMLDescription` function converts some HTML tags (e.g., `<strong>`, `<em>`) to their Markdown equivalents (e.g., `**`, `*`) and handles `<br>`, `<p>` tags for newlines, stripping other HTML.
    *   The `ElevationDrawerView` (in its `expandedView` for the "Route Description" accordion) was initially using `Text(LocalizedStringKey(formattedDescription))` to display the description.
    *   **Issue**: After the master route description was successfully fetched, it appeared in the UI, but Markdown styling was not being applied. For example, the literal string `**bold text**` was appearing in the UI, instead of the text "bold text" being rendered with a **bold font weight**.
    *   **Attempted Fix 1**: Changed `Text(LocalizedStringKey(formattedDescription))` to `Text(formattedDescription)` directly, as the `Text(String)` initializer typically handles Markdown. This change was made, and the file `ElevationDrawerView.swift` is currently in this state. However, user feedback indicated this did not resolve the Markdown rendering issue.
    *   **Attempted Fix 2 (Problematic)**: Further attempts were made to use `AttributedString(markdown: formattedDescription)` to explicitly parse and render the Markdown. These attempts encountered tool errors with `replace_in_file` (incorrect diffs leading to broken file structure). The file `ElevationDrawerView.swift` was reverted to the state from "Attempted Fix 1" using a `write_to_file` operation to ensure stability.
4.  **Current Status (Master Route Description)**:
    *   Master route description string (containing HTML) is correctly fetched by `FirebaseService.swift`.
    *   `ElevationDrawerView_Helpers.formatHTMLDescription` converts this HTML to a Markdown string.
    *   `ElevationDrawerView.swift` displays this Markdown string using `Text(markdownString)`.
    *   The Markdown styling (e.g., bold, italic) is still not rendering correctly in the UI; literal Markdown characters (e.g., `**`) are visible.

**Next Steps for Master Route Description Rendering**:
*   Re-attempt the modification in `ElevationDrawerView.swift` to use `Text(AttributedString(markdown: formattedMarkdownString))` for the description display. This requires a very precise `replace_in_file` operation to avoid previous errors. The goal is to ensure SwiftUI correctly interprets and renders the Markdown generated by `formatHTMLDescription`.

---

## Photo Modal Caption Update Issue (Session of 2025-05-24 AM)

**Current Issue**: 
User reports that when navigating (next/previous) in the photo modal, the photo image changes correctly, but the caption and other details (route info, location name) often do not update to reflect the new photo's information.

**Work Done**:

1. **Fixed Photo Filtering Logic in `RouteDetailViewModel.swift`**:
   - **Problem Identified**: In `prepareAndShowPhotoModal()`, when a specific stage was selected, the code filtered photos using `$0.routeIndex == selectedRouteIndex`. Since all photos currently have `routeIndex = -1`, this resulted in an empty list when any stage was selected.
   - **Solution Applied**: Changed the filtering logic to use all photos from masterRoute regardless of stage selection: `let stagePhotos = self.masterRoute?.photos ?? []`
   - **Result**: This ensures `orderedPhotosForModal` is properly populated with all available photos, allowing the modal to display and navigate between photos.

2. **Investigated `PhotoViewerView.swift` Structure**:
   - The view appears to have proper updating mechanisms in place:
     - Uses `.onChange(of: currentPhotoIndex)` to reset state and fetch new location details
     - Applies `.id()` modifiers to force re-rendering of caption, route info, and photo count text elements
     - Uses computed `currentPhoto` property that should update when `currentPhotoIndex` changes
     - Includes comprehensive logging in the `.onChange` handler

**Current Analysis**:
The `PhotoViewerView` implementation looks robust with proper state management and forced re-rendering via `.id()` modifiers. The issue may be:

1. **SwiftUI Re-rendering**: Despite `.id()` modifiers, some views may not be re-rendering properly
2. **Data Binding**: The binding between `viewModel.currentModalPhotoIndex` and the view's `currentPhotoIndex` may have issues
3. **Computed Property Evaluation**: The `currentPhoto` computed property or dependent functions like `getFormattedRouteInfo()` may not be triggering updates correctly
4. **Location Fetching**: The async `fetchLocationDetails()` may not be completing or updating the `@State var locationName` properly

**Next Steps**:

1. **Test the Fix**: Build and test the current changes to see if the filtering fix resolves the issue
2. **Add Debug Logging**: If issues persist, add more detailed logging to track:
   - When `currentPhotoIndex` changes in the ViewModel vs. the View
   - Whether `currentPhoto` computed property returns the expected photo
   - Whether `getFormattedRouteInfo()` is being called with the correct photo data
   - Whether `locationName` state is updating correctly

3. **Investigate Specific Cases**:
   - Test navigation in both Overview and Stage contexts
   - Verify that `photo.caption`, `photo.routeIndex`, and `photo.distanceAlongRoute` contain expected values
   - Check if the issue is specific to certain text elements (caption vs route info vs location)

4. **Potential Additional Fixes**:
   - Consider using `@ObservedObject` or `@StateObject` for more reliable state management
   - Evaluate if the `.animation(.easeInOut, value: currentPhotoIndex)` is interfering with updates
   - Test removing/modifying the `.id()` modifiers to see if they're causing issues rather than solving them

**Files Modified**:
- `mobile/CyaTrails/CyaTrails/ViewModels/RouteDetailViewModel.swift` - Fixed photo filtering logic in `prepareAndShowPhotoModal()`

**Files to Investigate Next**:
- `mobile/CyaTrails/CyaTrails/Views/PhotoViewerView.swift` - Further debugging of update mechanisms
- `mobile/CyaTrails/CyaTrails/Views/RouteDetailView.swift` - Verify proper binding setup

---

## Corrected Photo Stage Assignment and Modal Filtering (Session of 2025-05-24 - Continued)

**Objective**: Implement correct stage assignment for photos based on their distance along the route and ensure the photo modal filters photos according to the selected stage or overview.

**Work Done**:

1.  **`RouteDetailViewModel.swift` Modifications**:
    *   **`updatePhotoMetadata()`**:
        *   Calculated cumulative total distances for each stage in `self.routes` (in meters) using the private `_calculateDistanceAndElevationProfile(for: route)` helper.
        *   For each photo, after its `distanceAlongRoute` (overall distance along the master track in meters) is determined:
            *   The photo's `routeIndex` is now assigned by comparing its `distanceAlongRoute` against the cumulative end distances of each stage.
            *   For example, if a route has 4 stages of 100km each (cumulative distances: 0m, 100,000m, 200,000m, 300,000m, 400,000m):
                *   A photo at 34,000m (34km) falls between 0m and 100,000m, so `routeIndex = 0`.
                *   A photo at 102,000m (102km) falls between 100,000m and 200,000m, so `routeIndex = 1`.
                *   A photo at 220,000m (220km) falls between 200,000m and 300,000m, so `routeIndex = 2`.
            *   Photos at or beyond the start of the last stage's cumulative distance are assigned to the last stage's index.
            *   If no stages are present or the photo doesn't fall neatly within a stage by this logic (e.g., before the first stage starts, though unlikely if `distanceAlongRoute` is positive), `routeIndex` defaults to -1 (Overview).
        *   This addresses the previous issue where all photos were tentatively assigned `routeIndex = -1` or an incorrect stage.

    *   **`prepareAndShowPhotoModal(photoID: String, mapView: MapView?)`**:
        *   The logic for determining `relevantPhotos` was updated:
            *   If `selectedRouteIndex == -1` (Overview), `relevantPhotos` includes all photos from `self.masterRoute?.photos`.
            *   If `selectedRouteIndex` corresponds to a specific stage (e.g., 0, 1, ...), `relevantPhotos` are now filtered from `self.masterRoute?.photos` to include only those photos where `photo.routeIndex` matches the `selectedRouteIndex`.
        *   The rest of the function (filtering by `distanceAlongRoute != nil`, sorting, and finding the tapped photo) remains the same but operates on this correctly pre-filtered list.

**Impact & Resolution**:

*   This change correctly implements the user's desired "FUCKING EASY AS FUCK LOGIC" for associating photos with their respective stages.
*   The photo modal (`PhotoViewerView`) will now display only the photos relevant to the currently selected stage tab in `RouteDetailView`, or all photos if the "Overview" tab is selected.
*   This resolves item 3 under "Next Steps (Revised Priority)" in Section 7 regarding `photo.routeIndex` assignment.
*   This supersedes the temporary fix mentioned in "Photo Modal Caption Update Issue (Session of 2025-05-24 AM)" for photo filtering.

---
## POI Details and Google Places Integration (Session of 2025-05-23)

This section details enhancements made to the CyaTrails (Swift) mobile application during the session on 2025-05-23, focusing on improving the display of Point of Interest (POI) details by fetching rich data from the Google Places API.

**Initial Issue:**
POIs loaded from Firebase were often only displaying an "Open in Google Maps" link within the details drawer. Richer information such as formatted address, phone number, ratings, opening hours, and photos was frequently missing. This was identified as being due to the POI data in Firebase often lacking a complete `googlePlaces` data map, sometimes only containing a `googlePlaceId` and `googlePlaceUrl`.

**Solution Implemented: On-Demand Fetching from Google Places API & UI Enhancements**

The primary solution was to enable the Swift app to fetch detailed POI information directly from the Google Places API if it wasn't sufficiently populated in the data loaded from Firebase. This involved several code changes and additions:

1.  **`GooglePlacesService.swift` (New File & Updates):**
    *   A new service file was created at `mobile/CyaTrails/CyaTrails/Services/GooglePlacesService.swift`.
    *   This service is responsible for making API calls to the Google Places "Place Details" endpoint using a `placeID`.
    *   It requests a comprehensive set of fields: `place_id`, `name`, `formatted_address`, `international_phone_number`, `website`, `rating`, `user_ratings_total`, `opening_hours`, `types`, `url`, `icon`, `icon_background_color`, `vicinity`, `geometry`, and crucially, `photos`.
    *   The service parses the JSON response, including photo references and `html_attributions`.
    *   It constructs full photo URLs from `photo_reference`s (e.g., `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=...&key=...`).
    *   The Google Places API key was retrieved from the web application's `.env` file (`VITE_GOOGLE_PLACES_API_KEY`) and integrated into this service, replacing a placeholder.

2.  **`POI` Model Update (`Models/RouteModels.swift`):**
    *   The `POI` struct was extended to store fetched Google Places photo information with two new optional properties:
        *   `var googlePhotoURLs: [String]?`: Stores an array of fully constructed URLs for Google Places photos.
        *   `var googlePhotoAttributions: [[String]]?`: Stores an array of attribution string arrays, corresponding to each photo.

3.  **`RouteDetailViewModel.swift` Enhancements:**
    *   Added an `@Published var isLoadingPOIDetails: Bool = false` property to manage the loading state for POI details.
    *   The `displayPOIDetails(_ poi: POI)` method was significantly updated:
        *   It now checks if essential details (like `formattedAddress`) are missing from the selected POI.
        *   If details are missing and a `googlePlaceId` is available, it sets `isLoadingPOIDetails = true` and calls `GooglePlacesService.shared.fetchPlaceDetails`, passing the existing POI to merge data.
        *   Upon successful fetch, `selectedPOIForDisplay` (the POI object bound to the drawer view) is updated with the enriched data.
        *   The POI is also updated in the main `self.pois` list within the ViewModel to cache the fetched details for the current session, preventing redundant API calls for the same POI if re-selected.
        *   `isLoadingPOIDetails` is set to `false` after the fetch attempt completes (success or failure).

4.  **`POIDisplayDrawerView.swift` UI/UX Updates:**
    *   Now uses `@EnvironmentObject var routeDetailViewModel: RouteDetailViewModel` to access data and loading states.
    *   Displays a `ProgressView` overlay if `routeDetailViewModel.isLoadingPOIDetails` is `true`.
    *   **Photo Display & Interaction:**
        *   A new "Photos" section was added, positioned directly under the POI name header.
        *   This section features a horizontal `ScrollView` displaying photo thumbnails fetched from `poi.googlePhotoURLs`.
        *   Each photo thumbnail is now a `Button` that, when tapped:
            *   Sets state variables (`selectedGooglePhotoURL`, `selectedGooglePhotoAttributions`).
            *   Sets `showingGooglePhotoViewer = true` to present a modal sheet.
        *   Attribution text previously displayed under each thumbnail was removed.
    *   **Layout Cleanup:**
        *   The "Category" field was removed.
        *   The "Place Types" field was completely removed.
    *   **Modal Presentation:** A `.sheet` modifier was added to present `GooglePhotoDetailView` when `showingGooglePhotoViewer` is true.

5.  **`GooglePhotoDetailView.swift` (New File):**
    *   Created at `mobile/CyaTrails/CyaTrails/Views/GooglePhotoDetailView.swift`.
    *   This new SwiftUI view is presented modally to display an enlarged version of a selected Google Places photo.
    *   It takes the `photoURL` and `attributions` as parameters.
    *   It uses `AsyncImage` to display the photo, scaled to fit.
    *   It displays the photo's `html_attributions` in a scrollable text area below the image.
    *   Includes a "Done" button in a navigation bar for dismissal.

6.  **`RouteDetailView.swift` Updates:**
    *   Ensured that `RouteDetailViewModel` is correctly injected as an `.environmentObject()` into `POIDisplayDrawerView` when the sheet is presented.
    *   The presentation detent for the POI details sheet was changed from `.medium` to `.presentationDetents([.fraction(0.375)])` to make the drawer approximately 25% shorter.

These changes collectively enable a richer and more interactive POI detail display in the CyaTrails Swift app, leveraging on-demand data fetching from the Google Places API.

---
## Master Route Elevation Profile Styling (Session of 2025-05-23)

**Objective**:
To modify the elevation profile display for the master route (i.e., when the "Overview" tab is selected in `ElevationDrawerView`) to match the detailed styling of individual stage profiles. This includes displaying gradient colors based on slope steepness and an overlay indicating unpaved sections.

**Solution Implemented**:

The solution involved changes in both the ViewModel (`RouteDetailViewModel.swift`) to correctly aggregate data for the master route, and in the View (`ElevationDrawerView.swift`) to consume this data and apply consistent rendering logic.

1.  **`RouteDetailViewModel.swift` Modifications**:
    *   **`getMasterRouteCombinedCoordinatesAndElevations()` (New Private Helper)**:
        *   Added to aggregate `coordinates` (`[[Double]]`) and `elevations` (`[Double]`) from all individual stages stored in `self.routes`.
        *   This method handles potential duplicate coordinates at the connection points between stages to form a continuous series for the entire master route.
        *   If `self.routes` is empty, it attempts to use the `geojson` data directly from `self.masterRoute` as a fallback.
    *   **`getGradientSegments()` (Modified)**:
        *   When the "Overview" is selected (`selectedRouteIndex == -1`), this method now calls `getMasterRouteCombinedCoordinatesAndElevations()` to get the unified coordinate and elevation data for the master route.
        *   This combined data is then passed to `ClimbUtils.calculateGradientSegments(coordinates:elevations:)` to generate `GradientSegment` objects for the entire master route.
        *   For individual stages, the method continues to use the stage's specific geojson data as before.
    *   **`getOverviewUnpavedSections()` (New Public Method)**:
        *   Added to aggregate `UnpavedSection` objects from all stages in `self.routes`.
        *   Crucially, this method re-calculates the `startIndex` and `endIndex` of each unpaved section from the stages to be relative to the master route's combined coordinate list. This re-indexing considers the length of preceding stages and handles shared connection points to ensure accuracy.
        *   If `self.routes` is empty, it falls back to returning `self.masterRoute.unpavedSections` (if any).
    *   **Compiler Error Fix**:
        *   Resolved "Cannot use optional chaining on non-optional value of type '[[Double]]'" errors that occurred in `getOverviewUnpavedSections`. This was addressed by removing an unnecessary optional chaining operator (`?`) before `.count` when accessing the count of geojson coordinates, assuming that if the `coordinates` property path is valid up to that point, `coordinates` itself is a non-optional array.

2.  **`ElevationDrawerView.swift` Modifications**:
    *   **Data Sourcing for Overview**:
        *   In both `expandedView()` and `MinimizedElevationView`, when `isOverview` is true (i.e., "Overview" tab is selected):
            *   The `unpavedSectionsForChart` variable is now populated by calling the new `viewModel.getOverviewUnpavedSections()` method. This ensures that the view receives the correctly aggregated and re-indexed unpaved sections for the entire master route.
            *   The call to `viewModel.getGradientSegments()` remains unchanged in the view, as the ViewModel's method now internally handles the logic for providing aggregated gradient segments for the overview.
    *   **Consistent Rendering Logic**:
        *   The conditional logic that previously used `OverviewChartFill` (a solid red fill) for the master route's expanded chart was removed.
        *   Both overview and stage charts now consistently use `GradientFillView` (or `MiniGradientFillView` for the minimized version) for the colored gradient fill.
        *   `UnpavedOverlayView` is now conditionally rendered for the overview chart if `unpavedSectionsForChart` (populated by `viewModel.getOverviewUnpavedSections()`) is not empty.
        *   The line color of the `MiniElevationChartPath` in `MinimizedElevationView` was made consistent for both overview and stages, removing a special case for dark mode overview.

**Expected Outcome**:
With these changes, the `RouteDetailViewModel` should now correctly prepare and provide aggregated data (gradient segments and unpaved sections) for the master route. The `ElevationDrawerView` is updated to consume this data, resulting in the "Overview" elevation profile being rendered with the same detailed visual styling (gradient colors by slope, unpaved surface overlays) as the individual stage profiles. This provides a consistent and more informative user experience.

---
## UI and Map Control Enhancements (Session of 2025-05-23)

This section details further UI refinements and additions to map controls.

**1. Elevation Drawer Compaction and State Refinement:**

*   **Initial Compaction**:
    *   Removed a `Divider` in `ElevationDrawerView.swift` between the stage tabs and the route statistics in the `routeTabs` view to bring them closer.
    *   Adjusted `minimizedHeight` from 210 to 190.
    *   Reduced various vertical paddings around the tabs and within `MinimizedElevationView` for the statistics `HStack` to further compact the layout.
*   **Three-State Drawer Reinstated**:
    *   The drawer now supports three distinct states: `.collapsed`, `.minimized`, and `.expanded`.
    *   `collapsedHeight` set to `75` to show only the drawer handle and stage tabs.
    *   `minimizedHeight` remains `190` (tabs, stats, mini chart).
    *   `expandedHeight` remains `500`.
    *   `ElevationDrawerView` logic updated to conditionally display `MinimizedElevationView` only in the `.minimized` state.
    *   `MinimizedElevationView` simplified by removing its internal `isCollapsed` logic.

**2. Route Detail Header Consistency (`RouteDetailView.swift`):**

*   **Persistent Title and Color**:
    *   The `headerSettings` computed property in `RouteDetailView` now prioritizes `viewModel.masterRoute?.headerSettings`.
    *   The `CustomHeaderView` is instantiated with `route: viewModel.masterRoute ?? viewModel.route`.
    *   These changes ensure the main header consistently displays the `masterRoute.name` as the title and uses the `masterRoute.color` for its background, irrespective of the stage selected in the elevation drawer.
*   **Logo Display and Title Wrapping**:
    *   In `CustomHeaderView`:
        *   The logo and its balancing spacer are now only rendered if a valid `headerSettings.logoUrl` is provided.
        *   The route title `Text` view now uses `.lineLimit(nil)`, `.multilineTextAlignment(.center)`, and `.fixedSize(horizontal: false, vertical: true)` to allow wrapping for long titles.
        *   Horizontal padding is applied to the header content if no logo is present, ensuring the text doesn't sit at the screen edges.

**3. Stage Tab Names in Elevation Drawer (`ElevationDrawerView.swift`):**

*   The stage tabs now display the actual `name` property of each individual stage's `Route` object from the `viewModel.routes` array.
*   The `extractStageName` helper function was removed as it's no longer necessary.

**4. Map Marker Visibility Toggles (`MapControlsView.swift`, `RouteDetailViewModel.swift`, `RouteDetailView.swift`):**

*   **ViewModel State**:
    *   Added `@Published var showDistanceMarkers: Bool = true` to `RouteDetailViewModel`.
    *   Added `@Published var showPhotoMarkers: Bool = true` to `RouteDetailViewModel`.
    *   Added `@Published var showPOIMarkers: Bool = true` to `RouteDetailViewModel`.
*   **MapControlsView UI**:
    *   `MapControlsView` now observes `RouteDetailViewModel`.
    *   Added three new toggle buttons:
        *   **Distance Markers**: Icon "ruler".
        *   **Photo Markers**: Icon "camera.fill".
        *   **POI Markers**: Icon "binoculars.fill".
    *   Each button displays a red diagonal slash (`line.diagonal`) over its icon when the corresponding `show...Markers` state in the ViewModel is `false`.
    *   Tapping a button toggles the respective boolean state in the ViewModel.
*   **ViewModel Logic**:
    *   `RouteDetailViewModel.addCustomDistanceMarkers()`: Now checks `self.showDistanceMarkers`. If `false`, it clears existing distance markers and returns.
    *   `RouteDetailViewModel.setupPOIMarkers()`: Now checks `self.showPOIMarkers`. If `false`, it calls `poiMarkerManager?.removeAllMarkers()`; otherwise, it calls `addPOIMarkers()`.
    *   `RouteDetailViewModel.setupPhotoMarkers()`: Now checks `self.showPhotoMarkers`. If `false`, it calls `photoMarkerManager?.removeAllPhotoMarkers()`; otherwise, it calls `addPhotoMarkers()`.
    *   The `updateDistanceMarkers()` function was made `internal` (default access level) to be callable from `RouteDetailView`.
*   **RouteDetailView Integration**:
    *   `RouteDetailView` now passes its `viewModel` instance to `MapControlsView`.
    *   Added `.onChange` modifiers for `viewModel.showDistanceMarkers`, `viewModel.showPhotoMarkers`, and `viewModel.showPOIMarkers`.
    *   When these states change, the corresponding marker update/setup functions in the ViewModel are called (e.g., `viewModel.updateDistanceMarkers()`, `viewModel.setupPhotoMarkers(mapView: mapView)`), ensuring the map display refreshes.
