# Architecture for Lutruwita 2.0

## Development Philosophy

Our core development mantra is to maintain small, manageable, and easily maintainable files. This philosophy is reflected throughout the project structure where we:
- Break down complex components into smaller, focused files
- Separate concerns into distinct modules
- Keep files single-purpose and concise
- Organize code into logical, feature-based directories
- Split presentation and logic into separate files

This approach ensures:
- Better code readability
- Easier maintenance
- Simpler testing
- More efficient collaboration
- Reduced cognitive load when working with the codebase

## Project Structure

The application follows a feature-based architecture, with clear separation between client and server code. Each feature is self-contained with its own components, services, types, and utilities.

For a detailed breakdown of the project structure, including descriptions of all directories and key files, please refer to [DIR.md](./DIR.md).

Here's a high-level overview of the main directories:
```
/
├── src/                    # Client-side code with feature modules
├── server/                 # Server-side code with feature modules
├── docs/                   # Project documentation
├── public/                 # Static assets
└── uploads/                # Temporary file storage
```

## Core Features

### 1. Map System
The application is split into two main modes:

#### Editor Mode (Authenticated)
- Full map editing capabilities
- Components:
  - MapView: Core map visualization
  - RouteLayer: Route rendering
  - StyleControl: Map style switching
  - SearchControl: Location search
  - DistanceMarkers: Route distance indicators
  - Sidebar: Route management and editing UI
- Features:
  - Multiple map styles
  - Custom controls
  - Route visualization
  - Distance markers
  - Search functionality
  - Full editing capabilities

#### Presentation Mode (Public)
- Publicly accessible view of created maps
- No authentication required
- Simplified sidebar without editing options
- Read-only access to:
  - Routes
  - POIs
  - Photos
  - Places
- Maintains all visualization features:
  - Map styles
  - Route display
  - Distance markers
  - POI viewing

### 2. GPX Processing
- Client-side components:
  - Uploader for GPX file handling
  - ElevationProfile for elevation visualization
  - Route display on map
- Server-side processing:
  - File validation and parsing
  - Progress tracking via SSE
  - Map matching service integration
  - Surface type detection

### 3. POI System
- Components:
  - POIMarker: Map markers
  - POIDrawer: Creation/editing interface
  - POIViewer: Details view
  - PlacePOILayer: Place-specific POIs
- Features:
  - Custom icons
  - Drag and drop placement
  - Place detection
  - Details management
  - Photo attachments

### 4. Photo Management
- Components:
  - PhotoUploader: Photo upload interface
  - PhotoLayer: Map visualization
  - PhotoMarker: Individual photo markers
  - PhotoCluster: Clustered photo display
  - PhotoPreview: Image preview modal
- Features:
  - Photo upload and storage
  - Map visualization
  - Clustering
  - Preview functionality

### 5. Place Management
- Context-based state management
- Place type definitions
- Migration utilities
- Integration with POI system

### 6. Authentication
- Auth0 integration
- Login/callback handling
- Protected routes for editing features
- Public access for viewing maps
- Session management

## State Management

The application uses React Context for state management, with separate contexts for:
- Routes (RouteContext)
- Map state (MapContext)
- Places (PlaceContext)
- POIs (POIContext)
- Photos (PhotoContext)

## Server Architecture

### API Structure
- Feature-based routing
- Middleware for:
  - Authentication (for editing endpoints)
  - File uploads
  - Route validation
  - Error handling
- Public endpoints for map viewing

### Data Processing
- GPX processing with progress tracking
- Photo storage and optimization
- POI data management
- Route saving/loading

### Type Safety
- Shared type definitions between client/server
- Strict validation middleware
- Error type definitions

## Development Tools

- TypeScript for type safety
- Vite for development and building
- Tailwind CSS for styling
- ESLint for code quality
- Environment-based configuration
