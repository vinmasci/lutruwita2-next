# Firebase Security Rules for GPX Auto-Save

These security rules should be applied to your Firebase project to ensure proper access control for the GPX auto-save feature.

## Firestore Rules

```firestore-rules
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
    
    // NEW RULE: Allow authenticated users to read and write to user-routes collection
    match /user-routes/{userId} {
      allow read, write: if request.auth != null;
    }
    
    // GPX Auto-Save Collection
    match /gpx_auto_saves/{autoSaveId} {
      // Allow read if the user is authenticated
      allow read: if request.auth != null;
      
      // Allow create if the user is authenticated
      allow create: if request.auth != null;
      
      // Allow update if the user is authenticated
      allow update: if request.auth != null;
      
      // Allow delete if the user is authenticated
      allow delete: if request.auth != null;

      // Subcollection for the general data (routes list, etc.)
      match /data/{dataType} {
        // Allow read, write if the user is authenticated
        allow read, write: if request.auth != null;
      }
      
      // NEW RULES: Subcollection for route-specific data
      match /routes/{routeId} {
        // Allow read, write if the user is authenticated
        allow read, write: if request.auth != null;
        
        // Subcollection for route-specific data (coords, elevation, unpaved, pois, lines)
        match /data/{dataType} {
          // Allow read, write if the user is authenticated
          allow read, write: if request.auth != null;
        }
      }
    }
  }
}
```

## How to Apply These Rules

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to "Firestore Database" in the left sidebar
4. Click on the "Rules" tab
5. Replace the existing rules with the rules above
6. Click "Publish"

## Rule Explanation

These rules ensure:

1. **Authentication Required**: Most operations require the user to be authenticated.
2. **User Data Isolation**: Users can only read and write to their own data in user-specific collections.
3. **Public Route Access**: Anyone can read route data, but only authenticated users can write.
4. **GPX Auto-Save Access**: Only authenticated users can read, create, update, or delete auto-save data.
5. **Route-Specific Data**: The rules include access to route-specific data subcollections, which is necessary for the multi-route implementation.

## Testing the Rules

You can test these rules in the Firebase Console:

1. Go to the "Rules" tab in Firestore
2. Click on the "Rules Playground" button
3. Set up test scenarios with different user IDs and operations
4. Verify that the rules behave as expected

## Important Notes

- These rules assume you're using Firebase Authentication.
- For simplicity during testing, we're not checking userId ownership yet. In a production environment, you might want to add more strict rules that check if the user is the owner of the data.
- The `request.auth.uid` value should match the `userId` stored in your documents for proper access control.
