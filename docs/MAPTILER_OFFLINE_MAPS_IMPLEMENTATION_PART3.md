# MapTiler Offline Maps Implementation - Part 3: Configuration and Tile Storage

## Implementation Plan: MapTiler Configuration and Tile Storage

This section covers the implementation of the MapTiler Configuration and Tile Storage Service, which are responsible for defining region boundaries and managing the download and storage of map tiles.

### 1. MapTiler Configuration

Create a configuration file with region definitions:

```typescript
// mobile/lutruwita-mobile/src/config/mapTilerRegions.ts
export const MAPTILER_API_KEY = 'YOUR_MAPTILER_API_KEY';

// Define geographic bounds for each region [minLon, minLat, maxLon, maxLat]
export const regionBounds: Record<string, [number, number, number, number]> = {
  'tasmania': [144.5, -43.7, 148.5, -40.5],
  'victoria-north': [141.0, -37.0, 150.0, -34.0],
  'victoria-south': [141.0, -39.2, 150.0, -37.0],
  'nsw-part1': [141.0, -37.0, 149.0, -28.0], // Western NSW
  'nsw-part2': [149.0, -37.0, 154.0, -28.0], // Eastern NSW
  'queensland': [138.0, -29.0, 154.0, -10.0],
  'south-australia': [129.0, -38.0, 141.0, -26.0],
  'western-australia': [112.0, -35.0, 129.0, -14.0],
  'nt-act': [129.0, -26.0, 139.0, -10.5], // Northern Territory + ACT
  'new-zealand': [166.0, -47.5, 179.0, -34.0]
};

// Define tile sources for each region
export const tileSources: Record<string, string> = {
  'tasmania': '0196150f-725e-7ed9-946d-0c834ce8fc95',
  'victoria-north': '0196195a-de88-76e9-843f-9e8a373cc078',
  'victoria-south': '01961954-9312-726f-a37b-320cfa76aea0',
  'nsw-part1': '01961a2c-f4ea-7748-a9a9-e98d2dcab3dc',
  'nsw-part2': '019619db-0a35-79cb-b098-2ac8ef8d8213',
  'queensland': '019619cb-40fa-7392-ac45-0a2bee28806b',
  'south-australia': '019619a2-1890-7dc3-b3a5-cd6ede88f26a',
  'western-australia': '01961a53-6bf9-70b5-96f6-60c0be7cc9d0',
  'nt-act': '0196800b-307f-74ac-9634-e1004495bdf0',
  'new-zealand': '01968004-0de6-7e5e-8dc8-9e452336a543'
};
```

### 2. MapTiler Tile Storage Service

Adapt our existing `mapTileStorage.ts` to work with MapTiler:

