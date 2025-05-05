import { Platform } from 'react-native';
import { RouteMap } from './routeService';
import Mapbox from '@rnmapbox/maps';
import { MAP_STYLES } from '../config/mapbox';
import Constants from 'expo-constants';

// Get the Mapbox tokens from environment variables
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
// Get downloads token from Constants.expoConfig.extra instead of process.env
const MAPBOX_DOWNLOADS_TOKEN = Constants.expoConfig?.extra?.MAPBOX_DOWNLOADS_TOKEN || '';

// Validate the public token
if (!MAPBOX_ACCESS_TOKEN) {
  console.error('[MapboxOfflineManager] ERROR: No Mapbox access token found in environment variables');
} else if (MAPBOX_ACCESS_TOKEN.startsWith('sk.')) {
  console.error('[MapboxOfflineManager] ERROR: Public token is a Secret key (SK). You must use a public (PK) token for general map operations.');
} else if (!MAPBOX_ACCESS_TOKEN.startsWith('pk.')) {
  console.warn('[MapboxOfflineManager] WARNING: Public token does not start with "pk.". Make sure you are using a public token.');
} else {
  console.log(`[MapboxOfflineManager] Using public access token (first 4 chars: ${MAPBOX_ACCESS_TOKEN.substring(0, 4)}...)`);
}

// Validate the downloads token
if (!MAPBOX_DOWNLOADS_TOKEN) {
  console.warn('[MapboxOfflineManager] WARNING: No Mapbox downloads token found in environment variables');
  console.warn('[MapboxOfflineManager] Make sure MAPBOX_DOWNLOADS_TOKEN is in your .env file and exposed in app.config.js');
} else if (!MAPBOX_DOWNLOADS_TOKEN.startsWith('sk.')) {
  console.warn('[MapboxOfflineManager] WARNING: Downloads token does not start with "sk.". The downloads token should be a secret key.');
} else {
  console.log(`[MapboxOfflineManager] Found downloads token (first 4 chars: ${MAPBOX_DOWNLOADS_TOKEN.substring(0, 4)}...)`);
  console.log(`[MapboxOfflineManager] Downloads token length: ${MAPBOX_DOWNLOADS_TOKEN.length}`);
}

try {
  console.log('[MapboxOfflineManager] Initializing Mapbox with public token');
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
  console.log('[MapboxOfflineManager] Successfully set Mapbox access token');
  
  // Set the downloads token if available (this is a custom property, not part of the standard API)
  if (MAPBOX_DOWNLOADS_TOKEN) {
    try {
      // This is a non-standard approach to set the downloads token
      // It may not work directly, but we're trying to make it available to the native code
      (Mapbox as any).setDownloadsToken?.(MAPBOX_DOWNLOADS_TOKEN);
      console.log('[MapboxOfflineManager] Set downloads token (if supported)');
    } catch (downloadTokenError) {
      console.warn('[MapboxOfflineManager] Could not set downloads token:', downloadTokenError);
      // This is expected to fail since the method likely doesn't exist
    }
  }
  
  // Set up subscription to offline pack events to catch silent failures
  try {
    // Note: We'll subscribe to specific regions when we create them
    console.log('[MapboxOfflineManager] Will subscribe to specific regions when they are created');
  } catch (subscribeError) {
    console.error('[MapboxOfflineManager] Error setting up offline pack handling:', subscribeError);
  }
} catch (error) {
  console.error('[MapboxOfflineManager] Error setting Mapbox access token:', error);
}

// Note: We'll implement a test function for minimal offline regions in the hook

// Define types for progress tracking
type Position = [number, number];


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

