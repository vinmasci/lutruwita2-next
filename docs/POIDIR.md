# Points of Interest (POI) System Directory

This document provides a comprehensive overview of the POI system, including file locations, functionality, and the lifecycle of POIs.

## Core Files

### Types and Models

- `src/features/poi/types/poi.types.ts`
  - Defines TypeScript interfaces for POI data structures
  - Includes POI categories, icon types, and context types
  - Defines two main POI types: DraggablePOI and PlaceNamePOI

- `server/src/features/poi/models/poi.model.ts`
  - Defines MongoDB schema for POIs
  - Handles validation of required fields
  - Supports both draggable and place-based POIs

### State Management

- `src/features/poi/context/POIContext.tsx`
  - Manages POI state using React Context
  - Provides methods for CRUD operations on POIs
  - Handles POI validation and type safety
  - Manages POI loading/saving with routes

### Services

- `src/features/poi/services/poiService.ts`
  - Client-side service for POI operations
  - Handles API communication with authentication
  - Provides methods for CRUD operations

- `server/src/features/poi/services/poi.service.ts`
  - Server-side service for POI operations
  - Handles database operations
  - Manages POI persistence and deletion

### API Layer

- `server/src/features/poi/controllers/poi.controller.ts`
  - Handles HTTP requests for POI operations
  - Manages error handling and responses
  - Coordinates with POI service

## POI Categories and Icons

POIs are organized into seven categories:

1. Road Information
   - Icons: TrafficCone, Octagon, AlertOctagon, Lock, etc.
   - Used for road conditions and warnings

2. Accommodation
   - Icons: Tent, Car, Bell, BedDouble, BedSingle
   - Represents lodging options

3. Food & Drink
   - Icons: Utensils, Coffee, Droplet, Pizza, etc.
   - Marks dining and refreshment locations

4. Natural Features
   - Icons: Mountain, TreePine, Binoculars, Swimming
   - Highlights landscape features

5. Town Services
   - Icons: Hospital, Toilet, ShowerHead, ParkingSquare, etc.
   - Shows available facilities

6. Transportation
   - Icons: Bus, TrainStation, Plane, Ship
   - Indicates transport options

7. Event Information
   - Icons: PlayCircle, StopCircle, Stethoscope, etc.
   - Marks event-related points

## POI Types

### 1. Draggable POIs
- Freely positionable on the map
- Not tied to specific places
- Used for custom markers and annotations

### 2. Place POIs
- Associated with specific locations/places
- Include a placeId reference
- Used for marking known locations

## POI Lifecycle

1. **Creation**
   - User initiates POI creation through UI
   - POIDrawer component opens for input
   - User selects category and icon
   - User provides name and optional description
   - Position is set based on map interaction

2. **State Management**
   - POI is added to POIContext state
   - Temporary ID is assigned
   - POI is rendered on map via MapboxPOIMarker

3. **Persistence**
   - POIs are saved as part of route data
   - POIService handles API communication
   - MongoDB stores POI data
   - POIs are validated before storage

4. **Loading**
   - POIs are loaded with route data
   - POIContext processes loaded POIs
   - MapboxPOIMarker renders POIs on map

5. **Updates**
   - Position updates via drag operations
   - Details updates via POIDetailsDrawer
   - Changes sync to context and persist with route

6. **Deletion**
   - User can remove POIs
   - Removed from context state
   - Deleted from database with route updates

## Key Components

- `POIDrawer`: Handles POI creation and editing
- `MapboxPOIMarker`: Renders POIs on the map
- `POIDetailsDrawer`: Shows and edits POI details
- `PlacePOILayer`: Manages place-specific POIs
- `POIViewer`: Displays POI information

## File Organization

```
src/features/poi/
├── components/           # UI components
│   ├── MapboxPOIMarker/ # Map marker rendering
│   ├── POIDrawer/       # Creation/editing interface
│   ├── POIViewer/       # POI display component
│   └── ...
├── context/             # State management
├── services/            # API communication
├── types/               # TypeScript definitions
└── utils/              # Helper functions

server/src/features/poi/
├── controllers/         # API endpoints
├── models/             # Database schemas
├── routes/             # Route definitions
└── services/           # Business logic
```

## Integration Points

- Integrates with the route system for saving/loading
- Works with the map system for rendering
- Connects with the place system for place-based POIs
- Uses the photo system for POI images
