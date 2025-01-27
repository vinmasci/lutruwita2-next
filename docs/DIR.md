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
│   ├── DIR.md                     # This directory structure document
│   ├── GPX_Processing_Issues.md   # Known GPX processing issues and solutions
│   ├── MIGRATION_LOG.md           # Migration progress and changes log
│   ├── MIGRATIONPLAN.md           # Plan for system migration
│   ├── OLDFUNCTIONS.md            # Archive of previous implementations
│   ├── surface-detection.md       # Surface detection documentation
│   └── surfacedetectionplan.md    # Planning for surface detection feature
├── logs/                          # Application logs
│   ├── error.log                  # General error logs
│   ├── exceptions.log             # Exception tracking
│   ├── rejections.log            # Promise rejection logs
│   └── server.log                # Server activity logs
├── public/                        # Static public assets
│   └── favicon.ico               # Site favicon
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
│   ├── main.tsx                 # Frontend entry point
│   ├── theme.ts                 # Application theming
│   ├── components/              # Shared UI components
│   │   └── ui/                 # Base UI components
│   ├── features/               # Feature modules
│   │   ├── gpx/               # GPX processing feature
│   │   │   ├── components/    # GPX-specific components
│   │   │   │   ├── Uploader/ # Handles GPX file upload and management
│   │   │   │   │   ├── Uploader.tsx      # Main uploader logic
│   │   │   │   │   ├── UploaderUI.tsx    # UI for file upload, rename, and deletion
│   │   │   │   │   ├── Uploader.types.ts # Type definitions
│   │   │   │   │   └── index.ts          # Component exports
│   │   │   ├── hooks/        # GPX-related React hooks
│   │   │   ├── services/     # GPX processing services
│   │   │   ├── types/       # Type definitions
│   │   │   └── utils/       # GPX utility functions
│   │   ├── map/             # Map visualization feature
│   │   │   ├── components/  # Map-related components
│   │   │   │   └── Sidebar/ # Main sidebar and drawer system
│   │   │   │       ├── Sidebar.tsx       # Main sidebar component
│   │   │   │       ├── Sidebar.styles.ts # Styled drawer components
│   │   │   │       ├── SidebarListItems.tsx # Icon button list
│   │   │   │       └── types.ts         # Sidebar type definitions
│   │   │   ├── context/    # Map state management
│   │   │   ├── hooks/      # Map-related hooks
│   │   │   ├── services/   # Map services
│   │   │   └── types/     # Map type definitions
│   │   └── poi/           # Points of Interest feature
│   ├── lib/               # Core utilities and helpers
│   ├── types/            # Global type definitions
│   └── utils/            # Shared utility functions
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
- Elevation visualization (`ElevationProfile`)
- GPX data processing services

### Map Visualization
The map feature (`src/features/map/`) manages the interactive map display, including controls, sidebar navigation, and map state management. Key components include:
- Sidebar System:
  - Main sidebar (`StyledDrawer`) - Fixed 56px width drawer containing action icons
  - Nested drawer (`NestedDrawer`) - 300px width drawer that slides out from the main sidebar
  - The GPX file management UI appears in the nested drawer when the GPX upload action is triggered
- Map Context for sharing map state across components

### Points of Interest (POI)
The POI feature (`src/features/poi/`) handles the display and management of points of interest on the map, including custom markers and POI-specific interactions.

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
