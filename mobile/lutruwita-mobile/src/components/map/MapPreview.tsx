import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES } from '../../config/mapbox';
import { useTheme } from '../../theme';
import { Map, AlertTriangle } from 'lucide-react-native';
import { ensureCorrectCoordinateOrder, ensureCorrectBoundingBox } from '../../utils/coordinateUtils';

console.log('[MapPreview] Module loaded');

// Mapbox initialization moved into useEffect within the component

interface MapPreviewProps {
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  routes?: any[];
  style?: object;
  onMapReady?: () => void;
  onError?: (error: Error) => void;
  boundingBox?: [[number, number], [number, number]]; // Optional bounding box
}

const MapPreview: React.FC<MapPreviewProps> = ({
  center,
  zoom,
  routes = [],
  style,
  onMapReady,
  onError,
  boundingBox,
}) => {
  const { isDark } = useTheme();
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routeRenderingAttempted, setRouteRenderingAttempted] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMapboxInitialized = useRef(false); // Prevent multiple initializations

  // Initialize Mapbox on component mount
  useEffect(() => {
    if (!isMapboxInitialized.current) {
      console.log('[MapPreview] Initializing Mapbox on mount...');
      const tokenToUse = MAPBOX_ACCESS_TOKEN; // Get token from config/env
      console.log('[MapPreview] Attempting to use token:', tokenToUse); // Log the actual token
      try {
        if (tokenToUse) {
          MapboxGL.setAccessToken(tokenToUse);
          console.log('[MapPreview] Access token set successfully');
        } else {
          console.warn('[MapPreview] Mapbox access token is missing!');
          handleMapError(new Error('Mapbox access token is missing'));
          return; // Don't proceed if token is missing
        }

        // Disable telemetry
        if (typeof MapboxGL.setTelemetryEnabled === 'function') {
          MapboxGL.setTelemetryEnabled(false);
          console.log('[MapPreview] Telemetry disabled');
        } else {
          console.warn('[MapPreview] setTelemetryEnabled is not a function');
        }

        console.log('[MapPreview] Mapbox initialized successfully');
        isMapboxInitialized.current = true;
      } catch (error) {
        console.error('[MapPreview] Error initializing Mapbox:', error);
        handleMapError(new Error(`Error initializing Mapbox: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Log component mount and props
  useEffect(() => {
    console.log('[MapPreview] Component mounted with props:', {
      center: center ? `[${center[0]}, ${center[1]}]` : 'undefined',
      zoom,
      routesCount: routes?.length || 0,
      hasRouteData: routes?.some(r => r?.geojson?.features) || false
    });

    // Set a timeout to detect if the map is taking too long to load
    timeoutRef.current = setTimeout(() => {
      if (!isMapReady) {
        console.warn('[MapPreview] Map loading timeout - map did not become ready within 10 seconds');
        handleMapError(new Error('Map loading timeout'));
      }
    }, 120000); // Increased timeout to 120 seconds

    // Cleanup timeout on unmount
    return () => {
      console.log('[MapPreview] Component unmounting');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Validate route data
  useEffect(() => {
    if (routes && routes.length > 0) {
      console.log('[MapPreview] Validating route data for', routes.length, 'routes');

      routes.forEach((route, index) => {
        if (!route) {
          console.warn(`[MapPreview] Route at index ${index} is null or undefined`);
          return;
        }

        if (!route.geojson) {
          console.warn(`[MapPreview] Route at index ${index} has no geojson data`);
          return;
        }

        if (!route.geojson.features || !Array.isArray(route.geojson.features) || route.geojson.features.length === 0) {
          console.warn(`[MapPreview] Route at index ${index} has invalid or empty features array`);
          return;
        }

        console.log(`[MapPreview] Route ${index} validation passed:`, {
          id: route.routeId || `index-${index}`,
          featuresCount: route.geojson.features.length,
          hasColor: !!route.color
        });
      });
    } else {
      console.log('[MapPreview] No routes to validate');
    }
  }, [routes]);

  // Set the map style based on the theme
  const mapStyle = isDark
    ? MAP_STYLES.DARK
    : MAP_STYLES.STREET; // Changed from SATELLITE_STREETS

  console.log('[MapPreview] Using map style:', mapStyle);

  // Handle map ready event
  const handleMapReady = useCallback(() => {
    console.log('[MapPreview] Map ready event fired');

    // Clear the timeout since the map is ready
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsMapReady(true);
    setIsLoading(false);

    if (onMapReady) {
      onMapReady();
    }
  }, [onMapReady]);

  // Fly to initial center and zoom when map is ready
  useEffect(() => {
    if (isMapReady && cameraRef.current) {
      try {
        // If we have a bounding box, use it to fit the camera
        if (boundingBox) {
          const correctedBoundingBox = ensureCorrectBoundingBox(boundingBox);
          console.log('[MapPreview] Using bounding box for camera:', correctedBoundingBox);
          
          cameraRef.current.fitBounds(
            correctedBoundingBox[0],
            correctedBoundingBox[1],
            100, // padding
            0 // No animation for initial position
          );
        } 
        // Otherwise use center and zoom
        else if (center && zoom) {
          // Ensure coordinates are in the correct order
          const correctedCenter = ensureCorrectCoordinateOrder(center);
          console.log('[MapPreview] Setting camera to center:', correctedCenter, 'zoom:', zoom);
          
          cameraRef.current.setCamera({
            centerCoordinate: correctedCenter,
            zoomLevel: zoom,
            animationDuration: 0 // No animation for initial position
          });
        }
        
        console.log('[MapPreview] Camera set successfully');
      } catch (err) {
        console.error('[MapPreview] Error setting camera:', err);
        handleMapError(new Error(`Error setting camera: ${err instanceof Error ? err.message : String(err)}`));
      }
    }
  }, [isMapReady, center, zoom, boundingBox]);

  // Track when route rendering is attempted
  useEffect(() => {
    if (isMapReady && routes && routes.length > 0 && !routeRenderingAttempted) {
      console.log('[MapPreview] Attempting to render routes');
      setRouteRenderingAttempted(true);
    }
  }, [isMapReady, routes, routeRenderingAttempted]);

  // Handle map errors
  const handleMapError = useCallback((err: Error) => {
    console.error('[MapPreview] Map error:', err);
    setError(err);
    setIsLoading(false);

    if (onError) {
      onError(err);
    }
  }, [onError]);

  // If there's an error, show an error message
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <AlertTriangle size={32} color="#ff4d4d" />
        <Text style={styles.errorText}>Map preview unavailable</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  // Show loading indicator while map is initializing
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <View style={styles.mapLoadingOverlay}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
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
        // @ts-ignore - Type definitions don't match actual API
        onDidFailLoadingMap={(error: any) => {
          console.error('[MapPreview] Map failed to load:', error);
          handleMapError(new Error('Failed to load map'));
        }}
        // @ts-ignore - Type definitions don't match actual API
        onDidFailRenderingMap={(error: any) => {
          console.error('[MapPreview] Map failed to render:', error);
          handleMapError(new Error('Failed to render map'));
        }}
        // @ts-ignore - Type definitions don't match actual API
        onWillStartRenderingMap={() => {
          console.log('[MapPreview] Map will start rendering');
        }}
        // @ts-ignore - Type definitions don't match actual API
        onDidFinishRenderingMap={(fully: boolean) => {
          console.log('[MapPreview] Map did finish rendering, fully rendered:', fully);
        }}
        // @ts-ignore - Type definitions don't match actual API
        onWillStartRenderingFrame={() => {
          console.log('[MapPreview] Map will start rendering frame');
        }}
        // @ts-ignore - Type definitions don't match actual API
        onDidFinishRenderingFrame={(fully: boolean) => {
          console.log('[MapPreview] Map did finish rendering frame, fully rendered:', fully);
        }}
        compassEnabled={true}  // Enabled
        attributionEnabled={true} // Enabled
        logoEnabled={true}     // Enabled
        scrollEnabled={true}   // Enabled
        pitchEnabled={true}    // Enabled
        rotateEnabled={true}   // Enabled
        zoomEnabled={true}     // Enabled
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: ensureCorrectCoordinateOrder(center),
            zoomLevel: zoom,
          }}
          animationDuration={0}
          maxZoomLevel={16}
          minZoomLevel={5}
        />

        {/* Routes - Completely commented out for debugging */}
        {/* {routes && routes.length > 0 && routes[0].geojson && routes[0].geojson.features && (
          <MapboxGL.ShapeSource
            key={`route-source-${routes[0].routeId || 0}`}
            id={`route-source-${routes[0].routeId || 0}`}
            shape={routes[0].geojson}
          >
            <MapboxGL.LineLayer
              id={`route-border-${routes[0].routeId || 0}`}
                style={{
                  lineColor: '#ffffff',
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
            />
            <MapboxGL.LineLayer
              id={`route-line-${routes[0].routeId || 0}`}
              style={{
                lineColor: routes[0].color || '#ff4d4d',
                lineWidth: 3,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          </MapboxGL.ShapeSource>
        )} */}
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
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  errorDetail: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

export default MapPreview;
