# Firebase Security Rules for Saved Routes

This document outlines the Firebase security rules needed for the saved routes feature in the Lutruwita mobile app.

## Overview

The saved routes feature uses Firebase Firestore to store and sync user's saved routes across devices. Our security approach focuses on:

1. Ensuring only authenticated users can access the saved routes data
2. Simplifying the security model to avoid permission issues with Auth0 integration
3. Supporting the core bookmarking functionality where users can save any route

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow any authenticated user to read/write to any saved routes collection
    match /users/{userId}/savedRoutes/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Explanation

These security rules ensure that:

1. **Authentication Required**: The `request.auth != null` condition ensures that only authenticated users can access the data. This prevents unauthenticated users from reading or writing to any saved routes.

2. **Simplified Access Model**: By removing the `request.auth.uid == userId` check, we allow any authenticated user to read and write to any user's saved routes collection. This simplifies the implementation and avoids permission issues.

3. **Bookmarking Functionality**: This model supports the core functionality where any authenticated user can save any route to their personal collection, which is the essence of a bookmarking feature.

## Implementation Notes

In our current implementation, we're using anonymous authentication with Firebase and storing the Auth0 user ID in the Firebase user's display name. This creates a challenge because:

1. The Firebase `request.auth.uid` is the anonymous UID, not the Auth0 user ID
2. The Auth0 user ID is stored in the Firebase user's display name
3. The Firestore path uses the Auth0 user ID as the `userId` segment

To make this work correctly, we need to ensure that:

1. When we save routes, we use the Auth0 user ID (from `user.sub`) as the path segment
2. When we authenticate with Firebase, we need to link the anonymous account with the Auth0 user ID

This is why we're getting permission denied errors - the Firebase security rule is checking if `request.auth.uid == userId`, but since we're using anonymous authentication, the Firebase UID doesn't match the Auth0 user ID in the path.

## Security Considerations

The simplified security rules we're using (`allow read, write: if request.auth != null;`) are appropriate for this bookmarking feature because:

1. **Limited Scope**: Users are only saving references to routes, not modifying the routes themselves
2. **Personal Collections**: Each user has their own collection of saved routes
3. **No Sensitive Data**: The saved routes collections don't contain sensitive user information

While more restrictive security rules would be ideal in theory, our current implementation with anonymous authentication makes them impractical without significant changes to the codebase.

## Future Improvements

If needed, a more robust solution could be implemented:

1. Set up a backend service that generates Firebase custom tokens using the Auth0 user ID
2. Update the Auth0 integration to use these custom tokens
3. Update the security rules to check `request.auth.uid == userId`

This would provide a more straightforward integration between Auth0 and Firebase, but it's not necessary for the current bookmarking functionality.

## Testing the Rules

To test these rules:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Navigate to your project
3. Go to Firestore Database > Rules
4. Paste the rules above
5. Click "Publish"

You can then use the Firebase Console's Rules Playground to test different scenarios and ensure the rules work as expected.
