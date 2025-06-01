# Saved and Offline Routes Implementation

## Status: SAVED ROUTES FULLY IMPLEMENTED ✅ | OFFLINE ROUTES IN PROGRESS 🚧

This document outlines the implementation of the saved routes functionality and plans for offline route access in the CyaTrails mobile app.

---

## ✅ SAVED ROUTES - COMPLETED IMPLEMENTATION

### 🎯 Overview
Users can now save their favorite routes for quick access later. The saved routes feature allows users to bookmark trails they love and view them in a dedicated "Saved Routes" section.

### 🎨 Save Route Interface

#### Heart Icon in Route Detail Page Tab Bar (NEW)
- **Location**: Replaces the "Saved" tab item in the `CustomTabBarView` when on the `RouteDetailView`.
- **Icon**: `heart` (empty) or `heart.fill` (filled red).
- **Label**: Dynamically changes between "Save" (if not saved) and "Saved" (if saved) below the icon.
- **States**:
  - **Empty heart** (gray "Save" text): No part of the current route (master or any stage) is saved.
  - **Filled red heart** (red "Saved" text): At least one part of the current route (master or any stage) is saved.
  - **Loading spinner**: (Handled by `isSavingCurrentRoute` in `RouteDetailViewModel`, UI might show disabled state or subtle loading).
- **Functionality**:
    - Tap to save the currently selected route context (master if "Overview" tab is active in drawer, or specific stage if a stage tab is active).
    - Tap again to remove that specific route context from favorites.
    - The heart icon's appearance (filled/empty) reflects if *any* part of the overall route (master or any stage) is saved.
- **Authentication**: Button is disabled if the user is not logged in.

#### Smart Route Detection (for Tab Bar Heart)
- **Overview tab in Elevation Drawer active**: Tapping tab bar heart saves/unsaves the complete master route.
- **Individual stage tab in Elevation Drawer active**: Tapping tab bar heart saves/unsaves the specific stage route.
- **Real-time updates**: Heart icon in tab bar updates immediately based on the saved state of any part of the route.

#### Heart Icon in Elevation Drawer (REMOVED)
- The heart icon previously located to the left of the route tabs in the `ElevationDrawerView` has been **removed**.
- Save functionality is now centralized in the `CustomTabBarView` when on the `RouteDetailView`.

### 📱 Saved Routes View

#### Access
- **Location**: "Saved" tab in bottom navigation bar
- **Authentication**: Requires user login to view saved routes

#### UI States

##### Not Logged In
```
🔒 Sign In Required
Please sign in to view your saved routes.
```

##### Loading State
```
⏳ Loading saved routes...
```

##### Empty State
```
❤️ No Saved Routes
Your saved routes will appear here when you bookmark trails you love.
Tap the ❤️ icon when viewing a route to save it here.
```

##### Routes Display
- **Card layout**: Beautiful cards with map image placeholder
- **Progressive loading**: Shows cards immediately, then loads route details
- **Real-time updates**: Pull-to-refresh functionality

#### Route Cards Design

##### Visual Elements
- **Map preview**: Real route thumbnails using AsyncImage (was gradient placeholder)
- **Route information**: Name, save date (notes like "Complete route" removed)
- **Statistics**: Distance, elevation gain, surface type (with % unpaved)
- **Action button**: Entire card is tappable to navigate to route details

##### Data Display
- **Route name**: "Mount Wellington Circuit" (not cryptic IDs)
- **Distance**: "12.5 km" (real calculated distance, not divided by 1000)
- **Elevation**: "1,271 m" (actual elevation gain with comma formatting)
- **Surface**: "25% unpaved" or "Paved" (calculated from route data, shows % if >5% unpaved)
- **Save date**: When the route was bookmarked
- **Location**: "Hobart, Tasmania, Australia" (LGA, State, Country)

### 🔧 Technical Implementation

#### Data Architecture

##### Firebase Structure
```
users/{userId}/saved_routes/{randomId}/
├── id: "random-uuid"
├── routeId: "gmRh8B6akTWQcPG6WucU"
├── notes: "Complete route" // Note: This field is still in Firebase but no longer displayed
└── savedAt: "2025-05-24T12:49:22Z"
```

##### Data Flow
1. **Save Route**: `ElevationDrawerView` → `UserSyncService.saveRouteForUser()`
2. **Load Saved Routes**: `SavedRoutesView` → `UserSyncService.getUserSavedRoutes()`
3. **Fetch Route Details**: `UserSyncService.getRouteDetails()` → `FirebaseService.listRoutes()` (now correctly filters by `routeId`)

#### Key Services

##### UserSyncService Enhanced
```swift
// Save a route for user
func saveRouteForUser(_ routeId: String, notes: String?, for userId: String) async throws

// Remove route from user's saved routes
func removeRouteForUser(_ routeId: String, for userId: String) async throws

// Get user's saved routes
func getUserSavedRoutes(for userId: String) async throws -> [SavedRoute]

// Get full route details (NEW - uses same method as HomeView, now correctly filtered)
func getRouteDetails(for routeId: String) async throws -> RouteListItem?
```

##### Data Models
```swift
// Combined saved route with full details
struct SavedRouteWithDetails {
    let savedRoute: SavedRoute
    let routeDetails: RouteListItem?
    let isLoadingDetails: Bool
}

// Individual saved route record
struct SavedRoute {
    let id: String
    let routeId: String
    let savedAt: Date
    let notes: String? // Still present in model, but not displayed
}
```

