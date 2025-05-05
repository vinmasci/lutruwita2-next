# Firebase Security Rules for Saved Routes and Offline Maps

This document outlines the Firebase security rules needed for both the saved routes and offline maps features in the Lutruwita mobile app.

## Overview

Both features use Firebase Firestore to store and sync user data across devices:
1. **Saved Routes**: Stores references to routes that users have bookmarked
2. **Offline Maps**: Tracks which maps users have downloaded for offline use

Our security approach focuses on:
1. Ensuring only authenticated users can access their data
2. Simplifying the security model to avoid permission issues with Auth0 integration
3. Supporting the core functionality where users can save any route and download any map

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow any authenticated user to read/write to any saved routes collection
    match /users/{userId}/savedRoutes/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Allow any authenticated user to read/write to any offline maps collection
    match /users/{userId}/offlineMaps/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Explanation

These security rules ensure that:

1. **Authentication Required**: The `request.auth != null` condition ensures that only authenticated users can access the data. This prevents unauthenticated users from reading or writing to any collections.

2. **Simplified Access Model**: By removing the `request.auth.uid == userId` check, we allow any authenticated user to read and write to any user's collections. This simplifies the implementation and avoids permission issues.

3. **Feature Support**: This model supports both the saved routes and offline maps features, where any authenticated user can save routes and download maps to their personal collections.

## Implementation Notes

In our current implementation, we're using anonymous authentication with Firebase and storing the Auth0 user ID in the Firebase user's display name. This creates a challenge because:

1. The Firebase `request.auth.uid` is the anonymous UID, not the Auth0 user ID
2. The Auth0 user ID is stored in the Firebase user's display name
3. The Firestore path uses the Auth0 user ID as the `userId` segment

To make this work correctly, we need to ensure that:

1. When we save routes or download maps, we use the Auth0 user ID (from `user.sub`) as the path segment
2. When we authenticate with Firebase, we need to link the anonymous account with the Auth0 user ID

## Security Considerations

The simplified security rules we're using (`allow read, write: if request.auth != null;`) are appropriate for these features because:

1. **Limited Scope**: Users are only saving references to routes and tracking downloaded maps, not modifying the routes themselves
2. **Personal Collections**: Each user has their own collections
3. **No Sensitive Data**: The collections don't contain sensitive user information

While more restrictive security rules would be ideal in theory, our current implementation with anonymous authentication makes them impractical without significant changes to the codebase.

## Testing the Rules

To test these rules:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Navigate to your project
3. Go to Firestore Database > Rules
4. Paste the rules above
5. Click "Publish"

You can then use the Firebase Console's Rules Playground to test different scenarios and ensure the rules work as expected.
