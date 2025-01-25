# Project Directory Structure

```
project-root/
├── public/                  # Static assets
│   ├── index.html           # Main HTML template
│   └── assets/              # Static files (images, fonts, etc.)
│
├── src/                     # Application source code
│   ├── api/                 # API service layer
│   ├── assets/              # Application assets (images, icons, etc.)
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Common/shared components
│   │   ├── layout/          # Layout components
│   │   └── [feature]/       # Feature-specific components
│   ├── config/              # Application configuration
│   ├── contexts/            # React contexts
│   ├── features/            # Feature modules
│   │   ├── gpx/            # GPX feature module
│   │   │   ├── components/  # GPX-specific components
│   │   │   │   ├── Uploader/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Uploader.tsx
│   │   │   │   │   ├── UploaderUI.tsx
│   │   │   │   │   ├── Uploader.types.ts
│   │   │   │   │   └── Uploader.styles.ts
│   │   │   │   ├── RouteDisplay/
│   │   │   │   └── ElevationProfile/
│   │   │   ├── services/
│   │   │   │   ├── gpxProcessor.ts
│   │   │   │   └── gpxService.ts
│   │   │   ├── hooks/
│   │   │   │   └── useGpxProcessing.ts
│   │   │   ├── routes/
│   │   │   │   └── gpx.ts
│   │   │   └── types/
│   │   │       ├── gpx.types.ts
│   │   │       └── gpx.constants.ts
│   │   └── [feature-name]/  # Other feature-specific code
│   │       ├── components/  # Feature components
│   │       ├── hooks/       # Feature hooks
│   │       ├── services/    # Feature services
│   │       └── types/       # Feature types
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility/library functions
│   ├── pages/               # Page components
│   ├── routes/              # Routing configuration
│   ├── services/            # Business logic/services
│   ├── store/               # State management (Redux, Zustand, etc.)
│   ├── server/              # Server-side functionality
│   │   ├── middlewares/     # Authentication and other middleware
│   │   │   ├── auth.ts      # JWT authentication middleware
│   │   │   └── error-handling.ts # Error handling middleware
│   │   ├── routes/          # API route handlers
│   │   └── server.ts        # Server configuration
│   ├── styles/              # Global styles/theming
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main application component
│   └── main.tsx            # Application entry point
│
├── tests/                   # Test files
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                # End-to-end tests
│
├── .env                     # Environment variables
├── .eslintrc                # ESLint configuration
├── .prettierrc              # Prettier configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Project dependencies
└── README.md                # Project documentation
```

## Key Principles:
1. Feature-based organization for better scalability
2. Clear separation of concerns
3. Reusable components and utilities
4. Type-safe structure with TypeScript
5. Test coverage at all levels
6. Consistent naming conventions

## Feature Module Structure:
Each feature module (e.g., gpx/) follows a consistent structure:
- components/ - UI components specific to the feature
- services/ - Business logic and API integration
- hooks/ - Custom React hooks
- types/ - TypeScript type definitions
- routes/ - API route handlers (if needed)

This organization promotes:
- Modularity and reusability
- Clear boundaries between features
- Easy maintenance and testing
- Type safety throughout the codebase
