import { useRef, useState, useEffect, useCallback } from 'react';
import mapboxgl from '../../../../../lib/mapbox-gl-no-indoor';
import { setMapInstance } from '../../../utils/mapOperationsQueue';
import { setupMapScaleListener } from '../../../utils/mapScaleUtils';
import { safelyRemoveMap } from '../../../utils/mapCleanup';
import StyleControl, { MAP_STYLES } from '../../../components/StyleControl/StyleControl';
import SearchControl from '../../../components/SearchControl/SearchControl';
import PitchControl from '../../../components/PitchControl/PitchControl';
import { adjustMapScale } from '../../../utils/mapScaleUtils'; // Added import

// Debug function for road layer
const debugRoadLayer = (map) => {
  // Log all available layers
  const style = map.getStyle();
  const allLayers = style?.layers || [];
  
  // Check our specific layer
  const roadLayer = map.getLayer('custom-roads');
  
  // Try to get some features
  if (map.isStyleLoaded()) {
    const bounds = map.getBounds();
    if (!bounds) {
      return;
    }
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const features = map.queryRenderedFeatures([
      map.project(sw),
      map.project(ne)
    ], {
      layers: ['custom-roads']
    });
  }
};

/**
 * Hook for initializing and configuring the Mapbox map
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.notifyMapStateChange - Function to call when map state changes
 * @param {Object} options.containerRef - Reference to the container element
 * @returns {Object} Map initialization state and references
 */
