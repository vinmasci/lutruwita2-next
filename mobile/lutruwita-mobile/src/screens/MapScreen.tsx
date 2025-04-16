import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Animated, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  Text, 
  Button, 
  IconButton,
  Appbar,
  useTheme as usePaperTheme,
  ActivityIndicator,
  FAB,
  Surface,
  Divider,
  Chip,
  Banner
} from 'react-native-paper';
import { useTheme } from '../theme';
import MapView from '../components/map/MapView';
import { useMap } from '../context/MapContext';
import { useRoute } from '../context/RouteContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

const MapScreen = ({ route, navigation }: any) => {
  const { isDark } = useTheme();
  const paperTheme = usePaperTheme();
  const { routeState, loadRoute } = useRoute();
  const [isLoading, setIsLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [mapError, setMapError] = useState<Error | null>(null);
  const [mapKey, setMapKey] = useState<number>(0); // Used to force map remount on retry
  
  // Animation values
  const infoSlideAnim = useRef(new Animated.Value(0)).current;
  const controlsOpacityAnim = useRef(new Animated.Value(1)).current;
  
  const { mapId } = route.params;
  
  // Load the route when the component mounts
  useEffect(() => {
    const fetchRoute = async () => {
      // Skip if already loading or if we already have this route loaded
      if (isLoading || (routeState.selectedRoute && routeState.selectedRoute.persistentId === mapId)) {
        return;
      }
      
      setIsLoading(true);
      try {
        await loadRoute(mapId);
      } catch (error) {
        console.error('Error loading route:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRoute();
  }, [mapId, loadRoute, isLoading, routeState.selectedRoute]);
  
  // Get the selected route from the route context
  const mapDetails = routeState.selectedRoute;
  
  // Toggle info panel with animation
  const toggleInfo = () => {
    const newShowInfo = !showInfo;
    setShowInfo(newShowInfo);
    
    Animated.timing(infoSlideAnim, {
      toValue: newShowInfo ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  
  // Toggle map controls with animation
  const toggleControls = () => {
    const newShowControls = !showControls;
    setShowControls(newShowControls);
    
    Animated.timing(controlsOpacityAnim, {
      toValue: newShowControls ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };
  
  // Format distance for display
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };
  
  // Format elevation for display
  const formatElevation = (meters: number) => {
    return `${Math.round(meters)} m`;
  };
  
  // Handle map errors
  const handleMapError = useCallback((error: Error) => {
    console.error('Map error in MapScreen:', error);
    setMapError(error);
  }, []);
  
  // Retry loading the map
  const retryMap = useCallback(() => {
    setMapError(null);
    setMapKey(prev => prev + 1); // Change key to force remount
  }, []);
  
  // Show loading indicator while fetching route data
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={paperTheme.colors.primary} />
        <Text style={{ marginTop: 16 }}>Loading map data...</Text>
      </View>
    );
  }
  
  // Show error message if route not found
  if (!mapDetails) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: paperTheme.colors.error }}>Map not found</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16 }}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Map Error Banner */}
      {mapError && (
        <Banner
          visible={true}
          icon="map-marker-alert"
          actions={[
            {
              label: 'Retry',
              onPress: retryMap,
            },
          ]}
          style={styles.errorBanner}
        >
          Map loading error: {mapError.message}
        </Banner>
      )}
      
      {/* Full-screen Map */}
      <View style={styles.mapFullContainer}>
        <MapView 
          key={`map-${mapKey}`} // Force remount on retry
          initialCenter={mapDetails.mapState?.center || [146.8087, -41.4419]}
          initialZoom={mapDetails.mapState?.zoom || 9}
          showUserLocation={true}
          style={styles.mapFull}
          routeId={mapDetails.persistentId}
          onError={handleMapError}
        />
      </View>
      
      {/* Header Bar */}
      <Appbar style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={mapDetails.name} />
        <Appbar.Action icon="information" onPress={toggleInfo} />
        <Appbar.Action icon="map-legend" onPress={toggleControls} />
      </Appbar>
      
      {/* Info Panel - Animated */}
      <Animated.View 
        style={[
          styles.infoPanel,
          { 
            backgroundColor: paperTheme.colors.surface,
            transform: [{ translateY: infoSlideAnim }]
          }
        ]}
      >
        <Surface style={styles.infoContent}>
          <Text style={styles.infoTitle}>{mapDetails.name}</Text>
          
          {/* Route Type */}
          {mapDetails.type && (
            <Chip 
              style={[styles.typeChip, { backgroundColor: paperTheme.colors.primary }]}
              textStyle={{ color: '#fff' }}
            >
              {mapDetails.type.charAt(0).toUpperCase() + mapDetails.type.slice(1)}
            </Chip>
          )}
          
          <Divider style={styles.divider} />
          
          {/* Route Stats */}
          <View style={styles.statsContainer}>
            {/* Distance */}
            {mapDetails.metadata?.totalDistance && (
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="map-marker-distance" size={24} color={paperTheme.colors.primary} />
                <View style={styles.statTextContainer}>
                  <Text style={styles.statLabel}>Distance</Text>
                  <Text style={styles.statValue}>{mapDetails.metadata.totalDistance} km</Text>
                </View>
              </View>
            )}
            
            {/* Elevation */}
            {mapDetails.metadata?.totalAscent && (
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="elevation-rise" size={24} color={paperTheme.colors.primary} />
                <View style={styles.statTextContainer}>
                  <Text style={styles.statLabel}>Elevation Gain</Text>
                  <Text style={styles.statValue}>{mapDetails.metadata.totalAscent} m</Text>
                </View>
              </View>
            )}
            
            {/* Surface */}
            {mapDetails.metadata?.unpavedPercentage !== undefined && (
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="road-variant" size={24} color={paperTheme.colors.primary} />
                <View style={styles.statTextContainer}>
                  <Text style={styles.statLabel}>Unpaved</Text>
                  <Text style={styles.statValue}>{mapDetails.metadata.unpavedPercentage}%</Text>
                </View>
              </View>
            )}
            
            {/* Loop/Point-to-Point */}
            {mapDetails.metadata?.isLoop !== undefined && (
              <View style={styles.statItem}>
                <MaterialCommunityIcons 
                  name={mapDetails.metadata.isLoop ? "sync" : "ray-start-end"} 
                  size={24} 
                  color={paperTheme.colors.primary} 
                />
                <View style={styles.statTextContainer}>
                  <Text style={styles.statLabel}>Type</Text>
                  <Text style={styles.statValue}>{mapDetails.metadata.isLoop ? 'Loop' : 'Point-to-Point'}</Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Location */}
          {mapDetails.metadata?.state && (
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons name="map-marker" size={20} color={paperTheme.colors.primary} />
              <Text style={styles.locationText}>
                {mapDetails.metadata.state}, Australia
              </Text>
            </View>
          )}
          
          {/* Creator */}
          {mapDetails.createdBy?.name && (
            <View style={styles.creatorContainer}>
              <MaterialCommunityIcons name="account" size={20} color={paperTheme.colors.primary} />
              <Text style={styles.creatorText}>
                Created by {mapDetails.createdBy.name}
              </Text>
            </View>
          )}
        </Surface>
      </Animated.View>
      
      {/* Map Controls - Animated */}
      <Animated.View 
        style={[
          styles.mapControls,
          { opacity: controlsOpacityAnim }
        ]}
      >
        <Surface style={styles.controlsPanel}>
          <IconButton
            icon="compass"
            size={24}
            onPress={() => console.log('Reset orientation')}
          />
          <IconButton
            icon="crosshairs-gps"
            size={24}
            onPress={() => console.log('Show user location')}
          />
          <IconButton
            icon="map"
            size={24}
            onPress={() => console.log('Change map style')}
          />
          <IconButton
            icon="layers"
            size={24}
            onPress={() => console.log('Toggle layers')}
          />
        </Surface>
      </Animated.View>
      
      {/* Download FAB - disabled for now */}
      {/* <FAB
        icon="download"
        style={[styles.fab, { backgroundColor: paperTheme.colors.primary }]}
        onPress={() => console.log('Download for offline use')}
      /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorBanner: {
    position: 'absolute',
    top: 56, // Below the app bar
    left: 0,
    right: 0,
    zIndex: 15, // Above other UI elements
  },
  appbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
    elevation: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  mapFullContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapFull: {
    flex: 1,
  },
  infoPanel: {
    position: 'absolute',
    top: 56, // Below the app bar
    left: 0,
    right: 0,
    zIndex: 5,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  infoContent: {
    padding: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  typeChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  statsContainer: {
    marginVertical: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTextContainer: {
    marginLeft: 12,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  creatorText: {
    marginLeft: 8,
    fontSize: 14,
  },
  mapControls: {
    position: 'absolute',
    top: 80,
    right: 16,
    zIndex: 5,
  },
  controlsPanel: {
    borderRadius: 8,
    padding: 8,
    elevation: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default MapScreen;
