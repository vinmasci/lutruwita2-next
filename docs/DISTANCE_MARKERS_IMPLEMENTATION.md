# Distance Markers Implementation in Swift

This document details the process of implementing distance markers along routes in the Swift app to match the React Native implementation.

## Summary of Approaches

Three main approaches were attempted:

1. **ViewAnnotation** - Did not work well as markers moved during zoom operations
2. **MapBox Symbol Layers** - Had various issues with complex implementation
3. **SwiftUI rendering to images for PointAnnotations** - Attempted but had white box issues
4. **Core Graphics direct drawing with PointAnnotations** - Final working solution

## Zoom-Responsive Distance Intervals

The implementation dynamically adjusts marker display based on zoom level to ensure optimal readability:

1. **Fixed Distance Intervals Based on Zoom** (in `RouteDetailViewModel.getIntervalForZoom`):
   - Zoom ≥ 16: 1km intervals
   - Zoom ≥ 15: 2km intervals
   - Zoom ≥ 14: 5km intervals
   - Zoom ≥ 11: 10km intervals
   - Zoom ≥ 9: 20km intervals
   - Zoom ≥ 7: 30km intervals
   - Zoom ≥ 5: 50km intervals
   - Zoom < 5: Only start and end markers

2. **Camera Change Observer**:
   - Real-time zoom level tracking through MapBox's onCameraChanged event
   - Automatic recalculation of markers when zoom level changes
   - Debounced updates to avoid performance issues during rapid zoom

3. **Start and End Marker Persistence**:
   - Start and end markers always displayed regardless of zoom level
   - Enhanced with special icons (play triangle for start, checkered flag for end)

This approach ensures that at any zoom level, the map displays an appropriate number of markers (typically 4-5) to provide distance reference without cluttering the view.

## Final Working Solution

The solution that worked combines several techniques:

1. Direct Core Graphics drawing to create marker images
2. MapBox PointAnnotation objects with these images
3. **Annotation Manager Creation Order**: Ensuring the `PointAnnotationManager` (for distance markers) is created *after* the `PolylineAnnotationManager` (for route lines) to control z-index.
4. Precise coordinate interpolation for exact kilometer intervals
5. Delayed rendering (now secondary, if needed, but primary reliance is on manager order)

## Detailed Implementation Steps

### 1. Route Coordinate Processing

```swift
// Calculate cumulative distances along the route
var totalDistance = 0.0
var cumulativeDistances: [Double] = [0.0]

for i in 1..<coordinates.count {
    let from = CLLocation(latitude: coordinates[i-1].latitude, longitude: coordinates[i-1].longitude)
    let to = CLLocation(latitude: coordinates[i].latitude, longitude: coordinates[i].longitude)
    let distance = from.distance(from: to) / 1000.0 // to km
    totalDistance += distance
    cumulativeDistances.append(totalDistance)
}
```

### 2. Distance Marker Positioning

For each desired distance interval (e.g., 10km):

```swift
// Find segment containing target distance
var index = 0
while index < cumulativeDistances.count - 1 && cumulativeDistances[index + 1] < targetDistance {
    index += 1
}

// Interpolate between two points
let beforeDist = cumulativeDistances[index]
let afterDist = cumulativeDistances[index + 1]
let segmentLength = afterDist - beforeDist
    
// Calculate ratio along segment
let ratio = (targetDistance - beforeDist) / segmentLength
    
// Linear interpolation for exact position
let beforePoint = coordinates[index]
let afterPoint = coordinates[index + 1]
let interpolatedLat = beforePoint.latitude + ratio * (afterPoint.latitude - beforePoint.latitude)
let interpolatedLng = beforePoint.longitude + ratio * (afterPoint.longitude - beforePoint.longitude)
let interpolatedPoint = CLLocationCoordinate2D(latitude: interpolatedLat, longitude: interpolatedLng)
```

### 3. Core Graphics Image Creation (Themed & Styled Text)

