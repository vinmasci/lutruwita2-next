# Firebase Web Implementation for Saved Routes

This document provides a guide for implementing Firebase in the web app for the saved routes feature.

## 1. Install Firebase SDK

First, install the Firebase SDK in your web app:

```bash
cd /Users/vincentmasci/Desktop/lutruwita2-next
npm install firebase
```

## 2. Create Firebase Configuration File

Create a new file `src/services/firebaseService.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// Get this from Firebase Console > Project Settings > General > Your Apps > Firebase SDK snippet
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
```

## 3. Create Firebase Route Service

Create a new file `src/services/firebaseRouteService.js`:

```javascript
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseService';
import { useAuth } from '../context/AuthContext';

export const useFirebaseRouteService = () => {
  const { user } = useAuth();
  const userId = user?.sub;

  // Get a reference to the user's saved routes collection
  const getSavedRoutesRef = () => {
    if (!userId) throw new Error('User not authenticated');
    return collection(db, 'users', userId, 'savedRoutes');
  };

  // List all saved routes for the current user
  const listSavedRoutes = async () => {
    try {
      console.log(`[FirebaseRouteService] Listing saved routes for user: ${userId}`);
      const snapshot = await getDocs(getSavedRoutesRef());
      const routeIds = snapshot.docs.map(doc => doc.id);
      console.log(`[FirebaseRouteService] Found ${routeIds.length} saved routes`);
      return routeIds;
    } catch (error) {
      console.error('[FirebaseRouteService] Error listing saved routes:', error);
      throw error;
    }
  };

  // Save a route for the current user
  const saveRoute = async (routeId) => {
    try {
      console.log(`[FirebaseRouteService] Saving route ${routeId} for user: ${userId}`);
      await setDoc(doc(getSavedRoutesRef(), routeId), {
        savedAt: new Date(),
        routeId
      });
      console.log(`[FirebaseRouteService] Successfully saved route ${routeId}`);
      return true;
    } catch (error) {
      console.error(`[FirebaseRouteService] Error saving route ${routeId}:`, error);
      throw error;
    }
  };

  // Remove a saved route for the current user
  const removeRoute = async (routeId) => {
    try {
      console.log(`[FirebaseRouteService] Removing route ${routeId} for user: ${userId}`);
      await deleteDoc(doc(getSavedRoutesRef(), routeId));
      console.log(`[FirebaseRouteService] Successfully removed route ${routeId}`);
      return true;
    } catch (error) {
      console.error(`[FirebaseRouteService] Error removing route ${routeId}:`, error);
      throw error;
    }
  };

  // Check if a route is saved
  const isRouteSaved = async (routeId) => {
    try {
      console.log(`[FirebaseRouteService] Checking if route ${routeId} is saved`);
      const docRef = doc(getSavedRoutesRef(), routeId);
      const docSnap = await getDoc(docRef);
      const saved = docSnap.exists();
      console.log(`[FirebaseRouteService] Route ${routeId} is ${saved ? 'saved' : 'not saved'}`);
      return saved;
    } catch (error) {
      console.error(`[FirebaseRouteService] Error checking if route ${routeId} is saved:`, error);
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

## 4. Create SavedRoutesContext

Create a new file `src/context/SavedRoutesContext.js`:

```javascript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useFirebaseRouteService } from '../services/firebaseRouteService';
import { useRouteService } from '../services/routeService';
import { useAuth } from './AuthContext';

// Create context
const SavedRoutesContext = createContext();

// Provider component
export const SavedRoutesProvider = ({ children }) => {
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [savedRouteIds, setSavedRouteIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();
  const firebaseRouteService = useFirebaseRouteService();
  const routeService = useRouteService();

  // Initialize by loading routes from Firebase
  useEffect(() => {
    if (isAuthenticated) {
      loadSavedRoutesFromFirebase();
    } else {
      setSavedRoutes([]);
      setSavedRouteIds([]);
    }
  }, [isAuthenticated]);

  // Load saved routes from Firebase
  const loadSavedRoutesFromFirebase = async () => {
    if (!isAuthenticated) {
      console.log('[SavedRoutesContext] Not authenticated, cannot load routes from Firebase');
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
      const routeDetails = [];
      
      for (const routeId of routeIds) {
        try {
          const route = await routeService.getRoute(routeId);
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
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh saved routes
  const refreshSavedRoutes = async () => {
    await loadSavedRoutesFromFirebase();
  };

  // Check if a route is saved
  const isRouteSaved = useCallback((routeId) => {
    return savedRouteIds.includes(routeId);
  }, [savedRouteIds]);

  // Save a route
  const saveRoute = async (route) => {
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
      
      await firebaseRouteService.saveRoute(route.persistentId);
      
      // Update state immediately for UI responsiveness
      setSavedRouteIds(prev => [...prev, route.persistentId]);
      setSavedRoutes(prev => [...prev, route]);
      
      return true;
    } catch (error) {
      console.error('Error saving route:', error);
      setError(`Failed to save route: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  // Remove a saved route
  const removeRoute = async (routeId) => {
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
      
      await firebaseRouteService.removeRoute(routeId);
      
      // Update state immediately for UI responsiveness
      setSavedRouteIds(prev => prev.filter(id => id !== routeId));
      setSavedRoutes(prev => prev.filter(route => route.persistentId !== routeId));
      
      return true;
    } catch (error) {
      console.error('Error removing route:', error);
      setError(`Failed to remove route: ${error.message || 'Unknown error'}`);
      return false;
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
        refreshSavedRoutes
      }}
    >
      {children}
    </SavedRoutesContext.Provider>
  );
};

// Hook to use the saved routes context
export const useSavedRoutes = () => {
  const context = useContext(SavedRoutesContext);
  if (!context) {
    throw new Error('useSavedRoutes must be used within a SavedRoutesProvider');
  }
  return context;
};
```

## 5. Update App.js to Include the SavedRoutesProvider

Update your `App.js` or main component to include the SavedRoutesProvider:

```javascript
import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { SavedRoutesProvider } from './context/SavedRoutesContext';
import MainApp from './MainApp';

function App() {
  return (
    <AuthProvider>
      <SavedRoutesProvider>
        <MainApp />
      </SavedRoutesProvider>
    </AuthProvider>
  );
}

export default App;
```

## 6. Using the SavedRoutes Context in Components

Here's an example of how to use the SavedRoutes context in a component:

```javascript
import React from 'react';
import { useSavedRoutes } from '../context/SavedRoutesContext';

function RouteCard({ route }) {
  const { isRouteSaved, saveRoute, removeRoute } = useSavedRoutes();
  
  const handleSaveToggle = async () => {
    if (isRouteSaved(route.persistentId)) {
      await removeRoute(route.persistentId);
    } else {
      await saveRoute(route);
    }
  };
  
  return (
    <div className="route-card">
      <h3>{route.name}</h3>
      <p>{route.description}</p>
      <button onClick={handleSaveToggle}>
        {isRouteSaved(route.persistentId) ? 'Unsave' : 'Save'}
      </button>
    </div>
  );
}

export default RouteCard;
```

## 7. Environment Variables

Add the Firebase configuration to your environment variables:

For development, create a `.env.local` file in the root of your project:

```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

For production, add these environment variables to your hosting platform (e.g., Vercel).

## 8. Auth0 Integration with Firebase

To integrate Auth0 with Firebase, you'll need to:

1. Create a Firebase Admin SDK service account
2. Set up an Auth0 Action to generate Firebase custom tokens
3. Configure Auth0 to include Firebase UID in tokens

This is a more advanced topic and may require additional setup. Refer to the Auth0 and Firebase documentation for more details.
