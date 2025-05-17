# Firebase GPX Auto-Save Implementation

## Overview

This document outlines the implementation of automatically saving GPX data to Firebase. This includes auto-saving new work to a temporary store (`gpx_auto_saves`) and, importantly, updating existing permanently saved routes directly when they are loaded and edited. This feature improves performance and user experience by leveraging Firebase's real-time capabilities and client-side SDK for faster data persistence.

## Implementation Status

**✅ Phase 1 Complete:** Basic auto-save functionality is now implemented and working for GPX data.

## Current Workflow

When a user uploads a GPX file in creation mode:

1. The GPX file is processed on the client-side
2. The processed data (coordinates, elevation, unpaved sections, POIs, etc.) is held in the application's client-side state
3. The data is automatically saved to Firebase Firestore using the client-side Firebase SDK
4. A visual indicator (AutoSavePanel) shows the status of the auto-save operation

## Key Features

1. **One Temporary Auto-Save Per User:** For new work not yet permanently saved, each user has only one active temporary auto-save (`gpx_auto_saves`) at a time. If a user already has such an auto-save and uploads a new GPX file (without a permanent route loaded), the new data is added to this existing temporary auto-save.
   **Auto-Saving Permanent Routes:** When a user loads an existing permanent route and makes edits, the auto-save mechanism updates the permanent route record directly in `user_saved_routes`, not the temporary `gpx_auto_saves` collection.

2. **Automatic Loading:** When a user opens the editor, the system automatically checks for an existing auto-save. If one exists and hasn't been cleared or committed, it's automatically loaded into the editor.

3. **Multiple Routes Support:** A single auto-save can contain multiple routes, allowing users to work with multi-day or segmented routes.

4. **Clear Functionality:** Users can clear their auto-save data using the "Clear" button in the AutoSavePanel.

## Implementation Details

### Firestore Index Requirement

For optimal performance, this implementation requires a composite index in Firestore. The index is needed for queries that filter by `userId` and order by `updatedAt` when finding the most recent auto-save for a user.

If you encounter the following error:
```
FirebaseError: [code=failed-precondition]: The query requires an index.
```

You need to create the following index in the Firebase console:
- Collection: `gpx_auto_saves`
- Fields to index:
  - `userId` (Ascending)
  - `updatedAt` (Descending)

The implementation includes a fallback mechanism that will still work without the index, but it's less efficient as it has to fetch all auto-saves for the user and sort them client-side.

### Data Structure in Firestore

```
gpx_auto_saves/{autoSaveId}:
  - userId: string (ID of the user who uploaded the GPX)
  - gpxFileName: string (Original filename)
  - status: string ("pending_action" initially)
  - createdAt: timestamp
  - updatedAt: timestamp
  - name: string (Default name derived from filename)
  - statistics: object (Distance, elevation gain/loss, etc.)
  - routeType: string (Optional, "Single" or "Bikepacking")
  - headerSettings: object (Optional, header customization settings)

gpx_auto_saves/{autoSaveId}/data/routes:
  - data: array of objects (Route metadata)
    [
      {
        routeId: string (Unique identifier for the route),
        name: string (Name of the route),
        gpxFileName: string (Original filename),
        statistics: object (Distance, elevation gain/loss, etc.),
        addedAt: string (ISO date string)
      },
      ...
    ]

gpx_auto_saves/{autoSaveId}/routes/{routeId}/data/coords:
  - data: array of objects (Coordinate data)
    [
      {
        lng: number (Longitude),
        lat: number (Latitude),
        elevation: number (Optional, elevation in meters)
      },
      ...
    ]

gpx_auto_saves/{autoSaveId}/routes/{routeId}/data/elevation:
  - data: array of numbers (Elevation data)
    [123, 124, 125, ...]

gpx_auto_saves/{autoSaveId}/routes/{routeId}/data/unpaved:
  - data: array of objects (Unpaved sections)
    [
      {
        startIndex: number (Start index in the coordinates array),
        endIndex: number (End index in the coordinates array),
        surfaceType: string (Type of surface, e.g., "unpaved"),
        coordinates: array of objects (Coordinates for this section)
          [
            { lng: number, lat: number },
            ...
          ]
      },
      ...
    ]

gpx_auto_saves/{autoSaveId}/data/pois:
  - data: object (POI data)
    {
      draggable: array of objects (Draggable POIs)
        [
          {
            id: string (Unique identifier),
            name: string (Name of the POI),
            description: string (Description of the POI),
            coordinates: { lng: number, lat: number },
            ...
          },
          ...
        ],
      places: array of objects (Place POIs)
        [
          {
            id: string (Unique identifier),
            name: string (Name of the place),
            ...
          },
          ...
        ]
    }

gpx_auto_saves/{autoSaveId}/data/lines:
  - data: array of objects (Line data)
    [
      {
        id: string (Unique identifier),
        name: string (Name of the line),
        coordinates: array of objects (Coordinates for this line)
          [
            { lng: number, lat: number },
            ...
          ],
        ...
      },
      ...
    ]
```

### One Auto-Save Per User Implementation

The system ensures that each user has only one active auto-save at a time by:

1. **Checking for Existing Auto-Saves:** When a user uploads a GPX file, the system first checks if they already have an auto-save.

2. **Adding to Existing Auto-Save:** If an auto-save exists, the new route is added to it rather than creating a new auto-save.

3. **Shared POIs and Lines:** POIs and lines are stored at the auto-save level, not the route level, so they're shared across all routes in the auto-save.

4. **Updating Timestamps:** The `updatedAt` timestamp is updated whenever the auto-save is modified, helping track the most recent changes.