export const useMapInitializer = ({ notifyMapStateChange, containerRef }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [streetsLayersLoaded, setStreetsLayersLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Function to handle device type changes (e.g., orientation changes)
  const handleDeviceTypeChange = useCallback(() => {
    if (!mapInstance.current || !isMapReady) return;
    
    const isMobile = window.innerWidth <= 768;
    const map = mapInstance.current;
    
    console.log('[MapView] Device type change detected:', { 
      isMobile, 
      width: window.innerWidth,
      height: window.innerHeight
    });
    
    // Update terrain exaggeration if terrain is enabled
    if (map.getTerrain()) {
      console.log('[MapView] Updating terrain exaggeration for', isMobile ? 'mobile' : 'desktop');
      map.setTerrain({
        source: 'mapbox-dem',
        exaggeration: isMobile ? 1.0 : 1.5
      });
    }
  }, [isMapReady]);

  // Add resize listener to handle orientation changes
  useEffect(() => {
    window.addEventListener('resize', handleDeviceTypeChange);
    return () => {
      window.removeEventListener('resize', handleDeviceTypeChange);
    };
  }, [handleDeviceTypeChange]);

  // Set up scaling using the same approach as in PresentationMapView
  useEffect(() => {
    if (containerRef.current) {
      const cleanupScaleListener = setupMapScaleListener(containerRef.current);
      return () => {
        if (cleanupScaleListener) {
          cleanupScaleListener();
        }
      };
    }
  }, [containerRef]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Flag to track if component is mounted
    let isMounted = true;
    
    // Create map with Tasmania as default bounds
    let map;
    try {
      map = new mapboxgl.Map({
        container: mapRef.current,
        style: MAP_STYLES.satellite.url,
        bounds: [[144.5, -43.7], [148.5, -40.5]], // Tasmania bounds (default)
        fitBoundsOptions: {
          padding: 0,
          pitch: 0,
          bearing: 0
        },
        projection: 'mercator', // Changed from 'globe' to 'mercator' for flat projection
        maxPitch: 85,
        width: '100%',
        height: '100%',  // Explicitly setting width and height to match presentation mode
        failIfMajorPerformanceCaveat: false, // Don't fail on performance issues
        preserveDrawingBuffer: true, // Needed for screenshots
        attributionControl: false, // We'll add this manually
        antialias: true, // Enable antialiasing for smoother rendering
        // Disable the indoor plugin since we don't need it
        // This prevents the indoor plugin from being initialized and causing errors
        disableIndoorPlugin: true,
        // Disable any other unnecessary plugins
        disableScrollZoom: false,
        disableTouchZoom: false,
        disableRotation: false,
        disablePitch: false
      });
      
      // Explicitly disable the indoor plugin if it exists
      if (mapboxgl.IndoorManager && typeof mapboxgl.IndoorManager.disable === 'function') {
        try {
          mapboxgl.IndoorManager.disable();
          console.log('[MapView] Successfully disabled IndoorManager');
        } catch (error) {
          console.warn('[MapView] Error disabling IndoorManager:', error);
        }
      }
    } catch (error) {
      console.error('[MapView] Error creating map instance:', error);
      return;
    }
    
    // Add error handling for map
    map.on('error', (e) => {
      console.error('[MapView] Mapbox GL error:', e);
    });
    
    // Add event listeners to track map state changes
    map.on('moveend', notifyMapStateChange);
    map.on('zoomend', notifyMapStateChange);
    map.on('pitchend', notifyMapStateChange);
    map.on('rotateend', notifyMapStateChange);
    
    // Set the map instance in the queue
    setMapInstance(map);
    
    // Store the map instance in the ref
    mapInstance.current = map;
    
    // Try to get user's location first if in creation mode
    if (window.location.pathname === '/' || window.location.pathname === '' || window.location.pathname === '/editor') {
      // Create a promise to get user location
      const getUserLocation = () => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
          }
          
          navigator.geolocation.getCurrentPosition(
            position => {
              resolve({
                lng: position.coords.longitude,
                lat: position.coords.latitude
              });
            },
            error => {
              console.log('[MapView] Geolocation error:', error.message);
              reject(error);
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        });
      };
      
      // Try to get user location and fly to it
      getUserLocation()
        .then(location => {
          console.log('[MapView] User location obtained:', location);
          
          // Check if map is already loaded
          if (map.loaded()) {
            console.log('[MapView] Map already loaded, flying to location immediately');
            map.flyTo({
              center: [location.lng, location.lat],
              zoom: 10,
              essential: true
            });
          } else {
            console.log('[MapView] Map not loaded yet, waiting for load event');
            map.once('load', () => {
              map.flyTo({
                center: [location.lng, location.lat],
                zoom: 10,
                essential: true
              });
            });
          }
        })
        .catch(error => {
          console.log('[MapView] Using default Tasmania bounds:', error);
          // Keep default Tasmania bounds if location access fails
        });
    }
    
    // Add terrain
      map.on('load', () => {
      // Check if component is still mounted
      if (!isMounted) {
        console.log('[MapView] Map loaded but component unmounted, cleaning up');
        safelyRemoveMap(map);
        return;
      }
      
      // Make sure the map instance is set in the queue again after load
      setMapInstance(map);
      
      // Add styledata event handler to re-add hover point when style changes
      map.on('styledata', () => {
        // Reduced logging - only log in development mode
        if (process.env.NODE_ENV === 'development' && process.env.VITE_DEBUG_LOGGING === 'true') {
          console.log('[MapView] Style changed, checking if hover-point needs to be re-added');
        }
        
        // Check if the hover-point source exists
        if (!map.getSource('hover-point')) {
          console.log('[MapView] Re-adding hover-point source and layer after style change');
          
          try {
            // Re-add the source and layer
            map.addSource('hover-point', {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [0, 0]
                },
                properties: {}
              }
            });
            
            map.addLayer({
              id: 'hover-point',
              type: 'circle',
              source: 'hover-point',
              paint: {
                'circle-radius': 8,
                'circle-color': '#ff0000',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.8
              }
            });
            
            // Hide the layer initially
            map.setLayoutProperty('hover-point', 'visibility', 'none');
          } catch (error) {
            console.error('[MapView] Error re-adding hover point after style change:', error);
          }
        }
      });
      
      // Check if style is fully loaded
      const waitForStyleLoaded = () => {
        if (map.isStyleLoaded()) {
          console.log('[MapView] Map style fully loaded, proceeding with initialization');
          initializeMapAfterStyleLoad();
        } else {
          console.log('[MapView] Style not fully loaded yet, waiting...');
          // Wait a bit and check again
          setTimeout(waitForStyleLoaded, 100);
        }
      };
      
      // Function to initialize map components after style is loaded
      const initializeMapAfterStyleLoad = () => {
        try {
          // Check if mapbox-dem source already exists before adding it
          if (!map.getSource('mapbox-dem')) {
            map.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14
            });
          }
          
          // Check if device is mobile
          const isMobile = window.innerWidth <= 768;
          console.log('[MapView] Setting terrain with device detection:', { 
            isMobile, 
            width: window.innerWidth,
            projection: map.getProjection().name
          });
          
          // Set terrain configuration with device-specific exaggeration
          map.setTerrain({
            source: 'mapbox-dem',
            exaggeration: isMobile ? 1.0 : 1.5 // Less exaggeration on mobile for better performance
          });
          
          // Add 3D buildings layer
          map.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                15.05, ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                15.05, ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          });
          
          // Add hover point source and layer if they don't exist
          if (!map.getSource('hover-point')) {
            map.addSource('hover-point', {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [0, 0] // Initial coordinates
                },
                properties: {}
              }
            });
          }
          
          // Add hover point layer if it doesn't exist
          if (!map.getLayer('hover-point')) {
            map.addLayer({
              id: 'hover-point',
              type: 'circle',
              source: 'hover-point',
              paint: {
                'circle-radius': 8,
                'circle-color': '#ff0000',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.8
              }
            });
          }
          
          // Initially hide the hover point layer
          map.setLayoutProperty('hover-point', 'visibility', 'none');
          
          map.on('zoom', () => {
            // Zoom change handler
          });
          
          // Add custom roads layer
          const tileUrl = 'https://api.maptiler.com/tiles/5dd3666f-1ce4-4df6-9146-eda62a200bcb/{z}/{x}/{y}.pbf?key=DFSAZFJXzvprKbxHrHXv';
          map.addSource('australia-roads', {
            type: 'vector',
            tiles: [tileUrl],
            minzoom: 12,
            maxzoom: 14
          });
          
          map.addLayer({
            id: 'custom-roads',
            type: 'line',
            source: 'australia-roads',
            'source-layer': 'lutruwita',
            minzoom: 12,
            maxzoom: 14,
            paint: {
              'line-opacity': 0, // Set opacity to 0 for all road types to hide them
              'line-color': [
                'match',
                ['get', 'surface'],
                ['paved', 'asphalt', 'concrete', 'compacted', 'sealed', 'bitumen', 'tar'],
                '#888888',
                ['unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth'],
                '#D35400',
                '#888888'
              ],
              'line-width': [
                'match',
                ['get', 'surface'],
                ['unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth'],
                4,
                2
              ]
            }
          });
          
          // Add debug call after layer is added
          map.once('idle', () => {
            debugRoadLayer(map);
          });
          
          setStreetsLayersLoaded(true);
          setIsMapReady(true);
          setMapReady(true);
        } catch (error) {
          console.error('[MapView] Error initializing map after style load:', error);
          // Retry after a delay if there was an error
          setTimeout(initializeMapAfterStyleLoad, 500);
        }
      };
      
      // Start the style loading check
      waitForStyleLoaded();
      
      // Manually trigger the scaling function after the map is loaded
      const mapContainer = document.querySelector('.w-full.h-full.relative');
      if (mapContainer) {
        // Call it directly to ensure proper scaling on initial load
        adjustMapScale(mapContainer); // Removed require, using imported function
      }
    });
    
    // Add controls
    map.addControl(new SearchControl(), 'top-right');
    map.addControl(new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    }), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-right');
    
    // Check if device is mobile to add pitch control
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      console.log('[MapView] Adding pitch control for mobile device');
      map.addControl(new PitchControl({
        isMobile: true,
        pitchStep: 15
      }), 'top-right');
    }
    
    // Add style control last so it appears at bottom with callback to notify map state changes
    map.addControl(new StyleControl({
      onStyleChange: () => notifyMapStateChange()
    }), 'top-right');
    
    // Style controls
    const style = document.createElement('style');
    style.textContent = `
      .mapboxgl-ctrl-group {
        background-color: rgba(35, 35, 35, 0.9) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      .mapboxgl-ctrl-group button {
        width: 36px !important;
        height: 36px !important;
      }
      .mapboxgl-ctrl-icon {
        filter: invert(1);
      }
      .mapboxgl-ctrl-geolocate {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .coordinate-popup .mapboxgl-popup-content {
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      .coordinate-popup .mapboxgl-popup-tip {
        border-top-color: rgba(0, 0, 0, 0.7);
      }
    `;
    document.head.appendChild(style);
    
    // Set up scaling for the map container
    const mapContainer = document.querySelector('.w-full.h-full.relative');
    let cleanupScaleListener;
    if (mapContainer) {
      cleanupScaleListener = setupMapScaleListener(mapContainer);
    }
    
    // Return cleanup function
    return () => {
      // Mark component as unmounted
      isMounted = false;
      
      // Clean up the scale listener if it exists
      if (cleanupScaleListener) {
        cleanupScaleListener();
      }
      
      // Remove the style element
      if (style && style.parentNode) {
        document.head.removeChild(style);
      }
      
      // Use our enhanced cleanup function to safely remove the map
      safelyRemoveMap(map, setMapInstance).then(() => {
        console.log('[MapView] Map cleanup completed in useEffect cleanup');
      });
      
      // Clear the map instance reference
      mapInstance.current = null;
    };
  }, [notifyMapStateChange]);

  return {
    mapRef,
    mapInstance,
    isMapReady,
    isInitializing,
    streetsLayersLoaded,
    mapReady,
    setIsMapReady,
    setIsInitializing,
    setStreetsLayersLoaded,
    setMapReady
  };
};
