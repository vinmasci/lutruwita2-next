# Project Directory Structure

This document outlines the file structure of the Lutruwita2 Next project, categorized by function (Presentation, Creation, Embed) where possible, along with descriptions and potential areas for review.

## Root Directory

Configuration files, scripts, and entry points for the application.

*   `.dockerignore`: Specifies intentionally untracked files that Docker should ignore.
*   `.env.vercel.template`: Template for Vercel environment variables.
*   `.gitignore`: Specifies intentionally untracked files that Git should ignore.
*   `add-captions-to-photos-fixed.js`: Script likely for adding captions to photos (potentially a fixed version). **[REDUNDANT?]** (Compare with `add-captions-to-photos.js`)
*   `add-captions-to-photos.js`: Script likely for adding captions to photos. **[REDUNDANT?]** (Compare with `add-captions-to-photos-fixed.js`)
*   `ARCHITECTURE.md`: Documentation file describing the project architecture. **[DUPLICATE?]** (Also exists in `docs/`)
*   `cleanup-orphaned-embeds.js`: Script to clean up orphaned embed data.
*   `create-test-user.js`: Script to create a test user.
*   `create-user-collection.js`: Script to create a user collection (likely in the database).
*   `create-user.js`: Script to create a user.
*   `debug-auth0-user.js`: Script for debugging Auth0 user issues.
*   `debug-user-api.js`: Script for debugging the user API.
*   `deploy.tar.gz`: Compressed deployment archive. **[LARGE?]** (Likely large, potentially temporary/artifact)
*   `DIR.md`: This file.
*   `docker-compose.yml`: Defines and runs multi-container Docker applications.
*   `Dockerfile`: Contains instructions to build a Docker image for the application.
*   `downloaded-test-image-direct.jpg`: Downloaded test image file. **[UNUSED?]**
*   `downloaded-test-image.jpg`: Downloaded test image file. **[UNUSED?]**
*   `find-auth0-user-id.html`: HTML utility page for finding an Auth0 user ID.
*   `get-auth0-user-id.html`: HTML utility page for getting an Auth0 user ID.
*   `index.html`: Main HTML entry point for the frontend application.
*   `known-bugs.md`: Documentation listing known bugs.
*   `lutruwita2.nginx.conf`: Nginx configuration file specific to the project. **[REDUNDANT?]** (Compare with `nginx.conf`)
*   `nginx.conf`: General Nginx configuration file. **[REDUNDANT?]** (Compare with `lutruwita2.nginx.conf`)
*   `optimize-images.js`: Script for optimizing images.
*   `package-lock.json`: Records exact versions of dependencies used.
*   `package.json`: Defines project metadata, dependencies, and scripts.
*   `README.md`: Project overview, setup instructions, and general information.
*   `tailwind.config.js`: Configuration file for Tailwind CSS.
*   `tasmania-map.html`: Standalone HTML file, possibly for testing or a specific map view. **[UNUSED?]**
*   `test-api.js`: Script for testing the API.
*   `test-s3-image.jpg`: Test image file, possibly for S3 integration testing. **[UNUSED?]**
*   `tsconfig.app.json`: TypeScript configuration specific to the application build.
*   `tsconfig.base.json`: Base TypeScript configuration, likely extended by others.
*   `tsconfig.client.json`: TypeScript configuration specific to the client-side code.
*   `tsconfig.json`: Main TypeScript configuration file for the project.
*   `tsconfig.node.json`: TypeScript configuration specific to Node.js environments (e.g., API, scripts).
*   `tsconfig.server.json`: TypeScript configuration specific to the server-side code. **[REDUNDANT?]** (Potentially overlaps with `tsconfig.node.json`)
*   `vercel.json`: Configuration file for Vercel deployments.
*   `vite.config.ts`: Configuration file for the Vite build tool.
*   `WebAppImprovementRecommendations.md`: Documentation file with recommendations for improving the web app.

## `api/`

