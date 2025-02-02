# Directory Structure

This document outlines the project structure and describes the purpose of key files and directories.

```
.
├── .gitignore                      # Git ignore rules
├── index.html                      # Main HTML entry point
├── package.json                    # Project dependencies and scripts
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig*.json                 # TypeScript configurations for different parts of the project
├── vite.config.ts                 # Vite bundler configuration
├── docs/                          # Project documentation
│   ├── ARCHITECTURE.md            # System architecture documentation
│   ├── BASICGPX.MD               # Basic GPX functionality documentation
│   ├── DIR.md                     # This directory structure document
│   ├── ELEVATION_PROFILE.md      # Elevation profile feature documentation
│   ├── GPX_Processing_Issues.md   # Known GPX processing issues and solutions
│   ├── GPX_UPLOADER_DRAWER.md    # GPX uploader drawer documentation
│   ├── MIGRATION_LOG.md           # Migration progress and changes log
│   ├── MIGRATIONPLAN.md           # Plan for system migration
│   ├── OLDFUNCTIONS.md            # Archive of previous implementations
│   ├── POI_IMPLEMENTATION_PLAN.md # Points of Interest implementation plan
│   ├── POI_PLACES.md             # POI places feature documentation
│   ├── POI_PROGRESS_NOTES.md     # POI feature progress tracking
│   ├── surface-detection.md       # Surface detection documentation
│   └── surfacedetectionplan.md    # Planning for surface detection feature
├── logs/                          # Application logs
│   ├── error.log                  # General error logs
│   ├── exceptions.log             # Exception tracking
│   ├── rejections.log            # Promise rejection logs
│   └── server.log                # Server activity logs
├── public/                        # Static public assets
│   ├── favicon.ico               # Site favicon
│   └── images/                   # Static image assets
│       └── photo-fallback.svg    # Fallback image for photo loading
├── server/                        # Backend server code
│   ├── src/
│   │   ├── server.ts             # Main server entry point
│   │   ├── controllers/          # Request handlers
│   │   ├── features/            # Feature-specific backend implementations
│   │   │   └── gpx/             # GPX processing feature
│   │   │       ├── controllers/  # GPX-specific controllers
│   │   │       ├── routes/      # GPX endpoint routing
│   │   │       ├── services/    # GPX processing services
│   │   │       └── types/       # GPX-related type definitions
│   │   ├── shared/              # Shared backend utilities
│   │   │   ├── config/         # Server configurations
│   │   │   ├── middlewares/    # Express middlewares
│   │   │   └── types/         # Shared type definitions
├── src/                          # Frontend source code
│   ├── App.tsx                   # Main React application component
│   ├── env.d.ts                 # Environment type definitions
│   ├── index.css               # Global styles
│   ├── main.tsx                 # Frontend entry point
│   ├── theme.ts                 # Application theming
│   ├── components/              # Shared UI components
│   │   └── ui/                 # Base UI components
│   │       └── skeleton.tsx    # Skeleton loading component
│   ├── features/               # Feature modules
│   │   ├── gpx/               # GPX processing feature
│   │   │   ├── components/    # GPX-specific components
│   │   │   │   ├── ElevationProfile/ # Elevation visualization
│   │   │   │   │   ├── ElevationProfile.tsx      # Main elevation profile component
│   │   │   │   │   ├── ElevationProfilePanel.tsx # Profile panel component
│   │   │   │   │   └── ElevationProfile.styles.ts # Styling
│   │   │   │   └── Uploader/ # Handles GPX file upload and management
│   │   │   │       ├── Uploader.tsx      # Main uploader logic
│   │   │   │       ├── UploaderUI.tsx    # UI for file upload, rename, and deletion
│   │   │   │       ├── Uploader.types.ts # Type definitions
│   │   │   │       └── index.ts          # Component exports
│   │   │   ├── hooks/        # GPX-related React hooks
│   │   │   │   ├── useClientGpxProcessing.ts # Client-side GPX processing
│   │   │   │   └── useGpxProcessing.ts      # GPX processing hook
│   │   │   ├── services/     # GPX processing services
│   │   │   │   ├── gpxService.ts        # GPX data service
│   │   │   │   ├── mapMatchingService.ts # Map matching functionality
│   │   │   │   └── surfaceService.ts    # Surface detection service
│   │   │   ├── types/       # Type definitions
│   │   │   └── utils/       # GPX utility functions
│   │   │       ├── climbUtils.ts # Climb calculation utilities
│   │   │       ├── gpxParser.ts  # GPX file parsing
│   │   │       └── roadUtils.ts  # Road-related utilities
│   │   ├── map/             # Map visualization feature
│   │   │   ├── components/  # Map-related components
│   │   │   │   ├── MapControls/ # Map control components
│   │   │   │   ├── MapView/    # Main map display
│   │   │   │   │   ├── MapView.tsx # Map component
│   │   │   │   │   └── MapView.css # Map styles
│   │   │   │   └── Sidebar/    # Main sidebar and drawer system
│   │   │   │       ├── Sidebar.tsx       # Main sidebar component
│   │   │   │       ├── Sidebar.styles.ts # Styled drawer components
│   │   │   │       ├── RouteList.tsx     # Route listing component
│   │   │   │       ├── SidebarListItems.tsx # Icon button list
│   │   │   │       ├── useSidebar.ts    # Sidebar hook
│   │   │   │       └── types.ts         # Sidebar type definitions
│   │   │   ├── context/    # Map state management
│   │   │   │   ├── MapContext.tsx  # Map context provider
│   │   │   │   └── RouteContext.tsx # Route management context
│   │   │   ├── hooks/      # Map-related hooks
│   │   │   │   ├── useMap.ts      # Map interaction hook
│   │   │   │   └── useGpxProcessing.ts # GPX processing hook
│   │   │   ├── services/   # Map services
│   │   │   └── types/     # Map type definitions
│   │   ├── photo/         # Photo management feature
│   │   │   ├── components/ # Photo-specific components
│   │   │   │   ├── PhotoCluster/ # Photo clustering functionality
│   │   │   │   │   ├── PhotoCluster.tsx # Cluster component
│   │   │   │   │   └── PhotoCluster.css # Cluster styles
│   │   │   │   ├── PhotoLayer/ # Photo layer management
│   │   │   │   │   ├── PhotoLayer.tsx # Layer component
│   │   │   │   │   └── PhotoLayer.css # Layer styles
│   │   │   │   ├── PhotoMarker/ # Individual photo markers
│   │   │   │   │   ├── PhotoMarker.tsx # Marker component
│   │   │   │   │   └── PhotoMarker.css # Marker styles
│   │   │   │   ├── PhotoPreview/ # Photo preview modal
│   │   │   │   │   └── PhotoPreviewModal.tsx # Preview component
│   │   │   │   └── Uploader/ # Photo upload handling
│   │   │   │       ├── PhotoUploader.tsx # Main photo uploader
│   │   │   │       ├── PhotoUploaderUI.tsx # Upload interface
│   │   │   │       └── PhotoUploader.types.ts # Type definitions
│   │   │   ├── context/   # Photo state management
│   │   │   │   └── PhotoContext.tsx # Photo context provider
│   │   │   └── styles/    # Photo-specific styles
│   │   │       └── photo-markers.css # Marker styling
│   │   └── poi/           # Points of Interest feature
│   │       ├── components/ # POI-specific components
│   │       │   ├── MapboxPOIMarker/ # Mapbox-specific POI marker
│   │       │   │   ├── MapboxPOIMarker.tsx # Marker component
│   │       │   │   ├── MapboxPOIMarker.styles.css # Marker styles
│   │       │   │   └── index.ts     # Component exports
│   │       │   ├── PlacePOIIconSelection/ # Place POI icon selection
│   │       │   │   ├── PlacePOIIconSelection.tsx # Icon selection component
│   │       │   │   └── index.ts     # Component exports
│   │       │   ├── PlacePOILayer/ # Place POI layer component
│   │       │   │   ├── PlacePOILayer.tsx # Layer component
│   │       │   │   └── PlacePOILayer.css # Layer styles
│   │       │   ├── POIDetailsDrawer/ # POI details viewing drawer
│   │       │   │   └── POIDetailsDrawer.tsx # Details display component
│   │       │   ├── POIDragPreview/  # Drag and drop preview
│   │       │   │   └── POIDragPreview.tsx # Drag preview component
│   │       │   ├── POIDrawer/   # POI management drawer
│   │       │   │   ├── POIDrawer.tsx # Main drawer component
│   │       │   │   ├── POIDetailsForm.tsx # POI details form
│   │       │   │   ├── POIIconSelection.tsx # Icon selection UI
│   │       │   │   ├── POILocationInstructions.tsx # Location help
│   │       │   │   ├── POIModeSelection.tsx # Mode selection UI
│   │       │   │   ├── PlacePOIInstructions.tsx # Place POI instructions
│   │       │   │   ├── POIDrawer.styles.ts # Drawer styling
│   │       │   │   ├── types.ts    # POI drawer types
│   │       │   │   └── index.ts    # Component exports
│   │       │   ├── POIMarker/   # Generic POI marker component
│   │       │   │   ├── POIMarker.tsx # Marker implementation
│   │       │   │   ├── POIMarker.styles.ts # Marker styling
│   │       │   │   ├── types.ts    # Marker type definitions
│   │       │   │   └── index.ts    # Component exports
│   │       │   └── POIViewer/   # POI viewing component
│   │       │       └── POIViewer.tsx # Viewer implementation
│   │       ├── constants/  # POI-related constants
│   │       │   ├── icon-paths.ts # Icon asset paths
│   │       │   └── poi-icons.ts  # POI icon definitions
│   │       ├── context/    # POI state management
│   │       │   └── POIContext.tsx # POI context provider
│   │       ├── types/     # POI type definitions
│   │       └── utils/     # POI utility functions
│   │           ├── photo.ts # Photo-related utilities
│   │           └── placeDetection.ts # Place detection utilities
│   ├── lib/               # Core utilities and helpers
│   │   ├── errors.ts     # Error handling utilities
│   │   └── utils.ts      # General utilities
│   ├── types/            # Global type definitions
│   │   ├── api.types.ts  # API-related types
│   │   └── index.ts      # Type exports
│   └── utils/            # Shared utility functions
│       └── gpx/          # GPX-specific utilities
│           └── parsing.ts # GPX parsing utilities
└── uploads/              # Temporary GPX file storage
```

