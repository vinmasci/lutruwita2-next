# Mobile App Offline Maps Implementation

This document outlines the implementation of the "Offline Maps" feature for the Lutruwita mobile app, which allows users to download maps for offline use.

## Overview

The Offline Maps feature enables users to:
- Download maps for offline use from the RoutePreviewDrawer or RouteElevationDrawer
- View all their downloaded maps in the OfflineMapsScreen
- Access maps when offline
- Manage downloaded maps (delete individual maps or clear all)
- Queue maps for download instead of downloading immediately

## Implementation Status

✅ **Successfully implemented with the following components:**
- OfflineMapsContext for state management
- Download/Delete button in RouteElevationDrawer
- OfflineMapsScreen for displaying downloaded maps
- OfflineMapScreen for viewing offline maps in full-screen mode
- Error handling and null checks for route properties
- Custom OfflineMapCard component that matches the SavedRouteCard layout
- Firebase integration for reliable cross-device synchronization
- Firebase Firestore for storing offline map metadata
- Local storage for actual map tiles
- Download queue system to prevent immediate downloads
- Navigation between offline maps list and full-screen map view

🔧 **Fixed issues:**
- Added null checks for route.mapState in OfflineMapCard component
- Added fallback values for center and zoom in FallbackMapPreview
- Fixed infinite loop in OfflineMapsScreen by:
  - Optimizing state updates
  - Adding a hasInitiallyLoaded flag to prevent repeated refreshes
  - Using useMemo in CleanStaticMap to prevent URL regeneration on every render
  - Memoizing components with React.memo to prevent unnecessary re-renders
- Implemented download queue to prevent immediate downloads
- Added UI indicators for queued downloads
- Fixed CleanStaticMap component to properly handle route data
- Added proper storage usage tracking
- Fixed map preview display in OfflineMapCard by adding support for staticMapUrl
- Fixed map tile downloads by using Mapbox tiles with the correct access token
- Improved tile bounds calculation for more accurate downloads
- Fixed storage size display by adding proper size calculation and metadata updates
- Fixed layout issues in the OfflineMapsScreen by adding proper padding

## Recent Improvements

We've made several significant improvements to the offline maps implementation:

1. **Enhanced Camera Positioning**:
   - Added intelligent camera positioning that first tries to fit to the route's actual coordinates
   - Added fallback mechanisms for when route coordinates aren't available
   - Increased animation duration for smoother transitions
   - Fixed issues with the map not zooming to the actual route

2. **Improved Offline Tile Source**:
   - Added detailed logging to diagnose tile loading issues
   - Added directory existence verification and content checking
   - Improved error handling and reporting
   - Enhanced file path handling for more reliable tile loading

3. **Enhanced Map Tile Storage**:
   - Expanded zoom level range from 9-15 (previously 10-14) for better detail
   - Added more padding around routes (2km instead of 1km)
   - Improved tile coordinate calculation for higher zoom levels
   - Added detailed logging throughout the download process
   - Fixed the tile URL generation to properly handle different zoom levels

4. **UI Improvements**:
   - Updated RouteActionButtons to show "Queued" status without progress indicator
   - Added progress bar and percentage in OfflineMapCard for active downloads
   - Added visual distinction between queued and downloading states
   - Improved button styling and layout for better usability
   - Added clear visual feedback in the OfflineMapsScreen

5. **Better Debugging**:
   - Added comprehensive logging throughout the offline map components
   - Improved error messages to help diagnose issues
   - Added directory content checking to verify tile downloads
   - Enhanced error handling with more specific error messages

## Implementation Details

### Download Queue System

We've implemented a download queue system to improve the user experience:

1. **Queue Instead of Immediate Download**: When a user clicks the "Offline Map" button, the route is added to a download queue instead of being downloaded immediately.

2. **Background Processing**: The queue is processed in the background, one download at a time, to prevent overwhelming the device's resources.

