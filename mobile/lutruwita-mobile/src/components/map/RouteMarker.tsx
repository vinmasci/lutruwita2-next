import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RouteMap } from '../../services/routeService';

interface RouteMarkerProps {
  route: RouteMap;
  selected?: boolean;
}

/**
 * A marker component for displaying routes on the map
 * Uses different colors based on route type
 */
const RouteMarker: React.FC<RouteMarkerProps> = ({ route, selected = false }) => {
  // Determine color based on route type
  let color = '#ff4d4d'; // Default red
  
  switch (route.type) {
    case 'tourism':
      color = '#4d7fff'; // Blue
      break;
    case 'event':
      color = '#ff9500'; // Orange
      break;
    case 'bikepacking':
      color = '#34c759'; // Green
      break;
    case 'single':
    default:
      color = '#ff4d4d'; // Red
      break;
  }
  
  // Get the first route's color if available
  if (route.routes && route.routes.length > 0 && route.routes[0].color) {
    color = route.routes[0].color;
  }
  
  return (
    <View style={styles.container}>
      {/* Main circle */}
      <View 
        style={[
          styles.marker, 
          { backgroundColor: color },
          selected && styles.selected
        ]} 
      />
      
      {/* White border */}
      <View 
        style={[
          styles.markerBorder,
          selected && styles.selectedBorder
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff4d4d',
    borderWidth: 1,
    borderColor: '#ffffff',
    zIndex: 2,
  },
  markerBorder: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 1,
  },
  selected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  selectedBorder: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});

export default RouteMarker;
