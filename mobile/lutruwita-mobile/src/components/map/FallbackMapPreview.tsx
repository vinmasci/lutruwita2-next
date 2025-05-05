import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
// Import the clean static map component
import CleanStaticMap from './CleanStaticMap';

interface FallbackMapPreviewProps {
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  routes?: any[];
  style?: object;
  onMapReady?: () => void;
  boundingBox?: [[number, number], [number, number]]; // Optional bounding box
}

/**
 * Map preview component that renders a clean static map image.
 */
const FallbackMapPreview: React.FC<FallbackMapPreviewProps> = ({
  center,
  zoom,
  routes,
  style,
  onMapReady,
  boundingBox,
}) => {
  // Render the clean static map component with the provided props
  return (
    <CleanStaticMap
      center={center}
      zoom={zoom}
      routes={routes}
      style={style}
      onMapReady={onMapReady}
      boundingBox={boundingBox}
    />
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

export default memo(FallbackMapPreview);
