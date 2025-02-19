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
│   ├── DATA_OPTIMIZATION.md       # Data optimization strategies and implementation
│   ├── DIR.md                     # This directory structure document
│   ├── DRAWER_SYSTEM.md          # Drawer system implementation details
│   ├── INIT_MODE_COMPARISON.md    # Initialization mode comparison documentation
│   ├── PERSISTENT_ID.md          # Persistent ID system documentation
│   ├── PHOTO_CLUSTERING_DEBUG.md  # Photo clustering debugging information
│   ├── PHOTO_CLUSTERING_FACTS.md  # Photo clustering implementation details
│   ├── PHOTO_MODE_COMPARISON.md   # Photo mode comparison documentation
│   ├── PHOTO_STORAGE.md          # Photo storage and management documentation
│   ├── POI_INVESTIGATION.md      # POI system investigation documentation
│   ├── POIDIR.md                 # POI feature documentation
│   ├── POIPLACES.md              # POI places integration documentation
│   ├── PRESENTATION_PERFORMANCE.md # Presentation mode performance documentation
│   ├── PRESENTATION.md           # Route presentation feature documentation
│   ├── ROUTE_DESCRIPTION_EDITOR.md # Route description editor implementation
│   ├── ROUTE_DESCRIPTION_TAB.md  # Route description tab documentation
│   ├── ROUTE_FOCUS_MODE_IMPLEMENTATION.md # Route focus mode implementation details
│   ├── ROUTE_NAME_EDITING.md     # Route name editing feature documentation
│   └── SAVE_LOAD_SYSTEM.md       # Save/load system documentation
├── logs/                          # Application logging directory
│   ├── error.log                  # General application error logs
│   ├── exceptions.log             # Detailed exception tracking
│   ├── rejections.log            # Promise rejection tracking
│   └── server.log                # Server activity and request logging
├── public/                        # Static public assets
│   ├── favicon.ico               # Website favicon
│   └── images/                   # Static image assets
│       ├── contour.jpeg          # Contour visualization image
│       ├── hero-background.jpeg  # Landing page hero background
│       ├── hero.png             # Hero section image
│       └── photo-fallback.svg    # Default image for failed photo loads
├── server/                        # Backend server code
│   ├── src/
│   │   ├── server.ts             # Main Express server setup and configuration
│   │   ├── controllers/          # [REDUNDANT] Main controllers (should be moved to features)
│   │   ├── features/            # Feature-specific backend implementations
│   │   │   ├── gpx/             # GPX processing feature backend
│   │   │   ├── photo/           # Photo management feature backend
│   │   │   ├── poi/             # POI management feature backend
│   │   │   └── route/           # Route management feature backend
│   │   ├── routes/              # [REDUNDANT] Main routes (should be moved to features)
│   │   ├── scripts/             # Utility scripts
│   │   │   ├── add-persistent-ids.ts # Persistent ID generation utility
│   │   │   ├── clear-model-cache.ts # Cache clearing utility
│   │   │   ├── clear-routes.ts     # Route cleanup utility
│   │   │   ├── optimize-routes.ts  # Route optimization script
│   │   │   └── update-route-schema.ts # Schema update utility
│   │   ├── services/            # [REDUNDANT] Main services (should be moved to features)
│   │   └── shared/              # Shared backend utilities
│   │       ├── config/         # Server configuration (logging, env vars)
│   │       ├── middlewares/    # Express middlewares (auth, cache, error handling, rate limiting)
│   │       └── types/         # Shared type definitions
├── src/                          # Frontend source code
│   ├── App.js                    # Main React application component and routing
│   ├── env.d.ts                 # Environment variable type definitions
│   ├── index.css               # Global CSS styles
│   ├── main.js                  # Frontend entry point and provider setup
│   ├── theme.js                 # Global theme configuration
│   ├── components/              # Shared UI components
│   │   ├── ui/                 # Base UI components
│   │   │   ├── alert.js       # Alert component
│   │   │   ├── drawer.js      # Drawer component
│   │   │   └── skeleton.js    # Loading skeleton component
│   │   └── ErrorBoundary.js    # Error boundary for component error handling
│   ├── features/               # Feature modules
│   │   ├── auth/               # Authentication feature
│   │   ├── gpx/               # GPX processing feature with surface detection
│   │   ├── map/               # Map visualization feature
│   │   ├── photo/             # Photo management feature
│   │   ├── place/             # Place management feature
│   │   ├── poi/               # Points of Interest feature
│   │   └── presentation/      # Route presentation feature
│   ├── lib/                   # Core utilities
│   │   ├── errors.js         # Error handling
│   │   └── utils.js          # Common utilities
│   ├── types/                # Global types
│   │   ├── api.types.js      # API interfaces
│   │   └── index.js          # Type exports
│   └── utils/                # Shared utilities
│       └── gpx/              # GPX parsing
└── uploads/                  # Temporary file storage
    └── gpxFile-*            # Uploaded GPX files
```

## Feature Integration

The application's features are tightly integrated while maintaining clear boundaries:

### GPX Processing ↔ Map Integration
- GPX processing provides route data to the map
- Map context maintains the visual state of routes
- Elevation profile syncs with map interactions
- Surface detection analyzes and displays route terrain
- Multiple routes can be loaded and managed simultaneously
- Route descriptions with rich text editing support
- Persistent IDs for stable route identification

### POI ↔ Map Integration
- POI markers render on the map layer
- Map interactions trigger POI operations
- Place detection uses map viewport
- Drag and drop uses map coordinates
- POIs are saved and loaded with route data
- Supports both draggable and place-based POIs
- Categorized POIs with specific icons and styling

### Photo ↔ POI Integration
- Photos can be attached to POIs
- Photo clusters consider POI locations
- Shared photo processing utilities
- Consistent styling between features
- Photo storage and management system
- Photo preview and gallery functionality

### Place ↔ POI Integration
- Places can contain multiple POIs
- Place detection informs POI creation
- Shared icon selection system
- Consistent metadata structure
- Improved state merging for place-based POIs

### Presentation Feature Integration
- Public route sharing and viewing
- Interactive map browsing
- Elevation profile visualization
- Photo and POI layer integration
- Responsive sidebar navigation
- Landing page with route previews
- Optimized route processing
- Consistent styling across components

## Configuration

### JavaScript Migration
The project has been migrated from TypeScript to JavaScript while maintaining type safety through JSDoc comments and type definitions. Key benefits include:
- Simplified build process
- Improved development experience
- Maintained type safety through JSDoc annotations
- Better compatibility with external libraries

### Environment Configuration
- `.env.local`: Local environment variables
- `server/.env`: Server-specific environment variables
- `server/.env.local.template`: Template for server environment setup

### Logging System
Comprehensive logging across different concerns:
- `error.log`: General application errors
- `exceptions.log`: Detailed exception tracking
- `rejections.log`: Promise rejection monitoring
- `server.log`: API request and response logging
