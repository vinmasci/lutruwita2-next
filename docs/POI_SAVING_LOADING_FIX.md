# POI Saving and Loading Fix

## Issues
POIs (Points of Interest) were not being saved or deleted properly. When adding or deleting POIs and saving a route, the changes weren't showing up when the route was loaded again.

After investigating, we found two separate issues:

1. **Data Transformation Issue**: POIs were not being properly included in the transformed data structure when loading a route.
2. **Change Detection Issue**: The system wasn't detecting that POIs had changed, so they weren't being included in the save data.

## Root Cause Analysis

### Issue 1: Data Transformation
In `routeService.js`, the `saveRoute` function correctly included POIs in the data sent to the backend:
```javascript
const transformedData = {
    ...routeDataWithUserId,
    // Include POIs in the transformed data
    pois: routeData.pois || { draggable: [], places: [] },
    // ...other fields
};
```

However, when loading a route in the `loadRoute` function, there was an issue with how the data was transformed back into the client's expected format:
```javascript
// Transform the API response to match what the client expects
let transformedData = data;

// Check if this is the new API format (with data field but no routes array)
if (data.data && !data.routes) {
    // ... transformation logic for routes ...
}
```

The transformation logic focused on handling routes but didn't properly ensure that POIs were included in the transformed data structure.

### Issue 2: Change Detection
The console logs revealed that even though POIs were being detected, the system wasn't recognizing that they had changed:

```
[Log] [RouteContext] Starting save with: – {name: "Gembrook Explorer & Dandenong Gravel ", type: "event", isPublic: true}
[Log] [POIContext] Getting POIs for route, total POIs: – 1
[Log] [POIContext] Returning POIs for route: – {draggableCount: 1, placesCount: 0, totalCount: 1}
[Log] [RouteContext] Checking for local photos to upload...
[Log] [RouteContext] No local photos to upload
[Log] [RouteContext] Calculated route summary for save: – {totalDistance: 485.1, totalAscent: 12768, unpavedPercentage: 39, …}
[Log] [RouteContext] POIs have not changed, not adding to partial update
[Log] [RouteContext] Existing route - sending only changed sections: – ["routeSummary", "mapState", "routes"]
```

As shown in the logs, the system detected that there was 1 POI, but then decided "POIs have not changed, not adding to partial update". This was because the `changedSections.pois` flag wasn't being properly set when POIs were added or deleted.

## Solutions

### Fix 1: Data Transformation
I implemented a fix in the `loadRoute` function in `routeService.js` to ensure POIs are properly included in the transformed data structure:

```javascript
// Ensure POIs are included in the transformed data
if (data.pois && !transformedData.pois) {
    console.log('[routeService] Adding POIs to transformed data:', 
        data.pois.draggable?.length || 0, 'draggable POIs,', 
        data.pois.places?.length || 0, 'place POIs');
    transformedData.pois = data.pois;
} else if (!transformedData.pois) {
    console.log('[routeService] No POIs found in route data, initializing empty POIs');
    transformedData.pois = { draggable: [], places: [] };
}
```

This ensures that:
1. If POIs exist in the original data but not in the transformed data, they are added to the transformed data.
2. If no POIs exist, an empty POIs object is initialized to prevent null/undefined errors.

### Fix 2: Always Include POIs in Save Data
Instead of trying to track changes to POIs, I modified the `saveCurrentState` function to always include POIs in the save data, regardless of whether they've changed or not:

```javascript
// Always include POIs in the save data since they're small
console.log('[RouteContext] Always including POIs in save data:', {
    draggableCount: pois.draggable?.length || 0,
    placesCount: pois.places?.length || 0,
    totalCount: (pois.draggable?.length || 0) + (pois.places?.length || 0)
});
partialUpdate.pois = pois;
```

This approach is more reliable since POIs are small and there's no significant performance impact from always including them in the save data. It also eliminates the need to track changes to POIs, which was causing issues.

I also enhanced the logging in the POI context to better track when POIs are added or removed:

```javascript
// In addPOI function
console.log('[POIContext] Notifying RouteContext of POI changes (add)');
notifyPOIChange();

// In removePOI function
console.log('[POIContext] Notifying RouteContext of POI changes (remove)');
notifyPOIChange();
```

## Additional Improvements
I also added enhanced logging throughout the POI saving and loading process to make debugging easier in the future:

1. In `POIContext.js`:
   - Added detailed logging in `loadPOIsFromRoute` to track POI loading
   - Added detailed logging in `getPOIsForRoute` to track POI retrieval for saving
   - Added detailed logging in `addPOI` and `removePOI` to track POI changes

2. In `RouteContext.js`:
   - Added logging in `saveCurrentState` to track when POIs are included in the save data

These improvements will make it easier to diagnose any future issues with POI saving and loading.

## Testing
To verify the fix:
1. Add a new POI to a route
2. Save the route
3. Reload the route
4. Verify that the POI appears
5. Delete a POI
6. Save the route
7. Reload the route
8. Verify that the POI is gone

The console logs will show detailed information about the POI saving and loading process, making it easier to diagnose any issues.