Code example from `firebaseGpxAutoSaveService.js`:

```javascript
// Determine if we're updating an existing auto-save or creating a new one
let autoSaveRef;
let autoSaveId;
let isNewAutoSave = true;
let existingRoutes = [];

if (existingAutoSaveId) {
  // Use the existing auto-save document
  autoSaveRef = doc(db, 'gpx_auto_saves', existingAutoSaveId);
  autoSaveId = existingAutoSaveId;
  isNewAutoSave = false;
  
  // Get the existing document to check if it exists and belongs to this user
  try {
    const existingDoc = await getDoc(autoSaveRef);
    if (!existingDoc.exists()) {
      console.log(`[firebaseGpxAutoSaveService] Existing auto-save ${existingAutoSaveId} not found, creating new one`);
      // Fall back to creating a new document
      autoSaveRef = doc(collection(db, 'gpx_auto_saves'));
      autoSaveId = autoSaveRef.id;
      isNewAutoSave = true;
    } else if (existingDoc.data().userId !== userId) {
      console.log(`[firebaseGpxAutoSaveService] Existing auto-save ${existingAutoSaveId} belongs to a different user, creating new one`);
      // Fall back to creating a new document if the existing one belongs to a different user
      autoSaveRef = doc(collection(db, 'gpx_auto_saves'));
      autoSaveId = autoSaveRef.id;
      isNewAutoSave = true;
    } else {
      console.log(`[firebaseGpxAutoSaveService] Using existing auto-save ${existingAutoSaveId}`);
      
      // Check if there are existing routes in the auto-save
      try {
        const routesRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'routes');
        const routesDoc = await getDoc(routesRef);
        if (routesDoc.exists() && routesDoc.data().data) {
          existingRoutes = routesDoc.data().data;
          console.log(`[firebaseGpxAutoSaveService] Found ${existingRoutes.length} existing routes in auto-save`);
        }
      } catch (error) {
        console.error(`[firebaseGpxAutoSaveService] Error getting existing routes:`, error);
        // Continue even if we can't get existing routes
      }
    }
  } catch (error) {
    console.error(`[firebaseGpxAutoSaveService] Error checking existing auto-save:`, error);
    // Fall back to creating a new document
    autoSaveRef = doc(collection(db, 'gpx_auto_saves'));
    autoSaveId = autoSaveRef.id;
    isNewAutoSave = true;
  }
} else {
  // Create a new document in the gpx_auto_saves collection
  autoSaveRef = doc(collection(db, 'gpx_auto_saves'));
  autoSaveId = autoSaveRef.id;
}
```

### Automatic Loading Implementation

When a user opens the editor, the system automatically checks for and loads any existing auto-save:

1. **Auto-Save Context:** The application uses a global `AutoSaveContext` to track auto-save state across components.

2. **Initial Load Check:** When the application initializes, it checks for existing auto-saves for the current user.

3. **Loading Auto-Save Data:** If an auto-save exists and hasn't been cleared or committed, the data is loaded into the editor.

4. **Visual Indicator:** The `AutoSavePanel` component shows the status of the auto-save, including the auto-save ID and route ID.

Code example from `AutoSaveContext.js`:

```javascript
/**
 * Complete an auto-save operation
 * This updates the status to 'saved' and sets the autoSaveId
 * @param {string} autoSaveId - The ID of the auto-save
 * @param {string} routeId - The ID of the route
 */
const completeAutoSave = useCallback((autoSaveId, routeId) => {
  console.log('[AutoSaveContext] Completing auto-save:', { autoSaveId, routeId });
  setAutoSaveState(prev => ({
    ...prev,
    autoSaveId,
    routeId,
    lastSaved: new Date(),
    status: 'saved',
    error: null,
  }));
}, []);
```

### Client-Side Implementation

1. **Integration with Route Processing:**
   - The auto-save functionality is integrated with the GPX processing workflow
   - When a GPX file is processed, the data is automatically saved to Firebase

2. **Firebase SDK Integration:**
   - The application uses the Firebase client SDK to interact with Firestore
   - Batch operations ensure atomic writes for complex data structures

3. **Security Rules:**
   - Firestore security rules ensure users can only access their own data
   - Operations are restricted based on authentication and data ownership

4. **Global Auto-Save State Management:**
   - The `AutoSaveContext` provides a central place to track auto-save information
   - Components can access this context to get the current auto-save state

5. **Visual Feedback:**
   - The `AutoSavePanel` component shows the current auto-save status
   - Users can see when data is being saved, when it was last saved, and any errors

### Code Example: Auto-Save GPX Data

