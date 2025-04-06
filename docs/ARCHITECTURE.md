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

The application follows a feature-based architecture, with clear separation between the frontend (React/Vite) and the backend (Vercel Serverless Functions). Each feature is self-contained where possible, with its own components, services, types, and utilities within the `src/` (frontend) and `api/` (backend) directories.

Here's a high-level overview of the main directories:
```
/
├── src/                    # Frontend source code (React/Vite)
│   ├── components/         # Reusable UI components
│   ├── features/           # Feature modules (map, poi, photo, etc.)
│   ├── lib/                # Shared utilities/libraries
│   └── ...
├── api/                    # Backend Vercel Serverless Functions
│   ├── gpx/
│   ├── photos/
│   ├── poi/
│   ├── routes/
│   └── ...
├── docs/                   # Project documentation
├── public/                 # Static assets served by Vite
└── ...                     # Configuration files (package.json, vercel.json, etc.)
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
- Backend processing (in `api/gpx` function):
  - File validation and parsing
  # TODO: Add details on progress tracking if applicable
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

## Backend Architecture (Vercel Serverless Functions)

The backend logic is implemented as Vercel Serverless Functions located in the `api/` directory. Each function typically handles a specific feature or endpoint (e.g., `api/routes`, `api/photos`).

### API Structure
- Routing is defined in `vercel.json` and maps URL paths to specific serverless function files (e.g., `/api/routes` maps to `api/routes/index.js`).
- Middleware-like logic (authentication checks, validation) is generally handled within each function handler or potentially using Vercel Edge Middleware (if configured).
- Public vs. private endpoints are controlled by authentication checks within the relevant function handlers.

### Data Processing
- Serverless functions handle tasks like:
  - GPX processing
  - Photo storage interaction (e.g., S3 pre-signed URLs, Cloudinary)
  - POI data management (database interactions)
  - Route saving/loading (database interactions)
- Functions are stateless and rely on external services (Database, Cache, Storage) for persistence.

### Type Safety
- Shared type definitions between frontend (`src/types`) and backend (`api/lib/types` or similar) can help maintain consistency, although they might need careful management.
- Input validation within each function handler is crucial.

## Development Tools

- TypeScript for type safety
- Vite for development and building
- Tailwind CSS for styling
- ESLint for code quality
- Environment-based configuration
