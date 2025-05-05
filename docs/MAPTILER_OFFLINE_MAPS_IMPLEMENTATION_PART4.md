# MapTiler Offline Maps Implementation - Part 4: UI, Integration, and Benefits

## Implementation Plan: UI Components and MapLibre Integration

This section covers the implementation of the UI components for region-based downloads and the integration with MapLibre for displaying offline maps.

### 1. UI Components for Region-Based Downloads

Create a new screen for region selection and management:

```typescript
// mobile/lutruwita-mobile/src/screens/RegionsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useOfflineMaps } from '../context/OfflineMapsContext';
import { useMapTilerRegionService, Region } from '../services/mapTilerRegionService';
import { formatBytes } from '../utils/formatUtils';

export const RegionsScreen = () => {
  const { 
    downloadedRegions, 
    downloadRegion, 
    deleteRegion, 
    isRegionDownloaded,
    isDownloading,
    currentDownload,
    storageUsed,
    clearAllDownloads,
    error
  } = useOfflineMaps();
  const mapTilerRegionService = useMapTilerRegionService();
  const [regions, setRegions] = useState<Region[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    setRegions(mapTilerRegionService.getAvailableRegions());
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshDownloadedRegions();
    setRefreshing(false);
  };

  const renderRegionItem = ({ item }: { item: Region }) => {
    const isDownloaded = isRegionDownloaded(item.id);
    const isCurrentlyDownloading = currentDownload?.regionId === item.id;

    return (
      <View style={styles.regionCard}>
        <View style={styles.regionInfo}>
          <Text style={styles.regionName}>{item.name}</Text>
          <Text style={styles.regionSize}>
            {isDownloaded 
              ? `Size: ${formatBytes(item.downloadSize || 0)}`
              : `Estimated size: ${item.estimatedSize} MB`
            }
          </Text>
        </View>
        
        {isDownloaded ? (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => deleteRegion(item.id)}
            disabled={isDownloading}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        ) : isCurrentlyDownloading ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#0066cc" style={styles.progressIndicator} />
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${Math.round((currentDownload?.progress || 0) * 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round((currentDownload?.progress || 0) * 100)}%
            </Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={() => downloadRegion(item)}
            disabled={isDownloading}
          >
            <Text style={styles.buttonText}>Download</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Offline Regions</Text>
        <Text style={styles.storageInfo}>
          Total Storage: {formatBytes(storageUsed)}
        </Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <FlatList
        data={regions}
        renderItem={renderRegionItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
      
      {downloadedRegions.length > 0 && (
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={clearAllDownloads}
          disabled={isDownloading}
        >
          <Text style={styles.clearButtonText}>Clear All Downloads</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  storageInfo: {
    fontSize: 14,
    color: '#666'
  },
  listContent: {
    paddingBottom: 16
  },
  regionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  regionInfo: {
    flex: 1
  },
  regionName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  regionSize: {
    fontSize: 14,
    color: '#666'
  },
  downloadButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4
  },
  deleteButton: {
    backgroundColor: '#cc3300',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 150
  },
  progressIndicator: {
    marginRight: 8
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0066cc'
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0066cc',
    width: 40,
    textAlign: 'right'
  },
  errorContainer: {
    backgroundColor: '#ffeeee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    color: '#cc3300'
  },
  clearButton: {
    backgroundColor: '#666',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  }
});
```

### 2. Update Route Action Buttons

Modify the existing route action buttons to show region status:

```typescript
// mobile/lutruwita-mobile/src/components/map/RouteElevationDrawer/RouteActionButtons.tsx
import { useOfflineMaps } from '../../../context/OfflineMapsContext';
import { useNavigation } from '@react-navigation/native';

// In your component
const { isRouteAvailableOffline, getRegionForRoute } = useOfflineMaps();
const navigation = useNavigation();
const region = route ? getRegionForRoute(route) : null;
const isAvailableOffline = route ? isRouteAvailableOffline(route) : false;

// In your render method
{region && (
  <TouchableOpacity
    style={[styles.button, isAvailableOffline ? styles.downloadedButton : styles.downloadButton]}
    onPress={() => navigation.navigate('RegionsScreen')}
  >
    <Text style={styles.buttonText}>
      {isAvailableOffline 
        ? `Available Offline (${region.name})` 
        : `Download ${region.name} Region`}
    </Text>
  </TouchableOpacity>
)}
```

### 3. MapLibre Integration

For displaying the offline maps, use MapLibre (the open-source fork of Mapbox GL):

