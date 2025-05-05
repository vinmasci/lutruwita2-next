import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  Text, 
  Searchbar, 
  useTheme as usePaperTheme,
  ActivityIndicator,
  IconButton
} from 'react-native-paper';
import { useTheme } from '../theme';
import { useRoute } from '../context/RouteContext';
import { useDynamicRouteFilters } from '../hooks/useDynamicRouteFilters';
import MapTypeSelector from '../components/filters/MapTypeSelector';
import FilterDrawer from '../components/filters/FilterDrawer';
import RoutePreviewDrawer from '../components/map/RoutePreviewDrawer';
import RouteListDrawer from '../components/map/RouteListDrawer';
import { RouteMap } from '../services/routeService';
import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES } from '../config/mapbox';
import { MapPin, Navigation, Map, SlidersHorizontal } from 'lucide-react-native';
import { ensureCorrectCoordinateOrder, ensureCorrectBoundingBox } from '../utils/coordinateUtils';
import RouteMarker from '../components/map/RouteMarker';

// Import GeoJSON types
import { Feature, FeatureCollection, Point, GeoJsonProperties, Geometry } from 'geojson';
import { 
  routesToGeoJSON, 
  isCluster, 
  isRouteFeature, 
  getClusterRadius,
  ClusterFeatureProperties,
  RouteFeatureProperties
} from '../utils/routeClusteringUtils';

