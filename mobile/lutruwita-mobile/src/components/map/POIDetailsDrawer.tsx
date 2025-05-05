import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Animated, TouchableOpacity, ScrollView, ActivityIndicator, Linking, FlatList, Image, Dimensions } from 'react-native'; // Added FlatList, Image, Dimensions
import { POI } from '../../services/routeService';
import { fetchPlaceDetails, GooglePlaceDetails, getGooglePhotoUrl } from '../../services/googlePlacesService'; // Import the service and helper
import { X, Phone, Globe, Clock, Star, MapPin as MapPinIcon, Image as ImageIcon } from 'lucide-react-native'; // Import necessary icons, added ImageIcon

const { width: screenWidth } = Dimensions.get('window');
const imageWidth = screenWidth * 0.8; // Make image slightly smaller than screen width
const imageHeight = imageWidth * (9 / 16); // Maintain aspect ratio (e.g., 16:9)

interface POIDetailsDrawerProps {
  poi: POI | null;
  onClose: () => void;
}

const POIDetailsDrawer: React.FC<POIDetailsDrawerProps> = ({ poi, onClose }) => {
  const translateY = useRef(new Animated.Value(300)).current;
  const [googlePlacesDetails, setGooglePlacesDetails] = useState<GooglePlaceDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when POI changes or drawer closes
    setGooglePlacesDetails(null);
    setIsLoadingDetails(false);
    setDetailsError(null);

    if (poi) {
      // Animate drawer sliding up
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();

      // Fetch Google Places details if placeId exists
      const placeId = poi.googlePlaces?.placeId; // Capture placeId
      if (placeId) {
        const loadDetails = async (id: string) => { // Pass id as argument
          setIsLoadingDetails(true);
          setDetailsError(null);
          try {
            const details = await fetchPlaceDetails(id); // Use argument
            setGooglePlacesDetails(details);
          } catch (error) {
            console.error("Error fetching Google Place Details in drawer:", error);
            setDetailsError("Failed to load place details.");
          } finally {
            setIsLoadingDetails(false);
          }
        };
        loadDetails(placeId); // Call with captured placeId
      }
      // End of fetching logic
    } else {
      // Animate drawer sliding down if poi becomes null
      Animated.timing(translateY, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [poi]); // Only depend on poi, translateY doesn't need to trigger refetch

  if (!poi) return null;

  // Helper to render opening hours
  const renderOpeningHours = (hours?: GooglePlaceDetails['opening_hours']) => {
    if (!hours?.weekday_text) return null;
    // Get current day (0=Sunday, 6=Saturday) - JS Date uses 0 for Sunday
    const currentDayIndex = new Date().getDay();
    // Reorder weekday_text so current day is first
    const orderedHours = [
      ...hours.weekday_text.slice(currentDayIndex),
      ...hours.weekday_text.slice(0, currentDayIndex)
    ];

    return (
      <View style={styles.detailsRow}>
        <Clock size={16} color="#666" style={styles.icon} />
        <View style={styles.detailsTextContainer}>
          <Text style={[styles.detailsText, styles.openingHoursStatus, hours.open_now ? styles.open : styles.closed]}>
            {hours.open_now ? 'Open Now' : 'Closed Now'}
          </Text>
          {orderedHours.map((dayHours, index) => (
             <Text key={index} style={[styles.detailsText, styles.weekdayHours, index === 0 ? styles.currentDayHours : null]}>
               {dayHours}
             </Text>
           ))}
        </View>
      </View>
    );
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
          {/* Close button removed */}
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.title}>{poi.name || 'Point of Interest'}</Text>

          {poi.category && (
            <View style={styles.categoryContainer}>
              <Text style={styles.categoryText}>{poi.category.replace('-', ' ')}</Text>
            </View>
          )}

          {poi.description ? (
            <Text style={styles.description}>{poi.description}</Text>
          ) : (
            <Text style={styles.description}>No additional information available for this point of interest.</Text>
          )}

          {/* Google Places Details Section */}
          {poi.googlePlaces?.placeId && (
            <View style={styles.googlePlacesSection}>
              <Text style={styles.sectionTitle}>Place Information</Text>
              {isLoadingDetails && <ActivityIndicator size="small" color="#666" />}
              {detailsError && <Text style={styles.errorText}>{detailsError}</Text>}
              {googlePlacesDetails && !isLoadingDetails && !detailsError && (
                <>
                  {/* Rating */}
                  {googlePlacesDetails.rating !== undefined && (
                    <View style={styles.detailsRow}>
                      <Star size={16} color="#666" style={styles.icon} />
                      <Text style={styles.detailsText}>{googlePlacesDetails.rating.toFixed(1)} / 5 Stars</Text>
                    </View>
                  )}
                  {/* Address */}
                  {googlePlacesDetails.formatted_address && (
                     <View style={styles.detailsRow}>
                       <MapPinIcon size={16} color="#666" style={styles.icon} />
                       <Text style={styles.detailsText}>{googlePlacesDetails.formatted_address}</Text>
                     </View>
                  )}
                  {/* Phone */}
                  {googlePlacesDetails.international_phone_number && (
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${googlePlacesDetails.international_phone_number}`)}>
                      <View style={styles.detailsRow}>
                        <Phone size={16} color="#666" style={styles.icon} />
                        <Text style={[styles.detailsText, styles.linkText]}>{googlePlacesDetails.international_phone_number}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {/* Website */}
                  {googlePlacesDetails.website && (
                     <TouchableOpacity onPress={() => Linking.openURL(googlePlacesDetails.website!)}>
                       <View style={styles.detailsRow}>
                         <Globe size={16} color="#666" style={styles.icon} />
                         <Text style={[styles.detailsText, styles.linkText]}>{googlePlacesDetails.website}</Text>
                       </View>
                     </TouchableOpacity>
                  )}
                  {/* Opening Hours */}
                  {renderOpeningHours(googlePlacesDetails.opening_hours)}

                  {/* Google Places Photos Slider */}
                  {googlePlacesDetails.photos && googlePlacesDetails.photos.length > 0 && (
                    <View style={styles.googlePhotosSection}>
                       <Text style={styles.sectionTitle}>Photos from Google</Text>
                       <FlatList
                         data={googlePlacesDetails.photos.slice(0, 5)} // Limit to first 5 photos
                         horizontal
                         pagingEnabled
                         showsHorizontalScrollIndicator={false}
                         keyExtractor={(item) => item.photo_reference}
                         renderItem={({ item }) => {
                           const photoUrl = getGooglePhotoUrl(item.photo_reference, Math.round(imageWidth * 1.5)); // Request slightly larger image for quality
                           if (!photoUrl) return null; // Skip if URL generation fails
                           return (
                             <View style={styles.slide}>
                               <Image
                                 source={{ uri: photoUrl }}
                                 style={styles.googlePhoto}
                                 resizeMode="cover"
                               />
                             </View>
                           );
                         }}
                         ListEmptyComponent={<Text style={styles.photoPlaceholder}>No photos available.</Text>}
                         style={styles.slider}
                       />
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Section for POI photos from Cloudinary (if any) - Kept separate */}
          {poi.photos && poi.photos.length > 0 && (
             <View style={styles.photosSection}>
               <Text style={styles.sectionTitle}>Photos</Text>
               {/* Placeholder for Cloudinary photos - implement separately if needed */}
               <View style={styles.cloudinaryPhotoPlaceholder}>
                 <ImageIcon size={40} color="#999" />
                 <Text style={styles.photoPlaceholderText}>
                   {poi.photos.length} photo{poi.photos.length > 1 ? 's' : ''} attached to this POI.
                 </Text>
                 <Text style={styles.photoPlaceholderSubText}>
                   (Display logic for these photos not implemented here)
                 </Text>
               </View>
             </View>
           )}
        </ScrollView>
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
  // closeButton style removed
  content: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  categoryContainer: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 20,
  },
  googlePlacesSection: {
    marginTop: 10,
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align items to the top for multi-line text
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
    marginTop: 3, // Adjust icon position slightly
  },
   detailsTextContainer: {
    flex: 1, // Allow text to wrap
  },
  detailsText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22, // Improve readability for multi-line text
  },
  linkText: {
    color: '#007AFF', // Standard link blue
    textDecorationLine: 'underline',
  },
  openingHoursStatus: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  open: {
    color: '#34C759', // Green for open
  },
  closed: {
    color: '#FF3B30', // Red for closed
  },
  weekdayHours: {
     fontSize: 14,
     color: '#666',
     lineHeight: 20,
  },
  currentDayHours: {
     fontWeight: 'bold',
     color: '#000', // Highlight current day
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  sectionTitle: { // Add the global definition back
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  photosSection: {
    marginTop: 16,
  },
  // sectionTitle is defined globally above
  photoPlaceholder: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    textAlign: 'center',
    color: '#666',
  },
  googlePhotosSection: {
    marginTop: 16,
    marginBottom: 10,
  },
  slider: {
    marginTop: 8,
    marginBottom: 8,
  },
  slide: {
    width: screenWidth, // Each slide takes full screen width for paging
    paddingHorizontal: screenWidth * 0.1, // Center the image with padding
    alignItems: 'center',
  },
  googlePhoto: {
    width: imageWidth,
    height: imageHeight,
    borderRadius: 8,
    backgroundColor: '#e0e0e0', // Placeholder color while loading
  },
  cloudinaryPhotoPlaceholder: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  photoPlaceholderSubText: {
     marginTop: 4,
     fontSize: 12,
     color: '#999',
     textAlign: 'center',
   },
});

export default POIDetailsDrawer;
