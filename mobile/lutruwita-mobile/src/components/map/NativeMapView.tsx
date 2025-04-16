import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useTheme } from '../../theme';
import { useMap } from '../../context/MapContext';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES, MAP_CONFIG } from '../../config/mapbox';
import { RouteData } from '../../services/routeService';

// Initialize Mapbox with access token - moved to component for better error handling
const initializeMapbox = (): { success: boolean; error?: Error } => {
  try {
    console.log('Initializing Mapbox with token:', MAPBOX_ACCESS_TOKEN);
    
    // Validate access token
    if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'your-mapbox-access-token') {
      const error = new Error('Invalid Mapbox access token. Please set a valid token in your environment variables.');
      console.error(error.message);
      return { success: false, error };
    }
    
    // Check if MapboxGL is properly loaded
    if (!MapboxGL) {
      const error = new Error('MapboxGL is undefined or null. The native SDK may not be properly installed.');
      console.error(error.message);
      return { success: false, error };
    }
    
    // Check for required methods
    if (typeof MapboxGL.setAccessToken !== 'function') {
      const error = new Error('MapboxGL.setAccessToken is not a function. The SDK may be corrupted or incompatible.');
      console.error(error.message);
      return { success: false, error };
    }
    
    // Set the access token
    MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
    
    // Disable telemetry
    if (typeof MapboxGL.setTelemetryEnabled === 'function') {
      MapboxGL.setTelemetryEnabled(false);
    } else {
      console.warn('MapboxGL.setTelemetryEnabled is not a function. This is non-critical but should be investigated.');
    }
    
    // Log success
    console.log('Mapbox GL initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Error initializing Mapbox:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error initializing Mapbox') 
    };
  }
};

export interface NativeMapViewProps {
  initialCenter?: [number, number]; // [longitude, latitude]
  initialZoom?: number;
  style?: object;
  showUserLocation?: boolean;
  onMapReady?: () => void;
  onRegionDidChange?: (region: any) => void;
  routes?: RouteData[];
  onError?: (error: Error) => void;
}

const NativeMapView: React.FC<NativeMapViewProps> = ({
  initialCenter,
  initialZoom,
  style,
  showUserLocation = false,
  onMapReady,
  onRegionDidChange,
  routes = [],
  onError,
}) => {
  const { isDark } = useTheme();
  const { updateMapCenter, updateMapZoom, updateMapBounds, setMapLoaded } = useMap();
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [mapboxInitialized, setMapboxInitialized] = useState(false);

  // Set the map style based on the theme
  const mapStyle = isDark
    ? MAP_STYLES.DARK
    : MAP_STYLES.OUTDOORS;
  
  // Initialize Mapbox when component mounts
  useEffect(() => {
    const result = initializeMapbox();
    setMapboxInitialized(result.success);
    
    if (!result.success) {
      handleError(result.error || new Error('Failed to initialize Mapbox GL Native SDK'));
    }
  }, []);
    
  // Set a timeout for map loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setLoadingTimeout(true);
        console.log('Map loading timeout reached. MapboxGL initialized:', mapboxInitialized);
      }
    }, 15000); // 15 seconds timeout
    
    return () => clearTimeout(timeoutId);
  }, [isLoading, mapboxInitialized]);

  // Handle map ready event
  const handleMapReady = () => {
    try {
      console.log('Map is ready');
      setIsMapReady(true);
      setIsLoading(false);
      setMapLoaded(true);
      if (onMapReady) {
        onMapReady();
      }
    } catch (err) {
      handleError(err as Error);
    }
  };
  
  // Handle map load error
  const handleError = (err: Error) => {
    console.error('Map error:', err);
    setError(err);
    setIsLoading(false);
    if (onError) {
      onError(err);
    }
  };

  // Handle region change event
  const handleRegionDidChange = (feature: any) => {
    try {
      if (!feature || !feature.geometry || !feature.geometry.coordinates) return;
  
      const center: [number, number] = [
        feature.geometry.coordinates[0],
        feature.geometry.coordinates[1]
      ];
      
      const zoom = feature.properties.zoomLevel;
      
      // Update map state
      updateMapCenter(center);
      updateMapZoom(zoom);
      
      // Calculate bounds (approximate)
      const latitudeDelta = 0.01 * Math.pow(2, 14 - zoom);
      const longitudeDelta = latitudeDelta * 1.5;
      
      const bounds: {
        ne: [number, number];
        sw: [number, number];
      } = {
        ne: [center[0] + longitudeDelta, center[1] + latitudeDelta],
        sw: [center[0] - longitudeDelta, center[1] - latitudeDelta]
      };
      
      updateMapBounds(bounds);
      
      if (onRegionDidChange) {
        onRegionDidChange({
          center,
          zoom,
          bounds
        });
      }
    } catch (err) {
      console.warn('Error during region change:', err);
    }
  };

  // Fly to initial center and zoom when map is ready
  useEffect(() => {
    if (isMapReady && cameraRef.current && initialCenter && initialZoom) {
      try {
        cameraRef.current.setCamera({
          centerCoordinate: initialCenter,
          zoomLevel: initialZoom,
          animationDuration: 0 // No animation for initial position
        });
      } catch (err) {
        console.warn('Error setting camera:', err);
      }
    }
  }, [isMapReady, initialCenter, initialZoom]);

  // Render loading state or error message
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Text style={styles.errorText}>
          Error loading map: {error.message}
        </Text>
        <Text style={styles.errorSubtext}>
          Please check your internet connection and try again.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>
          {loadingTimeout ? 'Map is taking longer than expected to load...' : 'Loading map...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={mapStyle}
        onDidFinishLoadingMap={handleMapReady}
        onDidFailLoadingMap={() => handleError(new Error('Map failed to load'))}
        onRegionDidChange={handleRegionDidChange}
        compassEnabled={MAP_CONFIG.enableCompass}
        attributionEnabled={MAP_CONFIG.enableAttribution}
        logoEnabled={MAP_CONFIG.enableLogo}
        compassViewMargins={{ x: 16, y: 16 }}
        compassViewPosition={1} // top-right
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: initialCenter,
            zoomLevel: initialZoom,
          }}
          animationDuration={MAP_CONFIG.animationDuration}
        />

        {/* User location */}
        {showUserLocation && (
          <MapboxGL.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
            androidRenderMode="compass"
          />
        )}

        {/* Routes */}
        {routes.map((route, index) => (
          <React.Fragment key={`route-${route.routeId || index}`}>
            {route.isVisible && route.geojson && route.geojson.features && (
              <MapboxGL.ShapeSource
                id={`route-source-${route.routeId || index}`}
                shape={route.geojson}
              >
                <MapboxGL.LineLayer
                  id={`route-line-${route.routeId || index}`}
                  style={{
                    lineColor: route.color || '#ff4d4d',
                    lineWidth: 4,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              </MapboxGL.ShapeSource>
            )}
          </React.Fragment>
        ))}
      </MapboxGL.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#ff4d4d',
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default NativeMapView;