3. **Visual Feedback**: The UI shows different states for:
   - Not downloaded (blue button with "Offline Map" text)
   - Queued for download (purple button with "Queued" text)
   - Currently downloading (orange button with "Downloading" text)
   - Downloaded (dark blue button with "Downloaded" text)

4. **Queue Management**: The queue is managed by the OfflineMapsContext, which ensures that:
   - Routes aren't added to the queue multiple times
   - Downloads are processed in order
   - The queue is processed automatically when a download completes

### Storage Management

The implementation includes storage management features:

1. **Storage Usage Tracking**: The app tracks how much storage is being used by offline maps.

2. **Storage Information Display**: The OfflineMapsScreen shows the total storage used by offline maps.

3. **Individual Map Size**: Each OfflineMapCard shows the size of the downloaded map.

4. **Cleanup Options**: Users can delete individual maps or clear all downloaded maps.

### Firebase Integration

We've integrated with Firebase for cross-device synchronization:

1. **Metadata Storage**: Map download metadata (size, download date) is stored in Firebase Firestore.

2. **Local Storage**: The actual map tiles are stored locally on the device.

3. **Synchronization**: When a user logs in on a new device, they can see which maps they've downloaded on other devices.

## User Interface

### Offline Maps Screen

The OfflineMapsScreen provides a dedicated interface for managing offline maps:

1. **Storage Information**: Shows the total storage used by offline maps.

2. **Map List**: Displays all downloaded maps with their details.

3. **Empty State**: Shows a message when no maps are downloaded.

4. **Pull-to-Refresh**: Allows users to refresh the list of downloaded maps.

5. **Clear All Button**: Allows users to delete all downloaded maps at once.

### Route Action Buttons

The RouteActionButtons component in the RouteElevationDrawer provides controls for saving and downloading maps:

1. **Save Button**: Allows users to save/unsave routes.

2. **Offline Map Button**: Shows different states based on the download status:
   - "Offline Map" (not downloaded)
   - "Queued" (in download queue)
   - "Downloading" (currently downloading)
   - "Downloaded" (already downloaded)

## Technical Implementation

### OfflineMapsContext

The OfflineMapsContext provides state management for offline maps:

1. **State Management**: Tracks downloaded maps, download queue, and download progress.

2. **Firebase Integration**: Stores metadata in Firebase Firestore.

3. **Local Storage**: Manages local storage for map tiles.

4. **Download Queue**: Implements a queue system for downloading maps.

### MapTileStorage

The MapTileStorage service handles the actual storage of map tiles:

1. **Tile Download**: Downloads map tiles for offline use.

2. **Storage Management**: Manages the local storage of map tiles.

3. **Cleanup**: Handles deletion of map tiles when no longer needed.

### FirebaseOfflineMapsService

The FirebaseOfflineMapsService handles the Firebase integration:

1. **Metadata Storage**: Stores metadata about downloaded maps in Firebase Firestore.

2. **Cross-Device Sync**: Enables synchronization of download status across devices.

3. **User-Specific Storage**: Ensures each user only sees their own downloaded maps.

## Best Practices

The implementation follows these best practices:

1. **Efficient Storage**: Only downloads and stores the necessary map tiles.

2. **Background Processing**: Processes downloads in the background to avoid blocking the UI.

3. **Queue System**: Prevents overwhelming the device with multiple simultaneous downloads.

4. **Visual Feedback**: Provides clear visual feedback about download status.

5. **Error Handling**: Includes robust error handling for network issues and storage problems.

6. **Cross-Device Sync**: Enables seamless use across multiple devices.

## Completed Implementation

We have successfully implemented the following features:

1. **Download Infrastructure**:
   - Created OfflineMapsContext for state management
   - Implemented FirebaseOfflineMapsService for metadata storage
   - Implemented MapTileStorage for local tile storage
   - Added download queue system to prevent immediate downloads
   - Added proper storage usage tracking

