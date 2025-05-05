import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { RouteMap } from './routeService';
import './routeServiceExtensions';
import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';

// Define the bounds of the map tiles to download
interface TileBounds {
  minZoom: number;
  maxZoom: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

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

export const useMapTileStorage = () => {
  // Test function to download a single tile and verify Mapbox connection
  const testSingleTileDownload = async (): Promise<boolean> => {
    try {
      console.log('[MapTileStorage] Testing single tile download from Mapbox');
      
      // Create a test URL for a single tile at zoom level 10
      const testUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/10/930/640?access_token=${MAPBOX_ACCESS_TOKEN}`;
      console.log(`[MapTileStorage] Test URL: ${testUrl}`);
      
      // Create a temporary directory for the test
      const testDir = `${FileSystem.documentDirectory}mapbox_test/`;
      const dirInfo = await FileSystem.getInfoAsync(testDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(testDir, { intermediates: true });
      }
      
      // Attempt to download the tile
      const testFilePath = `${testDir}test_tile.png`;
      console.log(`[MapTileStorage] Downloading test tile to: ${testFilePath}`);
      
      try {
        const downloadResult = await FileSystem.downloadAsync(testUrl, testFilePath);
        console.log(`[MapTileStorage] Download result:`, JSON.stringify(downloadResult));
        
        // Check if the file exists and has content
        const fileInfo = await FileSystem.getInfoAsync(testFilePath);
        console.log(`[MapTileStorage] File info:`, JSON.stringify(fileInfo));
        
        if (fileInfo.exists && fileInfo.size > 0) {
          console.log(`[MapTileStorage] Test successful! Downloaded ${fileInfo.size} bytes`);
          return true;
        } else {
          console.error(`[MapTileStorage] Test failed: File exists but size is 0 or undefined`);
          return false;
        }
      } catch (error) {
        console.error(`[MapTileStorage] Download error:`, error);
        
        // Try to get more details about the error
        const downloadError = error as any;
        if (downloadError && downloadError.message) {
          console.error(`[MapTileStorage] Error message: ${downloadError.message}`);
        }
        if (downloadError && downloadError.status) {
          console.error(`[MapTileStorage] Error status: ${downloadError.status}`);
        }
        if (downloadError && downloadError.headers) {
          console.error(`[MapTileStorage] Error headers:`, JSON.stringify(downloadError.headers));
        }
        
        return false;
      }
    } catch (error) {
      console.error('[MapTileStorage] Test tile download failed:', error);
      return false;
    }
  };
  // Get the base directory for storing map tiles
  const getMapTilesDirectory = async (): Promise<string> => {
    const dir = `${FileSystem.documentDirectory}map_tiles/`;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  };

  // Get directory for a specific route's map tiles
  const getRouteMapDirectory = async (routeId: string): Promise<string> => {
    const baseDir = await getMapTilesDirectory();
    const routeDir = `${baseDir}${routeId}/`;
    const dirInfo = await FileSystem.getInfoAsync(routeDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(routeDir, { intermediates: true });
    }
    return routeDir;
  };

  // Calculate tile bounds for a route
  const calculateTileBounds = (route: RouteMap): TileBounds => {
    // Default bounds for Tasmania region
    const defaultBounds = {
      minZoom: 9,
      maxZoom: 15, // Increased max zoom for better detail
      minX: 1855,
      maxX: 1860,
      minY: 1265,
      maxY: 1270
    };
    
    console.log(`[MapTileStorage] Calculating tile bounds for route ${route.persistentId}`);
    
    // If route has routes with geojson, use those to calculate bounds
    if (route.routes && route.routes.length > 0) {
      // Find the first route with valid geojson
      const routeWithGeojson = route.routes.find(r => r.geojson);
      
      if (routeWithGeojson && routeWithGeojson.geojson) {
        console.log(`[MapTileStorage] Found route with geojson, calculating bounds from coordinates`);
        
        // Get the coordinates from the route's geojson
        const coordinates = routeWithGeojson.geojson.features[0].geometry.coordinates;
        
        if (coordinates && coordinates.length > 0) {
          // Find the bounds of the route
          let minLng = coordinates[0][0];
          let maxLng = coordinates[0][0];
          let minLat = coordinates[0][1];
          let maxLat = coordinates[0][1];
          
          coordinates.forEach((coord: [number, number]) => {
            minLng = Math.min(minLng, coord[0]);
            maxLng = Math.max(maxLng, coord[0]);
            minLat = Math.min(minLat, coord[1]);
            maxLat = Math.max(maxLat, coord[1]);
          });
          
          // Add some padding to the bounds (about 2km)
          const padding = 0.02;
          minLng -= padding;
          maxLng += padding;
          minLat -= padding;
          maxLat += padding;
          
          console.log(`[MapTileStorage] Route bounds: SW(${minLng},${minLat}), NE(${maxLng},${maxLat})`);
          
          // Convert bounds to tile coordinates using the OSM tile calculation formula
          // See: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
          const long2tile = (lon: number, zoom: number) => {
            return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
          };
          
          const lat2tile = (lat: number, zoom: number) => {
            return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
          };
          
          const minZoom = 9; // Start from a lower zoom level
          const maxZoom = 15; // Go to a higher zoom level for better detail
          
          // Calculate tile bounds for the minimum zoom level
          const minX = long2tile(minLng, minZoom);
          const maxX = long2tile(maxLng, minZoom);
          const minY = lat2tile(maxLat, minZoom); // Note: y is inverted in tile coordinates
          const maxY = lat2tile(minLat, minZoom);
          
          console.log(`[MapTileStorage] Tile bounds at zoom ${minZoom}: X(${minX}-${maxX}), Y(${minY}-${maxY})`);
          
          return {
            minZoom,
            maxZoom,
            minX,
            maxX,
            minY,
            maxY
          };
        }
      }
    }
    
    // If route has mapState with bounds, use those
    if (route.mapState && route.mapState.bounds) {
      const { bounds } = route.mapState;
      console.log(`[MapTileStorage] Using mapState bounds: W(${bounds.west}), E(${bounds.east}), N(${bounds.north}), S(${bounds.south})`);
      
      // Convert bounds to tile coordinates using the OSM tile calculation formula
      // See: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
      const long2tile = (lon: number, zoom: number) => {
        return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
      };
      
      const lat2tile = (lat: number, zoom: number) => {
        return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
      };
      
      const minZoom = 9; // Start from a lower zoom level
      const maxZoom = 15; // Go to a higher zoom level for better detail
      
      // Add some padding to the bounds (about 2km)
      const padding = 0.02;
      const west = bounds.west - padding;
      const east = bounds.east + padding;
      const north = bounds.north + padding;
      const south = bounds.south - padding;
      
      const result = {
        minZoom,
        maxZoom,
        minX: long2tile(west, minZoom),
        maxX: long2tile(east, minZoom),
        minY: lat2tile(north, minZoom),
        maxY: lat2tile(south, minZoom)
      };
      
      console.log(`[MapTileStorage] Calculated tile bounds: ${JSON.stringify(result)}`);
      
      return result;
    }
    
    console.log(`[MapTileStorage] Using default bounds: ${JSON.stringify(defaultBounds)}`);
    return defaultBounds;
  };

  // Generate tile URLs for a route
  const generateTileUrls = (route: RouteMap): string[] => {
    const bounds = calculateTileBounds(route);
    const urls: string[] = [];
    
    // Base URL for map tiles - using Mapbox tiles with the access token
    const baseUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`;
    
    console.log(`[MapTileStorage] Generating tile URLs for route ${route.persistentId}`);
    console.log(`[MapTileStorage] Zoom levels: ${bounds.minZoom} to ${bounds.maxZoom}`);
    
    // For each zoom level, calculate the tile coordinates
    for (let z = bounds.minZoom; z <= bounds.maxZoom; z++) {
      // For higher zoom levels, we need to recalculate the tile coordinates
      // because the number of tiles increases exponentially with zoom level
      let minX = bounds.minX;
      let maxX = bounds.maxX;
      let minY = bounds.minY;
      let maxY = bounds.maxY;
      
      // If we're at a higher zoom level than the minimum, recalculate the tile coordinates
      if (z > bounds.minZoom) {
        // Each zoom level increases the number of tiles by a factor of 2 in each dimension
        const zoomFactor = Math.pow(2, z - bounds.minZoom);
        minX = bounds.minX * zoomFactor;
        maxX = (bounds.maxX + 1) * zoomFactor - 1; // +1 and -1 to ensure we include all tiles
        minY = bounds.minY * zoomFactor;
        maxY = (bounds.maxY + 1) * zoomFactor - 1;
      }
      
      console.log(`[MapTileStorage] Zoom level ${z}: X(${minX}-${maxX}), Y(${minY}-${maxY})`);
      
      // Generate URLs for all tiles within bounds at this zoom level
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const url = baseUrl
            .replace('{z}', z.toString())
            .replace('{x}', x.toString())
            .replace('{y}', y.toString());
          urls.push(url);
        }
      }
    }
    
    console.log(`[MapTileStorage] Generated ${urls.length} tile URLs`);
    
    return urls;
  };

