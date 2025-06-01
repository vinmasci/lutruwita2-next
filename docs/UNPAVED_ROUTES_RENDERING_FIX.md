# Unpaved Routes Rendering Fix

## Problem Summary

The app successfully loaded unpaved section data from Firebase but failed to render it on the map. The unpaved sections needed to be rendered as dashed lines, which required Mapbox Style Layers and GeoJSON Sources, but they weren't appearing on the map.

## Diagnosis

1. **Data loading**: Working correctly (logs confirmed unpaved sections were loaded)
2. **Rendering**: Not working (no logging from the style layer code appeared)
3. **Key issue**: The `onStyleLoaded` event handler in RouteStyleUtils.swift wasn't executing

## Root Causes

1. The `onStyleLoaded` event handler was never triggered
2. The zoom-dependent expression syntax for line dash patterns was causing errors
3. Error in logs: `Expected array<number> but found number instead`

## Fix Implemented

### 1. Fixed the Style Layer Timing Issue

Modified `RouteStyleUtils.swift` to process unpaved sections immediately instead of waiting for the style loaded event:

```swift
// FIXED APPROACH: Instead of waiting for style loaded event, process immediately
print("🔍 UNPAVED: Processing unpaved sections immediately...")
print("🔍 UNPAVED: Style URI is \(mapView.mapboxMap.style.uri?.rawValue ?? "nil")")

// Ensure the map has a style by explicitly loading it if needed
if mapView.mapboxMap.style.uri == nil {
    print("🔍 UNPAVED: Setting style to outdoors...")
    mapView.mapboxMap.loadStyleURI(.outdoors)
}

// Add a slight delay to allow the style to initialize if it was just set
DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
    // Process unpaved sections here
}
```

### 2. Fixed the Line Dash Pattern Expression

Changed from problematic expression-based dash pattern:

```swift
lineLayer.lineDasharray = .expression(
    Exp(.interpolate) {
        Exp(.linear)
        Exp(.zoom)
        // Zoom levels and arrays...
    }
)
```

To a simple constant array with very small values:

```swift
// Set simple dashed pattern with very tiny dashes
print("🔍 Setting micro-dashed line pattern")
lineLayer.lineDasharray = .constant([0.5, 0.5])  // Extremely small dashes
```

### 3. Added Robust Error Handling and Retry Logic

Implemented better error handling for both the source and layer creation:

```swift
do {
    try mapView.mapboxMap.addSource(source)
    print("✅ Source added successfully")
} catch {
    print("⚠️ Error adding source: \(error.localizedDescription)")
    // Try again after a brief delay
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
        do {
            try mapView.mapboxMap.addSource(source)
            print("✅ Source added successfully on second attempt")
        } catch {
            print("❌ Failed to add source on second attempt: \(error.localizedDescription)")
            return
        }
        
        // Continue with layer creation only if source was added successfully
        createAndAddLayer()
    }
    return
}
```

### 4. Fixed to Support All Route Segments

Modified `EnhancedRouteMapView.swift` to properly process unpaved sections for all route segments with unique identifiers:

```swift
// Add unpaved sections for all segments if we have a master route with segments
if let masterRoute = viewModel.masterRoute, !viewModel.routes.isEmpty {
    let segmentRoutes = viewModel.routes
    // Collect all unpaved sections from all segments
    var allSegmentsWithUnpaved: [Route] = []
    
    // Add the master route if it has unpaved sections
    if let unpaved = masterRoute.unpavedSections, !unpaved.isEmpty {
        allSegmentsWithUnpaved.append(masterRoute)
    }
    
    // Add all segments that have unpaved sections
    for segmentRoute in segmentRoutes {
        if let unpaved = segmentRoute.unpavedSections, !unpaved.isEmpty,
           let coordinates = segmentRoute.geojson?.features.first?.geometry.coordinates,
           !coordinates.isEmpty {
            allSegmentsWithUnpaved.append(segmentRoute)
        }
    }
    
    // Process each segment with unpaved sections
    for segmentRoute in allSegmentsWithUnpaved {
        if let coordinates = segmentRoute.geojson?.features.first?.geometry.coordinates, !coordinates.isEmpty {
            // Only add the unpaved segments for routes that aren't the current route
            // (the current route will already have its unpaved sections rendered)
            if segmentRoute.id != route?.id {
                RouteStyleUtils.addUnpavedSectionsOnly(to: mapView, coordinates: routeCoordinates, route: segmentRoute)
            }
        }
    }
}
```

## Visual Appearance

The unpaved sections are now rendered with:

1. Very fine dashed white lines (`[0.5, 0.5]` dash pattern)
2. Slightly wider than the main route line (6px vs 4px)
3. Subtle opacity (0.9) for better visibility
4. Consistent appearance across all route segments

## Result

The unpaved sections now properly render:

1. Immediately when the route is loaded
2. For all route segments, not just the selected one
3. With a consistent appearance at all zoom levels
4. Using proper error handling and retry mechanisms
