import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { RouteMap } from '../services/routeService';
import { useFirebaseOfflineMapsService } from '../services/firebaseOfflineMapsService';
import { useMapboxOfflineManager } from '../services/mapboxOfflineManager';
import { useAuthenticatedRouteService } from '../services/authenticatedRouteService';
import Constants from 'expo-constants';

// Context type definition
interface DownloadProgress {
  routeId: string;
  progress: number;
  currentPack: number;
  totalPacks: number;
  packProgress: number;
}

interface OfflineMapsContextType {
  downloadedMaps: RouteMap[];
  isDownloading: boolean;
  currentDownload: DownloadProgress | null;
  storageUsed: number; // in bytes
  downloadMap: (route: RouteMap) => Promise<boolean>;
  queueDownload: (route: RouteMap) => void;
  deleteMap: (routeId: string) => Promise<boolean>;
  isMapDownloaded: (routeId: string) => boolean;
  refreshDownloadedMaps: () => Promise<void>;
  clearAllDownloads: () => Promise<void>;
  testMapboxConnection: () => Promise<boolean>;
  testMinimalRegion: () => Promise<boolean>; // Add test function for minimal region
  error: string | null;
  downloadQueue: RouteMap[];
}

// Create context
const OfflineMapsContext = createContext<OfflineMapsContextType | undefined>(undefined);

