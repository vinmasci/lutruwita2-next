import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, ActivityIndicator } from 'react-native'; // Added Image, ActivityIndicator
// Removed MapboxGL import as we are not using the interactive map
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox';
import { ensureCorrectCoordinateOrder } from '../../utils/coordinateUtils';

// Removed MapboxGL initialization

// Define props interface
interface MinimalStaticMapTestProps {
  style?: object;
  onMapReady?: () => void;
}

const MinimalStaticMapTest: React.FC<MinimalStaticMapTestProps> = ({ style, onMapReady }) => { // Accept props
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Log when component mounts and generate static image URL
  useEffect(() => {
    console.log('[MinimalStaticMapTest] Component mounted');
    if (!MAPBOX_ACCESS_TOKEN) {
      setError('Mapbox Access Token is missing!');
      console.error('[MinimalStaticMapTest] Mapbox Access Token is missing!');
      return;
    }

    const centerCoordinate: [number, number] = [146.8087, -41.4419]; // Tasmania
    const correctedCoordinate = ensureCorrectCoordinateOrder(centerCoordinate);
    const zoomLevel = 8; // Adjusted zoom for static image
    const width = 600; // Example width
    const height = 400; // Example height
    const style = 'streets-v11'; // Basic street style

    const staticImageUrl = `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${correctedCoordinate[0]},${correctedCoordinate[1]},${zoomLevel},0/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;
    console.log('[MinimalStaticMapTest] Generated Static Image URL:', staticImageUrl);
    setImageUrl(staticImageUrl);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Minimal Static Map Test</Text>
        <Text style={styles.subtitle}>Status: {imageLoaded ? 'Image Loaded ✅' : (error ? 'Error ❌' : 'Loading...')}</Text>
        {error && <Text style={styles.error}>Error: {error}</Text>}
      </View>

      <View style={styles.mapContainer}>
        <Text style={styles.mapLabel}>Static map image should appear below:</Text>
        {imageUrl && !error ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.map}
            onLoad={() => {
              console.log('[MinimalStaticMapTest] Static image loaded successfully');
              setImageLoaded(true);
              if (onMapReady) { // Call onMapReady if provided
                onMapReady();
              }
            }}
            onError={(e) => {
              console.error('[MinimalStaticMapTest] Failed to load static image:', e.nativeEvent.error);
              setError(`Failed to load static image: ${e.nativeEvent.error}`);
              setImageLoaded(false); // Ensure loaded state is false on error
            }}
            resizeMode="cover" // Adjust as needed
          />
        ) : (
          <View style={styles.loadingOrErrorContainer}>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <ActivityIndicator size="large" />
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Testing Mapbox Static Images API
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
  loadingOrErrorContainer: { // Add the missing style definition
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: { // Keep original errorContainer style if needed elsewhere, or remove if truly replaced
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

export default MinimalStaticMapTest; // Correct the export name