The `createCustomMarkerImage` function in `RouteDetailViewModel.swift` handles the visual rendering of markers:
- **Day/Night Theming**: It accepts an `isDarkMode: Bool` parameter. Based on this, it selects appropriate colors for the marker's background, border, text, shadow, and connector dot. (Currently, `isDarkMode` is determined using a placeholder `mapView.traitCollection.userInterfaceStyle == .dark`).
- **Styled Distance Text**: `NSAttributedString` is employed to display the distance. The numerical value is rendered with a 12pt medium weight font, while the "km" unit is displayed in a smaller 7pt medium weight font for better visual hierarchy.
- **End Marker Distance Logging**: To help diagnose issues with the end marker's displayed distance (e.g., the "75km" issue on a longer route), a `print` statement now logs the exact `distance` value received by `createCustomMarkerImage` when `isEnd` is true.

**Example of `NSAttributedString` for text styling:**
```swift
// In createCustomMarkerImage:
let numberFont = UIFont.systemFont(ofSize: 12, weight: .medium)
let unitFont = UIFont.systemFont(ofSize: 7, weight: .medium)
// ...
let fullText = NSMutableAttributedString()
fullText.append(NSAttributedString(string: numberText, attributes: [
    .font: numberFont, .foregroundColor: markerTextColor, .paragraphStyle: paragraphStyle
]))
fullText.append(NSAttributedString(string: unitText, attributes: [
    .font: unitFont, .foregroundColor: markerTextColor, .paragraphStyle: paragraphStyle, .baselineOffset: 2.5
]))
fullText.draw(in: textRect)
```

### 3a. Corrected End Marker Distance Calculation

A key fix was implemented to address the end marker showing an incorrect total distance. The `RouteDetailViewModel` now ensures that:
- The `distanceMarkerCoordinates` used for calculating `totalDistance` within `addCustomDistanceMarkers` are fetched fresh from `self.route.geojson` each time `updateDistanceMarkers` is called (which happens on initial setup and on zoom/camera changes).
- This prevents using stale or incomplete coordinate data if the route's GeoJSON was loaded or updated asynchronously after the initial marker setup.

**Original Core Graphics drawing details (now adapted for theming as described above):**

```swift
// Create the image context
let renderer = UIGraphicsImageRenderer(size: imageSize)
let image = renderer.image { ctx in
    // Clear background
    UIColor.clear.setFill()
    ctx.fill(CGRect(origin: .zero, size: imageSize))
    
    // Dark gray background with 85% opacity
    let backgroundRect = CGRect(x: 0, y: 0, width: imageSize.width - 10, height: 20)
    let path = UIBezierPath(roundedRect: backgroundRect, cornerRadius: 3) 
    UIColor(red: 35/255, green: 35/255, blue: 35/255, alpha: 0.85).setFill()
    path.fill()
    
    // White border with 30% opacity
    UIColor(white: 1.0, alpha: 0.3).setStroke()
    ctx.cgContext.setLineWidth(1.0)
    path.stroke()
    
    // Add shadow (0 1px 3px rgba(0, 0, 0, 0.3))
    ctx.cgContext.setShadow(offset: CGSize(width: 0, height: 1), 
                            blur: 3, 
                            color: UIColor(red: 0, green: 0, blue: 0, alpha: 0.3).cgColor)
    
    // Draw text centered
    let paragraphStyle = NSMutableParagraphStyle()
    paragraphStyle.alignment = .center
    
    // 12px medium weight font
    let textAttributes: [NSAttributedString.Key: Any] = [
        .foregroundColor: UIColor.white,
        .font: UIFont.systemFont(ofSize: 12, weight: .medium),
        .paragraphStyle: paragraphStyle
    ]
    
    // Draw text with correct padding
    let textRect = CGRect(x: 3, y: 3, width: imageSize.width - 16, height: 14)
    distanceText.draw(in: textRect, withAttributes: textAttributes)
    
    // Add connector dot with styling
    let dotPath = UIBezierPath(ovalIn: 
        CGRect(x: (imageSize.width - 10) / 2 - 3, y: 19, width: 6, height: 6))
    UIColor(red: 35/255, green: 35/255, blue: 35/255, alpha: 0.9).setFill()
    dotPath.fill()
    UIColor(white: 1.0, alpha: 0.3).setStroke()
    dotPath.stroke()
}
```

