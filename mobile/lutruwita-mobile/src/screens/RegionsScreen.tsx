import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useMapTilerOfflineMaps } from '../context/MapTilerOfflineMapsContext';
import { useMapTilerRegionService, Region } from '../services/mapTilerRegionService';
import { formatBytes } from '../utils/formatUtils';

export const RegionsScreen: React.FC = () => {
  const { 
    downloadedRegions, 
    downloadRegion, 
    deleteRegion, 
    isRegionDownloaded,
    isDownloading,
    currentDownload,
    storageUsed,
    clearAllDownloads,
    refreshDownloadedRegions,
    error
  } = useMapTilerOfflineMaps();
  
  const mapTilerRegionService = useMapTilerRegionService();
  const [regions, setRegions] = useState<Region[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Load regions on mount
  useEffect(() => {
    setRegions(mapTilerRegionService.getAvailableRegions());
  }, []);

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshDownloadedRegions();
    setRefreshing(false);
  };


  // Render a region item
  const renderRegionItem = ({ item }: { item: Region }) => {
    const downloaded = isRegionDownloaded(item.id);
    const isCurrentlyDownloading = currentDownload?.regionId === item.id;

    return (
      <View style={styles.regionCard}>
        <View style={styles.regionInfo}>
          <Text style={styles.regionName}>{item.name}</Text>
          <Text style={styles.regionSize}>
            {downloaded 
              ? `Size: ${formatBytes(item.downloadSize || 0)}`
              : `Estimated size: ${item.estimatedSize} MB`
            }
          </Text>
        </View>
        
        {downloaded ? (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => deleteRegion(item.id)}
            disabled={isDownloading}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        ) : isCurrentlyDownloading ? (
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
        ) : (
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={() => downloadRegion(item)}
            disabled={isDownloading}
          >
            <Text style={styles.buttonText}>Download</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Offline Regions</Text>
        <Text style={styles.storageInfo}>
          Total Storage: {formatBytes(storageUsed)}
        </Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <FlatList
        data={regions}
        renderItem={renderRegionItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />
      
      {downloadedRegions.length > 0 && (
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={clearAllDownloads}
          disabled={isDownloading}
        >
          <Text style={styles.clearButtonText}>Clear All Downloads</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  storageInfo: {
    fontSize: 14,
    color: '#666'
  },
  listContent: {
    paddingBottom: 16
  },
  regionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  regionInfo: {
    flex: 1
  },
  regionName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  regionSize: {
    fontSize: 14,
    color: '#666'
  },
  downloadButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4
  },
  deleteButton: {
    backgroundColor: '#cc3300',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 150
  },
  progressIndicator: {
    marginRight: 8
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0066cc'
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0066cc',
    width: 40,
    textAlign: 'right'
  },
  errorContainer: {
    backgroundColor: '#ffeeee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    color: '#cc3300'
  },
  clearButton: {
    backgroundColor: '#666',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default RegionsScreen;
