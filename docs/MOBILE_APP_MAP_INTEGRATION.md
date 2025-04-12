# Lutruwita Mobile App: Map Integration and Enhanced Map Experience

## WebView-Based Map Implementation

To enable map functionality in the mobile app without requiring a development build, we've implemented a WebView-based solution using Mapbox GL JS. This approach allows us to display maps and routes in the Expo Go app during development, with plans to transition to Mapbox GL Native for production.

### Implementation Overview

The implementation consists of three main components:

1. **HTML/JS Map Page**: An HTML file with Mapbox GL JS that runs in the WebView
2. **WebMapView Component**: A React Native component that wraps the WebView and handles communication
3. **MapView Component**: A drop-in replacement for the native MapView that uses WebMapView internally

### HTML/JS Map Page

The HTML file (`assets/mapbox-gl.html`) contains the Mapbox GL JS implementation:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Mapbox GL JS</title>
  <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Initialize map with default values
    let map;
    let mapInitialized = false;
    let mapStyle = 'mapbox://styles/mapbox/outdoors-v11';
    let mapCenter = [146.8087, -41.4419]; // Tasmania center
    let mapZoom = 7;
    let showUserLocation = false;
    let routes = [];

    // Function to initialize the map
    function initializeMap(accessToken) {
      if (mapInitialized) return;
      
      mapboxgl.accessToken = accessToken;
      
      map = new mapboxgl.Map({
        container: 'map',
        style: mapStyle,
        center: mapCenter,
        zoom: mapZoom
      });
      
      // Add navigation control
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Add user location control if enabled
      if (showUserLocation) {
        map.addControl(new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }));
      }
      
      // Add event listeners
      map.on('load', () => {
        mapInitialized = true;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'mapReady'
        }));
        
        // Add source and layer for routes
        map.addSource('routes', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
        
        // Add routes if available
        if (routes.length > 0) {
          updateRoutes(routes);
        }
      });
      
      map.on('moveend', () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        const bounds = map.getBounds();
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'regionDidChange',
          center: [center.lng, center.lat],
          zoom: zoom,
          bounds: {
            ne: [bounds.getNorthEast().lng, bounds.getNorthEast().lat],
            sw: [bounds.getSouthWest().lng, bounds.getSouthWest().lat]
          }
        }));
      });
    }
    
    // Function to update routes
    function updateRoutes(routesData) {
      routes = routesData;
      
      if (!mapInitialized) return;
      
      // Filter visible routes
      const visibleRoutes = routesData.filter(route => route.isVisible);
      
      // Create features array
      const features = [];
      
      visibleRoutes.forEach(route => {
        if (route.geojson && route.geojson.features && route.geojson.features.length > 0) {
          route.geojson.features.forEach(feature => {
            // Add color to feature properties
            const newFeature = { ...feature };
            newFeature.properties = {
              ...newFeature.properties,
              color: route.color || '#ff4d4d'
            };
            features.push(newFeature);
          });
        }
      });
      
      // Update source data
      if (map.getSource('routes')) {
        map.getSource('routes').setData({
          type: 'FeatureCollection',
          features: features
        });
      }
      
      // Add layer if it doesn't exist
      if (!map.getLayer('route-lines')) {
        map.addLayer({
          id: 'route-lines',
          type: 'line',
          source: 'routes',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 4
          }
        });
      }
    }
    
    // Function to handle messages from React Native
    function handleMessage(message) {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'initialize':
          initializeMap(data.accessToken);
          break;
        case 'updateMapStyle':
          updateMapStyle(data.style);
          break;
        case 'updateMapCenter':
          updateMapCenter(data.center);
          break;
        case 'updateMapZoom':
          updateMapZoom(data.zoom);
          break;
        case 'updateRoutes':
          updateRoutes(data.routes);
          break;
        case 'setUserLocationEnabled':
          showUserLocation = data.enabled;
          break;
      }
    }
    
    // Set up message handler
    document.addEventListener('message', function(event) {
      handleMessage(event.data);
    });
    
    // For iOS
    window.addEventListener('message', function(event) {
      handleMessage(event.data);
    });
  </script>
</body>
</html>
```

### WebMapView Component

The WebMapView component (`src/components/map/WebMapView.tsx`) handles communication with the WebView:

```typescript
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../theme';
import { useMap } from '../../context/MapContext';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES } from '../../config/mapbox';
import { RouteData } from '../../services/routeService';

export interface WebMapViewProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  style?: object;
  showUserLocation?: boolean;
  onMapReady?: () => void;
  onRegionDidChange?: (region: any) => void;
  routes?: RouteData[];
}