2. **User Interface**:
   - Added Download/Delete button in RouteElevationDrawer
   - Created OfflineMapsScreen for displaying downloaded maps
   - Implemented OfflineMapCard component with View/Delete buttons
   - Created OfflineMapScreen for full-screen map viewing
   - Added storage usage indicator
   - Added visual feedback for download status
   - Added offline indicator in map view

3. **Map Viewing**:
   - Implemented offline tile source for loading local map tiles
   - Added support for 3D terrain visualization
   - Implemented map style switching
   - Added support for displaying route lines, POIs, and photos
   - Implemented error handling and retry mechanisms

4. **Navigation**:
   - Added navigation between OfflineMapsScreen and OfflineMapScreen
   - Implemented proper back navigation
   - Added View button for quick access to offline maps

5. **Bug Fixes**:
   - Fixed map tile downloads by using Mapbox tiles with the correct access token
   - Improved tile bounds calculation for more accurate downloads
   - Fixed storage size display by adding proper size calculation and metadata updates
   - Fixed layout issues in the OfflineMapsScreen by adding proper padding
   - Added null checks for route.mapState in OfflineMapCard component
   - Added fallback values for center and zoom in FallbackMapPreview

## Offline Map Viewing

The implementation now includes a dedicated OfflineMapScreen that allows users to view downloaded maps in full-screen mode:

1. **Offline Map Screen**: A dedicated screen for viewing offline maps with the following features:
   - Displays map tiles from local storage
   - Shows route lines with proper styling
   - Supports 3D terrain visualization
   - Displays POI markers and photos
   - Provides map style switching (Outdoors, Light, Dark)
   - Shows an offline indicator

2. **Navigation**: Users can navigate to the offline map view by:
   - Tapping on an offline map card in the OfflineMapsScreen
   - Using the "View" button on an offline map card

3. **User Interface**: The offline map view provides:
   - Map controls for style switching and 3D mode
   - Offline indicator to show the user is viewing offline content
   - Error handling with retry options
   - Loading indicators during map initialization

## Recent Improvements

We've made several significant improvements to the offline maps implementation:

1. **Enhanced Download Process**:
   - Split large downloads into multiple packs (approximately 7,000 tiles per pack)
   - Added detailed progress tracking for each pack
   - Improved error handling and verification of downloaded tiles
   - Added comprehensive logging throughout the download process

2. **Improved UI Feedback**:
   - Removed the full-screen loading spinner that made the app appear frozen
   - Added in-card progress indicators showing overall download progress
   - Added pack information showing which pack is currently downloading
   - Enhanced the pull-to-refresh functionality to show download status

3. **Better User Experience**:
   - The app remains responsive during downloads
   - Users can see exactly how much of the download has completed
   - For multi-pack downloads, users can see which pack is currently downloading
   - Clear visual distinction between queued and downloading states

### Implementation Plan for UI Improvements

To fix these issues, we need to make the following changes:

1. **Remove Full-Screen Loading Screen**:
   - Modify the `OfflineMapScreen.tsx` to remove the full-screen loading overlay when downloading maps
   - Ensure the app remains responsive during downloads

2. **Enhance OfflineMapCard Component**:
   - The `OfflineMapCard.tsx` component already has progress bar and percentage display code, but it's not being properly utilized
   - Ensure the progress bar is visible and accurately reflects download progress
   - Make sure the progress percentage is prominently displayed

3. **Update RouteActionButtons Component**:
   - Modify `RouteActionButtons.tsx` to show a small indicator when a download is in progress
   - Link this indicator to the same progress data used in the OfflineMapCard

4. **Improve OfflineMapsContext**:
   - Ensure the `currentDownload` state in `OfflineMapsContext.tsx` is properly updated during downloads
   - Make sure progress updates are frequent enough to provide smooth UI feedback

### Code Implementation Example

Here's an example of how to implement these changes:

#### 1. Modify OfflineMapsScreen.tsx

Remove the full-screen loading overlay and replace it with in-card progress indicators:

