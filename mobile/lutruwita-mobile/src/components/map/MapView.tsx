import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import { useMap } from '../../context/MapContext';
import { useRoute } from '../../context/RouteContext';
import WebMapView from './WebMapView';
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
  children,
  routeId,
}) => {
  const { routeState } = useRoute();
  
  // Get the route to display
  const routeToDisplay = routeId 
    ? routeState.routes.find(r => r.persistentId === routeId) || routeState.selectedRoute
    : routeState.selectedRoute;

  // Determine the center and zoom to use
  const centerToUse = routeToDisplay?.mapState?.center || initialCenter;
  const zoomToUse = routeToDisplay?.mapState?.zoom || initialZoom;

  return (
    <View style={[styles.container, style]}>
      <WebMapView
        initialCenter={centerToUse}
        initialZoom={zoomToUse}
        style={styles.map}
        showUserLocation={showUserLocation}
        onMapReady={onMapReady}
        onRegionDidChange={onRegionDidChange}
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
});

export default MapView;
