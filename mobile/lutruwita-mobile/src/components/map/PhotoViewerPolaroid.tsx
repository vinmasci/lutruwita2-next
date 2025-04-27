import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Photo } from '../../utils/photoClusteringUtils';
import { getLocationName } from '../../utils/geocodingUtils';

interface PhotoViewerPolaroidProps {
  photos: Photo[];
  currentPhotoIndex: number;
  onClose: () => void;
  onNavigateToPhoto: (index: number) => void;
  routeCount?: number; // Optional route count
}

const { width } = Dimensions.get('window');
const POLAROID_WIDTH = Math.min(width * 0.9, 340); // 90% of screen width, max 340px (10% bigger than before)
const PHOTO_ASPECT_RATIO = 4/3;

const PhotoViewerPolaroid: React.FC<PhotoViewerPolaroidProps> = ({ 
  photos, 
  currentPhotoIndex, 
  onClose, 
  onNavigateToPhoto,
  routeCount = 4 // Default to 4 routes if not provided
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  
  // Reset loading state when photo changes
  useEffect(() => {
    if (currentPhotoIndex >= 0) {
      setIsLoading(true);
      setImageError(false);
      
      // Preload next and previous images
      if (currentPhotoIndex < photos.length - 1) {
        const nextPhoto = photos[currentPhotoIndex + 1];
        Image.prefetch(nextPhoto.thumbnailUrl || nextPhoto.url);
      }
      
      if (currentPhotoIndex > 0) {
        const prevPhoto = photos[currentPhotoIndex - 1];
        Image.prefetch(prevPhoto.thumbnailUrl || prevPhoto.url);
      }
    }
  }, [currentPhotoIndex, photos]);
  
  // Fetch location name when current photo changes
  useEffect(() => {
    if (currentPhotoIndex >= 0 && photos.length > 0) {
      const photo = photos[currentPhotoIndex];
      
      // Reset location name
      setLocationName(null);
      
      // Fetch location name using reverse geocoding
      if (photo.coordinates && photo.coordinates.lat && photo.coordinates.lng) {
        const fetchLocation = async () => {
          try {
            const location = await getLocationName(photo.coordinates.lat, photo.coordinates.lng);
            setLocationName(location);
            console.log(`[PhotoViewerPolaroid] Location for photo ${currentPhotoIndex}: ${location}`);
          } catch (error) {
            console.error('[PhotoViewerPolaroid] Error fetching location:', error);
          }
        };
        
        fetchLocation();
      }
    }
  }, [currentPhotoIndex, photos]);
  
  if (currentPhotoIndex < 0 || !photos.length || currentPhotoIndex >= photos.length) {
    return null;
  }
  
  const currentPhoto = photos[currentPhotoIndex];
  const hasNextPhoto = currentPhotoIndex < photos.length - 1;
  const hasPreviousPhoto = currentPhotoIndex > 0;
  
  // Simple sequential navigation based on array order
  // Since photos are already sorted by their original order in MapScreen.tsx,
  // this will navigate through photos in their original order
  const navigateToNextPhoto = () => {
    if (!hasNextPhoto) return;
    
    const nextIndex = currentPhotoIndex + 1;
    const nextPhoto = photos[nextIndex];
    
    console.log(`[PhotoViewerPolaroid] Navigating to next photo ${nextIndex} (photo number: ${nextPhoto.photoNumber})`);
    
    onNavigateToPhoto(nextIndex);
  };

  const navigateToPreviousPhoto = () => {
    if (!hasPreviousPhoto) return;
    
    const prevIndex = currentPhotoIndex - 1;
    const prevPhoto = photos[prevIndex];
    
    console.log(`[PhotoViewerPolaroid] Navigating to previous photo ${prevIndex} (photo number: ${prevPhoto.photoNumber})`);
    
    onNavigateToPhoto(prevIndex);
  };

  return (
    <View style={styles.container}>
      <View style={styles.polaroid}>
        {/* Photo area with caption overlay */}
        <View style={styles.photoContainer}>
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0652DD" />
            </View>
          )}
          
          <Image 
            source={{ uri: currentPhoto.url }} 
            style={[styles.photo, isLoading && styles.hiddenImage]}
            resizeMode="cover"
            onLoad={() => {
              setIsLoading(false);
            }}
            onError={() => {
              setIsLoading(false);
              setImageError(true);
            }}
          />
          
          {imageError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load image</Text>
            </View>
          )}
          
          {/* Caption overlay at the bottom of the image */}
          <View style={styles.captionOverlay}>
            {/* Keep caption if available */}
            {currentPhoto.caption && (
              <Text style={styles.caption} numberOfLines={2} ellipsizeMode="tail">
                {currentPhoto.caption}
              </Text>
            )}
            
            {/* Route information - simplified format */}
            <Text style={styles.routeInfo}>
              Route {currentPhoto.routeIndex !== undefined ? currentPhoto.routeIndex + 1 : '?'} of {routeCount} • 
              {currentPhoto.distanceAlongRoute ? 
                ` ${Math.round(currentPhoto.distanceAlongRoute / 1000)}km` : 
                ' Unknown'}
              {locationName ? ` • ${locationName}` : ''}
            </Text>
            
            <Text style={styles.photoCount}>
              Photo {currentPhoto.photoNumber || (currentPhotoIndex + 1)} of {photos.length}
            </Text>
          </View>
        </View>
        
        {/* Navigation buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity 
            style={[styles.navButton, !hasPreviousPhoto && styles.navButtonDisabled]} 
            onPress={navigateToPreviousPhoto}
            disabled={!hasPreviousPhoto}
          >
            <ChevronLeft size={20} color={hasPreviousPhoto ? "#000" : "#ccc"} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
          >
            <X size={20} color="#000" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, !hasNextPhoto && styles.navButtonDisabled]} 
            onPress={navigateToNextPhoto}
            disabled={!hasNextPhoto}
          >
            <ChevronRight size={20} color={hasNextPhoto ? "#000" : "#ccc"} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Positioned at the bottom
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
    zIndex: 1000,
  },
  polaroid: {
    width: POLAROID_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 4, // Much smaller border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    // Removed rotation to make photo straight
  },
  photoContainer: {
    width: '100%',
    height: POLAROID_WIDTH / PHOTO_ASPECT_RATIO,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 2,
    overflow: 'hidden', // Ensure caption overlay doesn't overflow
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  hiddenImage: {
    opacity: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 6,
  },
  caption: {
    fontSize: 11,
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'System',
    marginBottom: 2,
  },
  routeInfo: {
    fontSize: 10,
    textAlign: 'center',
    color: '#ffffff', // White color as requested
    fontWeight: 'bold',
    marginBottom: 2,
  },
  photoCount: {
    fontSize: 9,
    textAlign: 'center',
    color: '#ddd',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PhotoViewerPolaroid;