// Provider component
export const OfflineMapsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [downloadedMaps, setDownloadedMaps] = useState<RouteMap[]>([]);
  const [downloadedMapIds, setDownloadedMapIds] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [currentDownload, setCurrentDownload] = useState<DownloadProgress | null>(null);
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [downloadQueue, setDownloadQueue] = useState<RouteMap[]>([]);
  
  const { isAuthenticated } = useAuth();
  const firebaseOfflineMapsService = useFirebaseOfflineMapsService();
  const mapboxOfflineManager = useMapboxOfflineManager();
  const authenticatedRouteService = useAuthenticatedRouteService();

  // Initialize by loading downloaded maps from Firebase and local storage
  useEffect(() => {
    const initialize = async () => {
      if (isAuthenticated) {
        console.log('[OfflineMapsContext] User is authenticated, loading maps from Firebase');
        await loadDownloadedMapsFromFirebase();
        await updateStorageUsage();
      } else {
        console.log('[OfflineMapsContext] User is not authenticated, skipping Firebase operations');
        // Clear any existing data since we're not authenticated
        setDownloadedMaps([]);
        setDownloadedMapIds([]);
        // Set an error message to inform the user
        setError('You need to log in to use offline maps. Please sign in from the Profile tab.');
      }
      setIsInitialized(true);
    };
    initialize();
  }, [isAuthenticated]);
  
  // Process download queue when it changes
  useEffect(() => {
    const processQueue = async () => {
      if (downloadQueue.length > 0 && !isDownloading) {
        console.log(`[OfflineMapsContext] Processing download queue (${downloadQueue.length} items)`);
        const nextRoute = downloadQueue[0];
        
        // Remove the route from the queue
        setDownloadQueue(prev => prev.slice(1));
        
        // Download the route
        await downloadMap(nextRoute);
      }
    };
    
    processQueue();
  }, [downloadQueue, isDownloading]);
  
  // Test Mapbox connection by downloading a single tile
  const testMapboxConnection = async (): Promise<boolean> => {
    try {
      console.log('[OfflineMapsContext] Testing Mapbox connection');
      setIsDownloading(true);
      setError(null);
      
      // Check if we have a valid Mapbox access token
      const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!accessToken) {
        console.error('[OfflineMapsContext] No Mapbox access token found');
        setError('No Mapbox access token found. Please check your environment configuration.');
        setIsDownloading(false);
        return false;
      }
      
      console.log('[OfflineMapsContext] Mapbox access token is available');
      
      const result = await mapboxOfflineManager.testMapboxConnection();
      
      if (result) {
        console.log('[OfflineMapsContext] Mapbox connection test successful');
      } else {
        console.error('[OfflineMapsContext] Mapbox connection test failed');
        setError('Failed to connect to Mapbox. Please check your internet connection and Mapbox access token.');
      }
      
      setIsDownloading(false);
      return result;
    } catch (error: any) {
      console.error('[OfflineMapsContext] Error testing Mapbox connection:', error);
      setError(`Failed to test Mapbox connection: ${error.message || 'Unknown error'}`);
      setIsDownloading(false);
      return false;
    }
  };
  
  // Test downloading a minimal region to diagnose issues
  const testMinimalRegion = async (): Promise<boolean> => {
    try {
      console.log('[OfflineMapsContext] Testing minimal region download');
      setIsDownloading(true);
      setError(null);
      
      // Check if we have a valid Mapbox downloads token - use Constants instead of process.env
      const downloadsToken = Constants.expoConfig?.extra?.MAPBOX_DOWNLOADS_TOKEN;
      if (!downloadsToken) {
        console.error('[OfflineMapsContext] No Mapbox downloads token found');
        setError('No Mapbox downloads token found. Please check your environment configuration and app.config.js.');
        setIsDownloading(false);
        return false;
      }
      
      console.log('[OfflineMapsContext] Mapbox downloads token is available');
      
      const result = await mapboxOfflineManager.testMinimalRegion();
      
      if (result) {
        console.log('[OfflineMapsContext] Minimal region download test successful');
      } else {
        console.error('[OfflineMapsContext] Minimal region download test failed');
        setError('Failed to download minimal region. This indicates a problem with the Mapbox offline functionality.');
      }
      
      setIsDownloading(false);
      return result;
    } catch (error: any) {
      console.error('[OfflineMapsContext] Error testing minimal region download:', error);
      setError(`Failed to test minimal region download: ${error.message || 'Unknown error'}`);
      setIsDownloading(false);
      return false;
    }
  };

  // Queue a route for download instead of downloading immediately
  const queueDownload = (route: RouteMap) => {
    // Check if already downloaded or in queue
    if (downloadedMapIds.includes(route.persistentId) || 
        downloadQueue.some(r => r.persistentId === route.persistentId)) {
      console.log(`[OfflineMapsContext] Route ${route.persistentId} already downloaded or in queue, skipping`);
      return;
    }
    
    console.log(`[OfflineMapsContext] Queuing route ${route.persistentId} for download`);
    setDownloadQueue(prev => [...prev, route]);
  };

  // Update storage usage and individual map sizes
  const updateStorageUsage = async () => {
    try {
      // Get total storage usage
      const usage = await mapboxOfflineManager.getStorageInfo();
      setStorageUsed(usage);
      
      // Update individual map sizes
      if (downloadedMaps.length > 0) {
        const updatedMaps = [...downloadedMaps];
        let totalSizeChanged = false;
        
        for (let i = 0; i < updatedMaps.length; i++) {
          const route = updatedMaps[i];
          try {
            // Get the actual size from storage
            const routeSize = await mapboxOfflineManager.getRouteStorageSize(route.persistentId);
            
            // If the size is different from what's stored in the route object, update it
            if (routeSize > 0 && routeSize !== route.downloadSize) {
              console.log(`[OfflineMapsContext] Updating size for route ${route.persistentId} from ${route.downloadSize} to ${routeSize}`);
              
              // Update the route object
              updatedMaps[i] = {
                ...route,
                downloadSize: routeSize
              };
              
              // Update the metadata in Firebase
              await firebaseOfflineMapsService.updateMapMetadata(route.persistentId, {
                downloadedAt: route.downloadedAt || new Date(),
                size: routeSize
              });
              
              totalSizeChanged = true;
            }
          } catch (error) {
            console.error(`Error updating size for route ${route.persistentId}:`, error);
          }
        }
        
        // If any sizes changed, update the state
        if (totalSizeChanged) {
          setDownloadedMaps(updatedMaps);
        }
      }
    } catch (error) {
      console.error('Error getting storage usage:', error);
    }
  };

  // Load downloaded maps from Firebase
  const loadDownloadedMapsFromFirebase = async () => {
    if (!isAuthenticated) {
      console.log('[OfflineMapsContext] Not authenticated, cannot load maps from Firebase');
      setDownloadedMaps([]);
      setDownloadedMapIds([]);
      return;
    }
    
    setIsDownloading(true);
    setError(null);
    
    try {
      console.log('[OfflineMapsContext] Loading map IDs from Firebase');
      const mapIds = await firebaseOfflineMapsService.listOfflineMaps();
      
      console.log(`[OfflineMapsContext] Found ${mapIds.length} downloaded map IDs in Firebase`);
      setDownloadedMapIds(mapIds);
      
      if (mapIds.length === 0) {
        setDownloadedMaps([]);
        setIsDownloading(false);
        return;
      }
      
      // Load route details for each downloaded map ID
      console.log('[OfflineMapsContext] Loading route details');
      const routeDetails: RouteMap[] = [];
      
      for (const mapId of mapIds) {
        try {
          const route = await authenticatedRouteService.loadUserRoute(mapId);
          if (route) {
            // Add download metadata to route object
            const metadata = await firebaseOfflineMapsService.getMapMetadata(mapId);
            if (metadata) {
              route.downloadSize = metadata.size || 0;
              route.downloadedAt = metadata.downloadedAt || new Date();
            }
            routeDetails.push(route);
          }
        } catch (error) {
          console.error(`Error loading route ${mapId}:`, error);
        }
      }
      
      console.log(`[OfflineMapsContext] Loaded ${routeDetails.length} route details`);
      setDownloadedMaps(routeDetails);
    } catch (error) {
      console.error('Error loading maps from Firebase:', error);
      setError('Failed to load downloaded maps from Firebase');
      
      // Reset state on error
      setDownloadedMaps([]);
      setDownloadedMapIds([]);
    } finally {
      setIsDownloading(false);
    }
  };

  // Refresh downloaded maps
  const refreshDownloadedMaps = async () => {
    if (!isAuthenticated) {
      console.log('[OfflineMapsContext] Not authenticated, cannot refresh maps');
      setError('You need to log in to use offline maps. Please sign in from the Profile tab.');
      return;
    }

    setIsDownloading(true);
    setError(null);
    
    try {
      console.log('[OfflineMapsContext] Refreshing downloaded maps from Firebase');
      await loadDownloadedMapsFromFirebase();
      await updateStorageUsage();
      console.log('[OfflineMapsContext] Refresh complete');
      
      // Test Mapbox connection to ensure it's working
      console.log('[OfflineMapsContext] Testing Mapbox connection');
      const connectionResult = await mapboxOfflineManager.testMapboxConnection();
      if (connectionResult) {
        console.log('[OfflineMapsContext] Mapbox connection test successful');
      } else {
        console.warn('[OfflineMapsContext] Mapbox connection test failed');
      }
    } catch (error) {
      console.error('Error refreshing downloaded maps:', error);
      setError('Failed to refresh downloaded maps');
    } finally {
      setIsDownloading(false);
    }
  };

  // Check if a map is downloaded
  const isMapDownloaded = useCallback((routeId: string): boolean => {
    return downloadedMapIds.includes(routeId);
  }, [downloadedMapIds]);

  // Download a map
  const downloadMap = async (route: RouteMap): Promise<boolean> => {
    try {
      // Check if already downloaded
      if (downloadedMapIds.includes(route.persistentId)) {
        console.log(`[OfflineMapsContext] Map ${route.persistentId} already downloaded, skipping`);
        return true;
      }
      
      console.log(`[OfflineMapsContext] Downloading map ${route.persistentId}`);
      
      if (!isAuthenticated) {
        console.log(`[OfflineMapsContext] Not authenticated, cannot download map`);
        setError('Authentication required to download maps');
        return false;
      }
      
      setIsDownloading(true);
      setCurrentDownload({ 
        routeId: route.persistentId, 
        progress: 0, 
        currentPack: 0, 
        totalPacks: 0, 
        packProgress: 0 
      });
      
      try {
        // Download map tiles
        const updateProgress = (progressData: any) => {
          setCurrentDownload({ 
            routeId: route.persistentId, 
            progress: progressData.overallProgress, 
            currentPack: progressData.currentPack, 
            totalPacks: progressData.totalPacks, 
            packProgress: progressData.packProgress 
          });
        };
        
        console.log(`[OfflineMapsContext] Downloading map tiles for ${route.persistentId}`);
        const { size } = await mapboxOfflineManager.downloadMapTiles(route, updateProgress);
        
        // Verify downloaded tiles
        console.log(`[OfflineMapsContext] Verifying downloaded tiles for route ${route.persistentId}`);
        const verified = await mapboxOfflineManager.verifyDownloadedTiles(route.persistentId);
        
        if (!verified) {
          console.error(`[OfflineMapsContext] Tile verification failed for route ${route.persistentId}`);
          setError(`Failed to verify downloaded tiles for ${route.name || 'Unnamed Route'}`);
          
          // Clean up any partially downloaded files
          try {
            await mapboxOfflineManager.deleteMapTiles(route.persistentId);
          } catch (cleanupError) {
            console.error('Error cleaning up failed download:', cleanupError);
          }
          
          return false;
        }
        
        // Mark as downloaded in Firebase
        console.log(`[OfflineMapsContext] Marking map ${route.persistentId} as downloaded in Firebase`);
        const metadata = {
          downloadedAt: new Date(),
          size: size
        };
        await firebaseOfflineMapsService.markMapAsDownloaded(route.persistentId, metadata);
        
        console.log(`[OfflineMapsContext] Successfully downloaded map ${route.persistentId}`);
        
        // Update state immediately for UI responsiveness
        route.downloadSize = size;
        route.downloadedAt = metadata.downloadedAt;
        setDownloadedMapIds(prev => [...prev, route.persistentId]);
        setDownloadedMaps(prev => [...prev, route]);
        
        // Update storage usage
        await updateStorageUsage();
        
        return true;
      } catch (error: any) {
        console.error('Error downloading map:', error);
        setError(`Failed to download map: ${error.message || 'Unknown error'}`);
        
        // Clean up any partially downloaded files
        try {
          await mapboxOfflineManager.deleteMapTiles(route.persistentId);
        } catch (cleanupError) {
          console.error('Error cleaning up partial download:', cleanupError);
        }
        
        return false;
      } finally {
        setIsDownloading(false);
        setCurrentDownload(null);
      }
    } catch (error: any) {
      console.error('Error in downloadMap:', error);
      setError(`Failed to download map: ${error.message || 'Unknown error'}`);
      setIsDownloading(false);
      setCurrentDownload(null);
      return false;
    }
  };

  // Delete a downloaded map
  const deleteMap = async (routeId: string): Promise<boolean> => {
    try {
      // Check if map is downloaded
      if (!downloadedMapIds.includes(routeId)) {
        console.log(`[OfflineMapsContext] Map ${routeId} not in downloaded maps, nothing to delete`);
        return true;
      }
      
      console.log(`[OfflineMapsContext] Deleting map ${routeId}`);
      
      if (!isAuthenticated) {
        console.log(`[OfflineMapsContext] Not authenticated, cannot delete map from Firebase`);
        setError('Authentication required to delete maps');
        return false;
      }
      
      setIsDownloading(true);
      
      try {
        // Delete map tiles from storage
        console.log(`[OfflineMapsContext] Deleting map tiles for ${routeId}`);
        await mapboxOfflineManager.deleteMapTiles(routeId);
        
        // Remove from Firebase
        console.log(`[OfflineMapsContext] Removing map ${routeId} from Firebase`);
        await firebaseOfflineMapsService.removeDownloadedMap(routeId);
        
        console.log(`[OfflineMapsContext] Successfully deleted map ${routeId}`);
        
        // Check if this is the last map
        const isLastMap = downloadedMapIds.length === 1;
        
        // Update state immediately for UI responsiveness
        setDownloadedMapIds(prev => prev.filter(id => id !== routeId));
        setDownloadedMaps(prev => prev.filter(map => map.persistentId !== routeId));
        
        // Update storage usage
        await updateStorageUsage();
        
        // If this was the last map, force a complete refresh to ensure UI updates correctly
        if (isLastMap) {
          console.log('[OfflineMapsContext] Last map deleted, forcing complete refresh');
          // Small delay to ensure Firebase operation completes
          setTimeout(() => {
            loadDownloadedMapsFromFirebase();
          }, 300);
        }
        
        return true;
      } catch (error: any) {
        console.error('Error deleting map:', error);
        setError(`Failed to delete map: ${error.message || 'Unknown error'}`);
        return false;
      } finally {
        setIsDownloading(false);
      }
    } catch (error: any) {
      console.error('Error in deleteMap:', error);
      setError(`Failed to delete map: ${error.message || 'Unknown error'}`);
      setIsDownloading(false);
      return false;
    }
  };

  // Clear all downloaded maps
  const clearAllDownloads = async () => {
    try {
      console.log('[OfflineMapsContext] Clearing all downloaded maps');
      setIsDownloading(true);
      
      if (!isAuthenticated) {
        console.log(`[OfflineMapsContext] Not authenticated, cannot clear maps from Firebase`);
        setError('Authentication required to clear maps');
        return;
      }
      
      // Delete each map from storage and Firebase
      for (const mapId of downloadedMapIds) {
        try {
          console.log(`[OfflineMapsContext] Deleting map ${mapId}`);
          await mapboxOfflineManager.deleteMapTiles(mapId);
          await firebaseOfflineMapsService.removeDownloadedMap(mapId);
        } catch (error) {
          console.error(`[OfflineMapsContext] Error deleting map ${mapId}:`, error);
          // Continue with other maps
        }
      }
      
      // Reset state
      setDownloadedMapIds([]);
      setDownloadedMaps([]);
      
      // Update storage usage
      await updateStorageUsage();
      
      console.log('[OfflineMapsContext] Successfully cleared all downloaded maps');
    } catch (error) {
      console.error('Error clearing downloaded maps:', error);
      setError('Failed to clear downloaded maps');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <OfflineMapsContext.Provider
      value={{
        downloadedMaps,
        isDownloading,
        currentDownload,
        storageUsed,
        downloadMap,
        queueDownload,
        deleteMap,
        isMapDownloaded,
        refreshDownloadedMaps,
        clearAllDownloads,
        testMapboxConnection,
        testMinimalRegion, // Add the test function to the provider value
        error,
        downloadQueue
      }}
    >
      {children}
    </OfflineMapsContext.Provider>
  );
};

// Hook to use the offline maps context
export const useOfflineMaps = () => {
  const context = useContext(OfflineMapsContext);
  if (context === undefined) {
    throw new Error('useOfflineMaps must be used within an OfflineMapsProvider');
  }
  return context;
};
