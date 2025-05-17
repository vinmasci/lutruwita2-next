# Firebase Schema Reference

This document serves as a comprehensive reference for the Firebase data schema used in our application. It outlines the collections, documents, and fields used for storing route data, as well as the indexes required for efficient querying.

## Collections Overview

Our Firebase implementation uses the following main collections:

1. `routes` - Stores route data in a hierarchical structure
2. `user_saved_routes` - Stores user-saved routes
3. `gpx_auto_saves` - Stores auto-saved GPX data
4. `user_route_index` - Stores an index of routes for each user
5. `type_index` - Maps route types to route IDs for faster filtering

## Detailed Schema

### Routes Collection

The `routes` collection uses a hierarchical structure to organize route data:

```
routes/
  ├── {routeId}/
  │     ├── metadata/
  │     │     └── info/
  │     │           ├── name: string (Route name)
  │     │           ├── type: string (Route type: "tourism", "event", "bikepacking", "single")
  │     │           ├── isPublic: boolean (Whether the route is publicly accessible)
  │     │           ├── userId: string (ID of the user who created the route)
  │     │           ├── createdAt: timestamp
  │     │           ├── updatedAt: timestamp
  │     │           ├── eventDate: timestamp (Optional, for event routes)
  │     │           ├── headerSettings: object (Color, logo URL, username)
  │     │           ├── mapState: object (Zoom, center, bearing, pitch, style)
  │     │           ├── mapOverview: object (Description)
  │     │           ├── staticMapUrl: string (URL to static map image)
  │     │           └── staticMapPublicId: string (Cloudinary public ID)
  │     │
  │     ├── geojson/
  │     │     └── routes/
  │     │           └── routes: array of objects (Route segments)
  │     │                 ├── routeId: string (Unique identifier for the route segment)
  │     │                 ├── name: string (Name of the route segment)
  │     │                 ├── color: string (Color of the route segment)
  │     │                 ├── geojson: object (Full GeoJSON FeatureCollection, coordinates embedded)
  │     │                 ├── surface: object (Potentially summary of surface types, or detailed profile data - needs clarification)
  │     │                 ├── unpavedSections: array of objects (Detailed unpaved sections with coordinates)
  │     │                 └── description: object (Title and description)
  │     │
  │     ├── coordinates/
  │     │     ├── all/ (For small routes, if geojson above is not self-contained)
  │     │     │     └── coordinates: array of arrays (e.g., [[lng, lat, ele], ...])
  │     │     └── chunk_{n}/ (For large routes, if geojson above is not self-contained)
  │     │           ├── coordinates: array of arrays (e.g., [[lng, lat, ele], ...])
  │     │           ├── index: number (Chunk index)
  │     │           └── total: number (Total number of chunks)
  │     │
  │     ├── pois/
  │     │     └── data/
  │     │           ├── draggable: array of objects (Draggable POIs)
  │     │           │     ├── id: string (Unique identifier)
  │     │           │     ├── coordinates: object {lng: number, lat: number}
  │     │           │     ├── name: string (Name of the POI)
  │     │           │     ├── description: string (Description of the POI)
  │     │           │     ├── category: string (Category of the POI)
  │     │           │     ├── icon: string (Icon for the POI)
  │     │           │     ├── type: string ("draggable")
  │     │           │     ├── googlePlaceId: string (Optional Google Place ID)
  │     │           │     └── googlePlaceUrl: string (Optional Google Place URL)
  │     │           │
  │     │           ├── places: array of objects (Place POIs)
  │     │           │     ├── id: string (Unique identifier)
  │     │           │     ├── coordinates: object {lng: number, lat: number}
  │     │           │     ├── name: string (Name of the place)
  │     │           │     ├── category: string (Category of the place)
  │     │           │     ├── icon: string (Icon for the place)
  │     │           │     ├── type: string ("place")
  │     │           │     └── placeId: string (Place ID)
  │     │           │
  │     │           └── updatedAt: timestamp
  │     │
  │     ├── lines/
  │     │     └── data/
  │     │           ├── lines: array of objects (Line data)
  │     │           │     ├── id: string (Unique identifier)
  │     │           │     ├── type: string ("line")
  │     │           │     ├── coordinates: array of objects [{lng: number, lat: number}, ...] (Points defining the line)
  │     │           │     ├── name: string (Name of the line)
  │     │           │     └── description: string (Description of the line)
  │     │           │
  │     │           └── updatedAt: timestamp
  │     │
  │     └── photos/
  │           └── data/
  │                 ├── photos: array of objects (Photo data)
  │                 │     ├── name: string (Name of the photo)
  │                 │     ├── url: string (URL to the photo)
  │                 │     ├── thumbnailUrl: string (URL to the thumbnail)
  │                 │     ├── dateAdded: string (ISO date string)
  │                 │     ├── caption: string (Caption for the photo)
  │                 │     └── coordinates: object (Latitude, longitude)
  │                 │
  │                 └── updatedAt: timestamp
```

