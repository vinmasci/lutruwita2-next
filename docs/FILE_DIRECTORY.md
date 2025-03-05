# Project File Directory

This document provides a comprehensive listing of all JavaScript, TypeScript, JSX, and TSX files in the project, organized by directory. 

- Files marked with **(duplicate)** exist in multiple versions (e.g., both .js and .tsx versions)
- Files marked with **(redundant)** appear to serve similar purposes and might be unnecessary duplicates
- Note: In this project, the JavaScript (.js/.jsx) files are likely the original implementations, while TypeScript (.ts/.tsx) files are newer versions that may be part of an ongoing TypeScript migration

## Root Directory

- `index.html`
- `main.js`
- `tailwind.config.js`
- `test-api.js`
- `vite.config.ts`

## API Directory

### api/

- `package.json`

### api/gpx/

- `index.js`

### api/health/

- `index.js`

### api/lib/

- `cloudinary.js`
- `db.js`
- `gpx-parser.js`
- `job-queue.js`
- `middleware.js`
- `redis.js`
- `storage.js`
- `surface-cache.js`

### api/photos/

- `index.js`

### api/poi/

- `index.js`

### api/routes/

- `index.js`

### api/routes/public/

- `index.js`

## Source Directory

### src/

- `App.js` (duplicate)
- `App.tsx` (duplicate) (redundant)
- `env.d.ts`
- `index.css`
- `main.js` (duplicate)
- `main.tsx` (duplicate) (redundant)
- `mockAuth.js`
- `polyfills.ts` (redundant)
- `theme.js`
- `theme.ts` (redundant)

### src/components/

- `ErrorBoundary.js` (duplicate)
- `ErrorBoundary.tsx` (duplicate) (redundant)

### src/components/ui/

- `alert.js` (duplicate)
- `alert.tsx` (duplicate) (redundant)
- `drawer.tsx` (redundant)
- `skeleton.js`
- `skeleton.tsx` (redundant)

### src/features/auth/components/Auth0Callback/

- `Auth0Callback.js` (duplicate)
- `Auth0Callback.tsx` (duplicate) (redundant)

### src/features/auth/components/Auth0Login/

- `Auth0Login.css`
- `Auth0Login.js` (duplicate)
- `Auth0Login.tsx` (duplicate) (redundant)

### src/features/auth/components/AuthAlert/

- `AuthAlert.tsx`

### src/features/auth/components/LoginModal/

- `index.js`
- `LoginModal.js`

### src/features/auth/components/UserProfileDrawer/

- `UserProfileDrawer.css`
- `UserProfileDrawer.tsx`

### src/features/auth/context/

- `AuthContext.tsx`

### src/features/auth/utils/

- `authUtils.ts`

### src/features/gpx/components/ElevationProfile/

- `ElevationProfile.styles.ts` (redundant)
- `ElevationProfile.tsx` (redundant)
- `ElevationProfilePanel.js` (duplicate)
- `ElevationProfilePanel.tsx` (duplicate) (redundant)

### src/features/gpx/components/RouteDescription/

- `RichTextEditor.d.ts` (redundant)
- `RichTextEditor.js`
- `RouteDescriptionPanel.js` (duplicate)
- `RouteDescriptionPanel.tsx` (duplicate) (redundant)

### src/features/gpx/components/SurfaceProcessingAlert/

- `index.ts`
- `SurfaceProcessingAlert.tsx`

### src/features/gpx/components/Uploader/

- `constants.js`
- `DraggableRouteItem.jsx`
- `index.ts` (redundant)
- `Uploader.js` (duplicate)
- `Uploader.tsx` (duplicate) (redundant)
- `Uploader.types.ts` (redundant)
- `UploaderUI.jsx`

### src/features/gpx/hooks/

- `useClientGpxProcessing.js`
- `useClientGpxProcessing.ts` (redundant)
- `useGpxProcessing.js` (duplicate)
- `useGpxProcessing.ts` (duplicate) (redundant)

### src/features/gpx/routes/

- `gpx.js`
- `gpx.ts` (redundant)

### src/features/gpx/services/

- `gpxService.js` (duplicate)
- `gpxService.ts` (duplicate) (redundant)
- `surfaceService.js`
- `surfaceService.ts` (duplicate) (redundant)

### src/features/gpx/types/

- `gpx.types.js`
- `gpx.types.ts` (duplicate) (redundant)
- `route-reorder.types.ts` (redundant)