## Key Features

### GPX Processing
The GPX processing feature (`src/features/gpx/`) handles the upload, parsing, and analysis of GPX files. It includes:
- File Management UI (`Uploader` component):
  - Drag-and-drop GPX file upload
  - File renaming capability
  - File deletion
  - Visual feedback during processing
- Elevation visualization (`ElevationProfile`):
  - Interactive elevation profile display
  - Category climb coloring:
    - CAT 4: #05c46b (Green)
    - CAT 3: #ffc048 (Light Orange)
    - CAT 2: #ffa801 (Orange)
    - CAT 1: #ff3f34 (Red)
    - HORS: #b33939 (Dark Red)
- GPX data processing services
- Surface detection and analysis

### Map Visualization
The map feature (`src/features/map/`) manages the interactive map display, including controls, sidebar navigation, and map state management. Key components include:
- Sidebar System:
  - Main sidebar (`StyledDrawer`) - Fixed 56px width drawer containing action icons
  - Nested drawer (`NestedDrawer`) - 300px width drawer that slides out from the main sidebar
  - Route list management and display
  - Integration with GPX and POI features
- Map Context for sharing map state across components
- MapView component for rendering the interactive map
- Map controls for user interaction

### Points of Interest (POI)
The POI feature (`src/features/poi/`) provides functionality for managing and displaying points of interest on the map. Key components include:
- POI Drawer System:
  - Mode selection for different POI operations
  - Icon selection interface
  - Location instructions
  - Details form for POI information
  - Place POI instructions
