# POI State Loss Investigation - Simplified Approach

## Current Problem
We have a POI that exists in the UI but gets lost during save:
```
[Log] [RouteContext] Getting POIs from local state... (RouteContext.tsx, line 53)
[Log] [POIContext] Getting POIs for route. Current POIs: – [] (0) (POIContext.tsx, line 124)
```

## Key Insight
- We don't need routeId filtering
- All POIs on the map belong to the current route by default
- The state management is unnecessarily complex

## Simplified Solution

### Step 1: Print POI Details When Created
In POIDrawer.tsx, when a POI is created, we'll add a special console log:
```typescript
// When creating a POI:
console.log('[POI_DETAILS_FOR_MONGODB]', JSON.stringify({
  type: 'draggable',  // or 'place'
  name: "Rough Surface",
  position: {
    lat: -41.3415759662899,
    lng: 147.36648921331835
  },
  category: "road-information",
  icon: "ChevronsRightLeft"
}, null, 2));
```

### Step 2: MongoDB Retrieval
- MongoDB can retrieve these POIs directly from the server logs
- No need for complex state management or routeId filtering
- The POIs are already associated with the current route by being on the map

### Step 3: Remove Unnecessary Code
1. Remove routeId filtering from getPOIsForRoute
2. Remove routeId parameter from addPOI function
3. Simplify state management to just track current POIs

### Benefits
1. Simpler code - no complex state management
2. Direct data flow - POIs go straight to logs
3. No lost state - POIs are captured at creation time
4. Easy debugging - POI details are clearly logged
5. No need for routeId tracking - all POIs belong to current route

### Implementation Steps
1. Update POIDrawer.tsx to add detailed logging
2. Remove routeId filtering from POIContext.tsx
3. Simplify state management code
4. Let MongoDB handle POI retrieval from logs

This approach is much simpler and more reliable than the current complex state management system.