### src/features/gpx/utils/

- `climbUtils.js`
- `climbUtils.ts` (duplicate) (redundant)
- `gpxParser.js`
- `gpxParser.ts` (duplicate) (redundant)
- `roadUtils.js`
- `roadUtils.ts` (redundant)
- `routeUtils.js` (duplicate)
- `routeUtils.ts` (duplicate) (redundant)

### src/features/map/components/DistanceMarkers/

- `DistanceMarkers.css`
- `DistanceMarkers.tsx`

### src/features/map/components/MapControls/

- (No JS/TS files)

### src/features/map/components/MapView/

- `MapView.css`
- `MapView.js` (duplicate)
- `MapView.tsx` (duplicate) (redundant)
- `photo-fix.css`

### src/features/map/components/RouteLayer/

- `index.ts`
- `RouteLayer.js`
- `types.ts`

### src/features/map/components/SearchControl/

- `SearchControl.css` (duplicate)
- `SearchControl.tsx`

### src/features/map/components/Sidebar/

- `icons.js`
- `LoadDialog.js` (duplicate)
- `LoadDialog.tsx` (duplicate) (redundant)
- `RouteList.tsx` (redundant)
- `Sidebar.styles.ts` (redundant)
- `Sidebar.tsx` (redundant)
- `SidebarListItems.js`
- `types.ts` (redundant)
- `useSidebar.ts` (redundant)

### src/features/map/components/StyleControl/

- `StyleControl.tsx` (duplicate)

### src/features/map/context/

- `index.ts` (redundant)
- `MapContext.js`
- `MapContext.tsx` (duplicate) (redundant)
- `ProcessingContext.jsx`
- `RouteContext.d.ts` (redundant)
- `RouteContext.js`

### src/features/map/hooks/

- `useGpxProcessing.js` (duplicate)
- `useGpxProcessing.ts` (duplicate) (redundant)
- `useMap.js`
- `useMap.ts` (redundant)
- `useMapInitialization.ts` (redundant)
- `useMapStyle.js`
- `useMapStyle.ts` (duplicate) (redundant)
- `useRouteInitialization.ts` (redundant)
- `useRouteState.js`
- `useRouteState.ts` (duplicate) (redundant)
- `useRouteVisibility.ts` (redundant)
- `useTerrainLoading.ts` (redundant)

### src/features/map/services/

- `mapService.js`
- `mapService.ts` (redundant)
- `routeService.js` (duplicate)
- `routeService.ts` (duplicate) (redundant)

### src/features/map/types/

- `map.types.js`
- `map.types.ts` (redundant)
- `route.types.js`
- `route.types.ts` (duplicate) (redundant)

### src/features/map/utils/

- `mapOperationsQueue.js`
- `mapScaleUtils.js` (redundant)
- `routeUtils.js` (duplicate) (redundant)
- `routeUtils.ts` (duplicate)

### src/features/photo/components/PhotoCluster/

- `PhotoCluster.css`
- `PhotoCluster.js` (duplicate)
- `PhotoCluster.tsx` (duplicate) (redundant)

### src/features/photo/components/PhotoLayer/

- `PhotoLayer.css`
- `PhotoLayer.js` (duplicate)
- `PhotoLayer.tsx` (duplicate) (redundant)

### src/features/photo/components/PhotoMarker/

- `PhotoMarker.css`
- `PhotoMarker.js` (duplicate)
- `PhotoMarker.tsx` (duplicate) (redundant)

### src/features/photo/components/PhotoPreview/

- `index.js`
- `PhotoPreviewModal.js`
- `SimpleLightbox.jsx`

### src/features/photo/components/Uploader/

- `PhotoUploader.js` (duplicate)
- `PhotoUploader.tsx` (duplicate) (redundant)
- `PhotoUploader.types.ts` (redundant)
- `PhotoUploaderUI.js` (duplicate)
- `PhotoUploaderUI.tsx` (duplicate) (redundant)

### src/features/photo/context/

- `PhotoContext.js` (duplicate)
- `PhotoContext.tsx` (duplicate) (redundant)

### src/features/photo/services/

- `photoService.js` (duplicate)
- `photoService.ts` (duplicate) (redundant)

### src/features/photo/types/

- `photo.types.ts`

### src/features/photo/utils/

- `clustering.js` (duplicate)
- `clustering.ts` (duplicate) (redundant)
- `index.ts` (redundant)
- `photoUtils.js`
- `photoUtils.ts` (duplicate) (redundant)

