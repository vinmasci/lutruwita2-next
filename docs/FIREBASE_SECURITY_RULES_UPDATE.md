# Firebase Security Rules Update

This document outlines the necessary updates to Firebase security rules to support public access to routes in the `user_saved_routes` collection.

## Current Issue

We're encountering a permission error when trying to access public routes in the `user_saved_routes` collection:

```
[Error] [firebasePublicRouteService] Error getting public route: – FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
```

This is because the current security rules for `user_saved_routes` require authentication for all operations:

```javascript
// Current rule
match /user_saved_routes/{document=**} {
  // Allow all operations if the user is authenticated
  allow read, write: if request.auth != null;
}
```

## Required Update

The security rules need to be updated to allow public access to routes that have `isPublic` set to `true`, while still requiring authentication for private routes and all write operations.

```javascript
// Updated rule
match /user_saved_routes/{routeId} {
  // Allow read if the route is public or if the user is authenticated
  allow read: if resource.data.isPublic == true || request.auth != null;
  // Allow write if the user is authenticated
  allow write: if request.auth != null;
  
  // Allow read access to subcollections of public routes
  match /{collection}/{document=**} {
    allow read: if get(/databases/$(database)/documents/user_saved_routes/$(routeId)).data.isPublic == true || request.auth != null;
    allow write: if request.auth != null;
  }
}
```

## Implementation Steps

1. Go to the Firebase Console
2. Navigate to Firestore Database > Rules
3. Update the rules for the `user_saved_routes` collection as shown above
4. Click "Publish" to apply the changes

## Verification

After updating the rules, test the application by:

1. Navigating to `/test-firebase-route/{routeId}` to verify that public routes can be accessed without authentication
2. Navigating to `/route/{routeId}` to verify that the route details page loads correctly

## Security Considerations

This update maintains security by:

1. Only allowing read access to routes that are explicitly marked as public
2. Requiring authentication for all write operations
3. Using the `get()` function to check the parent document's `isPublic` field for subcollections

The `get()` function does incur an additional read operation, but this is necessary to maintain security for subcollections.
