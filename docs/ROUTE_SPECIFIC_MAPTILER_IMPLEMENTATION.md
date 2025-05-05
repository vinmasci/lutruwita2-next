# Route-Specific MapTiler Implementation

## Overview

This document outlines an implementation approach for offline maps in the Lutruwita mobile app using MapTiler as the tile provider and MapLibre (via @rnmapbox/maps) as the rendering library. This approach is similar to the manual tile download method from the original Mapbox implementation but addresses its issues and leverages MapTiler's infrastructure.

## Approach

We'll implement a route-specific tile download system that:

1. Calculates the necessary tiles based on a route's bounding box plus padding
2. Downloads and stores these tiles locally
3. Configures MapLibre to use these local tiles when offline

This approach avoids the issues with the original Mapbox implementation while keeping the storage requirements reasonable by only downloading tiles relevant to specific routes.

## Implementation Details

### 1. Tile Calculation and Download

```typescript
// Calculate tiles needed for a route
const calculateTilesForRoute = (route: RouteMap, buffer: number = 0.05): TileCoordinate[] => {
  if (!route.boundingBox) return [];
  
  // Extract bounding box and add buffer
  const [[minLon, minLat], [maxLon, maxLat]] = route.boundingBox;
  const expandedBbox = [
    minLon - buffer, 
    minLat - buffer, 
    maxLon + buffer, 
    maxLat + buffer
  ];
  
  // Calculate tiles for zoom levels 9-15
  const tiles: TileCoordinate[] = [];
  for (let z = 9; z <= 15; z++) {
    // Convert geographic coordinates to tile coordinates
    const minX = long2tile(expandedBbox[0], z);
    const maxX = long2tile(expandedBbox[2], z);
    const minY = lat2tile(expandedBbox[3], z);
    const maxY = lat2tile(expandedBbox[1], z);
    
    // Add all tiles in this zoom level
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ z, x, y });
      }
    }
  }
  
  return tiles;
};

// Download tiles for a route
const downloadTilesForRoute = async (
  route: RouteMap, 
  progressCallback: (progress: number) => void
): Promise<void> => {
  // Calculate tiles
  const tiles = calculateTilesForRoute(route);
  
  // Create directory structure
  const baseDir = `${FileSystem.documentDirectory}maptiler_routes/${route.persistentId}/`;
  await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
  
  // Download tiles with progress tracking
  let downloadedCount = 0;
  for (const tile of tiles) {
    const { z, x, y } = tile;
    
    // Create zoom and x directories if needed
    const zDir = `${baseDir}${z}/`;
    const xDir = `${zDir}${x}/`;
    
    await FileSystem.makeDirectoryAsync(xDir, { intermediates: true });
    
    // Download tile
    const url = `https://api.maptiler.com/tiles/v3/${z}/${x}/${y}.png?key=${MAPTILER_API_KEY}`;
    const filePath = `${xDir}${y}.png`;
    
    // Check if file already exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      await FileSystem.downloadAsync(url, filePath);
    }
    
    // Update progress
    downloadedCount++;
    progressCallback(downloadedCount / tiles.length);
  }
};
```

### 2. Storage Structure

Tiles will be stored in a directory structure organized by:
- Route ID
- Zoom level
- X/Y coordinates

Example path: `maptiler_routes/{routeId}/{z}/{x}/{y}.png`

### 3. MapLibre Configuration

```typescript
// Configure MapLibre to use local tiles
const configureOfflineMap = (routeId: string) => {
  const style = {
    version: 8,
    sources: {
      'offline-tiles': {
        type: 'raster',
        tiles: [`file://${FileSystem.documentDirectory}maptiler_routes/${routeId}/{z}/{x}/{y}.png`],
        tileSize: 256,
        maxzoom: 15,
        minzoom: 9
      }
    },
    layers: [
      {
        id: 'offline-layer',
        type: 'raster',
        source: 'offline-tiles',
        minzoom: 9,
        maxzoom: 15
      }
    ]
  };
  
  return style;
};
```

### 4. Firebase Integration

We'll store metadata about downloaded routes in Firebase:

```typescript
// Mark a route as downloaded
const markRouteAsDownloaded = async (routeId: string, metadata: {
  downloadedAt: Date;
  tileCount: number;
  size: number;
}): Promise<void> => {
  await firestore()
    .collection('users')
    .doc(userId)
    .collection('offlineRoutes')
    .doc(routeId)
    .set(metadata);
};
```

## Advantages Over Original Implementation

1. **More Efficient Storage**: Only downloads tiles relevant to specific routes
2. **Better Control**: Direct control over the download process
3. **No Secret Keys**: Uses MapTiler's simpler API key system
4. **Reliable**: Avoids the stalling issues with Mapbox's offline pack APIs
5. **Transparent Progress**: Clear progress tracking and error handling

## Storage Estimation

For a typical route with a bounding box of 0.5° × 0.5° and a 0.05° buffer:
- Zoom 9-15: ~1,300 tiles total
- Average tile size: ~15KB
- Total storage: ~20MB per route

This is significantly more efficient than downloading entire regions, which could require gigabytes of storage.

## UI Integration

1. **Route Detail Screen**: Add download button with progress indicator
2. **Saved Routes Screen**: Show offline availability status
3. **Settings**: Manage downloaded routes and storage usage

## Implementation Plan

1. Implement the tile calculation and download functions
2. Create the Firebase integration for tracking downloaded routes
3. Update the UI to show download options and status
4. Configure MapLibre to use local tiles when available

This approach provides a balance between storage efficiency and user experience, ensuring that users can access their routes offline without excessive storage requirements.
