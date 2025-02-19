# Route Persistent ID System

## Problem
When updating a route that has already been created, we duplicate the file and save it with a new MongoDB ID, then delete the original. This is done to prevent duplicating GPX information and making the file too large. However, this approach causes the MongoDB ID to change every time we save, making it difficult to track routes from the landing page.

## Solution
We implemented a persistent ID system that maintains a consistent identifier for routes across updates:

1. When a new route is created:
   - Generate a new UUID as the persistentId
   - Save it along with the route data
   - This persistentId remains constant for the life of the route

2. When updating an existing route:
   - Find the existing route using the persistentId
   - Create a new document with the updated data
   - Copy over the persistentId from the old document
   - Delete the old document
   - The MongoDB _id changes, but the persistentId stays the same

3. When loading/referencing routes:
   - Use persistentId instead of MongoDB _id for all operations
   - This ensures consistent tracking even as the underlying documents are replaced

## Implementation Changes

### Backend Changes
1. Route Service (server/src/features/route/services/route.service.ts):
   - Updated to use persistentId for finding existing routes
   - Modified delete operation to use persistentId
   - Maintains same persistentId when creating new versions

2. Route Controller (server/src/features/route/controllers/route.controller.ts):
   - Updated to use persistentId in parameters
   - Modified error messages to reference persistentId

3. Route Routes (server/src/features/route/routes/route.routes.ts):
   - Changed route parameters to use persistentId
   - Updated endpoint paths to reflect persistentId usage

### Frontend Changes
1. Route Service (src/features/map/services/routeService.ts):
   - Modified API endpoints to use persistentId
   - Updated request/response handling for persistentId

2. Landing Page (src/features/presentation/components/LandingPage/LandingPage.tsx):
   - Updated route preview links to use persistentId instead of _id

## Adding PersistentId to Existing Routes
To add persistentId to existing routes in MongoDB Atlas, use these shell commands:

```js
// Get routes without persistentId
var routes = db.routes.find({ persistentId: { $exists: false } }).toArray()

// Add persistentId to each route
routes.forEach(route => {
  var uuid = ObjectId().toString() + ObjectId().toString();
  var persistentId = uuid.substr(0,8) + '-' + uuid.substr(8,4) + '-4' + uuid.substr(12,3) + '-' + uuid.substr(15,4) + '-' + uuid.substr(19,12);
  db.routes.updateOne(
    { _id: route._id },
    { $set: { persistentId: persistentId } }
  )
})

// Verify all routes have persistentId
db.routes.find({ persistentId: { $exists: false } }).count()  // Should be 0
```

## Benefits
1. Consistent route tracking across updates
2. Prevents GPX data duplication
3. Maintains referential integrity in the frontend
4. Simplifies route management and tracking
5. Enables reliable route sharing and linking
6. Improves user experience with stable URLs
