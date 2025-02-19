# Route Name Editing in Creation Mode

## Initial Approach

### Implementation
1. Added `updateRoute` method to RouteContext for local state updates
2. Modified RouteList for inline editing
3. Added state preservation until save

### Why It Failed
The implementation failed because:
1. The Uploader component has its own route name handling that reprocesses GPX files
2. Route finding logic was inconsistent between components
3. Error occurred when trying to find routes by routeId that didn't exist

Example error:
```
[Error] [Uploader] Route not found for rename: "route-c9b84a04-b560-4d34-8abd-27f353fcce74"
```

## New Approach

### 1. Unified Route Identification
- Use both routeId and id for finding routes
- Consistent route lookup across components:
```typescript
const findRoute = (id: string) => 
  routes.find(r => r.routeId === id || r.id === id);
```

### 2. Smart Name Updates
- Simple updates for quick name changes:
```typescript
const updateRouteName = (routeId: string, name: string) => {
  const route = findRoute(routeId);
  if (route) {
    updateRoute(routeId, { name });
  }
};
```

- Full reprocessing only when needed:
```typescript
const handleComplexUpdate = async (routeId: string, newName: string) => {
  const route = findRoute(routeId);
  if (route && route.rawGpx) {
    // Reprocess GPX with new name
    const file = new File([route.rawGpx], newName, { 
      type: 'application/gpx+xml' 
    });
    const result = await processGpx(file);
    // ... update with processed result
  } else {
    // Fall back to simple name update
    updateRouteName(routeId, newName);
  }
};
```

### 3. Component Integration
- RouteList: Uses simple name updates
- Uploader: Uses smart update logic
- Both components share the same route finding approach

### Benefits
1. Consistent behavior across components
2. Efficient updates (only reprocess when needed)
3. Better error handling with fallbacks
4. Maintains all existing functionality

### Technical Notes
- Route updates are atomic (all or nothing)
- State changes trigger appropriate UI updates
- Backward compatible with existing save system
- Handles both creation and edit modes properly