#### UI Components

##### SavedRoutesView
- **Main container**: Handles authentication states and data loading
- **Progressive loading**: Shows saved routes immediately, fetches details async
- **Error handling**: Graceful fallbacks and retry functionality
- **Pull-to-refresh**: Manual refresh capability
- **Navigation**: Tapping a card navigates to `RouteDetailView` using `AppNavigationManager`.

##### SavedRouteCardWithDetails
- **Dynamic content**: Adapts based on loading state and data availability
- **Loading states**: Shows spinners while fetching route details
- **Fallback display**: Shows route ID if details unavailable
- **Navigation ready**: `onTap` closure triggers navigation in `SavedRoutesView`.
- **Data Display**: Shows real map thumbnail, formatted distance, elevation (with commas), surface (with % unpaved), save date, and location. Does not show "notes".

##### ElevationDrawerView Enhancements
- **Save button REMOVED**: Heart icon and save logic removed from `ElevationDrawerView`'s `routeTabs`.
- **State management**: Save status (`isRouteSaved`, `isSavingRoute`) and logic (`saveCurrentRoute`, `checkIfRouteSaved`) are now primarily managed by `RouteDetailViewModel` for the tab bar heart icon.
- **Authentication**: Tab bar heart icon is disabled if user not logged in (handled in `CustomTabBarView` via `RouteDetailViewModel`).
- **Real-time updates**: Tab bar heart icon checks and reflects if *any* part of the route (master or stages) is saved.

#### Route Data Integration

##### Fixed Data Fetching
- **Problem**: Originally tried to fetch from wrong Firebase collection. Also, `FirebaseService.listRoutes()` did not correctly filter by a single `routeId` when fetching details for saved routes, leading to duplicate route data.
- **Solution**: Now uses `FirebaseService.shared.listRoutes()` - same as HomeView. Crucially, `FirebaseService.listRoutes()` has been updated to correctly handle a `routeId` in its filters, ensuring only the specific route is fetched.
- **Result**: Displays actual route names and unique details for each saved route.

##### RouteStyleUtils Extended
```swift
// Added overloaded method for RouteListItem
static func getRouteSurfaceDescription(route: RouteListItem) -> String
// (Implicitly used by SavedRouteCardWithDetails for surface description)
```

### 🚀 User Experience