```tsx
// In OfflineMapsScreen.tsx
// REMOVE this code:
{isDownloading ? (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#0000ff" />
    <Text style={styles.loadingText}>Loading offline maps...</Text>
  </View>
) : (
  // ...
)}

// INSTEAD, let the OfflineMapCard handle its own loading state
<FlatList
  data={downloadedMaps}
  renderItem={({ item }) => <OfflineMapCard route={item} />}
  keyExtractor={item => item.persistentId}
  contentContainerStyle={styles.listContent}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  }
  ListEmptyComponent={
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        No offline maps yet. Download maps to view them offline.
      </Text>
    </View>
  }
/>
```

#### 2. Enhance OfflineMapCard.tsx

Make sure the progress bar is properly displayed:

```tsx
// In OfflineMapCard.tsx
// Ensure the progress container is properly styled and visible
const styles = StyleSheet.create({
  // ... existing styles
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
    height: 32, // Ensure it has a fixed height
  },
  progressIndicator: {
    marginRight: 8,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0066cc',
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0066cc',
    width: 40,
    textAlign: 'right',
  },
});

// Make sure the progress display is prominent
{isCurrentlyDownloading ? (
  <View style={styles.progressContainer}>
    <ActivityIndicator size="small" color="#0066cc" style={styles.progressIndicator} />
    <View style={styles.progressBarContainer}>
      <View 
        style={[
          styles.progressBar, 
          { width: `${Math.round((currentDownload?.progress || 0) * 100)}%` }
        ]} 
      />
    </View>
    <Text style={styles.progressText}>
      {Math.round((currentDownload?.progress || 0) * 100)}%
    </Text>
  </View>
) : isInQueue ? (
  <View style={styles.queuedContainer}>
    <Text style={styles.queuedText}>Queued for download</Text>
  </View>
) : (
  // ... existing code for View/Delete buttons
)}
```

#### 3. Update MapTileStorage.ts

Enhance the download function to provide more frequent progress updates:

```typescript
// In mapTileStorage.ts
const downloadMapTiles = async (
  route: RouteMap, 
  progressCallback: (progress: number) => void
): Promise<DownloadResult> => {
  try {
    console.log(`[MapTileStorage] Downloading map tiles for route ${route.persistentId}`);
    
    // Get directory for route
    const routeDir = await getRouteMapDirectory(route.persistentId);
    
    // Generate tile URLs
    const tileUrls = generateTileUrls(route);
    console.log(`[MapTileStorage] Generated ${tileUrls.length} tile URLs`);
    
    // Download each tile
    let totalSize = 0;
    let downloadedCount = 0;
    let lastProgressUpdate = Date.now();
    let startTime = Date.now();
    
    for (const url of tileUrls) {
      try {
        // ... existing tile download code ...
        
        // Update progress more frequently
        downloadedCount++;
        const currentProgress = downloadedCount / tileUrls.length;
        
        // Update progress at most every 100ms to avoid UI jank
        const now = Date.now();
        if (now - lastProgressUpdate > 100 || downloadedCount === tileUrls.length) {
          progressCallback(currentProgress);
          lastProgressUpdate = now;
          
          // Log progress every 100 tiles or at completion
          if (downloadedCount % 100 === 0 || downloadedCount === tileUrls.length) {
            const elapsedSeconds = (now - startTime) / 1000;
            const tilesPerSecond = downloadedCount / elapsedSeconds;
            const remainingTiles = tileUrls.length - downloadedCount;
            const estimatedRemainingSeconds = remainingTiles / tilesPerSecond;
            
            console.log(
              `[MapTileStorage] Progress: ${downloadedCount}/${tileUrls.length} tiles ` +
              `(${Math.round(currentProgress * 100)}%) - ` +
              `Speed: ${tilesPerSecond.toFixed(1)} tiles/sec - ` +
              `Est. remaining: ${Math.round(estimatedRemainingSeconds)}s`
            );
          }
        }
      } catch (error) {
        console.error(`Error downloading tile ${url}:`, error);
        // Continue with other tiles
      }
    }
    
    console.log(
      `[MapTileStorage] Download complete: ${downloadedCount}/${tileUrls.length} tiles, ` +
      `total size: ${totalSize} bytes, ` +
      `time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`
    );
    
    return { size: totalSize };
  } catch (error) {
    console.error('Error downloading map tiles:', error);
    throw error;
  }
};
```