  // Download map tiles for a route
  const downloadMapTiles = async (
    route: RouteMap, 
    progressCallback: (progress: DownloadPackProgress) => void
  ): Promise<DownloadResult> => {
    try {
      console.log(`[MapTileStorage] Downloading map tiles for route ${route.persistentId}`);
      
      // Get directory for route
      const routeDir = await getRouteMapDirectory(route.persistentId);
      
      // Generate tile URLs
      const allTileUrls = generateTileUrls(route);
      console.log(`[MapTileStorage] Generated ${allTileUrls.length} tile URLs`);
      
      // Split tiles into packs of ~7000 tiles each
      const MAX_TILES_PER_PACK = 7000;
      const tilePacks: string[][] = [];
      
      for (let i = 0; i < allTileUrls.length; i += MAX_TILES_PER_PACK) {
        tilePacks.push(allTileUrls.slice(i, i + MAX_TILES_PER_PACK));
      }
      
      console.log(`[MapTileStorage] Split tiles into ${tilePacks.length} packs`);
      tilePacks.forEach((pack, index) => {
        console.log(`[MapTileStorage] Pack ${index + 1}: ${pack.length} tiles`);
      });
      
      // Download each pack sequentially
      let totalSize = 0;
      let totalDownloadedCount = 0;
      let startTime = Date.now();
      
      for (let packIndex = 0; packIndex < tilePacks.length; packIndex++) {
        const pack = tilePacks[packIndex];
        console.log(`[MapTileStorage] Starting download of pack ${packIndex + 1}/${tilePacks.length} (${pack.length} tiles)`);
        
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
                  `[MapTileStorage] Pack ${packIndex + 1}/${tilePacks.length} Progress: ` +
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
          `[MapTileStorage] Pack ${packIndex + 1}/${tilePacks.length} complete: ` +
          `${packDownloadedCount}/${pack.length} tiles, ` +
          `time: ${((Date.now() - packStartTime) / 1000).toFixed(1)}s`
        );
      }
      
      console.log(
        `[MapTileStorage] All packs download complete: ${totalDownloadedCount}/${allTileUrls.length} tiles, ` +
        `total size: ${totalSize} bytes, ` +
        `total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`
      );
      
      return { size: totalSize, tilesCount: totalDownloadedCount };
    } catch (error) {
      console.error('Error downloading map tiles:', error);
      throw error;
    }
  };

  // Delete map tiles for a route
  const deleteMapTiles = async (routeId: string): Promise<void> => {
    try {
      console.log(`[MapTileStorage] Deleting map tiles for route ${routeId}`);
      
      // Get directory for route
      const baseDir = await getMapTilesDirectory();
      const routeDir = `${baseDir}${routeId}/`;
      
      // Check if directory exists
      const dirInfo = await FileSystem.getInfoAsync(routeDir);
      
      if (dirInfo.exists) {
        // Delete directory
        await FileSystem.deleteAsync(routeDir, { idempotent: true });
        console.log(`[MapTileStorage] Successfully deleted map tiles for route ${routeId}`);
      } else {
        console.log(`[MapTileStorage] No map tiles found for route ${routeId}`);
      }
    } catch (error) {
      console.error(`Error deleting map tiles for route ${routeId}:`, error);
      throw error;
    }
  };

  // Get storage usage information
  const getStorageInfo = async (): Promise<number> => {
    try {
      console.log('[MapTileStorage] Getting storage usage information');
      
      // Get base directory
      const baseDir = await getMapTilesDirectory();
      
      // List all route directories
      const routeDirs = await FileSystem.readDirectoryAsync(baseDir);
      
      // Calculate total size
      let totalSize = 0;
      
      for (const routeDir of routeDirs) {
        const routePath = `${baseDir}${routeDir}`;
        const routeInfo = await FileSystem.getInfoAsync(routePath);
        
        if (routeInfo.exists && routeInfo.isDirectory) {
          // For a real implementation, you would recursively calculate the size of all files
          // This is a simplified version that estimates the size based on the number of tiles
          const zoomLevels = await FileSystem.readDirectoryAsync(routePath);
          
          for (const zoomLevel of zoomLevels) {
            const zoomPath = `${routePath}/${zoomLevel}`;
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
      
      console.log(`[MapTileStorage] Total storage used: ${totalSize} bytes`);
      
      return totalSize;
    } catch (error) {
      console.error('Error getting storage usage information:', error);
      return 0;
    }
  };

  // Get storage size for a specific route
  const getRouteStorageSize = async (routeId: string): Promise<number> => {
    try {
      console.log(`[MapTileStorage] Getting storage size for route ${routeId}`);
      
      // Get directory for route
      const baseDir = await getMapTilesDirectory();
      const routeDir = `${baseDir}${routeId}/`;
      
      // Check if directory exists
      const dirInfo = await FileSystem.getInfoAsync(routeDir);
      
      if (!dirInfo.exists) {
        console.log(`[MapTileStorage] No map tiles found for route ${routeId}`);
        return 0;
      }
      
      // Calculate total size
      let totalSize = 0;
      
      // For a real implementation, you would recursively calculate the size of all files
      // This is a simplified version that calculates the size based on the number of tiles
      const zoomLevels = await FileSystem.readDirectoryAsync(routeDir);
      
      for (const zoomLevel of zoomLevels) {
        const zoomPath = `${routeDir}${zoomLevel}`;
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
      
      console.log(`[MapTileStorage] Total storage size for route ${routeId}: ${totalSize} bytes`);
      
      return totalSize;
    } catch (error) {
      console.error(`Error getting storage size for route ${routeId}:`, error);
      return 0;
    }
  };

  // Verify downloaded tiles for a route
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

  return {
    downloadMapTiles,
    deleteMapTiles,
    getStorageInfo,
    getRouteStorageSize,
    verifyDownloadedTiles,
    testSingleTileDownload
  };
};
