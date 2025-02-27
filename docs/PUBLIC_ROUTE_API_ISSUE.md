# Public Route API Issue Investigation

## Problem Description

We were encountering an issue with the public route API endpoint where the frontend was unable to parse the response from the API. The error occurred in `publicRoute.service.js` at line 21, which is the line where the response is being parsed as JSON:

```javascript
const data = await response.json();
```

The error message was:
```
SyntaxError: The string did not match the expected pattern.
```

This suggested that the API was returning a response that wasn't valid JSON or didn't match the expected format that the frontend was trying to parse.

## Fixes Implemented

We have implemented several fixes to resolve the issue:

### 1. Fixed Auth0 Configuration in Middleware

The issue was in the middleware.js file where it was looking for environment variables that didn't match what was defined in the .env file:

```javascript
// Before
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

// After
const AUTH0_DOMAIN = process.env.VITE_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || process.env.AUTH0_ISSUER_BASE_URL;
```

This fix ensures that the middleware can find the Auth0 configuration variables regardless of whether they're prefixed with VITE_ or not.

### 2. Simplified API Response Format

Modified the API handler to return the route data directly instead of wrapping it in an object:

```javascript
// Before
const publicRouteData = {
  route: routeData,
  message: 'Route loaded successfully'
};

// After
const publicRouteData = routeData;
```

This change ensures that the frontend receives the route data in the format it expects.

### 3. Updated Frontend Service to Handle Direct Response

Modified the RoutePresentation.js file to handle the direct route data format:

```javascript
// Before
// Handle different response formats
if (routeData.route) {
    // Format: { route: {...}, message: '...' }
    console.log('[RoutePresentation] Using route data from routeData.route');
    setRoute(routeData.route);
} else if (routeData._id || routeData.persistentId) {
    // Direct route object format
    console.log('[RoutePresentation] Using direct route data object');
    setRoute(routeData);
} else {
    console.error('[RoutePresentation] Unexpected route data format:', routeData);
    setError('Invalid route data format received from API');
}

// After
// The API now returns the route data directly
console.log('[RoutePresentation] Using direct route data object');
setRoute(routeData);
```

### 4. Updated Type Definitions

Updated the LoadPublicRouteResponse interface in the route.types.ts file to match the new API response format:

```typescript
// Before
export interface LoadPublicRouteResponse {
  route: PublicRouteDetails;
  message: string;
}

// After
// The API now returns the route data directly
export type LoadPublicRouteResponse = PublicRouteDetails;
```

### 5. Added File Extensions to Imports

Updated imports to include file extensions to ensure the correct files are being imported:

```javascript
// Before
import { publicRouteService } from '../../services/publicRoute.service';

// After
import { publicRouteService } from '../../services/publicRoute.service.js';
```

### 6. Added Missing Type Definition

Added the persistentId property to the PublicRouteMetadata interface:

```typescript
export interface PublicRouteMetadata {
  id: string;
  persistentId: string; // Added this property
  name: string;
  // ...other properties
}
```

### 7. Added Robust Redis Error Handling

Modified the API endpoints to gracefully handle Redis connection errors:

```javascript
// Before
const cachedRoute = await getCache(cacheKey);
if (cachedRoute) {
  return res.status(200).json(cachedRoute);
}

// After
let cachedRoute = null;
try {
  const cacheKey = `public-route:${publicId}`;
  cachedRoute = await getCache(cacheKey);
  
  if (cachedRoute) {
    console.log(`[API] Found route in cache`);
    return res.status(200).json(cachedRoute);
  }
} catch (cacheError) {
  // Log Redis error but continue without cache
  console.error(`[API] Redis cache error:`, cacheError.message);
  console.log(`[API] Continuing without cache...`);
}
```

This change ensures that if Redis is unavailable or encounters an error, the API will continue to function by fetching data directly from the database instead of failing.

### 8. Made Public Routes Truly Public

Updated the API handler to explicitly not require authentication for public routes:

```javascript
// Export the handler with middleware (no auth required for public routes)
export default createApiHandler(handler, { requireDb: true, requireAuth: false });
```

### 9. Fixed Route Loading in routeService.js

Modified the routeService.js file to handle both the old and new response formats from the API:

