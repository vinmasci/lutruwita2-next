import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated, TouchableOpacity, ScrollView } from 'react-native';
import { POI } from '../../services/routeService';
import { X } from 'lucide-react-native';

interface POIDetailsDrawerProps {
  poi: POI | null;
  onClose: () => void;
}

const POIDetailsDrawer: React.FC<POIDetailsDrawerProps> = ({ poi, onClose }) => {
  const translateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (poi) {
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
  }, [poi, translateY]);

  if (!poi) return null;

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
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={24} color="#000" />
          </TouchableOpacity>
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
          
          {poi.photos && poi.photos.length > 0 && (
            <View style={styles.photosSection}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <Text style={styles.photoPlaceholder}>Photo content would appear here</Text>
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
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 12,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  photosSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  photoPlaceholder: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    textAlign: 'center',
    color: '#666',
  },
});

export default POIDetailsDrawer;