Backend API endpoints, likely running as serverless functions (Vercel).

*   `api/package-lock.json`: Dependency lock file for the API.
*   `api/package.json`: Dependencies and scripts for the API.
*   `api/gpx/index.js`: API endpoint for GPX file operations.
*   `api/health/index.js`: API endpoint for health checks.
*   `api/lib/`: Shared library code for the API.
    *   `auth0.js`: Auth0 authentication helper functions.
    *   `cloudinary.js`: Cloudinary integration helper functions.
    *   `compression.js`: Middleware or utilities for response compression.
    *   `db.js`: Database connection and interaction logic.
    *   `gpx-parser.js`: GPX parsing utility for the backend.
    *   `job-queue.js`: Job queue implementation (e.g., for background processing).
    *   `middleware.js`: Custom API middleware functions.
    *   `redis.js`: Redis client and interaction logic.
    *   `storage.js`: Abstracted file storage logic (e.g., S3, local).
    *   `surface-cache.js`: Caching logic for surface data.
*   `api/models/`: Database models/schemas.
    *   `DraftRoute.js`: Database model for draft routes.
*   `api/photos/`: API endpoints related to photos.
    *   `delete.js`: Endpoint for deleting photos.
    *   `index.js`: Main endpoint for photo operations (list, upload).
*   `api/poi/`: API endpoints related to Points of Interest (POI).
    *   `index.js`: Main endpoint for POI operations.
    *   `photo.js`: Endpoint for associating photos with POIs.
*   `api/routes/`: API endpoints related to routes/tracks.
    *   `index.js`: Main endpoint for route operations (CRUD).
    *   `user.js`: Endpoint for user-specific route operations.
    *   `embed/`: Endpoints specific to embedded map routes.
    *   `public/`: Endpoints for publicly accessible routes.
*   `api/user/`: API endpoints related to user data.
    *   `index.js`: Main endpoint for user operations (profile, settings).

## `docs/`

Project documentation, architecture notes, and implementation details.