// Initialize Mapbox
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const HomeScreen = ({ navigation }: any) => {
  const { isDark } = useTheme();
  const paperTheme = usePaperTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const { routeState, loadRoutes } = useRoute();
  
  // Map state
  const [mapReady, setMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(6); // Default zoom level
  const [currentMapStyle, setCurrentMapStyle] = useState(MAP_STYLES.OUTDOORS);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteMap | null>(null);
  const [fullDisplayRouteId, setFullDisplayRouteId] = useState<string | null>(null);
  const [routeListVisible, setRouteListVisible] = useState<boolean>(false);
  
  // Refs for map components
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  
  // Use the dynamic route filters hook
  const {
    selectedMapType,
    setSelectedMapType,
    searchTerm,
    setSearchTerm,
    selectedState,
    setSelectedState,
    selectedRegion,
    setSelectedRegion,
    surfaceType,
    setSurfaceType,
    distanceFilter,
    setDistanceFilter,
    routeTypeFilter,
    setRouteTypeFilter,
    availableFilters,
    availableStates,
    availableRegions,
    availableMapTypes,
    displayedRoutes,
    hasMore,
    loadMoreRoutes,
    getActiveFilterCount
  } = useDynamicRouteFilters(routeState.routes);
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRoutes();
    } catch (error) {
      console.error('Error refreshing routes:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSelectedState('');
    setSelectedRegion('');
    setSurfaceType('all');
    setDistanceFilter('any');
    setRouteTypeFilter('all');
  };
  
  // Handle viewing the full route on the current map
  const handleViewFullRoute = (route: RouteMap) => {
    // Close the preview drawer
    setSelectedRoute(null);
    
    // Set the ID of the route to display fully on the map
    setFullDisplayRouteId(route.persistentId);
    
    // Optionally, adjust camera to fit the route bounds if available
    if (cameraRef.current && route.boundingBox) {
      const bounds = ensureCorrectBoundingBox(route.boundingBox);
      cameraRef.current.fitBounds(bounds[0], bounds[1], [60, 60, 180, 60], 500); // Add padding
    } else if (cameraRef.current && route.mapState?.center) {
      // Check if the center coordinates are valid (not [0,0])
      const isValidCenter = route.mapState.center[0] !== 0 || route.mapState.center[1] !== 0;
      
      if (isValidCenter) {
          // Fallback to centering if no bounding box and coordinates are valid
          cameraRef.current.setCamera({
            centerCoordinate: ensureCorrectCoordinateOrder(route.mapState.center),
            zoomLevel: currentZoom, // Maintain current zoom level
            animationDuration: 500,
          });
      } else {
        // If center is [0,0], use Tasmania as default
        console.log('[HomeScreen] Invalid center coordinates [0,0] in handleViewFullRoute, using Tasmania');
        cameraRef.current.setCamera({
          centerCoordinate: [146.8087, -41.4419], // Default to Tasmania
          zoomLevel: 6,
          animationDuration: 500,
        });
      }
    }
  };
  
  // Handle route feature press
  const handleRouteFeaturePress = (event: any) => {
    if (!event || !event.features || event.features.length === 0) {
      console.log('[HomeScreen] No features found in press event');
      return;
    }

    const feature = event.features[0];
    
    // Check if it's a cluster
    if (feature.properties && isCluster(feature.properties)) {
      console.log('[HomeScreen] Cluster clicked:', feature.properties.cluster_id);
      
      // Get the cluster coordinates
      const [lng, lat] = feature.geometry.coordinates;
      
      // Calculate the zoom level to expand this cluster
      // Add 1.5 zoom levels for more aggressive zooming
      const targetZoom = Math.min(currentZoom + 1.5, 16);
      
      // Zoom to the cluster's location
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: ensureCorrectCoordinateOrder([lng, lat]),
          zoomLevel: targetZoom,
          animationDuration: 500,
        });
      }
    }
    // Check if it's an individual route point
    else if (feature.properties && isRouteFeature(feature.properties)) {
      console.log('[HomeScreen] Route clicked:', feature.properties.id);
      
      // Get the route data from the feature
      const routeData = feature.properties.routeData;
      
      // Debug the route data
      console.log('[HomeScreen] Route data:', {
        id: routeData.id,
        persistentId: routeData.persistentId,
        name: routeData.name,
        hasRoutes: routeData.routes && routeData.routes.length > 0,
        routeCount: routeData.routes?.length || 0,
        hasGeojson: routeData.routes && routeData.routes.length > 0 && routeData.routes[0]?.geojson ? true : false,
        boundingBox: routeData.boundingBox,
        mapState: routeData.mapState
      });
      
      // Set the selected route to show the preview drawer
      setSelectedRoute(routeData);
      
      // Also render the route on the map
      setFullDisplayRouteId(routeData.persistentId);
      
      // First check if the route has valid geojson data
      const hasValidGeojson = routeData.routes && 
                             routeData.routes.length > 0 && 
                             routeData.routes[0]?.geojson &&
                             routeData.routes[0]?.geojson.features &&
                             routeData.routes[0]?.geojson.features.length > 0;
      
      if (!hasValidGeojson) {
        console.warn('[HomeScreen] Route does not have valid GeoJSON data:', routeData.persistentId);
        
        // If no valid geojson, just center on the marker position
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: feature.geometry.coordinates,
            zoomLevel: currentZoom, // Maintain current zoom level
            animationDuration: 500,
          });
        }
        return;
      }
      
      // Optionally, adjust camera to fit the route bounds if available
      if (cameraRef.current && routeData.boundingBox) {
        const bounds = ensureCorrectBoundingBox(routeData.boundingBox);
        console.log('[HomeScreen] Fitting to bounds:', bounds);
        cameraRef.current.fitBounds(bounds[0], bounds[1], [60, 60, 180, 60], 500); // Add padding
      } else if (cameraRef.current && routeData.mapState?.center) {
        // Check if the center coordinates are valid (not [0,0])
        const isValidCenter = routeData.mapState.center[0] !== 0 || routeData.mapState.center[1] !== 0;
        
        if (isValidCenter) {
          // Fallback to centering if no bounding box and coordinates are valid
          console.log('[HomeScreen] Centering on mapState.center:', routeData.mapState.center);
          cameraRef.current.setCamera({
            centerCoordinate: ensureCorrectCoordinateOrder(routeData.mapState.center),
            zoomLevel: currentZoom, // Maintain current zoom level
            animationDuration: 500,
          });
        } else {
          // If center is [0,0], use the marker position instead
          console.log('[HomeScreen] Invalid center coordinates [0,0], using marker position instead');
          cameraRef.current.setCamera({
            centerCoordinate: feature.geometry.coordinates,
            zoomLevel: currentZoom, // Maintain current zoom level
            animationDuration: 500,
          });
        }
      } else if (cameraRef.current) {
        // Last resort: center on the marker position
        console.log('[HomeScreen] Centering on marker position:', feature.geometry.coordinates);
        cameraRef.current.setCamera({
          centerCoordinate: feature.geometry.coordinates,
          zoomLevel: currentZoom, // Maintain current zoom level
          animationDuration: 500,
        });
      }
    }
  };
  
  // Convert routes to GeoJSON format for ShapeSource
  const routeGeoJSON = useMemo(() => routesToGeoJSON(displayedRoutes), [displayedRoutes]);
  
  // Get the full route to display if fullDisplayRouteId is set
  const fullDisplayRoute = useMemo(() => {
    if (!fullDisplayRouteId) return null;
    return displayedRoutes.find(route => route.persistentId === fullDisplayRouteId) || null;
  }, [fullDisplayRouteId, displayedRoutes]);
  
  // No need to set showingSavedRoutes as it's been removed from the filter hook
  
  // Request user location permission when component mounts
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const isGranted = await MapboxGL.requestAndroidLocationPermissions();
        console.log('Location permission granted:', isGranted);
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    };
    
    // Only request on Android, iOS handles it differently
    if (Platform.OS === 'android') {
      requestLocationPermission();
    }
  }, []);
  
  // Render route markers with clustering
  const renderRouteMarkers = (): JSX.Element | null => {
    if (!displayedRoutes || displayedRoutes.length === 0) {
      return null;
    }
    
    return (
      <MapboxGL.ShapeSource
        id="routeSource"
        shape={routeGeoJSON}
        cluster={true}
        maxZoomLevel={14}
        clusterRadius={getClusterRadius(currentZoom)}
        onPress={handleRouteFeaturePress}
      >
        {/* Cluster circles */}
        <MapboxGL.CircleLayer
          id="clusteredPoints"
          filter={['has', 'point_count']}
          style={{
            circleColor: '#000000', // Black as requested
            circleRadius: 10, // Same size as individual markers
            circleOpacity: 1.0, // Fully opaque
            circleStrokeWidth: 2,
            circleStrokeColor: '#ffffff'
          }}
        />
        
        {/* Cluster count labels */}
        <MapboxGL.SymbolLayer
          id="clusterCount"
          filter={['has', 'point_count']}
          style={{
            textField: '{point_count}',
            textSize: 10, // Smaller text size for cluster count
            textColor: '#FFFFFF',
            textAllowOverlap: true,
            textIgnorePlacement: true,
            textJustify: 'center'
          }}
        />
        
        {/* Individual route points with type-specific colors */}
        <MapboxGL.CircleLayer
          id="singlePoint"
          filter={['!', ['has', 'point_count']]}
          style={{
            // All markers are black
            circleColor: '#000000',
            circleRadius: 10,
            circleOpacity: 0.9,
            circleStrokeWidth: 2,
            circleStrokeColor: '#ffffff'
          }}
        />
        
        {/* Type-specific text on top of the circles */}
        <MapboxGL.SymbolLayer
          id="singlePointText"
          filter={['!', ['has', 'point_count']]}
          style={{
            // Use different text based on route type
            textField: [
              'match',
              ['get', 'routeType'],
              'bikepacking', 'BP',
              'single', 'S',
              'event', 'E',
              'tourism', 'T',
              '×' // Default to × if type is unknown
            ],
            textSize: 10,
            textColor: '#FFFFFF',
            textAllowOverlap: true,
            textIgnorePlacement: true,
            textJustify: 'center'
          }}
        />
      </MapboxGL.ShapeSource>
    );
  };
  
  // Render full route line if a route is selected for full display
  const renderFullRoute = (): JSX.Element | null => {
    if (!fullDisplayRoute || !fullDisplayRoute.routes || fullDisplayRoute.routes.length === 0) {
      return null;
    }
    
    return (
      <>
        {fullDisplayRoute.routes.map((routeData, index) => {
          if (!routeData.geojson) return null;
          
          return (
            <MapboxGL.ShapeSource
              key={`full-route-${index}`}
              id={`full-route-source-${index}`}
              shape={routeData.geojson}
            >
              {/* Border line (white outline) */}
              <MapboxGL.LineLayer
                id={`full-route-border-${index}`}
                style={{
                  lineColor: '#ffffff',
                  lineWidth: 6,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              {/* Main route line */}
              <MapboxGL.LineLayer
                id={`full-route-line-${index}`}
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
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      
      {/* Map View - Full Screen */}
      <View style={styles.mapContainer}>
        <MapboxGL.MapView 
          style={styles.map}
          styleURL={currentMapStyle}
          onDidFinishLoadingMap={() => {
            console.log('[HomeScreen] Map finished loading');
            setMapReady(true);
          }}
          onRegionDidChange={(region) => {
            // Update current zoom level when region changes
            if (region.properties && region.properties.zoomLevel) {
              setCurrentZoom(region.properties.zoomLevel);
            }
          }}
          compassEnabled={false}
          attributionEnabled={false}
          logoEnabled={false}
          scrollEnabled={true}
          pitchEnabled={false}
          rotateEnabled={true}
          zoomEnabled={true}
          scaleBarEnabled={false}
          ref={mapRef}
        >
          {/* Camera component */}
          <MapboxGL.Camera
            ref={cameraRef}
            zoomLevel={6}
            centerCoordinate={[146.8087, -41.4419]} // Default to Tasmania
            animationDuration={0}
            maxZoomLevel={16}
            minZoomLevel={4}
          />
          
          {/* User location */}
          <MapboxGL.UserLocation
            visible={true}
            onUpdate={(location) => {
              if (location && location.coords) {
                setUserLocation([location.coords.longitude, location.coords.latitude]);
              }
            }}
          />
          
          {/* Route markers with clustering */}
          {renderRouteMarkers()}
          
          {/* Full route display if selected */}
          {renderFullRoute()}
          
        </MapboxGL.MapView>
        
        {/* Floating UI Elements on top of the map */}
        
        {/* Map Type Selector - Floating at the top */}
        <View style={styles.floatingCategoryContainer}>
          <MapTypeSelector
            selectedType={selectedMapType}
            availableMapTypes={availableMapTypes}
            onTypeChange={setSelectedMapType}
          />
        </View>
        
        {/* Filter Button - Floating below map type selector */}
        <View style={styles.filterButtonContainer}>
          {getActiveFilterCount() > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{getActiveFilterCount()}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setFilterDrawerVisible(true)}
            style={styles.filterButton}
          >
            <SlidersHorizontal size={20} color="#3366ff" />
          </TouchableOpacity>
        </View>
        
        {/* User Location Button */}
        <TouchableOpacity 
          style={styles.locationButton}
          onPress={() => {
            if (userLocation && cameraRef.current) {
              cameraRef.current.setCamera({
                centerCoordinate: userLocation,
                zoomLevel: 12,
                animationDuration: 1000,
              });
            } else {
              // Show alert if location is not available
              alert('Unable to access your location. Please ensure location permissions are granted and your device location is turned on.');
            }
          }}
        >
          <Navigation size={20} color="#3366ff" />
        </TouchableOpacity>
        
        {/* Loading Indicator */}
        {routeState.isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading maps...</Text>
          </View>
        )}
        
        {/* Route Count Indicator - Clickable to show route list */}
        {/* Hide route count when a full route is displayed */}
        {!selectedRoute && !fullDisplayRouteId && displayedRoutes.length > 0 && (
          <TouchableOpacity 
            style={styles.routeCountContainer}
            onPress={() => setRouteListVisible(true)}
          >
            <Text style={styles.routeCountText}>
              {displayedRoutes.length} {displayedRoutes.length === 1 ? 'trail' : 'trails'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Route List Drawer */}
      {routeListVisible && (
        <RouteListDrawer
          routes={displayedRoutes}
          onSelectRoute={(route) => {
            // Close the drawer
            setRouteListVisible(false);
            
            // Navigate to the Map screen with mapId parameter
            console.log('Navigating to Map screen with mapId:', route.persistentId);
            
            // Use the same navigation approach as in SavedRoutesScreen
            navigation.navigate('Map', { mapId: route.persistentId });
          }}
          onClose={() => setRouteListVisible(false)}
        />
      )}
      
      {/* Route Preview Drawer */}
        <RoutePreviewDrawer 
        route={selectedRoute}
        onClose={() => {
          setSelectedRoute(null);
          // Also clear full route display when closing drawer manually
          setFullDisplayRouteId(null); 
        }}
        onViewFullRoute={(route) => {
          // Navigate to the Map screen with mapId parameter
          console.log('Navigating to Map screen from preview with mapId:', route.persistentId);
          navigation.navigate('Map', { mapId: route.persistentId });
        }}
      />
      
      {/* Filter Drawer */}
      <FilterDrawer
        visible={filterDrawerVisible}
        onDismiss={() => setFilterDrawerVisible(false)}
        filters={{
          selectedState,
          setSelectedState,
          selectedRegion,
          setSelectedRegion,
          surfaceType,
          setSurfaceType,
          distanceFilter,
          setDistanceFilter,
          routeTypeFilter,
          setRouteTypeFilter,
          availableStates,
          availableRegions,
          availableFilters,
        }}
        resetFilters={resetFilters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  floatingSearchContainer: {
    position: 'absolute',
    top: 60, // Moved down more to avoid iPhone notch
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  searchInput: {
    flex: 1,
    elevation: 4,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  // Custom styles to override the Searchbar component's default styles
  customSearchBar: {
    backgroundColor: 'white',
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  filterButtonContainer: {
    position: 'absolute',
    top: 120, // Position below the map type selector
    right: 16,
    zIndex: 10,
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ee5253',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  floatingCategoryContainer: {
    position: 'absolute',
    top: 60, // Moved to the top where search bar was
    left: 0,
    right: 0,
    zIndex: 10,
  },
  locationButton: {
    position: 'absolute',
    bottom: 60, // Position just above the drawer
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 10,
    fontSize: 16,
  },
  routeCountContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  routeCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default HomeScreen;