### src/features/place/context/

- `PlaceContext.js` (duplicate)
- `PlaceContext.tsx` (duplicate) (redundant)

### src/features/place/types/

- `place.types.js`
- `place.types.ts` (duplicate) (redundant)

### src/features/place/utils/

- `migration.js`
- `migration.ts` (duplicate) (redundant)

### src/features/poi/components/MapboxPOIMarker/

- `index.ts`
- `MapboxPOIMarker.styles.css`
- `MapboxPOIMarker.tsx`

### src/features/poi/components/PlaceComponent/

- `PlaceComponent.css`
- `PlaceComponent.tsx`

### src/features/poi/components/PlacePOIIconSelection/

- `index.ts`
- `PlacePOIIconSelection.tsx`

### src/features/poi/components/PlacePOILayer/

- `PlacePOILayer.css`
- `PlacePOILayer.tsx`

### src/features/poi/components/POIDetailsDrawer/

- `index.ts`
- `PlacePOIDetailsDrawer.js` (redundant)
- `POIDetailsDrawer.tsx`

### src/features/poi/components/POIDragPreview/

- `POIDragPreview.tsx`

### src/features/poi/components/POIDrawer/

- `index.ts`
- `PlacePOIInstructions.tsx`
- `POIDrawer.styles.ts`
- `POIDrawer.tsx`
- `POIIconSelection.tsx`
- `POILocationInstructions.tsx`
- `POIModeSelection.tsx`
- `types.ts`

### src/features/poi/components/POIMarker/

- `POIMarker.styles.ts`
- `POIMarker.tsx`
- `types.ts`

### src/features/poi/components/POIViewer/

- `POIViewer.js`

### src/features/poi/constants/

- `icon-paths.js`
- `icon-paths.ts` (duplicate) (redundant)
- `poi-icons.js`
- `poi-icons.ts` (duplicate) (redundant)

### src/features/poi/context/

- `POIContext.js` (duplicate)
- `POIContext.tsx` (duplicate) (redundant)

### src/features/poi/services/

- `poiService.js` (duplicate)
- `poiService.ts` (duplicate) (redundant)

### src/features/poi/types/

- `poi.types.js`
- `poi.types.ts` (duplicate) (redundant)

### src/features/poi/utils/

- `photo.js`
- `photo.ts` (duplicate) (redundant)
- `placeDetection.js`
- `placeDetection.ts` (duplicate) (redundant)

### src/features/presentation/components/DistanceMarkers/

- `PresentationDistanceMarkers.css`
- `PresentationDistanceMarkers.tsx`

### src/features/presentation/components/ElevationProfile/

- `index.js`
- `index.ts` (redundant)
- `PresentationElevationProfile.styles.ts` (redundant)
- `PresentationElevationProfile.tsx` (redundant)
- `PresentationElevationProfilePanel.js` (duplicate)
- `PresentationElevationProfilePanel.tsx` (duplicate) (redundant)

### src/features/presentation/components/HeroMap/

- `HeroMap.tsx`

### src/features/presentation/components/HeroMapPreview/

- `HeroMapPreview.tsx`

### src/features/presentation/components/LandingPage/

- `LandingPage.js` (duplicate)
- `LandingPage.tsx` (duplicate) (redundant)

### src/features/presentation/components/MapBrowser/

- `MapBrowser.tsx`

### src/features/presentation/components/MapControl/

- `MapControl.tsx`

### src/features/presentation/components/MapPreview/

- `MapPreview.tsx`

### src/features/presentation/components/PhotoLayer/

- `PresentationPhotoLayer.css`
- `PresentationPhotoLayer.js`

### src/features/presentation/components/PhotoViewer/

- `index.ts`
- `PresentationPhotoViewer.tsx`

### src/features/presentation/components/POILayer/

- `PresentationPOILayer.css`
- `PresentationPOILayer.js` (duplicate)
- `PresentationPOILayer.tsx` (duplicate) (redundant)

### src/features/presentation/components/POIViewer/

- `index.ts`
- `PresentationPOIViewer.tsx`

### src/features/presentation/components/PresentationMapView/

- `index.js` (duplicate)
- `index.ts` (duplicate) (redundant)
- `PresentationMapView.css`
- `PresentationMapView.js` (duplicate)
- `PresentationMapView.tsx` (duplicate) (redundant)