- Marker Components:
  - Generic POI marker implementation
  - Mapbox-specific marker integration
  - Custom styling and interactions
  - Drag and drop preview functionality
- Place POI Layer for place detection and visualization
- Details Drawer for viewing POI information
- POI Context for state management
- Photo utilities for handling POI images
- Place detection utilities for identifying and managing places
- Comprehensive type system for POI data

### Photo Management
The photo feature (`src/features/photo/`) handles photo upload and management functionality:
- Photo Layer System:
  - PhotoLayer component for managing photo display on map
  - PhotoMarker for individual photo locations
  - PhotoCluster for grouping nearby photos
  - PhotoPreview modal for enlarged photo viewing
- Photo Uploader:
  - File upload interface
  - Upload progress tracking
  - Type validation
- Photo Context for managing photo state
- Integration with POI feature for attaching photos to points of interest
- Custom styling for markers and clusters
- Fallback image support for loading states

## Architecture

The project follows a feature-based architecture where each major feature has its own directory containing all related components, services, and utilities. This modular approach promotes code organization and maintainability.

The backend (`server/`) and frontend (`src/`) are separated, with the backend handling data processing and storage while the frontend manages the user interface and interactions.

## Configuration Files

- TypeScript configurations are split into multiple files for different parts of the project:
  - `tsconfig.app.json`: Application-specific TypeScript settings
  - `tsconfig.base.json`: Base TypeScript configuration
  - `tsconfig.client.json`: Frontend client settings
  - `tsconfig.server.json`: Backend server settings
  - `tsconfig.node.json`: Node.js specific settings

## Logging

The application uses a comprehensive logging system with different log files for various types of events:
- `error.log`: General application errors
- `exceptions.log`: Caught exceptions
- `rejections.log`: Unhandled promise rejections
- `server.log`: Server operations and requests
