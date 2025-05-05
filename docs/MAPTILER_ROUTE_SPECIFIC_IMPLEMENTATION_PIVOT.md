# MapTiler Route-Specific Implementation Pivot

## Overview

This document outlines the pivot from the region-based MapTiler offline maps implementation to a route-specific approach. The new implementation focuses on downloading and storing map tiles only for specific routes, rather than entire geographic regions, resulting in more efficient storage usage and a better user experience.

## Motivation for the Pivot

The original region-based approach had several limitations:

1. **Excessive Storage Requirements**: Downloading entire regions required significant storage space, which could be problematic for users with limited device storage.
2. **Inefficient for Typical Use Cases**: Most users only need offline access to specific routes they plan to hike, not entire regions.
3. **Long Download Times**: Downloading large regions could take a long time and consume substantial bandwidth.
4. **Poor User Experience**: Users had to manually select regions, which might not align perfectly with their routes of interest.

## New Route-Specific Approach

The new implementation:

1. **Calculates Required Tiles**: Determines the necessary tiles based on a route's bounding box plus a buffer.
2. **Downloads and Stores Tiles**: Downloads only the tiles needed for specific routes and stores them efficiently.
3. **Configures MapLibre**: Sets up MapLibre to use these local tiles when offline.
4. **Tracks in Firebase**: Maintains metadata about downloaded routes in Firebase for user account synchronization.

## Implementation Components

### 1. mapTileRouteStorage.ts

This service handles the core functionality of calculating, downloading, and managing tiles for specific routes:

- `calculateTilesForRoute`: Determines which tiles are needed for a route based on its bounding box
- `downloadTilesForRoute`: Downloads and stores the required tiles
- `configureOfflineMap`: Creates a MapLibre style configuration that uses the downloaded tiles
- `deleteRoute`: Removes downloaded tiles for a specific route
- `estimateRouteStorage`: Estimates the storage requirements for a route before downloading

### 2. firebaseRouteOfflineMapsService.ts

This service manages the Firebase integration for tracking downloaded routes:

- `markRouteAsDownloaded`: Records that a route has been downloaded
- `removeDownloadedRoute`: Removes the record of a downloaded route
- `listOfflineRoutes`: Gets a list of all downloaded routes
- `getRouteMetadata`: Retrieves metadata about a downloaded route

### 3. RouteSpecificOfflineMapsContext.tsx

This context provider makes the offline maps functionality available throughout the app:

- Provides state management for downloaded routes
- Exposes methods for downloading, deleting, and checking routes
- Handles loading and refreshing of downloaded routes
- Manages error states and loading indicators

### 4. OfflineRoutesScreen.tsx

This UI component displays and manages downloaded routes:

- Shows a list of downloaded routes with metadata
- Provides options to delete individual routes or clear all downloads
- Displays storage usage information
- Handles authentication requirements

## Usage

### Downloading a Route

```typescript
import { useRouteSpecificOfflineMaps } from '../context/RouteSpecificOfflineMapsContext';

const { downloadRoute } = useRouteSpecificOfflineMaps();

// Download a route
const handleDownload = async (route) => {
  const success = await downloadRoute(route);
  if (success) {
    // Route downloaded successfully
  }
};
```

### Checking if a Route is Available Offline

```typescript
import { useRouteSpecificOfflineMaps } from '../context/RouteSpecificOfflineMapsContext';

const { isRouteAvailableOffline } = useRouteSpecificOfflineMaps();

// Check if a route is available offline
const isOffline = isRouteAvailableOffline(route);
```

### Using Offline Maps

```typescript
import { useRouteSpecificOfflineMaps } from '../context/RouteSpecificOfflineMapsContext';

const { configureOfflineMap, isRouteDownloaded } = useRouteSpecificOfflineMaps();

// In a map component
const renderMap = () => {
  if (isRouteDownloaded(routeId)) {
    // Use offline map style
    const offlineStyle = configureOfflineMap(routeId);
    return <MapView style={offlineStyle} />;
  } else {
    // Use online map style
    return <MapView style={onlineStyle} />;
  }
};
```

## Advantages Over Region-Based Approach

1. **Efficient Storage**: Only downloads tiles relevant to specific routes (typically 10-20MB per route vs. 100MB+ per region)
2. **Better User Experience**: Users can download exactly what they need
3. **Faster Downloads**: Smaller downloads complete more quickly
4. **More Intuitive**: Users think in terms of routes, not geographic regions
5. **Automatic Calculation**: No need for users to manually select regions

## Storage Estimation

For a typical route with a bounding box of 0.5° × 0.5° and a 0.05° buffer:
- Zoom 9-15: ~1,300 tiles total
- Average tile size: ~15KB
- Total storage: ~20MB per route

This is significantly more efficient than downloading entire regions, which could require gigabytes of storage.

## Future Improvements

1. **Smarter Tile Selection**: Further optimize which tiles are downloaded based on the actual route path, not just the bounding box
2. **Background Downloads**: Allow downloads to continue in the background
3. **Automatic Updates**: Periodically check for and download updated tiles
4. **Shared Routes**: Allow users to share downloaded routes with others
5. **Prefetching**: Suggest routes to download based on user preferences or upcoming trips

## Migration Plan

1. Keep both implementations available temporarily
2. Encourage users to switch to the route-specific approach
3. Eventually deprecate the region-based approach

## Implementation Details and Fixes

The following changes have been made to implement the route-specific MapTiler offline maps functionality:

### Core Files Created
- **mapTileRouteStorage.ts**: Service for calculating, downloading, and managing route-specific tiles
- **firebaseRouteOfflineMapsService.ts**: Service for tracking downloaded routes in Firebase
- **RouteSpecificOfflineMapsContext.tsx**: Context provider for the offline maps functionality
- **OfflineRoutesScreen.tsx**: UI for managing downloaded routes

### App Integration
- Updated **App.tsx** to include the RouteSpecificOfflineMapsProvider in the provider hierarchy
- Updated **RouteActionButtons.tsx** to add a "Download Route" button alongside the existing region-based button (marked as "legacy")
- Updated **OfflineMapView.tsx** to implement a tiered approach to map source selection:
  1. First checks if route-specific tiles are available
  2. Falls back to region-based tiles if needed
  3. Uses online maps as a last resort

### Bug Fixes
- Fixed navigation in OfflineRoutesScreen where clicking "Browse Routes" was losing the bottom tab navigation
- Fixed metadata display issues in the Downloads section by:
  - Adding `getRouteMetadata` and `getAllRouteMetadata` functions to the context
  - Updating OfflineRoutesScreen to properly load and display route metadata
- Ensured downloaded routes appear in the Downloads section immediately after downloading

### UI Improvements
- Added storage size estimation to show users how much space a route download will use
- Added progress tracking during downloads
- Improved the Downloads screen to show detailed information about each downloaded route

## Conclusion

The route-specific MapTiler implementation provides a more efficient and user-friendly approach to offline maps in the Lutruwita mobile app. By focusing on the specific needs of hikers and travelers, we can provide a better experience while minimizing storage requirements and download times.

The implementation now provides a complete solution for route-specific offline maps with proper integration into the app's navigation and UI. Users can easily download routes, view them offline, and manage their downloaded routes from the Downloads section.