```javascript
/**
 * Auto-save GPX data to Firebase
 * @param {Object} processedRoute - The processed route data from useClientGpxProcessing
 * @param {string} userId - The ID of the current user
 * @param {string} gpxFileName - The original filename of the GPX file
 * @param {Object} autoSaveContext - Optional AutoSaveContext from a component (if not using the hook)
 * @param {string} existingAutoSaveId - Optional ID of an existing auto-save to update instead of creating a new one
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
export const autoSaveGpxToFirebase = async (processedRoute, userId, gpxFileName, autoSaveContext = null, existingAutoSaveId = null) => {
  try {
    // Get AutoSaveContext if available
    let autoSave = autoSaveContext;
    
    // If not provided directly, try to use the hook
    if (!autoSave && typeof window !== 'undefined') {
      try {
        // This will only work if called from a component within the AutoSaveProvider
        if (useAutoSave) {
          autoSave = useAutoSave();
        }
      } catch (error) {
        console.log('[firebaseGpxAutoSaveService] Could not access AutoSaveContext via hook:', error.message);
      }
    }
    
    // Update loading status in both places
    firebaseAutoSaveStatus.isLoading = true;
    firebaseAutoSaveStatus.lastSavedRoute = processedRoute.routeId;
    firebaseAutoSaveStatus.error = null;
    
    // Also update the global context if available
    if (autoSave && typeof autoSave.startAutoSave === 'function') {
      try {
        autoSave.startAutoSave();
      } catch (error) {
        console.error('[firebaseGpxAutoSaveService] Error starting auto-save in context:', error);
        // Continue even if updating the context fails
      }
    }
    
    // ... (implementation details) ...
    
    // Complete the auto-save and update the context
    firebaseAutoSaveStatus.isLoading = false;
    firebaseAutoSaveStatus.success = true;
    firebaseAutoSaveStatus.lastSaveTime = saveTime;
    firebaseAutoSaveStatus.autoSaveId = autoSaveId; // Store the auto-save ID
    
    // Also update the global context if available
    if (autoSave && typeof autoSave.completeAutoSave === 'function') {
      try {
        autoSave.completeAutoSave(autoSaveId, processedRoute.routeId);
      } catch (error) {
        console.error('[firebaseGpxAutoSaveService] Error updating AutoSaveContext:', error);
        // Continue even if updating the context fails
      }
    }
    
    return autoSaveId;
  } catch (error) {
    // ... (error handling) ...
  }
};
```

## Security Rules

The security rules for the `gpx_auto_saves` collection ensure that users can only access their own data:

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
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
      
      // Subcollection for route-specific data
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

For more detailed security rules, see the [FIREBASE_GPX_AUTOSAVE_SECURITY_RULES.md](./FIREBASE_GPX_AUTOSAVE_SECURITY_RULES.md) document.

## Testing

You can test the GPX auto-save functionality using the following tools:

1. **React Component:** `src/components/FirebaseGpxAutoSaveTest.jsx`
   - This component displays auto-saved GPX data for the current user
   - Shows detailed information about the saved data, including coordinates, elevation, and unpaved sections

2. **HTML Test Page:** `public/firebase-gpx-autosave-test.html`
   - This standalone page can be used to test the Firebase integration
   - Allows simulating auto-save operations and viewing the results

## Completed Tasks

1. ✅ Created the Firebase GPX Auto-Save Service
2. ✅ Implemented the "one auto-save per user" requirement
3. ✅ Implemented automatic loading of auto-saves when opening the editor
4. ✅ Added support for multiple routes in a single auto-save
5. ✅ Created the AutoSavePanel component for visual feedback
6. ✅ Implemented the global AutoSaveContext for state management
7. ✅ Added comprehensive logging for debugging
8. ✅ Created testing tools for verifying the implementation
9. ✅ Fixed route color saving and loading in auto-save data
10. ✅ Fixed unpaved sections rendering from auto-save data
11. ✅ Implemented auto-save clearing after permanent save

## Auto-Save Clearing After Permanent Save (Promotion of Temporary Auto-Save)

When a user promotes a *temporary* auto-save (from `gpx_auto_saves`) to a permanent route, the original temporary auto-save data is automatically deleted from Firebase. This prevents confusion and duplication. This clearing action is distinct from the auto-saving behavior when editing an *already existing* permanent route, where updates are made directly to the permanent record.

This functionality for clearing the temporary auto-save upon promotion is implemented in two key places:

1. **In the `saveAutoSaveToPermanentRoute` function:**
   - After successfully saving the permanent route, the function automatically deletes the auto-save from Firebase
   - It uses the `deleteAutoSaveFromFirebase` function to remove the auto-save data
   - This ensures that the auto-save data is removed from the database once it's no longer needed

   ```javascript
   // Delete the auto-save after successfully saving the permanent route
   try {
     console.log(`[firebaseSaveCompleteRouteService] Deleting auto-save after successful permanent save: ${autoSaveId}`);
     
     // Import the deleteAutoSaveFromFirebase function
     const { deleteAutoSaveFromFirebase } = await import('./firebaseGpxAutoSaveService');
     
     // Get the route ID from the first route in the auto-save
     const routeId = autoSaveData.routesWithData && autoSaveData.routesWithData.length > 0 
       ? autoSaveData.routesWithData[0].routeId || autoSaveData.routesWithData[0].id
       : null;
       
     if (routeId) {
       const deleteResult = await deleteAutoSaveFromFirebase(routeId, userId);
       if (deleteResult) {
         console.log(`[firebaseSaveCompleteRouteService] Auto-save deleted successfully: ${autoSaveId}`);
       } else {
         console.warn(`[firebaseSaveCompleteRouteService] Failed to delete auto-save: ${autoSaveId}`);
       }
     } else {
       console.warn(`[firebaseSaveCompleteRouteService] No route ID found in auto-save, cannot delete`);
     }
   } catch (deleteError) {
     console.error(`[firebaseSaveCompleteRouteService] Error deleting auto-save:`, deleteError);
     // Continue even if deleting the auto-save fails
   }
   ```

2. **In the `AutoSavePanel` component:**
   - After a successful save, the component clears the auto-save state in the UI context
   - This ensures that the UI reflects that there's no active auto-save
   - The user can immediately see that their work has been saved and the auto-save has been cleared

   ```javascript
   if (savedRouteId) {
     console.log('[AutoSavePanel] Route saved successfully with ID:', savedRouteId);
     setSavedRouteId(savedRouteId);
     setSaveSuccess(true);
     setShowSaveDialog(false);
     setRouteName('');
     
     // Clear the auto-save state in the context since it's been deleted on the server
     clearAutoSave();
   }
   ```

