# Route Data Size Optimization

This document outlines potential optimizations to reduce the size of route data stored in MongoDB.

## Current MongoDB Data Structure
```javascript
// Example of current route document
{
  "_id": {"$oid":"67ab995cda7d1422361ded62"},
  "name": "Test2",
  "type": "tourism",
  "isPublic": false,
  "userId": "google-oauth2|104387414892803104975",
  "viewCount": {"$numberInt":"0"},
  "mapState": {
    "zoom": {"$numberInt":"0"},
    "center": [{"$numberInt":"0"},{"$numberInt":"0"}],
    "bearing": {"$numberInt":"0"},
    "pitch": {"$numberInt":"0"}
  },
  "routes": [{
    "routeId": "route-f218ab27-3565-4d7e-a8fe-cefa0774cc6f",
    "matchedIndices": [],
    "name": "test2",
    "color": "#ff4d4d",
    "isVisible": true,
    "gpxData": "...", // ~50KB stringified GeoJSON
    "geojson": {...}, // ~80KB GeoJSON object
    "mapboxMatch": {...}, // ~30KB unused data
    "debug": {...} // Additional debug data
  }]
}
```

## Implementation Plan

### Files to Modify

1. Server-side Changes:
   - `server/src/services/gpx/gpx.processing.ts`
   - `server/src/shared/types/gpx.types.ts`
   - `server/src/features/route/models/route.model.ts`

2. Frontend Changes (Type Updates):
   - `src/features/map/types/route.types.ts`
   - `src/features/gpx/types/gpx.types.ts`

### Current Status

#### Phase 1: Map Matching Removal (✅ Complete, ~30KB savings)
- Removed matchToMapbox method and service
- Removed mapboxMatch data from storage
- Removed client-side map matching code
- Updated processing pipeline
- Removed mapMatchingService.ts

#### Phase 2: Data Cleanup (🔄 In Progress)
Next Priority:
- Remove gpxData string storage (~50KB savings)
  - Currently storing both gpxData and geojson
  - Only geojson is needed since it contains same data

Already Done:
- Removed debug information (~5KB)
- Removed empty arrays
- Removed default values
- Coordinate rounding (5 decimal places)
- Elevation rounding (1 decimal place)

#### Phase 3: Testing (⏳ Not Started)
- Create test suite for optimized processing
- Verify route display still works
- Check elevation profiles remain accurate
- Validate surface visualization
- Compare file sizes before/after
- Load test with optimized data

#### Phase 4: Final Cleanup (⏳ Not Started)
- Remove Mapbox token requirement (keeping for elevation)
- Remove any remaining references to map matching

### Expected Size Impact

Current average route document:
```javascript
{
  gpxData: ~50KB (stringified GeoJSON)
  geojson: ~80KB (full object with metadata)
  mapboxMatch: ~30KB (unused data)
  debug: ~5KB
  other fields: ~3KB
  Total: ~168KB
}
```

After optimization:
```javascript
{
  geojson: ~80KB (with optimized precision)
  other fields: ~3KB
  Total: ~83KB
}
```

Immediate savings: ~49% reduction in document size

### Verification Queries

Use these MongoDB queries to verify optimization results:

```javascript
// Check document sizes
db.routes.aggregate([
  {
    $project: {
      _id: 1,
      totalSize: { $bsonSize: "$$ROOT" },
      geojsonSize: { $bsonSize: "$routes.geojson" }
    }
  }
])

// Verify removed fields
db.routes.findOne({
  $or: [
    { "routes.gpxData": { $exists: true } },
    { "routes.mapboxMatch": { $exists: true } },
    { "routes.debug": { $exists: true } }
  ]
})
```

### Future Considerations

1. Consider implementing MongoDB compression at collection level
2. Monitor impact on query performance
3. Track API response times with optimized data
4. Consider implementing lazy loading for large routes
5. Evaluate need for data versioning system

The implementation focuses on removing unused data and optimizing storage formats while maintaining all functionality. The changes are designed to be implemented incrementally, with each phase being independently verifiable.