### src/features/presentation/components/PresentationSidebar/

- `index.js` (duplicate)
- `index.ts` (duplicate) (redundant)
- `PresentationSidebar.js` (duplicate)
- `PresentationSidebar.styles.js`
- `PresentationSidebar.styles.ts` (redundant)
- `PresentationSidebar.tsx` (duplicate) (redundant)

### src/features/presentation/components/RouteDescription/

- `index.ts`
- `PresentationRouteDescriptionPanel.d.ts`
- `PresentationRouteDescriptionPanel.js`

### src/features/presentation/components/RoutePresentation/

- `RoutePresentation.js` (duplicate)
- `RoutePresentation.tsx` (duplicate) (redundant)

### src/features/presentation/components/SearchControl/

- `SearchControl.css` (duplicate)
- `SearchControl.tsx` (duplicate) (redundant)

### src/features/presentation/components/StyleControl/

- `index.ts`
- `StyleControl.tsx` (duplicate)

### src/features/presentation/components/WeatherProfile/

- `index.ts`
- `PresentationWeatherProfile.tsx`
- `PresentationWeatherProfilePanel.d.ts`
- `PresentationWeatherProfilePanel.js`

### src/features/presentation/components/ZoomControl/

- `index.ts`

### src/features/presentation/context/

- `ResizeContext.js`

### src/features/presentation/hooks/

- `usePresentationRouteInit.ts`
- `usePresentationTerrain.ts`

### src/features/presentation/services/

- `publicRoute.service.js` (duplicate)
- `publicRoute.service.ts` (duplicate) (redundant)
- `weatherService.ts` (redundant)

### src/features/presentation/types/

- `route.types.ts`

### src/features/presentation/utils/

- `locationUtils.ts` (redundant)
- `photoClusteringPresentation.js` (duplicate)
- `photoClusteringPresentation.ts` (duplicate) (redundant)
- `routeProcessor.ts` (redundant)
- `scaleUtils.js`

### src/lib/

- `errors.js`
- `errors.ts` (redundant)
- `utils.js`
- `utils.ts` (redundant)

### src/theme/

- `responsive.ts`

### src/types/

- `api.types.js`
- `api.types.ts` (redundant)
- `index.js`
- `index.ts` (redundant)

### src/utils/

- `mobileViewport.js`
- `performance.ts` (redundant)
- `responsive.ts` (duplicate) (redundant)

### src/utils/gpx/

- `parsing.js`
- `parsing.ts` (duplicate) (redundant)

## Server Directory

### server/src/

- `server.ts`

### server/src/controllers/

- `gpx.controller.ts` (redundant)

### server/src/features/gpx/controllers/

- `gpx.controller.ts` (duplicate)

### server/src/features/gpx/routes/

- `gpx.routes.ts`

### server/src/features/gpx/services/

- `gpx.service.ts`
- `progress.service.ts`

### server/src/features/gpx/types/

- `gpx.types.ts` (duplicate)

### server/src/features/photo/controllers/

- `photo.controller.ts`

### server/src/features/photo/routes/

- `photo.routes.ts`

### server/src/features/photo/services/

- `photo.service.ts`

### server/src/features/poi/controllers/

- `poi.controller.ts`

### server/src/features/poi/models/

- `poi.model.ts`

### server/src/features/poi/routes/

- `poi.routes.ts`

### server/src/features/poi/services/

- `poi.service.ts`

### server/src/features/route/controllers/

- `public-route.controller.ts`
- `route.controller.ts`

### server/src/features/route/models/

- `route.model.ts`

### server/src/features/route/routes/

- `public-route.routes.ts`
- `route.routes.ts`

### server/src/features/route/services/

- `route.service.ts`

### server/src/features/route/types/

- `route.types.ts`

### server/src/routes/

- `gpx.routes.ts` (duplicate) (redundant)

### server/src/scripts/

- `add-persistent-ids.ts`
- `optimize-routes.ts`

### server/src/services/gpx/

- `gpx.processing.ts`

### server/src/shared/config/

- `logger.config.ts`
- `server.config.ts`

### server/src/shared/middlewares/

- `auth.middleware.ts`
- `cache.ts`
- `error-handling.ts`
- `rate-limit.ts`
- `upload.middleware.ts`
- `validateRoute.ts`

### server/src/shared/types/

- `auth.types.ts`
- `gpx.types.ts` (duplicate)
- `place.types.ts`
- `poi.types.ts`
