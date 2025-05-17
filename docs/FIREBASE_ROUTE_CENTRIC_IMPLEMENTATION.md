# Firebase Route-Centric Implementation

## Overview

This document describes the implementation of a route-centric data structure in Firebase for our application. This approach organizes all data related to a route under a single route ID, making it more intuitive and easier to manage while optimizing for the most common query patterns.

## Changes Made

We've made the following changes to implement the route-centric data structure:

1. **Updated the Firebase Data Structure**: Changed from a component-first approach to a route-first approach.
2. **Updated the API Server**: Modified the `saveOptimizedRouteDataToFirebase` function to save data using the new structure.
3. **Updated the Client-Side Code**: Modified the `getOptimizedRouteData` and `hasOptimizedRouteData` functions to load data from the new structure.
4. **Updated the Firebase Security Rules**: Created new security rules that allow public read access to all route data.
5. **Updated the Test Embed HTML**: Modified the test embed HTML to use the same route ID for both Cloudinary and Firebase embeds.
6. **Simplified Coordinates Storage**: Improved the coordinates storage structure for better maintainability.
7. **Added Location Indexing**: Created indexes for efficient location-based queries.

## Data Structure Comparison

### Previous Structure (Component-First)

```
routes/
  ├── route_metadata/
  │     ├── routes/
  │     │     ├── route1_id/
  │     │     │     ├── name: "Tasmania Trail"
  │     │     │     ├── type: "bikepacking"
  │     │     │     ├── isPublic: true
  │     │     │     ├── createdAt: timestamp
  │     │     │     └── ...basic metadata
  │     │     └── route2_id/...
  │
  ├── route_geojson/
  │     ├── routes/
  │     │     ├── route1_id/
  │     │     │     └── routes: [...]
  │     │     └── route2_id/...
  │
  ├── route_coordinates/
  │     ├── routes/
  │     │     ├── route1_id/
  │     │     │     ├── route_segment_id/
  │     │     │     │     ├── chunk_0/
  │     │     │     │     │     ├── coordinates: [...]
  │     │     │     │     │     ├── index: 0
  │     │     │     │     │     └── total: 5
  │     │     │     │     └── chunk_1/...
  │     │     │     └── another_segment_id/...
  │     │     └── route2_id/...
  │
  ├── route_pois/
  │     ├── routes/
  │     │     ├── route1_id/
  │     │     │     ├── draggable: [...]
  │     │     │     └── places: [...]
  │     │     └── route2_id/...
  │
  ├── route_lines/
  │     ├── routes/
  │     │     ├── route1_id/
  │     │     │     └── lines: [...]
  │     │     └── route2_id/...
  │
  └── route_photos/
        ├── routes/
        │     ├── route1_id/
        │     │     └── photos: [...]
        │     └── route2_id/...
```

### New Structure (Route-First)

```
routes/
  ├── route1_id/
  │     ├── metadata/
  │     │     └── info/
  │     │           ├── Basic info:
  │     │           │     ├── name: "Tasmania Trail"
  │     │           │     ├── type: "bikepacking"
  │     │           │     ├── isPublic: true
  │     │           │     ├── userId: "user123"
  │     │           │     ├── createdAt: timestamp
  │     │           │     └── updatedAt: timestamp
  │     │           ├── Map settings:
  │     │           │     ├── mapState: { zoom, center, bearing, pitch, style }
  │     │           │     ├── headerSettings: { color, logoUrl, username }
  │     │           │     ├── mapOverview: { description }
  │     │           │     ├── staticMapUrl: "https://res.cloudinary.com/..."
  │     │           │     └── staticMapPublicId: "logos/qeohgwxp5wgeteis9rmq"
  │     │           ├── Event info:
  │     │           │     └── eventDate: timestamp or null
  │     │           ├── Location data:
  │     │           │     ├── country: "Australia"
  │     │           │     ├── state: "Tasmania"
  │     │           │     └── lga: "Launceston, Hobart"
  │     │           └── Route characteristics:
  │     │                 ├── isLoop: true
  │     │                 ├── unpavedPercentage: 64
  │     │                 ├── totalDistance: 1017
  │     │                 └── totalAscent: 21457
  │     ├── geojson/
  │     │     └── routes/
  │     │           └── routes: [
  │     │                 {
  │     │                   routeId: "route-segment-1",
  │     │                   name: "Stage 1",
  │     │                   color: "#ff4d4d",
  │     │                   description: {
  │     │                     description: "Stage 1 description",
  │     │                     title: "Stage 1",
  │     │                     photos: [...]
  │     │                   },
  │     │                   geojson: {...},
  │     │                   statistics: {...}
  │     │                 },
  │     │                 {...}
  │     │               ]
  │     ├── coordinates/
  │     │     ├── all/
  │     │     │     └── coordinates: [...] (for small routes)
  │     │     ├── chunk_0/
  │     │     │     ├── coordinates: [...]
  │     │     │     ├── index: 0
  │     │     │     └── total: 5
  │     │     └── chunk_1/...
  │     ├── pois/
  │     │     └── data/
  │     │           ├── draggable: [...]
  │     │           └── places: [...]
  │     ├── lines/
  │     │     └── data/
  │     │           └── lines: [...]
  │     └── photos/
  │           └── data/
  │                 └── photos: [...]
  └── route2_id/...

location_index/
  ├── country/
  │     ├── Australia/
  │     │     └── route1_id: true
  │     └── New Zealand/
  │           └── route2_id: true
  ├── state/
  │     ├── Tasmania/
  │     │     └── route1_id: true
  │     └── Victoria/
  │           └── route2_id: true
  └── lga/
        ├── Launceston/
        │     └── route1_id: true
        └── Hobart/
              └── route1_id: true

type_index/
  ├── bikepacking/
  │     ├── route1_id: true
  │     └── route3_id: true
  ├── tourism/
  │     └── route2_id: true
  └── event/
        └── route4_id: true
```

