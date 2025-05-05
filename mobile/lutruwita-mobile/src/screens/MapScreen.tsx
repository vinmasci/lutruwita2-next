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
import FirebaseStatusIndicator from '../components/common/FirebaseStatusIndicator';
import { POI } from '../services/routeService';
import { useTheme } from '../theme';
import { useRoute } from '../context/RouteContext';
import { createMasterRoute } from '../utils/masterRouteUtils';
import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';
import { Layers, Mountain, Camera } from 'lucide-react-native';
import { ensureCorrectCoordinateOrder, ensureCorrectBoundingBox } from '../utils/coordinateUtils';
import POIMarker from '../components/map/POIMarker';
import DistanceMarker from '../components/map/DistanceMarker';
import { UnpavedSection } from '../services/routeService';
import { MAP_STYLES } from '../config/mapbox';
import { calculateDistanceMarkers } from '../utils/distanceMarkerUtils';

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

// Simple blue circle for photo markers (used as fallback)
const PhotoCircleMarker = () => {
  return (
    <View style={{
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#0652DD',
      borderWidth: 1,
      borderColor: '#FFFFFF',
    }} />
  );
};

const MapScreen = ({ route, navigation }: any) => {
  const { isDark } = useTheme();
  const paperTheme = usePaperTheme();
  const { routeState, loadRoute } = useRoute();
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<Error | null>(null);
  const [mapKey, setMapKey] = useState<number>(0); // Used to force map remount on retry
  const [mapReady, setMapReady] = useState(false);
  const [mapPositioned, setMapPositioned] = useState(false); // Track when map is positioned
  const [currentMapStyle, setCurrentMapStyle] = useState(MAP_STYLES.SATELLITE_STREETS);
  const [is3DMode, setIs3DMode] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(9); // Default zoom level
  const [drawerHeight, setDrawerHeight] = useState<number>(180); // Default drawer height
  const [hoverCoordinates, setHoverCoordinates] = useState<[number, number] | null>(null);
  const [activeRouteIndex, setActiveRouteIndex] = useState(-1); // Start with master route
  
  // State for photo viewer
  const [photos, setPhotos] = useState<any[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(-1);
  
  // Zoom level threshold for showing POI labels
  const POI_LABEL_ZOOM_THRESHOLD = 12; // Only show labels when zoomed in more than this
  const mapRef = useRef<MapboxGL.MapView>(null);
  // Create a ref for the camera component
  const cameraRef = useRef<MapboxGL.Camera>(null);
  
  // Get the mapId from route params
  const { mapId } = route.params;
  
  // Get the selected route from the route context
  const mapDetails = routeState.selectedRoute;
  
  // Extract and process photos from mapDetails when it changes
  useEffect(() => {
    if (mapDetails && mapDetails.photos && mapDetails.photos.length > 0) {
      console.log(`[MapScreen] Processing ${mapDetails.photos.length} photos for ${mapDetails.name || 'unnamed map'}`);
      console.log(`[MapScreen] Active route index: ${activeRouteIndex}`);
      console.log(`[MapScreen] Number of routes: ${mapDetails.routes?.length || 0}`);
      
      // Process photos in a way that sorts them by route and distance
      const processPhotos = () => {
        // Step 1: Sort photos by their original order (as they came from the server)
        // This ensures photo 1 is always photo 1, etc.
        const sortedPhotos = sortPhotosByOriginalOrder(mapDetails.photos || []);
        
        console.log(`[MapScreen] Sorted ${sortedPhotos.length} photos by original order`);
        
        // Step 2: If routes are available, assign route information to each photo
        // This doesn't change the order, just adds route info
        if (mapDetails.routes && mapDetails.routes.length > 0) {
          // If activeRouteIndex is set to a specific route, filter to only use that route
          const routesToUse = activeRouteIndex >= 0 && activeRouteIndex < mapDetails.routes.length
            ? [mapDetails.routes[activeRouteIndex]]
            : mapDetails.routes;
          
          console.log(`[MapScreen] Using ${routesToUse.length} routes for assigning route info`);
          routesToUse.forEach((route, idx) => {
            console.log(`[MapScreen] Route ${idx}: ${route.name || `Route ${idx + 1}`}`);
          });
          
          // Assign route information to each photo without changing their order
          const photosWithRouteInfo = assignRouteInfoToPhotos(sortedPhotos, routesToUse);
          
          console.log(`[MapScreen] Added route info to ${photosWithRouteInfo.length} photos`);
          
          // Step 3: Sort photos by route and distance along the route
          const photosSortedByRouteAndDistance = sortPhotosByRouteAndDistance(photosWithRouteInfo);
          
          console.log(`[MapScreen] Sorted ${photosSortedByRouteAndDistance.length} photos by route and distance`);
          
          // Log a few photos after processing
          photosSortedByRouteAndDistance.slice(0, 3).forEach((photo: Photo, idx: number) => {
            console.log(`[MapScreen] After processing - Photo ${idx}: routeIndex=${photo.routeIndex}, distanceAlongRoute=${photo.distanceAlongRoute?.toFixed(2)}m, originalIndex=${photo.originalIndex}, photoNumber=${photo.photoNumber}`);
          });
          
          if (photosSortedByRouteAndDistance.length > 3) {
            const lastIdx = photosSortedByRouteAndDistance.length - 1;
            console.log(`[MapScreen] Last photo after processing: routeIndex=${photosSortedByRouteAndDistance[lastIdx].routeIndex}, distanceAlongRoute=${photosSortedByRouteAndDistance[lastIdx].distanceAlongRoute?.toFixed(2)}m, originalIndex=${photosSortedByRouteAndDistance[lastIdx].originalIndex}, photoNumber=${photosSortedByRouteAndDistance[lastIdx].photoNumber}`);
          }
          
          return photosSortedByRouteAndDistance;
        } else {
          // If there are no routes, just use the sorted photos
          console.log(`[MapScreen] No routes available, using photos sorted by original order`);
          return sortedPhotos;
        }
      };

      // Process photos and update state
      const processedPhotos = processPhotos();
      console.log(`[MapScreen] Setting ${processedPhotos.length} processed photos to state`);
      setPhotos(processedPhotos);
    } else {
      console.log(`[MapScreen] No photos to process, setting empty array`);
      setPhotos([]);
    }
  }, [mapDetails, activeRouteIndex]);
  
  // Log when map is ready
  useEffect(() => {
    if (mapReady) {
      console.log('[MapScreen] Map is ready, custom icons should be available');
    }
  }, [mapReady]);
  
  // Effect to handle initial camera positioning when map is ready
  useEffect(() => {
    if (mapReady && mapDetails?.boundingBox && cameraRef.current && !selectedPOI) {
      // Use the bounding box to fit the camera with corrected coordinates
      const correctedBoundingBox = ensureCorrectBoundingBox(mapDetails.boundingBox);
      console.log('[MapScreen] Using corrected bounding box:', correctedBoundingBox);
      
      // Fit the camera to the bounding box
      cameraRef.current.fitBounds(
        correctedBoundingBox[0],
        correctedBoundingBox[1],
        100, // padding
        0 // No animation for initial positioning
      );
      
      // Mark the map as positioned after a short delay
      setTimeout(() => {
        setMapPositioned(true);
        console.log('[MapScreen] Map positioned successfully');
      }, 100);
    }
  }, [mapReady, mapDetails, selectedPOI]);
  
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
  
  // Render distance markers for the active route
  const renderDistanceMarkers = (): JSX.Element | null => {
    if (!mapDetails?.routes || mapDetails.routes.length === 0) {
      return null;
    }
    
    // If activeRouteIndex is -1, create a master route
    const activeRoute = activeRouteIndex === -1 
      ? createMasterRoute(mapDetails.routes, mapDetails.name || 'Combined Routes')
      : mapDetails.routes[activeRouteIndex];
    
    // Force a total distance value if needed
    if (activeRoute.statistics && (!activeRoute.statistics.totalDistance || activeRoute.statistics.totalDistance === 0)) {
      activeRoute.statistics.totalDistance = 50000; // 50 km fallback
    }
    
    // Calculate distance markers based on the current zoom level
    const distanceMarkers = calculateDistanceMarkers(activeRoute, currentZoom);
    
    // Return empty fragment if no markers
    if (!distanceMarkers || distanceMarkers.length === 0) {
      return null;
    }
    
    // Return array of marker views
    return (
      <>
        {distanceMarkers.map((marker, index) => (
          <MapboxGL.MarkerView
            key={`distance-marker-${index}`}
            coordinate={ensureCorrectCoordinateOrder(marker.coordinates)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <DistanceMarker 
              marker={marker} 
              color={activeRoute.color || '#ff4d4d'} 
            />
          </MapboxGL.MarkerView>
        ))}
      </>
    );
  };
  
  // Render POI markers
  const renderPOIMarkers = (): React.ReactNode => {
    if (!mapDetails?.pois?.draggable || mapDetails.pois.draggable.length === 0) {
      return null;
    }
    
    return (
      <>
        {mapDetails.pois.draggable.map((poi) => (
          <MapboxGL.MarkerView
            key={`poi-marker-${poi.id}`}
            coordinate={ensureCorrectCoordinateOrder(poi.coordinates)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <TouchableOpacity 
              style={styles.markerContainer}
              onPress={() => {
                // Set the selected POI
                setSelectedPOI(poi);
                
                // Center the map on the POI using the camera
                if (cameraRef.current) {
                  // Set the camera to center on the POI with appropriate zoom
                  cameraRef.current.setCamera({
                    centerCoordinate: ensureCorrectCoordinateOrder(poi.coordinates),
                    zoomLevel: Math.max(currentZoom, 13), // Ensure we're zoomed in enough
                    animationDuration: 500,
                  });
                }
              }}
            >
              <POIMarker poi={poi} />
              {poi.name && currentZoom >= POI_LABEL_ZOOM_THRESHOLD && (
               <RNText style={styles.markerLabel}>
                  {poi.name}
                </RNText>
              )}
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}
      </>
    );
  };
  
  // Handle photo and cluster feature clicks
  const handlePhotoFeaturePress = useCallback((event: any) => {
    if (!event || !event.features || event.features.length === 0) {
      console.log('[MapScreen] No features found in press event');
      return;
    }

    const feature = event.features[0];
    
    // Check if it's a cluster
    if (feature.properties && isCluster(feature.properties)) {
      console.log('[MapScreen] Cluster clicked:', feature.properties.cluster_id);
      
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
    // Check if it's an individual photo point
    else if (feature.properties && isPhotoFeature(feature.properties)) {
      console.log('[MapScreen] Photo clicked:', feature.properties.id);
      
      // Find the photo index in the photos array
      const photoData = feature.properties.photoData;
      
      // Log the photo data for debugging
      console.log(`[MapScreen] Photo data:`, {
        id: photoData._id,
        originalIndex: photoData.originalIndex,
        photoNumber: photoData.photoNumber,
        routeName: photoData.routeName,
        distanceAlongRoute: photoData.distanceAlongRoute
      });
      
      // First try to find the photo by its originalIndex if available
      let photoIndex = -1;
      
      if (photoData.originalIndex !== undefined) {
        // Find the photo in the sorted array that has this originalIndex
        photoIndex = photos.findIndex(p => p.originalIndex === photoData.originalIndex);
        console.log(`[MapScreen] Found photo by originalIndex: ${photoIndex}`);
      }
      
      // If not found by originalIndex, fall back to the old method
      if (photoIndex < 0) {
        photoIndex = photos.findIndex(p => 
          p._id === photoData._id || 
          (p.url === photoData.url && 
           p.coordinates.lat === photoData.coordinates.lat &&
           p.coordinates.lng === photoData.coordinates.lng)
        );
        console.log(`[MapScreen] Found photo by ID/URL/coordinates: ${photoIndex}`);
      }
      
      if (photoIndex >= 0) {
      // Set the current photo index to show the photo viewer
      setCurrentPhotoIndex(photoIndex);
      
      // Use EXACTLY the same method as the 3D toggle button
      if (cameraRef.current && mapRef.current && !is3DMode) {
        try {
          // Get the current center coordinate from the map (this is async)
          mapRef.current.getCenter().then(currentCenter => {
            // Update 3D mode state
            setIs3DMode(true);
            
            // Set camera with ONLY the pitch change - NO CENTER OR ZOOM CHANGES
            if (cameraRef.current) {
              cameraRef.current.setCamera({
                pitch: 60, // 3D mode
                animationDuration: 500,
              });
            }
            
            console.log('[MapScreen] Switched to 3D mode when clicking on photo marker (using 3D toggle method)');
          }).catch(error => {
            console.error('[MapScreen] Error getting center when clicking photo:', error);
            // Fall back to just toggling the state
            setIs3DMode(true);
          });
        } catch (error) {
          console.error('[MapScreen] Error in async operation when clicking photo:', error);
          // Fall back to just toggling the state
          setIs3DMode(true);
        }
      }
      }
    }
  }, [photos, currentZoom]);

  // Render photo markers with clustering
  const renderPhotoMarkers = (): JSX.Element | null => {
    if (!photos || photos.length === 0) {
      return null;
    }
    
    return (
      <MapboxGL.ShapeSource
        id="photoSource"
        shape={photoGeoJSON}
        cluster={true}
        maxZoomLevel={14}
        clusterRadius={getClusterRadius(currentZoom)}
        onPress={handlePhotoFeaturePress}
      >
        {/* Cluster circles - fixed size (10px), more transparent, no stroke */}
        <MapboxGL.CircleLayer
          id="clusteredPoints"
          filter={['has', 'point_count']}
          style={{
            circleColor: '#0652DD',
            circleRadius: 10,   // Fixed size of 10px for all clusters
            circleOpacity: 0.6,  // More transparent
            circleStrokeWidth: 0  // No stroke
          }}
        />
        
        {/* Cluster count labels */}
        <MapboxGL.SymbolLayer
          id="clusterCount"
          filter={['has', 'point_count']}
          style={{
            textField: '{point_count}',
            textSize: 12,
            textColor: '#FFFFFF',
            textAllowOverlap: true
          }}
        />
        
        {/* Individual photo points - using same blue color as clusters but more visible */}
        <MapboxGL.CircleLayer
          id="singlePoint"
          filter={['!', ['has', 'point_count']]}
          style={{
            circleColor: '#0652DD',  // Same blue as clusters
            circleRadius: 7,  // Larger radius
            circleOpacity: 0.7,  // More opaque
            circleStrokeWidth: 1,  // Add a thin stroke
            circleStrokeColor: '#ffffff'  // White stroke
          }}
        />
        
        {/* Circle symbol (◎) for individual points */}
        <MapboxGL.SymbolLayer
          id="photoIcon"
          filter={['!', ['has', 'point_count']]}
          style={{
            textField: '◎',
            textSize: 16,
            textColor: '#FFFFFF',
            textAllowOverlap: true,
            textIgnorePlacement: true
          }}
        />
      </MapboxGL.ShapeSource>
    );
  };
  
  // Convert photos to GeoJSON format for ShapeSource using the utility function
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
        <Text style={{ color: paperTheme.colors.error }}>Map not found</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Full-screen Map */}
      <View style={styles.mapFullContainer}>
        <MapboxGL.MapView 
          key={`map-${mapKey}`} // Force remount on retry
          ref={mapRef}
          style={styles.mapFull}
          styleURL={currentMapStyle}
          onDidFinishLoadingMap={() => {
            console.log('[MapScreen] Map finished loading');
            setMapReady(true);
          }}
          onMapLoadingError={() => {
            console.error('[MapScreen] Map failed to load');
            handleMapError(new Error('Map failed to load'));
          }}
          onRegionDidChange={(region) => {
            // Update current zoom level when region changes
            if (region.properties && region.properties.zoomLevel) {
              setCurrentZoom(region.properties.zoomLevel);
            }
          }}
          // We'll implement touch handling for the tracer feature in a future update
          compassEnabled={true}
          attributionEnabled={true}
          logoEnabled={true}
          scrollEnabled={true}
          pitchEnabled={is3DMode}
          rotateEnabled={true}
          zoomEnabled={true}
          compassViewPosition={1} // Position compass at top-right
          compassViewMargins={{ x: 16, y: 120 }} // Moved much further down to be below the header
        >
          {/* No need for custom icon images when using MarkerView */}
          
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
          
          {/* Display all routes */}
          {mapDetails.routes && mapDetails.routes.length > 0 && (
            <>
              {/* Map over all routes */}
              {mapDetails.routes.map((routeData, routeIndex) => {
                // Skip routes without geojson data
                if (!routeData.geojson) {
                  return null;
                }
                
                return (
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
                );
              })}
            </>
          )}
          
          {/* Display distance markers for the active route */}
          {renderDistanceMarkers()}
          
          {/* Display POIs using MarkerView with custom POIMarker component */}
          {renderPOIMarkers()}
          
          {/* Render photo markers with clustering */}
          {renderPhotoMarkers()}
          
        </MapboxGL.MapView>
      </View>
      
      {/* Map Loading/Positioning Overlay */}
      {(!mapReady || !mapPositioned) && !mapError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>
            {!mapReady ? 'Loading map...' : 'Positioning map...'}
          </Text>
        </View>
      )}
      
      {/* Map Header - Positioned absolutely at the top */}
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
      
      {/* Map Control Buttons - Positioned to avoid header and elevation drawer */}
      <View style={styles.controlButtonsContainer}>
        {/* Map Style Toggle Button */}
        <TouchableOpacity 
          style={styles.controlButton}
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
          accessibilityLabel="Change map style"
          accessibilityRole="button"
          accessibilityHint="Cycles through different map styles"
        >
          <Layers size={20} color="#fff" />
        </TouchableOpacity>
        
        {/* 3D Toggle Button */}
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={async () => {
            // Get current camera position before toggling 3D mode
            if (cameraRef.current && mapRef.current) {
              try {
                // Get the current center coordinate from the map (this is async)
                const currentCenter = await mapRef.current.getCenter();
                const currentZoomLevel = currentZoom;
                
                // Toggle 3D mode state
                const newMode = !is3DMode;
                setIs3DMode(newMode);
                
                // Set camera with current position but new pitch
                cameraRef.current.setCamera({
                  centerCoordinate: currentCenter,
                  zoomLevel: currentZoomLevel,
                  pitch: newMode ? 70 : 0, // New pitch based on toggled state
                  animationDuration: 500,
                });
                
                console.log(`[MapScreen] Toggled 3D mode to ${newMode ? 'ON' : 'OFF'}, maintaining position at ${JSON.stringify(currentCenter)}`);
              } catch (error) {
                console.error('[MapScreen] Error getting current center:', error);
                // Fall back to just toggling the state
                setIs3DMode(!is3DMode);
              }
            } else {
              // Just toggle the state if camera ref isn't available
              setIs3DMode(!is3DMode);
              console.log('[MapScreen] Toggled 3D mode but camera ref not available');
            }
          }}
          accessibilityLabel="Toggle 3D terrain"
          accessibilityRole="button"
          accessibilityHint="Switches between 2D and 3D map view"
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
        onClose={() => {
          // When closing the drawer, smoothly transition the camera back
          if (selectedPOI && cameraRef.current && mapDetails?.boundingBox) {
            // Get the bounding box for a smoother transition back to the overall view
            const correctedBoundingBox = ensureCorrectBoundingBox(mapDetails.boundingBox);
            
            // Use a longer animation duration for a smoother transition
            cameraRef.current.fitBounds(
              correctedBoundingBox[0],
              correctedBoundingBox[1],
              100, // padding
              1500 // Longer animation duration (1.5 seconds) for smoother transition
            );
            
            // Small delay before clearing the selected POI to allow animation to start
            setTimeout(() => {
              setSelectedPOI(null);
            }, 100);
          } else {
            setSelectedPOI(null);
          }
        }} 
      />
      
      {/* Photo Viewer Polaroid */}
      {photos.length > 0 && (
        <PhotoViewerPolaroid 
          photos={photos}
          currentPhotoIndex={currentPhotoIndex}
          routeCount={mapDetails?.routes?.length || 4} // Pass the actual route count
          onClose={() => {
            setCurrentPhotoIndex(-1);
            
            // Switch back to 2D mode when closing the photo viewer
            if (is3DMode && cameraRef.current && mapRef.current) {
              // Set 3D mode to false
              setIs3DMode(false);
              
              // Get current camera position and update with 0 pitch (2D mode)
              mapRef.current.getCenter().then(currentCenter => {
                if (cameraRef.current) {
                  cameraRef.current.setCamera({
                    centerCoordinate: currentCenter,
                    zoomLevel: currentZoom,
                    pitch: 0, // 2D mode
                    animationDuration: 500,
                  });
                }
              }).catch(error => {
                console.error('[MapScreen] Error getting center when closing photo viewer:', error);
              });
            }
          }}
          onNavigateToPhoto={(index: number) => {
            // Set the current photo index
            setCurrentPhotoIndex(index);
            
            // Get the photo at the specified index
            const photo = photos[index];
            
            // Center the map on the photo using the camera
            if (cameraRef.current && photo) {
              // Switch to 3D mode if not already in 3D mode
              if (!is3DMode) {
                setIs3DMode(true);
              }
              
              // Set the camera to center on the photo with appropriate zoom and 3D pitch
              cameraRef.current.setCamera({
                centerCoordinate: ensureCorrectCoordinateOrder([photo.coordinates.lng, photo.coordinates.lat]),
                zoomLevel: Math.max(currentZoom, 13), // Ensure we're zoomed in enough
                pitch: 60, // 3D mode
                animationDuration: 500,
              });
              
              console.log('[MapScreen] Navigated to photo and applied 3D pitch');
            }
          }}
        />
      )}
      
      {/* Route Elevation Drawer */}
      {mapDetails && mapDetails.routes && mapDetails.routes.length > 0 && (
        <RouteElevationDrawer 
          onHeightChange={(height) => {
            // Update drawer height state
            setDrawerHeight(height);
            
            // Note: We're not setting content inset here due to TypeScript issues
            // Instead, we'll rely on the drawer being positioned absolutely
          }}
          hoverCoordinates={hoverCoordinates}
          // Collapse the drawer when a photo is selected
          isCollapsed={currentPhotoIndex >= 0}
          onRouteSelect={(routeIndex, route, isUserInitiated) => {
            // Update the active route index
            setActiveRouteIndex(routeIndex);
            
            // Only zoom to the selected route if the change was user-initiated
            if (isUserInitiated && cameraRef.current && route && route.geojson) {
              // Get the coordinates from the route's GeoJSON
              const coordinates = route.geojson.features[0].geometry.coordinates;
              
              // Create a bounding box for the route
              const bounds = coordinates.reduce(
                (box: [[number, number], [number, number]], coord: [number, number]) => {
                  return [
                    [Math.min(box[0][0], coord[0]), Math.min(box[0][1], coord[1])],
                    [Math.max(box[1][0], coord[0]), Math.max(box[1][1], coord[1])]
                  ];
                },
                [[Infinity, Infinity], [-Infinity, -Infinity]] as [[number, number], [number, number]]
              );
              
              // Ensure the coordinates are in the correct order
              const correctedBounds = ensureCorrectBoundingBox(bounds);
              
              // Fit the camera to the route's bounding box
              cameraRef.current.fitBounds(
                correctedBounds[0],
                correctedBounds[1],
                100, // padding
                1000 // animation duration (1 second)
              );
            }
          }}
        />
      )}
      
      {/* Firebase Status Indicator */}
      <FirebaseStatusIndicator position="bottom-right" showDetails={true} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  scaleBarContainer: {
    position: 'absolute',
    top: 170,
    right: 16,
    zIndex: 15,
  },
  scaleBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'column',
    width: 100,
  },
  scaleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scaleBarLine: {
    height: 2,
    backgroundColor: '#FFFFFF',
    width: '100%',
    marginBottom: 4,
  },
  scaleTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  }
});

export default MapScreen;
