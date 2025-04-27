import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DistanceMarker as DistanceMarkerType } from '../../utils/distanceMarkerUtils';

interface DistanceMarkerProps {
  marker: DistanceMarkerType;
  color?: string;
}

const DistanceMarker: React.FC<DistanceMarkerProps> = ({ marker, color = '#ff4d4d' }) => {
  // Calculate the distance in kilometers and round to whole number
  const distanceInKm = Math.round(marker.distance / 1000);
  
  // Use charcoal color for the marker
  const markerColor = '#333333'; // Charcoal/dark gray
  
  return (
    <View style={styles.container}>
      {/* Marker circle */}
      <View style={[styles.markerCircle, { backgroundColor: markerColor }]} />
      
      {/* Distance label */}
      <View style={[styles.labelContainer, { backgroundColor: markerColor }]}>
        <View style={styles.distanceTextContainer}>
          <Text style={styles.distanceNumber}>{distanceInKm}</Text>
          <Text style={styles.distanceUnit}>km</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCircle: {
    width: 4, // Reduced from 8 to 4
    height: 4, // Reduced from 8 to 4
    borderRadius: 2, // Reduced from 4 to 2
    backgroundColor: '#ff4d4d',
    borderWidth: 0.5, // Reduced from 1 to 0.5
    borderColor: '#ffffff',
  },
  labelContainer: {
    paddingHorizontal: 4, // Reduced from 6 to 4
    paddingVertical: 1, // Reduced from 2 to 1
    borderRadius: 8, // Reduced from 10 to 8
    backgroundColor: 'rgba(255, 77, 77, 0.7)', // Added transparency
    marginTop: 2, // Reduced from 4 to 2
    borderWidth: 0.5, // Reduced from 1 to 0.5
    borderColor: '#ffffff',
  },
  labelText: {
    color: '#ffffff',
    fontSize: 8, // Reduced from 10 to 8
    fontWeight: 'normal', // Changed from 'bold' to 'normal'
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  // New styles for the distance text with different sized units
  distanceTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline', // Align text at the baseline
    justifyContent: 'center',
  },
  distanceNumber: {
    color: '#ffffff',
    fontSize: 8, // Base size for the number
    fontWeight: 'normal',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  distanceUnit: {
    color: '#ffffff',
    fontSize: 6, // Increased from 4 to 6 (halfway between 4 and 8)
    fontWeight: 'normal',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
});

export default DistanceMarker;
