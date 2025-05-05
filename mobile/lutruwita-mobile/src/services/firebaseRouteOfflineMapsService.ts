import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface RouteOfflineMetadata {
  downloadedAt: Date;
  size: number;
  tilesCount: number;
}

export const useFirebaseRouteOfflineMapsService = () => {
  const { user } = useAuth();

  // Get the user's offline maps collection reference
  const getOfflineMapsCollection = () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }
    return firestore()
      .collection('users')
      .doc(user.uid)
      .collection('offlineRoutes');
  };

  // List all downloaded offline maps for the user
  const listOfflineRoutes = async (): Promise<string[]> => {
    try {
      if (!user?.uid) {
        console.log('[FirebaseRouteOfflineMapsService] User not authenticated, cannot list offline routes');
        return [];
      }

      const snapshot = await getOfflineMapsCollection().get();
      
      if (snapshot.empty) {
        console.log('[FirebaseRouteOfflineMapsService] No offline routes found for user');
        return [];
      }
      
      const routeIds = snapshot.docs.map(doc => doc.id);
      console.log(`[FirebaseRouteOfflineMapsService] Found ${routeIds.length} offline routes for user`);
      
      return routeIds;
    } catch (error) {
      console.error('Error listing offline routes:', error);
      return [];
    }
  };

  // Mark a route as downloaded
  const markRouteAsDownloaded = async (
    routeId: string, 
    metadata: RouteOfflineMetadata
  ): Promise<void> => {
    try {
      if (!user?.uid) {
        console.log('[FirebaseRouteOfflineMapsService] User not authenticated, cannot mark route as downloaded');
        return;
      }

      console.log(`[FirebaseRouteOfflineMapsService] Marking route ${routeId} as downloaded`);
      
      await getOfflineMapsCollection().doc(routeId).set({
        downloadedAt: firestore.Timestamp.fromDate(metadata.downloadedAt),
        size: metadata.size,
        tilesCount: metadata.tilesCount,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`[FirebaseRouteOfflineMapsService] Successfully marked route ${routeId} as downloaded`);
    } catch (error) {
      console.error(`Error marking route ${routeId} as downloaded:`, error);
      throw error;
    }
  };

  // Remove a downloaded route from Firebase
  const removeDownloadedRoute = async (routeId: string): Promise<void> => {
    try {
      if (!user?.uid) {
        console.log('[FirebaseRouteOfflineMapsService] User not authenticated, cannot remove downloaded route');
        return;
      }

      console.log(`[FirebaseRouteOfflineMapsService] Removing route ${routeId} from Firebase`);
      
      await getOfflineMapsCollection().doc(routeId).delete();
      
      console.log(`[FirebaseRouteOfflineMapsService] Successfully removed route ${routeId} from Firebase`);
    } catch (error) {
      console.error(`Error removing route ${routeId} from Firebase:`, error);
      throw error;
    }
  };

  // Get metadata for a downloaded route
  const getRouteMetadata = async (routeId: string): Promise<RouteOfflineMetadata | null> => {
    try {
      if (!user?.uid) {
        console.log('[FirebaseRouteOfflineMapsService] User not authenticated, cannot get route metadata');
        return null;
      }

      console.log(`[FirebaseRouteOfflineMapsService] Getting metadata for route ${routeId}`);
      
      const doc = await getOfflineMapsCollection().doc(routeId).get();
      
      if (!doc.exists) {
        console.log(`[FirebaseRouteOfflineMapsService] No metadata found for route ${routeId}`);
        return null;
      }
      
      const data = doc.data();
      
      if (!data) {
        console.log(`[FirebaseRouteOfflineMapsService] Empty metadata for route ${routeId}`);
        return null;
      }
      
      console.log(`[FirebaseRouteOfflineMapsService] Found metadata for route ${routeId}`);
      
      return {
        downloadedAt: data.downloadedAt?.toDate() || new Date(),
        size: data.size || 0,
        tilesCount: data.tilesCount || 0
      };
    } catch (error) {
      console.error(`Error getting metadata for route ${routeId}:`, error);
      return null;
    }
  };

  // Update metadata for a downloaded route
  const updateRouteMetadata = async (
    routeId: string, 
    metadata: Partial<RouteOfflineMetadata>
  ): Promise<void> => {
    try {
      if (!user?.uid) {
        console.log('[FirebaseRouteOfflineMapsService] User not authenticated, cannot update route metadata');
        return;
      }

      console.log(`[FirebaseRouteOfflineMapsService] Updating metadata for route ${routeId}`);
      
      const updateData: any = {
        updatedAt: firestore.FieldValue.serverTimestamp()
      };
      
      if (metadata.downloadedAt) {
        updateData.downloadedAt = firestore.Timestamp.fromDate(metadata.downloadedAt);
      }
      
      if (metadata.size !== undefined) {
        updateData.size = metadata.size;
      }
      
      if (metadata.tilesCount !== undefined) {
        updateData.tilesCount = metadata.tilesCount;
      }
      
      await getOfflineMapsCollection().doc(routeId).update(updateData);
      
      console.log(`[FirebaseRouteOfflineMapsService] Successfully updated metadata for route ${routeId}`);
    } catch (error) {
      console.error(`Error updating metadata for route ${routeId}:`, error);
      throw error;
    }
  };

  // Check if a route is downloaded
  const isRouteDownloaded = async (routeId: string): Promise<boolean> => {
    try {
      if (!user?.uid) {
        console.log('[FirebaseRouteOfflineMapsService] User not authenticated, cannot check if route is downloaded');
        return false;
      }

      const doc = await getOfflineMapsCollection().doc(routeId).get();
      // Handle both cases where exists might be a property or a function
      return typeof doc.exists === 'function' ? doc.exists() : !!doc.exists;
    } catch (error) {
      console.error(`Error checking if route ${routeId} is downloaded:`, error);
      return false;
    }
  };

  // Get all route metadata
  const getAllRouteMetadata = async (): Promise<Record<string, RouteOfflineMetadata>> => {
    try {
      if (!user?.uid) {
        console.log('[FirebaseRouteOfflineMapsService] User not authenticated, cannot get all route metadata');
        return {};
      }

      console.log('[FirebaseRouteOfflineMapsService] Getting all route metadata');
      
      const snapshot = await getOfflineMapsCollection().get();
      
      if (snapshot.empty) {
        console.log('[FirebaseRouteOfflineMapsService] No route metadata found');
        return {};
      }
      
      const metadata: Record<string, RouteOfflineMetadata> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        metadata[doc.id] = {
          downloadedAt: data.downloadedAt?.toDate() || new Date(),
          size: data.size || 0,
          tilesCount: data.tilesCount || 0
        };
      });
      
      console.log(`[FirebaseRouteOfflineMapsService] Found metadata for ${Object.keys(metadata).length} routes`);
      
      return metadata;
    } catch (error) {
      console.error('Error getting all route metadata:', error);
      return {};
    }
  };

  // Clear all downloaded routes
  const clearAllDownloadedRoutes = async (): Promise<void> => {
    try {
      if (!user?.uid) {
        console.log('[FirebaseRouteOfflineMapsService] User not authenticated, cannot clear all downloaded routes');
        return;
      }

      console.log('[FirebaseRouteOfflineMapsService] Clearing all downloaded routes');
      
      const batch = firestore().batch();
      const snapshot = await getOfflineMapsCollection().get();
      
      if (snapshot.empty) {
        console.log('[FirebaseRouteOfflineMapsService] No routes to clear');
        return;
      }
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log(`[FirebaseRouteOfflineMapsService] Successfully cleared ${snapshot.docs.length} downloaded routes`);
    } catch (error) {
      console.error('Error clearing all downloaded routes:', error);
      throw error;
    }
  };

  return {
    listOfflineRoutes,
    markRouteAsDownloaded,
    removeDownloadedRoute,
    getRouteMetadata,
    updateRouteMetadata,
    isRouteDownloaded,
    getAllRouteMetadata,
    clearAllDownloadedRoutes
  };
};
