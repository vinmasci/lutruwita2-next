import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface MapMetadata {
  downloadedAt: Date;
  size: number;
}

export const useFirebaseOfflineMapsService = () => {
  const { user } = useAuth();

  // Get the user's offline maps collection reference
  const getOfflineMapsCollection = () => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return firestore().collection('users').doc(user.uid).collection('offlineMaps');
  };

  // Get the user's MapTiler offline maps collection reference
  const getMapTilerOfflineMapsCollection = () => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return firestore().collection('users').doc(user.uid).collection('mapTilerOfflineMaps');
  };

  // List all downloaded maps
  const listOfflineMaps = async (): Promise<string[]> => {
    try {
      if (!user) {
        console.log('[FirebaseOfflineMapsService] User not authenticated');
        return [];
      }

      const snapshot = await getMapTilerOfflineMapsCollection().get();
      
      if (snapshot.empty) {
        console.log('[FirebaseOfflineMapsService] No offline maps found');
        return [];
      }
      
      const maps = snapshot.docs.map(doc => doc.id);
      console.log(`[FirebaseOfflineMapsService] Found ${maps.length} offline maps`);
      return maps;
    } catch (error) {
      console.error('Error listing offline maps:', error);
      return [];
    }
  };

  // Mark a map as downloaded
  const markMapAsDownloaded = async (mapId: string, metadata: MapMetadata): Promise<boolean> => {
    try {
      if (!user) {
        console.log('[FirebaseOfflineMapsService] User not authenticated');
        return false;
      }

      await getMapTilerOfflineMapsCollection().doc(mapId).set({
        downloadedAt: firestore.Timestamp.fromDate(metadata.downloadedAt),
        size: metadata.size
      });
      
      console.log(`[FirebaseOfflineMapsService] Map ${mapId} marked as downloaded`);
      return true;
    } catch (error) {
      console.error('Error marking map as downloaded:', error);
      return false;
    }
  };

  // Remove a downloaded map
  const removeDownloadedMap = async (mapId: string): Promise<boolean> => {
    try {
      if (!user) {
        console.log('[FirebaseOfflineMapsService] User not authenticated');
        return false;
      }

      await getMapTilerOfflineMapsCollection().doc(mapId).delete();
      
      console.log(`[FirebaseOfflineMapsService] Map ${mapId} removed from downloaded maps`);
      return true;
    } catch (error) {
      console.error('Error removing downloaded map:', error);
      return false;
    }
  };

  // Get map metadata
  const getMapMetadata = async (mapId: string): Promise<MapMetadata | null> => {
    try {
      if (!user) {
        console.log('[FirebaseOfflineMapsService] User not authenticated');
        return null;
      }

      const doc = await getMapTilerOfflineMapsCollection().doc(mapId).get();
      
      if (!doc.exists) {
        console.log(`[FirebaseOfflineMapsService] No metadata found for map ${mapId}`);
        return null;
      }
      
      const data = doc.data();
      
      if (!data) {
        console.log(`[FirebaseOfflineMapsService] Empty metadata for map ${mapId}`);
        return null;
      }
      
      return {
        downloadedAt: data.downloadedAt?.toDate() || new Date(),
        size: data.size || 0
      };
    } catch (error) {
      console.error('Error getting map metadata:', error);
      return null;
    }
  };

  // Update map metadata
  const updateMapMetadata = async (mapId: string, metadata: MapMetadata): Promise<boolean> => {
    try {
      if (!user) {
        console.log('[FirebaseOfflineMapsService] User not authenticated');
        return false;
      }

      await getMapTilerOfflineMapsCollection().doc(mapId).update({
        downloadedAt: firestore.Timestamp.fromDate(metadata.downloadedAt),
        size: metadata.size
      });
      
      console.log(`[FirebaseOfflineMapsService] Metadata updated for map ${mapId}`);
      return true;
    } catch (error) {
      console.error('Error updating map metadata:', error);
      return false;
    }
  };

  return {
    listOfflineMaps,
    markMapAsDownloaded,
    removeDownloadedMap,
    getMapMetadata,
    updateMapMetadata
  };
};
