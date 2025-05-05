import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
// Using the Mapbox package that's already installed
import MapboxGL from '@rnmapbox/maps';
import { useRouteSpecificOfflineMaps } from '../../context/RouteSpecificOfflineMapsContext';
import { RouteMap } from '../../services/routeService';

interface OfflineMapViewProps {
  route: RouteMap;
}

export const OfflineMapView: React.FC<OfflineMapViewProps> = ({ route }) => {
  const { isRouteDownloaded, configureOfflineMap } = useRouteSpecificOfflineMaps();
  
  const [styleURL, setStyleURL] = useState<any>(null);
  
  useEffect(() => {
    if (route && route.persistentId) {
      // Check if the route is available using the route-specific approach
      const routeAvailable = isRouteDownloaded(route.persistentId);
      
      if (routeAvailable) {
        console.log(`[OfflineMapView] Using route-specific offline maps for route ${route.persistentId}`);
        // Use the route-specific offline map style
        const style = configureOfflineMap(route.persistentId);
        setStyleURL(style);
      } else {
        console.log(`[OfflineMapView] No offline maps available for route ${route.persistentId}`);
        setStyleURL(null);
      }
    }
  }, [route, isRouteDownloaded, configureOfflineMap]);
  
  if (!styleURL || !route || !route.boundingBox) {
    return <View style={styles.container} />;
  }
  
  // Calculate center and bounds for the map
  const [[minLon, minLat], [maxLon, maxLat]] = route.boundingBox;
  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  
  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={styleURL}
      >
        <MapboxGL.Camera
          defaultSettings={{
            centerCoordinate: [centerLon, centerLat],
            zoomLevel: 12
          }}
          bounds={{
            ne: [maxLon, maxLat],
            sw: [minLon, minLat],
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 16,
            paddingBottom: 16
          }}
        />
        
        {/* Add route lines */}
        {route.routes && route.routes.length > 0 && route.routes[0].geojson && (
          <MapboxGL.ShapeSource
            id="route-source"
            shape={route.routes[0].geojson.features[0]}
          >
            <MapboxGL.LineLayer
              id="route-line"
              style={{
                lineColor: '#0066cc',
                lineWidth: 3,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          </MapboxGL.ShapeSource>
        )}
        
        {/* Add start and end markers */}
        {route.routes && route.routes.length > 0 && 
         route.routes[0].geojson && 
         route.routes[0].geojson.features && 
         route.routes[0].geojson.features.length > 0 &&
         route.routes[0].geojson.features[0].geometry &&
         route.routes[0].geojson.features[0].geometry.coordinates &&
         route.routes[0].geojson.features[0].geometry.coordinates.length > 0 && (
          <>
            <MapboxGL.PointAnnotation
              id="start-point"
              coordinate={route.routes[0].geojson.features[0].geometry.coordinates[0]}
            >
              <View style={styles.startMarker} />
            </MapboxGL.PointAnnotation>
            
            <MapboxGL.PointAnnotation
              id="end-point"
              coordinate={route.routes[0].geojson.features[0].geometry.coordinates[route.routes[0].geojson.features[0].geometry.coordinates.length - 1]}
            >
              <View style={styles.endMarker} />
            </MapboxGL.PointAnnotation>
          </>
        )}
      </MapboxGL.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    flex: 1
  },
  startMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00cc66',
    borderWidth: 2,
    borderColor: 'white'
  },
  endMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#cc3300',
    borderWidth: 2,
    borderColor: 'white'
  }
});

export default OfflineMapView;