### User Saved Routes Collection

The `user_saved_routes` collection stores user-saved routes:

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

user_saved_routes/{routeId}/routes/{segmentId}/data/coords: (Document named 'coords')
  - data: array of objects (Field containing coordinate data for this segment)
    [
      {
        lng: number (Longitude),
        lat: number (Latitude),
        elevation: number (Optional, elevation in meters)
      },
      ...
    ]

user_saved_routes/{routeId}/routes/{segmentId}/data/unpaved: (Document named 'unpaved')
  - data: array of objects (Field containing unpaved sections for this specific segment)
    [
      {
        // Note: startIndex and endIndex might not be directly stored here from GPX processing.
        // They are typically calculated on the client side if needed.
        surfaceType: string (Type of surface, e.g., "unpaved", "gravel"),
        coordinates: array of objects (Coordinates for this unpaved section)
          [
            { lng: number, lat: number }, // Coordinates are {lat, lng} as per screenshot
            ...
          ]
      },
      ...
    ]
```

user_saved_routes/{routeId}/data/pois: (Document named 'pois')
  - data: object (Field containing POI data)
    {
      draggable: array of objects (Draggable POIs)
        [
          {
            id: string (Unique identifier),
            name: string (Name of the POI),
            description: string (Description of the POI),
            coordinates: { lng: number, lat: number },
            icon: string (Icon for the POI),
            category: string (Category of the POI),
            type: string ("draggable")
            // ... other POI specific fields
          },
          ...
        ],
      places: array of objects (Place POIs)
        [
          {
            id: string (Unique identifier),
            name: string (Name of the place),
            coordinates: { lng: number, lat: number },
            icon: string (Icon for the POI),
            category: string (Category of the POI),
            type: string ("place")
            // ... other place POI specific fields
          },
          ...
        ]
    }

user_saved_routes/{routeId}/data/lines: (Document named 'lines')
  - data: array of objects (Field containing line data)
    [
      {
        id: string (Unique identifier),
        name: string (Name of the line),
        coordinates: array of objects (Coordinates for this line)
          [
            { lng: number, lat: number },
            ...
          ],
        description: string (Description of the line),
        type: string ("line")
        // ... other line specific fields
      },
      ...
    ]

user_saved_routes/{routeId}/data/photos: (Document named 'photos')
  - data: array of objects (Field containing photo data)
    [
      {
        name: string (Name of the photo),
        url: string (URL to the photo),
        thumbnailUrl: string (URL to the thumbnail),
        dateAdded: string (ISO date string),
        caption: string (Caption for the photo),
        coordinates: { lat: number, lng: number }
        // ... other photo specific fields
      },
      ...
    ]

user_saved_routes/{routeId}/data/pois: (Document named 'pois')
  - data: object (Field containing POI data)
    {
      draggable: array of objects (Draggable POIs)
        [
          {
            id: string (Unique identifier),
            coordinates: object {lng: number, lat: number},
            name: string (Name of the POI),
            description: string (Description of the POI),
            category: string (Category of the POI),
            icon: string (Icon for the POI),
            type: string ("draggable"),
            googlePlaceId: string (Optional Google Place ID),
            googlePlaceUrl: string (Optional Google Place URL)
          },
          ...
        ],
      places: array of objects (Place POIs)
        [
          {
            id: string (Unique identifier),
            coordinates: object {lng: number, lat: number},
            name: string (Name of the place),
            category: string (Category of the place),
            icon: string (Icon for the place),
            type: string ("place"),
            placeId: string (Place ID)
          },
          ...
        ]
    }
  - updatedAt: timestamp (Timestamp of last POI update)

user_saved_routes/{routeId}/data/lines: (Document named 'lines')
  - data: array of objects (Field containing line data)
    [
      {
        id: string (Unique identifier),
        type: string ("line"),
        coordinates: array of objects [{lng: number, lat: number}, ...] (Points defining the line),
        name: string (Name of the line),
        description: string (Description of the line)
      },
      ...
    ]
  - updatedAt: timestamp (Timestamp of last lines update)

user_saved_routes/{routeId}/data/photos: (Document named 'photos')
  - data: array of objects (Field containing photo data)
    [
      {
        name: string (Name of the photo),
        url: string (URL to the photo),
        thumbnailUrl: string (URL to the thumbnail),
        dateAdded: string (ISO date string),
        caption: string (Caption for the photo),
        coordinates: object {lat: number, lng: number}
      },
      ...
    ]
  - updatedAt: timestamp (Timestamp of last photos update)
```

