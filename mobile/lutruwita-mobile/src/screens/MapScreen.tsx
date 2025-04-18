import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, SafeAreaView } from 'react-native';
import POIMarker from '../components/map/POIMarker';
import { StatusBar } from 'expo-status-bar';
import { 
  Text, 
  ActivityIndicator,
  useTheme as usePaperTheme
} from 'react-native-paper';
import { useTheme } from '../theme';
import { useRoute } from '../context/RouteContext';
import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';
import { ArrowLeft, Layers, Mountain } from 'lucide-react-native';
import { ensureCorrectCoordinateOrder, ensureCorrectBoundingBox } from '../utils/coordinateUtils';
import { UnpavedSection } from '../services/routeService';
import { MAP_STYLES } from '../config/mapbox';

// Initialize Mapbox
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Get screen dimensions
const { width, height } = Dimensions.get('window');

const MapScreen = ({ route, navigation }: any) => {
  const { isDark } = useTheme();
  const paperTheme = usePaperTheme();
  const { routeState, loadRoute } = useRoute();
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<Error | null>(null);
  const [mapKey, setMapKey] = useState<number>(0); // Used to force map remount on retry
  const [mapReady, setMapReady] = useState(false);
  const [currentMapStyle, setCurrentMapStyle] = useState(MAP_STYLES.SATELLITE_STREETS);
  const [is3DMode, setIs3DMode] = useState(false);
  
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
        <TouchableOpacity 
          style={styles.errorBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Full-screen Map */}
      <View style={styles.mapFullContainer}>
        <MapboxGL.MapView 
          key={`map-${mapKey}`} // Force remount on retry
          style={styles.mapFull}
          styleURL={currentMapStyle}
          onDidFinishLoadingMap={() => {
            console.log('[MapScreen] Map finished loading');
            setMapReady(true);
          }}
          onDidFailLoadingMap={() => {
            console.error('[MapScreen] Map failed to load');
            handleMapError(new Error('Map failed to load'));
          }}
          compassEnabled={true}
          attributionEnabled={true}
          logoEnabled={true}
          scrollEnabled={true}
          pitchEnabled={is3DMode}
          rotateEnabled={true}
          zoomEnabled={true}
        >
          {/* Terrain source and configuration */}
          <MapboxGL.RasterDemSource
            id="mapbox-dem"
            url="mapbox://mapbox.mapbox-terrain-dem-v1"
            tileSize={512}
            maxZoomLevel={14}
          />
          
          {/* Terrain with exaggeration when 3D mode is enabled */}
          {is3DMode && (
            <MapboxGL.Terrain
              sourceID="mapbox-dem"
              style={{
                exaggeration: 1.5 // Fixed exaggeration value
              }}
            />
          )}
          {/* Use the bounding box for initial camera position if available */}
          {mapDetails.boundingBox ? (
            <MapboxGL.Camera
              ref={(ref) => {
                if (ref && mapReady && mapDetails.boundingBox) {
                  // Use the bounding box to fit the camera with corrected coordinates
                  const correctedBoundingBox = ensureCorrectBoundingBox(mapDetails.boundingBox);
                  console.log('[MapScreen] Using corrected bounding box:', correctedBoundingBox);
                  
                  ref.fitBounds(
                    correctedBoundingBox[0],
                    correctedBoundingBox[1],
                    100, // padding
                    0 // No animation for initial positioning
                  );
                }
              }}
              pitch={is3DMode ? 60 : 0}
              animationDuration={0}
              maxZoomLevel={16}
              minZoomLevel={5}
            />
          ) : (
            // Fallback to center coordinate if no bounding box is available
            <MapboxGL.Camera
              zoomLevel={mapDetails.mapState?.zoom || 9}
              centerCoordinate={
                mapDetails.mapState?.center 
                  ? ensureCorrectCoordinateOrder(mapDetails.mapState.center) 
                  : ensureCorrectCoordinateOrder([146.8087, -41.4419])
              }
              pitch={is3DMode ? 60 : 0}
              animationDuration={0}
            />
          )}
          
          {/* Display all routes */}
          {mapDetails.routes && mapDetails.routes.length > 0 && (
            <>
              {/* Map over all routes */}
              {mapDetails.routes.map((routeData, routeIndex) => (
                routeData.geojson && (
                  <React.Fragment key={`route-fragment-${routeData.routeId || routeIndex}`}>
                    {/* Main route */}
                    <MapboxGL.ShapeSource
                      id={`route-source-${routeData.routeId || routeIndex}`}
                      shape={routeData.geojson}
                    >
                      {/* Border line (white outline) */}
                      <MapboxGL.LineLayer
                        id={`route-border-${routeData.routeId || routeIndex}`}
                        style={{
                          lineColor: '#ffffff',
                          lineWidth: 6,
                          lineCap: 'round',
                          lineJoin: 'round'
                        }}
                      />
                      {/* Main route line */}
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
                    
                    {/* Unpaved/Gravel sections for this route */}
                    {routeData.unpavedSections && routeData.unpavedSections.map((section: UnpavedSection, index: number) => (
                      <MapboxGL.ShapeSource
                        key={`unpaved-source-${routeData.routeId || routeIndex}-${index}`}
                        id={`unpaved-source-${routeData.routeId || routeIndex}-${index}`}
                        shape={{
                          type: 'Feature',
                          properties: {},
                          geometry: {
                            type: 'LineString',
                            coordinates: section.coordinates
                          }
                        }}
                      >
                        {/* White dots/dashes for gravel sections */}
                        <MapboxGL.LineLayer
                          id={`unpaved-line-${routeData.routeId || routeIndex}-${index}`}
                          style={{
                            lineColor: '#ffffff',
                            lineWidth: 2,
                            lineCap: 'round',
                            lineJoin: 'round',
                            lineDasharray: [1, 3], // Small white dots with larger gaps
                            lineOpacity: 1
                          }}
                        />
                      </MapboxGL.ShapeSource>
                    ))}
                  </React.Fragment>
                )
              ))}
            </>
          )}
          
          {/* Display POIs - Basic Implementation */}
          {mapDetails.pois && mapDetails.pois.draggable && mapDetails.pois.draggable.length > 0 && (
            <>
              {/* Render draggable POIs */}
              {mapDetails.pois.draggable.map((poi) => (
                <MapboxGL.PointAnnotation
                  key={`poi-${poi.id}`}
                  id={`poi-${poi.id}`}
                  coordinate={ensureCorrectCoordinateOrder(poi.coordinates)}
                  title={poi.name}
                >
                  <POIMarker poi={poi} />
                </MapboxGL.PointAnnotation>
              ))}
            </>
          )}
        </MapboxGL.MapView>
      </View>
      
      {/* Map Status */}
      {!mapReady && !mapError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
      
      {/* 3D Toggle Button */}
      <TouchableOpacity 
        style={[styles.backButton, { bottom: 148 }]}
        onPress={() => {
          // Simply toggle between 2D and 3D mode
          setIs3DMode(!is3DMode);
        }}
      >
        <Mountain 
          size={24} 
          color={is3DMode ? "#ff9500" : "#fff"} 
        />
      </TouchableOpacity>
      
      {/* Map Style Toggle Button */}
      <TouchableOpacity 
        style={[styles.backButton, { bottom: 90 }]}
        onPress={() => {
          // Cycle through satellite streets, outdoors, light, dark
          if (currentMapStyle === MAP_STYLES.SATELLITE_STREETS) {
            setCurrentMapStyle(MAP_STYLES.OUTDOORS);
          } else if (currentMapStyle === MAP_STYLES.OUTDOORS) {
            setCurrentMapStyle(MAP_STYLES.LIGHT);
          } else if (currentMapStyle === MAP_STYLES.LIGHT) {
            setCurrentMapStyle(MAP_STYLES.DARK);
          } else {
            setCurrentMapStyle(MAP_STYLES.SATELLITE_STREETS);
          }
        }}
      >
        <Layers size={24} color="#fff" />
      </TouchableOpacity>
      
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <ArrowLeft size={24} color="#fff" />
      </TouchableOpacity>
      
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
    </SafeAreaView>
  );
};

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
  backButton: {
    position: 'absolute',
    left: 16,
    bottom: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
  errorBackButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  errorBackButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default MapScreen;
