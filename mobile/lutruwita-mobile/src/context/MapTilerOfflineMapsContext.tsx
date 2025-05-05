import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { RouteMap } from '../services/routeService';
import { useFirebaseOfflineMapsService } from '../services/firebaseOfflineMapsService';
import { useMapTilerStorage } from '../services/mapTilerStorage';
import { useMapTilerRegionService, Region } from '../services/mapTilerRegionService';

// Context type definition
interface DownloadProgress {
  regionId: string;
  progress: number;
  currentPack: number;
  totalPacks: number;
  packProgress: number;
}

interface RegionMetadata {
  downloadedAt: Date;
  size: number;
}

interface MapTilerOfflineMapsContextType {
  downloadedRegions: string[];
  downloadRegion: (region: Region) => Promise<boolean>;
  deleteRegion: (regionId: string) => Promise<boolean>;
  isRegionDownloaded: (regionId: string) => boolean;
  getRegionForRoute: (route: RouteMap) => Region | null;
  isRouteAvailableOffline: (route: RouteMap) => boolean;
  refreshDownloadedRegions: () => Promise<void>;
  clearAllDownloads: () => Promise<void>;
  isDownloading: boolean;
  currentDownload: DownloadProgress | null;
  storageUsed: number;
  error: string | null;
}

// Create context
const MapTilerOfflineMapsContext = createContext<MapTilerOfflineMapsContextType | undefined>(undefined);

