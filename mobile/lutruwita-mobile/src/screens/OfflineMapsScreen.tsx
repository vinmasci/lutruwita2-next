import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useOfflineMaps } from '../context/OfflineMapsContext';
import { useAuth } from '../context/AuthContext';
import OfflineMapCard from '../components/routes/OfflineMapCard';
import { formatBytes } from '../utils/formatUtils';
import { useFocusEffect } from '@react-navigation/native';

const OfflineMapsScreen: React.FC = () => {
  const { 
    downloadedMaps, 
    isDownloading, 
    refreshDownloadedMaps, 
    storageUsed,
    clearAllDownloads,
    testMapboxConnection,
    testMinimalRegion,
    error
  } = useOfflineMaps();
  
  const { isAuthenticated } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // Refresh when screen comes into focus, but only once and if not already downloading
  useFocusEffect(
    useCallback(() => {
      // Only refresh if not already downloading or refreshing to prevent infinite loops
      if (!isDownloading && !refreshing && !hasInitiallyLoaded) {
        console.log('[OfflineMapsScreen] Screen focused, refreshing maps');
        setHasInitiallyLoaded(true);
        refreshDownloadedMaps();
      }
    }, [refreshDownloadedMaps, isDownloading, refreshing, hasInitiallyLoaded])
  );
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDownloadedMaps();
    setRefreshing(false);
  }, [refreshDownloadedMaps]);
  
  // Handle clear all downloads
  const handleClearAll = async () => {
    if (downloadedMaps.length > 0) {
      await clearAllDownloads();
    }
  };
  
  // Handle test Mapbox connection
  const handleTestMapboxConnection = async () => {
    const result = await testMapboxConnection();
    Alert.alert(
      result ? "Connection Successful" : "Connection Failed",
      result 
        ? "Successfully connected to Mapbox and downloaded a test tile." 
        : "Failed to connect to Mapbox. Please check your internet connection and Mapbox access token."
    );
  };
  
  // Handle test minimal region download
  const handleTestMinimalRegion = async () => {
    const result = await testMinimalRegion();
    Alert.alert(
      result ? "Minimal Region Download Successful" : "Minimal Region Download Failed",
      result 
        ? "Successfully downloaded a minimal test region. This confirms that the Mapbox offline functionality is working correctly." 
        : "Failed to download a minimal test region. This indicates a problem with the Mapbox offline functionality."
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Storage usage indicator */}
      <View style={styles.storageContainer}>
        <Text style={styles.storageText}>
          Storage used: {formatBytes(storageUsed)}
        </Text>
        
        {downloadedMaps.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearAll}
            disabled={isDownloading}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {!isAuthenticated && (
            <Text style={styles.errorSubText}>
              Please sign in from the Profile tab to use offline maps.
            </Text>
          )}
        </View>
      )}
      
      {/* Test buttons - only show if authenticated */}
      {isAuthenticated && (
        <View style={styles.testButtonsContainer}>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={handleTestMapboxConnection}
            disabled={isDownloading}
          >
            <Text style={styles.testButtonText}>Test Mapbox Connection</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleTestMinimalRegion}
            disabled={isDownloading}
          >
            <Text style={styles.testButtonText}>Test Minimal Region Download</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* List of downloaded maps */}
      <FlatList
        data={downloadedMaps}
        renderItem={({ item }) => <OfflineMapCard route={item} />}
        keyExtractor={item => item.persistentId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isDownloading}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isDownloading 
                ? "Downloading map... Please wait." 
                : isAuthenticated 
                  ? "No offline maps yet. Download maps to view them offline."
                  : "Please sign in to use offline maps."}
            </Text>
            {!isAuthenticated && (
              <Text style={styles.emptySubText}>
                Go to the Profile tab to sign in.
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50, // Add padding to the top to fix the layout
  },
  storageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  storageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  clearButton: {
    backgroundColor: '#f44336',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderBottomWidth: 1,
    borderBottomColor: '#ffcdd2',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 4,
  },
  errorSubText: {
    color: '#c62828',
    fontSize: 12,
    fontStyle: 'italic',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  testButtonsContainer: {
    marginBottom: 8,
  },
  testButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    margin: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OfflineMapsScreen;