### 4. Setting up the Point Annotations

```swift
// Create the marker annotation
var pointAnnotation = PointAnnotation(coordinate: interpolatedPoint)
pointAnnotation.image = .init(image: markerImage, name: "marker-\(Int(targetDistance))km")
pointAnnotation.iconAnchor = .bottom // Attach to bottom of image (over the dot)
```

### 5. Annotation Manager Creation Order (Primary Z-Index Control)

The primary method for ensuring distance markers (PointAnnotations) render above route lines (PolylineAnnotations) is to control the creation order of their respective annotation managers. The `PointAnnotationManager` must be created *after* the `PolylineAnnotationManager`.

**In `EnhancedRouteMapView.swift` (Coordinator):**
1.  Initialize all `PolylineAnnotationManager` instances first (e.g., `routeMainPolylineManager`, `routeBorderPolylineManager`).
2.  Then, initialize the `PointAnnotationManager` for distance markers (`distanceMarkerPointAnnotationManager`).

```swift
// In EnhancedRouteMapView.swift -> makeUIView(context:)

// Polyline managers for the main selected route are set to the "bottom" slot
// to render them below map labels but above base map imagery.
context.coordinator.routeBorderPolylineManager = mapView.annotations.makePolylineAnnotationManager(id: "route-border-polyline-manager")
context.coordinator.routeBorderPolylineManager?.slot = "bottom"

context.coordinator.routeMainPolylineManager = mapView.annotations.makePolylineAnnotationManager(id: "route-main-polyline-manager")
context.coordinator.routeMainPolylineManager?.slot = "bottom"

// PointAnnotationManager for distance markers created AFTER polyline managers
// and set to the "middle" slot to render above the "bottom" slotted route lines.
context.coordinator.distanceMarkerPointAnnotationManager = mapView.annotations.makePointAnnotationManager(id: "distance-markers-point-manager")
context.coordinator.distanceMarkerPointAnnotationManager?.slot = "middle"

// This manager is then passed to the ViewModel:
// viewModel.setupDistanceMarkers(mapView: mapView, pointAnnotationManager: distManager)

// Other annotation managers like routeStartEndCircleManager (typically "middle") 
// and genericLinesPolylineManager (now also "bottom") are initialized here.
context.coordinator.genericLinesPolylineManager = mapView.annotations.makePolylineAnnotationManager(id: "generic-lines-polyline-manager")
context.coordinator.genericLinesPolylineManager?.slot = "bottom"
```

**In `RouteStyleUtils.swift`:**
To ensure all parts of the route (including unpaved sections and other segments in a multi-route display) also respect the desired layering:
-   **Unpaved Sections (Direct Layer):** When `LineLayer`s are created for unpaved sections (e.g., `unpaved-layer` or `unpaved-layer-\(route.id)` in `addRoutePolyline` and `addUnpavedSectionsOnly`), their `slot` property is set to `"bottom"`.
    ```swift
    // Example from addRoutePolyline for unpaved sections (direct layer):
    var lineLayer = LineLayer(id: "unpaved-layer", source: "unpaved-source")
    // ... other properties ...
    lineLayer.slot = "bottom" 
    ```
-   **Unpaved Sections (Fallback AnnotationManager):** In the fallback mechanism within `addRoutePolyline`, the `unpavedLineManager` created now also has its `slot` set to `"bottom"`.
    ```swift
    // Example from addRoutePolyline for unpaved sections (fallback manager):
    let unpavedLineManager = mapView.annotations.makePolylineAnnotationManager()
    unpavedLineManager.slot = "bottom" 
    ```