#### 4. Verify Downloaded Tiles

Add a verification step after download:

```typescript
// Add to mapTileStorage.ts
const verifyDownloadedTiles = async (routeId: string): Promise<boolean> => {
  try {
    console.log(`[MapTileStorage] Verifying downloaded tiles for route ${routeId}`);
    
    // Get directory for route
    const baseDir = await getMapTilesDirectory();
    const routeDir = `${baseDir}${routeId}/`;
    
    // Check if directory exists
    const dirInfo = await FileSystem.getInfoAsync(routeDir);
    if (!dirInfo.exists) {
      console.error(`[MapTileStorage] Verification failed: Directory not found for route ${routeId}`);
      return false;
    }
    
    // List zoom levels
    const zoomLevels = await FileSystem.readDirectoryAsync(routeDir);
    if (zoomLevels.length === 0) {
      console.error(`[MapTileStorage] Verification failed: No zoom levels found for route ${routeId}`);
      return false;
    }
    
    // Sample a few tiles from each zoom level to verify they exist
    let verifiedTiles = 0;
    for (const zoomLevel of zoomLevels) {
      const zoomPath = `${routeDir}${zoomLevel}/`;
      const xCoords = await FileSystem.readDirectoryAsync(zoomPath);
      
      if (xCoords.length === 0) {
        console.warn(`[MapTileStorage] No x-coordinates found for zoom level ${zoomLevel}`);
        continue;
      }
      
      // Sample up to 5 x-coordinates
      const sampleXCoords = xCoords.slice(0, Math.min(5, xCoords.length));
      
      for (const xCoord of sampleXCoords) {
        const xPath = `${zoomPath}${xCoord}/`;
        const yCoords = await FileSystem.readDirectoryAsync(xPath);
        
        if (yCoords.length === 0) {
          console.warn(`[MapTileStorage] No y-coordinates found for x=${xCoord}, zoom=${zoomLevel}`);
          continue;
        }
        
        // Sample one y-coordinate
        const yCoord = yCoords[0];
        const tilePath = `${xPath}${yCoord}`;
        const tileInfo = await FileSystem.getInfoAsync(tilePath);
        
        if (tileInfo.exists && !tileInfo.isDirectory && tileInfo.size > 0) {
          verifiedTiles++;
        } else {
          console.warn(`[MapTileStorage] Tile verification failed for ${tilePath}`);
        }
      }
    }
    
    console.log(`[MapTileStorage] Verified ${verifiedTiles} sample tiles for route ${routeId}`);
    return verifiedTiles > 0;
  } catch (error) {
    console.error(`[MapTileStorage] Error verifying tiles for route ${routeId}:`, error);
    return false;
  }
};

// Then update the downloadMap function in OfflineMapsContext.tsx to include verification
const downloadMap = async (route: RouteMap): Promise<boolean> => {
  // ... existing download code ...
  
  try {
    // Download map tiles
    const { size } = await mapTileStorage.downloadMapTiles(route, updateProgress);
    
    // Verify downloaded tiles
    console.log(`[OfflineMapsContext] Verifying downloaded tiles for route ${route.persistentId}`);
    const verified = await mapTileStorage.verifyDownloadedTiles(route.persistentId);
    
    if (!verified) {
      console.error(`[OfflineMapsContext] Tile verification failed for route ${route.persistentId}`);
      setError(`Failed to verify downloaded tiles for ${route.name || 'Unnamed Route'}`);
      return false;
    }
    
    // ... rest of the function ...
  } catch (error) {
    // ... error handling ...
  }
};
```

### Logging Improvements Needed

The current logging system needs enhancement to provide better visibility into the download process:

1. **Download Progress Logging**:
   - Add more detailed logs for each stage of the download process
   - Log the number of tiles downloaded and remaining
   - Log download speeds and estimated completion time

2. **Error Handling and Reporting**:
   - Improve error logging during downloads
   - Provide more specific error messages when downloads fail
   - Add retry mechanisms with appropriate logging

### Implementation Plan for Logging Improvements

To enhance logging, we need to make these changes:

1. **Enhance MapTileStorage Service**:
   - Add more detailed logging in the `downloadMapTiles` function in `mapTileStorage.ts`
   - Log the start and completion of each tile download
   - Add periodic summary logs (e.g., every 100 tiles) showing progress statistics
   - Calculate and log download speed and estimated time remaining

2. **Improve OfflineMapsContext Logging**:
   - Add more detailed logs in the download process within `OfflineMapsContext.tsx`
   - Log queue processing events with clear status updates
   - Add timestamps to critical log entries to track performance

3. **Add Download Verification**:
   - After downloading, verify that tiles were actually saved correctly
   - Log the verification results
   - Implement a simple check to confirm a sample of downloaded tiles are accessible

### Additional Pending Implementation

To further enhance offline map viewing, we still need to implement:

1. **Network Detection**:
   - Add network status detection to automatically switch to offline mode
   - Implement graceful fallback to offline maps when network is unavailable

2. **Offline Navigation**:
   - Add turn-by-turn navigation capabilities using the downloaded map data
   - Implement location tracking in offline mode

3. **Testing and Optimization**:
   - Test offline functionality in various network conditions
   - Optimize storage usage and loading performance
   - Ensure smooth transitions between online and offline modes

## Future Improvements

After completing the core offline functionality and fixing the current issues, potential future improvements include:

1. **Download Prioritization**: Allow users to prioritize certain downloads in the queue.

2. **Auto-Download Options**: Provide options for automatically downloading maps based on user preferences.

3. **Storage Limits**: Implement storage limits and warnings when approaching device storage limits.

4. **Download Cancellation**: Add the ability to cancel ongoing downloads.

5. **Background Downloads**: Improve background download support to continue even when the app is minimized.

6. **Download Resumption**: Allow interrupted downloads to resume rather than restart.

4. **Offline Routing**: Enhance offline routing capabilities using the downloaded map data.

5. **Selective Downloads**: Allow users to download specific portions of a map to save storage.

6. **Sync Improvements**: Enhance synchronization between devices for offline maps.

7. **Background Downloads**: Allow downloads to continue in the background when the app is not active.

8. **Offline Search**: Implement search functionality that works without internet connection.

9. **Offline Photo Caching**: Improve photo caching to ensure all photos are available offline.

10. **Battery Optimization**: Optimize the offline map viewing to minimize battery usage.

## Current Implementation Status and Issues

The offline maps feature has been implemented with the core functionality in place, but we're currently experiencing issues with the actual download of map tiles. The app successfully:

1. Generates the correct tile URLs for Mapbox
2. Creates the necessary directory structure for storing tiles
3. Splits large downloads into manageable packs (approximately 7,000 tiles per pack)
4. Provides UI feedback for download status

However, we're encountering a critical issue where the app is not successfully downloading any tiles from Mapbox. The logs show that the app is generating the tile URLs correctly and splitting them into packs, but no actual downloads are occurring.

### Critical Implementation Issue Identified

We've identified a critical issue with our current implementation approach. We're currently using a manual tile URL generation and download method, which has several limitations:

1. **Manual URL Generation**: We're manually calculating tile coordinates and generating URLs for each tile, which is error-prone and inefficient.
2. **Individual Tile Downloads**: We're downloading each tile individually using Expo's FileSystem.downloadAsync, which is slow and resource-intensive.
3. **Custom Storage Management**: We're implementing our own storage management system, which adds complexity and potential bugs.
4. **Potential Token Issues**: Our manual approach may be hitting Mapbox API limitations or token permission issues.

#### Recommended Solution: Mapbox Native SDK Offline APIs

