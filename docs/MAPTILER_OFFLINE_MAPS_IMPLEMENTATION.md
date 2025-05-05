# MapTiler Offline Maps Implementation

This document summarizes the implementation of MapTiler-based offline maps in the Lutruwita mobile app, replacing the previous Mapbox implementation.

## Components Implemented

1. **MapTiler Region Configuration**
   - Created `mapTilerRegions.ts` with region definitions and API key
   - Defined geographic regions (Tasmania, Victoria, etc.) with bounds and tile sources

2. **MapTiler Region Service**
   - Implemented `mapTilerRegionService.ts` to manage regions
   - Added functions to get available regions and find the region for a route
   - Included size estimation for regions based on tile counts

3. **MapTiler Storage Service**
   - Created `mapTilerStorage.ts` to handle downloading and storing map tiles
   - Implemented efficient tile downloading with progress tracking
   - Added functions to manage downloaded regions (delete, check status, etc.)

4. **Firebase Integration**
   - Implemented `firebaseOfflineMapsService.ts` to store metadata about downloaded regions
   - Added functions to track downloaded regions in Firebase for user persistence

5. **MapTiler Offline Maps Context**
   - Created `MapTilerOfflineMapsContext.tsx` to provide app-wide access to offline maps functionality
   - Implemented hooks for downloading, deleting, and checking regions

6. **UI Components**
   - Created `RegionsScreen.tsx` to display and manage available regions
   - Updated `OfflineMapView.tsx` to display offline maps using MapLibre/Mapbox GL
   - Updated `RouteActionButtons.tsx` to show region information for routes

7. **Navigation**
   - Added Regions tab to the bottom navigation
   - Integrated with existing navigation structure

8. **Utilities**
   - Added formatting utilities in `formatUtils.ts` for displaying sizes, dates, etc.

## Key Features

1. **Region-Based Downloads**
   - Users download entire geographic regions instead of individual routes
   - More efficient as multiple routes in the same region use the same tiles
   - Clearer user experience with well-defined regions

2. **Efficient Storage**
   - Tiles are stored in a structured directory hierarchy
   - Avoids duplicate downloads of the same tiles
   - Tracks storage usage for user information

3. **Firebase Integration**
   - Persists download information across app restarts
   - Syncs offline map status with user account
   - Stores metadata like download date and size

4. **Progress Tracking**
   - Shows detailed download progress with pack tracking
   - Provides size estimates before download
   - Displays actual storage usage after download

5. **MapLibre Integration**
   - Uses the existing MapLibre/Mapbox GL library for rendering
   - Configures the map to use local tile files
   - Maintains consistent map styling and features

## Benefits Over Previous Implementation

1. **Reliability**: Avoids the issues with Mapbox's offline pack APIs
2. **Consistency**: Uses the same region definitions as the web app
3. **Simplicity**: Clearer user experience with region-based downloads
4. **Efficiency**: Better storage usage by avoiding duplicate tiles
5. **Control**: More direct control over the download and storage process

## Future Improvements

1. **Background Downloads**: Add support for continuing downloads in the background
2. **Automatic Updates**: Periodically check for and download updated tiles
3. **Partial Region Downloads**: Allow downloading sub-regions for more granular control
4. **Compression**: Implement tile compression to reduce storage requirements
5. **Prefetching**: Automatically download regions based on user location or planned routes

## Usage

Users can access the offline maps functionality through:

1. The "Regions" tab in the bottom navigation
2. The route detail screen, which shows if a route's region is available offline
3. The offline maps screen, which shows downloaded routes

When viewing a route, users will see which region it belongs to and can download that entire region for offline use.