```typescript
// mobile/lutruwita-mobile/src/components/map/OfflineMapView.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as FileSystem from 'expo-file-system';
import { useOfflineMaps } from '../../context/OfflineMapsContext';
import { Region } from '../../services/mapTilerRegionService';

interface OfflineMapViewProps {
  route: RouteMap;
}

export const OfflineMapView: React.FC<OfflineMapViewProps> = ({ route }) => {
  const { getRegionForRoute } = useOfflineMaps();
  const [region, setRegion] = useState<Region | null>(null);
  const [styleURL, setStyleURL] = useState<any>(null);
  
  useEffect(() => {
    if (route) {
      const routeRegion = getRegionForRoute(route);
      setRegion(routeRegion);
      
      if (routeRegion) {
        // Set up MapLibre to use local tiles
        const style = {
          version: 8,
          sources: {
            'offline-tiles': {
              type: 'raster',
              tiles: [`file://${FileSystem.documentDirectory}maptiler_regions/${routeRegion.id}/{z}/{x}/{y}.png`],
              tileSize: 256,
              maxzoom: 15,
              minzoom: 9
            }
          },
          layers: [
            {
              id: 'offline-layer',
              type: 'raster',
              source: 'offline-tiles',
              minzoom: 9,
              maxzoom: 15
            }
          ]
        };
        
        setStyleURL(style);
      }
    }
  }, [route]);
  
  if (!styleURL || !route || !route.boundingBox) {
    return <View style={styles.container} />;
  }
  
  // Calculate center and bounds for the map
  const [[minLon, minLat], [maxLon, maxLat]] = route.boundingBox;
  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  
  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={styles.map}
        styleURL={styleURL}
      >
        <MapLibreGL.Camera
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
        {route.coordinates && (
          <MapLibreGL.ShapeSource
            id="route-source"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: route.coordinates
              }
            }}
          >
            <MapLibreGL.LineLayer
              id="route-line"
              style={{
                lineColor: '#0066cc',
                lineWidth: 3,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
        
        {/* Add start and end markers */}
        {route.coordinates && route.coordinates.length > 0 && (
          <>
            <MapLibreGL.PointAnnotation
              id="start-point"
              coordinate={route.coordinates[0]}
            >
              <View style={styles.startMarker} />
            </MapLibreGL.PointAnnotation>
            
            <MapLibreGL.PointAnnotation
              id="end-point"
              coordinate={route.coordinates[route.coordinates.length - 1]}
            >
              <View style={styles.endMarker} />
            </MapLibreGL.PointAnnotation>
          </>
        )}
      </MapLibreGL.MapView>
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
```

## Benefits and Considerations

### Benefits of the Region-Based Approach

1. **User Experience**: Users download entire regions once, then have access to all routes in that region.

2. **Efficiency**: No duplicate downloads of the same tiles for different routes.

3. **Simplicity**: Clear mental model for users ("I've downloaded Tasmania").

4. **Consistency**: Same region-based approach as our web app.

5. **Flexibility**: Can still show route-specific information on top of the base map.

6. **Reliability**: MapTiler's API is more stable and has fewer limitations than Mapbox's offline pack APIs.

7. **Authentication**: Simpler authentication model with just one API key.

### Considerations

1. **Initial Download Size**: Region downloads can be large (100MB+ for some regions), but this is a one-time cost.

2. **MapLibre Integration**: We'll need to use MapLibre instead of Mapbox GL, which may require some adjustments to our map rendering code.

3. **API Key Management**: We'll need to securely manage the MapTiler API key.

4. **Tile Expiration**: We should consider implementing a tile expiration policy to ensure users have up-to-date maps.

5. **Network Conditions**: We should handle poor network conditions gracefully during downloads.

## Implementation Steps

1. **Set up MapTiler API key**: Get an API key from MapTiler.

2. **Create region configuration**: Define our regions in a config file.

3. **Implement the region service**: Adapt our web app's region logic.

4. **Build the tile storage service**: Modify our existing tile storage code.

5. **Update the UI**: Create the regions screen and update route buttons.

6. **Integrate MapLibre**: Set up the map view to use local tiles.

7. **Test and refine**: Test the implementation on different devices and network conditions.

## Conclusion

Switching from Mapbox to MapTiler for offline maps offers several advantages, including better reliability, simpler authentication, and consistency with our web app. The region-based approach provides a better user experience by allowing users to download entire regions once and access all routes within that region offline.

By leveraging our existing region-based architecture from the web app, we can implement this solution relatively quickly and provide a more robust offline maps experience for our users.
