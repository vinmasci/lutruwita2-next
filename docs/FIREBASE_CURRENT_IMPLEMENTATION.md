# Firebase Current Implementation

## Overview

This document describes the current implementation of Firebase in our application. Firebase has been integrated as a complementary data storage solution alongside our existing MongoDB + Cloudinary architecture, primarily to enhance performance for mobile clients and provide better offline capabilities.

## Current Implementation Status

We have implemented a hierarchical data structure in Firestore that organizes route data into separate collections for different types of data. This approach provides better query performance and more flexible access patterns compared to storing everything in a single document.

### Client-Side Implementation

The client-side code has been updated to exclusively use the hierarchical structure in Firebase. The legacy format fallback has been removed from the client code to simplify the implementation and focus on the more efficient hierarchical approach.

### Server-Side Implementation

On the server side, we have removed the legacy format saving and now exclusively write to the hierarchical structure. The comment in the code indicates this change:

```javascript
// Legacy format saving has been removed as the client now exclusively uses the hierarchical structure
```

We've identified and fixed several issues with the Firebase implementation:

### 1. Route ID Format Issue

We discovered that route IDs in our system can be in two formats:
1. Plain UUID format (e.g., `7575ebe6-3b52-4cd0-a287-fe5ae0543c97`)
2. Prefixed format (e.g., `route-27c14854-8a5d-4d20-b907-7ecfa45cde59`)

The issue was that our Firebase saving function was using the original route ID format for document IDs, but our Firebase loading function was expecting a different format. This mismatch caused the data to be saved correctly but not found when trying to load it.

We've implemented a solution that:
1. Detects if a route ID has the `route-` prefix
2. Extracts just the UUID part for use as the document ID in Firebase
3. Uses consistent document IDs across all collections in the hierarchical structure
4. Logs the original and extracted IDs for debugging purposes

This ensures that regardless of which format is used in the application, the data is stored and retrieved consistently from Firebase.

We've also identified and fixed a similar issue in the MapOverviewLoader component, where it wasn't handling route IDs with the "route-" prefix correctly when fetching map overview data. The component was using the full route ID (with prefix) in API calls, but the API was expecting the ID without the prefix. We've updated the component to extract the UUID part from route IDs with the "route-" prefix:

```javascript
// Handle route IDs with the "route-" prefix
if (routeId.startsWith('route-')) {
  console.log(`[MapOverviewLoader] Detected route ID with prefix: ${routeId}`);
  routeId = routeId.substring(6);
  console.log(`[MapOverviewLoader] Using extracted route ID: ${routeId}`);
}
```

This fix ensures consistent handling of route IDs across all components and prevents issues with map overview data not loading in the embed view.

We've also identified and fixed a similar issue in the useRouteDataLoader.js component, where it was using the route ID without the "route-" prefix when making API calls. The API expects the ID with the prefix, so we've updated the component to ensure the route ID has the prefix:

```javascript
// Get the first route ID (we'll only load one route for simplicity)
let routeId = decodedState.routes[0].id;

// Ensure the route ID has the "route-" prefix if it doesn't already
if (!routeId.startsWith('route-')) {
    routeId = `route-${routeId}`;
    console.log(`[useRouteDataLoader] Added 'route-' prefix to route ID: ${routeId}`);
}
```

This fix ensures that the API calls are made with the correct route ID format, which is essential for loading the route data correctly.

### 3. Unpaved Sections Rendering Issue

We identified and fixed an issue with the rendering of unpaved sections in the embed view. The issue was related to how unpaved section data is stored and retrieved from Firebase.

Previously, we were storing the full coordinates for each unpaved section directly in the unpaved section object:

```javascript
unpavedSections: (route.unpavedSections || []).map(section => ({
  startIndex: section.startIndex || 0,
  endIndex: section.endIndex || 0,
  surfaceType: section.surfaceType || 'unpaved',
  coordinates: section.coordinates || []
})),
```

This approach led to data duplication, as the coordinates were already stored in the main route coordinates. To optimize storage and prevent inconsistencies, we modified the server-side code to store only the indices:

```javascript
unpavedSections: (route.unpavedSections || []).map(section => ({
  startIndex: section.startIndex || 0,
  endIndex: section.endIndex || 0,
  surfaceType: section.surfaceType || 'unpaved'
  // Removed coordinates to avoid duplication - will use indices to reference main coordinates
})),
```

