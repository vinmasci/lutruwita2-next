import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox';

// Log available MapboxGL components
console.log('[MinimalMapboxTest] Available MapboxGL components:', Object.keys(MapboxGL));

// Initialize Mapbox
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

const MinimalMapboxTest = () => {
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Log when component mounts
  useEffect(() => {
    console.log('[MinimalMapboxTest] Component mounted');
    console.log('[MinimalMapboxTest] MapboxGL.StyleURL:', MapboxGL.StyleURL);
    
    // Check if required components exist
    if (!MapboxGL.MapView) {
      setError('MapboxGL.MapView is not available');
      console.error('[MinimalMapboxTest] MapboxGL.MapView is not available');
    }
    
    if (!MapboxGL.Camera) {
      setError('MapboxGL.Camera is not available');
      console.error('[MinimalMapboxTest] MapboxGL.Camera is not available');
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Minimal Mapbox Test</Text>
        <Text style={styles.subtitle}>Status: {mapReady ? 'Map Ready ✅' : 'Loading...'}</Text>
        {error && <Text style={styles.error}>Error: {error}</Text>}
      </View>
      
      <View style={styles.mapContainer}>
        {!error ? (
          <>
            <Text style={styles.mapLabel}>Map should appear below:</Text>
            <MapboxGL.MapView 
              style={styles.map}
              styleURL={MapboxGL.StyleURL.Street}
              onDidFinishLoadingMap={() => {
                console.log('[MinimalMapboxTest] Map finished loading');
                setMapReady(true);
              }}
              onDidFailLoadingMap={() => {
                console.log('[MinimalMapboxTest] Map failed to load');
                setError('Map failed to load');
              }}
              logoEnabled={true}
              attributionEnabled={true}
              compassEnabled={true}
            >
              <MapboxGL.Camera
                zoomLevel={10}
                centerCoordinate={[146.8087, -41.4419]} // Tasmania
              />
            </MapboxGL.MapView>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Using only MapView and Camera components
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
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  error: {
    fontSize: 16,
    color: 'red',
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mapLabel: {
    padding: 8,
    backgroundColor: '#e0e0e0',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
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

export default MinimalMapboxTest;