*   `ARCHITECTURE.md`: Project architecture overview. **[DUPLICATE?]** (Also exists in root)
*   `AUTH_TOKEN_REFRESH_IMPLEMENTATION.md`: Details on auth token refresh logic.
*   `AUTH0_VERCEL_SETUP_INSTRUCTIONS.md`: Setup instructions for Auth0 and Vercel.
*   `CAMERA_SCROLLING_IN_PRESENTATION_MODE.md`: Notes on camera scrolling behavior.
*   `CHUNKED_ROUTE_UPLOADS.md`: Implementation details for chunked route uploads.
*   `CHUNKED_UPLOAD_MONGODB_FALLBACK.md`: Notes on MongoDB fallback for chunked uploads.
*   `CLOUDINARY_OPTIMIZATION_SUMMARY.md`: Summary of Cloudinary optimizations.
*   `CLOUDINARYJSON.md`: Notes or examples related to Cloudinary JSON data.
*   `controur.jpeg`: Image file, likely for documentation purposes.
*   `DATA_OPTIMIZATION.md`: Notes on data optimization strategies.
*   `DRAGGABLE_POIS.md`: Implementation details for draggable POIs.
*   `DUPLICATE_FILES.md`: Document listing or discussing duplicate files.
*   `ELEVATION_PANEL_IMPROVEMENTS.md`: Ideas or plans for improving the elevation panel.
*   `ELEVATION_PROFILE_NIVO.md`: Notes on using Nivo charts for elevation profiles.
*   `ELEVATION_PROFILE_STYLING_PLAN.md`: Styling plan for the elevation profile.
*   `ELEVATION_PROFILE_TRACER_PRESENTATION_MODE.md`: Details on the elevation tracer in presentation mode.
*   `ELEVATION_PROFILE_TRACER.md`: General details on the elevation profile tracer.
*   `EMBED_MAP_VIEW_REFACTORING.md`: Notes on refactoring the embed map view.
*   `EVENT_DATE_COUNTDOWN_IMPLEMENTATION.md`: Details on the event date countdown feature.
*   `GEOGRAPHIC_CLUSTERING_IMPLEMENTATION.md`: Details on geographic clustering logic.
*   `GOOGLE_PLACES_AUTO_SEARCH_IMPLEMENTATION.md`: Details on Google Places auto-search.
*   `GOOGLE_PLACES_INTEGRATION.md`: Notes on integrating Google Places API.
*   `GPS_TRACKING_IMPLEMENTATION.md`: Details on GPS tracking functionality.
*   `INIT_MODE_COMPARISON.md`: Comparison of different initialization modes.
*   `LINE_MARKER_IMPLEMENTATION.md`: Details on line marker implementation.
*   `MAP_EMBEDDING_IMPLEMENTATION.md`: Details on map embedding functionality.
*   `MAP_OPERATIONS_QUEUE.md`: Notes on a queue system for map operations.
*   `MAP_OVERVIEW_SIDEBAR_IMPLEMENTATION.md`: Details on the map overview sidebar.
*   `MAP_OVERVIEW_TAB_IMPLEMENTATION.md`: Details on the map overview tab.
*   `MAP_REGISTRY_IMPLEMENTATION.md`: Details on the map registry system.
*   `MAP_TRACER_LAYER_IMPLEMENTATION.md`: Details on the map tracer layer.
*   `MAP_TRACER_THRESHOLD_UPDATE.md`: Notes on updating the map tracer threshold.
*   `MAPVIEW_REFACTORING_PLAN.md`: Plan for refactoring the main map view.
*   `MOBILE_PERFORMANCE_OPTIMIZATIONS.md`: Notes on optimizing performance for mobile devices.
*   `NAVBAR_HEADER_IMPLEMENTATION.md`: Details on the navigation bar/header.
*   `OPTIMIZED_PARTIAL_UPDATES.md`: Details on implementing optimized partial data updates.
*   `PERSISTENT_ID.md`: Notes on using persistent identifiers.
*   `PHOTO_CAPTION_IMPLEMENTATION.md`: Details on implementing photo captions.
*   `PHOTO_CLUSTERING_FACTS.md`: Facts or notes about photo clustering.
*   `PHOTO_LIGHTBOX_IMPLEMENTATION.md`: Details on the photo lightbox feature.
*   `PHOTO_MODE_COMPARISON.md`: Comparison of different photo modes.
*   `PHOTO_ROUTE_ORDERING_IMPLEMENTATION.md`: Details on ordering photos along a route.
*   `PHOTO_STORAGE.md`: Notes on photo storage strategy.
*   `PHOTO_UPLOAD_OPTIMIZATION.md`: Notes on optimizing photo uploads.
*   `PHOTO_VIEWER_CREATION_MODE_IMPLEMENTATION.md`: Details on the photo viewer in creation mode.
*   `PHOTO_VIEWER_ENHANCEMENTS.md`: Ideas or plans for enhancing the photo viewer.
*   `POI_VS_LINE_LOADING.md`: Comparison or notes on loading POIs vs. lines.
*   `PRESENTATION_MODE_CLUSTERING_OPTIMIZATION.md`: Notes on optimizing clustering in presentation mode.
*   `PRESENTATION_MODE_PERFORMANCE_ANALYSIS.md`: Analysis of performance in presentation mode.
*   `PRESENTATION_PERFORMANCE.md`: General notes on presentation mode performance.
*   `RESPONSIVE_UPDATES.md`: Notes on responsive design updates.
*   `ROUTE_DATA_COMPRESSION_IMPLEMENTATION.md`: Details on route data compression.
*   `ROUTE_DESCRIPTION_EDITOR.md`: Notes on the route description editor.
*   `ROUTE_DESCRIPTION_PHOTO_UPDATES.md`: Notes on updating photos within route descriptions.
*   `ROUTE_DESCRIPTION_TAB.md`: Details on the route description tab.
*   `ROUTE_FOCUS_MODE_IMPLEMENTATION.md`: Details on a route focus mode.
*   `ROUTE_NAME_EDITING.md`: Notes on implementing route name editing.
*   `ROUTE_REORDERING.md`: Notes on implementing route reordering.
*   `SAVE_LOAD_SYSTEM.md`: Details on the save/load system architecture.
*   `SCALING_IMPLEMENTATION_ISSUES.md`: Notes on issues related to scaling.
*   `SERVERLESS_TROUBLESHOOTING.md`: Troubleshooting guide for serverless functions.
*   `TYPESCRIPT_ERRORS.md`: Notes on common TypeScript errors encountered.
*   `UNIFIED_ROUTE_LOADING_ARCHITECTURE.md`: Architecture details for unified route loading.
*   `USER_DATA_INITIALIZATION.md`: Notes on initializing user data.
*   `USER_PROFILE_IMPLEMENTATION.md`: Details on user profile implementation.
*   `VERCEL_DEPLOYMENT.md`: Notes on deploying to Vercel.
*   `VERCEL_KV_STORE.md`: Notes on using Vercel's KV store.
*   `WEATHER_TAB.md`: Details on the weather tab feature.
*   `WEBGL_MAP_TRACER_IMPLEMENTATION.md`: Details on the WebGL map tracer.

