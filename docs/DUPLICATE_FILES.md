# Duplicate Files Analysis

This document lists JavaScript (.js, .jsx, .tsx) files that have duplicate implementations in the codebase.

## Service Files

- `src/features/photo/services/`
  - photoService.js
  - photoService.ts
  - Both files are functionally identical, with the TypeScript version adding type annotations.
  - The JavaScript version is imported by multiple components including PhotoUploader.js and RouteDescriptionPanel.js.

- `src/features/gpx/services/`
  - gpxService.js
  - gpxService.ts
  - These files have significant differences:
    - The JavaScript version uses Server-Sent Events (EventSource) for real-time progress updates during GPX processing.
    - The TypeScript version uses polling with setTimeout to check job status periodically.
    - This change was part of the Vercel migration to make the application compatible with serverless architecture.
    - See docs/SSE_TO_POLLING_MIGRATION.md for details on this change.

- `src/features/poi/services/`
  - poiService.js
  - poiService.ts
  - These files have minor differences:
    - The JavaScript version uses '/api/poi' as the API_BASE path.
    - The TypeScript version uses '/api/pois' as the API_BASE path.

- `src/features/map/services/`
  - routeService.js
  - routeService.ts
  - The TypeScript version has the same functionality with added type safety.

## Presentation Components

- `src/features/presentation/components/PresentationSidebar/`
  - index.js
  - index.ts
  - PresentationSidebar.js
  - PresentationSidebar.tsx

- `src/features/presentation/components/ElevationProfile/`
  - index.js
  - index.ts
  - PresentationElevationProfile.js
  - PresentationElevationProfile.tsx
  - PresentationElevationProfilePanel.js
  - PresentationElevationProfilePanel.tsx

## Uploader Components

- `src/features/gpx/components/Uploader/`
  - DraggableRouteItem.jsx
  - UploaderUI.jsx

## Route Description Components

- `src/features/gpx/components/RouteDescription/`
  - RouteDescriptionPanel.js
  - RouteDescriptionPanel.tsx
  - RichTextEditor.js
  - RichTextEditor.d.ts

## Utils

- `src/features/gpx/utils/`
  - routeUtils.js
  - routeUtils.ts

- `src/types/`
  - index.js
  - index.ts
  - api.types.js
  - api.types.ts

## Component Pairs

- `src/components/ErrorBoundary`
  - ErrorBoundary.js
  - ErrorBoundary.tsx

- `src/components/ui/`
  - alert.js
  - alert.tsx
  - skeleton.js
  - skeleton.tsx

## Root Files

- `src/`
  - App.js
  - App.tsx
  - main.js
  - main.tsx
  - theme.js
  - theme.ts

## Recommendations

1. **Standardize File Extensions**: Choose either .ts/.tsx or .js/.jsx consistently for each component type.
2. **Remove Duplicates**: Keep only the TypeScript versions (.ts/.tsx) of files where both JavaScript and TypeScript implementations exist.
3. **Update References**: Ensure all imports reference the correct file extensions after standardization.
4. **Clean Up Index Files**: Consolidate duplicate index.js/index.ts files into a single TypeScript version.