const WebMapView: React.FC<WebMapViewProps> = ({
  initialCenter,
  initialZoom,
  style,
  showUserLocation = false,
  onMapReady,
  onRegionDidChange,
  routes = [],
}) => {
  const { isDark } = useTheme();
  const { updateMapCenter, updateMapZoom, updateMapBounds, setMapLoaded } = useMap();
  const webViewRef = useRef<WebView>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  // Load HTML file
  useEffect(() => {
    const loadHtmlFile = async () => {
      try {
        // Get the path to the HTML file
        const htmlFile = require('../../../assets/mapbox-gl.html');
        const asset = Asset.fromModule(htmlFile);
        await asset.downloadAsync();
        
        if (asset.localUri) {
          // Read the file content
          const content = await FileSystem.readAsStringAsync(asset.localUri);
          setHtmlContent(content);
        }
      } catch (error) {
        console.error('Error loading HTML file:', error);
      }
    };
    
    loadHtmlFile();
  }, []);

  // Initialize map when HTML content is loaded
  useEffect(() => {
    if (htmlContent && webViewRef.current) {
      // Set the map style based on the theme
      const mapStyle = isDark 
        ? MAP_STYLES.DARK
        : MAP_STYLES.OUTDOORS;
      
      // Initialize the map
      const initMessage = {
        type: 'initialize',
        accessToken: MAPBOX_ACCESS_TOKEN,
      };
      
      webViewRef.current.injectJavaScript(`
        handleMessage('${JSON.stringify(initMessage)}');
        true;
      `);
      
      // Set user location
      const userLocationMessage = {
        type: 'setUserLocationEnabled',
        enabled: showUserLocation,
      };
      
      webViewRef.current.injectJavaScript(`
        handleMessage('${JSON.stringify(userLocationMessage)}');
        true;
      `);
      
      // Set map style
      const styleMessage = {
        type: 'updateMapStyle',
        style: mapStyle,
      };
      
      webViewRef.current.injectJavaScript(`
        handleMessage('${JSON.stringify(styleMessage)}');
        true;
      `);
      
      // Set initial center
      if (initialCenter) {
        const centerMessage = {
          type: 'updateMapCenter',
          center: initialCenter,
        };
        
        webViewRef.current.injectJavaScript(`
          handleMessage('${JSON.stringify(centerMessage)}');
          true;
        `);
      }
      
      // Set initial zoom
      if (initialZoom) {
        const zoomMessage = {
          type: 'updateMapZoom',
          zoom: initialZoom,
        };
        
        webViewRef.current.injectJavaScript(`
          handleMessage('${JSON.stringify(zoomMessage)}');
          true;
        `);
      }
      
      // Set routes
      if (routes.length > 0) {
        const routesMessage = {
          type: 'updateRoutes',
          routes: routes,
        };
        
        webViewRef.current.injectJavaScript(`
          handleMessage('${JSON.stringify(routesMessage)}');
          true;
        `);
      }
    }
  }, [htmlContent, isDark, initialCenter, initialZoom, routes, showUserLocation]);

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'mapReady':
          setMapLoaded(true);
          if (onMapReady) {
            onMapReady();
          }
          break;
        case 'regionDidChange':
          if (data.center) {
            updateMapCenter(data.center);
          }
          if (data.zoom) {
            updateMapZoom(data.zoom);
          }
          if (data.bounds) {
            updateMapBounds(data.bounds);
          }
          if (onRegionDidChange) {
            onRegionDidChange(data);
          }
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Update routes when they change
  useEffect(() => {
    if (webViewRef.current && routes.length > 0) {
      const routesMessage = {
        type: 'updateRoutes',
        routes: routes,
      };
      
      webViewRef.current.injectJavaScript(`
        handleMessage('${JSON.stringify(routesMessage)}');
        true;
      `);
    }
  }, [routes]);

  if (!htmlContent) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webView}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        originWhitelist={['*']}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        mixedContentMode="always"
        geolocationEnabled={showUserLocation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default WebMapView;
```

### MapView Component

The MapView component (`src/components/map/MapView.tsx`) is a drop-in replacement for the native MapView:

```typescript
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute } from '../../context/RouteContext';
import WebMapView from './WebMapView';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../../config/mapbox';

export interface MapViewProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  style?: object;
  showUserLocation?: boolean;
  onMapReady?: () => void;
  onRegionDidChange?: (region: any) => void;
  children?: React.ReactNode;
  routeId?: string;
}

