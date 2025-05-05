import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, FlatList } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { RouteMap } from '../../services/routeService';
import { ArrowRight, Camera, Bookmark } from 'lucide-react-native';
import { formatDistanceMetric, formatNumberWithCommas } from '../../utils/unitUtils';
import { useSavedRoutes } from '../../context/FirebaseSavedRoutesContext';

interface SavedRouteCardProps {
  route: RouteMap;
  onPress: (routeId: string) => void;
}

const SavedRouteCard: React.FC<SavedRouteCardProps> = ({ route, onPress }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photoListRef = useRef<FlatList>(null);
  const { removeRoute, isRouteSaved } = useSavedRoutes();
  const [isSaving, setIsSaving] = useState(false);
  // No need for a saved state since this component is only used in the SavedRoutes screen
  // and we want the component to be removed from the list when unsaved
  
  // Get distance from metadata first (preferred) or from first route statistics
  const totalDistance = route.metadata?.totalDistance 
    ? route.metadata.totalDistance * 1000 // Convert km to meters if from metadata
    : (route.routes && route.routes.length > 0 ? route.routes[0]?.statistics?.totalDistance || 0 : 0);
  
  const formattedDistance = formatDistanceMetric(totalDistance);
  
  // Prepare photos for the slider
  const photos = route.photos || [];
  const hasPhotos = photos.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        {/* Left side: Route Info */}
        <View style={styles.infoContainer}>
          {/* Title */}
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {route.name || 'Untitled Map'}
          </Text>
          
          {/* Location */}
          <Text style={styles.location} numberOfLines={1}>
            {route.metadata?.state || 'Tasmania'}
          </Text>
          
          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>{formattedDistance}</Text>
              {route.routes && (
                <>
                  <Text style={styles.statDot}>•</Text>
                  <Text style={styles.statText}>{route.routes.length} {route.routes.length === 1 ? 'stage' : 'stages'}</Text>
                </>
              )}
            </View>
            
            {/* Elevation and Unpaved Percentage */}
            <View style={styles.statsRow}>
              {(route.metadata?.totalAscent || (route.routes && route.routes[0]?.statistics?.elevationGain)) && (
                <>
                  <Text style={styles.statText}>
                    {formatNumberWithCommas(route.metadata?.totalAscent || route.routes[0]?.statistics?.elevationGain || 0)} m ↑
                  </Text>
                  <Text style={styles.statDot}>•</Text>
                </>
              )}
              
              {route.metadata?.unpavedPercentage !== undefined && (
                <Text style={styles.statText}>
                  {route.metadata.unpavedPercentage}% unpaved
                </Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Right side: Photo Slider with navigation arrows */}
        <View style={styles.imageContainer}>
          {hasPhotos ? (
            <View style={styles.photoSliderContainer}>
              {/* Left arrow for previous photo */}
              {photos.length > 1 && currentPhotoIndex > 0 && (
                <TouchableOpacity 
                  style={[styles.photoNavButton, styles.photoNavButtonLeft]}
                  onPress={() => {
                    const newIndex = Math.max(0, currentPhotoIndex - 1);
                    setCurrentPhotoIndex(newIndex);
                    photoListRef.current?.scrollToIndex({
                      index: newIndex,
                      animated: true
                    });
                  }}
                >
                  <Text style={styles.photoNavButtonText}>‹</Text>
                </TouchableOpacity>
              )}
              
              {/* Right arrow for next photo */}
              {photos.length > 1 && currentPhotoIndex < photos.length - 1 && (
                <TouchableOpacity 
                  style={[styles.photoNavButton, styles.photoNavButtonRight]}
                  onPress={() => {
                    const newIndex = Math.min(photos.length - 1, currentPhotoIndex + 1);
                    setCurrentPhotoIndex(newIndex);
                    photoListRef.current?.scrollToIndex({
                      index: newIndex,
                      animated: true
                    });
                  }}
                >
                  <Text style={styles.photoNavButtonText}>›</Text>
                </TouchableOpacity>
              )}
              
              <FlatList
                ref={photoListRef}
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={150}
                snapToAlignment="center"
                disableIntervalMomentum={true}
                directionalLockEnabled={true} // Lock to horizontal scrolling only
                keyExtractor={(item, index) => item._id || item.url || `photo-${index}`}
                onMomentumScrollEnd={(event) => {
                  const newIndex = Math.round(
                    event.nativeEvent.contentOffset.x / 150
                  );
                  setCurrentPhotoIndex(newIndex);
                }}
                renderItem={({ item }) => (
                  <View style={styles.photoSlide}>
                    <Image 
                      source={{ uri: item.url }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  </View>
                )}
              />
              
              {/* Photo count indicator */}
              {photos.length > 1 && (
                <View style={styles.photoCountContainer}>
                  <Text style={styles.photoCountText}>
                    {currentPhotoIndex + 1}/{photos.length}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noPhotosContainer}>
              <Camera size={24} color="#999" />
              <Text style={styles.noPhotosText}>No photos</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.saveButton, styles.savedButton]} // Always use savedButton style since this is in the SavedRoutes screen
          onPress={async () => {
            if (!route) return;
            
            setIsSaving(true);
            try {
              console.log(`[SavedRouteCard] Unsaving route ${route.persistentId}`);
              
              // Remove from saved routes
              const success = await removeRoute(route.persistentId);
              if (success) {
                console.log(`[SavedRouteCard] Successfully unsaved route ${route.persistentId}`);
                // The route will be removed from the list by the SavedRoutesContext
              } else {
                console.error(`[SavedRouteCard] Failed to unsave route ${route.persistentId}`);
              }
            } catch (error) {
              console.error(`[SavedRouteCard] Error removing route:`, error);
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Unsave</Text>
              <Bookmark 
                size={16} 
                color="#ffffff" 
                style={styles.saveButtonIcon} 
                fill="#ffffff"
              />
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => onPress(route.persistentId)}
        >
          <Text style={styles.viewButtonText}>View Route</Text>
          <ArrowRight size={16} color="#ffffff" style={styles.viewButtonIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  infoContainer: {
    flex: 1,
    marginRight: 12,
  },
  imageContainer: {
    width: 150,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoSliderContainer: {
    width: 150,
    height: 120,
  },
  photoSlide: {
    width: 150,
    height: 120,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  noPhotosContainer: {
    width: 150,
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotosText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statsContainer: {
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  statDot: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  saveButton: {
    backgroundColor: '#4CAF50', // Green color for save button
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  savedButton: {
    backgroundColor: '#2e7d32', // Darker green for saved state
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 4,
  },
  saveButtonIcon: {
    marginLeft: 2,
  },
  viewButton: {
    backgroundColor: '#3366ff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 4,
  },
  viewButtonIcon: {
    marginLeft: 2,
  },
  // Photo navigation styles
  photoNavButton: {
    position: 'absolute',
    top: '50%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    transform: [{ translateY: -12 }],
  },
  photoNavButtonLeft: {
    left: 4,
  },
  photoNavButtonRight: {
    right: 4,
  },
  photoNavButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
    textAlign: 'center',
  },
  photoCountContainer: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCountText: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#ffffff',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
});

export default SavedRouteCard;
