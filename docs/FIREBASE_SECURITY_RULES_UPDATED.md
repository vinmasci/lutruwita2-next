# Updated Firebase Security Rules for Route-Centric Structure

## Overview

This document provides the updated Firebase security rules for the new route-centric data structure. These rules are designed to:

1. Allow public read access to route data for embedded maps
2. Restrict write access to authenticated users only
3. Maintain existing rules for user-specific collections

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing rules for user collections
    match /users/{userId}/savedRoutes/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /users/{userId}/offlineMaps/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /users/{userId}/mapTilerOfflineMaps/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /users/{userId}/offlineRoutes/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // New rules for route-centric data structure
    // Allow public read access to all route data
    match /routes/{routeId}/{collection}/{document=**} {
      allow read: if true;  // Anyone can read route data
      allow write: if request.auth != null;  // Only authenticated users can write
    }
    
    // Allow public read access to type index
    match /type_index/{type}/{routeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Explanation

### User Collections

The rules for user-specific collections remain unchanged. These collections require authentication for both read and write operations:

- `/users/{userId}/savedRoutes/{document=**}`
- `/users/{userId}/offlineMaps/{document=**}`
- `/users/{userId}/mapTilerOfflineMaps/{document=**}`
- `/users/{userId}/offlineRoutes/{document=**}`

### Route-Centric Structure

The new rules for the route-centric structure allow public read access to all route data, which is necessary for embedded maps. Write operations are restricted to authenticated users only.

The route-centric structure follows this pattern:

```
routes/
  ├── {routeId}/
  │     ├── metadata/
  │     │     └── info
  │     ├── geojson/
  │     │     └── routes
  │     ├── coordinates/
  │     │     ├── {routeSegmentId}/
  │     │     │     └── chunks/
  │     │     │           ├── chunk_0
  │     │     │           └── chunk_1
  │     │     └── another_segment_id/...
  │     ├── pois/
  │     │     └── data
  │     ├── lines/
  │     │     └── data
  │     └── photos/
  │           └── data
  └── {anotherRouteId}/...

type_index/
  ├── bikepacking/
  │     ├── {routeId}: true
  │     └── {anotherRouteId}: true
  ├── tourism/
  │     └── {routeId}: true
  └── event/
        └── {routeId}: true
```

The wildcard rule `match /routes/{routeId}/{collection}/{document=**}` covers all collections and documents within a route, allowing for a simpler and more maintainable security rule set.

## Implementation

To implement these security rules:

1. Go to the Firebase Console
2. Navigate to Firestore Database
3. Click on the "Rules" tab
4. Replace the existing rules with the rules provided above
5. Click "Publish"

## Considerations for Production

For a production environment, you might want to consider more restrictive rules, such as:

```javascript
// Only allow public read access to routes that are marked as public
match /routes/{routeId}/{collection}/{document=**} {
  allow read: if 
    // Public read access for routes marked as public
    get(/databases/$(database)/documents/routes/$(routeId)/metadata/info).data.isPublic == true
    // Or if the user is authenticated and is the owner of the route
    || (request.auth != null && get(/databases/$(database)/documents/routes/$(routeId)/metadata/info).data.userId == request.auth.uid);
  
  allow write: if request.auth != null && get(/databases/$(database)/documents/routes/$(routeId)/metadata/info).data.userId == request.auth.uid;
}
```

This would restrict read access to only public routes or routes owned by the authenticated user, and restrict write access to only the owner of the route.

However, for the purposes of testing the embedded maps, the simpler rules provided above should be sufficient.
