import React from 'react';
import { View, StyleSheet, SafeAreaView, Text, ScrollView } from 'react-native';
import CleanStaticMap from './components/map/CleanStaticMap';

/**
 * Test component to verify the CleanStaticMap component
 */
const TestStaticMap = () => {
  // Test data
  const center: [number, number] = [146.8087, -41.4419]; // Tasmania
  const zoom = 8;
  const boundingBox: [[number, number], [number, number]] = [
    [146.5, -41.6], // Southwest
    [147.1, -41.2]  // Northeast
  ];
  
  // Sample route data with GeoJSON
  const sampleRoute = {
    persistentId: 'test-route-1',
    name: 'Test Route',
    routes: [{
      geojson: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [146.6, -41.5],
              [146.7, -41.45],
              [146.8, -41.4],
              [146.9, -41.35],
              [147.0, -41.3]
            ]
          }
        }]
      }
    }]
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Static Map Test</Text>
        
        <Text style={styles.sectionTitle}>1. Basic Map with Center & Zoom</Text>
        <View style={styles.mapContainer}>
          <CleanStaticMap 
            center={center}
            zoom={zoom}
            width={400}
            height={300}
            onMapReady={() => console.log('Map 1 ready')}
          />
        </View>
        
        <Text style={styles.sectionTitle}>2. Map with Bounding Box</Text>
        <View style={styles.mapContainer}>
          <CleanStaticMap 
            boundingBox={boundingBox}
            width={400}
            height={300}
            onMapReady={() => console.log('Map 2 ready')}
          />
        </View>
        
        <Text style={styles.sectionTitle}>3. Map with Route</Text>
        <View style={styles.mapContainer}>
          <CleanStaticMap 
            center={center}
            zoom={zoom}
            width={400}
            height={300}
            routes={[sampleRoute]}
            onMapReady={() => console.log('Map 3 ready')}
          />
        </View>
        
        <Text style={styles.sectionTitle}>4. Map with Route & Bounding Box</Text>
        <View style={styles.mapContainer}>
          <CleanStaticMap 
            boundingBox={boundingBox}
            width={400}
            height={300}
            routes={[sampleRoute]}
            onMapReady={() => console.log('Map 4 ready')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default TestStaticMap;
