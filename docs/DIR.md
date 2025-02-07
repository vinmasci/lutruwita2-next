# Directory Structure

This document outlines the project structure and describes the purpose of key files and directories.

```
.
├── .gitignore                      # Git ignore rules for version control
├── index.html                      # Main HTML entry point for the React application
├── package.json                    # Project dependencies, scripts, and configuration
├── tailwind.config.js             # Tailwind CSS configuration for styling
├── tsconfig*.json                 # TypeScript configurations for different parts of the project
├── vite.config.ts                 # Vite bundler configuration for build optimization
├── docs/                          # Project documentation
│   ├── ARCHITECTURE.md            # Overall system architecture and design decisions
│   ├── BASICGPX.MD               # Core GPX functionality implementation details
│   ├── DIR.md                     # This directory structure document
│   ├── ELEVATION_PROFILE.md      # Elevation profile feature implementation details
│   ├── GPX_Processing_Issues.md   # Known GPX processing issues and their solutions
│   ├── GPX_UPLOADER_DRAWER.md    # GPX uploader drawer implementation guide
│   ├── LOAD.md                   # Documentation for load functionality
│   ├── MIGRATION_LOG.md           # Detailed log of migration changes and progress
│   ├── MIGRATIONPLAN.md           # Strategic plan for system migration
│   ├── OLDFUNCTIONS.md            # Archive of previous implementations for reference
│   ├── PLACE_METADATA_FIX.md     # Documentation for place metadata fixes
│   ├── POI_DISAPPEARANCE_ANALYSIS.md # Analysis of POI visibility issues
│   ├── POI_IMPLEMENTATION_PLAN.md # Detailed plan for Points of Interest feature
│   ├── POINOTES.md               # General POI feature documentation and notes
│   ├── POI_PLACES.md             # Documentation for POI places functionality
│   ├── POI_PROGRESS_NOTES.md     # Tracking progress of POI feature development
│   ├── ROUTE_RENDERING_DISCOVERY.md # Analysis of route rendering improvements
│   ├── SAVE_ISSUE_ANALYSIS.md    # Analysis of save functionality issues
│   ├── SAVE_LOAD_IMPLEMENTATION.md # Documentation for save/load functionality
│   ├── surface-detection.md       # Documentation for surface type detection
│   └── surfacedetectionplan.md    # Planning document for surface detection
├── logs/                          # Application logging directory
│   ├── error.log                  # General application error logs
│   ├── exceptions.log             # Detailed exception tracking
│   ├── rejections.log            # Promise rejection tracking
│   └── server.log                # Server activity and request logging
├── public/                        # Static public assets
│   ├── favicon.ico               # Website favicon
│   └── images/                   # Static image assets
│       └── photo-fallback.svg    # Default image for failed photo loads
├── server/                        # Backend server code
│   ├── src/
│   │   ├── server.ts             # Main Express server setup and configuration
│   │   ├── controllers/          # [REDUNDANT] Main controllers (should be moved to features)
│   │   ├── features/            # Feature-specific backend implementations
│   │   │   ├── gpx/             # GPX processing feature backend
│   │   │   │   ├── controllers/  # GPX request handlers
│   │   │   │   ├── routes/      # GPX API endpoint definitions
│   │   │   │   ├── services/    # GPX data processing services
│   │   │   │   └── types/       # GPX type definitions
│   │   │   ├── poi/             # POI management feature backend
│   │   │   │   ├── controllers/  # POI request handlers
│   │   │   │   ├── models/      # POI data models (MongoDB schemas)
│   │   │   │   ├── routes/      # POI API endpoint definitions
│   │   │   │   ├── services/    # POI data services
│   │   │   │   └── types/       # POI type definitions
│   │   │   └── route/           # Route management feature backend
│   │   │       ├── controllers/  # Route request handlers
│   │   │       ├── models/      # Route data models
│   │   │       ├── routes/      # Route API endpoint definitions
│   │   │       ├── services/    # Route data services
│   │   │       └── types/       # Route type definitions
│   │   ├── routes/              # [REDUNDANT] Main routes (should be moved to features)
│   │   ├── services/            # [REDUNDANT] Main services (should be moved to features)
│   │   ├── shared/              # Shared backend utilities
│   │   │   ├── config/         # Server configuration (logging, env vars)
│   │   │   ├── middlewares/    # Express middlewares (error handling, file upload)
│   │   │   └── types/         # Shared type definitions
├── src/                          # Frontend source code
│   ├── App.tsx                   # Main React application component and routing
│   ├── env.d.ts                 # Environment variable type definitions
│   ├── index.css               # Global CSS styles
│   ├── main.tsx                 # Frontend entry point and provider setup
│   ├── theme.ts                 # Global theme configuration
│   ├── components/              # Shared UI components
│   │   └── ui/                 # Base UI components
│   │       └── skeleton.tsx    # Loading skeleton component for content
│   ├── features/               # Feature modules
│   │   ├── auth/               # Authentication feature
│   │   │   └── components/     # Auth components
│   │   │       ├── Auth0Login/ # Auth0 integration
│   │   │       │   ├── Auth0Login.tsx # Login component
│   │   │       │   └── Auth0Login.css # Login styling
│   │   │       └── Auth0Callback/ # Auth0 callback handling
│   │   │           └── Auth0Callback.tsx # Callback component
│   │   ├── gpx/               # GPX processing feature
│   │   │   ├── components/    # GPX-specific components
│   │   │   │   ├── ElevationProfile/ # Elevation visualization
│   │   │   │   │   ├── ElevationProfile.tsx      # Main elevation chart
│   │   │   │   │   ├── ElevationProfilePanel.tsx # Interactive profile panel
│   │   │   │   │   └── ElevationProfile.styles.ts # Chart styling
│   │   │   │   └── Uploader/ # GPX file management
│   │   │   │       ├── Uploader.tsx      # Core upload logic
│   │   │   │       ├── UploaderUI.tsx    # Upload interface
│   │   │   │       ├── Uploader.types.ts # Type definitions
│   │   │   │       └── index.ts          # Public exports
│   │   │   ├── hooks/        # GPX-related hooks
│   │   │   │   ├── useClientGpxProcessing.ts # Client-side processing
│   │   │   │   └── useGpxProcessing.ts      # Server processing
│   │   │   ├── services/     # GPX data services
│   │   │   │   ├── gpxService.ts        # Core GPX operations
│   │   │   │   ├── mapMatchingService.ts # Route matching
│   │   │   │   └── surfaceService.ts    # Surface analysis
│   │   │   ├── types/       # GPX type definitions
│   │   │   └── utils/       # GPX utilities
│   │   │       ├── climbUtils.ts # Climb categorization
│   │   │       ├── gpxParser.ts  # GPX file parsing
│   │   │       └── roadUtils.ts  # Road surface analysis
│   │   ├── map/             # Map visualization feature
│   │   │   ├── components/  # Map components
│   │   │   │   ├── DistanceMarkers/ # Distance indicators
│   │   │   │   │   ├── DistanceMarkers.tsx # Marker component
│   │   │   │   │   └── DistanceMarkers.css # Marker styling
│   │   │   │   ├── MapControls/ # Interactive controls
│   │   │   │   ├── RouteLayer/  # Route visualization
│   │   │   │   │   ├── RouteLayer.tsx # Route rendering
│   │   │   │   │   ├── types.ts      # Route layer types
│   │   │   │   │   └── index.ts      # Public exports
│   │   │   │   ├── MapView/    # Core map component
│   │   │   │   │   ├── MapView.tsx # Map rendering and interaction logic
│   │   │   │   │   └── MapView.css # Map styling and layout
│   │   │   │   ├── SearchControl/ # Location search functionality
│   │   │   │   │   ├── SearchControl.tsx # Search component
│   │   │   │   │   └── SearchControl.css # Search styling
│   │   │   │   ├── StyleControl/ # Map style switcher
│   │   │   │   └── Sidebar/    # Navigation and route management
│   │   │   │       ├── Sidebar.tsx       # Main sidebar component
│   │   │   │       ├── Sidebar.styles.ts # Drawer styling
│   │   │   │       ├── RouteList.tsx     # Route list management
│   │   │   │       ├── SaveDialog.tsx    # Route saving dialog
│   │   │   │       ├── LoadDialog.tsx    # Route loading dialog
│   │   │   │       ├── SidebarListItems.tsx # List item components
│   │   │   │       ├── useSidebar.ts    # Sidebar logic
│   │   │   │       └── types.ts         # Type definitions
│   │   │   ├── context/    # Map state management
│   │   │   │   ├── MapContext.tsx  # Map instance/state
│   │   │   │   └── RouteContext.tsx # Route data/state
│   │   │   ├── hooks/      # Map functionality hooks
│   │   │   │   ├── useMap.ts      # Map interactions
│   │   │   │   ├── useRouteState.ts # Route state management
│   │   │   │   └── useGpxProcessing.ts # Route processing
│   │   │   ├── services/   # Map-related services
│   │   │   │   ├── mapService.ts  # Map operations
│   │   │   │   └── routeService.ts # Route operations
│   │   │   └── types/     # Map type definitions
│   │   │       ├── map.types.ts   # Map interfaces
│   │   │       └── route.types.ts # Route interfaces
│   │   ├── photo/         # Photo management feature
│   │   │   ├── components/ # Photo components
│   │   │   │   ├── PhotoCluster/ # Photo grouping
│   │   │   │   │   ├── PhotoCluster.tsx # Cluster logic
│   │   │   │   │   └── PhotoCluster.css # Cluster styling
│   │   │   │   ├── PhotoLayer/ # Photo map layer
│   │   │   │   │   ├── PhotoLayer.tsx # Layer management
│   │   │   │   │   └── PhotoLayer.css # Layer styling
│   │   │   │   ├── PhotoMarker/ # Photo map markers
│   │   │   │   │   ├── PhotoMarker.tsx # Marker component
│   │   │   │   │   └── PhotoMarker.css # Marker styling
│   │   │   │   ├── PhotoPreview/ # Photo viewing
│   │   │   │   │   └── PhotoPreviewModal.tsx # Modal viewer
│   │   │   │   └── Uploader/ # Photo upload
│   │   │   │       ├── PhotoUploader.tsx # Upload logic
│   │   │   │       ├── PhotoUploaderUI.tsx # Upload UI
│   │   │   │       └── PhotoUploader.types.ts # Type defs
│   │   │   └── context/   # Photo state management
│   │   │       └── PhotoContext.tsx # Photo data/state
│   │   ├── place/         # Place management feature
│   │   │   ├── context/   # Place state management
│   │   │   │   └── PlaceContext.tsx # Place data/state
│   │   │   ├── types/     # Place type definitions
│   │   │   │   └── place.types.ts # Place interfaces
│   │   │   └── utils/     # Place utilities
│   │   │       └── migration.ts # Place data migration
│   │   └── poi/           # Points of Interest feature
│   │       ├── components/ # POI components
│   │       │   ├── MapboxPOIMarker/ # Mapbox markers
│   │       │   │   ├── MapboxPOIMarker.tsx # Marker logic
│   │       │   │   ├── MapboxPOIMarker.styles.css # Styling
│   │       │   │   └── index.ts     # Public exports
│   │       │   ├── PlacePOIIconSelection/ # Place icons
│   │       │   │   ├── PlacePOIIconSelection.tsx # Icon selector
│   │       │   │   └── index.ts     # Public exports
│   │       │   ├── PlacePOILayer/ # Place visualization
│   │       │   │   ├── PlacePOILayer.tsx # Layer component
│   │       │   │   ├── PlacePOILayer.css # Layer styling
│   │       │   │   └── index.ts     # Public exports
│   │       │   ├── POIDetailsDrawer/ # POI info display
│   │       │   │   ├── POIDetailsDrawer.tsx # Generic details
│   │       │   │   ├── PlacePOIDetailsDrawer.tsx # Place details
│   │       │   │   └── index.ts     # Public exports
│   │       │   ├── POIDragPreview/  # Drag feedback
│   │       │   │   └── POIDragPreview.tsx # Preview component
│   │       │   ├── POIDrawer/   # POI management
│   │       │   │   ├── POIDrawer.tsx # Main drawer
│   │       │   │   ├── POIDetailsForm.tsx # Info form
│   │       │   │   ├── POIIconSelection.tsx # Icon picker
│   │       │   │   ├── POILocationInstructions.tsx # Help
│   │       │   │   ├── POIModeSelection.tsx # Mode UI
│   │       │   │   ├── PlacePOIInstructions.tsx # Place help
│   │       │   │   ├── POIDrawer.styles.ts # Styling
│   │       │   │   ├── types.ts    # Type definitions
│   │       │   │   └── index.ts    # Public exports
│   │       │   ├── POIMarker/   # Generic markers
│   │       │   │   ├── POIMarker.tsx # Base marker
│   │       │   │   ├── POIMarker.styles.ts # Styling
│   │       │   │   ├── types.ts    # Type definitions
│   │       │   │   └── index.ts    # Public exports
│   │       │   └── POIViewer/   # POI display
│   │       │       └── POIViewer.tsx # Viewer component
│   │       ├── constants/  # POI configuration
│   │       │   ├── icon-paths.ts # Icon file paths
│   │       │   └── poi-icons.ts  # Icon definitions
│   │       ├── context/    # POI state management
│   │       │   └── POIContext.tsx # POI data/state
│   │       ├── types/     # POI type definitions
│   │       │   └── poi.types.ts # POI interfaces
│   │       └── utils/     # POI utilities
│   │           ├── photo.ts # Photo processing
│   │           └── placeDetection.ts # Place detection
│   ├── lib/               # Core utilities
│   │   ├── errors.ts     # Error handling
│   │   └── utils.ts      # Common utilities
│   ├── types/            # Global types
│   │   ├── api.types.ts  # API interfaces
│   │   └── index.ts      # Type exports
│   └── utils/            # Shared utilities
│       └── gpx/          # GPX parsing
└── uploads/              # Temporary file storage
```