export const useMapboxOfflineManager = () => {
  // Test function to verify Mapbox connection
  const testMapboxConnection = async (): Promise<boolean> => {
    try {
      console.log('[MapboxOfflineManager] Testing Mapbox connection');
      
      // Validate token again just to be sure
      if (!MAPBOX_ACCESS_TOKEN) {
        console.error('[MapboxOfflineManager] Connection test failed: No access token');
        return false;
      } else if (MAPBOX_ACCESS_TOKEN.startsWith('sk.')) {
        console.error('[MapboxOfflineManager] Connection test failed: Using secret key (SK) token');
        return false;
      }
      
      // Log the token we're using (public token)
      console.log(`[MapboxOfflineManager] Using public token for connection test (first 4 chars: ${MAPBOX_ACCESS_TOKEN.substring(0, 4)}...)`);
      
      // Try to get the list of offline packs to verify connection
      const packs = await Mapbox.offlineManager.getPacks();
      console.log(`[MapboxOfflineManager] Connection test successful, found ${packs.length} offline packs`);
      return true;
    } catch (error) {
      console.error('[MapboxOfflineManager] Connection test failed:', error);
      console.error('[MapboxOfflineManager] Error details:', JSON.stringify(error, null, 2));
      return false;
    }
  };

  // Calculate bounds for a route
  const calculateBounds = (route: RouteMap): [[number, number], [number, number]] => {
    // Default bounds for Tasmania region
    const defaultBounds: [[number, number], [number, number]] = [
      [145.0, -43.5], // Southwest corner
      [148.5, -40.5]  // Northeast corner
    ];
    
    console.log(`[MapboxOfflineManager] Calculating bounds for route ${route.persistentId}`);
    
    // If route has a boundingBox, use that
    if (route.boundingBox) {
      console.log(`[MapboxOfflineManager] Using route's boundingBox: ${JSON.stringify(route.boundingBox)}`);
      
      // Add some padding to the bounds (about 2km)
      const padding = 0.02;
      const paddedBounds: [[number, number], [number, number]] = [
        [route.boundingBox[0][0] - padding, route.boundingBox[0][1] - padding],
        [route.boundingBox[1][0] + padding, route.boundingBox[1][1] + padding]
      ];
      
      return paddedBounds;
    }
    
    // If route has mapState with bounds, use those
    if (route.mapState && route.mapState.bounds) {
      const { bounds } = route.mapState;
      console.log(`[MapboxOfflineManager] Using mapState bounds: W(${bounds.west}), E(${bounds.east}), N(${bounds.north}), S(${bounds.south})`);
      
      // Add some padding to the bounds (about 2km)
      const padding = 0.02;
      const paddedBounds: [[number, number], [number, number]] = [
        [bounds.west - padding, bounds.south - padding],
        [bounds.east + padding, bounds.north + padding]
      ];
      
      return paddedBounds;
    }
    
    // If route has routes with geojson, use those to calculate bounds
    if (route.routes && route.routes.length > 0) {
      // Find the first route with valid geojson
      const routeWithGeojson = route.routes.find(r => r.geojson);
      
      if (routeWithGeojson && routeWithGeojson.geojson) {
        console.log(`[MapboxOfflineManager] Found route with geojson, calculating bounds from coordinates`);
        
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
          
          console.log(`[MapboxOfflineManager] Route bounds: SW(${minLng},${minLat}), NE(${maxLng},${maxLat})`);
          
          return [
            [minLng, minLat],
            [maxLng, maxLat]
          ];
        }
      }
    }
    
    // If we couldn't calculate bounds from the route, use default bounds
    console.log(`[MapboxOfflineManager] Using default bounds: ${JSON.stringify(defaultBounds)}`);
    return defaultBounds;
  };

  // Create an offline region name from a route
  const createOfflineRegionName = (route: RouteMap): string => {
    return `route_${route.persistentId}`;
  };

  // Test function to download a minimal region
  const testMinimalRegion = async (): Promise<boolean> => {
    try {
      console.log('[MapboxOfflineManager] Testing minimal region download');
      
      // Define a very small region for testing
      const testRegion = {
        name: 'test_minimal_region',
        styleURL: MAP_STYLES.OUTDOORS,
        bounds: [[147.60, -41.50], [147.61, -41.49]] as any, // very small box
        minZoom: 11,
        maxZoom: 13,
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        }
      };
      
      // Reset the database first to ensure a clean state
      try {
        console.log('[MapboxOfflineManager] Resetting offline database to ensure clean state');
        await Mapbox.offlineManager.resetDatabase();
        
        // Add a small delay after reset to ensure the system has time to process
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (resetError) {
        console.log('[MapboxOfflineManager] Error resetting offline database:', resetError);
        // Continue anyway
      }
      
      // Create the test region
      console.log('[MapboxOfflineManager] Creating test region with options:', JSON.stringify(testRegion));
      
      // Log which token we're using
      if (MAPBOX_DOWNLOADS_TOKEN) {
        console.log(`[MapboxOfflineManager] Using SK token for test region (first 4 chars: ${MAPBOX_DOWNLOADS_TOKEN.substring(0, 4)}...)`);
        console.log(`[MapboxOfflineManager] Downloads token available: ${!!MAPBOX_DOWNLOADS_TOKEN}`);
        console.log(`[MapboxOfflineManager] Downloads token length: ${MAPBOX_DOWNLOADS_TOKEN.length}`);
        
        // Add the downloads token to the metadata in multiple ways to ensure it's accessible
        (testRegion.metadata as any).downloadsToken = MAPBOX_DOWNLOADS_TOKEN;
        (testRegion.metadata as any).accessToken = MAPBOX_DOWNLOADS_TOKEN; // Try alternative property name
        (testRegion as any).accessToken = MAPBOX_DOWNLOADS_TOKEN; // Try adding directly to region
        
        // Also try setting it directly on the Mapbox object
        try {
          (Mapbox as any).setDownloadsToken?.(MAPBOX_DOWNLOADS_TOKEN);
          console.log('[MapboxOfflineManager] Set downloads token directly on Mapbox object');
        } catch (error) {
          console.warn('[MapboxOfflineManager] Could not set downloads token directly:', error);
        }
      } else {
        console.log(`[MapboxOfflineManager] Using public token for test region (first 4 chars: ${MAPBOX_ACCESS_TOKEN.substring(0, 4)}...)`);
      }
      
      // Create a flag to track if we've already resolved/rejected the promise
      let isResolved = false;
      
      return new Promise<boolean>((resolve, reject) => {
        // Set a timeout to handle cases where the progress callback might not be called
        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            console.warn('[MapboxOfflineManager] Test region download timed out after 60 seconds');
            isResolved = true;
            resolve(false); // Resolve with false instead of rejecting to avoid crashes
          }
        }, 60000); // 60 second timeout
        
        try {
          // Create the pack directly without subscription
          // The subscription seems to be causing issues
          Mapbox.offlineManager.createPack(
            testRegion,
            (progress: any) => {
              // Log more detailed progress information
              console.log(`[MapboxOfflineManager] Test region progress:`, JSON.stringify(progress));
              
              // Check if download is complete
              if (progress && progress.percentage === 100) {
                console.log('[MapboxOfflineManager] Test region download complete');
                
                // Clear the timeout since we've completed successfully
                clearTimeout(timeoutId);
                
                if (!isResolved) {
                  isResolved = true;
                  
                  // Add a longer delay before resolving to ensure the region is fully registered
                  setTimeout(() => {
                    // Verify the region exists by getting the packs
                    Mapbox.offlineManager.getPacks().then(packs => {
                      const testPack = packs.find(p => p.name === testRegion.name);
                      if (testPack) {
                        console.log('[MapboxOfflineManager] Test region verified in pack list');
                        resolve(true);
                      } else {
                        console.error('[MapboxOfflineManager] Test region not found in pack list after download');
                        resolve(false);
                      }
                    }).catch(error => {
                      console.error('[MapboxOfflineManager] Error verifying test region:', error);
                      resolve(false);
                    });
                  }, 2000); // 2 second delay
                }
              }
            },
            (error: any) => {
              console.error('[MapboxOfflineManager] Test region download error:', JSON.stringify(error));
              
              // Clear the timeout since we've completed with an error
              clearTimeout(timeoutId);
              
              if (!isResolved) {
                isResolved = true;
                // Resolve with false instead of rejecting to avoid crashes
                resolve(false);
              }
            }
          );
        } catch (error) {
          console.error('[MapboxOfflineManager] Error creating test region:', error);
          
          // Clear the timeout since we've completed with an error
          clearTimeout(timeoutId);
          
          if (!isResolved) {
            isResolved = true;
            // Resolve with false instead of rejecting to avoid crashes
            resolve(false);
          }
        }
      });
    } catch (error) {
      console.error('[MapboxOfflineManager] Error testing minimal region:', error);
      return false;
    }
  };

  // Download map tiles for a route using Mapbox's offline API
  const downloadMapTiles = async (
    route: RouteMap, 
    progressCallback: ProgressCallback
  ): Promise<DownloadResult> => {
    try {
      console.log(`[MapboxOfflineManager] Downloading map tiles for route ${route.persistentId}`);
      
      // Calculate bounds for the route
      const bounds = calculateBounds(route);
      
      // Create a name for the offline region
      const regionName = createOfflineRegionName(route);
      
      // Reset the database first to ensure a clean state
      // This is more reliable than trying to delete individual packs
      try {
        console.log('[MapboxOfflineManager] Resetting offline database to ensure clean state');
        await Mapbox.offlineManager.resetDatabase();
        
        // Add a small delay after reset to ensure the system has time to process
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (resetError) {
        console.log('[MapboxOfflineManager] Error resetting offline database:', resetError);
        // Continue anyway
      }
      
      // Define the offline region options
      const offlineRegionOptions = {
        name: regionName,
        styleURL: MAP_STYLES.OUTDOORS, // Use the outdoors style
        bounds: bounds as any, // Cast to any to avoid type issues
        minZoom: 9,
        maxZoom: 15,
        metadata: {
          routeId: route.persistentId,
          timestamp: new Date().toISOString()
        }
      };
      
      console.log(`[MapboxOfflineManager] Creating offline region with options:`, JSON.stringify(offlineRegionOptions));
      
      // Start the download
      let totalSize = 0;
      let totalTiles = 0;
      let lastProgress = 0;
      
      // Log the token being used
      if (MAPBOX_DOWNLOADS_TOKEN) {
        console.log(`[MapboxOfflineManager] Using SK token for offline download (first 4 chars: ${MAPBOX_DOWNLOADS_TOKEN.substring(0, 4)}...)`);
        console.log(`[MapboxOfflineManager] Downloads token available: ${!!MAPBOX_DOWNLOADS_TOKEN}`);
        console.log(`[MapboxOfflineManager] Downloads token length: ${MAPBOX_DOWNLOADS_TOKEN.length}`);
        
        // Add the downloads token to the metadata in multiple ways to ensure it's accessible
        (offlineRegionOptions.metadata as any).downloadsToken = MAPBOX_DOWNLOADS_TOKEN;
        (offlineRegionOptions.metadata as any).accessToken = MAPBOX_DOWNLOADS_TOKEN; // Try alternative property name
        (offlineRegionOptions as any).accessToken = MAPBOX_DOWNLOADS_TOKEN; // Try adding directly to region options
        
        // Also try setting it directly on the Mapbox object again
        try {
          (Mapbox as any).setDownloadsToken?.(MAPBOX_DOWNLOADS_TOKEN);
          console.log('[MapboxOfflineManager] Set downloads token directly on Mapbox object');
        } catch (error) {
          console.warn('[MapboxOfflineManager] Could not set downloads token directly:', error);
        }
      } else {
        console.log(`[MapboxOfflineManager] Using public token for offline download (first 4 chars: ${MAPBOX_ACCESS_TOKEN.substring(0, 4)}...)`);
      }
      
      // Create a flag to track if we've already resolved/rejected the promise
      let isResolved = false;
      
      // Create a promise that will resolve when the download is complete
      const downloadPromise = new Promise<DownloadResult>((resolve, reject) => {
        // Set a timeout to handle cases where the progress callback might not be called
        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            console.warn(`[MapboxOfflineManager] Download for route ${route.persistentId} timed out after 5 minutes`);
            isResolved = true;
            reject(new Error('Download timed out after 5 minutes'));
          }
        }, 5 * 60 * 1000); // 5 minute timeout for actual route downloads
        
        try {
          // Create the pack directly without subscription
          // The subscription seems to be causing issues
          Mapbox.offlineManager.createPack(
            offlineRegionOptions,
            (progress: any) => {
              // This is the progress callback
              // Log more detailed progress information periodically
              const progressValue = progress.percentage / 100; // Convert to 0-1 range
              
              // Only update if progress has changed significantly (at least 1%)
              if (progressValue - lastProgress >= 0.01 || progressValue === 1) {
                lastProgress = progressValue;
                
                // Update the progress callback
                progressCallback({
                  currentPack: 1,
                  totalPacks: 1,
                  packProgress: progressValue,
                  overallProgress: progressValue
                });
                
                // Log progress
                console.log(
                  `[MapboxOfflineManager] Download progress: ${Math.round(progressValue * 100)}% - ` +
                  `Tiles: ${progress.completedTileCount || 0}/${progress.requiredResourceCount || 0} - ` +
                  `Size: ${Math.round((progress.completedResourceSize || 0) / 1024 / 1024 * 100) / 100} MB`
                );
                
                // Update the total size and tiles count
                totalSize = progress.completedResourceSize || 0;
                totalTiles = progress.completedTileCount || 0;
                
                // If download is complete, resolve the promise
                if (progressValue === 1) {
                  console.log(`[MapboxOfflineManager] Download complete: ${totalTiles} tiles, ${totalSize} bytes`);
                  
                  // Clear the timeout since we've completed successfully
                  clearTimeout(timeoutId);
                  
                  if (!isResolved) {
                    isResolved = true;
                    
                    // Add a longer delay before resolving to ensure the region is fully registered
                    setTimeout(() => {
                      // Verify the region exists by getting the packs
                      Mapbox.offlineManager.getPacks().then(packs => {
                        const routePack = packs.find(p => p.name === regionName);
                        if (routePack) {
                          console.log(`[MapboxOfflineManager] Route region ${regionName} verified in pack list`);
                          resolve({ size: totalSize, tilesCount: totalTiles });
                        } else {
                          console.error(`[MapboxOfflineManager] Route region ${regionName} not found in pack list after download`);
                          reject(new Error('Region not found after download'));
                        }
                      }).catch(error => {
                        console.error(`[MapboxOfflineManager] Error verifying route region ${regionName}:`, error);
                        reject(error);
                      });
                    }, 2000); // 2 second delay
                  }
                }
              }
            },
            (error: any) => {
              // This is the error callback
              console.error(`[MapboxOfflineManager] Download error:`, JSON.stringify(error));
              
              // Clear the timeout since we've completed with an error
              clearTimeout(timeoutId);
              
              if (!isResolved) {
                isResolved = true;
                reject(error);
              }
            }
          );
        } catch (error) {
          console.error(`[MapboxOfflineManager] Error creating offline pack:`, error);
          
          // Clear the timeout since we've completed with an error
          clearTimeout(timeoutId);
          
          if (!isResolved) {
            isResolved = true;
            reject(error);
          }
        }
      });
      
      // Wait for the download to complete
      const result = await downloadPromise;
      return result;
    } catch (error) {
      console.error('[MapboxOfflineManager] Error downloading map tiles:', error);
      throw error;
    }
  };

  // Delete map tiles for a route
  const deleteMapTiles = async (routeId: string): Promise<void> => {
    try {
      console.log(`[MapboxOfflineManager] Deleting map tiles for route ${routeId}`);
      
      // Create the region name
      const regionName = `route_${routeId}`;
      
      // Delete the offline pack
      await Mapbox.offlineManager.deletePack(regionName);
      
      console.log(`[MapboxOfflineManager] Successfully deleted map tiles for route ${routeId}`);
    } catch (error) {
      console.error(`[MapboxOfflineManager] Error deleting map tiles for route ${routeId}:`, error);
      throw error;
    }
  };

  // Get storage usage information
  const getStorageInfo = async (): Promise<number> => {
    try {
      console.log('[MapboxOfflineManager] Getting storage usage information');
      
      // Add a small delay before checking to ensure regions are fully registered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get all offline packs
      const packs = await Mapbox.offlineManager.getPacks();
      
      // Calculate total size by getting status of each pack
      let totalSize = 0;
      
      for (const pack of packs) {
        try {
          // Add a retry mechanism for getting the status
          let retryCount = 0;
          const maxRetries = 3;
          let success = false;
          
          while (retryCount < maxRetries && !success) {
            try {
              const status = await (pack as any).status();
              totalSize += status.completedResourceSize || 0;
              success = true;
            } catch (error) {
              console.error(`[MapboxOfflineManager] Error getting status for pack ${pack.name} (attempt ${retryCount + 1}/${maxRetries}):`, error);
              
              // If we've retried enough, continue to the next pack
              if (retryCount === maxRetries - 1) {
                break;
              }
              
              // Otherwise, wait and retry
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (error) {
          console.error(`[MapboxOfflineManager] Error processing pack ${pack.name}:`, error);
        }
      }
      
      console.log(`[MapboxOfflineManager] Total storage used: ${totalSize} bytes`);
      
      return totalSize;
    } catch (error) {
      console.error('[MapboxOfflineManager] Error getting storage usage information:', error);
      return 0;
    }
  };

  // Get storage size for a specific route
  const getRouteStorageSize = async (routeId: string): Promise<number> => {
    try {
      console.log(`[MapboxOfflineManager] Getting storage size for route ${routeId}`);
      
      // Create the region name
      const regionName = `route_${routeId}`;
      
      // Add a small delay before checking to ensure the region is fully registered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get all offline packs
      const packs = await Mapbox.offlineManager.getPacks();
      
      // Find the pack for this route
      const pack = packs.find(p => p.name === regionName);
      
      if (!pack) {
        console.log(`[MapboxOfflineManager] No offline pack found for route ${routeId}`);
        return 0;
      }
      
      // Add a retry mechanism for getting the status
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Get the pack status
          const packStatus = await (pack as any).status();
          
          // Get the size
          const size = packStatus.completedResourceSize || 0;
          
          console.log(`[MapboxOfflineManager] Storage size for route ${routeId}: ${size} bytes`);
          
          return size;
        } catch (error) {
          console.error(`[MapboxOfflineManager] Error getting status for pack ${regionName} (attempt ${retryCount + 1}/${maxRetries}):`, error);
          
          // If we've retried enough, return 0
          if (retryCount === maxRetries - 1) {
            return 0;
          }
          
          // Otherwise, wait and retry
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // If we get here, all retries failed
      return 0;
    } catch (error) {
      console.error(`[MapboxOfflineManager] Error getting storage size for route ${routeId}:`, error);
      return 0;
    }
  };

  // Verify downloaded tiles for a route
  const verifyDownloadedTiles = async (routeId: string): Promise<boolean> => {
    try {
      console.log(`[MapboxOfflineManager] Verifying downloaded tiles for route ${routeId}`);
      
      // Create the region name
      const regionName = `route_${routeId}`;
      
      // Add a small delay before checking to ensure the region is fully registered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get all offline packs
      const packs = await Mapbox.offlineManager.getPacks();
      
      // Find the pack for this route
      const pack = packs.find(p => p.name === regionName);
      
      if (!pack) {
        console.error(`[MapboxOfflineManager] Verification failed: No offline pack found for route ${routeId}`);
        return false;
      }
      
      // Add a retry mechanism for getting the status
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Get the pack status
          const packStatus = await (pack as any).status();
          
          // Log the full status for debugging
          console.log(`[MapboxOfflineManager] Pack status for ${regionName}:`, JSON.stringify(packStatus));
          
          // Check if the pack is complete
          const isComplete = packStatus.percentage === 100;
          
          if (!isComplete) {
            console.warn(`[MapboxOfflineManager] Pack for route ${routeId} is not complete (${packStatus.percentage}%)`);
            
            // If not complete but we've retried enough, return false
            if (retryCount === maxRetries - 1) {
              console.error(`[MapboxOfflineManager] Verification failed: Offline pack for route ${routeId} is not complete after ${maxRetries} attempts`);
              return false;
            }
            
            // Otherwise, wait and retry
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          // Check if the pack has tiles
          const hasTiles = (packStatus.completedTileCount || 0) > 0;
          
          if (!hasTiles) {
            console.error(`[MapboxOfflineManager] Verification failed: Offline pack for route ${routeId} has no tiles`);
            return false;
          }
          
          console.log(`[MapboxOfflineManager] Verification successful for route ${routeId}`);
          return true;
        } catch (error) {
          console.error(`[MapboxOfflineManager] Error getting status for pack ${regionName} (attempt ${retryCount + 1}/${maxRetries}):`, error);
          
          // If we've retried enough, return false
          if (retryCount === maxRetries - 1) {
            return false;
          }
          
          // Otherwise, wait and retry
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // If we get here, all retries failed
      return false;
    } catch (error) {
      console.error(`[MapboxOfflineManager] Error verifying tiles for route ${routeId}:`, error);
      return false;
    }
  };

  // List all offline regions
  const listOfflineRegions = async (): Promise<string[]> => {
    try {
      console.log('[MapboxOfflineManager] Listing offline regions');
      
      // Get all offline packs
      const packs = await Mapbox.offlineManager.getPacks();
      
      // Extract route IDs from pack names
      const routeIds = packs
        .map(pack => {
          const match = pack.name.match(/^route_(.+)$/);
          return match ? match[1] : null;
        })
        .filter(id => id !== null) as string[];
      
      console.log(`[MapboxOfflineManager] Found ${routeIds.length} offline regions`);
      
      return routeIds;
    } catch (error) {
      console.error('[MapboxOfflineManager] Error listing offline regions:', error);
      return [];
    }
  };

  // Reset all offline regions (for testing/debugging)
  const resetAllOfflineRegions = async (): Promise<void> => {
    try {
      console.log('[MapboxOfflineManager] Resetting all offline regions');
      
      // Reset all packs
      await Mapbox.offlineManager.resetDatabase();
      
      console.log('[MapboxOfflineManager] Successfully reset all offline regions');
    } catch (error) {
      console.error('[MapboxOfflineManager] Error resetting offline regions:', error);
      throw error;
    }
  };

  return {
    downloadMapTiles,
    deleteMapTiles,
    getStorageInfo,
    getRouteStorageSize,
    verifyDownloadedTiles,
    testMapboxConnection,
    testMinimalRegion,  // Add the test function to the returned object
    listOfflineRegions,
    resetAllOfflineRegions
  };
};