// Provider component
export const MapTilerOfflineMapsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [downloadedRegions, setDownloadedRegions] = useState<string[]>([]);
  const [regionMetadata, setRegionMetadata] = useState<Record<string, RegionMetadata>>({});
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [currentDownload, setCurrentDownload] = useState<DownloadProgress | null>(null);
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated } = useAuth();
  const firebaseOfflineMapsService = useFirebaseOfflineMapsService();
  const mapTilerStorage = useMapTilerStorage();
  const mapTilerRegionService = useMapTilerRegionService();

  // Initialize by loading downloaded regions
  useEffect(() => {
    const initialize = async () => {
      if (isAuthenticated) {
        console.log('[MapTilerOfflineMapsContext] User is authenticated, loading regions');
        await loadDownloadedRegions();
        await updateStorageUsage();
      } else {
        console.log('[MapTilerOfflineMapsContext] User is not authenticated, skipping Firebase operations');
        setDownloadedRegions([]);
        setRegionMetadata({});
        setError('You need to log in to use offline maps. Please sign in from the Profile tab.');
      }
    };
    initialize();
  }, [isAuthenticated]);

  // Update storage usage
  const updateStorageUsage = async () => {
    try {
      const usage = await mapTilerStorage.getStorageInfo();
      setStorageUsed(usage);
      
      // Update individual region sizes
      if (downloadedRegions.length > 0) {
        const updatedMetadata = { ...regionMetadata };
        let totalSizeChanged = false;
        
        for (const regionId of downloadedRegions) {
          try {
            const regionSize = await mapTilerStorage.getRegionStorageSize(regionId);
            
            if (regionSize > 0 && (!regionMetadata[regionId] || regionSize !== regionMetadata[regionId].size)) {
              console.log(`[MapTilerOfflineMapsContext] Updating size for region ${regionId} to ${regionSize}`);
              
              const downloadedAt = regionMetadata[regionId]?.downloadedAt || new Date();
              
              updatedMetadata[regionId] = {
                downloadedAt,
                size: regionSize
              };
              
              // Update the metadata in Firebase
              await firebaseOfflineMapsService.updateMapMetadata(regionId, {
                downloadedAt,
                size: regionSize
              });
              
              totalSizeChanged = true;
            }
          } catch (error) {
            console.error(`Error updating size for region ${regionId}:`, error);
          }
        }
        
        if (totalSizeChanged) {
          setRegionMetadata(updatedMetadata);
        }
      }
    } catch (error) {
      console.error('Error getting storage usage:', error);
    }
  };

  // Load downloaded regions
  const loadDownloadedRegions = async () => {
    if (!isAuthenticated) {
      console.log('[MapTilerOfflineMapsContext] Not authenticated, cannot load regions from Firebase');
      setDownloadedRegions([]);
      setRegionMetadata({});
      return;
    }
    
    setIsDownloading(true);
    setError(null);
    
    try {
      console.log('[MapTilerOfflineMapsContext] Loading region IDs from Firebase');
      const regionIds = await firebaseOfflineMapsService.listOfflineMaps();
      
      console.log(`[MapTilerOfflineMapsContext] Found ${regionIds.length} downloaded region IDs in Firebase`);
      
      // Verify that the regions are actually downloaded
      const verifiedRegions: string[] = [];
      const metadata: Record<string, RegionMetadata> = {};
      
      for (const regionId of regionIds) {
        try {
          const isDownloaded = await mapTilerStorage.isRegionDownloaded(regionId);
          
          if (isDownloaded) {
            verifiedRegions.push(regionId);
            
            // Get metadata from Firebase
            const regionMetadata = await firebaseOfflineMapsService.getMapMetadata(regionId);
            
            if (regionMetadata) {
              metadata[regionId] = {
                downloadedAt: regionMetadata.downloadedAt || new Date(),
                size: regionMetadata.size || 0
              };
            } else {
              // If no metadata exists, create default metadata
              const size = await mapTilerStorage.getRegionStorageSize(regionId);
              
              metadata[regionId] = {
                downloadedAt: new Date(),
                size
              };
              
              // Save metadata to Firebase
              await firebaseOfflineMapsService.updateMapMetadata(regionId, {
                downloadedAt: new Date(),
                size
              });
            }
          } else {
            console.log(`[MapTilerOfflineMapsContext] Region ${regionId} is in Firebase but not found in storage, removing from Firebase`);
            await firebaseOfflineMapsService.removeDownloadedMap(regionId);
          }
        } catch (error) {
          console.error(`Error verifying region ${regionId}:`, error);
        }
      }
      
      console.log(`[MapTilerOfflineMapsContext] Verified ${verifiedRegions.length} downloaded regions`);
      setDownloadedRegions(verifiedRegions);
      setRegionMetadata(metadata);
    } catch (error) {
      console.error('Error loading regions from Firebase:', error);
      setError('Failed to load downloaded regions from Firebase');
      
      // Reset state on error
      setDownloadedRegions([]);
      setRegionMetadata({});
    } finally {
      setIsDownloading(false);
    }
  };

  // Refresh downloaded regions
  const refreshDownloadedRegions = async () => {
    if (!isAuthenticated) {
      console.log('[MapTilerOfflineMapsContext] Not authenticated, cannot refresh regions');
      setError('You need to log in to use offline maps. Please sign in from the Profile tab.');
      return;
    }

    setIsDownloading(true);
    setError(null);
    
    try {
      console.log('[MapTilerOfflineMapsContext] Refreshing downloaded regions from Firebase');
      await loadDownloadedRegions();
      await updateStorageUsage();
      console.log('[MapTilerOfflineMapsContext] Refresh complete');
    } catch (error) {
      console.error('Error refreshing downloaded regions:', error);
      setError('Failed to refresh downloaded regions');
    } finally {
      setIsDownloading(false);
    }
  };

  // Check if a region is downloaded
  const isRegionDownloaded = useCallback((regionId: string): boolean => {
    return downloadedRegions.includes(regionId);
  }, [downloadedRegions]);

  // Get region for a route
  const getRegionForRoute = useCallback((route: RouteMap): Region | null => {
    return mapTilerRegionService.getRegionForRoute(route);
  }, [mapTilerRegionService]);

  // Check if a route is available offline
  const isRouteAvailableOffline = useCallback((route: RouteMap): boolean => {
    const region = getRegionForRoute(route);
    if (!region) return false;
    
    return isRegionDownloaded(region.id);
  }, [getRegionForRoute, isRegionDownloaded]);

  // Download a region
  const downloadRegion = async (region: Region): Promise<boolean> => {
    try {
      // Check if already downloaded
      if (downloadedRegions.includes(region.id)) {
        console.log(`[MapTilerOfflineMapsContext] Region ${region.id} already downloaded, skipping`);
        return true;
      }
      
      console.log(`[MapTilerOfflineMapsContext] Downloading region ${region.id}`);
      
      if (!isAuthenticated) {
        console.log(`[MapTilerOfflineMapsContext] Not authenticated, cannot download region`);
        setError('Authentication required to download regions');
        return false;
      }
      
      setIsDownloading(true);
      setCurrentDownload({ 
        regionId: region.id, 
        progress: 0, 
        currentPack: 0, 
        totalPacks: 0, 
        packProgress: 0 
      });
      
      try {
        // Download region tiles
        const updateProgress = (progressData: any) => {
          setCurrentDownload({ 
            regionId: region.id, 
            progress: progressData.overallProgress, 
            currentPack: progressData.currentPack, 
            totalPacks: progressData.totalPacks, 
            packProgress: progressData.packProgress 
          });
        };
        
        console.log(`[MapTilerOfflineMapsContext] Downloading map tiles for ${region.id}`);
        const { size } = await mapTilerStorage.downloadRegion(region, updateProgress);
        
        // Mark as downloaded in Firebase
        console.log(`[MapTilerOfflineMapsContext] Marking region ${region.id} as downloaded in Firebase`);
        const metadata = {
          downloadedAt: new Date(),
          size: size
        };
        await firebaseOfflineMapsService.markMapAsDownloaded(region.id, metadata);
        
        console.log(`[MapTilerOfflineMapsContext] Successfully downloaded region ${region.id}`);
        
        // Update state immediately for UI responsiveness
        setDownloadedRegions(prev => [...prev, region.id]);
        setRegionMetadata(prev => ({
          ...prev,
          [region.id]: metadata
        }));
        
        // Update storage usage
        await updateStorageUsage();
        
        return true;
      } catch (error: any) {
        console.error('Error downloading region:', error);
        setError(`Failed to download region: ${error.message || 'Unknown error'}`);
        
        // Clean up any partially downloaded files
        try {
          await mapTilerStorage.deleteRegion(region.id);
        } catch (cleanupError) {
          console.error('Error cleaning up partial download:', cleanupError);
        }
        
        return false;
      } finally {
        setIsDownloading(false);
        setCurrentDownload(null);
      }
    } catch (error: any) {
      console.error('Error in downloadRegion:', error);
      setError(`Failed to download region: ${error.message || 'Unknown error'}`);
      setIsDownloading(false);
      setCurrentDownload(null);
      return false;
    }
  };

  // Delete a downloaded region
  const deleteRegion = async (regionId: string): Promise<boolean> => {
    try {
      // Check if region is downloaded
      if (!downloadedRegions.includes(regionId)) {
        console.log(`[MapTilerOfflineMapsContext] Region ${regionId} not in downloaded regions, nothing to delete`);
        return true;
      }
      
      console.log(`[MapTilerOfflineMapsContext] Deleting region ${regionId}`);
      
      if (!isAuthenticated) {
        console.log(`[MapTilerOfflineMapsContext] Not authenticated, cannot delete region from Firebase`);
        setError('Authentication required to delete regions');
        return false;
      }
      
      setIsDownloading(true);
      
      try {
        // Delete region tiles from storage
        console.log(`[MapTilerOfflineMapsContext] Deleting region tiles for ${regionId}`);
        await mapTilerStorage.deleteRegion(regionId);
        
        // Remove from Firebase
        console.log(`[MapTilerOfflineMapsContext] Removing region ${regionId} from Firebase`);
        await firebaseOfflineMapsService.removeDownloadedMap(regionId);
        
        console.log(`[MapTilerOfflineMapsContext] Successfully deleted region ${regionId}`);
        
        // Update state immediately for UI responsiveness
        setDownloadedRegions(prev => prev.filter(id => id !== regionId));
        setRegionMetadata(prev => {
          const newMetadata = { ...prev };
          delete newMetadata[regionId];
          return newMetadata;
        });
        
        // Update storage usage
        await updateStorageUsage();
        
        return true;
      } catch (error: any) {
        console.error('Error deleting region:', error);
        setError(`Failed to delete region: ${error.message || 'Unknown error'}`);
        return false;
      } finally {
        setIsDownloading(false);
      }
    } catch (error: any) {
      console.error('Error in deleteRegion:', error);
      setError(`Failed to delete region: ${error.message || 'Unknown error'}`);
      setIsDownloading(false);
      return false;
    }
  };

  // Clear all downloaded regions
  const clearAllDownloads = async () => {
    try {
      console.log('[MapTilerOfflineMapsContext] Clearing all downloaded regions');
      setIsDownloading(true);
      
      if (!isAuthenticated) {
        console.log(`[MapTilerOfflineMapsContext] Not authenticated, cannot clear regions from Firebase`);
        setError('Authentication required to clear regions');
        return;
      }
      
      // Delete each region from storage and Firebase
      for (const regionId of downloadedRegions) {
        try {
          console.log(`[MapTilerOfflineMapsContext] Deleting region ${regionId}`);
          await mapTilerStorage.deleteRegion(regionId);
          await firebaseOfflineMapsService.removeDownloadedMap(regionId);
        } catch (error) {
          console.error(`[MapTilerOfflineMapsContext] Error deleting region ${regionId}:`, error);
          // Continue with other regions
        }
      }
      
      // Reset state
      setDownloadedRegions([]);
      setRegionMetadata({});
      
      // Update storage usage
      await updateStorageUsage();
      
      console.log('[MapTilerOfflineMapsContext] Successfully cleared all downloaded regions');
    } catch (error) {
      console.error('Error clearing downloaded regions:', error);
      setError('Failed to clear downloaded regions');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <MapTilerOfflineMapsContext.Provider
      value={{
        downloadedRegions,
        downloadRegion,
        deleteRegion,
        isRegionDownloaded,
        getRegionForRoute,
        isRouteAvailableOffline,
        refreshDownloadedRegions,
        clearAllDownloads,
        isDownloading,
        currentDownload,
        storageUsed,
        error
      }}
    >
      {children}
    </MapTilerOfflineMapsContext.Provider>
  );
};

// Hook to use the MapTiler offline maps context
export const useMapTilerOfflineMaps = () => {
  const context = useContext(MapTilerOfflineMapsContext);
  if (context === undefined) {
    throw new Error('useMapTilerOfflineMaps must be used within a MapTilerOfflineMapsProvider');
  }
  return context;
};