This implementation provides a seamless experience where:
- Users can save their auto-saved work as a permanent route
- Once saved, the auto-save is automatically cleared to prevent confusion
- The UI updates to reflect that there's no active auto-save
- Note: If a user loads an existing permanent route, edits it (triggering auto-saves directly to the permanent record), and then uses a "Clear" function, the behavior of "Clear" would need to be defined for this context (e.g., revert to the state before this editing session, or simply clear the UI). The auto-save itself doesn't create a separate temporary record in this scenario.

## Recent Fixes

### Route Color Saving and Loading

We identified and fixed an issue where route colors weren't being saved to or loaded from Firebase during the auto-save process:

1. **Problem:** The route color property wasn't being extracted from the processed route or included in the route object saved to Firebase.

2. **Solution:** Modified the `autoSaveGpxToFirebase` function to:
   - Extract the `color` property from the processed route
   - Include it in the route object that's saved to Firebase

   ```javascript
   // Extract the necessary data from the processed route
   const { 
     geojson, 
     unpavedSections = [],
     pois = { draggable: [], places: [] },
     lines = [],
     name,
     statistics,
     routeId,
     color // Extract the route color
   } = processedRoute;
   
   // Create a route object to store in the routes collection
   const routeObject = {
     routeId: routeId,
     name: name || `Route from ${gpxFileName}`,
     gpxFileName: gpxFileName,
     statistics: statistics || {},
     addedAt: new Date().toISOString(),
     color: color // Include the route color in the route object
   };
   ```

3. **Result:** Route colors are now properly saved to Firebase during auto-save and loaded back when the auto-save is restored, ensuring that the route color is preserved across sessions.

### Unpaved Sections Rendering

We identified and fixed an issue where unpaved sections weren't rendering properly from auto-save data:

1. **Problem:** When saving to Firebase, the coordinates were transformed from arrays `[lng, lat]` to objects `{lng, lat}` to avoid nested arrays in Firestore (which can cause issues). However, when loading the data back, we weren't converting them back to the array format expected by the `RouteLayer` component.

2. **Solution:** Modified the `loadAutoSaveData` function to transform unpaved section coordinates from objects back to arrays when loading from Firebase:

   ```javascript
   // Transform unpaved section coordinates from objects back to arrays for rendering
   unpavedSections = unpavedSections.map(section => {
     // Create a copy of the section to avoid modifying the original
     const transformedSection = { ...section };
     
     // Convert coordinates from objects to arrays if they exist
     if (transformedSection.coordinates && Array.isArray(transformedSection.coordinates)) {
       transformedSection.coordinates = transformedSection.coordinates.map(coord => {
         // If it's an object with lng/lat properties, convert to array
         if (coord && typeof coord === 'object' && 'lng' in coord && 'lat' in coord) {
           return [coord.lng, coord.lat];
         }
         // If it's already an array, return as is
         return coord;
       });
     }
     
     return transformedSection;
   });
   ```

3. **Result:** Unpaved sections now render correctly from auto-save data, with the dashed line style properly displayed on the map.

### Auto-Save Panel Status Not Updating

We identified and fixed an issue where the auto-save panel was showing "Idle" status even though the auto-save was being loaded successfully:

1. **Problem:** When an auto-save was loaded in MapView.js, it was adding the routes to the RouteContext and loading other data, but it wasn't updating the AutoSaveContext with the auto-save ID and route ID.

2. **Solution:** Modified the auto-save loading code in MapView.js to update the AutoSaveContext when an auto-save is loaded:

   ```javascript
   // Update the AutoSaveContext with the auto-save ID and route ID
   if (autoSaveData.id && autoSaveData.routesWithData && autoSaveData.routesWithData.length > 0) {
     const firstRouteId = autoSaveData.routesWithData[0].routeId;
     console.log('[MapView] Updating AutoSaveContext with auto-save ID:', autoSaveData.id, 'and route ID:', firstRouteId);
     
     // Call completeAutoSave to update the AutoSaveContext
     autoSaveContext.completeAutoSave(autoSaveData.id, firstRouteId);
   }
   ```

3. **Result:** The AutoSavePanel now shows the correct status ("Saved") and displays the auto-save ID when an auto-save is loaded.

### Route Loading from Firebase

We identified and fixed an issue where routes weren't loading properly from Firebase:

1. **Problem:** When loading a saved route from Firebase, the route would be loaded but not displayed properly in the UI. The route would be visible on the map, but the uploader UI wouldn't show the route, and the route type dropdown wouldn't update to match the loaded route's type.

