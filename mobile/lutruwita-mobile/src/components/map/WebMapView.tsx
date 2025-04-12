import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../theme';
import { useMap } from '../../context/MapContext';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES } from '../../config/mapbox';
import { RouteData } from '../../services/routeService';

export interface WebMapViewProps {
  initialCenter?: [number, number]; // [longitude, latitude]
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
        default:
          console.log('Unknown message type:', data.type);
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