## Feature Integration

The application's features are tightly integrated while maintaining clear boundaries:

### GPX Processing ↔ Map Integration
- GPX processing provides route data to the map
- Map context maintains the visual state of routes
- Elevation profile syncs with map interactions
- Surface detection results overlay on the map

### POI ↔ Map Integration
- POI markers render on the map layer using MapboxPOIMarker
- Map interactions trigger POI operations through POIContext
- Place detection uses map viewport for location-based POIs
- Drag and drop uses map coordinates for precise positioning
- POIs are saved and loaded with route data
- POIs support two types: draggable (free-form) and place-based
- POIs are categorized (road info, accommodation, food/drink, etc.)
- Each POI type has specific icons and styling options

### Photo ↔ POI Integration
- Photos can be attached to POIs
- Photo clusters consider POI locations
- Shared photo processing utilities
- Consistent styling between features

### Place ↔ POI Integration
- Places can contain multiple POIs
- Place detection informs POI creation
- Shared icon selection system
- Consistent metadata structure

## Redundant Files (To Be Consolidated)

The following files should be consolidated to maintain a cleaner architecture:

1. Server Controllers:
   - `server/src/controllers/gpx.controller.ts` should be moved to `server/src/features/gpx/controllers/`

2. Server Routes:
   - `server/src/routes/gpx.routes.ts` should be moved to `server/src/features/gpx/routes/`

