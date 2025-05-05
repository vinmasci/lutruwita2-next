import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, SafeAreaView, Text as RNText } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  Text, 
  ActivityIndicator,
  useTheme as usePaperTheme
} from 'react-native-paper';
import POIDetailsDrawer from '../components/map/POIDetailsDrawer';
import PhotoViewerPolaroid from '../components/map/PhotoViewerPolaroid';
import RouteElevationDrawer from '../components/map/RouteElevationDrawer';
import MapHeader from '../components/map/MapHeader';
import { POI } from '../services/routeService';
import { useTheme } from '../theme';
import { useRoute } from '../context/RouteContext';
import { createMasterRoute } from '../utils/masterRouteUtils';
import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';
import { Mountain, WifiOff } from 'lucide-react-native';
import { ensureCorrectCoordinateOrder, ensureCorrectBoundingBox } from '../utils/coordinateUtils';
import POIMarker from '../components/map/POIMarker';
import DistanceMarker from '../components/map/DistanceMarker';
import { UnpavedSection } from '../services/routeService';
import { calculateDistanceMarkers } from '../utils/distanceMarkerUtils';
import { useOfflineMaps } from '../context/OfflineMapsContext';
import * as FileSystem from 'expo-file-system';
import { useMapTileRouteStorage } from '../services/mapTileRouteStorage';

// Initialize Mapbox
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Import GeoJSON types
import { Feature, FeatureCollection, Point, GeoJsonProperties, Geometry } from 'geojson';
import { 
  photosToGeoJSON, 
  isCluster, 
  isPhotoFeature, 
  getClusterRadius,
  ClusterFeatureProperties,
  PhotoFeatureProperties,
  Photo
} from '../utils/photoClusteringUtils';
import {
  sortPhotosByOriginalOrder,
  assignRouteInfoToPhotos,
  sortPhotosByRouteAndDistance
} from '../utils/photoSortingUtils';

// Define styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    marginTop: -20, // Increased negative margin to move it up even further
    zIndex: 20, // Higher than map (10) to ensure it's above
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    maxWidth: 100,
  },
  controlButtonsContainer: {
    position: 'absolute',
    left: 16,
    top: 120, // Adjusted to position below the header
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 40, // Reduced from 48px to 40px
    height: 40, // Reduced from 48px to 40px
    borderRadius: 20, // Adjusted to match new size
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12, // Add spacing between buttons
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  retryButton: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#ff3b30',
    fontWeight: 'bold',
  },
  offlineIndicator: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 15,
  },
  offlineText: {
    color: '#ffffff',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
  }
});

