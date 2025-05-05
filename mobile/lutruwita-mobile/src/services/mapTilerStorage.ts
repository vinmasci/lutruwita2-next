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
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) {
        return 0;
      }
      
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
        }
      }
      
      console.log(`[MapTilerStorage] Total storage used: ${totalSize} bytes`);
      
      return totalSize;
    } catch (error) {
      console.error('Error getting storage usage information:', error);
      return 0;
    }
  };

  // Check if a region is downloaded
  const isRegionDownloaded = async (regionId: string): Promise<boolean> => {
    try {
      const baseDir = await getMapTilesDirectory();
      const regionDir = `${baseDir}${regionId}/`;
      
      const dirInfo = await FileSystem.getInfoAsync(regionDir);
      if (!dirInfo.exists) {
        return false;
      }
      
      // Check if there are any files in the region directory
      const zoomLevels = await FileSystem.readDirectoryAsync(regionDir);
      return zoomLevels.length > 0;
    } catch (error) {
      console.error(`Error checking if region ${regionId} is downloaded:`, error);
      return false;
    }
  };
  
  // Get all downloaded regions
  const getDownloadedRegions = async (): Promise<string[]> => {
    try {
      const baseDir = await getMapTilesDirectory();
      
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) {
        return [];
      }
      
      const regionDirs = await FileSystem.readDirectoryAsync(baseDir);
      
      // Filter out any non-directory entries
      const downloadedRegions: string[] = [];
      
      for (const regionDir of regionDirs) {
        const regionPath = `${baseDir}${regionDir}`;
        const regionInfo = await FileSystem.getInfoAsync(regionPath);
        
        if (regionInfo.exists && regionInfo.isDirectory) {
          // Check if there are any files in the region directory
          const zoomLevels = await FileSystem.readDirectoryAsync(regionPath);
          if (zoomLevels.length > 0) {
            downloadedRegions.push(regionDir);
          }
        }
      }
      
      return downloadedRegions;
    } catch (error) {
      console.error('Error getting downloaded regions:', error);
      return [];
    }
  };
  
  // Get storage size for a specific region
  const getRegionStorageSize = async (regionId: string): Promise<number> => {
    try {
      const baseDir = await getMapTilesDirectory();
      const regionDir = `${baseDir}${regionId}/`;
      
      const dirInfo = await FileSystem.getInfoAsync(regionDir);
      if (!dirInfo.exists) {
        return 0;
      }
      
      // Calculate total size
      let totalSize = 0;
      
      const zoomLevels = await FileSystem.readDirectoryAsync(regionDir);
      
      for (const zoomLevel of zoomLevels) {
        const zoomPath = `${regionDir}${zoomLevel}`;
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
      console.error(`Error getting storage size for region ${regionId}:`, error);
      return 0;
    }
  };

  return {
    downloadRegion,
    deleteRegion,
    getStorageInfo,
    isRegionDownloaded,
    getDownloadedRegions,
    getRegionStorageSize
  };
};
