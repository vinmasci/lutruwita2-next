import * as FileSystem from 'expo-file-system';
import { RouteMap } from './routeService';
import { MAPTILER_API_KEY } from '../config/mapTilerRegions';

// Define types for tile coordinates
export interface TileCoordinate {
  z: number;
  x: number;
  y: number;
}

interface DownloadResult {
  size: number;
  tilesCount: number;
}

interface DownloadProgress {
  progress: number;
  downloadedCount: number;
  totalCount: number;
}

type ProgressCallback = (progress: DownloadProgress) => void;

export const useMapTileRouteStorage = () => {
  // Get the base directory for storing route-specific map tiles
  const getMapTilesDirectory = async (): Promise<string> => {
    const dir = `${FileSystem.documentDirectory}maptiler_routes/`;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  };

  // Get directory for a specific route's map tiles
  const getRouteDirectory = async (routeId: string): Promise<string> => {
    const baseDir = await getMapTilesDirectory();
    const routeDir = `${baseDir}${routeId}/`;
    const dirInfo = await FileSystem.getInfoAsync(routeDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(routeDir, { intermediates: true });
    }
    return routeDir;
  };

  // Helper functions for tile coordinate calculations
  const long2tile = (lon: number, zoom: number): number => {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  };
  
  const lat2tile = (lat: number, zoom: number): number => {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  };

  // Calculate tiles needed for a route
  const calculateTilesForRoute = (route: RouteMap, buffer: number = 0.05): TileCoordinate[] => {
    if (!route.boundingBox) {
      console.log('[MapTileRouteStorage] No bounding box found for route, cannot calculate tiles');
      return [];
    }
    
    // Extract bounding box and add buffer
    const [[minLon, minLat], [maxLon, maxLat]] = route.boundingBox;
    const expandedBbox = [
      minLon - buffer, 
      minLat - buffer, 
      maxLon + buffer, 
      maxLat + buffer
    ];
    
    console.log(`[MapTileRouteStorage] Calculating tiles for route ${route.persistentId}`);
    console.log(`[MapTileRouteStorage] Original bounding box: [${minLon}, ${minLat}], [${maxLon}, ${maxLat}]`);
    console.log(`[MapTileRouteStorage] Expanded bounding box: [${expandedBbox[0]}, ${expandedBbox[1]}], [${expandedBbox[2]}, ${expandedBbox[3]}]`);
    
    // Define zoom levels
    const minZoom = 9;
    const maxZoom = 15;
    
    // Calculate tiles for zoom levels
    const tiles: TileCoordinate[] = [];
    for (let z = minZoom; z <= maxZoom; z++) {
      // Convert geographic coordinates to tile coordinates
      const minX = long2tile(expandedBbox[0], z);
      const maxX = long2tile(expandedBbox[2], z);
      const minY = lat2tile(expandedBbox[3], z);
      const maxY = lat2tile(expandedBbox[1], z);
      
      console.log(`[MapTileRouteStorage] Zoom level ${z}: X(${minX}-${maxX}), Y(${minY}-${maxY})`);
      
      // Add all tiles in this zoom level
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          tiles.push({ z, x, y });
        }
      }
    }
    
    console.log(`[MapTileRouteStorage] Generated ${tiles.length} tile coordinates`);
    
    return tiles;
  };

  // Download tiles for a route
  const downloadTilesForRoute = async (
    route: RouteMap, 
    progressCallback: ProgressCallback
  ): Promise<DownloadResult> => {
    try {
      console.log(`[MapTileRouteStorage] Downloading map tiles for route ${route.persistentId}`);
      
      // Get directory for route
      const routeDir = await getRouteDirectory(route.persistentId);
      
      // Calculate tiles
      const tiles = calculateTilesForRoute(route);
      if (tiles.length === 0) {
        throw new Error('No tiles to download - route may be missing bounding box');
      }
      
      // Download tiles with progress tracking
      let totalSize = 0;
      let downloadedCount = 0;
      let startTime = Date.now();
      
      for (const tile of tiles) {
        try {
          const { z, x, y } = tile;
          
          // Create zoom and x directories if needed
          const zDir = `${routeDir}${z}/`;
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
          const tilePath = `${xDir}${y}.png`;
          const tileInfo = await FileSystem.getInfoAsync(tilePath);
          
          if (!tileInfo.exists) {
            // Use MapTiler URL format
            const url = `https://api.maptiler.com/tiles/v3/${z}/${x}/${y}.png?key=${MAPTILER_API_KEY}`;
            const downloadResult = await FileSystem.downloadAsync(url, tilePath);
            totalSize += downloadResult.headers['content-length'] ? parseInt(downloadResult.headers['content-length']) : 0;
          } else {
            // Tile already exists, add its size
            totalSize += tileInfo.size || 0;
          }
          
          // Update progress
          downloadedCount++;
          
          // Calculate progress values
          const progress = downloadedCount / tiles.length;
          
          // Update progress at most every 100ms to avoid UI jank
          progressCallback({
            progress,
            downloadedCount,
            totalCount: tiles.length
          });
          
          // Log progress every 100 tiles or at completion
          if (downloadedCount % 100 === 0 || downloadedCount === tiles.length) {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const tilesPerSecond = downloadedCount / elapsedSeconds;
            const remainingTiles = tiles.length - downloadedCount;
            const estimatedRemainingSeconds = remainingTiles / tilesPerSecond;
            
            console.log(
              `[MapTileRouteStorage] Progress: ` +
              `${downloadedCount}/${tiles.length} tiles ` +
              `(${Math.round(progress * 100)}%) - ` +
              `Speed: ${tilesPerSecond.toFixed(1)} tiles/sec - ` +
              `Est. remaining: ${Math.round(estimatedRemainingSeconds)}s`
            );
          }
        } catch (error) {
          console.error(`Error downloading tile:`, error);
          // Continue with other tiles
        }
      }
      
      console.log(
        `[MapTileRouteStorage] Download complete: ${downloadedCount}/${tiles.length} tiles, ` +
        `total size: ${totalSize} bytes, ` +
        `total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`
      );
      
      return { size: totalSize, tilesCount: downloadedCount };
    } catch (error) {
      console.error('Error downloading map tiles:', error);
      throw error;
    }
  };

  // Delete map tiles for a route
  const deleteRoute = async (routeId: string): Promise<void> => {
    try {
      console.log(`[MapTileRouteStorage] Deleting map tiles for route ${routeId}`);
      
      // Get directory for route
      const baseDir = await getMapTilesDirectory();
      const routeDir = `${baseDir}${routeId}/`;
      
      // Check if directory exists
      const dirInfo = await FileSystem.getInfoAsync(routeDir);
      
      if (dirInfo.exists) {
        // Delete directory
        await FileSystem.deleteAsync(routeDir, { idempotent: true });
        console.log(`[MapTileRouteStorage] Successfully deleted map tiles for route ${routeId}`);
      } else {
        console.log(`[MapTileRouteStorage] No map tiles found for route ${routeId}`);
      }
    } catch (error) {
      console.error(`Error deleting map tiles for route ${routeId}:`, error);
      throw error;
    }
  };

  // Get storage usage information
  const getStorageInfo = async (): Promise<number> => {
    try {
      console.log('[MapTileRouteStorage] Getting storage usage information');
      
      // Get base directory
      const baseDir = await getMapTilesDirectory();
      
      // List all route directories
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) {
        return 0;
      }
      
      const routeDirs = await FileSystem.readDirectoryAsync(baseDir);
      
      // Calculate total size
      let totalSize = 0;
      
      for (const routeDir of routeDirs) {
        const routePath = `${baseDir}${routeDir}`;
        const routeInfo = await FileSystem.getInfoAsync(routePath);
        
        if (routeInfo.exists && routeInfo.isDirectory) {
          const routeSize = await getRouteStorageSize(routeDir);
          totalSize += routeSize;
        }
      }
      
      console.log(`[MapTileRouteStorage] Total storage used: ${totalSize} bytes`);
      
      return totalSize;
    } catch (error) {
      console.error('Error getting storage usage information:', error);
      return 0;
    }
  };

  // Check if a route is downloaded
  const isRouteDownloaded = async (routeId: string): Promise<boolean> => {
    try {
      const baseDir = await getMapTilesDirectory();
      const routeDir = `${baseDir}${routeId}/`;
      
      const dirInfo = await FileSystem.getInfoAsync(routeDir);
      if (!dirInfo.exists) {
        return false;
      }
      
      // Check if there are any files in the route directory
      const zoomLevels = await FileSystem.readDirectoryAsync(routeDir);
      return zoomLevels.length > 0;
    } catch (error) {
      console.error(`Error checking if route ${routeId} is downloaded:`, error);
      return false;
    }
  };
  
  // Get all downloaded routes
  const getDownloadedRoutes = async (): Promise<string[]> => {
    try {
      const baseDir = await getMapTilesDirectory();
      
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) {
        return [];
      }
      
      const routeDirs = await FileSystem.readDirectoryAsync(baseDir);
      
      // Filter out any non-directory entries
      const downloadedRoutes: string[] = [];
      
      for (const routeDir of routeDirs) {
        const routePath = `${baseDir}${routeDir}`;
        const routeInfo = await FileSystem.getInfoAsync(routePath);
        
        if (routeInfo.exists && routeInfo.isDirectory) {
          // Check if there are any files in the route directory
          const zoomLevels = await FileSystem.readDirectoryAsync(routePath);
          if (zoomLevels.length > 0) {
            downloadedRoutes.push(routeDir);
          }
        }
      }
      
      return downloadedRoutes;
    } catch (error) {
      console.error('Error getting downloaded routes:', error);
      return [];
    }
  };
  
  // Get storage size for a specific route
  const getRouteStorageSize = async (routeId: string): Promise<number> => {
    try {
      const baseDir = await getMapTilesDirectory();
      const routeDir = `${baseDir}${routeId}/`;
      
      const dirInfo = await FileSystem.getInfoAsync(routeDir);
      if (!dirInfo.exists) {
        return 0;
      }
      
      // Calculate total size
      let totalSize = 0;
      
      const zoomLevels = await FileSystem.readDirectoryAsync(routeDir);
      
      for (const zoomLevel of zoomLevels) {
        const zoomPath = `${routeDir}${zoomLevel}`;
        const zoomInfo = await FileSystem.getInfoAsync(zoomPath);
        
        if (!zoomInfo.exists || !zoomInfo.isDirectory) {
          continue;
        }
        
        const xCoords = await FileSystem.readDirectoryAsync(zoomPath);
        
        for (const xCoord of xCoords) {
          const xPath = `${zoomPath}/${xCoord}`;
          const xInfo = await FileSystem.getInfoAsync(xPath);
          
          if (!xInfo.exists || !xInfo.isDirectory) {
            continue;
          }
          
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
      
      return totalSize;
    } catch (error) {
      console.error(`Error getting storage size for route ${routeId}:`, error);
      return 0;
    }
  };

  // Configure MapLibre to use local tiles for a route
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

  // Estimate the number of tiles and storage size for a route
  const estimateRouteStorage = (route: RouteMap): { tileCount: number; estimatedSize: number } => {
    const tiles = calculateTilesForRoute(route);
    // Estimate average tile size as 15KB
    const estimatedSize = tiles.length * 15 * 1024;
    
    return {
      tileCount: tiles.length,
      estimatedSize
    };
  };

  return {
    downloadTilesForRoute,
    deleteRoute,
    getStorageInfo,
    isRouteDownloaded,
    getDownloadedRoutes,
    getRouteStorageSize,
    configureOfflineMap,
    estimateRouteStorage
  };
};