We then updated the client-side rendering code in `EmbedRouteLayer.jsx` to extract the coordinates from the main route coordinates using the `startIndex` and `endIndex` properties:

```javascript
// Get the main route coordinates
const mainCoordinates = currentRoute.geojson.features[0].geometry.coordinates;

// Combine all unpaved sections into a single feature collection
const features = currentRoute.unpavedSections.map(section => {
  // Check if section has coordinates directly
  let sectionCoordinates;
  
  if (section.coordinates && section.coordinates.length > 0) {
    // Use coordinates directly if available (backward compatibility)
    sectionCoordinates = section.coordinates;
  } else if (typeof section.startIndex === 'number' && typeof section.endIndex === 'number' && mainCoordinates) {
    // Extract coordinates from main route using indices
    // Ensure indices are within bounds
    const startIdx = Math.max(0, Math.min(section.startIndex, mainCoordinates.length - 1));
    const endIdx = Math.max(startIdx, Math.min(section.endIndex, mainCoordinates.length - 1));
    
    sectionCoordinates = mainCoordinates.slice(startIdx, endIdx + 1);
  } else {
    // Log error and return empty coordinates
    sectionCoordinates = [];
  }
  
  return {
    type: 'Feature',
    properties: {
      surface: section.surfaceType
    },
    geometry: {
      type: 'LineString',
      coordinates: sectionCoordinates
    }
  };
});
```

This approach provides several benefits:
1. Consistent rendering of unpaved sections
2. Backward compatibility with existing data
3. Better error handling for invalid unpaved section data

However, after further investigation, we found that the unpaved sections were originally stored with their own complete coordinates arrays, not just indices. The MongoDB data shows that each unpaved section has both `startIndex` and `endIndex` values AND a separate `coordinates` array with the actual coordinate points.

We've updated our approach to:
1. Keep the coordinates in the unpaved sections when saving to Firebase (not remove them)
2. Prioritize using the dedicated coordinates arrays in the unpaved sections when rendering, without any fallbacks

This ensures that the unpaved sections render correctly in the embed view, matching how they were originally implemented.

### 4. Error Handling Improvements in Embed View

We identified and fixed several error handling issues in the embed view components:

1. **Missing `setError` Function in EmbedMapView.jsx**:
   The component was trying to use `setError` to handle map errors, but it was using the `error` state from the `useRouteDataLoader` hook without a corresponding `setError` function. We added a local error state with useState:

   ```javascript
   // Add local error state for map errors
   const [error, setError] = useState(routeDataError);
   
   // Update local error state when routeDataError changes
   useEffect(() => {
       if (routeDataError) {
           setError(routeDataError);
       }
   }, [routeDataError]);
   ```

2. **Removed `setError` References in EmbedRouteLayer.jsx**:
   The EmbedRouteLayer component was trying to use `setError` but didn't have access to it. We modified the error handling to simply log errors without trying to update state:

   ```javascript
   catch (error) {
       console.error('[EmbedRouteLayer] Error in route rendering operation:', error);
       // Don't try to use setError here as it's not available
   }
   ```

These changes ensure that errors are properly handled without causing additional errors in the console, providing a more stable user experience.

## Summary of Unpaved Sections and Elevation Profile Implementation

### Unpaved Sections Implementation

The unpaved sections feature is now correctly implemented in both the server-side and client-side code:

1. **Server-Side (api/routes/index.js)**:
   - We keep the full coordinates in the unpaved sections when saving to Firebase
   - This preserves the original data structure that was used in MongoDB

2. **Client-Side (EmbedRouteLayer.jsx)**:
   - We filter unpaved sections to only include those with valid coordinates
   - We use the dedicated coordinates arrays directly for rendering
   - We've removed the fallback to extracting coordinates from the main route using indices

3. **Error Handling**:
   - We've added proper error handling in both EmbedMapView and EmbedRouteLayer components
   - This prevents cascading errors when rendering unpaved sections

### Elevation Profile Implementation

We've fixed the elevation profile rendering in the Firebase implementation:

1. **Server-Side (api/routes/index.js)**:
   - We now include the elevation profile data when saving to Firebase:
   ```javascript
   surface: route.surface ? {
     surfaceTypes: (route.surface.surfaceTypes || []).map(st => ({
       type: st.type || 'unknown',
       percentage: st.percentage || 0,
       distance: st.distance || 0
     })),
     // Include elevation profile data for the elevation chart
     elevationProfile: route.surface.elevationProfile || []
   } : null,
   ```