## Benefits of the Route-Centric Approach

1. **Intuitive Organization**: All data for a single route is grouped together, making it more intuitive to understand what belongs to each route.

2. **Easier Data Management**: When you need to delete or update an entire route, you can simply target one path (`routes/route1_id`) rather than having to update multiple collections.

3. **Simplified Security Rules**: You can set permissions at the route level rather than having to set them for each collection type.

4. **Better for Route-Based Queries**: If you're typically loading all data for a specific route, this structure requires fewer separate queries.

5. **Clearer Data Ownership**: The hierarchical relationship between a route and its components is more explicit.

6. **Optimized for Common Use Cases**: The structure is optimized for the most common query pattern: "load all data for a specific route."

7. **Efficient Indexing**: Location and type indexes allow for efficient filtering without scanning all documents.

8. **Simplified Coordinates Storage**: The simplified coordinates storage structure makes it easier to manage and query large routes.

## Key Design Decisions

### 1. Comprehensive Metadata

The metadata document contains all the essential information about a route, including:
- Basic information (name, type, etc.)
- Map settings (mapState, headerSettings, mapOverview)
- Location data (country, state, lga)
- Route characteristics (isLoop, unpavedPercentage, etc.)

This comprehensive approach allows clients to get a complete overview of a route with a single document read.

### 2. Simplified Coordinates Storage

Instead of the deeply nested structure:
```
coordinates/{segmentId}/chunks/chunk_{index}
```

We've simplified to:
```
coordinates/all
coordinates/chunk_0
coordinates/chunk_1
...
```

This completely flat structure is easier to query and manage. All coordinates are stored directly in the coordinates collection, with no nested folders. For small routes, we store all coordinates in a single document named "all". For larger routes, we split them into chunks but still store them directly in the coordinates collection.

### 3. Location and Type Indexing

We've added dedicated index collections for location and type-based queries:
- `location_index/country/Australia/route1_id: true`
- `location_index/state/Tasmania/route1_id: true`
- `type_index/bikepacking/route1_id: true`

This allows for efficient queries like "show me all bikepacking routes in Tasmania" without having to scan all route documents.

### 4. Redundancy Elimination

We've eliminated several redundancies from the data structure:
- Removed duplicate coordinate data
- Consolidated elevation data to a single location
- Eliminated MongoDB-specific fields
- Removed processing status information that's only relevant during initial processing

## Implementation Details

### API Server Changes

The `saveOptimizedRouteDataToFirebase` function in `api/routes/index.js` has been updated to save data using the new route-centric structure:

