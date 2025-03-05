# Draggable POIs Implementation

This document provides a comprehensive overview of the draggable Points of Interest (POIs) feature in the application, including all relevant components, their interactions, and the data flow.

## Overview

The draggable POIs feature allows users to add custom markers to the map that can be:
- Created by selecting an icon and dragging it onto the map
- Viewed with detailed information
- Edited (name, description, photos)
- Moved to different locations on the map
- Deleted

## Components and Files

### Core Components

1. **POI Context** (`src/features/poi/context/POIContext.js`)
   - Manages the state of all POIs
   - Provides methods for adding, updating, removing, and repositioning POIs
   - Handles loading POIs from routes

2. **MapboxPOIMarker** (`src/features/poi/components/MapboxPOIMarker/MapboxPOIMarker.js`)
   - Renders POI markers on the map using Mapbox GL
   - Handles marker styling based on POI category and icon
   - Implements drag functionality for repositioning markers
   - Manages click events for opening POI details

3. **POIDragPreview** (`src/features/poi/components/POIDragPreview/POIDragPreview.js`)
   - Creates a draggable preview when a user selects a POI icon
   - Follows the cursor during drag operations
   - Converts screen coordinates to map coordinates on drop
   - Triggers POI creation at the drop location

4. **POIDrawer** (`src/features/poi/components/POIDrawer/POIDrawer.tsx`)
   - Main interface for POI creation
   - Provides icon selection and category filtering
   - Manages the POI creation workflow
   - Handles different POI modes (regular, place)

5. **POIDetailsDrawer** (`src/features/poi/components/POIDetailsDrawer/index.ts`)
   - Form for entering POI details (name, description)
   - Handles saving new POI information

6. **POIViewer** (`src/features/poi/components/POIViewer/POIViewer.js`)
   - Displays POI details when a marker is clicked
   - Provides editing capabilities for existing POIs
   - Allows adding/removing photos
   - Includes delete functionality

7. **MapView** (`src/features/map/components/MapView/MapView.js`)
   - Integrates POI components with the map
   - Manages POI interaction modes
   - Handles POI click events

### Supporting Files

1. **POI Types** (`src/features/poi/types/poi.types.js`)
   - Defines POI categories and their styling
   - Contains type definitions for POI data structures

2. **POI Icons** (`src/features/poi/constants/poi-icons.js`)
   - Defines available POI icons and their metadata
   - Maps icons to categories

3. **Icon Paths** (`src/features/poi/constants/icon-paths.js`)
   - Maps icon names to CSS class paths for rendering

4. **POI Model** (`server/src/features/poi/models/poi.model.ts`)
   - Mongoose schema for POI data storage
   - Defines required fields and validation

5. **POI Service** (`server/src/features/poi/services/poi.service.ts`)
   - Server-side logic for POI operations
   - Handles database interactions

6. **POI Controller** (`server/src/features/poi/controllers/poi.controller.ts`)
   - API endpoints for POI operations
   - Handles request/response for POI data

7. **POI Client Service** (`src/features/poi/services/poiService.js`)
   - Client-side service for API interactions
   - Handles authentication and error handling

## Data Flow

### POI Creation Process

1. User opens the POI drawer by clicking the "Add POI" button in the sidebar
2. User selects a POI icon from the drawer
3. The icon is attached to the cursor as a drag preview
4. User drags the icon to the desired location on the map
5. On drop, the POI details drawer opens
6. User enters name and description for the POI
7. On save:
   - POI is added to the POI context state
   - A marker is rendered on the map
   - The drawer closes

```
User → POIDrawer → POIDragPreview → MapView → POIDetailsDrawer → POIContext → MapboxPOIMarker
```

### POI Dragging Process

1. User clicks and holds on an existing POI marker
2. The marker enters dragging mode
3. User moves the marker to a new location
4. On release:
   - The new coordinates are calculated
   - The POI position is updated in the context
   - The marker is rerendered at the new position

```
User → MapboxPOIMarker → POIContext → MapboxPOIMarker
```

### POI Viewing/Editing Process

1. User clicks on a POI marker
2. The POI viewer drawer opens with POI details
3. User can view information or enter edit mode
4. In edit mode:
   - Name and description can be modified
   - Photos can be added or removed
5. On save, the POI is updated in the context

```
User → MapboxPOIMarker → POIViewer → POIContext → MapboxPOIMarker
```

## Data Structure

POIs are stored with the following structure:

```javascript
{
  id: string,                    // Unique identifier
  type: 'draggable' | 'place',   // POI type
  coordinates: [number, number], // [longitude, latitude]
  name: string,                  // Display name
  description?: string,          // Optional description
  category: string,              // Category from POI_CATEGORIES
  icon: string,                  // Icon name from POI_ICONS
  photos?: Array<{              // Optional photos
    url: string,
    caption?: string
  }>,
  style?: {                     // Optional styling
    color?: string,
    size?: number
  },
  placeId?: string              // Only for place type POIs
}
```

## POI Categories

POIs are organized into categories, each with a distinct color:

- Road Information (red)
- Accommodation (purple)
- Food & Drink (orange)
- Natural Features (green)
- Town Services (blue)
- Transportation (teal)
- Event Information (dark gray)
- Climb Categories (dark red)

## Implementation Details

### Marker Rendering

POI markers are rendered using Mapbox GL markers with custom HTML elements. The marker appearance is determined by:

1. The POI category (determines the base color)
2. The POI icon (determines the icon displayed)
3. Any custom styling applied to the POI

Markers use a bubble-pin style with the icon displayed inside the bubble and a pointer extending below.

### Drag and Drop

The drag and drop functionality is implemented using:

1. Mapbox GL's built-in marker dragging for existing POIs
2. Custom drag preview for new POIs being placed on the map

For new POIs, the drag preview follows the cursor and converts screen coordinates to map coordinates on drop.

### State Management

POI state is managed through the POI context, which:

1. Maintains the current list of POIs
2. Provides methods for CRUD operations
3. Handles loading POIs from routes
4. Manages POI mode (regular, place)

### Server Integration

POIs are persisted to the server through the POI service, which:

1. Authenticates requests using Auth0
2. Sends POI data to the server API
3. Retrieves POIs from the server
4. Handles error conditions

## Usage

To add a new POI:

1. Click the "Add POI" button in the sidebar
2. Select an icon from the drawer
3. Drag the icon to the desired location on the map
4. Enter name and description in the details drawer
5. Click "Save"

To move a POI:

1. Click and hold on the POI marker
2. Drag to the new location
3. Release to place

To edit a POI:

1. Click on the POI marker
2. Click "Edit" in the viewer drawer
3. Make changes to name, description, or photos
4. Click "Save"

To delete a POI:

1. Click on the POI marker
2. Click "Delete" in the viewer drawer
