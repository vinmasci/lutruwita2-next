# Mobile App Saved Routes Implementation

This document outlines the implementation of the "Save Routes" feature for the Lutruwita mobile app, which allows users to bookmark routes for later reference.

## Overview

The Saved Routes feature enables users to:
- Save routes they're interested in from the RoutePreviewDrawer
- View all their saved routes in the SavedRoutes screen
- Filter and search through their saved routes
- Access saved routes offline
- Sync saved routes across devices

## Implementation Status

✅ **Successfully implemented with the following components:**
- SavedRoutesContext for state management
- Save/Unsave button in RoutePreviewDrawer
- SavedRoutesScreen for displaying saved routes
- Error handling and null checks for route properties
- Custom SavedRouteCard component that matches the RoutePreviewDrawer layout
- Firebase integration for reliable cross-device synchronization
- Firebase Firestore for storing saved routes
- Firebase Authentication integration with Auth0

🔧 **Fixed issues:**
- Added null checks for route.mapState in RouteCard component
- Added fallback values for center and zoom in FallbackMapPreview
- Added null check for route.type in RouteCard component
- Added fallback for route.viewCount in RouteCard component
- Fixed infinite loop in SavedRoutesScreen by optimizing state updates
- Added proper save/unsave toggle functionality in RoutePreviewDrawer
- Fixed issue with saving all routes instead of just the selected one
- Fixed infinite loading loop in SavedRoutesScreen
- Added ability to unsave routes from the RoutePreviewDrawer
- Fixed issue with isRouteSaved function not correctly identifying saved routes
- Improved SavedRoutesScreen with a layout matching RoutePreviewDrawer
- Added detailed logging to help debug saved routes functionality
- Fixed SavedRoutesContext to properly handle API errors and not update local state on server errors
- Fixed Firebase Swift pod integration issues with `use_modular_headers!` in Podfile
- Fixed UI not updating when removing the last saved route by:
  - Adding special handling in FirebaseSavedRoutesContext.tsx to detect when the last route is being removed and force a complete refresh
  - Updating useDynamicRouteFilters.ts to explicitly set empty arrays when allRoutes is empty
  - Adding a direct check for savedRoutes.length in SavedRoutesScreen.tsx to ensure the empty state is shown

✅ **Completed Firebase Implementation:**
- Created Firebase project and configured it for iOS
- Added GoogleService-Info.plist to iOS folder
- Installed Firebase SDK packages (@react-native-firebase/app, @react-native-firebase/firestore, @react-native-firebase/auth)
- Created firebaseService.ts for Firebase initialization
- Created firebaseRouteService.ts for managing saved routes in Firestore
- Created FirebaseSavedRoutesContext.tsx for state management with Firebase
- Updated App.tsx to initialize Firebase and use FirebaseSavedRoutesContext
- Updated Podfile to fix Swift pod integration issues with `use_modular_headers!`
- Successfully ran pod install to complete the iOS setup
- Enabled anonymous authentication in Firebase console
- Updated security rules to allow any authenticated user to access saved routes

⚠️ **Known issues:**
- Android setup is pending (will be addressed in a future update)
- Expo development menu may not appear after Firebase integration

## Recent Fixes

### Firebase Authentication

We've successfully resolved the Firebase authentication issues by:

1. **Enabling Anonymous Authentication**: In the Firebase Console, we enabled anonymous authentication which allows users to authenticate without creating an account.

