import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, SafeAreaView, Button } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox';

// Log available MapboxGL components
console.log('[MapboxTest] Available MapboxGL components:', Object.keys(MapboxGL));

// Force Mapbox to use accessToken
if (MAPBOX_ACCESS_TOKEN) {
  console.log('[MapboxTest] Setting token directly on MapboxGL object');
  // @ts-ignore - Force set the token directly on the object
  MapboxGL.accessToken = MAPBOX_ACCESS_TOKEN;
}

// Log the Mapbox token for debugging
console.log('[MapboxTest] Mapbox token:', 
  MAPBOX_ACCESS_TOKEN ? `exists (length: ${MAPBOX_ACCESS_TOKEN.length})` : 'not set');

const MapboxTest = () => {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  // Initialize Mapbox
  useEffect(() => {
    console.log('[MapboxTest] Component mounted');
    
    try {
      console.log('[MapboxTest] Initializing Mapbox...');
      
      // Check if MapboxGL is available
      if (!MapboxGL) {
        throw new Error('MapboxGL is not available');
      }
      
      // Check if token is set
      if (!MAPBOX_ACCESS_TOKEN) {
        throw new Error('Mapbox access token is not set');
      }
      
      // Set the access token
      MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
      console.log('[MapboxTest] Access token set successfully');
      
      // Disable telemetry
      if (typeof MapboxGL.setTelemetryEnabled === 'function') {
        MapboxGL.setTelemetryEnabled(false);
        console.log('[MapboxTest] Telemetry disabled');
      }
      
      setInitialized(true);
      console.log('[MapboxTest] Mapbox initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error initializing Mapbox';
      console.error('[MapboxTest] Initialization error:', errorMessage);
      setError(errorMessage);
    }
    
    return () => {
      console.log('[MapboxTest] Component unmounting');
    };
  }, []);
  
  // Log Mapbox version and other info
  useEffect(() => {
    if (initialized) {
      console.log('[MapboxTest] Mapbox initialized, logging info:');
      
      // Log current access token
      try {
        if (typeof MapboxGL.getAccessToken === 'function') {
          const token = MapboxGL.getAccessToken();
          // Handle if token is a Promise or string
          if (token instanceof Promise) {
            token.then(t => {
              console.log('[MapboxTest] Current access token:', t ? `set (length: ${String(t).length})` : 'not set');
            }).catch(err => {
              console.error('[MapboxTest] Error resolving token promise:', err);
            });
          } else if (token) {
            console.log('[MapboxTest] Current access token:', `set (length: ${String(token).length})`);
          } else {
            console.log('[MapboxTest] Current access token: not set');
          }
        } else {
          console.log('[MapboxTest] getAccessToken method not available');
        }
      } catch (err) {
        console.error('[MapboxTest] Error getting access token:', err);
      }
      
      // Log available style URLs
      if (MapboxGL.StyleURL) {
        console.log('[MapboxTest] Available style URLs:', Object.keys(MapboxGL.StyleURL));
      }
    }
  }, [initialized]);
  
  // Handle map ready event
  const handleMapReady = () => {
    console.log('[MapboxTest] Map finished loading successfully');
    setMapReady(true);
  };
  
  // Handle map error
  const handleMapError = (err: Error | { error?: { message?: string } } | unknown) => {
    let errorMessage = 'Unknown map error';
    
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'object' && err !== null) {
      const errorObj = err as { error?: { message?: string } };
      if (errorObj.error?.message) {
        errorMessage = errorObj.error.message;
      }
    }
    
    console.error('[MapboxTest] Map failed to load:', errorMessage);
    setError(errorMessage);
  };
  
  // Retry initialization
  const retryInitialization = () => {
    setError(null);
    setInitialized(false);
    
    // Re-run initialization
    try {
      console.log('[MapboxTest] Retrying Mapbox initialization...');
      MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
      setInitialized(true);
      console.log('[MapboxTest] Retry successful');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during retry';
      console.error('[MapboxTest] Retry failed:', errorMessage);
      setError(errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mapbox Test</Text>
        <Text style={styles.subtitle}>
          {initialized ? 'Initialized ✅' : 'Not initialized ❌'}
          {mapReady ? ' • Map Ready ✅' : ''}
        </Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error:</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Button title="Retry" onPress={retryInitialization} />
        </View>
      )}
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
        <Text style={styles.infoText}>
          MapboxGL: {MapboxGL ? 'Available' : 'Not available'}
        </Text>
        <Text style={styles.infoText}>
          Token: {MAPBOX_ACCESS_TOKEN ? `Set (${MAPBOX_ACCESS_TOKEN.substring(0, 10)}...)` : 'Not set'}
        </Text>
      </View>
      
      <View style={styles.mapContainer}>
        {initialized ? (
          <View style={styles.mapDebugContainer}>
            <Text style={styles.mapDebugText}>Map Container (should show map below)</Text>
            <MapboxGL.MapView
              style={styles.map}
              styleURL={MapboxGL.StyleURL.Street}
              onDidFailLoadingMap={() => {
                console.log('[MapboxTest] Map failed to load');
                handleMapError(new Error('Map failed to load'));
              }}
              onDidFinishLoadingMap={() => {
                console.log('[MapboxTest] Map finished loading');
                handleMapReady();
              }}
              logoEnabled={true}
              attributionEnabled={true}
              compassEnabled={true}
              zoomEnabled={true}
              rotateEnabled={true}
            >
              <MapboxGL.Camera
                zoomLevel={12}
                centerCoordinate={[146.8087, -41.4419]} // Tasmania
                animationMode="flyTo"
                animationDuration={2000}
              />
              
              {/* Add a simple marker to see if anything renders */}
              {/* Only use Camera component for now */}
            </MapboxGL.MapView>
            <Text style={styles.mapDebugText}>End of Map Container</Text>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>
              {error ? 'Map cannot be displayed due to errors' : 'Initializing map...'}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Check the console logs for detailed debugging information
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#c62828',
    marginBottom: 16,
  },
  infoContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mapDebugContainer: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'red',
    backgroundColor: '#f0f0f0',
  },
  mapDebugText: {
    color: 'red',
    textAlign: 'center',
    padding: 4,
    backgroundColor: 'yellow',
  },
  map: {
    flex: 1,
    minHeight: 300, // Force a minimum height
    borderWidth: 3,
    borderColor: 'blue',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eeeeee',
  },
  placeholderText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    padding: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
});

export default MapboxTest;
