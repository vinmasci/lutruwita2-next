# Firebase Query Fix for Swift App

## Issue

The Swift app was unable to display routes on the homepage due to a Firestore query limitation. The error in the logs showed:

```
❌ Error loading routes: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/cyatrails/firestore/indexes?create_composite=...
The query contains range and inequality filters on multiple fields, please refer to the documentation for index selection best practices: https://cloud.google.com/firestore/docs/query-data/multiple-range-fields.
```

## Root Cause

The issue was caused by a Firestore limitation when using:
1. Range filters on `statistics.totalDistance` (min and max)
2. Ordering by `updatedAt`
3. Equality filters on other fields (`isPublic`, `type`, etc.)

Firestore has restrictions on combining range filters with ordering, especially across different fields. While we had several composite indexes already created, we were missing the specific one needed for this query combination.

## Solution

Instead of creating a new index, we modified the code to work with existing indexes by:

1. **Removing range filters from the Firestore query**:
   - Removed `minDistance` and `maxDistance` filters from the Firebase query
   - Added a limit of 100 results to keep the query efficient

2. **Implementing client-side filtering**:
   - Added filtering in the Swift code after fetching results from Firebase
   - This allows us to filter by distance without requiring a specific Firebase index

## Code Changes

### 1. Modified `FirebaseService.swift`:
- Removed range filters on `statistics.totalDistance`
- Added a limit of 100 results to the query
- Kept equality filters which work with existing indexes
- Added more detailed logging for coordinate updates

### 2. Modified `RouteListViewModel.swift`:
- Changed distance range from `ClosedRange<Double>` to `PartialRangeFrom<Double>` to remove upper limit
- Removed distance range parameters from Firebase query
- Added client-side filtering based on the minimum distance only
- Improved logging to show distance values and filtering results
- Updated `resetFilters()` method to use the new range type

### 3. Modified `HomeView.swift`:
- Added `.id(viewModel.routes.count)` to force MapViewRepresentable recreation when routes change
- Stored route markers in a local variable to improve debugging
- Added onChange handler to track route changes

## Benefits

1. **Works with existing indexes**: No need to create additional Firebase indexes
2. **More flexible filtering**: Client-side filtering can be adjusted without changing database queries
3. **Better performance**: Limiting to 100 results keeps the query efficient
4. **Improved error handling**: Avoids Firestore query limitations

## Future Considerations

If the number of routes grows significantly (thousands+), we may want to revisit this approach:

1. Create the specific composite index in Firebase
2. Re-implement server-side filtering for better scalability
3. Consider pagination to handle large result sets efficiently

For now, the client-side filtering approach is sufficient and provides a good balance of flexibility and performance.

## Route Marker and Full Route Display Fix (May 2025)

### Issue

After implementing the query fix, we encountered another issue where route markers were not displaying on the map. The logs showed:

```
✅ Found 5546 coordinates for segment route-683dd1ae-983b-4930-af5b-478c1b191756
📍 Setting starting coordinate: lat=-44.687537, lng=169.130922
✅ Updated route NPm5zoKKnHCqE8NKHfbt with starting coordinate: lat=-44.687537, lng=169.130922
🔄 Route updated with coordinates: NPm5zoKKnHCqE8NKHfbt
🗺️ Getting route markers for map display
🔍 Route: NPm5zoKKnHCqE8NKHfbt, name: NZ Sth Island Trail Mix
🔍 startCoordinate: nil
🔍 routeCoordinates count: 0
❌ clCoordinate is nil
```

This indicated a race condition where coordinates were being loaded asynchronously after the routes array was returned, resulting in markers not having coordinates when displayed.

### Solution

We implemented a comprehensive fix with the following changes:

1. **Synchronous First Coordinate Loading**:
   - Completely rewrote the route loading code to load the first coordinate for each route *before* creating the route object
   - This ensures routes already have their marker coordinates when they're returned from the FirebaseService

2. **Full Route Rendering on Tap**:
   - Added a notification system to handle marker taps
   - Implemented a `loadFullRouteCoordinates` method in the RouteListViewModel that loads all coordinates for a specific route
   - Made the Firestore database reference accessible so the view model can directly query for route coordinates
   - Set up the map to automatically display polylines when coordinates are loaded

3. **Fixed Technical Issues**:
   - Resolved issues with immutable values by using a different approach to data handling
   - Updated Firestore cache settings to use the non-deprecated API
   - Improved error handling and logging throughout the process

### Code Changes

1. **Modified `FirebaseService.swift`**:
   - Changed the approach to load coordinates synchronously before returning routes
   - Made the Firestore database reference public for direct access
   - Updated to use non-deprecated Firestore cache settings
   - Improved error handling for coordinate loading

2. **Modified `RouteListViewModel.swift`**:
   - Added `loadFullRouteCoordinates` method to load all coordinates for a specific route
   - Enhanced `getRouteMarkers` to handle both marker-only and full route display
   - Improved logging for better debugging

3. **Modified `HomeView.swift`**:
   - Added notification observer for route marker taps
   - Set up handling to load full route coordinates when a marker is tapped
   - Enhanced map view to display route polylines when coordinates are available

### Benefits

1. **Immediate Marker Display**: Route markers now appear immediately when the map loads
2. **On-Demand Route Display**: Full route paths are loaded only when needed (when a marker is tapped)
3. **Better User Experience**: Users can see all available routes at a glance, then view details for routes they're interested in
4. **Improved Performance**: Loading only the necessary data at each step improves overall app performance

This implementation provides a smooth user experience while efficiently managing data loading and display.

## Related Documentation

For a comprehensive plan on implementing route details functionality in the Swift app, see:

- [SWIFT_ROUTE_DETAILS_IMPLEMENTATION_PLAN.md](SWIFT_ROUTE_DETAILS_IMPLEMENTATION_PLAN.md) - Detailed implementation plan for adding route details functionality to the CyaTrails Swift app, including:
  - Feature mapping between React Native and Swift implementations
  - Step-by-step implementation guide
  - Incremental testing plan
  - Integration with the Firebase implementation described in this document