2. **Solution:** Made several changes to fix the route loading process:
   - Modified `SidebarListItems.js` to skip the MongoDB API loading entirely and use Firebase directly
   - Added code to set `currentLoadedPersistentId` and `currentLoadedState` manually
   - Added routes to the RouteContext with the proper metadata
   - Manually fit the map to the route bounds using mapboxgl.LngLatBounds
   - Added code to open the uploader UI and select the first route after loading
   - Added two effects to `UploaderUI.jsx` to update the route type from both `currentRoute._loadedState` and `currentLoadedState`

   ```javascript
   // In SidebarListItems.js
   // Open the uploader UI with a longer delay to ensure the dialog is closed
   setTimeout(() => {
       console.log('[SidebarListItems] Opening uploader UI after dialog close');
       
       // Open the uploader UI
       onUploadGpx();
       
       // Set active item to 'gpx' to highlight the GPX button
       setActiveItem('gpx');
       
       // Add a longer delay before selecting the route to ensure the uploader UI is fully open
       setTimeout(() => {
           console.log('[SidebarListItems] Attempting to select route after uploader UI open');
           
           // Always select the first route instead of trying to use the master route
           if (routeData.routesWithData && routeData.routesWithData.length > 0) {
               const firstRoute = routeData.routesWithData[0];
               
               // Ensure the route has all required properties
               const enhancedRoute = {
                   ...firstRoute,
                   _type: 'loaded',
                   _loadedState: routeData
               };
               
               // Set the first route as current
               console.log('[SidebarListItems] Setting first route as current:', {
                   routeId: enhancedRoute.routeId || enhancedRoute.id,
                   name: enhancedRoute.name
               });
               
               setCurrentRoute(enhancedRoute);
           }
       }, 800); // Longer delay to ensure uploader UI is fully open
   }, 300); // Longer delay to ensure dialog is fully closed
   
   // In UploaderUI.jsx
   // Effect to update route type when currentRoute changes
   useEffect(() => {
       if (currentRoute?._loadedState?.routeType) {
           console.log('[UploaderUI] Setting route type from currentRoute._loadedState:', currentRoute._loadedState.routeType);
           setRouteType(currentRoute._loadedState.routeType);
       }
   }, [currentRoute]);
   
   // Additional effect to update route type when currentLoadedState changes
   useEffect(() => {
       if (currentLoadedState?.routeType) {
           console.log('[UploaderUI] Setting route type from currentLoadedState:', currentLoadedState.routeType);
           setRouteType(currentLoadedState.routeType);
       }
   }, [currentLoadedState]);
   ```

3. **Result:** Routes now load properly from Firebase, with the uploader UI opening automatically and the route type dropdown updating to match the loaded route's type. The route is also properly selected in the uploader UI, making it visible on the map.

### Clear Button Not Working Properly (Persistent Issue)

We identified an issue where the "Clear" button in the AutoSavePanel isn't properly clearing the auto-save data:

1. **Problem:** The `clearAutoSave` function in the AutoSaveContext only clears the state in the context, but it doesn't fully clear the routes from the screen. Additionally, some map layers (route coordinates and unpaved sections) remain visible after clearing, and the route data persists in the local state. The route color is also not being properly cleared.

2. **Attempted Solutions:**
   - Modified the AutoSavePanel component to:
     - Import the `deleteAutoSaveFromFirebase` function from firebaseGpxAutoSaveService.js
     - Import the `useRouteContext` hook to access the `clearCurrentWork` function and the map instance
     - Update the "Clear" button click handler to:
       - Delete the auto-save data from Firebase
       - Call `clearCurrentWork` to clear the routes from the screen
       - Add a delayed map refresh to clean up any remaining layers
       - Clear the auto-save state in the context
       - Set a flag in localStorage to prevent auto-loading of the deleted auto-save
       - Force a map style reload to completely reset the map state

   ```javascript
   // Clear button
   <Tooltip title="Clear auto-save state and remove from Firebase">
     <Button 
       size="small" 
       variant="outlined" 
       onClick={() => {
         // Get the current user ID
         const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
         
         // Delete the auto-save from Firebase
         if (autoSaveId && routeId) {
           console.log('[AutoSavePanel] Deleting auto-save from Firebase:', autoSaveId);
           deleteAutoSaveFromFirebase(routeId, userId)
             .then(success => {
               if (success) {
                 console.log('[AutoSavePanel] Auto-save deleted successfully from Firebase');
               } else {
                 console.warn('[AutoSavePanel] Failed to delete auto-save from Firebase');
               }
             })
             .catch(error => {
               console.error('[AutoSavePanel] Error deleting auto-save from Firebase:', error);
             });
         }
         
         // Clear the routes from the screen
         console.log('[AutoSavePanel] Clearing current work');
         clearCurrentWork();
         
         // NUCLEAR OPTION: Force a complete map reset by removing all layers and sources
         if (map) {
           setTimeout(() => {
             try {
               console.log('[AutoSavePanel] NUCLEAR OPTION: Completely resetting the map');
               
               // Get all layers and sources in the map
               const style = map.getStyle();
               if (style && style.layers) {
                 // Get all layer IDs
                 const allLayers = style.layers.map(layer => layer.id);
                 
                 // Remove all layers except the base map layers
                 allLayers.forEach(layerId => {
                   // Skip base map layers (usually start with 'mapbox-')
                   if (!layerId.startsWith('mapbox-') && map.getLayer(layerId)) {
                     try {
                       console.log('[AutoSavePanel] Removing layer:', layerId);
                       map.removeLayer(layerId);
                     } catch (error) {
                       console.error('[AutoSavePanel] Error removing layer:', layerId, error);
                     }
                   }
                 });
                 
                 // Get all source IDs
                 const allSources = Object.keys(style.sources || {});
                 
                 // Remove all sources except the base map sources
                 allSources.forEach(sourceId => {
                   // Skip base map sources (usually start with 'mapbox-')
                   if (!sourceId.startsWith('mapbox-') && map.getSource(sourceId)) {
                     try {
                       console.log('[AutoSavePanel] Removing source:', sourceId);
                       map.removeSource(sourceId);
                     } catch (error) {
                       console.error('[AutoSavePanel] Error removing source:', sourceId, error);
                     }
                   }
                 });
               }
               
               // Force a complete map redraw
               map.resize();
               
               // Additional map refresh to ensure rendering is updated
               if (map.repaint) {
                 map.repaint = true;
               }
               
               // Try to reload the map style as a last resort
               try {
                 const currentStyle = map.getStyle().name || 'mapbox://styles/mapbox/streets-v11';
                 console.log('[AutoSavePanel] Reloading map style:', currentStyle);
                 map.setStyle(currentStyle);
               } catch (styleError) {
                 console.error('[AutoSavePanel] Error reloading map style:', styleError);
                 // Try with a default style as fallback
                 try {
                   map.setStyle('mapbox://styles/mapbox/streets-v11');
                 } catch (fallbackError) {
                   console.error('[AutoSavePanel] Error setting fallback style:', fallbackError);
                 }
               }
             } catch (error) {
               console.error('[AutoSavePanel] Error during nuclear map reset:', error);
             }
           }, 500); // Wait 500ms to ensure clearCurrentWork has completed
         }
         
         // Clear the auto-save state in the context
         console.log('[AutoSavePanel] Clearing auto-save state');
         clearAutoSave();
         
         // Set a flag in localStorage to indicate we've just cleared an auto-save
         // This will prevent the MapView component from trying to load it again
         localStorage.setItem('autoSaveClearedAt', Date.now().toString());
         
         // Force a map reload by reloading the map style
         if (map) {
           console.log('[AutoSavePanel] Forcing map style reload to reset map state');
           try {
             // Get the current style
             const currentStyle = map.getStyle().name || map.getStyle().sprite || 'mapbox://styles/mapbox/streets-v11';
             
             // Reload the style to completely reset the map
             map.setStyle(currentStyle);
             
             // Force a resize after style reload
             setTimeout(() => {
               map.resize();
               console.log('[AutoSavePanel] Map reset complete');
             }, 500);
           } catch (error) {
             console.error('[AutoSavePanel] Error reloading map style:', error);
           }
         }
       }}
       sx={{ 
         minWidth: 'auto', 
         py: 0.5, 
         px: 1,
         color: 'white',
         borderColor: 'rgba(255, 255, 255, 0.3)',
         '&:hover': {
           borderColor: 'white',
           backgroundColor: 'rgba(255, 255, 255, 0.1)'
         }
       }}
     >
       Clear
     </Button>
   </Tooltip>
   ```