```javascript
// Before
const data = await handleResponse(response);
console.log('[routeService] Loaded route data:', data);
// Add detailed logging for route data
if (data.route && data.route.routes && data.route.routes.length > 0) {
    console.log('[routeService] First route details:', {
        id: data.route.routes[0].id,
        routeId: data.route.routes[0].routeId,
        hasGeojson: Boolean(data.route.routes[0].geojson),
        geojsonFeatures: data.route.routes[0].geojson?.features?.length || 0
    });
    if (!data.route.routes[0].geojson) {
        console.error('[routeService] Missing GeoJSON data in route');
    }
}
else {
    console.error('[routeService] No routes found in response');
}
return data;

// After
const data = await handleResponse(response);
console.log('[routeService] Loaded route data:', data);

// Handle both formats: data.route (old format) or data directly (new format)
// Check if the data has a 'route' property or if it has 'routes' directly
const routeData = data.route || data;

// Add detailed logging for route data
if (routeData && routeData.routes && routeData.routes.length > 0) {
    console.log('[routeService] First route details:', {
        id: routeData.routes[0].id,
        routeId: routeData.routes[0].routeId,
        hasGeojson: Boolean(routeData.routes[0].geojson),
        geojsonFeatures: routeData.routes[0].geojson?.features?.length || 0,
        persistentId: routeData.persistentId
    });
    
    if (!routeData.routes[0].geojson) {
        console.error('[routeService] Missing GeoJSON data in route');
    }
}
else {
    console.error('[routeService] No routes found in response');
}

// If the data doesn't have a 'route' property but has 'routes' directly,
// wrap it in a 'route' property to maintain compatibility with the rest of the code
if (!data.route && data.routes) {
    return { route: data };
}

return data;
```

This change ensures that the routeService can handle both the old format (where the route data is wrapped in a `route` property) and the new format (where the route data is returned directly).

## Current Status

We've made significant progress with the public routes API:

1. **Working Features**:
   - The landing page loads correctly and displays the list of public routes
   - Individual routes can be viewed in presentation mode (preview)
   - Redis connection errors are handled gracefully
   - The API doesn't require authentication for public routes

2. **Remaining Issues**:
   - Routes cannot be loaded in creation mode, with the following error:
     ```
     Error: Cast to ObjectId failed for value "67b56367-5952-4a2a-9eb9-63ab467b5636" (type string) at path "_id" for model "Route"
     ```
   - This suggests that the API is trying to use the persistentId as an ObjectId when querying the database in creation mode

The error occurs when trying to load a route in the editor/creation mode. The API endpoint is trying to convert the persistentId (which is a UUID string) to a MongoDB ObjectId, which is failing because UUIDs don't conform to the ObjectId format.

## Redis Connection Issue Analysis

We've successfully addressed the Redis connection issues:

1. **Redis Configuration Optimized for Serverless**:
   - Changed `enableOfflineQueue` to `false` to fail fast in serverless environments
   - Reduced connection timeouts and retry attempts
   - Disabled keepalive which isn't effective in serverless
   - Improved error handling to mark Redis as unavailable immediately on any error

2. **Graceful Fallback to Database**:
   - When Redis is unavailable, the system now gracefully falls back to the database
   - This ensures the application continues to function even without Redis

3. **Improved Error Handling**:
   - Added better error logging for Redis operations
   - Implemented proper cleanup of Redis connections on error

The Redis connection errors are now properly handled, and the application continues to function by retrieving data directly from the database when Redis is unavailable.

## Next Steps

1. **Fix Route Loading in Creation Mode**:
   - Modify the API endpoint to handle persistentId correctly when loading routes in creation mode
   - Update the route lookup logic to query by persistentId instead of trying to convert it to an ObjectId
   - Example fix in the API route handler:
     ```javascript
     // Before
     const route = await Route.findById(routeId);
     
     // After
     let route;
     if (mongoose.Types.ObjectId.isValid(routeId)) {
       route = await Route.findById(routeId);
     } else {
       // If not a valid ObjectId, try to find by persistentId
       route = await Route.findOne({ persistentId: routeId });
     }
     ```

2. **Redis Improvements**:
   - Consider using Vercel KV store instead of a separate Redis instance for better serverless compatibility
   - Implement more aggressive caching strategies for frequently accessed routes

3. **Error Handling Enhancements**:
   - Add more detailed error messages in the client to help diagnose issues
   - Implement better logging for database queries and results

4. **Testing**:
   - Create comprehensive tests for all route loading scenarios
   - Test with various route IDs and persistentIds to ensure all cases work correctly