const MapView: React.FC<MapViewProps> = ({
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  style,
  showUserLocation = false,
  onMapReady,
  onRegionDidChange,
  children,
  routeId,
}) => {
  const { routeState } = useRoute();
  
  // Get the route to display
  const routeToDisplay = routeId 
    ? routeState.routes.find(r => r.persistentId === routeId) || routeState.selectedRoute
    : routeState.selectedRoute;

  // Determine the center and zoom to use
  const centerToUse = routeToDisplay?.mapState?.center || initialCenter;
  const zoomToUse = routeToDisplay?.mapState?.zoom || initialZoom;

  return (
    <View style={[styles.container, style]}>
      <WebMapView
        initialCenter={centerToUse}
        initialZoom={zoomToUse}
        style={styles.map}
        showUserLocation={showUserLocation}
        onMapReady={onMapReady}
        onRegionDidChange={onRegionDidChange}
        routes={routeToDisplay?.routes || []}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default MapView;
```

## Benefits of the WebView Approach

1. **Development Simplicity**: Works with Expo Go without requiring a development build
2. **Cross-Platform Compatibility**: Same implementation works on iOS, Android, and web
3. **Familiar API**: Uses the same Mapbox GL JS API that web developers are familiar with
4. **Feature Parity**: Supports all the features of Mapbox GL JS
5. **Easy Transition**: Can be replaced with Mapbox GL Native in the future without changing the API

## Limitations

1. **Performance**: Not as performant as a native implementation
2. **Memory Usage**: Higher memory usage due to the WebView
3. **Integration**: Limited integration with native components
4. **Offline Support**: More complex to implement offline support

## Enhanced Map Screen Experience

Building on the WebView-based map implementation, we've enhanced the MapScreen component to provide a more immersive and feature-rich experience similar to the web app's PresentationMapView.

### Key Features

1. **Full-Screen Map Display**: The map now takes up the entire screen for a more immersive experience
2. **Animated Info Panel**: An animated panel displays route information and can be toggled on/off
3. **Map Controls**: Collapsible map controls for adjusting the map view
4. **Modern App Bar**: A sleek app bar with navigation and action buttons
5. **Route Statistics**: Enhanced display of route statistics with icons and better formatting

### Implementation Details

The enhanced MapScreen (`src/screens/MapScreen.tsx`) includes:

1. **Animated Components**: Using React Native's Animated API for smooth transitions
2. **Responsive Layout**: Adapting to different screen sizes and orientations
3. **Interactive Controls**: Toggleable UI elements for a cleaner viewing experience
4. **Route Information Display**: Comprehensive display of route metadata

```typescript
// Key animation implementation
const infoSlideAnim = useRef(new Animated.Value(0)).current;
const controlsOpacityAnim = useRef(new Animated.Value(1)).current;

// Toggle info panel with animation
const toggleInfo = () => {
  const newShowInfo = !showInfo;
  setShowInfo(newShowInfo);
  
  Animated.timing(infoSlideAnim, {
    toValue: newShowInfo ? 0 : -300,
    duration: 300,
    useNativeDriver: true,
  }).start();
};

// Toggle map controls with animation
const toggleControls = () => {
  const newShowControls = !showControls;
  setShowControls(newShowControls);
  
  Animated.timing(controlsOpacityAnim, {
    toValue: newShowControls ? 1 : 0,
    duration: 200,
    useNativeDriver: true,
  }).start();
};
```

### UI Components

The enhanced MapScreen includes several UI components:

1. **App Bar**: Using React Native Paper's Appbar component for navigation and actions
2. **Info Panel**: An animated panel displaying route information
3. **Map Controls**: A panel of map control buttons
4. **FAB**: A floating action button for downloading routes for offline use

### Integration with Route Context

The MapScreen integrates with the RouteContext to display the selected route:

```typescript
// Load the route when the component mounts
useEffect(() => {
  const fetchRoute = async () => {
    setIsLoading(true);
    try {
      await loadRoute(mapId);
    } catch (error) {
      console.error('Error loading route:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchRoute();
}, [mapId, loadRoute]);

// Get the selected route from the route context
const mapDetails = routeState.selectedRoute;
```

### Navigation Flow

The enhanced MapScreen is part of a seamless navigation flow:

1. User browses routes in the Home or Saved Routes screen
2. User taps on a route card to view it
3. The MapScreen loads the selected route and displays it
4. User can toggle UI elements for a cleaner viewing experience
5. User can navigate back to the previous screen

## Future Improvements

1. **Native Implementation**: Replace with Mapbox GL Native for production
2. **Offline Support**: Add support for offline maps
3. **Performance Optimization**: Optimize WebView performance
4. **Feature Parity**: Ensure all features of Mapbox GL Native are supported
5. **Elevation Profile**: Add an elevation profile component similar to the web app
6. **Route Directions**: Add turn-by-turn directions for routes
7. **Interactive Route Tracing**: Add the ability to trace along the route and see elevation data
8. **Photo Integration**: Display photos along the route
9. **Points of Interest**: Display and interact with points of interest along the route
