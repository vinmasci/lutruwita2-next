import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouteSpecificOfflineMaps } from '../context/RouteSpecificOfflineMapsContext';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
// Define navigation types for this screen
type RootStackParamList = {
  Main: undefined;
  Map: { routeId: string };
  MapScreen: { routeId: string };
  ProfileScreen: undefined;
  HomeScreen: undefined;
};

type MainTabParamList = {
  Home: undefined;
  SavedRoutes: undefined;
  Downloads: undefined;
  Regions: undefined;
  Profile: undefined;
};

type OfflineRoutesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Downloads'>,
  NativeStackNavigationProp<RootStackParamList>
>;
import { formatBytes, formatDate } from '../utils/formatUtils';
import { Ionicons } from '@expo/vector-icons';
import { loadPublicRoute, RouteMap } from '../services/routeService';
import { useAuth } from '../context/AuthContext';

interface OfflineRouteItemProps {
  routeId: string;
  onPress: () => void;
  onDelete: () => void;
  metadata: {
    downloadedAt: Date;
    size: number;
    tilesCount: number;
  } | null;
  route: RouteMap | null;
  isLoading: boolean;
}

const OfflineRouteItem: React.FC<OfflineRouteItemProps> = ({
  routeId,
  onPress,
  onDelete,
  metadata,
  route,
  isLoading
}) => {
  return (
    <TouchableOpacity
      style={styles.routeItem}
      onPress={onPress}
      disabled={isLoading}
    >
      <View style={styles.routeInfo}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0066cc" />
            <Text style={styles.loadingText}>Loading route info...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.routeName}>{route?.name || 'Unknown Route'}</Text>
            <Text style={styles.routeDetails}>
              {metadata ? `${formatBytes(metadata.size)} • ${metadata.tilesCount} tiles` : 'No metadata available'}
            </Text>
            <Text style={styles.routeDate}>
              {metadata ? `Downloaded: ${formatDate(metadata.downloadedAt)}` : ''}
            </Text>
          </>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
        disabled={isLoading}
      >
        <Ionicons name="trash-outline" size={24} color="#ff3b30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const OfflineRoutesScreen: React.FC = () => {
  const {
    downloadedRoutes,
    deleteRoute,
    refreshDownloadedRoutes,
    clearAllDownloads,
    isDownloading,
    storageUsed,
    error,
    getAllRouteMetadata
  } = useRouteSpecificOfflineMaps();
  
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<OfflineRoutesScreenNavigationProp>();
  
  const [refreshing, setRefreshing] = useState(false);
  const [routeData, setRouteData] = useState<Record<string, RouteMap | null>>({});
  const [loadingRoutes, setLoadingRoutes] = useState<Record<string, boolean>>({});
  const [routeMetadata, setRouteMetadata] = useState<Record<string, any>>({});

  // Load route data and metadata for downloaded routes
  useEffect(() => {
    const loadRoutes = async () => {
      const newLoadingState: Record<string, boolean> = {};
      
      // Mark all routes as loading
      downloadedRoutes.forEach(routeId => {
        newLoadingState[routeId] = true;
      });
      
      setLoadingRoutes(newLoadingState);
      
      // Get all route metadata
      const metadata = getAllRouteMetadata();
      setRouteMetadata(metadata);
      
      // Load route data for each downloaded route
      for (const routeId of downloadedRoutes) {
        try {
          const route = await loadPublicRoute(routeId);
          setRouteData(prev => ({
            ...prev,
            [routeId]: route
          }));
        } catch (error) {
          console.error(`Error loading route ${routeId}:`, error);
          setRouteData(prev => ({
            ...prev,
            [routeId]: null
          }));
        } finally {
          setLoadingRoutes(prev => ({
            ...prev,
            [routeId]: false
          }));
        }
      }
    };
    
    if (downloadedRoutes.length > 0) {
      loadRoutes();
    }
  }, [downloadedRoutes, getAllRouteMetadata]);

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshDownloadedRoutes();
    setRefreshing(false);
  };

  // Handle route press
  const handleRoutePress = (routeId: string) => {
    const route = routeData[routeId];
    if (route) {
      // Navigate to route detail screen
      navigation.navigate('MapScreen', { routeId });
    }
  };

  // Handle route delete
  const handleRouteDelete = (routeId: string) => {
    Alert.alert(
      'Delete Offline Route',
      'Are you sure you want to delete this offline route? You will need an internet connection to view it again.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRoute(routeId);
            // Remove from local state
            setRouteData(prev => {
              const newData = { ...prev };
              delete newData[routeId];
              return newData;
            });
          }
        }
      ]
    );
  };

  // Handle clear all
  const handleClearAll = () => {
    if (downloadedRoutes.length === 0) {
      return;
    }
    
    Alert.alert(
      'Clear All Offline Routes',
      'Are you sure you want to delete all offline routes? You will need an internet connection to view them again.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllDownloads();
            setRouteData({});
          }
        }
      ]
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (!isAuthenticated) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptyText}>
            Please sign in to use offline maps.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('ProfileScreen')}
          >
            <Text style={styles.emptyButtonText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (isDownloading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.emptyTitle}>Loading...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff3b30" />
          <Text style={styles.emptyTitle}>Error</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={onRefresh}
          >
            <Text style={styles.emptyButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="map-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Offline Routes</Text>
        <Text style={styles.emptyText}>
          You haven't downloaded any routes for offline use yet.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.emptyButtonText}>Browse Routes</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Offline Routes</Text>
        {downloadedRoutes.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {downloadedRoutes.length > 0 && (
        <View style={styles.storageInfo}>
          <Text style={styles.storageText}>
            Storage used: {formatBytes(storageUsed)}
          </Text>
          <Text style={styles.routeCountText}>
            {downloadedRoutes.length} {downloadedRoutes.length === 1 ? 'route' : 'routes'} available offline
          </Text>
        </View>
      )}
      
      <FlatList
        data={downloadedRoutes}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <OfflineRouteItem
            routeId={item}
            onPress={() => handleRoutePress(item)}
            onDelete={() => handleRouteDelete(item)}
            metadata={routeMetadata[item] || null}
            route={routeData[item] || null}
            isLoading={loadingRoutes[item] || false}
          />
        )}
        contentContainerStyle={downloadedRoutes.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0066cc']}
            tintColor="#0066cc"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333'
  },
  clearButton: {
    padding: 8
  },
  clearButtonText: {
    color: '#ff3b30',
    fontWeight: '600'
  },
  storageInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  storageText: {
    fontSize: 14,
    color: '#666'
  },
  routeCountText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  list: {
    paddingHorizontal: 16
  },
  emptyList: {
    flex: 1
  },
  routeItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  routeInfo: {
    flex: 1
  },
  routeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  routeDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  routeDate: {
    fontSize: 12,
    color: '#999'
  },
  deleteButton: {
    justifyContent: 'center',
    paddingLeft: 16
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24
  },
  emptyButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  }
});

export default OfflineRoutesScreen;
