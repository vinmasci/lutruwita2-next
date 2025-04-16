import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRoute } from '../../context/RouteContext';
import FallbackMapPreview from './FallbackMapPreview';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM
} from '../../config/mapbox';

export interface MapViewProps {
  initialCenter?: [number, number]; // [longitude, latitude]
  initialZoom?: number;
  style?: object;
  showUserLocation?: boolean;
  onMapReady?: () => void;
  onRegionDidChange?: (region: any) => void;
  onError?: (error: Error) => void; // Add error handler prop
  children?: React.ReactNode;
  routeId?: string; // Optional route ID to display a specific route
}


const MapView: React.FC<MapViewProps> = ({
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  style,
  showUserLocation = false,
  onMapReady,
  onRegionDidChange,
  onError,
  children,
  routeId,
}) => {
  const { routeState } = useRoute();
  const [mapError, setMapError] = useState<Error | null>(null);
  
  // Get the route to display
  const routeToDisplay = routeId 
    ? routeState.routes.find(r => r.persistentId === routeId) || routeState.selectedRoute
    : routeState.selectedRoute;

  // Determine the center and zoom to use
  const centerToUse = routeToDisplay?.mapState?.center || initialCenter;
  const zoomToUse = routeToDisplay?.mapState?.zoom || initialZoom;

  // Handle map errors
  const handleMapError = (error: Error) => {
    console.error('Map error in wrapper component:', error);
    setMapError(error);
    
    // Call the onError callback if provided
    if (onError) {
      onError(error);
    }
  };

  // Retry loading the map
  const retryMapLoad = () => {
    setMapError(null);
  };

  // If there's an error, show error UI with retry button
  if (mapError) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={styles.errorTitle}>Map Loading Error</Text>
        <Text style={styles.errorMessage}>{mapError.message}</Text>
        <Text style={styles.errorHint}>
          This could be due to network issues or problems with the map configuration.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={retryMapLoad}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <FallbackMapPreview
        center={centerToUse}
        zoom={zoomToUse}
        style={styles.map}
        onMapReady={onMapReady}
        onError={handleMapError}
        routes={routeToDisplay?.routes || []}
      />
      {children}
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
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#dc3545',
  },
  errorMessage: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MapView;
