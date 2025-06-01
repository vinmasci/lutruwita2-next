# Route Stage Tabs Implementation Issues

## Problem Overview

The task was to implement scrollable tabs in a drawer at the bottom of the `RouteDetailView` to allow users to navigate between different stages of a route, similar to the React Native implementation shown in the screenshots. The current Swift implementation was missing this functionality, preventing users from navigating between multiple route stages.

## Core Implementation Issues

### 1. Firebase Data Retrieval Mismatch

The primary issue was in `FirebaseService.swift` where the code wasn't correctly fetching the route segments that make up a multi-stage route:

- **Expected Flow**: The `loadRoute` function should:
  1. Load the main route document
  2. Discover and load all segment IDs associated with this route
  3. Pass these segment IDs to the `RouteDetailViewModel` 
  4. Allow `RouteDetailViewModel` to load each segment's data
  5. Display tabs for each segment in the UI

- **Actual Flow**:
  1. The main route document was loaded correctly
  2. The segment discovery logic was broken, searching for segments in the wrong location
  3. No segment IDs were passed to `RouteDetailViewModel`
  4. Only a single segment (the first one) was ever loaded and displayed
  5. Therefore, no tabs were shown in the UI

### 2. Firebase Schema Misinterpretation

The code was searching for route segments in the wrong location due to a misunderstanding of the Firebase schema:

#### Original Incorrect Code:
```swift
// Load route segments from a document at path:
// user_saved_routes/{persistentId}/data/routes
let routesRef = db.collection("user_saved_routes").document(persistentId).collection("data").document("routes")
let routesDoc = try await routesRef.getDocument()
guard let routesData = routesDoc.data(), let routesArray = routesData["data"] as? [[String: Any]] else {
    throw NSError(domain: "FirebaseService", code: 404, userInfo: [NSLocalizedDescriptionKey: "Route segments not found"])
}
```

#### Actual Firebase Schema:
- Master route data is at: `user_saved_routes/{masterId}`
- Route segments are in a subcollection: `user_saved_routes/{masterId}/routes/{segmentId}`
- Segment geometry is in: `user_saved_routes/{masterId}/routes/{segmentId}/data/coords`

### 3. Wrong File Editing

A major mistake in the troubleshooting process was repeatedly editing a reference/documentation file (`docs/FirebaseService.swift`) instead of the actual source file (`mobile/CyaTrails/CyaTrails/Services/FirebaseService.swift`) that was being compiled. This wasted significant time and caused confusion.

## Fixes Implemented

1. **Correct Segment Discovery**:
   ```swift
   // Query the subcollection to get segment document IDs
   let segmentsSubCollectionRef = db.collection("user_saved_routes").document(persistentId).collection("routes")
   if let segmentDocumentsSnapshot = try? await segmentsSubCollectionRef.getDocuments(), !segmentDocumentsSnapshot.isEmpty {
       // Process segment documents
       print("[FirebaseService] Found \(segmentDocumentsSnapshot.documents.count) segment documents in subcollection.")
       // ...
   }
   ```

2. **Correct Geometry Fetching**:
   ```swift
   // For each segment, fetch its geometry from its data subcollection
   let segmentDataSubCollectionRef = segmentDocRef.collection("data")
   let coordsRef = segmentDataSubCollectionRef.document("coords")
   let unpavedRef = segmentDataSubCollectionRef.document("unpaved")
   ```

3. **Type Safety Fixes**:
   - Changed `try? Firestore.Decoder().decode(...)` (returns optional) to manual dictionary parsing with defaults for non-optional `statistics` and `metadata` fields in the `Route` model.

4. **Logging**:
   - Added extensive `print` statements with the `[FirebaseService]` prefix to trace data flow.
   - These logs help identify:
     - If segment IDs are discovered
     - If segment metadata and geometry are successfully fetched
     - The final count of segments passed to the `RouteDetailViewModel`

## Root Cause Analysis

The problem stemmed from a mismatch between the expected Firebase schema and the actual schema used for multi-stage routes. The code was looking for segments in a document with a data array, while the actual implementation uses a subcollection of documents.

This issue was exacerbated by the wrong file being edited repeatedly, which prevented the actual source code from being corrected.

## Updates and Fixes (May 18, 2025)

Several additional issues were identified and fixed to fully resolve route rendering problems:

1. **Distance Display Formatting**:
   - Fixed inconsistent display of distances in kilometers
   - Updated RouteStatistics to properly handle units (meters to km conversion)
   - Modified ElevationDrawerView to display distances with one decimal place

2. **Unpaved Section Rendering**:
   - Fixed FirebaseService to properly load and parse unpaved section data
   - Enhanced parsing to handle both coordinate-based and index-based unpaved sections
   - Added detailed logging to track unpaved section loading progress
   - Updated RouteStyleUtils to render unpaved sections as white lines

3. **Compatibility Issues**:
   - Removed incompatible properties (lineDasharray, lineCap, lineJoin) that were causing build errors
   - Ensured proper styling for unpaved sections without requiring unsupported SDK features

4. **Schema Documentation**:
   - Updated FIREBASE_MULTISTAGE_ROUTE_SCHEMA_UPDATED.md with detailed information about unpaved sections

These changes ensure that all route segments and their unpaved sections are properly loaded and displayed on the map. The routes now render correctly with appropriate visual styles.

## Next Steps

1. **Verify Implementation**: Run the app and check if the stage tabs appear and function correctly.
2. **Add Loading State**: Ensure the UI handles the asynchronous loading of route segments gracefully.
3. **Error Handling**: Add more robust error handling to deal with missing segments or geometry data.
4. **Consider File Organization**: Possibly rename or move the `docs/FirebaseService.swift` file to prevent future confusion with the actual source file.
5. **Consider Dashed Line Support**: Investigate if a future version of the Mapbox SDK might support dashed lines for unpaved sections.
