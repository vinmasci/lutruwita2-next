import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { RouteMap } from '../services/routeService';
import { useFirebaseRouteOfflineMapsService } from '../services/firebaseRouteOfflineMapsService';
import { useMapTileRouteStorage } from '../services/mapTileRouteStorage';

// Context type definition
interface DownloadProgress {
  routeId: string;
  progress: number;
  downloadedCount: number;
  totalCount: number;
}

interface RouteOfflineMetadata {
  downloadedAt: Date;
  size: number;
  tilesCount: number;
}

interface RouteSpecificOfflineMapsContextType {
  downloadedRoutes: string[];
  downloadRoute: (route: RouteMap) => Promise<boolean>;
  deleteRoute: (routeId: string) => Promise<boolean>;
  isRouteDownloaded: (routeId: string) => boolean;
  isRouteAvailableOffline: (route: RouteMap) => boolean;
  refreshDownloadedRoutes: () => Promise<void>;
  clearAllDownloads: () => Promise<void>;
  isDownloading: boolean;
  currentDownload: DownloadProgress | null;
  storageUsed: number;
  error: string | null;
  estimateRouteStorage: (route: RouteMap) => { tileCount: number; estimatedSize: number };
  configureOfflineMap: (routeId: string) => any;
  getRouteMetadata: (routeId: string) => RouteOfflineMetadata | null;
  getAllRouteMetadata: () => Record<string, RouteOfflineMetadata>;
}

// Create context
const RouteSpecificOfflineMapsContext = createContext<RouteSpecificOfflineMapsContextType | undefined>(undefined);

