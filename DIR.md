# lutruwita2-next Project Structure

```
lutruwita2-next/
├── public/                  # Static assets
│   └── favicon.ico          # Site favicon
│
├── src/                     # Application source code
│   ├── components/          # Reusable UI components
│   │   └── ui/              # UI primitives
│   │       └── skeleton.tsx # Loading skeleton component
│   │
│   ├── features/            # Feature modules
│   │   ├── gpx/             # GPX feature module
│   │   │   ├── components/  # GPX-specific components
│   │   │   │   ├── ElevationProfile/
│   │   │   │   │   └── ElevationProfile.tsx
│   │   │   │   └── Uploader/
│   │   │   │       ├── index.ts
│   │   │   │       ├── Uploader.tsx
│   │   │   │       ├── Uploader.types.ts
│   │   │   │       └── UploaderUI.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useGpxProcessing.ts
│   │   │   ├── routes/
│   │   │   │   └── gpx.ts
│   │   │   ├── services/
│   │   │   │   └── gpxService.ts
│   │   │   └── types/
│   │   │       └── gpx.types.ts
│   │   │
│   │   ├── map/             # Map feature module
│   │   │   ├── components/  # Map components
│   │   │   │   ├── MapControls/
│   │   │   │   │   └── MapControls.tsx
│   │   │   │   ├── MapView/
│   │   │   │   │   └── MapView.tsx
│   │   │   │   └── Sidebar/
│   │   │   │       ├── icons.ts
│   │   │   │       ├── index.ts
│   │   │   │       ├── Sidebar.styles.ts
│   │   │   │       ├── Sidebar.tsx
│   │   │   │       ├── SidebarListItems.tsx
│   │   │   │       ├── types.ts
│   │   │   │       └── useSidebar.ts
│   │   │   ├── context/
│   │   │   │   └── MapContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useGpxProcessing.ts
│   │   │   │   └── useMap.ts
│   │   │   ├── services/
│   │   │   │   └── mapService.ts
│   │   │   └── types/
│   │   │       └── map.types.ts
│   │   │
│   │   └── poi/             # Points of Interest module
│   │       └── components/  # POI components
│   │           └── POIMarker/
│   │               └── index.ts
│   │
│   ├── lib/                 # Utility/library functions
│   │   ├── errors.ts        # Error handling utilities
│   │   └── utils.ts         # General utilities
│   │
│   ├── server/              # Server-side functionality
│   │   ├── middlewares/     # Server middleware
│   │   │   ├── auth.ts      # Authentication middleware
│   │   │   └── error-handling.ts # Error handling
│   │   └── server.ts        # Server configuration
│   │
│   ├── types/               # TypeScript types
│   │   ├── api.types.ts     # API-related types
│   │   └── index.ts         # Main types export
│   │
│   ├── utils/               # Utility functions
│   │   └── gpx/             # GPX utilities
│   │       └── parsing.ts   # GPX parsing utilities
│   │
│   ├── App.tsx              # Main application component
│   ├── env.d.ts             # Environment type definitions
│   ├── index.css            # Global styles
│   ├── main.tsx             # Application entry point
│   └── theme.ts             # Theme configuration
│
├── .env.local               # Local environment variables
├── ARCHITECTURE.md          # Architecture documentation
├── DIR.md                   # Directory structure documentation
├── index.html               # Main HTML template
├── MIGRATION_LOG.md         # Migration documentation
├── package.json             # Project dependencies
├── package-lock.json        # Dependency lock file
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── tsconfig.app.json        # App-specific TS config
├── tsconfig.base.json       # Base TS config
├── tsconfig.client.json     # Client-specific TS config
├── tsconfig.node.json       # Node-specific TS config
├── tsconfig.server.json     # Server-specific TS config
└── tsconfig.tsbuildinfo     # TS build info
```

## Key Features:
- Feature-based architecture with clear separation of concerns
- TypeScript-first development
- Modular component structure
- Comprehensive type definitions
- Server-side functionality integrated
- GPX and Map feature modules
- Points of Interest (POI) support
- Tailwind CSS configuration
