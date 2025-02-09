# Points of Interest (POI) Coordinate Format Migration

## Background

The Lutruwita application is a mapping tool that allows users to mark Points of Interest (POIs) on a map. These POIs can be either:
- Draggable POIs that can be placed anywhere on the map
- Place POIs that are attached to specific named locations

We recently discovered that POIs are not showing up on the map correctly. After investigation, we found that this is happening because:
1. Our POIs are using a different coordinate format than what Mapbox (our mapping library) expects
2. We have a redundant "places" array in our data model that's causing confusion

After analyzing the codebase and discussing the options, we decided to:
1. Change our POI coordinate format to match what Mapbox and our GPX files use
2. Remove the redundant places array to simplify the codebase

This document outlines the plan for implementing these changes.

## Current Issue

We have three different arrays of location data in the application, each using a different format:

1. Draggable POIs array uses object format (not showing on map):
```typescript
position: {
  lat: number,
  lng: number
}
```

2. Place POIs array uses object format (not showing on map):
```typescript
position: {
  lat: number,
  lng: number
}
```

3. Legacy places array uses array format (showing on map but redundant):
```typescript
coordinates: [number, number]  // [longitude, latitude]
```

The third array is redundant and needs to be removed, while the first two arrays need to be updated to use the array format because:
- Mapbox's native methods expect [lng, lat] array format
- GeoJSON uses [lng, lat] array format
- GPX data uses [lng, lat] array format

## Solution

We need to make two changes and consolidate our data storage:

1. Store POIs directly in the routes collection:
   - POIs will be embedded in route documents
   - No separate POIs collection needed
   - All POI operations will work directly with route documents
   - Simplifies data management and reduces database complexity

2. Update the coordinate format for both POI arrays (draggable and place POIs):
   - Change from `position: { lat, lng }` object format
   - To `coordinates: [lng, lat]` array format
   - This will make them show up on the map correctly
   - This will align with Mapbox GL, GeoJSON, and GPX formats

2. Remove the redundant third array (places):
   - This array is using the correct format but is redundant
   - Its functionality is already covered by the place POIs array
   - Removing it will simplify the codebase and prevent confusion

## Migration Progress

### Completed Changes
1. Data Storage Consolidation:
   - Removed separate POIs collection
   - POIs are now stored exclusively in routes collection
   - All POI operations work directly with route documents
   - Simplified database schema and queries

2. Updated POI Context:
   - Modified to work with embedded POIs in route documents
   - Removed dependency on POI service
   - Updated loadPOIsFromRoute to handle full POI objects
   - Simplified POI state management

2. Route Service Updates:
   - Modified to store full POI objects in route documents
   - Removed POI service dependency
   - Updated route model to use temporary IDs for POIs

3. Schema Updates:
   - Updated POI schema in route model to use array format for coordinates
   - Changed POI ID field from _id to id to support temporary IDs
   - Validated POI data structure in route documents

### Remaining Tasks
1. Clean Up:
   - Remove client-side POI service (poiService.ts)
   - Clean up any remaining POI service references
   - Consider removing server-side POI endpoints if no longer needed

2. Testing:
   - Test POI creation with temporary IDs
   - Test POI editing and position updates
   - Test POI loading from routes
   - Verify coordinate format in saved routes
   - Test place-attached POIs
   - Test drag-and-drop functionality

3. Documentation:
   - Update API documentation to reflect embedded POIs
   - Document POI state management changes
   - Update component documentation

## Implementation Details

### Coordinate Format
```typescript
// Old format
interface POIPosition {
  lat: number;
  lng: number;
}

// New format
type POICoordinates = [number, number]; // [longitude, latitude]
```

### MongoDB Schema Update
```typescript
// Old schema
position: {
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
}

// New schema
coordinates: {
  type: [Number],
  required: true,
  validate: {
    validator: function(v) {
      return v.length === 2;
    },
    message: 'Coordinates must be [longitude, latitude]'
  }
}
```

### Component Updates
- MapboxPOIMarker will use coordinates directly with setLngLat()
- POI creation will store coordinates in array format
- Drag-and-drop operations will work with array coordinates
- Place detection will return coordinates in array format

## Migration Strategy

1. Create new fields/types without removing old ones
2. Deploy changes that can work with both formats
3. Migrate existing data
4. Remove old format support
5. Clean up legacy code

## Backwards Compatibility

During migration:
1. POI model will support both formats temporarily
2. Services will handle both formats
3. UI components will expect new format but safely handle old format
4. Data migration will run as part of deployment

## Rollback Plan

1. Keep backup of database before migration
2. Maintain old field names until migration is verified
3. Keep transformation utilities for quick format conversion if needed
4. Document rollback procedures for each phase

## Verification Steps

After each phase:
1. Verify POIs render correctly
2. Check POI creation works
3. Validate drag-and-drop functionality
4. Confirm place detection works
5. Test GPX file integration
6. Verify database entries

## Notes

- Coordinate order is important: always [longitude, latitude]
- This matches GeoJSON spec and Mapbox GL expectations
- Migration should be transparent to end users
- Performance impact should be minimal
- Consider bulk operations for data migration