// Provider component
export const RouteSpecificOfflineMapsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [downloadedRoutes, setDownloadedRoutes] = useState<string[]>([]);
  const [routeMetadata, setRouteMetadata] = useState<Record<string, RouteOfflineMetadata>>({});
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [currentDownload, setCurrentDownload] = useState<DownloadProgress | null>(null);
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated } = useAuth();
  const firebaseRouteOfflineMapsService = useFirebaseRouteOfflineMapsService();
  const mapTileRouteStorage = useMapTileRouteStorage();

  // Initialize by loading downloaded routes
  useEffect(() => {
    const initialize = async () => {
      if (isAuthenticated) {
        console.log('[RouteSpecificOfflineMapsContext] User is authenticated, loading routes');
        await loadDownloadedRoutes();
        await updateStorageUsage();
      } else {
        console.log('[RouteSpecificOfflineMapsContext] User is not authenticated, skipping Firebase operations');
        setDownloadedRoutes([]);
        setRouteMetadata({});
        setError('You need to log in to use offline maps. Please sign in from the Profile tab.');
      }
    };
    initialize();
  }, [isAuthenticated]);

  // Update storage usage
  const updateStorageUsage = async () => {
    try {
      const usage = await mapTileRouteStorage.getStorageInfo();
      setStorageUsed(usage);
      
      // Update individual route sizes
      if (downloadedRoutes.length > 0) {
        const updatedMetadata = { ...routeMetadata };
        let totalSizeChanged = false;
        
        for (const routeId of downloadedRoutes) {
          try {
            const routeSize = await mapTileRouteStorage.getRouteStorageSize(routeId);
            
            if (routeSize > 0 && (!routeMetadata[routeId] || routeSize !== routeMetadata[routeId].size)) {
              console.log(`[RouteSpecificOfflineMapsContext] Updating size for route ${routeId} to ${routeSize}`);
              
              const downloadedAt = routeMetadata[routeId]?.downloadedAt || new Date();
              const tilesCount = routeMetadata[routeId]?.tilesCount || 0;
              
              updatedMetadata[routeId] = {
                downloadedAt,
                size: routeSize,
                tilesCount
              };
              
              // Update the metadata in Firebase
              await firebaseRouteOfflineMapsService.updateRouteMetadata(routeId, {
                downloadedAt,
                size: routeSize,
                tilesCount
              });
              
              totalSizeChanged = true;
            }
          } catch (error) {
            console.error(`Error updating size for route ${routeId}:`, error);
          }
        }
        
        if (totalSizeChanged) {
          setRouteMetadata(updatedMetadata);
        }
      }
    } catch (error) {
      console.error('Error getting storage usage:', error);
    }
  };

  // Load downloaded routes
  const loadDownloadedRoutes = async () => {
    if (!isAuthenticated) {
      console.log('[RouteSpecificOfflineMapsContext] Not authenticated, cannot load routes from Firebase');
      setDownloadedRoutes([]);
      setRouteMetadata({});
      return;
    }
    
    setIsDownloading(true);
    setError(null);
    
    try {
      console.log('[RouteSpecificOfflineMapsContext] Loading route IDs from Firebase');
      const routeIds = await firebaseRouteOfflineMapsService.listOfflineRoutes();
      
      console.log(`[RouteSpecificOfflineMapsContext] Found ${routeIds.length} downloaded route IDs in Firebase`);
      
      // Verify that the routes are actually downloaded
      const verifiedRoutes: string[] = [];
      const metadata: Record<string, RouteOfflineMetadata> = {};
      
      for (const routeId of routeIds) {
        try {
          const isDownloaded = await mapTileRouteStorage.isRouteDownloaded(routeId);
          
          if (isDownloaded) {
            verifiedRoutes.push(routeId);
            
            // Get metadata from Firebase
            const routeMetadata = await firebaseRouteOfflineMapsService.getRouteMetadata(routeId);
            
            if (routeMetadata) {
              metadata[routeId] = {
                downloadedAt: routeMetadata.downloadedAt || new Date(),
                size: routeMetadata.size || 0,
                tilesCount: routeMetadata.tilesCount || 0
              };
            } else {
              // If no metadata exists, create default metadata
              const size = await mapTileRouteStorage.getRouteStorageSize(routeId);
              
              metadata[routeId] = {
                downloadedAt: new Date(),
                size,
                tilesCount: 0
              };
              
              // Save metadata to Firebase
              await firebaseRouteOfflineMapsService.updateRouteMetadata(routeId, {
                downloadedAt: new Date(),
                size,
                tilesCount: 0
              });
            }
          } else {
            console.log(`[RouteSpecificOfflineMapsContext] Route ${routeId} is in Firebase but not found in storage, removing from Firebase`);
            await firebaseRouteOfflineMapsService.removeDownloadedRoute(routeId);
          }
        } catch (error) {
          console.error(`Error verifying route ${routeId}:`, error);
        }
      }
      
      console.log(`[RouteSpecificOfflineMapsContext] Verified ${verifiedRoutes.length} downloaded routes`);
      setDownloadedRoutes(verifiedRoutes);
      setRouteMetadata(metadata);
    } catch (error) {
      console.error('Error loading routes from Firebase:', error);
      setError('Failed to load downloaded routes from Firebase');
      
      // Reset state on error
      setDownloadedRoutes([]);
      setRouteMetadata({});
    } finally {
      setIsDownloading(false);
    }
  };

  // Refresh downloaded routes
  const refreshDownloadedRoutes = async () => {
    if (!isAuthenticated) {
      console.log('[RouteSpecificOfflineMapsContext] Not authenticated, cannot refresh routes');
      setError('You need to log in to use offline maps. Please sign in from the Profile tab.');
      return;
    }

    setIsDownloading(true);
    setError(null);
    
    try {
      console.log('[RouteSpecificOfflineMapsContext] Refreshing downloaded routes from Firebase');
      await loadDownloadedRoutes();
      await updateStorageUsage();
      console.log('[RouteSpecificOfflineMapsContext] Refresh complete');
    } catch (error) {
      console.error('Error refreshing downloaded routes:', error);
      setError('Failed to refresh downloaded routes');
    } finally {
      setIsDownloading(false);
    }
  };

  // Check if a route is downloaded
  const isRouteDownloaded = useCallback((routeId: string): boolean => {
    return downloadedRoutes.includes(routeId);
  }, [downloadedRoutes]);

  // Check if a route is available offline
  const isRouteAvailableOffline = useCallback((route: RouteMap): boolean => {
    return isRouteDownloaded(route.persistentId);
  }, [isRouteDownloaded]);

  // Download a route
  const downloadRoute = async (route: RouteMap): Promise<boolean> => {
    try {
      // Check if already downloaded
      if (downloadedRoutes.includes(route.persistentId)) {
        console.log(`[RouteSpecificOfflineMapsContext] Route ${route.persistentId} already downloaded, skipping`);
        return true;
      }
      
      console.log(`[RouteSpecificOfflineMapsContext] Downloading route ${route.persistentId}`);
      
      if (!isAuthenticated) {
        console.log(`[RouteSpecificOfflineMapsContext] Not authenticated, cannot download route`);
        setError('Authentication required to download routes');
        return false;
      }
      
      setIsDownloading(true);
      setCurrentDownload({ 
        routeId: route.persistentId, 
        progress: 0, 
        downloadedCount: 0, 
        totalCount: 0
      });
      
      try {
        // Download route tiles
        const updateProgress = (progressData: any) => {
          setCurrentDownload({ 
            routeId: route.persistentId, 
            progress: progressData.progress, 
            downloadedCount: progressData.downloadedCount, 
            totalCount: progressData.totalCount
          });
        };
        
        console.log(`[RouteSpecificOfflineMapsContext] Downloading map tiles for ${route.persistentId}`);
        const { size, tilesCount } = await mapTileRouteStorage.downloadTilesForRoute(route, updateProgress);
        
        // Mark as downloaded in Firebase
        console.log(`[RouteSpecificOfflineMapsContext] Marking route ${route.persistentId} as downloaded in Firebase`);
        const metadata = {
          downloadedAt: new Date(),
          size,
          tilesCount
        };
        await firebaseRouteOfflineMapsService.markRouteAsDownloaded(route.persistentId, metadata);
        
        console.log(`[RouteSpecificOfflineMapsContext] Successfully downloaded route ${route.persistentId}`);
        
        // Update state immediately for UI responsiveness
        setDownloadedRoutes(prev => [...prev, route.persistentId]);
        setRouteMetadata(prev => ({
          ...prev,
          [route.persistentId]: metadata
        }));
        
        // Update storage usage
        await updateStorageUsage();
        
        return true;
      } catch (error: any) {
        console.error('Error downloading route:', error);
        setError(`Failed to download route: ${error.message || 'Unknown error'}`);
        
        // Clean up any partially downloaded files
        try {
          await mapTileRouteStorage.deleteRoute(route.persistentId);
        } catch (cleanupError) {
          console.error('Error cleaning up partial download:', cleanupError);
        }
        
        return false;
      } finally {
        setIsDownloading(false);
        setCurrentDownload(null);
      }
    } catch (error: any) {
      console.error('Error in downloadRoute:', error);
      setError(`Failed to download route: ${error.message || 'Unknown error'}`);
      setIsDownloading(false);
      setCurrentDownload(null);
      return false;
    }
  };

  // Delete a downloaded route
  const deleteRoute = async (routeId: string): Promise<boolean> => {
    try {
      // Check if route is downloaded
      if (!downloadedRoutes.includes(routeId)) {
        console.log(`[RouteSpecificOfflineMapsContext] Route ${routeId} not in downloaded routes, nothing to delete`);
        return true;
      }
      
      console.log(`[RouteSpecificOfflineMapsContext] Deleting route ${routeId}`);
      
      if (!isAuthenticated) {
        console.log(`[RouteSpecificOfflineMapsContext] Not authenticated, cannot delete route from Firebase`);
        setError('Authentication required to delete routes');
        return false;
      }
      
      setIsDownloading(true);
      
      try {
        // Delete route tiles from storage
        console.log(`[RouteSpecificOfflineMapsContext] Deleting route tiles for ${routeId}`);
        await mapTileRouteStorage.deleteRoute(routeId);
        
        // Remove from Firebase
        console.log(`[RouteSpecificOfflineMapsContext] Removing route ${routeId} from Firebase`);
        await firebaseRouteOfflineMapsService.removeDownloadedRoute(routeId);
        
        console.log(`[RouteSpecificOfflineMapsContext] Successfully deleted route ${routeId}`);
        
        // Update state immediately for UI responsiveness
        setDownloadedRoutes(prev => prev.filter(id => id !== routeId));
        setRouteMetadata(prev => {
          const newMetadata = { ...prev };
          delete newMetadata[routeId];
          return newMetadata;
        });
        
        // Update storage usage
        await updateStorageUsage();
        
        return true;
      } catch (error: any) {
        console.error('Error deleting route:', error);
        setError(`Failed to delete route: ${error.message || 'Unknown error'}`);
        return false;
      } finally {
        setIsDownloading(false);
      }
    } catch (error: any) {
      console.error('Error in deleteRoute:', error);
      setError(`Failed to delete route: ${error.message || 'Unknown error'}`);
      setIsDownloading(false);
      return false;
    }
  };

  // Clear all downloaded routes
  const clearAllDownloads = async () => {
    try {
      console.log('[RouteSpecificOfflineMapsContext] Clearing all downloaded routes');
      setIsDownloading(true);
      
      if (!isAuthenticated) {
        console.log(`[RouteSpecificOfflineMapsContext] Not authenticated, cannot clear routes from Firebase`);
        setError('Authentication required to clear routes');
        return;
      }
      
      // Delete each route from storage and Firebase
      for (const routeId of downloadedRoutes) {
        try {
          console.log(`[RouteSpecificOfflineMapsContext] Deleting route ${routeId}`);
          await mapTileRouteStorage.deleteRoute(routeId);
          await firebaseRouteOfflineMapsService.removeDownloadedRoute(routeId);
        } catch (error) {
          console.error(`[RouteSpecificOfflineMapsContext] Error deleting route ${routeId}:`, error);
          // Continue with other routes
        }
      }
      
      // Reset state
      setDownloadedRoutes([]);
      setRouteMetadata({});
      
      // Update storage usage
      await updateStorageUsage();
      
      console.log('[RouteSpecificOfflineMapsContext] Successfully cleared all downloaded routes');
    } catch (error) {
      console.error('Error clearing downloaded routes:', error);
      setError('Failed to clear downloaded routes');
    } finally {
      setIsDownloading(false);
    }
  };

  // Estimate route storage
  const estimateRouteStorage = (route: RouteMap) => {
    return mapTileRouteStorage.estimateRouteStorage(route);
  };

  // Configure offline map
  const configureOfflineMap = (routeId: string) => {
    return mapTileRouteStorage.configureOfflineMap(routeId);
  };

  // Get metadata for a specific route
  const getRouteMetadata = (routeId: string): RouteOfflineMetadata | null => {
    return routeMetadata[routeId] || null;
  };

  // Get all route metadata
  const getAllRouteMetadata = (): Record<string, RouteOfflineMetadata> => {
    return { ...routeMetadata };
  };

  return (
    <RouteSpecificOfflineMapsContext.Provider
      value={{
        downloadedRoutes,
        downloadRoute,
        deleteRoute,
        isRouteDownloaded,
        isRouteAvailableOffline,
        refreshDownloadedRoutes,
        clearAllDownloads,
        isDownloading,
        currentDownload,
        storageUsed,
        error,
        estimateRouteStorage,
        configureOfflineMap,
        getRouteMetadata,
        getAllRouteMetadata
      }}
    >
      {children}
    </RouteSpecificOfflineMapsContext.Provider>
  );
};

// Hook to use the route-specific offline maps context
export const useRouteSpecificOfflineMaps = () => {
  const context = useContext(RouteSpecificOfflineMapsContext);
  if (context === undefined) {
    throw new Error('useRouteSpecificOfflineMaps must be used within a RouteSpecificOfflineMapsProvider');
  }
  return context;
};
