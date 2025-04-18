import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox';
import { ensureCorrectCoordinateOrder, ensureCorrectBoundingBox } from '../../utils/coordinateUtils';

interface CleanStaticMapProps {
  center?: [number, number]; // [longitude, latitude]
  zoom?: number;
  width?: number;
  height?: number;
  style?: object;
  onMapReady?: () => void;
  routes?: any[]; // Keep routes prop for future use
  boundingBox?: [[number, number], [number, number]]; // Optional bounding box
}

/**
 * A clean, simple static map component that only shows the map image
 * without any test UI elements, headers, or unnecessary spinners
 */
const CleanStaticMap: React.FC<CleanStaticMapProps> = ({
  center = [146.8087, -41.4419], // Default to Tasmania
  zoom = 8,
  width = 600,
  height = 400,
  style,
  onMapReady,
  routes = [],
  boundingBox
}) => {
  // Generate the static map URL
  let mapboxUrl;
  
  // If we have a bounding box, use it to create a static map that shows the entire route
  if (boundingBox) {
    const correctedBoundingBox = ensureCorrectBoundingBox(boundingBox);
    console.log('[CleanStaticMap] Using bounding box:', correctedBoundingBox);
    
    // Format: [minLng,minLat,maxLng,maxLat]
    const bbox = [
      correctedBoundingBox[0][0], // minLng
      correctedBoundingBox[0][1], // minLat
      correctedBoundingBox[1][0], // maxLng
      correctedBoundingBox[1][1]  // maxLat
    ].join(',');
    
    mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/[${bbox}]/${width}x${height}?padding=50&access_token=${MAPBOX_ACCESS_TOKEN}`;
  } 
  // Otherwise use center and zoom
  else {
    // Ensure coordinates are in the correct order
    const correctedCenter = ensureCorrectCoordinateOrder(center);
    
    // Generate the static map URL centered at the route location
    mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/${correctedCenter[0]},${correctedCenter[1]},${zoom},0/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;
  }
  
  useEffect(() => {
    console.log('[CleanStaticMap] Component mounted');
    console.log('[CleanStaticMap] Using URL:', mapboxUrl);
  }, [mapboxUrl]);
  
  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: mapboxUrl }}
        style={styles.map}
        onLoad={() => {
          console.log('[CleanStaticMap] Image loaded successfully');
          if (onMapReady) {
            onMapReady();
          }
        }}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  map: {
    width: '100%',
    height: '100%',
  }
});

export default CleanStaticMap;
