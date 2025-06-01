# Firebase Multistage Route Schema

This document outlines the structure of multistage routes in Firebase.

## Data Structure Overview

```
user_saved_routes/{masterRouteId}/
├── data/
│   ├── routes/              # Master route metadata
│   │   └── data: [          # Array of route segment metadata
│   │       {routeId, name, metadata...},
│   │       {routeId, name, metadata...},
│   │       ...
│   │   ]
│   ├── pois/                # Points of Interest for the master route
│   │   └── data: { ... }    # Map of POI data
│   ├── photos/              # Photos associated with the master route
│   │   └── data: [ ... ]    # Array of photo objects
│   └── lines/               # Lines (e.g., for highlighting areas or features)
│       └── data: [ ... ]    # Array of line objects
└── routes/                  # Collection of individual route segments
    ├── {segment1Id}/        # Individual segment document
    │   └── data/            # Segment data subcollection
    │       ├── coords/      # Coordinates for this segment
    │       │   └── data: [  # Array of coordinate points
    │       │       {lat, lng, elevation},
    │       │       {lat, lng, elevation},
    │       │       ...
    │       │   ]
    │       └── unpaved/     # Unpaved sections for this segment
    │           └── data: [  # Array of unpaved section objects
    │               {...},
    │               {...}
    │           ]
    ├── {segment2Id}/
    └── ...
```

## Detailed Structure

### Master Route Document

Path: `user_saved_routes/{masterRouteId}`

This document contains the primary metadata for the master route.
Example:
```json
{
  "userId": "string", // ID of the user who owns the route
  "name": "string", // Overall name of the master route
  "description": "string", // Detailed description of the master route
  "createdAt": "timestamp", // Firestore server timestamp
  "updatedAt": "timestamp", // Firestore server timestamp
  "statistics": { /* aggregated statistics object */ },
  "routeType": "string", // e.g., "Single", "Multiday"
  "headerSettings": { /* object for header customization */ },
  "isPublic": "boolean", // Whether the route is publicly accessible
  "tags": ["array", "of", "strings"], // Optional tags
  "thumbnailUrl": "string", // URL to a thumbnail image
  "thumbnailPublicId": "string" // Public ID for Cloudinary thumbnail (if applicable)
  // ... other master-level fields
}
```

### Routes Metadata

Path: `user_saved_routes/{masterRouteId}/data/routes`

Contains metadata for all route segments in an array:

```json
{
  "data": [
    {
      "addedAt": "2025-05-11T07:34:28.775Z",
      "color": "#ee5253",
      "gpxFileName": "NZ_Day_1_A2O_Lake_Pukaki_Twisel.gpx",
      "metadata": {
        "country": "New Zealand",
        "lga": "",
        "state": "Canterbury",
        "name": "NZ Day 1: A2O Lake Pukaki - Twisel"
      },
      "routeId": "route-6f97a766-e638-47f7-b913-6ca77deb2e42",
      "statistics": {
        "averageSpeed": 0,
        "elevationGain": 406.37333333333595,
        "elevationLoss": 468.573333333336,
        "maxElevation": 622,
        "minElevation": 505.4,
        "movingTime": 0,
        "totalDistance": 74979.75030368441,  // Note: in meters
        "totalTime": 0
      }
    },
    // Additional route segments...
  ]
}
```

### Points of Interest (POIs)

Path: `user_saved_routes/{masterRouteId}/data/pois`

Contains data for points of interest associated with the master route.

```json
{
  "data": {
    "draggable": [
      {
        "category": "natural-features",
        "coordinates": [
          170.16868259210707,
          -44.04717240764633
        ],
        "description": "",
        "googlePlaces": null,
        "googlePlacesLink": "",
        "icon": "Binoculars",
        "name": "Lake Pukaki",
        "type": "draggable"
      }
      // Additional POIs...
    ]
    // Other POI categories if necessary
  }
}
```
*Note: The example shows POIs under a "draggable" array. The structure might vary based on POI types or organization.*


