import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOfflineMaps } from '../../context/OfflineMapsContext';
import { RouteMap } from '../../services/routeService';
import FallbackMapPreview from '../map/FallbackMapPreview';
import { formatBytes, formatDate } from '../../utils/formatUtils';
import { RootStackParamList } from '../../navigation';

interface OfflineMapCardProps {
  route: RouteMap;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OfflineMap'>;

const OfflineMapCard: React.FC<OfflineMapCardProps> = ({ route }) => {
  const { deleteMap, isDownloading, currentDownload, downloadQueue } = useOfflineMaps();
  const navigation = useNavigation<NavigationProp>();
  
  // Check if this route is currently downloading
  const isCurrentlyDownloading = useMemo(() => {
    return isDownloading && currentDownload?.routeId === route.persistentId;
  }, [isDownloading, currentDownload, route.persistentId]);
  
  // Check if this route is in the download queue
  const isInQueue = useMemo(() => {
    return downloadQueue.some(r => r.persistentId === route.persistentId);
  }, [downloadQueue, route.persistentId]);
  
  // Handle delete
  const handleDelete = async () => {
    await deleteMap(route.persistentId);
  };
  
  // Handle view map
  const handleViewMap = () => {
    navigation.navigate('OfflineMap', { mapId: route.persistentId });
  };
  
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={handleViewMap}
      disabled={isDownloading}
    >
      {/* Map preview */}
      <View style={styles.previewContainer}>
        {route.staticMapUrl ? (
          <Image 
            source={{ uri: route.staticMapUrl }} 
            style={styles.mapImage}
            resizeMode="cover"
          />
        ) : (
          <FallbackMapPreview 
            center={route.mapState?.center || [146.0, -41.0]} 
            zoom={route.mapState?.zoom || 10}
            routes={route.routes}
            boundingBox={route.boundingBox}
          />
        )}
      </View>
      
      {/* Route info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{route.name || 'Unnamed Route'}</Text>
        <Text style={styles.details}>
          {route.metadata?.totalDistance ? `${route.metadata.totalDistance.toFixed(1)} km` : 
           route.routes && route.routes.length > 0 && route.routes[0].statistics?.totalDistance ? 
           `${(route.routes[0].statistics.totalDistance / 1000).toFixed(1)} km` : 
           'Unknown distance'}
          {route.type ? ` • ${route.type}` : ''}
        </Text>
        
        {/* Storage info */}
        <Text style={styles.storageInfo}>
          Size: {formatBytes(route.downloadSize || 0)}
        </Text>
        <Text style={styles.dateInfo}>
          Downloaded: {formatDate(route.downloadedAt)}
        </Text>
        
        {/* Download progress or View/Delete buttons */}
        {isCurrentlyDownloading ? (
          <View>
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#0066cc" style={styles.progressIndicator} />
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${Math.round((currentDownload?.progress || 0) * 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round((currentDownload?.progress || 0) * 100)}%
              </Text>
            </View>
            {currentDownload?.totalPacks && currentDownload.totalPacks > 1 && (
              <Text style={styles.packInfo}>
                Pack {currentDownload?.currentPack}/{currentDownload?.totalPacks} 
                {currentDownload?.packProgress ? ` (${Math.round(currentDownload.packProgress * 100)}%)` : ''}
              </Text>
            )}
          </View>
        ) : isInQueue ? (
          <View style={styles.queuedContainer}>
            <Text style={styles.queuedText}>Queued for download</Text>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={handleViewMap}
            >
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isDownloading}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  previewContainer: {
    width: 120,
    height: 120,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    paddingTop: 0, // Remove top padding to align with image top
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  storageInfo: {
    fontSize: 13,
    color: '#444',
  },
  dateInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Changed from space-between to flex-start
    marginTop: 8,
  },
  viewButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    marginRight: 4, // Reduced from 8 to 4 to make buttons closer
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
    height: 32, // Ensure it has a fixed height
  },
  progressIndicator: {
    marginRight: 8,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0066cc',
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0066cc',
    width: 40,
    textAlign: 'right',
  },
  queuedContainer: {
    marginTop: 8,
    paddingVertical: 6,
    backgroundColor: '#9C27B0',
    borderRadius: 4,
    alignItems: 'center',
  },
  queuedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  packInfo: {
    fontSize: 12,
    color: '#0066cc',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default memo(OfflineMapCard);
