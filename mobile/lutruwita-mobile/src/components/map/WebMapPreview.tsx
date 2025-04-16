import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../theme';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES } from '../../config/mapbox';

// Only import these on native platforms
let Asset: any;
let FileSystem: any;
if (Platform.OS !== 'web') {
  Asset = require('expo-asset').Asset;
  FileSystem = require('expo-file-system');
}

interface WebMapPreviewProps {
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  routes?: any[];
  style?: object;
  onMapReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * WebView-based map preview component for route cards
 * This is used as a fallback when the native map fails to load
 */
const WebMapPreview: React.FC<WebMapPreviewProps> = ({
  center,
  zoom,
  routes = [],
  style,
  onMapReady,
  onError,
}) => {
  const { isDark } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  console.log('[WebMapPreview] Component mounted with props:', {
    center: center ? `[${center[0]}, ${center[1]}]` : 'undefined',
    zoom,
    routesCount: routes?.length || 0,
    hasRouteData: routes?.some(r => r?.geojson?.features) || false
  });

  // Load HTML file
  useEffect(() => {
    // Platform-specific implementation
    if (Platform.OS === 'web') {
      try {
        console.log('[WebMapPreview] Using inline HTML for web platform');
        // Use inline HTML string for web platform
        const inlineHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <script src="https://api.mapbox.com/mapbox-gl-js/v2.14.1/mapbox-gl.js"></script>
              <link href="https://api.mapbox.com/mapbox-gl-js/v2.14.1/mapbox-gl.css" rel="stylesheet">
              <style>
                body { margin: 0; padding: 0; }
                #map { position: absolute; top: 0; bottom: 0; width: 100%; }
              </style>
            </head>
            <body>
              <div id="map"></div>
              <script>
                // Initialize map
                mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
                const map = new mapboxgl.Map({
                  container: 'map',
                  style: 'mapbox://styles/mapbox/outdoors-v11',
                  center: [146.0594, -41.6384], // Default center (Tasmania)
                  zoom: 8
                });
                
                // Send message to React Native when map is ready
                map.on('load', function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapReady'
                  }));
                });
                
                // Handle messages from React Native
                function handleMessage(messageString) {
                  try {
                    const message = JSON.parse(messageString);
                    
                    switch (message.type) {
                      case 'initialize':
                        // Already initialized above
                        break;
                        
                      case 'updateMapStyle':
                        map.setStyle(message.style);
                        break;
                        
                      case 'updateMapCenter':
                        map.setCenter(message.center);
                        break;
                        
                      case 'updateMapZoom':
                        map.setZoom(message.zoom);
                        break;
                        
                      case 'updateRoutes':
                        // Add routes to the map
                        message.routes.forEach((route, index) => {
                          if (route && route.geojson) {
                            // Add source if it doesn't exist
                            const sourceId = \`route-source-\${route.routeId || index}\`;
                            if (!map.getSource(sourceId)) {
                              map.addSource(sourceId, {
                                type: 'geojson',
                                data: route.geojson
                              });
                              
                              // Add border line layer
                              map.addLayer({
                                id: \`route-border-\${route.routeId || index}\`,
                                type: 'line',
                                source: sourceId,
                                layout: {
                                  'line-join': 'round',
                                  'line-cap': 'round'
                                },
                                paint: {
                                  'line-color': '#ffffff',
                                  'line-width': 4
                                }
                              });
                              
                              // Add main line layer
                              map.addLayer({
                                id: \`route-line-\${route.routeId || index}\`,
                                type: 'line',
                                source: sourceId,
                                layout: {
                                  'line-join': 'round',
                                  'line-cap': 'round'
                                },
                                paint: {
                                  'line-color': route.color || '#ff4d4d',
                                  'line-width': 3
                                }
                              });
                            }
                          }
                        });
                        break;
                        
                      default:
                        console.log('Unknown message type:', message.type);
                    }
                  } catch (error) {
                    console.error('Error handling message:', error);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'mapError',
                      error: error.message
                    }));
                  }
                }
                
                // Error handling
                map.on('error', function(e) {
                  console.error('Map error:', e);
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapError',
                    error: e.error ? e.error.message : 'Unknown map error'
                  }));
                });
              </script>
            </body>
          </html>
        `;
        
        setHtmlContent(inlineHtml);
        console.log('[WebMapPreview] Inline HTML set successfully');
      } catch (error) {
        console.error('[WebMapPreview] Error setting inline HTML:', error);
        setError(error instanceof Error ? error : new Error('Failed to set inline HTML'));
        setIsLoading(false);
        if (onError) {
          onError(error instanceof Error ? error : new Error('Failed to set inline HTML'));
        }
      }
    } else {
      // Use expo-file-system on native platforms
      const loadHtmlFile = async () => {
        try {
          console.log('[WebMapPreview] Loading HTML file on native platform...');
          // Get the path to the HTML file
          const htmlFile = require('../../../assets/mapbox-gl.html');
          const asset = Asset.fromModule(htmlFile);
          await asset.downloadAsync();
          
          if (asset.localUri) {
            // Read the file content
            const content = await FileSystem.readAsStringAsync(asset.localUri);
            setHtmlContent(content);
            console.log('[WebMapPreview] HTML file loaded successfully');
          } else {
            throw new Error('Failed to get local URI for HTML file');
          }
        } catch (error) {
          console.error('[WebMapPreview] Error loading HTML file:', error);
          setError(error instanceof Error ? error : new Error('Failed to load HTML file'));
          setIsLoading(false);
          if (onError) {
            onError(error instanceof Error ? error : new Error('Failed to load HTML file'));
          }
        }
      };
      
      loadHtmlFile();
    }
  }, []);

  // Initialize map when HTML content is loaded
  useEffect(() => {
    if (htmlContent && webViewRef.current) {
      console.log('[WebMapPreview] Initializing map...');
      
      // Set the map style based on the theme
      const mapStyle = isDark 
        ? MAP_STYLES.DARK
        : MAP_STYLES.SATELLITE_STREETS;
      
      console.log('[WebMapPreview] Using map style:', mapStyle);
      
      // Initialize the map
      const initMessage = {
        type: 'initialize',
        accessToken: MAPBOX_ACCESS_TOKEN,
      };
      
      webViewRef.current.injectJavaScript(`
        handleMessage('${JSON.stringify(initMessage)}');
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
      if (center) {
        const centerMessage = {
          type: 'updateMapCenter',
          center: center,
        };
        
        webViewRef.current.injectJavaScript(`
          handleMessage('${JSON.stringify(centerMessage)}');
          true;
        `);
      }
      
      // Set initial zoom
      if (zoom) {
        const zoomMessage = {
          type: 'updateMapZoom',
          zoom: zoom,
        };
        
        webViewRef.current.injectJavaScript(`
          handleMessage('${JSON.stringify(zoomMessage)}');
          true;
        `);
      }
      
      // Set routes
      if (routes.length > 0) {
        console.log('[WebMapPreview] Setting routes:', routes.length);
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
  }, [htmlContent, isDark, center, zoom, routes]);

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'mapReady':
          console.log('[WebMapPreview] Map ready event received');
          setIsLoading(false);
          if (onMapReady) {
            onMapReady();
          }
          break;
        case 'mapError':
          console.error('[WebMapPreview] Map error:', data.error);
          setError(new Error(data.error || 'Unknown map error'));
          setIsLoading(false);
          if (onError) {
            onError(new Error(data.error || 'Unknown map error'));
          }
          break;
        default:
          console.log('[WebMapPreview] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[WebMapPreview] Error parsing WebView message:', error);
    }
  };

  // If there's an error, show an error message
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={styles.errorText}>Map preview unavailable</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  // Show loading indicator while map is initializing
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (!htmlContent) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={styles.errorText}>Map preview unavailable</Text>
        <Text style={styles.errorDetail}>Failed to load map content</Text>
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
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[WebMapPreview] WebView error:', nativeEvent);
          setError(new Error(`WebView error: ${nativeEvent.description}`));
          setIsLoading(false);
          if (onError) {
            onError(new Error(`WebView error: ${nativeEvent.description}`));
          }
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[WebMapPreview] WebView HTTP error:', nativeEvent);
          setError(new Error(`WebView HTTP error: ${nativeEvent.statusCode}`));
          setIsLoading(false);
          if (onError) {
            onError(new Error(`WebView HTTP error: ${nativeEvent.statusCode}`));
          }
        }}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  errorDetail: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default WebMapPreview;