```typescript
// mobile/lutruwita-mobile/src/services/mapTilerStorage.ts
import * as FileSystem from 'expo-file-system';
import { Region } from './mapTilerRegionService';
import { MAPTILER_API_KEY } from '../config/mapTilerRegions';

interface DownloadResult {
  size: number;
  tilesCount: number;
}

interface DownloadPackProgress {
  currentPack: number;
  totalPacks: number;
  packProgress: number;
  overallProgress: number;
}

type ProgressCallback = (progress: DownloadPackProgress) => void;

export const useMapTilerStorage = () => {
  // Get the base directory for storing map tiles
  const getMapTilesDirectory = async (): Promise<string> => {
    const dir = `${FileSystem.documentDirectory}maptiler_regions/`;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  };

  // Get directory for a specific region's map tiles
  const getRegionDirectory = async (regionId: string): Promise<string> => {
    const baseDir = await getMapTilesDirectory();
    const regionDir = `${baseDir}${regionId}/`;
    const dirInfo = await FileSystem.getInfoAsync(regionDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(regionDir, { intermediates: true });
    }
    return regionDir;
  };

  // Generate tile URLs for a region
  const generateTileUrlsForRegion = (region: Region): string[] => {
    const [minLon, minLat, maxLon, maxLat] = region.bounds;
    const urls: string[] = [];
    
    // Helper functions for tile coordinate calculations
    const long2tile = (lon: number, zoom: number): number => {
      return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    };
    
    const lat2tile = (lat: number, zoom: number): number => {
      return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    };
    
    // Define zoom levels
    const minZoom = 9;
    const maxZoom = 15;
    
    console.log(`[MapTilerStorage] Generating tile URLs for region ${region.id}`);
    console.log(`[MapTilerStorage] Zoom levels: ${minZoom} to ${maxZoom}`);
    
    // For each zoom level, calculate the tile coordinates
    for (let z = minZoom; z <= maxZoom; z++) {
      // Convert bounds to tile coordinates
      const minX = long2tile(minLon, z);
      const maxX = long2tile(maxLon, z);
      const minY = lat2tile(maxLat, z);
      const maxY = lat2tile(minLat, z);
      
      console.log(`[MapTilerStorage] Zoom level ${z}: X(${minX}-${maxX}), Y(${minY}-${maxY})`);
      
      // Generate URLs for all tiles within bounds at this zoom level
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          // Use MapTiler URL format
          const url = `https://api.maptiler.com/tiles/${region.tileSource}/${z}/${x}/${y}.png?key=${MAPTILER_API_KEY}`;
          urls.push(url);
        }
      }
    }
    
    console.log(`[MapTilerStorage] Generated ${urls.length} tile URLs`);
    
    return urls;
  };

  // Download map tiles for a region
  const downloadRegion = async (
    region: Region, 
    progressCallback: ProgressCallback
  ): Promise<DownloadResult> => {
    try {
      console.log(`[MapTilerStorage] Downloading map tiles for region ${region.id}`);
      
      // Get directory for region
      const regionDir = await getRegionDirectory(region.id);
      
      // Generate tile URLs
      const allTileUrls = generateTileUrlsForRegion(region);
      console.log(`[MapTilerStorage] Generated ${allTileUrls.length} tile URLs`);
      
      // Split tiles into packs of ~7000 tiles each
      const MAX_TILES_PER_PACK = 7000;
      const tilePacks: string[][] = [];
      
      for (let i = 0; i < allTileUrls.length; i += MAX_TILES_PER_PACK) {
        tilePacks.push(allTileUrls.slice(i, i + MAX_TILES_PER_PACK));
      }
      
      console.log(`[MapTilerStorage] Split tiles into ${tilePacks.length} packs`);
      tilePacks.forEach((pack, index) => {
        console.log(`[MapTilerStorage] Pack ${index + 1}: ${pack.length} tiles`);
      });
      
      // Download each pack sequentially
      let totalSize = 0;
      let totalDownloadedCount = 0;
      let startTime = Date.now();
      
      for (let packIndex = 0; packIndex < tilePacks.length; packIndex++) {
        const pack = tilePacks[packIndex];
        console.log(`[MapTilerStorage] Starting download of pack ${packIndex + 1}/${tilePacks.length} (${pack.length} tiles)`);
        
        let packDownloadedCount = 0;
        let lastProgressUpdate = Date.now();
        let packStartTime = Date.now();
        
        for (const url of pack) {
          try {
            // Extract tile path from URL
            const urlParts = url.split('/');
            const z = urlParts[urlParts.length - 3];
            const x = urlParts[urlParts.length - 2];
            const y = urlParts[urlParts.length - 1].split('?')[0];
            
            // Create directory for zoom level and x coordinate
            const zDir = `${regionDir}${z}/`;
            const xDir = `${zDir}${x}/`;
            
            // Create directories if they don't exist
            const zDirInfo = await FileSystem.getInfoAsync(zDir);
            if (!zDirInfo.exists) {
              await FileSystem.makeDirectoryAsync(zDir, { intermediates: true });
            }
            
            const xDirInfo = await FileSystem.getInfoAsync(xDir);
            if (!xDirInfo.exists) {
              await FileSystem.makeDirectoryAsync(xDir, { intermediates: true });
            }
            
            // Download tile
            const tilePath = `${xDir}${y}`;
            const tileInfo = await FileSystem.getInfoAsync(tilePath);
            
            if (!tileInfo.exists) {
              const downloadResult = await FileSystem.downloadAsync(url, tilePath);
              totalSize += downloadResult.headers['content-length'] ? parseInt(downloadResult.headers['content-length']) : 0;
            } else {
              // Tile already exists, add its size
              totalSize += tileInfo.size || 0;
            }
            
            // Update progress
            packDownloadedCount++;
            totalDownloadedCount++;
            
            // Calculate progress values
            const packProgress = packDownloadedCount / pack.length;
            const overallProgress = totalDownloadedCount / allTileUrls.length;
            
            // Update progress at most every 100ms to avoid UI jank
            const now = Date.now();
            if (now - lastProgressUpdate > 100 || packDownloadedCount === pack.length) {
              progressCallback({
                currentPack: packIndex + 1,
                totalPacks: tilePacks.length,
                packProgress,
                overallProgress
              });
              lastProgressUpdate = now;
              
              // Log progress every 100 tiles or at completion
              if (packDownloadedCount % 100 === 0 || packDownloadedCount === pack.length) {
                const elapsedSeconds = (now - packStartTime) / 1000;
                const tilesPerSecond = packDownloadedCount / elapsedSeconds;
                const remainingTiles = pack.length - packDownloadedCount;
                const estimatedRemainingSeconds = remainingTiles / tilesPerSecond;
                
                console.log(
                  `[MapTilerStorage] Pack ${packIndex + 1}/${tilePacks.length} Progress: ` +
                  `${packDownloadedCount}/${pack.length} tiles ` +
                  `(${Math.round(packProgress * 100)}%) - ` +
                  `Overall: ${totalDownloadedCount}/${allTileUrls.length} ` +
                  `(${Math.round(overallProgress * 100)}%) - ` +
                  `Speed: ${tilesPerSecond.toFixed(1)} tiles/sec - ` +
                  `Est. remaining for pack: ${Math.round(estimatedRemainingSeconds)}s`
                );
              }
            }
          } catch (error) {
            console.error(`Error downloading tile ${url}:`, error);
            // Continue with other tiles
          }
        }
        
        console.log(
          `[MapTilerStorage] Pack ${packIndex + 1}/${tilePacks.length} complete: ` +
          `${packDownloadedCount}/${pack.length} tiles, ` +
          `time: ${((Date.now() - packStartTime) / 1000).toFixed(1)}s`
        );
      }
      
      console.log(
        `[MapTilerStorage] All packs download complete: ${totalDownloadedCount}/${allTileUrls.length} tiles, ` +
        `total size: ${totalSize} bytes, ` +
        `total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`
      );
      
      return { size: totalSize, tilesCount: totalDownloadedCount };
    } catch (error) {
      console.error('Error downloading map tiles:', error);
      throw error;
    }
  };

  // Delete map tiles for a region
  const deleteRegion = async (regionId: string): Promise<void> => {
    try {
      console.log(`[MapTilerStorage] Deleting map tiles for region ${regionId}`);
      
      // Get directory for region
      const baseDir = await getMapTilesDirectory();
      const regionDir = `${baseDir}${regionId}/`;
      
      // Check if directory exists
      const dirInfo = await FileSystem.getInfoAsync(regionDir);
      
      if (dirInfo.exists) {
        // Delete directory
        await FileSystem.deleteAsync(regionDir, { idempotent: true });
        console.log(`[MapTilerStorage] Successfully deleted map tiles for region ${regionId}`);
      } else {
        console.log(`[MapTilerStorage] No map tiles found for region ${regionId}`);
      }
    } catch (error) {
      console.error(`Error deleting map tiles for region ${regionId}:`, error);
      throw error;
    }
  };

  // Get storage usage information
  const getStorageInfo = async (): Promise<number> => {
    try {
      console.log('[MapTilerStorage] Getting storage usage information');
      
      // Get base directory
      const baseDir = await getMapTilesDirectory();
      
      // List all region directories
      const regionDirs = await FileSystem.readDirectoryAsync(baseDir);
      
      // Calculate total size
      let totalSize = 0;
      
      for (const regionDir of regionDirs) {
        const regionPath = `${baseDir}${regionDir}`;
        const regionInfo = await FileSystem.getInfoAsync(regionPath);
        
        if (regionInfo.exists && regionInfo.isDirectory) {
          // For a real implementation, you would recursively calculate the size of all files
          // This is a simplified version that estimates the size based on the number of tiles
          const zoomLevels = await FileSystem.readDirectoryAsync(regionPath);
          
          for (const zoomLevel of zoomLevels) {
            const zoomPath = `${regionPath}/${zoomLevel}`;
            const xCoords = await FileSystem.readDirectoryAsync(zoomPath);
            
            for (const xCoord of xCoords) {
              const xPath = `${zoomPath}/${xCoord}`;
              const yCoords = await FileSystem.readDirectoryAsync(xPath);
              
              for (const yCoord of yCoords) {
                const tilePath = `${xPath}/${yCoord}`;
                const tileInfo = await FileSystem.getInfoAsync(tilePath);
                
                if (tileInfo.exists && !tileInfo.isDirectory) {
                  totalSize += tileInfo.size || 0;
                }
              }
            }
          }
        }
      }
      
      console.log(`[MapTilerStorage] Total storage used: ${totalSize} bytes`);
      
      return totalSize;
    } catch (error) {
      console.error('Error getting storage usage information:', error);
      return 0;
    }
  };

  // Additional utility methods for the Tile Storage Service
  // (These methods would be implemented in the full service)
  
  // Check if a region is downloaded
  const isRegionDownloaded = async (regionId: string): Promise<boolean> => {
    // Implementation details...
    return false; // Placeholder
  };
  
  // Get all downloaded regions
  const getDownloadedRegions = async (): Promise<string[]> => {
    // Implementation details...
    return []; // Placeholder
  };
  
  // Verify downloaded tiles for a region
  const verifyDownloadedRegion = async (regionId: string): Promise<boolean> => {
    // Implementation details...
    return false; // Placeholder
  };
  
  // Get storage size for a specific region
  const getRegionStorageSize = async (regionId: string): Promise<number> => {
    // Implementation details...
    return 0; // Placeholder
  };

  return {
    downloadRegion,
    deleteRegion,
    getStorageInfo,
    isRegionDownloaded,
    getDownloadedRegions,
    verifyDownloadedRegion,
    getRegionStorageSize
  };
};
```

### Key Features of the Tile Storage Service

1. **Region Configuration**: The configuration file defines the geographic bounds and tile sources for each region.

2. **Tile URL Generation**: The service generates URLs for all tiles within a region's bounds at different zoom levels.

3. **Batched Downloads**: Tiles are downloaded in batches to manage memory usage and provide better progress reporting.

4. **Directory Structure**: Tiles are stored in a hierarchical directory structure based on zoom level, x, and y coordinates.

5. **Progress Tracking**: The service provides detailed progress information during downloads.

6. **Storage Management**: The service includes methods for calculating storage usage and deleting downloaded regions.

See [Part 4](./MAPTILER_OFFLINE_MAPS_IMPLEMENTATION_PART4.md) for the UI Components, MapLibre Integration, and Benefits and Considerations.
