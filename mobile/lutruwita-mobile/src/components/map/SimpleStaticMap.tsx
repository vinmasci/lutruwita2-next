import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Text, ActivityIndicator, Button, Alert } from 'react-native';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox';
import { ensureCorrectCoordinateOrder } from '../../utils/coordinateUtils';

const SimpleStaticMap = () => {
  const [imageType, setImageType] = useState<'mapbox' | 'placeholder' | 'local'>('local');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Hardcode the map parameters for testing
  const centerLng = 146.8087;
  const centerLat = -41.4419;
  const zoom = 8;
  const width = 600;
  const height = 400;
  
  // Ensure coordinates are in the correct order
  const correctedCoords = ensureCorrectCoordinateOrder([centerLng, centerLat]);
  
  // Generate the static map URL
  const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${correctedCoords[0]},${correctedCoords[1]},${zoom},0/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;
  
  // Use a simple placeholder image as an alternative
  const placeholderUrl = 'https://via.placeholder.com/600x400?text=Test+Image';
  
  // Choose which URL to use
  let imageSource;
  if (imageType === 'mapbox') {
    imageSource = { uri: mapboxUrl };
  } else if (imageType === 'placeholder') {
    imageSource = { uri: placeholderUrl };
  } else {
    // Use a local image (built into React Native)
    imageSource = require('react-native/Libraries/NewAppScreen/components/logo.png');
  }
  
  console.log('SimpleStaticMap - Image type:', imageType);
  if (imageType !== 'local') {
    console.log('SimpleStaticMap - URL:', imageSource.uri);
  }
  
  // Test network connectivity
  useEffect(() => {
    const testConnectivity = async () => {
      try {
        console.log('Testing network connectivity...');
        const response = await fetch('https://httpbin.org/get');
        const data = await response.json();
        console.log('Network test successful:', data);
        Alert.alert('Network Test', 'Successfully connected to httpbin.org');
      } catch (error: any) {
        console.error('Network test failed:', error);
        Alert.alert('Network Test Failed', `Error: ${error?.message || 'Unknown error'}`);
      }
    };
    
    testConnectivity();
  }, []);
  
  const handleImageLoad = () => {
    console.log('SimpleStaticMap - Image loaded successfully');
    setIsLoading(false);
    setErrorMessage(null);
  };
  
  const handleImageError = (e: any) => {
    const errorMsg = e.nativeEvent?.error || 'Unknown error';
    console.error('SimpleStaticMap - Image load error:', errorMsg);
    setIsLoading(false);
    setErrorMessage(errorMsg);
    Alert.alert('Image Load Error', errorMsg);
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simple Static Map Test</Text>
      
      {/* Network test button */}
      <View style={styles.buttonContainer}>
        <Button
          title="Test Network Connectivity"
          onPress={async () => {
            try {
              console.log('Testing network connectivity...');
              const response = await fetch('https://httpbin.org/get');
              const data = await response.json();
              console.log('Network test successful:', data);
              Alert.alert('Network Test', 'Successfully connected to httpbin.org');
            } catch (error: any) {
              console.error('Network test failed:', error);
              Alert.alert('Network Test Failed', `Error: ${error?.message || 'Unknown error'}`);
            }
          }}
        />
      </View>
      
      {/* Toggle buttons */}
      <View style={styles.buttonRow}>
        <Button
          title="Local Image"
          onPress={() => {
            setImageType('local');
            setIsLoading(true);
            setErrorMessage(null);
          }}
        />
        <Button
          title="Placeholder"
          onPress={() => {
            setImageType('placeholder');
            setIsLoading(true);
            setErrorMessage(null);
          }}
        />
        <Button
          title="Mapbox"
          onPress={() => {
            setImageType('mapbox');
            setIsLoading(true);
            setErrorMessage(null);
          }}
        />
      </View>
      
      {/* The image */}
      <View style={styles.mapContainer}>
        <Text style={styles.imageTypeLabel}>
          Currently showing: {
            imageType === 'mapbox' ? 'Mapbox Static Map' : 
            imageType === 'placeholder' ? 'Placeholder Image' : 
            'Local Image'
          }
        </Text>
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
        
        {errorMessage && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>Error: {errorMessage}</Text>
          </View>
        )}
        
        <Image
          source={imageSource}
          style={styles.map}
          onLoadStart={() => setIsLoading(true)}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </View>
      
      <Text style={styles.footer}>
        {imageType === 'mapbox' ? 'Using Mapbox Static Images API' : 
         imageType === 'placeholder' ? 'Using placeholder.com' :
         'Using local image from React Native'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  imageTypeLabel: {
    padding: 5,
    backgroundColor: '#eee',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1,
  },
  errorOverlay: {
    padding: 10,
    backgroundColor: 'rgba(255, 200, 200, 0.8)',
    margin: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    color: '#666',
  },
});

export default SimpleStaticMap;