## `logs/`

Server-side log files.

*   `error.log`: General error logs.
*   `exceptions.log`: Uncaught exception logs.
*   `rejections.log`: Unhandled promise rejection logs.
*   `server.log`: General server activity logs.

## `public/`

Static assets served directly by the web server.

*   `favicon.ico`: Application icon.
*   `health.html`: Simple HTML page for health checks.
*   `test-embed.html`: HTML page for testing map embedding.
*   `images/`: Static image assets.
    *   `contour.jpeg`: Contour map image.
    *   `photo-fallback.svg`: Fallback image for photos.
    *   `test-image.png`: A test image.

## `server/`

Seems to be another backend implementation or build output, possibly Node.js/Express. **[REDUNDANT?]** (Investigate if this is used alongside or instead of the `api/` serverless functions).

*   `server/.env.local.template`: Template for local server environment variables.
*   `server/package-lock.json`: Dependency lock file for the server.
*   `server/package.json`: Dependencies and scripts for the server.
*   `server/tsconfig.json`: TypeScript configuration for the server.
*   `server/build/`: Compiled JavaScript output for the server. **[LARGE?]**
    *   `server.js`: Main server entry point.
    *   `controllers/`: Compiled controller logic.
    *   `features/`: Compiled feature-specific server logic.
    *   `routes/`: Compiled route handlers.
    *   `scripts/`: Compiled utility scripts.
    *   `services/`: Compiled service logic.
    *   `shared/`: Compiled shared utilities.
*   `server/logs/`: Log directory specific to this server instance. **[REDUNDANT?]** (Logs also exist at the root level)
*   `server/src/`: Source code for the server.
    *   `controllers/`: Request handling logic.
    *   `features/`: Feature-specific modules.
    *   `routes/`: API route definitions.

## `src/`

Frontend application source code.

