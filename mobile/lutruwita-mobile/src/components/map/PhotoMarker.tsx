import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Camera } from 'lucide-react-native';

interface Photo {
  name: string;
  url: string;
  thumbnailUrl: string;
  dateAdded: string;
  caption?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  _id: string;
}

interface PhotoMarkerProps {
  photo: Photo;
  showThumbnail?: boolean;
}

const PhotoMarker: React.FC<PhotoMarkerProps> = ({ photo, showThumbnail = false }) => {
  // Smaller marker size
  const markerSize = 16;
  
  // Blue color for photo markers as specified
  const markerColor = '#0652DD';
  
  return (
    <View style={[
      styles.markerContainer,
      {
        width: markerSize + 8,
        height: markerSize + 8,
        borderRadius: 8,
        backgroundColor: markerColor,
      }
    ]}>
      {showThumbnail && photo.thumbnailUrl ? (
        <Image 
          source={{ uri: photo.thumbnailUrl }} 
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <Camera size={markerSize * 0.75} color="#FFFFFF" strokeWidth={1.5} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  thumbnail: {
    width: 20,
    height: 20,
    borderRadius: 4,
  }
});

export default PhotoMarker;