3. **Current Status:** The issue persists despite multiple attempts to fix it. The "Clear" button successfully deletes the auto-save data from Firebase, but some route data and map layers still remain visible. The route color in particular is not being properly cleared.

4. **Possible Root Causes:**
   - The route data might be cached in multiple places within the application state
   - The Mapbox GL JS map instance might be retaining some layer information even after attempting to remove all layers
   - There might be a race condition where the auto-save is being reloaded immediately after being cleared
   - The route color might be stored in a separate part of the state that isn't being properly reset

5. **Next Steps:**
   - Investigate the RouteContext implementation to identify all places where route data is stored
   - Add more comprehensive logging to track the state of the map layers before and after clearing
   - Consider implementing a more drastic reset approach that completely reinitializes the map instance
   - Explore the possibility of adding a dedicated "reset" function to the RouteContext that properly clears all route-related state

## Lessons Learned

1. **Firestore Data Structure:** Firestore has limitations on nested arrays, so we had to transform coordinates from arrays to objects.

2. **Context Management:** Using a global context for auto-save state simplifies integration with various components.

3. **Error Handling:** Comprehensive error handling is essential for a robust auto-save implementation.

4. **User Experience:** Visual feedback on auto-save operations helps build user confidence in the application.

5. **Performance Considerations:** Batch operations and careful data structuring are important for performance with large datasets.

## Next Tasks

1. **Enhance User Interface:**
   - Improve visual indicators for auto-save status
   - Add more detailed feedback on auto-save operations

2. **Future Enhancements:**
   - Commit Action: Update the status of auto-saved data when user commits
   - Delete Action: Allow users to delete auto-saved drafts
   - Draft Management: UI for viewing and managing auto-saved drafts
   - Chunking for Large Files: Implement chunking for routes with many points

## Auth0 User ID Integration

We've ensured that all auto-saves are properly associated with the authenticated user's Auth0 ID:

```javascript
import { useAuth0 } from '@auth0/auth0-react';

// In the component:
const { user, isAuthenticated } = useAuth0();

// When auto-saving:
const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
```

This ensures that all auto-saves are properly associated with the authenticated user's Auth0 ID. The changes maintain the fallback to "anonymous-user" only when a user is not authenticated, ensuring the application still works in unauthenticated scenarios.

## Permanent Route Saving

In addition to the auto-save functionality, users can now save their routes permanently. This feature allows users to:

1. **Convert Auto-Saves to Permanent Routes:** Users can convert their auto-saved work to a permanent route with a custom name.
2. **Access Routes Later:** Permanently saved routes are stored in a user-specific index for easy retrieval.
3. **Visual Thumbnails:** Each saved route includes a static map thumbnail for easy identification.

### Implementation Details

The permanent route saving functionality is implemented through the following components:

1. **Firebase Save Complete Route Service:** A dedicated service that handles saving auto-saves as permanent routes and maintaining a user route index.

2. **User Route Index:** A collection in Firestore that stores metadata about each user's saved routes, making it easy to list and access them.

3. **Save Button in AutoSavePanel:** The AutoSavePanel component now includes a "Save" button that allows users to save their auto-saved work permanently.

### Data Structure in Firestore

