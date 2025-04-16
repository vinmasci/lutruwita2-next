import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, Text } from 'react-native';
import MapPreview from './MapPreview';
import WebMapPreview from './WebMapPreview';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox';

interface FallbackMapPreviewProps {
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  routes?: any[];
  style?: object;
  onMapReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Map preview component with fallback to WebView-based map
 * This component tries to use the native MapPreview first,
 * and if that fails, falls back to the WebMapPreview
 */
const FallbackMapPreview: React.FC<FallbackMapPreviewProps> = ({
  center,
  zoom,
  routes = [],
  style,
  onMapReady,
  onError,
}) => {
  const [useNativeMap, setUseNativeMap] = useState(true);
  const [nativeMapError, setNativeMapError] = useState<Error | null>(null);
  const [webMapError, setWebMapError] = useState<Error | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [staticMapError, setStaticMapError] = useState<Error | null>(null);

  // Log component mount
  useEffect(() => {
    console.log('[FallbackMapPreview] Component mounted, trying native map first');
  }, []);

  // Handle native map error
  const handleNativeMapError = (error: Error) => {
    console.warn('[FallbackMapPreview] Native map error, falling back to WebView map:', error);
    setNativeMapError(error);
    setUseNativeMap(false);
  };

  // Handle map ready
  const handleMapReady = () => {
    console.log('[FallbackMapPreview] Map ready');
    setMapReady(true);
    if (onMapReady) {
      onMapReady();
    }
  };

  // Handle web map error
  const handleWebMapError = (error: Error) => {
    console.error('[FallbackMapPreview] Web map error:', error);
    // Set the web map error state
    setWebMapError(error);
    
    // Call the onError callback if provided
    if (onError) {
      onError(error);
    }
  };
  
  // Handle static map error
  const handleStaticMapError = () => {
    console.error('[FallbackMapPreview] Static map error');
    setStaticMapError(new Error('Failed to load static map image'));
    
    // Call the onError callback if provided
    if (onError) {
      onError(new Error('All map fallbacks failed'));
    }
  };

  // Generate static map URL
  const getStaticMapUrl = () => {
    // Default width and height for the static map
    const width = 600;
    const height = 400;
    
    // Create a static map URL from Mapbox Static Images API
    return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/pin-s+f74e4e(${center[0]},${center[1]})/${center[0]},${center[1]},${zoom},0/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;
  };

  // If both native and WebView maps fail, show static map
  if (nativeMapError && webMapError) {
    // If static map also failed, show error message
    if (staticMapError) {
      return (
        <View style={[styles.container, styles.errorContainer, style]}>
          <Text style={styles.errorText}>Map preview unavailable</Text>
          <Text style={styles.errorDetail}>All map fallbacks failed</Text>
        </View>
      );
    }
    
    // Show static map image
    return (
      <View style={[styles.container, style]}>
        <Image
          source={{ uri: getStaticMapUrl() }}
          style={styles.map}
          onError={handleStaticMapError}
          onLoad={() => {
            console.log('[FallbackMapPreview] Static map loaded successfully');
            handleMapReady();
          }}
        />
      </View>
    );
  }

  // Show native or WebView map
  return (
    <View style={[styles.container, style]}>
      {useNativeMap ? (
        <MapPreview
          center={center}
          zoom={zoom}
          routes={routes}
          style={styles.map}
          onMapReady={handleMapReady}
          onError={handleNativeMapError}
        />
      ) : (
        <WebMapPreview
          center={center}
          zoom={zoom}
          routes={routes}
          style={styles.map}
          onMapReady={handleMapReady}
          onError={handleWebMapError}
        />
      )}
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  errorDetail: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default FallbackMapPreview;