Mapbox provides built-in support for downloading and storing map tiles directly on the device through their Native SDK. This is a much more robust and efficient approach:

🔧 **Mapbox Native SDK Offline APIs Benefits:**
- Device-side offline map downloads managed by the official SDK
- Tile pack management (pause/resume/delete) built-in
- Secure access via a public token (pk) - no secret key (sk) required
- Works on iOS and Android via Mapbox's native SDK (GL Native or Maps SDK v11+)

🔐 **Security Advantages:**
- Uses the public Mapbox access token (pk)
- Mapbox's SDK handles the download process securely
- Ensures compliance with tile limits, style limits, and region size automatically

📦 **Implementation Approach:**
Instead of our manual tile URL generation and download, we'll define an offline region like:

```typescript
const offlineRegionOptions = {
  styleURL: 'mapbox://styles/mapbox/outdoors-v11',
  bounds: [[minLng, minLat], [maxLng, maxLat]],
  minZoom: 9,
  maxZoom: 15,
  pixelRatio: 2.0,
};

// Then initiate download using the Mapbox SDK
OfflineManager.createPack(offlineRegionOptions, progress => {
  console.log('Download progress:', progress);
});
```

This approach is available via:
- @rnmapbox/maps in React Native
- mapbox-gl-native or mapbox-maps-ios / mapbox-maps-android in native projects

We'll be implementing this solution to replace our current manual download approach, which should resolve our download issues and provide a more reliable offline maps experience.

### Recent Diagnostic Improvements

To diagnose the Mapbox connection issue, we've implemented the following:

1. **Single Tile Download Test**:
   - Added a `testSingleTileDownload` function in `mapTileStorage.ts` that attempts to download a single tile
   - This function provides detailed error logging to identify connection issues
   - The test downloads a tile at zoom level 10 to verify Mapbox connectivity

2. **Enhanced Error Logging**:
   - Improved error handling in the download process to capture more detailed error information
   - Added logging for HTTP status codes and response headers
   - Implemented better error reporting for network-related issues

3. **Diagnostic UI**:
   - Added a "Test Mapbox Connection" button to the Offline Maps screen
   - Implemented an alert dialog to show the test results
   - This allows users to quickly test if the Mapbox connection is working

4. **Verification System**:
   - Added a verification step after downloads to confirm tiles are actually saved
   - Implemented sample checking of downloaded tiles to ensure they contain valid data
   - Added detailed logging of the verification process

### Implementation Plan for Mapbox Native SDK Integration

To implement the Mapbox Native SDK for offline maps, we'll need to make the following changes:

1. **Add Mapbox SDK Dependencies**:
   - Install @rnmapbox/maps package for React Native
   - Configure the SDK with our Mapbox access token
   - Update iOS and Android configuration files as needed

2. **Replace Manual Tile Download with SDK Approach**:
   - Create a new service for managing offline regions using the Mapbox SDK
   - Implement methods for downloading, listing, and deleting offline regions
   - Update the OfflineMapsContext to use the new service

3. **Update UI Components**:
   - Modify the RouteActionButtons component to use the new offline region API
   - Update the OfflineMapCard component to display offline region status
   - Enhance the OfflineMapsScreen to list offline regions from the SDK

4. **Migrate Existing Data**:
   - Add migration logic to handle any existing downloaded maps
   - Update the Firebase integration to store metadata about offline regions

5. **Enhance Error Handling and Logging**:
   - Implement comprehensive error handling for the SDK operations
   - Add detailed logging throughout the offline region management process
   - Create diagnostic tools for troubleshooting offline region issues

### Next Steps

Based on our analysis, we'll take the following steps:

1. **Implement Mapbox SDK Integration**:
   - Install and configure the @rnmapbox/maps package
   - Create a new MapboxOfflineManager service to replace our manual mapTileStorage
   - Implement the core offline region management functionality

2. **Update UI Components**:
   - Modify all UI components to work with the new SDK-based approach
   - Ensure progress reporting and status updates work correctly
   - Maintain the same user experience with improved reliability