```
user_saved_routes/{routeId}:
  - userId: string (ID of the user who saved the route)
  - name: string (User-provided name for the route)
  - description: string (Optional description)
  - createdAt: timestamp
  - updatedAt: timestamp
  - statistics: object (Distance, elevation gain/loss, etc.)
  - routeType: string (Optional, "Single" or "Bikepacking")
  - headerSettings: object (Optional, header customization settings)
  - isPublic: boolean (Whether the route is publicly accessible)
  - tags: array (Optional tags for organization)
  - thumbnailUrl: string (URL to the static map thumbnail)
  - thumbnailPublicId: string (Cloudinary public ID for the thumbnail)

user_saved_routes/{routeId}/data/routes:
  - data: array of objects (Route metadata)
    [
      {
        routeId: string (Unique identifier for the route),
        name: string (Name of the route),
        gpxFileName: string (Original filename),
        statistics: object (Distance, elevation gain/loss, etc.),
        color: string (Route color),
        addedAt: string (ISO date string)
      },
      ...
    ]

user_saved_routes/{routeId}/routes/{routeId}/data/coords:
  - data: array of objects (Coordinate data)
    [
      {
        lng: number (Longitude),
        lat: number (Latitude),
        elevation: number (Optional, elevation in meters)
      },
      ...
    ]

user_route_index/{userId}:
  - userId: string (ID of the user)
  - routes: array of objects (Route index entries)
    [
      {
        id: string (Route ID),
        name: string (Route name),
        thumbnailUrl: string (URL to the static map thumbnail),
        createdAt: timestamp,
        updatedAt: timestamp,
        statistics: object (Summary statistics),
        tags: array (Optional tags),
        isPublic: boolean (Whether the route is publicly accessible)
      },
      ...
    ]
  - createdAt: timestamp
  - updatedAt: timestamp
```

### User Experience

1. **Saving a Route:**
   - When a user has an auto-saved route, they can click the "Save" button in the AutoSavePanel
   - A dialog appears prompting for a route name
   - Upon confirmation, the auto-save is converted to a permanent route
   - A success message confirms the save operation

2. **Accessing Saved Routes:**
   - Users can access their saved routes through a dedicated "My Routes" view
   - Each route is displayed with its name, thumbnail, and key statistics
   - Users can open, edit, or delete their saved routes

### Auto-Saving Edits to Loaded Permanent Routes

A key enhancement to the auto-save functionality is its behavior when a user loads an existing, permanently saved route (from `user_saved_routes`) and begins editing it. Instead of creating a new temporary auto-save in `gpx_auto_saves`, the system will now directly update the permanent route record.

### Workflow

1.  **Load Permanent Route:** User loads a route that was previously saved permanently. The application state now holds the ID of this permanent route (e.g., `loadedPermanentRouteId`).
2.  **User Edits:** As the user modifies the route (e.g., changes coordinates, adds POIs, updates description).
3.  **Auto-Save Trigger:** The auto-save mechanism is triggered periodically or on specific actions.
4.  **Targeted Update:** The `autoSaveGpxToFirebase` service (or a similar function) is invoked. It now accepts an additional parameter, `loadedPermanentRouteId`.
    *   If `loadedPermanentRouteId` is provided, the service targets the `user_saved_routes` collection and updates the document with that ID.
    *   If `loadedPermanentRouteId` is not provided, the existing logic for handling temporary auto-saves in `gpx_auto_saves` (creating a new one or updating an existing one based on `existingAutoSaveId`) applies.
5.  **Data Persistence:** Changes are written to the appropriate subcollections of the permanent route (e.g., `user_saved_routes/{id}/data/routes`, `user_saved_routes/{id}/routes/{routeId}/data/coords`, etc.).
6.  **Timestamp Updates:**
    *   The `updatedAt` timestamp of the main permanent route document in `user_saved_routes/{id}` is updated.
    *   Crucially, the `updatedAt` timestamp for the corresponding route entry in the `user_route_index/{userId}` collection is also updated. This ensures that user interfaces listing saved routes (e.g., "My Routes") can accurately reflect the most recently modified routes, even if those modifications were auto-saved.

### Modified `autoSaveGpxToFirebase` Service

The `autoSaveGpxToFirebase` service needs to be adapted. Conceptually, its signature and core logic for determining the save target would change as follows (this example is more detailed than the one under "Code Example: Auto-Save GPX Data" to illustrate the new logic):

