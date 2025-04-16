import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox';

// Log available MapboxGL components
console.log('[SimpleMapboxTest] Available MapboxGL components:', Object.keys(MapboxGL));

// Initialize Mapbox
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

const SimpleMapboxTest = () => {
  const [mapReady, setMapReady] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Simple Mapbox Test</Text>
      </View>
      
      <View style={styles.mapContainer}>
        <Text style={styles.mapLabel}>Map should appear below:</Text>
        <MapboxGL.MapView 
          style={styles.map}
          styleURL={MapboxGL.StyleURL.Street}
          onDidFinishLoadingMap={() => {
            console.log('[SimpleMapboxTest] Map finished loading');
            setMapReady(true);
          }}
        >
          <MapboxGL.Camera
            zoomLevel={10}
            centerCoordinate={[146.8087, -41.4419]} // Tasmania
          />
        </MapboxGL.MapView>
        <Text style={styles.mapStatus}>
          Map Status: {mapReady ? 'Loaded ✅' : 'Loading...'}
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
  mapStatus: {
    padding: 8,
    backgroundColor: '#e0e0e0',
    textAlign: 'center',
  },
});

export default SimpleMapboxTest;