3. **Test and Validate**:
   - Test the new implementation on both iOS and Android
   - Verify offline maps work correctly in various network conditions
   - Ensure all existing functionality is preserved with the new approach

4. **Implement UI Improvements**:
   - Once the core functionality is working, implement the planned UI improvements
   - Replace the full-screen loading spinner with in-card progress indicators
   - Ensure the app remains responsive during downloads

## Recent Debugging Efforts (May 2025)

We've implemented several changes to try to fix the Mapbox offline download functionality, but we're still experiencing issues. Here's a summary of our recent debugging efforts:

### 1. Token Authentication Issues

We identified potential issues with the Mapbox token authentication:

- **Public Token (pk) vs Secret Token (sk)**: We tried using both the public token and the secret token for offline downloads.
- **Hardcoded Token**: We hardcoded the secret key (SK) token directly in the code to eliminate any environment variable loading issues.
- **Token Initialization**: We improved the token initialization process with better error handling.

### 2. Improved Error Handling and Logging

We enhanced error handling and logging throughout the download process:

- **Detailed Logging**: Added comprehensive logging at each step of the download process.
- **Error Capture**: Improved error capture and reporting for better diagnosis.
- **Console Output**: Enhanced console output to show more details about the download process.

### 3. Mapbox SDK Integration Improvements

We made several improvements to the Mapbox SDK integration:

- **SDK Initialization**: Enhanced the SDK initialization process with better error handling.
- **OfflineManager Configuration**: Improved the configuration of the OfflineManager.
- **Pack Creation**: Enhanced the createPack method with better error handling and logging.

### 4. Diagnostic Tools

We added diagnostic tools to help identify the issue:

- **Test Mapbox Connection**: Added a function to test the basic Mapbox connection.
- **Test Minimal Region**: Added a function to test downloading a minimal region (very small area, few tiles).
- **UI Integration**: Added buttons to the OfflineMapsScreen to trigger these tests.

### 5. Offline Pack Management

We improved the offline pack management:

- **Pack Deletion**: Enhanced the pack deletion process to ensure we always delete any existing pack with the same name before creating a new one.
- **Pack Verification**: Added verification steps to confirm that packs are created successfully.
- **Progress Tracking**: Improved progress tracking for better UI feedback.

### 6. Specific Fixes Based on Mapbox Documentation

We implemented specific fixes based on Mapbox documentation and community recommendations:

- **Duplicate Region Names**: Added code to delete any existing region with the same name before creating a new one, as Mapbox will silently stall if a region with the same name already exists.
- **OfflineManager.subscribe()**: Added subscription to offline pack events and errors to catch silent failures.
- **Reduced Pack Size**: Tried reducing the pack size to stay under Mapbox's limits.
- **Native Logs**: Added code to check native logs (Xcode/Android) for more detailed error information.

### Current Status

Despite all these efforts, the offline download functionality is still not working. The download process gets stuck at the "Creating offline region" step without any error messages. We've tried various approaches, but none have resolved the issue.

The next steps will be to:

1. **Investigate SDK Version Compatibility**: Check if there are compatibility issues with the current version of the Mapbox SDK.
2. **Try Alternative Approaches**: Explore alternative approaches to offline map downloads, such as using a different map provider or implementing a custom solution.
3. **Contact Mapbox Support**: Reach out to Mapbox support for assistance with the specific issues we're encountering.

## Conclusion

The offline maps feature is a critical component of the Lutruwita mobile app, allowing users to access maps without an internet connection. While we've made significant progress with our implementation, we're still facing challenges with the actual download of map tiles.

We've identified that using the official Mapbox Native SDK for offline maps should provide a reliable solution, but we're encountering issues with the SDK integration. We'll continue to investigate and implement fixes to resolve these issues and provide a better user experience.

The implementation plan outlined above will guide our continued efforts to deliver a reliable and user-friendly offline maps feature that meets the needs of our users. We'll update this document as we make progress and identify solutions to the current challenges.
