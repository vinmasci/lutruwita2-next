import React, { useEffect, useState, useMemo } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox';
import { ensureCorrectCoordinateOrder, ensureCorrectBoundingBox } from '../../utils/coordinateUtils';

interface CleanStaticMapProps {
  center?: [number, number]; // [longitude, latitude]
  zoom?: number;
  width?: number;
  height?: number;
  style?: object;
  onMapReady?: () => void;
  routes?: any[]; // Keep routes prop for future use
  boundingBox?: [[number, number], [number, number]]; // Optional bounding box
  staticMapUrl?: string; // Add staticMapUrl prop to use pre-generated static map from Cloudinary
}

/**
 * A clean, simple static map component that only shows the map image
 * without any test UI elements, headers, or unnecessary spinners
 */
const CleanStaticMap: React.FC<CleanStaticMapProps> = ({
  center = [146.8087, -41.4419], // Default to Tasmania
  zoom = 8,
  width = 600,
  height = 400,
  style,
  onMapReady,
  routes = [],
  boundingBox,
  staticMapUrl
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // If we have a pre-generated static map URL from Cloudinary, use it
  if (staticMapUrl) {
    console.log('[CleanStaticMap] Using pre-generated static map URL from Cloudinary');
    return (
      <View style={[styles.container, style]}>
        <Image
          source={{ uri: staticMapUrl }}
          style={styles.map}
          onLoad={() => {
            console.log('[CleanStaticMap] Pre-generated image loaded successfully');
            if (onMapReady) {
              onMapReady();
            }
          }}
          onError={(error) => {
            console.error('[CleanStaticMap] Error loading pre-generated image:', error);
          }}
          resizeMode="cover"
        />
      </View>
    );
  }
  
  // Generate the static map URL using Mapbox - using useMemo to prevent regenerating on every render
  const mapboxUrl = useMemo(() => {
    let url = '';
    let pathOverlay = '';
    
    // Check if we have route data to display
    if (routes && routes.length > 0 && routes[0]?.geojson?.features) {
      try {
        // Extract coordinates from the first route's first feature
        const feature = routes[0].geojson.features[0];
        if (feature && feature.geometry && feature.geometry.coordinates) {
          // Get the first 100 coordinates to avoid URL length limits
          const coords = feature.geometry.coordinates.slice(0, 100);
          if (coords.length > 0) {
            // Format coordinates for path overlay: path-5+f44-0.5(lon1,lat1,lon2,lat2,...)
            const pathCoords = coords.map((coord: [number, number]) => `${coord[0]},${coord[1]}`).join(',');
            pathOverlay = `path-3+3366ff-0.75(${pathCoords})/`;
            console.log('[CleanStaticMap] Added path overlay with', coords.length, 'points');
          }
        }
      } catch (error) {
        console.error('[CleanStaticMap] Error creating path overlay:', error);
      }
    }

    // If we have a bounding box, use it to create a static map that shows the entire route
    if (boundingBox) {
      try {
        const correctedBoundingBox = ensureCorrectBoundingBox(boundingBox);
        console.log('[CleanStaticMap] Using bounding box:', correctedBoundingBox);
        
        // Format: [minLng,minLat,maxLng,maxLat]
        const bbox = [
          correctedBoundingBox[0][0], // minLng
          correctedBoundingBox[0][1], // minLat
          correctedBoundingBox[1][0], // maxLng
          correctedBoundingBox[1][1]  // maxLat
        ].join(',');
        
        // Use auto parameter with the bounding box coordinates
        // If we have a path overlay, add it before the bounding box
        if (pathOverlay) {
          url = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/${pathOverlay}[${bbox}]/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;
        } else {
          url = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/[${bbox}]/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;
        }
        
        console.log('[CleanStaticMap] Generated URL with bounding box:', url);
      } catch (error) {
        console.error('[CleanStaticMap] Error with bounding box:', error);
        
        // Fallback to center/zoom if bounding box fails
        const correctedCenter = ensureCorrectCoordinateOrder(center);
        
        // If we have a path overlay, add it before the center coordinates
        if (pathOverlay) {
          url = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/${pathOverlay}${correctedCenter[0]},${correctedCenter[1]},${zoom},0/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;
        } else {
          url = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/${correctedCenter[0]},${correctedCenter[1]},${zoom},0/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;
        }
        
        console.log('[CleanStaticMap] Fallback to center/zoom URL:', url);
      }
    } 
    // Otherwise use center and zoom
    else {
      // Ensure coordinates are in the correct order
      const correctedCenter = ensureCorrectCoordinateOrder(center);
      
      // Generate the static map URL centered at the route location
      // If we have a path overlay, add it before the center coordinates
      if (pathOverlay) {
        url = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/${pathOverlay}${correctedCenter[0]},${correctedCenter[1]},${zoom},0/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;
      } else {
        url = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/${correctedCenter[0]},${correctedCenter[1]},${zoom},0/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;
      }
      
      console.log('[CleanStaticMap] Generated URL with center/zoom:', url);
    }
    
    return url;
  }, [routes, boundingBox, center, zoom, width, height]); // Only regenerate URL when these props change
  
  // Log when the component mounts or the URL changes
  useEffect(() => {
    console.log('[CleanStaticMap] Component mounted or URL changed');
    console.log('[CleanStaticMap] Using URL:', mapboxUrl);
  }, [mapboxUrl]);

  return (
    <View style={[styles.container, style]}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3366ff" />
        </View>
      )}
      
      <Image
        source={{ uri: mapboxUrl }}
        style={styles.map}
        onLoad={() => {
          console.log('[CleanStaticMap] Image loaded successfully');
          setIsLoading(false);
          if (onMapReady) {
            onMapReady();
          }
        }}
        onError={(error) => {
          console.error('[CleanStaticMap] Error loading image:', error);
          setIsLoading(false);
          setHasError(true);
        }}
        resizeMode="cover"
      />
      
      {hasError && (
        <View style={styles.errorContainer}>
          <View style={styles.placeholderImage} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  }
});

export default CleanStaticMap;