```javascript
// 1. Save comprehensive route metadata
const metadataRef = db.collection('routes').doc(firebaseRouteId).collection('metadata').doc('info');
batch.set(metadataRef, sanitizeForFirestore({
  // Basic info
  name: name || 'Untitled Route',
  type: type || 'tourism',
  isPublic: isPublic === undefined ? false : isPublic,
  userId: userId || 'anonymous',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  
  // Map settings
  mapState: mapState || { zoom: 0, center: [0, 0], bearing: 0, pitch: 0, style: 'default' },
  headerSettings: headerSettings || { color: '#000000', logoUrl: null, username: '' },
  mapOverview: mapOverview || { description: '' },
  
  // Event info
  eventDate: eventDate || null,
  
  // Location data
  country: metadata?.country || 'Australia',
  state: metadata?.state || '',
  lga: metadata?.lga || '',
  
  // Route characteristics
  isLoop: metadata?.isLoop || false,
  unpavedPercentage: metadata?.unpavedPercentage || 0,
  totalDistance: metadata?.totalDistance || 0,
  totalAscent: metadata?.totalAscent || 0,
  
  // Static map
  staticMapUrl: staticMapUrl || null,
  staticMapPublicId: staticMapPublicId || null
}));

// 2. Save route GeoJSON data with segment descriptions
const geojsonRef = db.collection('routes').doc(firebaseRouteId).collection('geojson').doc('routes');
// ... save geojson data with segment descriptions

// 3. Save coordinates - either all at once or in chunks
for (const route of routes) {
  if (route.geojson?.features?.[0]?.geometry?.coordinates) {
    const coordinates = route.geojson.features[0].geometry.coordinates;
    
    // Try to save all coordinates in a single document if they're small enough
    if (coordinates.length < 2000) {
      // For small routes, save all coordinates in a single document
      const allCoordsRef = db.collection('routes').doc(firebaseRouteId)
        .collection('coordinates').doc('all');
      
      batch.set(allCoordsRef, sanitizeForFirestore({
        coordinates: coordinates
      }));
    } else {
      // For large routes, split into chunks
      const CHUNK_SIZE = 400;
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
  }
}

// 4. Save POIs, lines, and photos
// ... save other data

// 5. Update location and type indexes
if (type) {
  const typeIndexRef = db.collection('type_index').doc(type || 'unknown');
  batch.set(typeIndexRef, { [firebaseRouteId]: true }, { merge: true });
}

if (metadata?.country) {
  const countryIndexRef = db.collection('location_index').doc('country').collection(metadata.country).doc(firebaseRouteId);
  batch.set(countryIndexRef, { exists: true });
}

if (metadata?.state) {
  const stateIndexRef = db.collection('location_index').doc('state').collection(metadata.state).doc(firebaseRouteId);
  batch.set(stateIndexRef, { exists: true });
}

// ... update other indexes
```

### Client-Side Changes

The `getOptimizedRouteData` function in `src/services/firebaseOptimizedRouteService.js` has been updated to load data from the new route-centric structure:

```javascript
// 1. Get comprehensive route metadata
const metadataRef = doc(db, 'routes', firebaseRouteId, 'metadata', 'info');
const metadataSnap = await getDoc(metadataRef);

// 2. Get route GeoJSON data with segment descriptions
const geojsonRef = doc(db, 'routes', firebaseRouteId, 'geojson', 'routes');
const geojsonSnap = await getDoc(geojsonRef);

// 3. Get POIs, lines, and photos
// ... get other data

// 4. For each route segment, check if coordinates need to be loaded
const routes = geojsonData.routes || [];
for (const route of routes) {
  if (route.geojson?.features?.[0]?.geometry?.coordinates?.length === 0) {
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
        where(firebase.firestore.FieldPath.documentId(), '>=', 'chunk_'),
        where(firebase.firestore.FieldPath.documentId(), '<=', 'chunk_~'),
        orderBy(firebase.firestore.FieldPath.documentId())
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
  }
}
```

### Security Rules

The Firebase security rules have been updated to allow public read access to all route data and indexes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing rules for user collections
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // New rules for route-centric data structure
    match /routes/{routeId}/{collection}/{document=**} {
      allow read: if true;  // Anyone can read route data
      allow write: if request.auth != null;  // Only authenticated users can write
    }
    
    // Rules for location and type indexes
    match /location_index/{indexType}/{value}/{routeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /type_index/{type}/{routeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Testing

To test the new route-centric data structure, we've updated the test embed HTML to use the same route ID for both Cloudinary and Firebase embeds. This allows us to compare the two implementations side by side.

The test embed HTML is located at `public/test-embed.html` and includes two iframes:

1. The first iframe uses the Cloudinary-based implementation for loading.
2. The second iframe uses the new Firebase-first implementation, which attempts to load data from Firebase first, then falls back to Cloudinary if Firebase fails.

## Next Steps

1. **Migrate Existing Data**: Develop a script to migrate existing data from the component-first structure to the route-centric structure.
2. **Update Mobile App**: Update the mobile app to use the new route-centric structure.
3. **Monitor Performance**: Monitor the performance of the new structure and make adjustments as needed.
4. **Implement More Restrictive Security Rules**: Once the new structure is stable, implement more restrictive security rules that only allow public read access to routes that are marked as public.
5. **Optimize for Mobile**: Consider implementing additional optimizations for mobile clients, such as:
   - Storing smaller thumbnail versions of photos
   - Implementing progressive loading of route data
   - Adding caching mechanisms for frequently accessed routes

## Conclusion

The route-centric data structure provides a more intuitive and easier-to-manage approach to storing route data in Firebase. It simplifies data management, security rules, and queries, making it a better fit for our application's needs. The addition of location and type indexes further enhances query performance for common filtering operations.

By organizing data around routes rather than components, we've created a structure that better reflects how users think about and interact with the data. This should lead to improved performance, easier maintenance, and a better overall user experience.
