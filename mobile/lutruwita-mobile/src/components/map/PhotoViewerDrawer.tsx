import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated, TouchableOpacity, Image, Dimensions } from 'react-native';
import { X, ChevronLeft, ChevronRight, Calendar, Map, Navigation } from 'lucide-react-native';
import { Photo } from '../../utils/photoClusteringUtils';

interface PhotoViewerDrawerProps {
  photos: Photo[];
  currentPhotoIndex: number;
  onClose: () => void;
  onNavigateToPhoto: (index: number) => void;
}

const { width } = Dimensions.get('window');

const PhotoViewerDrawer: React.FC<PhotoViewerDrawerProps> = ({ 
  photos, 
  currentPhotoIndex, 
  onClose, 
  onNavigateToPhoto 
}) => {
  const translateY = useRef(new Animated.Value(300)).current;
  
  const currentPhoto = photos[currentPhotoIndex];
  const hasNextPhoto = currentPhotoIndex < photos.length - 1;
  const hasPreviousPhoto = currentPhotoIndex > 0;

  useEffect(() => {
    if (photos.length > 0 && currentPhotoIndex >= 0) {
      // Animate drawer sliding up
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      // Animate drawer sliding down
      Animated.timing(translateY, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [photos, currentPhotoIndex, translateY]);

  if (!currentPhoto) return null;

  // Format the date for display
  const formattedDate = currentPhoto.dateAdded ? 
    new Date(currentPhoto.dateAdded).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 
    'Unknown date';

  const navigateToNextPhoto = () => {
    if (!photos.length) return;
    
    const currentDistance = currentPhoto.distanceAlongRoute || 0;
    
    console.log(`[PhotoViewerDrawer] Navigating from photo ${currentPhotoIndex} (distance: ${currentDistance.toFixed(2)}m)`);
    
    // Find the photo with the next greater distance along route
    let nextIndex = -1;
    let smallestGreaterDistance = Infinity;
    
    photos.forEach((photo, index) => {
      const distance = photo.distanceAlongRoute || 0;
      if (distance > currentDistance && distance < smallestGreaterDistance) {
        smallestGreaterDistance = distance;
        nextIndex = index;
      }
    });
    
    // If found, navigate to it
    if (nextIndex >= 0) {
      console.log(`[PhotoViewerDrawer] Found next photo at index ${nextIndex} (distance: ${smallestGreaterDistance.toFixed(2)}m)`);
      onNavigateToPhoto(nextIndex);
    } else if (hasNextPhoto) {
      // Fallback to simple array navigation if route-based fails
      console.log(`[PhotoViewerDrawer] No next photo found by distance, using array index ${currentPhotoIndex + 1}`);
      onNavigateToPhoto(currentPhotoIndex + 1);
    }
  };

  const navigateToPreviousPhoto = () => {
    if (!photos.length) return;
    
    const currentDistance = currentPhoto.distanceAlongRoute || 0;
    
    console.log(`[PhotoViewerDrawer] Navigating from photo ${currentPhotoIndex} (distance: ${currentDistance.toFixed(2)}m)`);
    
    // Find the photo with the next smaller distance along route
    let prevIndex = -1;
    let largestSmallerDistance = -Infinity;
    
    photos.forEach((photo, index) => {
      const distance = photo.distanceAlongRoute || 0;
      if (distance < currentDistance && distance > largestSmallerDistance) {
        largestSmallerDistance = distance;
        prevIndex = index;
      }
    });
    
    // If found, navigate to it
    if (prevIndex >= 0) {
      console.log(`[PhotoViewerDrawer] Found previous photo at index ${prevIndex} (distance: ${largestSmallerDistance.toFixed(2)}m)`);
      onNavigateToPhoto(prevIndex);
    } else if (hasPreviousPhoto) {
      // Fallback to simple array navigation if route-based fails
      console.log(`[PhotoViewerDrawer] No previous photo found by distance, using array index ${currentPhotoIndex - 1}`);
      onNavigateToPhoto(currentPhotoIndex - 1);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View 
        style={[
          styles.drawer,
          { transform: [{ translateY }] }
        ]}
      >
        <View style={styles.header}>
          <View style={styles.handle} />
          <Text style={styles.photoCount}>
            {currentPhoto.photoNumber || (currentPhotoIndex + 1)} of {photos.length}
          </Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: currentPhoto.thumbnailUrl || currentPhoto.url }} 
              style={styles.image}
              resizeMode="contain"
              // Load high-res version after thumbnail is displayed
              onLoad={() => {
                if (currentPhoto.thumbnailUrl) {
                  // Preload the full image after thumbnail is shown
                  Image.prefetch(currentPhoto.url);
                }
              }}
            />
            
            {/* Navigation buttons */}
            <View style={styles.navigationContainer}>
              <TouchableOpacity 
                style={[
                  styles.navButton, 
                  !hasPreviousPhoto && styles.navButtonDisabled
                ]}
                onPress={navigateToPreviousPhoto}
                disabled={!hasPreviousPhoto}
              >
                <ChevronLeft 
                  size={30} 
                  color={hasPreviousPhoto ? "#fff" : "#aaa"} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.navButton, 
                  !hasNextPhoto && styles.navButtonDisabled
                ]}
                onPress={navigateToNextPhoto}
                disabled={!hasNextPhoto}
              >
                <ChevronRight 
                  size={30} 
                  color={hasNextPhoto ? "#fff" : "#aaa"} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.detailsContainer}>
            {currentPhoto.name && (
              <Text style={styles.title}>{currentPhoto.name}</Text>
            )}
            
            <View style={styles.dateContainer}>
              <Calendar size={16} color="#666" />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            
            {/* Display route information if available */}
            {currentPhoto.routeName && (
              <View style={styles.routeContainer}>
                <Map size={16} color="#666" />
                <Text style={styles.routeText}>
                  {currentPhoto.routeName}
                </Text>
              </View>
            )}
            
            {/* Display position along route if available */}
            {currentPhoto.distanceAlongRoute !== undefined && (
              <View style={styles.routePositionContainer}>
                <Navigation size={16} color="#666" />
                <Text style={styles.routeText}>
                  {(currentPhoto.distanceAlongRoute / 1000).toFixed(1)} km along route
                  {currentPhoto.routePosition !== undefined && 
                    ` (${Math.round(currentPhoto.routePosition * 100)}%)`}
                </Text>
              </View>
            )}
            
            {currentPhoto.caption && (
              <Text style={styles.caption}>{currentPhoto.caption}</Text>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30, // Extra padding for bottom safe area
    maxHeight: '70%', // Maximum height of the drawer
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
  },
  photoCount: {
    position: 'absolute',
    left: 16,
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  navigationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  detailsContainer: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routePositionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  caption: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginTop: 8,
  },
});

export default PhotoViewerDrawer;