### Photos

Path: `user_saved_routes/{masterRouteId}/data/photos`

Contains an array of photo objects associated with the master route.

```json
{
  "data": [
    {
      "caption": "",
      "coordinates": {
        "lat": -43.882362081122494,
        "lng": 170.1773204577235
      },
      "dateAdded": "2025-05-17T04:53:06.685Z",
      "id": "photo-1747457586598-0.6487220565662624",
      "isManuallyPlaced": true,
      "name": "Screenshot 2025-05-13 at 8.58.15 pm.png",
      "publicId": "logos/leo8jnyuoyh9ljvjag1m",
      "url": "https://res.cloudinary.com/dig9djqnj/image/upload/v1747457595/logos/leo8jnyuoyh9ljvjag1m.png"
    }
    // Additional photo objects...
  ]
}
```

### Lines

Path: `user_saved_routes/{masterRouteId}/data/lines`

Contains an array of line objects, which can be used for various map annotations.

```json
{
  "data": [
    {
      "coordinates": {
        "end": [
          170.57434882461496,
          -44.43665547115102
        ],
        "mid": [
          170.01591212416903,
          -44.43665547115102
        ],
        "start": [
          169.96607753625835,
          -44.48649005906171
        ]
      },
      "description": "",
      "icons": [
        "ShoppingCart",
        "Car",
        "BedDouble"
      ],
      "id": "line-1747133618352",
      "name": "Omarama",
      "photos": [], // Array to link photo IDs or objects
      "type": "line"
    }
    // Additional line objects...
  ]
}
```

### Individual Route Segments

Path: `user_saved_routes/{masterRouteId}/routes/{segmentId}`

Each segment may contain its own document data.

### Segment Coordinates

Path: `user_saved_routes/{masterRouteId}/routes/{segmentId}/data/coords`

Contains the coordinates for a specific route segment:

```json
{
  "data": [
    {
      "elevation": 149.4,
      "lat": -45.258073,
      "lng": 169.391057
    },
    // Additional coordinates...
  ]
}
```

### Segment Unpaved Sections

Path: `user_saved_routes/{masterRouteId}/routes/{segmentId}/data/unpaved`

Contains data about unpaved sections of the route. These sections can be represented in two formats:

1. **Explicit Coordinates Format**:
```json
{
  "data": [
    {
      "surfaceType": "gravel",
      "coordinates": [
        {"lat": -45.258073, "lng": 169.391057},
        {"lat": -45.258263, "lng": 169.391736},
        // Additional coordinates for this unpaved section...
      ]
    },
    // Additional unpaved sections...
  ]
}
```

2. **Index-Based Format**:
```json
{
  "data": [
    {
      "surfaceType": "gravel",
      "startIndex": 250, // Index in the main route coordinates array
      "endIndex": 350    // Index in the main route coordinates array
    },
    // Additional unpaved sections...
  ]
}
```

When rendering unpaved sections on the map, the app should:
- Use the explicit coordinates if provided
- Or, extract the coordinates from the main route using the indices if using the index-based format
- Style unpaved sections differently (e.g., with white solid lines)

## Example Route IDs

The following are example route segment IDs:

- route-21868db9-8c4e-4584-87fc-61ec2d78f548
- route-543b25f1-bf44-4750-aedb-f6630e03d524
- route-55cad4b5-06b4-4705-94de-fcfdc183b87f
- route-683dd1ae-983b-4930-af5b-478c1b191756
- route-6f97a766-e638-47f7-b913-6ca77deb2e42
- route-e1546a8b-0cac-42d9-a80e-a749469632aa

## Notes

- Distances are stored in meters and should be divided by 1000 for kilometer display
- Elevation data is stored in meters
- Route segment names typically follow the format "Day X: Location - Destination"
- Unpaved sections should be rendered with a distinctive styling (white lines are used in the current implementation)
- The current version of Mapbox SDK doesn't support dashed lines (lineDasharray), so solid white lines are used instead