*   `App.jsx`: Main React application component (JavaScript). **[REDUNDANT?]** (Superseded by `App.tsx`?) **[LARGE?]**
*   `App.tsx`: Main React application component (TypeScript). **[LARGE?]**
*   `env.d.ts`: TypeScript type definitions for environment variables.
*   `index.css`: Global CSS styles or entry point for CSS imports.
*   `main.js`: Main entry point for the JavaScript version of the app. **[REDUNDANT?]** (Superseded by `main.tsx`?)
*   `main.tsx`: Main entry point for the TypeScript version of the app (renders the React app).
*   `mockAuth.js`: Mock authentication module for development/testing.
*   `polyfills.ts`: Polyfills for browser compatibility.
*   `theme.js`: Theme configuration (JavaScript). **[REDUNDANT?]** (Superseded by `theme.ts`?)
*   `theme.ts`: Theme configuration (TypeScript).
*   `components/`: General reusable UI components (Seems empty or structure moved to `features/`).
*   `features/`: Core application features, organized by domain.
    *   `auth/`: Authentication related components and logic.
        *   `context/AuthContext.js`: React context for authentication state.
    *   `gpx/`: GPX file processing and related UI. (Likely **Creation** related)
        *   `components/`: UI components specific to GPX features.
            *   `ElevationProfile/`: Components for displaying elevation profiles.
                *   `ElevationProfile.tsx`: Main elevation profile component.
                *   `ElevationProfilePanel.tsx`: Panel containing the elevation profile.
            *   `RouteDescription/`: Components for displaying/editing route descriptions.
                *   `RichTextEditor.js`: A rich text editor component.
        *   `hooks/`: React hooks specific to GPX features.
            *   `useClientGpxProcessing.js`: Hook for client-side GPX processing logic. **[LARGE?]**
        *   `services/`: Logic for GPX data handling.
            *   `surfaceService.js`: Service for fetching surface type data (e.g., paved, unpaved). **[REDUNDANT?]** (TypeScript version exists)
            *   `surfaceService.ts`: Service for fetching surface type data (TypeScript).
        *   `utils/`: Utility functions for GPX data.
            *   `climbUtils.js`: Utilities for calculating climb information.
            *   `gpxParser.js`: Utility for parsing GPX files. **[LARGE?]**
    *   `lineMarkers/`: Features related to drawing and displaying lines/markers on the map. (Shared: **Creation** & **Presentation**)
        *   `components/`: UI components for line markers.
            *   `LineDrawer/LineDrawer.jsx`: Component for drawing lines.
            *   `LineLayer/`: Components for rendering line layers on the map.
                *   `DirectLineLayer.jsx`: A specific implementation of a line layer.
                *   `LineLayer.jsx`: Main component for the line layer.
            *   `LineMarker/LineMarker.jsx`: Component for individual line markers.
        *   `constants/`: Constant values related to line markers.
            *   `line-icons.js`: Definitions or paths for line icons.
        *   `context/LineContext.jsx`: React context for line marker state.
    *   `map/`: Core map components, context, hooks, and utilities. (Likely **Creation** / Shared)
        *   `components/`: UI components related to the main map interface.
            *   `ClimbMarkers/ClimbMarkers.js`: Component to display climb markers.
            *   `DistanceMarkers/DistanceMarkers.js`: Component to display distance markers. **[REDUNDANT?]** (Presentation version exists)
            *   `MapHeader/`: Components for the map header area.
                *   `CountdownTimer.js`: A countdown timer component.
                *   `FloatingCountdownTimer.js`: A floating version of the countdown timer.
                *   `MapHeader.js`: The main map header component.
            *   `MapView/`: The main map view component and related hooks.
                *   `hooks/`: Hooks specific to the MapView.
                    *   `useMapInitializer.js`: Hook for map initialization logic.
                    *   `useMapEvents.js`: Hook for handling map events.
                *   `MapView.js`: The core map component integrating MapboxGL. **[LARGE?]**
            *   `RouteLayer/RouteLayer.js`: Component for rendering the main route layer. **[LARGE?]**
            *   `Sidebar/`: Components for the map sidebar.
                *   `icons.js`: Icon definitions for the sidebar.
                *   `useSidebar.js`: Hook for sidebar state and logic.
                *   `Sidebar.styles.js`: Styled-components or CSS-in-JS for the sidebar.
                *   `Sidebar.js`: The main sidebar component.
                *   `SaveDialog.js`: Save dialog component (JavaScript). **[REDUNDANT?]** (JSX version exists)
                *   `SaveDialog.jsx`: Save dialog component (React JSX).
                *   `SidebarListItems.js`: Component rendering list items within the sidebar.
            *   `StyleControl/StyleControl.js`: Component for changing map styles. **[REDUNDANT?]** (Presentation version exists)
            *   `WebGLTracer/`: Components related to the WebGL tracer feature.
                *   `TracerLayerTest.js`: Test component for the tracer layer.
                *   `TracerLayer.js`: The WebGL tracer layer component.
        *   `context/`: React contexts for map state.
            *   `MapContext.js`: Context for general map state (instance, settings).
            *   `RouteContext.js`: Context for route data state.
        *   `hooks/`: React hooks for map-related logic.
            *   `useUnifiedRouteProcessing.js`: Hook for consolidating route processing logic. **[LARGE?]**
        *   `services/`: Services for map-related data fetching.
            *   `routeService.js`: Service for fetching route data.
        *   `utils/`: Utility functions for map operations.
            *   `mapCleanup.js`: Utilities for cleaning up map resources.
            *   `mapRegistry.js`: Utility for managing multiple map instances.
    *   `photo/`: Features related to photos on the map. (Shared: **Creation** & **Presentation**)
        *   `components/`: UI components for photo features.
            *   `PhotoCluster/`: Components for clustering photos.
                *   `PhotoCluster.js`: Component for rendering photo clusters.
                *   `PhotoCluster.css`: Styles for photo clusters.
            *   `PhotoLayer/PhotoLayer.js`: Component for rendering the photo layer on the map. **[LARGE?]**
            *   `PhotoMarker/`: Components for individual photo markers.
                *   `PhotoMarker.css`: Styles for photo markers.
                *   `PhotoMarker.js`: Component for rendering individual photo markers.
            *   `PhotoPreview/`: Components for previewing photos.
                *   `PhotoModal.jsx`: Modal component for displaying photos. **[REDUNDANT?]** (Presentation version exists)
                *   `SimpleLightbox.jsx`: A simple lightbox component implementation.
        *   `context/PhotoContext.js`: React context for photo state.
        *   `services/photoService.js`: Service for fetching and managing photo data.
        *   `utils/clustering.js`: Utility functions for photo clustering logic.
    *   `poi/`: Features related to Points of Interest (POI). (Shared: **Creation** & **Presentation**)
        *   `components/`: UI components for POI features.
            *   `MapboxPOIMarker/`: Components for Mapbox POI markers.
                *   `MapboxPOIMarker.js`: Component rendering a POI marker using Mapbox.
                *   `MapboxPOIMarker.styles.css`: Styles for the Mapbox POI marker.
            *   `POICluster/`: Components for clustering POIs.
                *   `POICluster.js`: Component for rendering POI clusters.
                *   `POICluster.css`: Styles for POI clusters.
            *   `POIDetailsDrawer/POIDetailsDrawer.js`: Drawer component for displaying POI details.
            *   `POIDetailsModal/POIDetailsModal.jsx`: Modal component for displaying POI details.
            *   `POIViewer/POIViewer.js`: Component for viewing POI details.
        *   `constants/`: Constant values related to POIs.
            *   `icon-paths.js`: Paths or definitions for POI icons.
            *   `poi-icons.js`: Definitions or configurations for POI icons.
        *   `context/POIContext.js`: React context for POI state.
        *   `services/`: Services for POI data.
            *   `googlePlacesService.js`: Service for interacting with Google Places API.
        *   `types/poi.types.js`: JavaScript type definitions (or Flow/JSDoc) for POI objects.
        *   `utils/`: Utility functions for POIs.
            *   `clustering.js`: Utility functions for POI clustering. **[REDUNDANT?]** (Geographic clustering exists)
            *   `geographicClustering.js`: Utility functions specifically for geographic clustering of POIs.
            *   `googlePlacesAPIToggle.js`: Utility possibly for toggling Google Places API usage.
    *   `presentation/`: Features specifically for the presentation/viewing mode. (**Presentation** & **Embed**)
        *   `components/`: UI components used in presentation mode.
            *   `ClimbViewer/PresentationClimbViewer.jsx`: Climb viewer component tailored for presentation mode.
            *   `DistanceMarkers/PresentationDistanceMarkers.js`: Distance markers tailored for presentation mode. **[REDUNDANT?]** (Map version exists)
            *   `ElevationProfile/`: Elevation profile components for presentation mode.
                *   `PresentationElevationProfile.tsx`: Main elevation profile component for presentation.
                *   `PresentationElevationProfilePanel.js`: Panel containing the presentation elevation profile.
            *   `EmbedMapView/`: Components specific to the embedded map view. (**Embed**)
                *   `components/`: Sub-components used within EmbedMapView.
                    *   `DirectEmbedLineLayer.jsx`: A specific line layer implementation for embeds.
                    *   `EmbedClimbMarkers.jsx`: Climb markers component for embeds.
                    *   `EmbedClimbViewer.jsx`: Climb viewer component for embeds.
                    *   `EmbedSidebar.jsx`: Sidebar component for embeds.
                    *   `MapOverviewContextAdapter.jsx`: Adapter for Map Overview context in embeds.
                    *   `MapOverviewInitializer.jsx`: Component to initialize map overview in embeds.
                    *   `SimplifiedRouteLayer.jsx`: A simplified route layer for embeds.
                *   `hooks/`: Hooks specific to EmbedMapView.
                    *   `useRouteDataLoader.js`: Hook for loading route data in embeds.
                *   `EmbedMapView.css`: Styles for the embed map view.
                *   `EmbedMapView.jsx`: The main component for the embedded map view. **[LARGE?]**
            *   `ImageSlider/`: Components for displaying image sliders.
                *   `ImageSlider.js`: Basic image slider component.
                *   `ImageSliderWithLightbox.jsx`: Image slider integrated with a lightbox.
            *   `LandingPage/`: Components for the application's landing page.
                *   `HeroCard.js`: Hero card component for the landing page.
                *   `LandingPage.js`: Main landing page component.
                *   `LandingPageHeader.js`: Header component for the landing page.
                *   `RouteCard.jsx`: Card component for displaying routes on the landing page.
                *   `StaticRouteCard.jsx`: Static version of the route card.
                *   `useRouteFilters.jsx`: Hook for filtering routes on the landing page.
            *   `LineLayer/DirectPresentationLineLayer.jsx`: A specific line layer implementation for presentation mode.
            *   `LineViewer/PresentationLineViewer.jsx`: Line viewer component tailored for presentation mode.
            *   `MapOverview/`: Components related to the map overview feature in presentation mode.
                *   `EditableMapOverviewPanel.js`: Panel for an editable map overview (might be misplaced in presentation?).
                *   `MapOverviewDrawer.jsx`: Drawer component for map overview.
                *   `MapOverviewLoader.jsx`: Component for loading map overview data.
                *   `PresentationMapOverviewContent.jsx`: Content component for presentation map overview.
                *   `PresentationMapOverviewDrawer.jsx`: Drawer component for presentation map overview.
                *   `PresentationMapOverviewPanel.js`: Panel component for presentation map overview.
            *   `MapPreview/MapPreview.js`: Component for displaying a small map preview.
            *   `PhotoLayer/`: Photo layer components tailored for presentation mode.
                *   `PhotoModal.jsx`: Modal for displaying photos in presentation mode. **[REDUNDANT?]** (Photo feature version exists)
                *   `PhotoPopup.jsx`: Popup component for photos.
                *   `PresentationLightbox.jsx`: Lightbox component for presentation mode.
                *   `PresentationPhotoLayer.css`: Styles for the presentation photo layer.
                *   `PresentationPhotoLayer.js`: Photo layer component for presentation mode. **[LARGE?]**
            *   `POILayer/`: POI layer components tailored for presentation mode.
                *   `PresentationPOILayer.css`: Styles for the presentation POI layer.
                *   `PresentationPOILayer.js`: POI layer component for presentation mode.
            *   `POIViewer/PresentationPOIViewer.js`: POI viewer component for presentation mode.
            *   `PresentationMapView/`: The main map view component for presentation mode.
                *   `PresentationMapView.css`: Styles for the presentation map view.
                *   `PresentationMapView.js`: The main component for presentation map view. **[LARGE?]**
            *   `PresentationSidebar/`: Sidebar components tailored for presentation mode.
                *   `PresentationSidebar.styles.js`: Styles for the presentation sidebar.
                *   `PresentationSidebar.js`: Main presentation sidebar component.
            *   `RouteDescription/PresentationRouteDescriptionPanel.js`: Route description panel for presentation mode.
            *   `RoutePresentation/RoutePresentation.js`: Component managing the overall route presentation.
            *   `StyleControl/StyleControl.js`: Map style control for presentation mode. **[REDUNDANT?]** (Map version exists)
            *   `WeatherProfile/PresentationWeatherProfile.tsx`: Weather profile component for presentation mode.
        *   `context/MapOverviewContext.jsx`: React context for map overview state.
        *   `services/weatherService.ts`: Service for fetching weather data (TypeScript).
        *   `store/mapOverviewStore.js`: State management store (likely Zustand or Redux) for map overview.
        *   `utils/`: Utility functions specific to presentation mode.
            *   `photoClusteringPresentation.js`: Photo clustering logic specific to presentation mode.
            *   `scaleUtils.js`: Utilities related to map scaling or UI scaling.
    *   `wikipedia/`: Features related to Wikipedia integration.
        *   `services/wikipediaService.js`: Service for interacting with Wikipedia API.
