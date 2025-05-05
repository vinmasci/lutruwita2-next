import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Image } from 'react-native';
import { Text, Card, IconButton, useTheme as usePaperTheme } from 'react-native-paper';
import { RouteMap } from '../../services/routeService';
import { formatDistanceMetric, formatElevationMetric } from '../../utils/unitUtils';
import { Image as ImageIcon } from 'lucide-react-native';

interface RouteListDrawerProps {
  routes: RouteMap[];
  onSelectRoute: (route: RouteMap) => void;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.35; // Take up about 1/3 of the screen

const RouteListDrawer: React.FC<RouteListDrawerProps> = ({ routes, onSelectRoute, onClose }) => {
  const paperTheme = usePaperTheme();
  const translateY = useRef(new Animated.Value(DRAWER_HEIGHT)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (routes.length > 0) {
      setIsVisible(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    } else {
      handleClose();
    }
  }, [routes]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: DRAWER_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onClose();
    });
  };

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY }], height: DRAWER_HEIGHT }
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{routes.length} {routes.length === 1 ? 'Trail' : 'Trails'}</Text>
        <IconButton 
          icon="close" 
          size={20} 
          onPress={handleClose}
          style={styles.closeButton}
        />
      </View>
      
      <ScrollView style={styles.scrollView}>
        {routes.map((route, index) => (
          <TouchableOpacity 
            key={route.persistentId || index} 
            onPress={() => onSelectRoute(route)}
            style={styles.routeCard}
            activeOpacity={0.7}
          >
            <View style={styles.routeCardContent}>
              {/* Left side: Image or map preview */}
              <View style={styles.imageContainer}>
                {route.photos && route.photos.length > 0 && route.photos[0].url ? (
                  <Image 
                    source={{ uri: route.photos[0].url }} 
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : route.staticMapUrl ? (
                  <Image 
                    source={{ uri: route.staticMapUrl }} 
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                <View style={[styles.imagePlaceholder, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
                  <ImageIcon size={24} color={paperTheme.colors.onSurfaceVariant} />
                </View>
                )}
              </View>
              
              {/* Right side: Route details */}
              <View style={styles.detailsContainer}>
                <Text style={styles.routeName} numberOfLines={1} ellipsizeMode="tail">
                  {route.name}
                </Text>
                
                <Text style={styles.routeLocation} numberOfLines={1} ellipsizeMode="tail">
                  {route.metadata?.state || 'Tasmania'}, {route.metadata?.lga || 'Australia'}
                </Text>
                
                <View style={styles.statsRow}>
                  <Text style={styles.statsText}>
                    {formatDistanceMetric(
                      route.metadata?.totalDistance 
                        ? route.metadata.totalDistance * 1000 // Convert km to meters if from metadata
                        : (route.routes && route.routes.length > 0 ? route.routes[0]?.statistics?.totalDistance || 0 : 0)
                    )}
                  </Text>
                  {route.metadata?.totalAscent && (
                    <Text style={styles.statsText}>
                      • {route.metadata.totalAscent.toLocaleString()}m elev
                    </Text>
                  )}
                  {route.metadata?.unpavedPercentage !== undefined && (
                    <Text style={styles.statsText}>
                      • {route.metadata.unpavedPercentage}% unpaved
                    </Text>
                  )}
                </View>
              </View>
              
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    margin: 0,
  },
  scrollView: {
    flex: 1,
  },
  routeCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  routeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
    marginRight: 8,
  },
  routeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  routeLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
});

export default RouteListDrawer;