const OfflineMapScreen = ({ route, navigation }: any) => {
  const { isDark } = useTheme();
  const paperTheme = usePaperTheme();
  const { downloadedMaps } = useOfflineMaps();
  const mapTileRouteStorage = useMapTileRouteStorage();
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<Error | null>(null);
  const [mapKey, setMapKey] = useState<number>(0);
  const [mapReady, setMapReady] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(9);
  const [activeRouteIndex, setActiveRouteIndex] = useState(-1);
  const [photos, setPhotos] = useState<any[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(-1);
  const [offlineStyle, setOfflineStyle] = useState<any>(null);
  
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  
  // Get the mapId from route params
  const { mapId } = route.params;
  
  // Find the selected map from downloaded maps
  const mapDetails = useMemo(() => {
    return downloadedMaps.find(map => map.persistentId === mapId) || null;
  }, [downloadedMaps, mapId]);

  // Set up the offline style when the component mounts
  useEffect(() => {
    if (mapId) {
      // Get the offline style configuration
      const style = mapTileRouteStorage.configureOfflineMap(mapId);
      console.log(`[OfflineMapScreen] Using offline style for route ${mapId}`);
      setOfflineStyle(style);
    }
  }, [mapId, mapTileRouteStorage]);
  
  // Effect to handle initial camera positioning when map is ready
  useEffect(() => {
    if (mapReady && mapDetails && cameraRef.current) {
      console.log('[OfflineMapScreen] Map is ready, positioning camera to route');
      
      // Check if we have routes to fit to
      if (mapDetails.routes && mapDetails.routes.length > 0) {
        // Get the first route with a valid geojson
        const routeWithGeojson = mapDetails.routes.find(r => r.geojson);
        
        if (routeWithGeojson && routeWithGeojson.geojson) {
          console.log('[OfflineMapScreen] Found route with geojson, fitting to route bounds');
          
          // Get the coordinates from the route's geojson
          const coordinates = routeWithGeojson.geojson.features[0].geometry.coordinates;
          
          if (coordinates && coordinates.length > 0) {
            // Find the bounds of the route
            let minLng = coordinates[0][0];
            let maxLng = coordinates[0][0];
            let minLat = coordinates[0][1];
            let maxLat = coordinates[0][1];
            
            coordinates.forEach((coord: [number, number]) => {
              minLng = Math.min(minLng, coord[0]);
              maxLng = Math.max(maxLng, coord[0]);
              minLat = Math.min(minLat, coord[1]);
              maxLat = Math.max(maxLat, coord[1]);
            });
            
            // Add some padding to the bounds
            const padding = 0.01; // About 1km
            minLng -= padding;
            maxLng += padding;
            minLat -= padding;
            maxLat += padding;
            
            console.log(`[OfflineMapScreen] Route bounds: SW(${minLng},${minLat}), NE(${maxLng},${maxLat})`);
            
            // Fit the camera to the route bounds
            cameraRef.current.fitBounds(
              [minLng, minLat],
              [maxLng, maxLat],
              100, // padding in pixels
              1000 // animation duration
            );
            return;
          }
        }
      }
      
      // Fallback to using the bounding box if available
      if (mapDetails.boundingBox) {
        console.log('[OfflineMapScreen] Using map bounding box');
        const correctedBoundingBox = ensureCorrectBoundingBox(mapDetails.boundingBox);
        
        cameraRef.current.fitBounds(
          correctedBoundingBox[0],
          correctedBoundingBox[1],
          100, // padding
          1000 // animation duration
        );
        return;
      }
      
      // Last resort: use the map state center and zoom
      console.log('[OfflineMapScreen] Using map state center and zoom');
      cameraRef.current.setCamera({
        centerCoordinate: mapDetails.mapState?.center 
          ? ensureCorrectCoordinateOrder(mapDetails.mapState.center) 
          : ensureCorrectCoordinateOrder([146.8087, -41.4419]),
        zoomLevel: mapDetails.mapState?.zoom || 12,
        animationDuration: 1000
      });
    }
  }, [mapReady, mapDetails]);
  
  // Handle map errors
  const handleMapError = useCallback((error: Error) => {
    console.error('Map error in OfflineMapScreen:', error);
    setMapError(error);
  }, []);
  
  // Retry loading the map
  const retryMap = useCallback(() => {
    setMapError(null);
    setMapKey(prev => prev + 1); // Change key to force remount
  }, []);
  
  // Convert photos to GeoJSON format for ShapeSource
  const photoGeoJSON = useMemo(() => photosToGeoJSON(photos), [photos]);
  
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
        <Text style={{ color: paperTheme.colors.error }}>Offline map not found</Text>
        <TouchableOpacity 
          style={{
            backgroundColor: paperTheme.colors.primary,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
            marginTop: 16
          }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading indicator if offline style is not ready
  if (!offlineStyle) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={paperTheme.colors.primary} />
        <Text style={{ marginTop: 16 }}>Preparing offline map...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Full-screen Map */}
      <View style={styles.mapFullContainer}>
        <MapboxGL.MapView 
          key={`map-${mapKey}`}
          ref={mapRef}
          style={styles.mapFull}
          styleURL={offlineStyle}
          onDidFinishLoadingMap={() => setMapReady(true)}
          onMapLoadingError={() => handleMapError(new Error('Map failed to load'))}
          onRegionDidChange={(region) => {
            if (region.properties && region.properties.zoomLevel) {
              setCurrentZoom(region.properties.zoomLevel);
            }
          }}
          compassEnabled={true}
          attributionEnabled={true}
          logoEnabled={true}
          scrollEnabled={true}
          pitchEnabled={is3DMode}
          rotateEnabled={true}
          zoomEnabled={true}
        >
          {/* Camera component */}
          <MapboxGL.Camera
            ref={cameraRef}
            zoomLevel={mapDetails.mapState?.zoom || 9}
            centerCoordinate={
              mapDetails.mapState?.center 
                ? ensureCorrectCoordinateOrder(mapDetails.mapState.center) 
                : ensureCorrectCoordinateOrder([146.8087, -41.4419])
            }
            pitch={is3DMode ? 60 : 0}
            animationDuration={0}
            maxZoomLevel={16}
            minZoomLevel={5}
          />
          
          {/* Display routes */}
          {mapDetails.routes && mapDetails.routes.map((routeData, routeIndex) => {
            if (!routeData.geojson) return null;
            
            return (
              <MapboxGL.ShapeSource
                key={`route-source-${routeData.routeId || routeIndex}`}
                id={`route-source-${routeData.routeId || routeIndex}`}
                shape={routeData.geojson}
              >
                <MapboxGL.LineLayer
                  id={`route-border-${routeData.routeId || routeIndex}`}
                  style={{
                    lineColor: '#ffffff',
                    lineWidth: 6,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
                <MapboxGL.LineLayer
                  id={`route-line-${routeData.routeId || routeIndex}`}
                  style={{
                    lineColor: routeData.color || '#ff4d4d',
                    lineWidth: 4,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              </MapboxGL.ShapeSource>
            );
          })}
        </MapboxGL.MapView>
      </View>
      
      {/* Map Loading Overlay */}
      {!mapReady && !mapError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
      
      {/* Map Header */}
      {mapDetails && (
        <View style={styles.headerContainer}>
          <MapHeader
            title={mapDetails.name || 'Untitled Map'}
            color={mapDetails.headerSettings?.color || '#ff4d4d'}
            logoUrl={mapDetails.headerSettings?.logoUrl}
            username={mapDetails.headerSettings?.username}
            onBack={() => navigation.goBack()}
          />
        </View>
      )}
      
      {/* Map Control Buttons */}
      <View style={styles.controlButtonsContainer}>
        {/* 3D Toggle Button */}
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setIs3DMode(!is3DMode)}
        >
          <Text style={{ 
            color: is3DMode ? "#ff9500" : "#fff",
            fontWeight: 'bold',
            fontSize: 14
          }}>
            3D
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Offline Indicator */}
      <View style={styles.offlineIndicator}>
        <WifiOff size={16} color="#ffffff" />
        <Text style={styles.offlineText}>Offline</Text>
      </View>
      
      {/* Error Message */}
      {mapError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Map error: {mapError.message}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={retryMap}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* POI Details Drawer */}
      <POIDetailsDrawer 
        poi={selectedPOI} 
        onClose={() => setSelectedPOI(null)} 
      />
      
      {/* Photo Viewer */}
      {photos.length > 0 && (
        <PhotoViewerPolaroid 
          photos={photos}
          currentPhotoIndex={currentPhotoIndex}
          routeCount={mapDetails?.routes?.length || 0}
          onClose={() => setCurrentPhotoIndex(-1)}
          onNavigateToPhoto={(index: number) => setCurrentPhotoIndex(index)}
        />
      )}
      
      {/* Route Elevation Drawer */}
      {mapDetails && mapDetails.routes && mapDetails.routes.length > 0 && (
        <RouteElevationDrawer 
          onHeightChange={() => {}}
          isCollapsed={currentPhotoIndex >= 0}
          onRouteSelect={(routeIndex) => setActiveRouteIndex(routeIndex)}
        />
      )}
    </SafeAreaView>
  );
};

export default OfflineMapScreen;