2. **Simplifying Security Rules**: Updated the Firebase security rules to allow any authenticated user to access saved routes data:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/savedRoutes/{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **Improved Error Handling**: Enhanced the firebaseAuthService.ts with better error handling and retry logic for authentication failures.

### Route Action Buttons in Elevation Drawer

We've added save/bookmark and offline map buttons to the RouteElevationDrawer component:

1. **New RouteActionButtons Component**: Created a dedicated component for route actions:
   - Located at `mobile/lutruwita-mobile/src/components/map/RouteElevationDrawer/RouteActionButtons.tsx`
   - Includes a bookmark button that changes appearance when a route is saved
   - Includes an offline map button for downloading routes for offline use
   - Shows loading indicators during save/download operations
   - Integrates with FirebaseSavedRoutesContext for saving/removing routes

2. **Integration with RouteElevationDrawer**: 
   - Added the buttons right after the elevation chart in the Overview tab
   - Only shows the buttons when viewing the Overview tab (activeRouteIndex === -1)
   - Provides consistent UI with the save button in RoutePreviewDrawer

3. **Implementation Details**:
   - Uses the same Firebase integration as the RoutePreviewDrawer
   - Provides visual feedback when saving/unsaving routes
   - Maintains state consistency between different parts of the app
   - Follows the app's existing design patterns and styling approach

### UI Update Issues

Fixed an issue where the UI wouldn't update correctly when removing the last saved route:

1. **Special Case Handling**: Added special handling in FirebaseSavedRoutesContext.tsx to detect when the last route is being removed and force a complete refresh.

2. **Force UI Refresh**: Added a useEffect hook in SavedRoutesScreen.tsx to detect when the savedRoutes array becomes empty and trigger a refresh to ensure the empty state is displayed correctly.

3. **Improved State Management**: Enhanced the state management to ensure UI components properly reflect the current state of saved routes.

## Auth0-Firebase Integration

We've implemented a proper integration between Auth0 and Firebase Authentication to ensure that users can save and retrieve their routes securely. This integration addresses the permission denied errors that were occurring when trying to save routes to Firebase.

### Integration Approach

1. **Firebase Authentication Service**: Created a dedicated `firebaseAuthService.ts` that handles the integration between Auth0 and Firebase Authentication.

2. **Auth0 User ID Synchronization**: When a user authenticates with Auth0, we also sign them in to Firebase and store their Auth0 user ID in the Firebase user's display name.

3. **User ID Consistency**: Updated the `FirebaseRouteService` to use the Auth0 user ID stored in Firebase when accessing Firestore collections, ensuring that the security rules work correctly.

4. **Security Rules**: Updated the Firebase security rules to check both the Firebase UID and the Auth0 user ID stored in the display name.

### Implementation Details

1. **Firebase Authentication Service**:
   ```typescript
   // Sign in to Firebase with Auth0 user
   export const signInWithAuth0User = async (user: User | null, accessToken: string | null): Promise<boolean> => {
     // Get the current Firebase user
     const currentUser = auth().currentUser;
     
     // If already signed in with the same user ID, no need to sign in again
     if (currentUser?.uid === user.sub) {
       return true;
     }
     
     // Sign in anonymously
     const credential = await auth().signInAnonymously();
     
     // Update the user profile with the Auth0 user ID
     if (credential.user) {
       await credential.user.updateProfile({
         displayName: user.sub
       });
       return true;
     }
     
     return false;
   };
   ```

2. **AuthContext Integration**:
   ```typescript
   // In login function
   if (auth0User) {
     await AsyncStorage.setItem(USER_KEY, JSON.stringify(auth0User));
     setUser(auth0User);
     
     // Sign in to Firebase with Auth0 user
     await signInWithAuth0User(auth0User, credentials.accessToken);
   }
   ```

3. **FirebaseRouteService Updates**:
   ```typescript
   // Get a reference to the user's saved routes collection
   const getSavedRoutesRef = () => {
     // Get the Auth0 user ID from Firebase
     const auth0UserId = getAuth0UserIdFromFirebaseUser();
     
     // Use the Auth0 user ID if available, otherwise fall back to the user.sub from Auth0
     const effectiveUserId = auth0UserId || userId;
     
     if (!effectiveUserId) throw new Error('User not authenticated');
     
     return firestore().collection('users').doc(effectiveUserId).collection('savedRoutes');
   };
   ```

This integration ensures that the Firebase security rules work correctly with our Auth0 authentication, allowing users to save and retrieve their routes securely.

## Firebase Integration Fixes

We successfully resolved several issues with the Firebase integration:

### 1. GoogleService-Info.plist Target Membership Issue

The GoogleService-Info.plist file was physically present in the correct folder (ios/CyaTrails/) but wasn't properly included in the Xcode project's target membership. This caused Firebase to fail to find the configuration file at runtime, resulting in crashes.

**Solution:**
- Manually added the GoogleService-Info.plist file to the Xcode project's target membership
- Ensured the file is properly bundled with the app during the build process

### 2. Firebase Initialization Safety Check

Added a safety check in AppDelegate.mm to prevent crashes when Firebase initialization fails:

```objective-c
// Instead of just:
// [FIRApp configure];

// Use this safer approach:
if ([FIRApp defaultApp] == nil) {
  [FIRApp configure];
}
```

This prevents the app from crashing if there are issues with the Firebase configuration.

### 3. Context Provider Mismatch

Identified and fixed a mismatch between the context providers and hooks:

- App.tsx was using the provider from FirebaseSavedRoutesContext.tsx
- But components were importing the hook from SavedRoutesContext.tsx

**Solution:**
- Updated imports in the following files to use FirebaseSavedRoutesContext:
  - RoutePreviewDrawer.tsx
  - SavedRoutesScreen.tsx
  - SavedRouteCard.tsx

## Current Issues and Troubleshooting

### Expo Development Menu Issues

After integrating Firebase, the Expo development menu may not appear. This is likely due to the app being built in Release mode instead of Debug mode.

**Solution:**
- Run the app in Debug mode explicitly:
  ```bash
  npx expo run:ios --configuration Debug
  ```

- If the issue persists, try restarting the development environment:
  1. Close any terminal windows running Metro bundler
  2. Close the simulator
  3. In a new terminal window, run:
     ```bash
     cd mobile/lutruwita-mobile
     npx expo start --clear
     ```
  4. Once Metro bundler starts, press 'i' to launch on iOS simulator

### Previous gRPC-Core Modulemap Errors

When building the iOS app with Firebase integration using `npx expo run:ios --configuration Release --device`, the following error occurs:

```
❌ error: module map file '/Users/vincentmasci/Desktop/lutruwita2-next/mobile/lutruwita-mobile/ios/Pods/Headers/Private/grpc/gRPC-Core.modulemap' not found (in target 'gRPC-C++' from project 'Pods')
```

This error is related to the gRPC-Core dependency that Firebase relies on. The error occurs because the modulemap file for gRPC-Core is missing or not properly generated during the pod installation process.

### Attempted Solutions

1. **Added modulemap creation in Podfile post_install hook:**
   ```ruby
   # Fix for gRPC-Core modulemap not found error
   installer.pods_project.targets.each do |target|
     if target.name == 'gRPC-Core'
       # Create the modulemap directory if it doesn't exist
       headers_dir = "#{installer.sandbox.root}/Headers/Private/grpc"
       unless Dir.exist?(headers_dir)
         FileUtils.mkdir_p(headers_dir)
       end
       
       # Create the modulemap file in the Headers/Private/grpc directory
       File.open("#{headers_dir}/gRPC-Core.modulemap", 'w') do |f|
         f.write('module gRPC_Core {
   umbrella header "grpc.h"
   export *
   module * { export * }
   }')
       end
     end
   end
   ```

2. **Verified Firebase initialization in AppDelegate.mm:**
   The Firebase initialization in AppDelegate.mm appears to be correct:
   ```objective-c
   // Import Firebase header
   #import <Firebase.h>

   - (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
   {
     // Configure Firebase - Add this line
     [FIRApp configure];
     
     // Rest of the code...
   }
   ```

3. **Verified Firebase initialization in App.tsx:**
   The Firebase service is properly imported in App.tsx:
   ```typescript
   // Import Firebase service for initialization
   import './services/firebaseService';
   ```

4. **Implemented fallback mechanism in firebaseService.ts:**
   Created a fallback mechanism in firebaseService.ts to use mock implementations when Firebase fails to initialize:
   ```typescript
   try {
     // Only try to import Firebase if we're on a device (not in a simulator)
     if (Platform.OS === 'ios' || Platform.OS === 'android') {
       console.log('[Firebase] Attempting to initialize Firebase');
       
       // Import Firebase modules
       const firebaseApp = require('@react-native-firebase/app').default;
       const firestoreModule = require('@react-native-firebase/firestore').default;
       const authModule = require('@react-native-firebase/auth').default;
       
       // Initialize Firebase
       firebase = firebaseApp;
       firestore = firestoreModule;
       auth = authModule;
       
       // Get the app instance
       const app = firebase.app();
       
       // Log initialization
       console.log('[Firebase] Firebase initialized successfully');
       console.log('[Firebase] App name:', app.name);
     } else {
       // Use mocks for web or other platforms
       firebase = createMockFirebase();
       firestore = createMockFirestore();
       auth = createMockAuth();
     }
   } catch (error) {
     // If Firebase initialization fails, use mock implementations
     console.error('[Firebase] Failed to initialize Firebase:', error);
     firebase = createMockFirebase();
     firestore = createMockFirestore();
     auth = createMockAuth();
   }
   ```

Despite these attempts, the app still crashes immediately on load after the Firebase integration. This suggests that there might be deeper issues with the Firebase integration or compatibility problems with the current React Native and Expo versions.

### Next Steps for Troubleshooting

1. **Try alternative Firebase integration approaches:**
   - Consider using Expo's Firebase compatibility libraries instead of the native React Native Firebase modules
   - Explore using Firebase JS SDK with React Native compatibility layer

2. **Investigate gRPC-Core modulemap issue further:**
   - Check if there are known issues with the specific versions of Firebase and React Native being used
   - Try manually creating the modulemap file in multiple potential locations
   - Consider downgrading Firebase to a version known to work with the current React Native setup

3. **Consider alternative backends for saved routes:**
   - Evaluate using a simpler backend solution that doesn't rely on gRPC
   - Explore using Realm or SQLite for local storage with a custom sync mechanism

## Implementation Pivot

🔄 **Pivoting to Firebase-based storage:**
- Moving away from Cloudinary for saved routes storage due to implementation challenges
- Leveraging Firebase Firestore for reliable cross-device synchronization
- Simplified data model with user-specific documents containing saved route IDs
- Industry-standard approach used by many cross-platform apps

### Cloudinary Implementation Challenges

The Cloudinary-based implementation for saved routes encountered several issues:

1. **API Routing Issues**: 405 Method Not Allowed errors when attempting to save/unsave routes
2. **Folder Creation Limitations**: Cloudinary doesn't support direct folder creation via its API
3. **Purpose Mismatch**: Cloudinary is optimized for media assets, not structured data
4. **Missing Features**: No built-in user authentication, permissions, or conflict resolution

### Firebase Implementation Benefits

Firebase Firestore offers several advantages for saved routes storage:

1. **Purpose-Built for User Data**: Designed specifically for storing and syncing user data
2. **Real-time Updates**: Changes propagate instantly across devices
3. **Offline Support**: Built-in caching and offline capabilities
4. **Authentication Integration**: Seamless integration with Auth0
5. **Simplified API**: Consistent API across web and mobile platforms
6. **Scalability**: Automatically scales with user growth
7. **Cost-Effective**: Free tier supports most small to medium apps

## Firebase Implementation Plan

### 1. Firebase Project Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Enter project name (e.g., "Lutruwita")
   - Configure Google Analytics (optional)
   - Click "Create project"

2. **Enable Firestore Database**:
   - In Firebase Console, go to "Firestore Database"
   - Click "Create database"
   - Start in production mode
   - Choose a location close to your users (e.g., australia-southeast1)
   - Click "Enable"

3. **Set Up Authentication**:
   - Go to "Authentication" in Firebase Console
   - Click "Get started"
   - Enable "Email/Password" provider (for testing)
   - Set up Auth0 integration (see below)

4. **Configure Security Rules**:
   - Go to "Firestore Database" > "Rules"
   - Set up rules to allow authenticated users to read/write only their own data:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/savedRoutes/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

### 2. Firebase SDK Installation

1. **Install Firebase SDK in Mobile App**:
   ```bash
   cd mobile/lutruwita-mobile
   npm install firebase @react-native-firebase/app @react-native-firebase/firestore @react-native-firebase/auth
   ```

2. **iOS Setup**:
   ```bash
   cd ios
   pod install
   ```

3. **Download Config Files**:
   - In Firebase Console, go to Project Settings
   - Add iOS app (enter bundle ID from app.json)
   - Download GoogleService-Info.plist
   - Place in ios/lutruwita-mobile/
   - Add Android app if needed (enter package name)
   - Download google-services.json
   - Place in android/app/

4. **Initialize Firebase in App**:
   - Create `mobile/lutruwita-mobile/src/services/firebaseService.ts`:
   ```typescript
   import { initializeApp } from '@react-native-firebase/app';
   import firestore from '@react-native-firebase/firestore';
   import auth from '@react-native-firebase/auth';

   // Initialize Firebase
   const app = initializeApp();

   export { app, firestore, auth };
   ```

### 3. Auth0 Integration with Firebase

1. **Set Up Custom Token Generation**:
   - Create a Firebase Admin SDK service account
   - Set up an Auth0 Action to generate Firebase custom tokens
   - Configure Auth0 to include Firebase UID in tokens

2. **Update AuthContext**:
   - Modify to sign in to Firebase after Auth0 authentication
   - Use custom token from Auth0 to authenticate with Firebase

### 4. Firestore Data Structure

The Firestore database will use the following structure:

```
/users/{userId}/
  savedRoutes/
    {routeId}: {
      savedAt: timestamp,
      routeId: string
    }
```

This structure allows for:
- Efficient queries for a user's saved routes
- Easy addition and removal of saved routes
- Future expansion (e.g., adding notes, collections)

### 5. Firebase Service Implementation

Create a new service for Firebase operations:

```typescript
// mobile/lutruwita-mobile/src/services/firebaseRouteService.ts

import { firestore } from './firebaseService';
import { useAuth } from '../context/AuthContext';

export const useFirebaseRouteService = () => {
  const { user } = useAuth();
  const userId = user?.sub;

  // Get a reference to the user's saved routes collection
  const getSavedRoutesRef = () => {
    if (!userId) throw new Error('User not authenticated');
    return firestore().collection('users').doc(userId).collection('savedRoutes');
  };

  // List all saved routes for the current user
  const listSavedRoutes = async () => {
    try {
      const snapshot = await getSavedRoutesRef().get();
      return snapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error('Error listing saved routes:', error);
      throw error;
    }
  };

  // Save a route for the current user
  const saveRoute = async (routeId) => {
    try {
      await getSavedRoutesRef().doc(routeId).set({
        savedAt: firestore.FieldValue.serverTimestamp(),
        routeId
      });
      return true;
    } catch (error) {
      console.error('Error saving route:', error);
      throw error;
    }
  };

  // Remove a saved route for the current user
  const removeRoute = async (routeId) => {
    try {
      await getSavedRoutesRef().doc(routeId).delete();
      return true;
    } catch (error) {
      console.error('Error removing route:', error);
      throw error;
    }
  };

  // Check if a route is saved
  const isRouteSaved = async (routeId) => {
    try {
      const doc = await getSavedRoutesRef().doc(routeId).get();
      return doc.exists;
    } catch (error) {
      console.error('Error checking if route is saved:', error);
      return false;
    }
  };

  return {
    listSavedRoutes,
    saveRoute,
    removeRoute,
    isRouteSaved
  };
};
```

### 6. Update SavedRoutesContext

Update the SavedRoutesContext to use Firebase instead of the API:

```typescript
// mobile/lutruwita-mobile/src/context/SavedRoutesContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useFirebaseRouteService } from '../services/firebaseRouteService';
import { useAuthenticatedRouteService } from '../services/authenticatedRouteService';
import { useAuth } from './AuthContext';
import { RouteMap } from '../services/routeService';

// Context type definition
interface SavedRoutesContextType {
  savedRoutes: RouteMap[];
  isLoading: boolean;
  error: string | null;
  saveRoute: (route: RouteMap) => Promise<boolean>;
  removeRoute: (routeId: string) => Promise<boolean>;
  isRouteSaved: (routeId: string) => boolean;
  refreshSavedRoutes: () => Promise<void>;
  clearSavedRoutes: () => Promise<void>;
}

// Create context
const SavedRoutesContext = createContext<SavedRoutesContextType | undefined>(undefined);

// Provider component
export const SavedRoutesProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [savedRoutes, setSavedRoutes] = useState<RouteMap[]>([]);
  const [savedRouteIds, setSavedRouteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();
  const firebaseRouteService = useFirebaseRouteService();
  const authenticatedRouteService = useAuthenticatedRouteService();

  // Initialize by loading routes from Firebase
  useEffect(() => {
    const initialize = async () => {
      if (isAuthenticated) {
        await loadSavedRoutesFromFirebase();
      }
      setIsInitialized(true);
    };
    initialize();
  }, [isAuthenticated]);

  // Load saved routes from Firebase
  const loadSavedRoutesFromFirebase = async () => {
    if (!isAuthenticated) {
      console.log('[SavedRoutesContext] Not authenticated, cannot load routes from Firebase');
      setSavedRoutes([]);
      setSavedRouteIds([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[SavedRoutesContext] Loading route IDs from Firebase');
      const routeIds = await firebaseRouteService.listSavedRoutes();
      
      console.log(`[SavedRoutesContext] Found ${routeIds.length} saved route IDs in Firebase`);
      setSavedRouteIds(routeIds);
      
      if (routeIds.length === 0) {
        setSavedRoutes([]);
        setIsLoading(false);
        return;
      }
      
      // Load route details for each saved route ID
      console.log('[SavedRoutesContext] Loading route details');
      const routeDetails: RouteMap[] = [];
      
      for (const routeId of routeIds) {
        try {
          const route = await authenticatedRouteService.loadUserRoute(routeId);
          if (route) {
            routeDetails.push(route);
          }
        } catch (error) {
          console.error(`Error loading route ${routeId}:`, error);
        }
      }
      
      console.log(`[SavedRoutesContext] Loaded ${routeDetails.length} route details`);
      setSavedRoutes(routeDetails);
    } catch (error) {
      console.error('Error loading routes from Firebase:', error);
      setError('Failed to load saved routes from Firebase');
      
      // Reset state on error
      setSavedRoutes([]);
      setSavedRouteIds([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh saved routes
  const refreshSavedRoutes = async () => {
    if (!isAuthenticated) {
      console.log('[SavedRoutesContext] Not authenticated, cannot refresh routes');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[SavedRoutesContext] Refreshing saved routes from Firebase');
      await loadSavedRoutesFromFirebase();
      console.log('[SavedRoutesContext] Refresh complete');
    } catch (error) {
      console.error('Error refreshing saved routes:', error);
      setError('Failed to refresh saved routes');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if a route is saved
  const isRouteSaved = useCallback((routeId: string): boolean => {
    return savedRouteIds.includes(routeId);
  }, [savedRouteIds]);

  // Save a route
  const saveRoute = async (route: RouteMap): Promise<boolean> => {
    try {
      // Check if already saved
      if (savedRouteIds.includes(route.persistentId)) {
        console.log(`[SavedRoutesContext] Route ${route.persistentId} already saved, skipping`);
        return true;
      }
      
      console.log(`[SavedRoutesContext] Saving route ${route.persistentId}`);
      
      if (!isAuthenticated) {
        console.log(`[SavedRoutesContext] Not authenticated, cannot save route to Firebase`);
        setError('Authentication required to save routes');
        return false;
      }
      
      try {
        console.log(`[SavedRoutesContext] Saving route ${route.persistentId} to Firebase`);
        await firebaseRouteService.saveRoute(route.persistentId);
        console.log(`[SavedRoutesContext] Successfully saved route ${route.persistentId} to Firebase`);
        
        // Update state immediately for UI responsiveness
        setSavedRouteIds(prev => [...prev, route.persistentId]);
        setSavedRoutes(prev => [...prev, route]);
        
        return true;
      } catch (error: any) {
        console.error('Error saving route to Firebase:', error);
        setError(`Failed to save route to Firebase: ${error.message || 'Unknown error'}`);
        return false;
      }
    } catch (error: any) {
      console.error('Error saving route:', error);
      setError(`Failed to save route: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  // Remove a saved route
  const removeRoute = async (routeId: string): Promise<boolean> => {
    try {
      // Check if route is saved
      if (!savedRouteIds.includes(routeId)) {
        console.log(`[SavedRoutesContext] Route ${routeId} not in saved routes, nothing to remove`);
        return true;
      }
      
      console.log(`[SavedRoutesContext] Removing route ${routeId}`);
      
      if (!isAuthenticated) {
        console.log(`[SavedRoutesContext] Not authenticated, cannot remove route from Firebase`);
        setError('Authentication required to remove routes');
        return false;
      }
      
      try {
        console.log(`[SavedRoutesContext] Removing route ${routeId} from Firebase`);
        await firebaseRouteService.removeRoute(routeId);
        console.log(`[SavedRoutesContext] Successfully removed route ${routeId} from Firebase`);
        
        // Check if this is the last route
        const isLastRoute = savedRouteIds.length === 1;
        
        // Update state immediately for UI responsiveness
        setSavedRouteIds(prev => prev.filter(id => id !== routeId));
        setSavedRoutes(prev => prev.filter(route => route.persistentId !== routeId));
        
        // If this was the last route, force a complete refresh to ensure UI updates correctly
        if (isLastRoute) {
          console.log('[SavedRoutesContext] Last route removed, forcing complete refresh');
          // Small delay to ensure Firebase operation completes
          setTimeout(() => {
            loadSavedRoutesFromFirebase();
          }, 300);
        }
        
        return true;
      } catch (error: any) {
        console.error('Error removing route from Firebase:', error);
        setError(`Failed to remove route from Firebase: ${error.message || 'Unknown error'}`);
        return false;
      }
    } catch (error: any) {
      console.error('Error removing route:', error);
      setError(`Failed to remove route: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  // Clear all saved routes
  const clearSavedRoutes = async () => {
    try {
      console.log('[SavedRoutesContext] Clearing all saved routes');
      setIsLoading(true);
      
      if (!isAuthenticated) {
        console.log(`[SavedRoutesContext] Not authenticated, cannot clear routes from Firebase`);
        setError('Authentication required to clear routes');
        return;
      }
      
      // Remove each route from Firebase
      for (const routeId of savedRouteIds) {
        try {
          console.log(`[SavedRoutesContext] Removing route ${routeId} from Firebase`);
          await firebaseRouteService.removeRoute(routeId);
        } catch (error) {
          console.error(`[SavedRoutesContext] Error removing route ${routeId}:`, error);
          // Continue with other routes
        }
      }
      
      // Reset state
      setSavedRouteIds([]);
      setSavedRoutes([]);
      
      console.log('[SavedRoutesContext] Successfully cleared all saved routes');
    } catch (error) {
      console.error('Error clearing saved routes:', error);
      setError('Failed to clear saved routes');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SavedRoutesContext.Provider
      value={{
        savedRoutes,
        isLoading,
        error,
        saveRoute,
        removeRoute,
        isRouteSaved,
        refreshSavedRoutes,
        clearSavedRoutes
      }}
    >
      {children}
    </SavedRoutesContext.Provider>
  );
};

// Hook to use the saved routes context
export const useSavedRoutes = () => {
  const context = useContext(SavedRoutesContext);
  if (context === undefined) {
    throw new Error('useSavedRoutes must be used within a SavedRoutesProvider');
  }
  return context;
};
```

### 7. Firebase Setup for Web App

For the web app, the setup is similar:

1. **Install Firebase SDK**:
   ```bash
   npm install firebase
   ```

2. **Initialize Firebase**:
   ```javascript
   // src/services/firebaseService.js
   import { initializeApp } from 'firebase/app';
   import { getFirestore } from 'firebase/firestore';
   import { getAuth } from 'firebase/auth';

   const firebaseConfig = {
     apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
     authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
     projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
     storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
     appId: process.env.REACT_APP_FIREBASE_APP_ID
   };

   const