### GPX Auto-Saves Collection

The `gpx_auto_saves` collection stores auto-saved GPX data:

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

### User Route Index Collection

The `user_route_index` collection stores an index of routes for each user:

```
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

### Type Index Collection

The `type_index` collection maps route types to route IDs for faster filtering:

```
type_index/{type}:
  - {routeId1}: true
  - {routeId2}: true
  - ...
  - updatedAt: timestamp
```

## Required Indexes

The following indexes are required for efficient querying:

### Existing Indexes

1. Collection: `user_saved_routes`
   - Fields: `userId` (Ascending), `updatedAt` (Descending), `name` (Descending)

2. Collection: `gpx_auto_saves`
   - Fields: `userId` (Ascending), `updatedAt` (Descending), `name` (Descending)

3. Collection: `user_route_index`
   - Fields: `userId` (Ascending), `updatedAt` (Descending), `name` (Descending)

### Recommended Additional Indexes for Landing Page Filters

1. For filtering by state and region:
   - Collection: `routes`
   - Fields: `metadata.info.isPublic` (Ascending), `metadata.info.state` (Ascending)
   - Collection: `routes`
   - Fields: `metadata.info.isPublic` (Ascending), `metadata.info.state` (Ascending), `metadata.info.lga` (Ascending)

2. For filtering by type:
   - Collection: `routes`
   - Fields: `metadata.info.isPublic` (Ascending), `metadata.info.type` (Ascending)

3. For filtering by surface type:
   - Collection: `routes`
   - Fields: `metadata.info.isPublic` (Ascending), `metadata.info.unpavedPercentage` (Ascending)

4. For filtering by distance:
   - Collection: `routes`
   - Fields: `metadata.info.isPublic` (Ascending), `metadata.info.totalDistance` (Ascending)

5. For filtering by route type (loop vs. point-to-point):
   - Collection: `routes`
   - Fields: `metadata.info.isPublic` (Ascending), `metadata.info.isLoop` (Ascending)

6. For combined filters (which are common in the landing page):
   - Collection: `routes`
   - Fields: `metadata.info.isPublic` (Ascending), `metadata.info.type` (Ascending), `metadata.info.state` (Ascending)
   - Collection: `routes`
   - Fields: `metadata.info.isPublic` (Ascending), `metadata.info.type` (Ascending), `metadata.info.totalDistance` (Ascending)

## Security Rules

The security rules for the collections ensure that:

1. Public routes can be read by anyone
2. User-specific data can only be accessed by the authenticated user
3. Write operations require authentication

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Routes Collection
    match /routes/{routeId}/{collection}/{document=**} {
      allow read: if true;  // Anyone can read route data
      allow write: if request.auth != null;  // Only authenticated users can write
    }
    
    // Type Index Collection
    match /type_index/{type}/{routeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // User Saved Routes Collection
    match /user_saved_routes/{routeId} {
      allow read: if request.auth != null && 
                   (resource.data.userId == request.auth.uid || resource.data.isPublic == true);
      allow write: if request.auth != null && 
                    (resource.data.userId == request.auth.uid);
    }
    
    // GPX Auto-Saves Collection
    match /gpx_auto_saves/{autoSaveId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null;

      // Subcollection for the general data (routes list, etc.)
      match /data/{dataType} {
        allow read, write: if request.auth != null;
      }
      
      // Subcollection for route-specific data
      match /routes/{routeId} {
        allow read, write: if request.auth != null;
        
        // Subcollection for route-specific data (coords, elevation, unpaved, pois, lines)
        match /data/{dataType} {
          allow read, write: if request.auth != null;
        }
      }
    }
    
    // User Route Index Collection
    match /user_route_index/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Data Transformation

When saving data to Firebase, the following transformations are applied:

1. MongoDB ObjectIds are converted to strings
2. Nested arrays are converted to objects with numeric keys to avoid Firestore limitations
3. Date objects are converted to Firestore Timestamps
4. Undefined values are removed
5. Functions and symbols are skipped

## Performance Considerations

1. For large routes, coordinates are split into chunks to avoid Firestore's document size limitations
2. The `type_index` collection is used for efficient filtering by route type
3. Batch operations are used for atomic writes of complex data structures
4. The hierarchical structure allows for more flexible access patterns and better query performance