2. **Client-Side (firebaseOptimizedRouteService.js)**:
   - When loading coordinates from Firebase, we now ensure that elevation data is properly added to the route's GeoJSON properties:
   ```javascript
   // Ensure the route has the elevation data in the expected format
   if (route.surface && route.surface.elevationProfile && route.surface.elevationProfile.length > 0) {
     // Make sure properties and coordinateProperties exist
     if (!route.geojson.features[0].properties) {
       route.geojson.features[0].properties = {};
     }
     if (!route.geojson.features[0].properties.coordinateProperties) {
       route.geojson.features[0].properties.coordinateProperties = {};
     }
     
     // Extract just the elevation values
     const elevations = route.surface.elevationProfile.map(point => point.elevation);
     route.geojson.features[0].properties.coordinateProperties.elevation = elevations;
     console.log(`Added ${elevations.length} elevation points from surface.elevationProfile`);
   }
   ```

3. **Enhanced Fallback (useRouteDataLoaderWithFirebase.js)**:
   - We've added an additional fallback to extract elevation data from coordinates if available:
   ```javascript
   // Check if the route has coordinates with elevation values (z-coordinate)
   if (enhancedRoute.geojson?.features?.[0]?.geometry?.coordinates?.length > 0) {
     const coordinates = enhancedRoute.geojson.features[0].geometry.coordinates;
     if (coordinates[0].length > 2) {
       // Extract elevation values from coordinates
       const elevations = coordinates.map(coord => coord[2] || 0);
       enhancedRoute.geojson.features[0].properties.coordinateProperties.elevation = elevations;
     }
   }
   ```

These changes ensure that both unpaved sections and elevation profiles render correctly in the embed view, providing a consistent user experience across the application.

### 2. ES Modules Compatibility Issue

We encountered an issue with the Firebase embed component where we were trying to use CommonJS-style `require()` in an ES modules environment. This caused a "ReferenceError: Can't find variable: require" error.

When we tried to directly modify the imported module, we encountered another error: "TypeError: Attempted to assign to readonly property." This is because imported modules are read-only in ES modules.

Our solution was to create a simplified version of the EmbedMapView component that directly passes our Firebase data as props to the original EmbedMapView component:

```javascript
// Create a simplified version of EmbedMapView that uses our data directly
const SimpleEmbedMapView = () => {
    // Use our data directly without trying to override hooks
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Pass our data directly to EmbedMapView as props */}
            <EmbedMapView 
                routeData={routeData}
                mapState={mapState}
                currentRoute={currentRoute}
            />
        </div>
    );
};
```

This approach avoids the need to modify the imported module or override hooks, making it more compatible with ES modules and less prone to errors.

### 3. Data Loading Verification

We've added enhanced logging throughout the Firebase data loading process to help diagnose issues:
1. Logging the original and extracted route IDs
2. Logging the data structure being saved to Firebase
3. Logging the success or failure of Firebase operations
4. Adding a visual indicator in the UI to show whether data was loaded from Firebase or fell back to Cloudinary

These improvements make it easier to debug and verify that the Firebase implementation is working correctly.

## Data Structure

Our current Firestore data structure follows this hierarchical pattern:

```
routes/
  ├── {routeId}/
  │     ├── metadata/
  │     │     └── info/
  │     │           ├── name: "Tasmania Trail"
  │     │           ├── type: "bikepacking"
  │     │           ├── isPublic: true
  │     │           ├── createdAt: timestamp
  │     │           ├── headerSettings: { color, logoUrl, username }
  │     │           ├── mapState: { zoom, center, bearing, pitch, style }
  │     │           ├── mapOverview: { description }
  │     │           ├── staticMapUrl: "https://..."
  │     │           ├── staticMapPublicId: "..."
  │     │           └── ...other metadata
  │     │
  │     ├── geojson/
  │     │     └── routes/
  │     │           └── routes: [
  │     │                 {
  │     │                   routeId: "route-123",
  │     │                   name: "Route Name",
  │     │                   color: "#ff4d4d",
  │     │                   geojson: { /* GeoJSON with coordinatesRef */ },
  │     │                   surface: { 
  │     │                     surfaceTypes: [...],
  │     │                     elevationProfile: [...]
  │     │                   },
  │     │                   unpavedSections: [
  │     │                     {
  │     │                       startIndex: 0,
  │     │                       endIndex: 100,
  │     │                       surfaceType: "unpaved",
  │     │                       coordinates: [...]
  │     │                     }
  │     │                   ],
  │     │                   description: { description, title }
  │     │                 }
  │     │               ]
  │     │
  │     ├── coordinates/
  │     │     ├── all/
  │     │     │     └── coordinates: [...] (for small routes)
  │     │     ├── chunk_0/
  │     │     │     ├── coordinates: [...]
  │     │     │     ├── index: 0
  │     │     │     └── total: 5
  │     │     └── chunk_1/...
  │     │
  │     ├── pois/
  │     │     └── data/
  │     │           ├── draggable: [...]
  │     │           └── places: [...]
  │     │
  │     ├── lines/
  │     │     └── data/
  │     │           └── lines: [...]
  │     │
  │     └── photos/
  │           └── data/
  │                 └── photos: [...]
  │
type_index/
  ├── bikepacking/
  │     ├── {routeId1}: true
  │     └── {routeId3}: true
  ├── tourism/
  │     └── {routeId2}: true
  └── event/
        └── {routeId4}: true
```