-   **Multiple Routes Display (`addMultipleRoutes`):** When `addMultipleRoutes` creates its own `PolylineAnnotationManager` instances, these managers have their `slot` property set to `"bottom"`.
    ```swift
    // Example from addMultipleRoutes:
    let borderPolylineManager = mapView.annotations.makePolylineAnnotationManager(id: "multi-route-border-polyline")
    borderPolylineManager.slot = "bottom" 
    
    let mainPolylineManager = mapView.annotations.makePolylineAnnotationManager(id: "multi-route-main-polyline")
    mainPolylineManager.slot = "bottom"
    ```

**In `HomeView.swift` (within `MapViewRepresentable`):**
-   The `PolylineAnnotationManager` used for drawing route previews on the home screen map is also set to the `"bottom"` slot.
    ```swift
    // Example from HomeView.swift -> MapViewRepresentable -> updateUIView:
    let polylineManager = mapView.annotations.makePolylineAnnotationManager()
    polylineManager.slot = "bottom" 
    ```

**In `RouteDetailViewModel.swift`:**
The `setupDistanceMarkers` function receives the pre-initialized `PointAnnotationManager` (which is in the "middle" slot) and uses it. The `DispatchQueue.main.asyncAfter` delay previously used for z-index management has been removed.

```swift
// In RouteDetailViewModel.swift
// private var distanceMarkersAnnotationManager: PointAnnotationManager? // Now assigned from parameter

func setupDistanceMarkers(mapView: MapView, pointAnnotationManager: PointAnnotationManager) {
    self.distanceMarkerMapView = mapView
    self.distanceMarkersAnnotationManager = pointAnnotationManager // Use passed-in manager
    
    // ... rest of the setup ...
    
    // The DispatchQueue.main.asyncAfter delay for adding markers has been removed.
    self.updateDistanceMarkers() 
}
```
This explicit ordering is the recommended approach by Mapbox for controlling layer stacking. The previous `DispatchQueue.main.asyncAfter` (detailed below for historical context) can be considered a fallback or supplementary technique if further issues arise.

### 5a. Delayed Rendering (Historical/Fallback Z-Index Method)

Previously, a common workaround to get markers to appear on top of route lines was to delay their addition using `DispatchQueue.main.asyncAfter`. While the manager creation order is now the primary method, this technique is documented here for completeness.

```swift
// Example of the previous delay mechanism (now superseded by manager ordering)
// DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
//     guard let self = self else { return }
//     self.addCustomDistanceMarkers(to: mapView, coordinates: routeCoordinates)
// }
```

### 6. Camera Change Observer Implementation

We added a camera change observer to dynamically update markers based on zoom level:

```swift
// Set up new zoom observer
zoomObservationToken = mapView.mapboxMap.onCameraChanged.observe { [weak self] _ in
    // Debounce rapid zoom changes
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
        guard let self = self, let mapView = self.distanceMarkerMapView else { return }
        print("📷 Camera changed - zoom level: \(mapView.cameraState.zoom)")
        self.updateDistanceMarkers()
    }
}
```

### 7. Special Start/End Markers

We added special handling for start and end markers:

```swift
// Create START marker at the beginning
if !coordinates.isEmpty {
    let startMarkerImage = createCustomMarkerImage(distance: 0, isStart: true)
    var startPointAnnotation = PointAnnotation(coordinate: coordinates.first!)
    startPointAnnotation.image = .init(image: startMarkerImage, name: "marker-start")
    startPointAnnotation.iconAnchor = .bottom
    markers.append(startPointAnnotation)
}

// Create END marker at the end
if !coordinates.isEmpty {
    let endMarkerImage = createCustomMarkerImage(distance: totalDistance, isEnd: true)
    var endPointAnnotation = PointAnnotation(coordinate: coordinates.last!)
    endPointAnnotation.image = .init(image: endMarkerImage, name: "marker-end")
    endPointAnnotation.iconAnchor = .bottom
    markers.append(endPointAnnotation)
}
```

### 8. Correcting End Marker Distances for Multi-Day Routes