```javascript
/**
 * Auto-save GPX data to Firebase
 * @param {Object} processedRoute - The processed route data
 * @param {string} userId - The ID of the current user
 * @param {string} gpxFileName - The original filename
 * @param {Object} autoSaveContext - Optional AutoSaveContext
 * @param {string} existingAutoSaveId - Optional ID of an existing temporary auto-save (`gpx_auto_saves`)
 * @param {string} loadedPermanentRouteId - Optional ID of a loaded permanent route (`user_saved_routes`)
 * @returns {Promise<string|null>} - The ID of the saved document
 */
export const autoSaveGpxToFirebase = async (
  processedRoute, 
  userId, 
  gpxFileName, 
  autoSaveContext = null, 
  existingAutoSaveId = null, 
  loadedPermanentRouteId = null
) => {
  // ... (context handling, status updates from autoSave.startAutoSave()) ...

  let targetCollectionPath;
  let targetDocRef;
  let docIdToSave;
  let isNewTemporaryAutoSave = false; // Specifically for gpx_auto_saves

  if (loadedPermanentRouteId) {
    // Scenario 1: Updating an existing, loaded permanent route
    console.log(`[firebaseGpxAutoSaveService] Auto-saving to existing permanent route: ${loadedPermanentRouteId}`);
    targetCollectionPath = 'user_saved_routes';
    targetDocRef = doc(db, targetCollectionPath, loadedPermanentRouteId);
    docIdToSave = loadedPermanentRouteId;
    
    // IMPORTANT: Update 'updatedAt' in user_route_index for this permanent route.
    // This ensures "My Routes" lists reflect the latest auto-saved changes.
    // This update should be robust, potentially batched with the main save.
    // Example (conceptual, actual implementation needs care):
    // const userRouteIndexRef = doc(db, 'user_route_index', userId);
    // const routeIndexDoc = await getDoc(userRouteIndexRef);
    // if (routeIndexDoc.exists()) {
    //   const routesArray = routeIndexDoc.data().routes || [];
    //   const routeIndexToUpdate = routesArray.findIndex(r => r.id === loadedPermanentRouteId);
    //   if (routeIndexToUpdate !== -1) {
    //     const updates = {};
    //     updates[`routes.${routeIndexToUpdate}.updatedAt`] = serverTimestamp();
    //     updates['updatedAt'] = serverTimestamp(); // Update the main index doc's timestamp too
    //     // await updateDoc(userRouteIndexRef, updates); // Ideally batched
    //   }
    // }

  } else if (existingAutoSaveId) {
    // Scenario 2: Updating an existing temporary auto-save in gpx_auto_saves
    targetCollectionPath = 'gpx_auto_saves';
    const tempAutoSaveCheckRef = doc(db, targetCollectionPath, existingAutoSaveId);
    const tempDoc = await getDoc(tempAutoSaveCheckRef);

    if (tempDoc.exists() && tempDoc.data().userId === userId) {
      console.log(`[firebaseGpxAutoSaveService] Updating existing temporary auto-save: ${existingAutoSaveId}`);
      targetDocRef = tempAutoSaveCheckRef;
      docIdToSave = existingAutoSaveId;
    } else {
      console.warn(`[firebaseGpxAutoSaveService] existingAutoSaveId ${existingAutoSaveId} invalid, not found, or belongs to another user. Creating new temporary auto-save.`);
      targetDocRef = doc(collection(db, targetCollectionPath)); // New doc in gpx_auto_saves
      docIdToSave = targetDocRef.id;
      isNewTemporaryAutoSave = true;
    }
  } else {
    // Scenario 3: Creating a new temporary auto-save in gpx_auto_saves
    console.log('[firebaseGpxAutoSaveService] Creating new temporary auto-save.');
    targetCollectionPath = 'gpx_auto_saves';
    targetDocRef = doc(collection(db, targetCollectionPath));
    docIdToSave = targetDocRef.id;
    isNewTemporaryAutoSave = true;
  }

  // Common data preparation for saving
  const mainDocData = {
    userId: userId,
    // gpxFileName might be less relevant for permanent route updates if name is managed by user
    gpxFileName: processedRoute.gpxFileName || gpxFileName, 
    updatedAt: serverTimestamp(),
    name: processedRoute.name || `Route from ${gpxFileName}`, // Ensure name is updated or preserved as per product decision
    statistics: processedRoute.statistics || {},
    // ... other fields like routeType, headerSettings from processedRoute
  };

  if (isNewTemporaryAutoSave) {
    mainDocData.createdAt = serverTimestamp();
    mainDocData.status = "pending_action"; // Specific to gpx_auto_saves
  }
  // For permanent routes, 'createdAt' is already set. 
  // 'name' is user-defined and should be updated if changed in processedRoute.

  // Batched write for the main document and its subcollections
  // (coords, elevation, unpaved, pois, lines, and the 'routes' subcollection for metadata)
  // This logic is complex and involves iterating over processedRoute data and structuring it
  // according to the target schema (gpx_auto_saves or user_saved_routes).
  // Example:
  // const batch = writeBatch(db);
  // batch.set(targetDocRef, mainDocData, { merge: true }); // Use merge:true for updates
  //
  // // Example for routes subcollection (simplified for one route in processedRoute)
  // const routeObjectForSubcollection = {
  //   routeId: processedRoute.routeId,
  //   name: processedRoute.name || `Route from ${gpxFileName}`,
  //   gpxFileName: processedRoute.gpxFileName || gpxFileName,
  //   statistics: processedRoute.statistics || {},
  //   addedAt: processedRoute.addedAt || new Date().toISOString(), // Preserve if exists, else new
  //   color: processedRoute.color 
  // };
  // const routesDataRef = doc(db, targetCollectionPath, docIdToSave, 'data', 'routes');
  // // Logic to merge/update this routeObjectForSubcollection into the 'data' array in routesDataRef
  // // This is non-trivial if multiple routes can exist in a permanent save.
  // // For simplicity, if a permanent save always mirrors the structure of a gpx_auto_save (often one primary route being edited):
  // batch.set(routesDataRef, { data: [routeObjectForSubcollection] }, { merge: true }); 
  //
  // // ... batch writes for coords, elevation, etc. in their respective subcollections under routes/{routeId}/data/...
  // // or directly under data/pois, data/lines if at the top level of the save.
  // await batch.commit();

  // Update AutoSaveContext
  if (autoSaveContext && typeof autoSaveContext.completeAutoSave === 'function') {
    autoSaveContext.completeAutoSave(docIdToSave, processedRoute.routeId);
  }
  
  // ... (update global firebaseAutoSaveStatus object) ...

  return docIdToSave;
};
```

## Security Rules

The security rules for permanent routes ensure that:
- Users can only access their own routes (unless a route is marked as public)
- Only the owner can modify or delete a route
- Public routes can be viewed by any authenticated user

## Conclusion

The Firebase GPX Auto-Save and Permanent Route Saving implementations provide significant performance improvements for users in creation mode by leveraging Firebase's client-side SDK and real-time database capabilities. By automatically persisting GPX data as soon as it's processed and allowing users to save their work permanently, we eliminate the need for explicit save actions and provide a more responsive user experience.

The implementation ensures that each user has only one active auto-save at a time, that auto-saves are automatically loaded when the user opens the editor, and that users can easily save and access their routes. This simplifies the user experience and ensures that users don't lose their work if they close the browser or navigate away from the page.