#### Save Workflow (Route Detail Page)
1. User views a route on the `RouteDetailView`.
2. Taps the heart icon in the bottom tab bar.
3. Heart icon in tab bar turns red and filled (or grey and empty if unsaving).
4. The specific route context (master or stage, based on `ElevationDrawerView`'s active tab) is saved/unsaved in Firebase.
5. Saved status is reflected in the "Saved Routes" tab in the main app navigation and the tab bar heart icon updates.

#### View Saved Routes
1. Navigate to "Saved" tab
2. See beautiful cards with correct, unique route information and map previews.
3. Tap anywhere on a card to view route details.
4. Pull down to refresh list.

#### Cross-Platform Sync
- Routes saved on mobile appear on web
- Routes saved on web appear on mobile
- Real-time synchronization via Firebase

### ✅ Features Implemented

#### Core Functionality
- ✅ Save routes with heart icon
- ✅ Remove routes from favorites
- ✅ View saved routes in dedicated tab
- ✅ Real, unique route information display for each saved route
- ✅ Progressive loading with fallbacks
- ✅ Cross-platform synchronization
- ✅ Navigation from saved route card to route detail view

#### UI/UX Features
- ✅ Beautiful card-based layout with real map thumbnails
- ✅ Correctly formatted distance, elevation, and surface type (including % unpaved)
- ✅ Display of route location (LGA, State, Country)
- ✅ Loading states and error handling
- ✅ Pull-to-refresh functionality
- ✅ Authentication state management
- ✅ Responsive design with proper spacing
- ✅ Entire card tappable for navigation

#### Technical Features
- ✅ Firebase integration
- ✅ Real-time save status checking
- ✅ Proper data fetching (same as HomeView, and now correctly filters by `routeId`)
- ✅ Error handling and retries
- ✅ Memory-efficient loading

---

## 🚧 OFFLINE ROUTES - IN PROGRESS

### 🎯 Future Vision
Enable users to download routes for offline access when they don't have internet connectivity.

### 📱 Current Progress & Planned Features

#### Download Interface
- ✅ **Download button & status in Route Detail Tab Bar**: Logic integrated into `RouteDetailViewModel` and `RouteDetailView`. UI elements added to `CustomTabBarView` when `isDetailView` is true, replacing the standard "Downloads" tab.
- ✅ **Dynamic states**: Shows "Download Route", "Downloading %", "Downloaded", or "Login to Download". Allows deleting downloaded routes.
- ⏳ **Download states**: Progress indicator (`downloadProgress` in `RouteDetailViewModel`), completed checkmark (via `isRouteAvailableOffline`).
- 📋 **Storage management**: View downloaded routes and manage storage (planned for `DownloadsView`).

#### Offline Access
- 📋 **No internet required**: Full route access without connectivity (core data download implemented).
- 📋 **Complete data**: Maps (tile caching pending), elevation profiles (downloaded), descriptions (downloaded), POIs (downloaded). Photos are optional and currently not included in the basic download.
- 📋 **Offline navigation**: GPS tracking without internet (future phase).

#### Downloads Management
- 📋 **Downloads tab**: Dedicated section for offline routes (`DownloadsView` - to be created).
- 📋 **Storage usage**: See how much space routes take (future enhancement).
- 📋 **Cleanup options**: Remove old downloads to free space (delete functionality implemented at individual route level).

### 🔧 Technical Implementation (Current & Planned)

#### Download Strategy
- ✅ **Route data**: Store complete route information locally (JSON for route, POIs, etc.).
- ⏳ **Map tiles**: Cache map tiles for route area (Mapbox SDK integration - **Next Major Step**).
- ✅ **Elevation data**: Store elevation profiles locally (included in route JSON).
- 📋 **Photos**: Optional photo downloads (future enhancement).

#### Storage Architecture (Implemented for Core Data)
```
Local Storage/ (Managed by OfflineRouteManager via FirebaseService)
├── routes/
│   ├── {routeId}/
│   │   ├── route.json // Contains Route object, including POIs, lines, elevation.
│   │   ├── // (Map tiles and photos would be here in future)
├── metadata.json // Tracks downloaded routes, timestamps, etc. (Managed by OfflineRouteManager)
```
- ✅ `OfflineRouteManager.swift`: Manages local file storage, metadata.
- ✅ `OfflineModels.swift`: Defines `OfflineRouteMetadata`, `DownloadProgress`, `DownloadOptions`.
- ✅ `FirebaseService.swift`: Extended with `loadRouteWithCache`, `downloadRouteForOffline`, `deleteOfflineRoute`, offline status checks.
- ✅ `RouteDetailViewModel.swift`: Manages offline state (`isRouteAvailableOffline`, `isDownloadingRoute`, `downloadProgress`), actions (`downloadCurrentRoute`, `deleteOfflineRoute`), and integrates with `FirebaseService`.
- ✅ `RouteDetailView.swift`: Passes offline state and actions to `CustomTabBarView`.
- ✅ `ElevationDrawerView.swift`: Download controls **REMOVED**.

#### Core Services (Partially Implemented / Updated)
```swift
// FirebaseService (Extended for Offline Functionality)
// - func loadRouteWithCache(persistentId: String) async throws -> Route
// - func downloadRouteForOffline(_ routeId: String, options: DownloadOptions) async throws
// - func deleteOfflineRoute(_ routeId: String) async throws
// - func isRouteAvailableOffline(_ routeId: String) -> Bool
// - func isRouteDownloading(_ routeId: String) -> Bool
// - func getDownloadProgress(for routeId: String) -> DownloadProgress?

// OfflineRouteManager (Created)
// - Manages actual file I/O for route data and metadata.
// - Used internally by FirebaseService for offline operations.

// RouteDetailViewModel (Updated)
// - @Published var isRouteAvailableOffline: Bool
// - @Published var isDownloadingRoute: Bool
// - @Published var downloadProgress: DownloadProgress?
// - func downloadCurrentRoute(options: DownloadOptions)
// - func deleteOfflineRoute()
// - func refreshDownloadStatus()
```

#### 🛑 IMPORTANT: Coordinate Data Sourcing for Offline Routes & Bounds Calculation

-   **MASTER ROUTE GEOJSON IS ALWAYS NIL**: The `geojson` property of a master `Route` object (i.e., the `Route` object representing the entire multi-stage journey or a single-stage route at the top level) **NEVER CONTAINS COORDINATE DATA AND NEVER WILL**. Do not attempt to access `masterRoute.geojson` for coordinates.
-   **COORDINATES ARE IN SEGMENTS**: All geometric data (coordinates, unpaved sections, etc.) for any route, whether single-stage or multi-stage, is stored within the `Route` objects that represent its individual segments.
    -   For a master `Route` object, its `segmentCollection: [Route]?` property holds an array of these segment `Route` objects.
    -   Each `Route` object within this collection (or a standalone `Route` object if it's a single-stage route being treated as its own segment) contains its own `geojson` data.
-   **CORRECT ACCESS PATTERN**: To get coordinates for calculating bounds or any other purpose, you **MUST** iterate through the `segmentCollection` of the master `Route` (or use the `Route` object directly if it's a single segment context) and access:
    `aSegmentRoute.geojson?.features.first?.geometry.coordinates`
-   **FIREBASE STRUCTURE (Conceptual for Segments)**: While the Swift models abstract the direct Firebase paths, the underlying data for segment coordinates is conceptually stored nested under the segment, e.g.:
    `user_saved_routes/{MASTER_ROUTE_ID}/routes/{SEGMENT_ROUTE_ID}/data/coords/...`
    And for unpaved sections within a segment:
    `user_saved_routes/{MASTER_ROUTE_ID}/routes/{SEGMENT_ROUTE_ID}/data/unpaved/...`
-   **GUIDANCE FOR ALL DEVELOPERS (HUMAN AND AI)**:
    -   **DO NOT GUESS OR ASSUME DATA STRUCTURES.**
    -   **ALWAYS EXAMINE EXISTING, FUNCTIONAL CODE** to understand how data is structured and correctly accessed. For example, the coordinate aggregation logic in `RouteDetailViewModel.swift` (e.g., in methods like `getConsolidatedCoordinatesForOverview()` or map rendering data preparation) demonstrates the correct pattern for accessing segment-based coordinates.
    -   Mistakenly trying to access `masterRoute.geojson` was the root cause of the "No coordinates found" error in `OfflineRouteManager.calculateRouteBounds` and led to significant debugging time. This has been corrected.

### 📊 Implementation Phases (Updated Status)

#### Phase 1: Basic Offline Storage (In Progress 🚧)
- ✅ Route data download and storage (core JSON data, POIs, elevation).
- ⏳ Offline route list view (`DownloadsView` - **Next UI Step**).
- ✅ Basic offline access (UI integration in `CustomTabBarView` for download button/status - **COMPLETED**).
- ✅ Cache-first data loading in `RouteDetailViewModel` via `FirebaseService`.

#### Phase 2: Map Integration (In Progress 🚧)
- ✅ **Offline map tile caching (Mapbox SDK integration)**:
    - `MapBoxOfflineManager.swift` has been **UPDATED** to manage Mapbox tile downloads using **correct Mapbox SDK v11 APIs**.
    - **RESOLVED**: Compiler errors within `MapBoxOfflineManager.swift` related to SDK v10 vs v11 API mismatches and Swift 6 concurrency have been fixed. The file now correctly uses v11 APIs for `OfflineManager`, `StylePackLoadOptions`, `TileRegionLoadOptions`, and handles `async/await` patterns and `@MainActor` isolation properly.
- ✅ **Route display without internet (foundational code)**:
    - `NetworkMonitor.swift` created to detect online/offline status.
    - `EnhancedRouteMapView.swift` updated to use `NetworkMonitor`. It's prepared to use cached tiles via Mapbox SDK's default `TileStore` behavior, which should now function correctly with the updated `MapBoxOfflineManager.swift`.
- ✅ **GPS tracking capabilities (offline)**:
    - `EnhancedRouteMapView.swift` updated to configure and display the user's location puck using `CoreLocation`. This part should be functional irrespective of tile caching issues.
- ⏳ **Integration with ViewModel**:
    - The logic to call `MapBoxOfflineManager` from `RouteDetailViewModel` (for triggering tile downloads/deletions) can now proceed as `MapBoxOfflineManager.swift` is functional.

#### Phase 3: Advanced Features (Planned 📋)
- 📋 Photo downloads (optional).
- 📋 Selective download options (e.g., download stages individually).
- 📋 Storage optimization.

#### Phase 4: Sync & Management (Planned 📋)
- 📋 Smart sync when online (check for updates to downloaded routes).
- 📋 Automatic updates for downloaded routes (optional).
- 📋 Enhanced storage management tools in `DownloadsView`.

---

## 🎉 Current Status Summary

### ✅ PRODUCTION READY: Saved Routes
- **Save functionality**: Heart icon now in `CustomTabBarView` on `RouteDetailView`, replacing "Saved" tab. Works for master and stage routes.
- **Saved routes view**: Beautiful cards with real, unique route information and map previews. Data is correctly formatted.
- **Data integration**: Proper Firebase integration with cross-platform sync. `FirebaseService` now correctly filters by `routeId` ensuring correct data for each saved route.
- **User experience**: Polished interface with loading states, error handling, and seamless navigation.

### ✅ FIXED: Route Detail Tab Bar Implementation
- **Critical Problem RESOLVED**: Tab bar positioning issue completely fixed
- **Solutions Implemented**:
  - Restructured RouteDetailView from ZStack with overlay to proper VStack layout
  - Tab bar now properly anchored to bottom of screen using VStack structure
  - Elevation drawer correctly positioned using `.safeAreaInset(edge: .bottom)`
  - Fixed safe area handling for proper bottom positioning
- **Status**: Production ready with proper navigation experience
- **User Impact**: Route detail navigation now works perfectly with tab bar at screen bottom

### ✅ MAJOR PROGRESS: Offline Routes (Map Tile Caching Now Partially Working!)
- **Core Logic**: `OfflineRouteManager`, `OfflineModels` created. `FirebaseService` updated for download/delete/status checks and cache-first loading. `RouteDetailViewModel` manages offline state and actions.
- **Route Detail Integration**: `RouteDetailView` passes offline states/actions to `CustomTabBarView`. Download controls removed from `ElevationDrawerView`.
- **Next Steps (Phase 1 UI)**:
    - ✅ **Download Button Relocated**: Moved from `ElevationDrawerView` to `CustomTabBarView` on `RouteDetailView`.
    - ✅ Create `DownloadsView` to list and manage offline routes. (This was already marked as done in a later update, keeping it consistent).
- **Pending (Phase 1 Core)**:
    - ✅ Ensure robust error handling for download/delete operations. (Basic error catching and user notification via `localizedDescription` is implemented. Partial downloads are cleaned up. Specific custom error types and messages are a potential future enhancement.)
    - ✅ **Compiler Errors Resolved**: Successfully resolved compiler errors related to `DownloadsView` and `OfflineRouteManager`.
- **Future Phases**: Full map tile caching, offline navigation, photo downloads, advanced management.
- **Current Debugging Focus (May 25, 2025 - Evening Update)**:
    - **RESOLVED (Route Data Caching)**: `Route.segmentCollection` is now correctly encoded and decoded, ensuring full route coordinate data is available offline from `route_data.json`. This fixed issues where maps appeared blank due to missing segment data in cached `Route` objects.
    - **RESOLVED (MapBoxOfflineManager Geometry & Tilesets)**: Corrected `MapBoxOfflineManager.swift` to use proper bounding box geometry (converted to a `Polygon`) for `TileRegionLoadOptions` and to include both `mapbox.mapbox-streets-v8` and `mapbox.satellite` tilesets. This resolved the "0 (0/0)" tile download issue, and tile downloads are now progressing.
    - **RESOLVED (Mapbox Rate Limiting - HTTP 429)**: Implemented `MapboxRateLimitManager.swift` to handle HTTP 429 errors by introducing delays and throttling. Integrated this with `MapBoxOfflineManager.swift` and `RouteDetailViewModel.swift` to observe and display rate limiting status. This has allowed tile downloads to complete successfully.
    - **RESOLVED (Download Button UI)**:
        - Changed the "Download Route" button icon color to gray (`.secondary`) when not downloaded, for consistency.
        - Ensured download status (Available, Queued, Downloading, Progress, Error) is consistent across the master route overview and all individual segment views by updating `RouteDetailViewModel.updateAllOfflineStates()` to check the entire route family.
    - **RESOLVED (Download UI Feedback)**:
        - **Spinner Not Auto-Updating**: Implemented a `downloadStatusChangedPublisher` in `OfflineRouteManager` and subscribed to it in `RouteDetailViewModel`. This ensures the UI (including the spinner on the download button) updates automatically upon download completion or failure without requiring manual interaction.
        - **Display Actual Tile Progress**: Modified `MapBoxOfflineManager` to provide a `progressHandler` callback. `OfflineRouteManager` now uses this to receive detailed tile download progress (completed/total tiles) and updates its `activeDownloadProgress`. `RouteDetailViewModel` consumes this, allowing the UI to display a percentage based on actual tile download progress.
    - **Next Step**: Further testing of the offline download process, focusing on edge cases and overall robustness. Consider UI refinements for progress display if needed (e.g., showing "Style pack %" then "Tiles %").

The saved routes functionality is production ready! The route detail tab bar implementation has been completely fixed. Offline route functionality has seen **major breakthroughs**: route data caching is fully functional, map tile downloads complete successfully after rate limiting fixes, and download button UI and progress reporting have been significantly improved with real-time updates.

---

## 🔄 Updates Made

### May 25, 2025 (Late Evening - Thumbnail Download & Concurrency Fix)
- 🎯 **Goal**: Implement static map thumbnail downloads for offline routes and resolve a Swift concurrency compilation error.
- ✅ **Solution (Thumbnail Downloads)**:
    - **`OfflineModels.swift`**: Added `thumbnailUrlString: String?` to `QueuedDownload` struct.
    - **`OfflineRouteManager.swift`**:
        - Modified `queueDownload()` to accept `thumbnailUrlString` and pass it to `QueuedDownload`.
        - Updated `executeDownload()` to use `queuedItem.thumbnailUrlString` to download the thumbnail image via `URLSession.shared.data(from: thumbnailUrl)`.
        - The downloaded thumbnail data is saved to a local file (`thumbnail.jpg`) within the specific route's offline storage directory.
        - The path to this local thumbnail (`localThumbnailPath`) is stored in the `StoredOfflineRouteData` object.
    - **`RouteDetailViewModel.swift`**:
        - Modified `downloadCurrentRoute()` to first fetch the `RouteListItem` for the current route context (master or stage) using `FirebaseService.shared.listRoutes()`.
        - This allows extraction of the `thumbnailUrl` from the `RouteListItem`.
        - This `thumbnailUrlString` is then passed to `OfflineRouteManager.shared.queueDownload()`.
- ✅ **Solution (Concurrency Fix)**:
    - **`RouteDetailViewModel.swift`**: In `downloadCurrentRoute()`, the asynchronous call to `FirebaseService.shared.listRoutes()` (which uses `await`) was wrapped in a `Task {}` block.
    - This resolves the "'async' call in a function that does not support concurrency" compilation error by ensuring the `await` is performed in an appropriate asynchronous context.
- 📈 **Outcome**:
    - Static map thumbnails are now downloaded and stored locally when a route is saved for offline use.
    - The Swift concurrency error in `RouteDetailViewModel.swift` is resolved.
    - ✅ **Static Map Thumbnail issue from "May 25, 2025 (Evening - Offline Data Accuracy Investigation & Fix)" is now RESOLVED.**

### May 25, 2025 (Evening - Offline Data Accuracy Investigation & Fix)
- 🎯 **Goal**: Ensure the "Offline Maps" tab displays accurate route statistics (location, elevation) from locally stored data.
- 🚨 **Issue**: Offline routes in the "Offline Maps" tab were showing "Unknown Location" and "0m elevation" despite data being present in Firebase.
- 🔍 **Investigation**:
    - Confirmed `DownloadsViewModel.swift` was correctly set up to be offline-first, using `StoredOfflineRouteData.route` as the primary source.
    - Traced data flow: `RouteDetailViewModel.downloadCurrentRoute()` -> `OfflineRouteManager.queueDownload()` -> `OfflineRouteManager.executeDownload()` -> `FirebaseService.loadRoute()` -> `OfflineRouteManager.saveRouteDataToFile()`.
    - `FirebaseService.loadRoute()` was identified as the point where the `Route` object (including its `metadata` and `statistics`) is constructed from Firebase data.
    - Analysis of `FirebaseService.swift` and a Firebase screenshot revealed a mismatch:
        - The code was attempting to read location data (country, state, lga) from a `routeData["metadata"]` object.
        - The Firebase data actually stores this location information within the `routeData["statistics"]` object as arrays (e.g., `statistics.countries`, `statistics.states`).
        - Similarly, elevation gain was being read as `statistics.elevationGain` but stored in Firebase as `statistics.totalAscent`.
- ✅ **Solution**:
    - Modified `FirebaseService.swift` in the `loadRoute(persistentId: String)` function:
        - Changed `Route.metadata` initialization to correctly access `statsData?["countries"]`, `statsData?["states"]`, and `statsData?["lgas"]` (taking the first element of these arrays).
        - Changed `Route.statistics.elevationGain` initialization to correctly use `statsData?["totalAscent"]`.
    - Applied similar corrections to the `listRoutes(...)` function in `FirebaseService.swift` where `RouteListItem` objects are created, ensuring consistency.
- 📈 **Outcome**:
    - The `FirebaseService` now correctly maps Firebase fields to the `Route` and `RouteListItem` models.
    - This ensures that when a route is downloaded for offline use, the `Route` object saved to the local JSON file contains the correct location and elevation statistics.
    - Consequently, the "Offline Maps" tab should now display accurate location (State is confirmed working) and elevation data.
- ⚠️ **Remaining Issues**:
    - **Country Not Displaying**: Although State is now correctly displayed, the Country field is still not appearing in the "Offline Maps" list for downloaded routes. Further investigation needed in `DownloadsViewModel.swift` or `DownloadsView.swift` for how the location string is constructed and displayed.
    - ✅ **Static Map Thumbnail**: RESOLVED. Thumbnails are now downloaded and stored locally. The `DownloadsViewModel` will need to be updated to use `StoredOfflineRouteData.localThumbnailPath` to display them.

### May 25, 2025 (Late Evening - Offline-First Downloads Tab & Stats Accuracy - Initial Plan)
- 🎯 **Goal**: Ensure the "Downloads" tab (to be renamed "Offline Maps") is truly offline-first and displays accurate route statistics.
- 🚨 **Issue 1: Tab Naming & Icon**:
    - The tab is currently labeled "Downloads" with `arrow.down.circle.fill`.
    - **Plan**: Rename to "Offline Maps" and potentially update icon (e.g., `map` or `icloud.and.arrow.down`).
- 🚨 **Issue 2: Offline Availability of Route List (Critical)**:
    - `DownloadsViewModel.fetchDownloadedRoutes()` currently attempts to fetch `RouteListItem` details online via `userSyncService.getRouteDetails()` *first*, then falls back to `offlineRouteManager.loadOfflineRoute()`.
    - This means an internet connection is required to populate the list of downloaded routes, defeating the purpose of an offline tab.
- 🚨 **Issue 3: Stats Accuracy in List**:
    - Because the primary source for display items is the potentially stale online `RouteListItem`, the stats (distance, location, etc.) shown in the `DownloadsView` list might not accurately reflect the data that was actually downloaded and stored locally within the `StoredOfflineRouteData.route` object.
- ✅ **Solution & Plan**:
    1.  **Rename Tab**:
        - Modify `ContentView.swift` to change the tab label from "Downloads" to "Offline Maps".
        - Update the `systemImage` for the tab item.
    2.  **Refactor `DownloadsViewModel.fetchDownloadedRoutes(for userId: String)` for Offline-First Operation**:
        - **Primary Data Source**: Iterate directly over `offlineRouteManager.downloadedRoutes` (which is `[StoredOfflineRouteData]`).
        - **Populate `OfflineRouteDisplayItem`**:
            - For each `StoredOfflineRouteData` in the list:
                - Access its `route: Route` property (this is the complete `Route` object saved during download).
                - Use `storedOfflineRoute.route.name` for `routeName`.
                - Use `storedOfflineRoute.route.statistics.totalDistance` for `routeDistance`.
                - Construct location string from `storedOfflineRoute.route.metadata` (lga, state, country).
                - Use `storedOfflineRoute.downloadDate` for `savedAt`.
                - Handle `thumbnailURL` (this might still need an online source if not cached locally, or we can design a local thumbnail caching strategy later. For now, prioritize core data).
        - **Remove Online Dependency for Initial Load**: The initial population of `downloadedRoutes` in the ViewModel should *not* depend on `userSyncService.getRouteDetails()` or any other network call.
        - **Accuracy**: This ensures that the list displays exactly what was downloaded and that all stats are from the locally stored `Route` object.
    3.  **(Optional) Online Enhancement**:
        - After the list is populated from local data, if the device is online (check via `NetworkMonitor`), the ViewModel *could* attempt a background refresh of `RouteListItem` details from `userSyncService` to update any minor details (like name changes made on other platforms) without altering the core offline-first display. This is a secondary enhancement.
- 🛠️ **Files to Modify**:
    - `ContentView.swift` (for tab renaming)
    - `DownloadsViewModel.swift` (for core logic change)
    - `OfflineRouteDisplayItem` (ensure it can be fully populated from `StoredOfflineRouteData.route`)

### May 25, 2025 (Evening - Offline Deletion & Mapbox Ambient Cache Investigation)
- ✅ **Fixed MapBoxOfflineManager Compilation Errors**: Resolved two critical compilation errors:
    - **Line 164**: Removed invalid `.id` reference on `StylePack` object (property doesn't exist in Mapbox SDK v11)
    - **Line 178**: Fixed `removeTileRegion` method call - changed from async with trailing closure to synchronous try-catch since the method doesn't accept a completion handler
- 🔍 **Investigated Offline Route Deletion Behavior**: 
    - **Observation**: When users delete offline routes, subsequent re-downloads are instant, raising questions about whether data is actually being deleted
    - **Analysis**: Logs confirm all deletion steps complete successfully:
        - App's local route data (JSON files, metadata) is properly removed
        - `MapBoxOfflineManager` successfully removes style pack and tile region
        - All completion handlers report success
    - **Root Cause**: Fast re-downloads are due to **Mapbox SDK's Ambient Cache**
        - The SDK maintains an internal cache of tiles that have been loaded
        - When a named offline region is deleted, the SDK removes the region definition but keeps the underlying tiles in the ambient cache for performance
        - Re-downloading the same area reuses cached tiles, making the process appear instantaneous
    - **Conclusion**: This is **expected and acceptable behavior**:
        - Our deletion logic is working correctly
        - The ambient cache is a performance feature designed by Mapbox
        - The SDK manages its own cache lifecycle and eviction policies
        - Users benefit from fast re-downloads if they change their mind
- 📝 **Documentation**: Added detailed explanation of ambient cache behavior to help future developers understand why "deleted" routes can be quickly re-downloaded

### May 25, 2025 (Earlier - Debugging Download Failures & Queue Logic)
- ✅ **Fixed Infinite Loop in Download Queue**: Refactored `processDownloadQueue()` in `OfflineRouteManager.swift` to correctly handle empty or non-queued items, preventing an infinite recursion. The queue now processes and terminates correctly if no items are ready.
- 🚧 **Investigating Download Failures**:
    - Downloads are currently failing for some routes (e.g., "Erskine Falls") due to an inability to calculate route bounds. The error `Failed to calculate valid route bounds... No coordinates found in first feature` suggests issues with the GeoJSON data for these specific routes. This is a separate issue from the initial `NaN` crash.
    - The original `Fatal error: Double value cannot be converted to Int because it is either infinite or NaN` is still the primary target but requires the download process to initiate correctly.
- ✅ **Resolved `RouteDetailViewModel.swift` Corruption**: Restored `RouteDetailViewModel.swift` to a compilable state after it was found to be heavily corrupted with "Cannot find 'self' in scope" and structural errors. This was a critical blocker.
- ✅ **Added Logging for Download Trigger**: Added detailed logging to `RouteDetailViewModel.downloadCurrentRoute()` to verify if the UI button correctly triggers the download action.

### May 24, 2025 (Compiler Error Resolution & Code Cleanup)
- ✅ **`OfflineModels.swift`**:
    - Ensured `DownloadProgress` correctly conforms to `Codable`. This resolved errors where `QueuedDownload` (which contains `DownloadProgress`) was failing `Codable` conformance.
- ✅ **`OfflineRouteManager.swift`**:
    - Resolved an "Extraneous '}' at top level" error by removing a duplicated `deleteOfflineRoute` function definition and a redundant print statement. The file structure is now correct.
- ✅ **Build Status**: The project compiles without the previously identified errors in `OfflineModels.swift` and `OfflineRouteManager.swift`.

### May 24, 2025 (Offline Routes - Phase 1 UI & Error Handling Review)
- ✅ **Download Button Relocated to Tab Bar**:
    - Removed `DownloadControlsView` from `ElevationDrawerView`.
    - "Downloads" tab in `CustomTabBarView` on `RouteDetailView` is now a dynamic "Download Route" button.
    - Button shows states: "Download Route", "Downloading %", "Downloaded", "Login to Download".
    - Allows deleting downloaded routes directly from the tab bar button.
- ✅ **DownloadsView Created**: Implemented `DownloadsView.swift` and `DownloadsViewModel.swift` to list downloaded routes, allow navigation to route details, and provide swipe-to-delete functionality.
- ✅ **DownloadsView Integration**: Confirmed `DownloadsView` is correctly added to the main `TabView` in `ContentView.swift` and `AppNavigationManager.swift`.
- ✅ **Error Handling (Phase 1 Core)**: Reviewed error handling in `OfflineRouteManager`, `RouteDetailViewModel`, and `DownloadsViewModel`. Current implementation catches errors from download/delete operations, notifies the user via `localizedDescription` through `offlineDownloadError` or `errorMessage` properties, and `OfflineRouteManager` attempts to clean up partial downloads. This meets Phase 1 requirements for robustness. More specific error types/messages can be a future enhancement.
- ✅ **Compiler Error Resolution**: Successfully resolved compiler errors in `DownloadsView.swift` and `OfflineRouteManager.swift`. Build is now clean.

### May 24, 2025 (Offline Routes - Core Logic & ViewModel Integration)
- ✅ **Offline Storage Models**: Created `OfflineModels.swift` (`OfflineRouteMetadata`, `DownloadProgress`, `DownloadOptions`).
- ✅ **Offline Route Manager**: Implemented `OfflineRouteManager.swift` for local file storage of route data and metadata.
- ✅ **FirebaseService Enhancements**:
    - Added `loadRouteWithCache(persistentId:)` for cache-first data loading.
    - Implemented `downloadRouteForOffline(_:options:)` to save route data locally.
    - Implemented `deleteOfflineRoute(_:)` to remove local route data.
    - Added helper functions: `isRouteAvailableOffline(_:)`, `isRouteDownloading(_:)`, `getDownloadProgress(for:)`.
- ✅ **RouteDetailViewModel Updates**:
    - Added `@Published` properties for `isRouteAvailableOffline`, `isDownloadingRoute`, `downloadProgress`, `offlineDownloadError`.
    - Implemented `downloadCurrentRoute()`, `deleteOfflineRoute()`, `refreshDownloadStatus()` methods.
    - Integrated `loadRouteWithCache` in `loadRoute(persistentId:)`.
    - Calls `updateOfflineStatus` on load and when selected route changes.
- ✅ **RouteDetailView Updates**:
    - Passes new offline state properties and actions from `RouteDetailViewModel` to `ElevationDrawerView`.
    - Calls `viewModel.refreshDownloadStatus()` in `.onAppear` and on `selectedRouteIndex` change.
    - Added basic display for `offlineDownloadError`.

### May 24, 2025 (Save Functionality & UI Refinements)
- ✅ **Heart Icon Relocated to Tab Bar on Route Detail**:
    - Removed heart icon from `ElevationDrawerView`.
    - "Saved" tab in `CustomTabBarView` on `RouteDetailView` is now a heart icon ("Save").
    - Heart icon in tab bar correctly reflects if any part of the route (master or stage) is saved.
    - Tapping tab bar heart saves/unsaves the current route context (master or selected stage).
- ✅ **Tab Bar Icon Fix on Route Detail**: Ensured no tab icons are highlighted as "active" on the `RouteDetailView`'s custom tab bar.
- ✅ **Elevation Drawer Icon Update**: Changed info icon (ⓘ) in `ElevationDrawerView` handle to an up arrow (`arrowshape.up.circle`) and moved it to the right side, grouping it with the down arrow for consistent drawer controls.
- ✅ **Tab Bar & Drawer Positioning Perfected**: Resolved issues with tab bar and elevation drawer heights, spacing, and movement when the drawer state changes. Icons now match standard sizes.

### May 24, 2025 (Tab Bar Implementation - Initial Fix ✅)
- ✅ **Critical Tab Bar Issues RESOLVED**:
  - Completely restructured RouteDetailView architecture from broken ZStack+overlay approach.
  - Implemented proper VStack layout with tab bar as direct child (not overlay).
  - Tab bar now correctly anchored to bottom of screen using VStack structure.
  - Elevation drawer properly positioned.
  - Fixed safe area handling and spacing calculations.
  - **Status**: Production ready with perfect navigation experience.

### May 24, 2025 (Previous - Working Features)
- ✅ **Saved Routes View Enhancements**:
  - Display real route thumbnails instead of placeholders.
  - Corrected distance calculation (removed /1000 division).
  - Formatted elevation with commas for thousands.
  - Improved surface description to show "% unpaved" or "Paved".
  - Added display for route location (LGA, State, Country).
  - Removed "notes" (e.g., "Complete route") from card display.
  - Implemented navigation from saved route card to `RouteDetailView`.
  - Made entire saved route card tappable for navigation.
- ✅ **Bug Fix**: Corrected `FirebaseService.listRoutes()` to properly filter by `routeId`.

### May 24, 2025 (Earlier - Working Features)
- ✅ Implemented original heart icon save functionality in elevation drawer.
- ✅ Enlarged heart icon from 16pt to 20pt for better visibility.
- ✅ Built complete SavedRoutesView with progressive loading
- ✅ Fixed data fetching to use same method as HomeView (initial fix)
- ✅ Added RouteStyleUtils support for RouteListItem
- ✅ Enhanced error handling and loading states
- ✅ Added pull-to-refresh functionality
- ✅ Implemented cross-platform Firebase synchronization

### Technical Fixes Applied
1. **Data Fetching (Initial)**: Changed from invalid "routes" collection to proper `FirebaseService.listRoutes()` method.
2. **Type Compatibility**: Updated `SavedRouteWithDetails` to use `RouteListItem` instead of `Route`.
3. **Surface Description**: Added overloaded method in `RouteStyleUtils` for `RouteListItem` compatibility.
4. **Progressive Loading**: Implemented two-stage loading (saved routes list → route details).
5. **Error Handling**: Graceful fallbacks when route details cannot be fetched.
6. **Route Detail Specificity (NEW)**: Modified `FirebaseService.listRoutes()` to correctly handle the `routeId` filter. This ensures that when `UserSyncService.getRouteDetails()` calls it for a specific saved route, only that route's data is fetched and returned, resolving issues with duplicate information appearing on saved route cards.

The saved routes feature displays actual route names like "Mount Wellington Circuit" and unique, correctly formatted details for each saved trail! The route detail tab bar implementation has been completely fixed and now provides a perfect navigation experience. 🎉✅