A specific issue was identified where, for multi-day routes, the end-of-day marker for *every* day incorrectly displayed the total distance of the *first* day. For example, if Day 1 was 75km and Day 2 was 123km, the end marker for Day 1 would correctly show 75km, but the end marker for Day 2 would also show 75km instead of 123km. This was suggested by logs showing the same `Route total distance` being used repeatedly if the context wasn't updated correctly.

**Cause:**

The `totalDistance` variable, used when creating the end marker (`createCustomMarkerImage(distance: totalDistance, isEnd: true)`), was not being consistently calculated based on the coordinates of the *currently selected day/stage*. When switching between days in a multi-day route using the `selectRoute(index: Int)` method, the `updateDistanceMarkers()` function (which is responsible for recalculating and displaying markers) might not have been triggered immediately or with the correct route context. If `updateDistanceMarkers()` relied solely on camera changes or other asynchronous events, the `self.route` property (from which coordinates are fetched) might not reflect the newly selected day/stage at the moment of marker calculation, leading to the use of stale coordinate data and thus an incorrect `totalDistance` for the end marker.

**Solution Implemented in `RouteDetailViewModel.swift`:**

To rectify this, the `selectRoute(index: Int)` method in `RouteDetailViewModel.swift` was modified to explicitly trigger an update of the distance markers if the selected route (day/stage) actually changes:

1.  **Detect Route Change**: The method now checks if the `id` of the newly selected route is different from the previously active route's `id`.
2.  **Explicit Marker Update**: If the route has indeed changed:
    *   The `self.route` property is updated to the newly selected day/stage.
    *   `self.updateDistanceMarkers()` is called directly.
3.  **Correct Coordinate Usage**:
    *   `updateDistanceMarkers()` fetches `freshRouteCoordinates` from the now-current `self.route`.
    *   It then calls `addCustomDistanceMarkers(to: mapView, coordinates: freshRouteCoordinates)`.
    *   Inside `addCustomDistanceMarkers`, the `totalDistance` is calculated based *only* on these `freshRouteCoordinates` (i.e., the coordinates of the currently selected day/stage).
    *   This stage-specific `totalDistance` is then passed to `createCustomMarkerImage(distance: totalDistance, isEnd: true, ...)` for that day's/stage's end marker.

**Relevant part of `selectRoute(index: Int)` after modification:**
```swift
// ... (logic to determine if route changed and update self.route) ...

if routeChanged {
    let newRouteName = self.route?.name ?? "N/A"
    let newRouteId = self.route?.id ?? "N/A"
    print("🔄 Route selection changed to index: \(selectedRouteIndex) (name: \(newRouteName), id: \(newRouteId)). Explicitly updating distance markers.")
    // Ensure self.route is correctly set before this call.
    // updateDistanceMarkers() has its own guards for mapView and currentRoute.
    self.updateDistanceMarkers()
}
```

This explicit update ensures that `addCustomDistanceMarkers` is called with the correct `coordinates` for the selected day/stage, and thus calculates the correct `totalDistance` for that stage.

**Further Refinement for Image Caching (Mapbox `PointAnnotation.Image` Naming):**

Even with the correct `totalDistance` being passed to `createCustomMarkerImage`, a subtle issue remained: Mapbox's handling of annotation images. When an image is added to an annotation via `PointAnnotation.Image(image: uiImage, name: "some-name")`, Mapbox uses the `name` string to identify this image in its internal style. If a new `UIImage` object (e.g., with different text like "123km") is later associated with the *same name* (e.g., "marker-end") that was previously used for a different `UIImage` (e.g., with "75km" text), Mapbox might reuse the visual representation of the *first* image it registered with that name, rather than updating to the new `UIImage` content.