## Key Components

### 1. Server-Side Integration

The API server has been modified to write data to both MongoDB and Firebase when routes are created or updated. This dual-write approach ensures that both databases remain in sync.

Key files:
- `api/routes/index.js`: Contains the implementation of the `saveOptimizedRouteDataToFirebase` function that handles writing to Firebase.

### 2. Data Sanitization

Firestore has specific limitations on the types of data it can store. We've implemented a `sanitizeForFirestore` function that:

- Handles null and undefined values
- Converts Date objects to Firestore Timestamps
- Handles nested arrays by converting them to objects with numeric keys
- Skips functions and symbols that Firestore can't store

### 3. Simplified Coordinates Storage

We've updated our approach to storing coordinates to use a simpler, flatter structure:

```javascript
// Try to save all coordinates in a single document if they're small enough
if (coordinates.length < 2000) {
  // For small routes, save all coordinates in a single document
  const allCoordsRef = db.collection('routes').doc(firebaseRouteId)
    .collection('coordinates').doc('all');
  
  batch.set(allCoordsRef, sanitizeForFirestore({
    coordinates: coordinates
  }));
  
  console.log(`[API] Saved all ${coordinates.length} coordinates in a single document`);
} else {
  // For large routes, split into chunks
  const CHUNK_SIZE = 400; // Firestore has limits on document size
  const chunks = [];
  
  for (let i = 0; i < coordinates.length; i += CHUNK_SIZE) {
    chunks.push(coordinates.slice(i, i + CHUNK_SIZE));
  }
  
  // Save each chunk directly in the coordinates collection
  for (let i = 0; i < chunks.length; i++) {
    const chunkRef = db.collection('routes').doc(firebaseRouteId)
      .collection('coordinates').doc(`chunk_${i}`);
    
    batch.set(chunkRef, sanitizeForFirestore({
      coordinates: chunks[i],
      index: i,
      total: chunks.length
    }));
  }
}
```

This approach simplifies our data structure by:
1. Storing small routes' coordinates in a single document
2. For large routes, storing chunks directly in the coordinates collection without nested folders
3. Using a flat structure that's easier to query and manage

### 4. Client-Side Loading

The client-side code has been updated to load data exclusively from the hierarchical structure in Firebase. If the data is not found or if there's an error, it falls back to the API.

We've also updated the client-side code to load coordinates from the simplified structure:

```javascript
// First try to load all coordinates at once from the 'all' document
const allCoordsRef = doc(db, 'routes', firebaseRouteId, 'coordinates', 'all');
const allCoordsSnap = await getDoc(allCoordsRef);

if (allCoordsSnap.exists()) {
  // Use the single document with all coordinates
  const allCoords = allCoordsSnap.data().coordinates || [];
  route.geojson.features[0].geometry.coordinates = allCoords;
  console.log(`Loaded ${allCoords.length} coordinates from single document`);
} else {
  // Fall back to loading from chunks directly in the coordinates collection
  const chunksQuery = query(
    collection(db, 'routes', firebaseRouteId, 'coordinates'),
    where(FieldPath.documentId(), '>=', 'chunk_'),
    where(FieldPath.documentId(), '<=', 'chunk_~'),
    orderBy(FieldPath.documentId())
  );
  
  const chunksSnap = await getDocs(chunksQuery);
  
  // Reassemble coordinates from chunks
  const allCoordinates = [];
  const chunks = [];
  
  chunksSnap.forEach(chunkDoc => {
    const chunkData = chunkDoc.data();
    chunks[chunkData.index] = chunkData;
  });
  
  // Ensure chunks are in the correct order
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i] && chunks[i].coordinates) {
      allCoordinates.push(...chunks[i].coordinates);
    }
  }
  
  // Set coordinates in the route
  if (allCoordinates.length > 0) {
    route.geojson.features[0].geometry.coordinates = allCoordinates;
    console.log(`Loaded ${allCoordinates.length} coordinates from ${chunks.length} chunks`);
  }
}
```