*   `lib/`: Third-party libraries or modified libraries.
    *   `mapbox-gl-no-indoor.js`: Custom build or version of Mapbox GL JS, possibly with indoor maps disabled. **[LARGE?]**
*   `theme/`: Theme related files (potentially redundant with root `theme.js`/`ts`).
*   `types/`: TypeScript type definitions for the frontend.
*   `utils/`: General utility functions shared across the frontend application.
    *   `fetchUtils.js`: Utilities for making fetch requests.
    *   `geocoding.js`: Utilities for geocoding addresses.
    *   `gpx/export.js`: Utility for exporting GPX data.
    *   `imageUtils.js`: Utilities for image manipulation or handling.
    *   `logger.js`: Client-side logging utility.
    *   `navigationUtils.js`: Utilities related to navigation or routing within the app.
    *   `routeUtils.ts`: Utilities for route data manipulation (TypeScript).
    *   `viewportUtils.js`: Utilities for managing map viewport state.

## `ssl/`

SSL certificate files for local HTTPS development.

*   `cert.pem`: SSL certificate file.
*   `key.pem`: SSL private key file.

## `uploads/`

Directory for user-uploaded files (e.g., GPX files). Should likely be configured to be persistent storage or use cloud storage in production.

*   `gpxFile-*.gpx`: Example uploaded GPX files.

---

**Notes:**

*   **[REDUNDANT?]**: Indicates files or features that appear to have duplicates or potentially outdated versions (e.g., `.js` vs `.tsx`, similar components in `map/` and `presentation/`). These should be reviewed for consolidation or removal.
*   **[LARGE?]**: Indicates files that *might* be large or complex based on their name and likely function. This is speculative and requires code analysis to confirm. Consider breaking down large components or utilities.
*   **[UNUSED?]**: Indicates files that might not be actively used (e.g., test files, old utilities). Requires checking import statements or usage context.
*   The distinction between `api/` (serverless) and `server/` (Node.js build) needs clarification. One might be deprecated or used for a different purpose (e.g., local dev vs. production).
*   The structure within `src/features/` is generally good, but the duplication between `map/` features and their `presentation/` counterparts suggests potential refactoring opportunities to share more logic.