This was the likely cause of the end-of-day marker for Day 2 (123km) still showing "75km" (from Day 1's end marker) even if the intermediate markers for Day 2 were correct. The `totalDistance` was correct for Day 2's end marker image creation, but the image name "marker-end" was not unique.

**Solution for Image Naming:**

To force Mapbox to use the correct, newly generated image for the end marker (and start marker, for consistency), the image names are now made dynamic by incorporating the distance into the name.

In `addCustomDistanceMarkers` within `RouteDetailViewModel.swift`:
```swift
// For the START marker:
let startMarkerImage = createCustomMarkerImage(distance: 0, isStart: true, isDarkMode: isDarkMode)
var startPointAnnotation = PointAnnotation(coordinate: coordinates.first!)
let startMarkerName = "marker-start-0" // Dynamic, though "0" is static here
startPointAnnotation.image = .init(image: startMarkerImage, name: startMarkerName)
// ...

// For the END marker:
let endMarkerImage = createCustomMarkerImage(distance: totalDistance, isEnd: true, isDarkMode: isDarkMode)
var endPointAnnotation = PointAnnotation(coordinate: coordinates.last!)
let endMarkerName = "marker-end-\(Int(round(totalDistance)))" // Name includes the distance
endPointAnnotation.image = .init(image: endMarkerImage, name: endMarkerName)
// ...
```
By making the `name` for `PointAnnotation.Image` unique for each visually distinct marker (especially when the text content like distance changes), we ensure Mapbox treats each as a separate image resource, preventing the stale cache issue. The intermediate markers already used unique names like `"marker-\(Int(roundedDistance))km"`.

This combination of explicitly updating markers on route selection and ensuring unique image names for content-varying markers (like start/end markers with different distances) resolves the issue of incorrect end-of-day distances.

### 8a. Marker Visual Refinements (Padding and Layout)

Based on feedback, the following visual adjustments were made to the markers in `createCustomMarkerImage`:
1.  **Reduced Horizontal Padding**: The overall width of the marker images was reduced (e.g., `imageSize` width from 60pt to 50pt), and the internal padding within the marker pill was decreased. This results in a narrower appearance for all distance markers.
2.  **Start/End Marker Layout**: The start ("0km" + play icon) and end (distance + flag icon) markers now consistently display their text and icon side-by-side on a single line, fitting within the narrower pill design. The previous iteration where the start marker's icon was above its text was reverted.

These changes aim for a more compact and consistent marker design.

## Key Lessons Learned

1. **Zoom Level Monitoring**: Camera change events must be properly monitored to update marker display in real-time.

2. **Disposable Annotations**: Each zoom change requires completely regenerating markers rather than trying to modify existing ones.

3. **Avoid SwiftUI Rendering Issues**: Direct Core Graphics drawing is more reliable than trying to render SwiftUI views to images.

4. **Layer Ordering via Manager Creation**: The most reliable way to control annotation layering is by creating the `PointAnnotationManager` (for markers) *after* the `PolylineAnnotationManager` (for lines). The `DispatchQueue.main.asyncAfter` delay is now a secondary consideration.

5. **Match CSS Exactly**: Translating from React Native CSS to Swift CoreGraphics requires precise property mappings:
   - CSS `background-color: rgba(35, 35, 35, 0.85)` → Swift `UIColor(red: 35/255, green: 35/255, blue: 35/255, alpha: 0.85)`
   - CSS `border: 1px solid rgba(255, 255, 255, 0.3)` → Swift `UIColor(white: 1.0, alpha: 0.3).setStroke()` + `setLineWidth(1.0)`
   - CSS `border-radius: 3px` → Swift `UIBezierPath(roundedRect: rect, cornerRadius: 3)`
   - CSS `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3)` → Swift `setShadow(offset: CGSize(width: 0, height: 1), blur: 3, color: UIColor(red: 0, green: 0, blue: 0, alpha: 0.3))`

6. **Coordinate Interpolation**: Precise mathematical placement of markers required interpolating between route coordinates.

## Conclusion

By combining Core Graphics for custom drawing with MapBox PointAnnotations, camera change observers, and proper coordinate interpolation, we created zoom-responsive distance markers that adjust their density automatically based on the current zoom level. This ensures that regardless of how far in or out the user zooms, they always see an appropriate number of distance markers for the current view.