3. Server Services:
   - `server/src/services/gpx/gpx.processing.ts` should be moved to `server/src/features/gpx/services/`

4. GPX Processing:
   - `src/features/map/hooks/useGpxProcessing.ts` should be consolidated with `src/features/gpx/hooks/useGpxProcessing.ts`

This consolidation aligns with the feature-based architecture and reduces maintenance overhead.

## Key Components

### Context Providers
- `MapContext`: Manages map instance, viewport state, and map interactions
- `RouteContext`: Handles route data, selection state, and route operations
- `POIContext`: Controls POI data, active POI state, and POI operations
- `PhotoContext`: Manages photo data, upload state, and photo operations
- `PlaceContext`: Handles place data and place-POI relationships

### Core Services
- `gpxService`: Handles GPX file parsing and data extraction
- `mapMatchingService`: Aligns GPS tracks with road networks
- `surfaceService`: Analyzes and categorizes road surfaces
- `routeService`: Manages route data persistence and operations
- `poiService`: Handles POI CRUD operations and persistence
- `placeDetection`: Identifies and processes place-based POIs
- `photoService`: Handles photo upload and processing operations
- `authService`: Manages authentication and authorization

### Utility Functions
- `climbUtils`: Categorizes climbs based on gradient and distance
- `roadUtils`: Processes road surface characteristics
- `photo`: Handles photo processing and optimization
- `placeDetection`: Implements place detection algorithms
- `gpxParser`: Provides low-level GPX file parsing

## Configuration

### TypeScript Configuration
Multiple TypeScript configuration files target different parts of the application:
- `tsconfig.app.json`: React application settings
- `tsconfig.base.json`: Shared base configuration
- `tsconfig.client.json`: Frontend-specific settings
- `tsconfig.server.json`: Backend-specific settings
- `tsconfig.node.json`: Node.js runtime settings

### Logging System
Comprehensive logging across different concerns:
- `error.log`: General application errors
- `exceptions.log`: Detailed exception tracking
- `rejections.log`: Promise rejection monitoring
- `server.log`: API request and response logging