This approach mirrors the server-side implementation, first trying to load all coordinates from a single document, and falling back to loading from chunks if necessary.

Key files:
- `src/services/firebaseOptimizedRouteService.js`: Contains the implementation of the `getOptimizedRouteData` function that handles loading from Firebase.

## Current Challenges and Solutions

### 1. Console Logging Performance

We identified an issue with excessive console logging in the embed view, particularly related to line data processing. This was causing performance issues and cluttering the console with repeated messages.

Our solution was to:

1. Move console logging inside useEffect hooks with appropriate dependencies to ensure logs only appear when data actually changes
2. Conditionally log only in development mode using environment checks
3. Reduce the verbosity of logs by removing detailed data dumps that weren't necessary for debugging

```javascript
// Before: Logs on every render
console.log('[DirectEmbedLineLayer] Lines from props:', { 
  linesCount: lines?.length || 0,
  linesData: lines
});

// After: Logs only when lines change
useEffect(() => {
  console.log('[DirectEmbedLineLayer] Lines from props:', { 
    linesCount: lines?.length || 0
  });
}, [lines?.length]);
```

### 2. Nested Arrays

Firestore doesn't support nested arrays. Our solution is to detect nested arrays and convert them to objects with numeric keys:

```javascript
// Check if this is a nested array (contains any arrays)
const containsArrays = data.some(item => Array.isArray(item));

// Always convert arrays to objects with numeric keys to avoid nested array issues
if (containsArrays || data.length > 100) {
  console.log('[API] Converting array to object for Firestore compatibility');
  const obj = {};
  data.forEach((item, index) => {
    obj[`item_${index}`] = sanitizeForFirestore(item, depth + 1);
  });
  return obj;
}
```

### 2. Document Size Limitations

Firestore has a 1MB limit on document size. Our solution is to split large data (like route coordinates) into chunks and store them in separate documents.

### 3. Undefined Values

Firestore doesn't accept undefined values. Our solution is to:

1. Skip undefined values when sanitizing objects
2. Enable `ignoreUndefinedProperties` in the Firestore settings:

```javascript
// Set ignoreUndefinedProperties to true
db.settings({ ignoreUndefinedProperties: true });
```

## Performance Considerations

1. **Parallel Loading**: We load different components of a route in parallel to improve performance:

```javascript
const [
  metadataSnap, 
  geojsonSnap, 
  poisSnap,
  linesSnap,
  photosSnap
] = await Promise.all([
  // Load each component...
]);
```

2. **Type Index**: We use a type index to efficiently filter routes by type:

```javascript
// Use the type index for better performance
const typeDoc = await firebase.firestore()
  .collection('type_index')
  .doc(filters.type)
  .get();
  
const routeIds = Object.keys(typeDoc.data() || {});

// Use "in" query to get routes by IDs
query = query.where(firebase.firestore.FieldPath.documentId(), 'in', routeIds);
```

3. **Chunking**: We split large arrays into chunks to avoid Firestore's document size limitations and improve loading performance.

## Future Enhancements

1. **Offline Support**: Enhance offline capabilities by implementing local caching and background sync.

2. **Real-time Updates**: Implement real-time updates for collaborative features.

3. **Firebase Storage**: Consider migrating photo storage from Cloudinary to Firebase Storage for a more unified solution.

4. **Optimistic UI Updates**: Implement optimistic UI updates to improve perceived performance.

5. **Phase Out Legacy Format**: Once we're confident in the hierarchical structure's reliability and performance, we can phase out the legacy format on the server side.

## Conclusion

The current Firebase implementation provides a solid foundation for enhanced performance and offline capabilities. The hierarchical data structure offers flexibility and scalability for future development. By continuing to refine and optimize this implementation, we can further improve the user experience, particularly for mobile clients.

The dual-write approach on the server side provides a safety net during the transition, while the client-side focus on the hierarchical structure ensures we're leveraging the benefits of the new approach.
