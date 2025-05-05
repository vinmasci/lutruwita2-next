/**
 * Utility functions for generating static map URLs and images
 */
import mapboxgl from 'mapbox-gl';
import { uploadToCloudinary } from './cloudinary';

/**
 * Generates a Mapbox static map URL for a route
 * @param {Object} options - Configuration options
 * @param {Array} options.center - [longitude, latitude] center coordinates
 * @param {number} options.zoom - Zoom level
 * @param {Array} options.routes - Array of route objects with geojson data
 * @param {number} options.width - Image width in pixels
 * @param {number} options.height - Image height in pixels
 * @param {string} options.style - Mapbox style (default: 'satellite-streets-v12')
 * @returns {string} The static map URL
 */
export const generateStaticMapUrl = (options) => {
  const {
    center,
    zoom,
    routes = [],
    width = 600,
    height = 400,
    style = 'satellite-streets-v12' // Use the same style as MapPreview
  } = options;

  // Hardcode the Mapbox token since we're having issues with environment variables
  const accessToken = 'pk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY20xY3B1ZmdzMHp5eDJwcHBtMmptOG8zOSJ9.Ayn_YEjOCCqujIYhY9PiiA';

  // If we don't have routes or center, return a placeholder
  if ((!routes || routes.length === 0) && (!center || !zoom)) {
    return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/0,0,1,0/${width}x${height}@2x?access_token=${accessToken}`;
  }

  // Process routes if available
  if (routes && routes.length > 0) {
    try {
      // Find the bounds of all routes
      let minLng = 180;
      let maxLng = -180;
      let minLat = 90;
      let maxLat = -90;
      
      // Only process the first route to avoid URL length issues
      const route = routes[0];
      
      if (route.geojson?.features?.[0]?.geometry?.coordinates) {
        const coordinates = route.geojson.features[0].geometry.coordinates;
        
        // Find the bounds
        coordinates.forEach(coord => {
          const [lng, lat] = coord;
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });
        
        // Get route color or use default
        const color = route.customMapOptions?.color?.replace('#', '') || 'ee5253';
        
        // Create a path overlay with a reasonable number of points
        // We need to sample the coordinates to keep the URL length manageable
        // For a 1000km route, we can use around 100 points which should be enough
        // to represent the route accurately
        const maxPoints = 100;
        let sampledCoords;
        
        if (coordinates.length <= maxPoints) {
          sampledCoords = [...coordinates];
        } else {
          // Sample points evenly along the route
          const step = Math.ceil(coordinates.length / maxPoints);
          sampledCoords = coordinates.filter((_, i) => i % step === 0);
          
          // Always include the first and last points
          if (sampledCoords[0] !== coordinates[0]) {
            sampledCoords.unshift(coordinates[0]);
          }
          if (sampledCoords[sampledCoords.length - 1] !== coordinates[coordinates.length - 1]) {
            sampledCoords.push(coordinates[coordinates.length - 1]);
          }
          
          // Ensure we don't exceed the maximum number of points
          if (sampledCoords.length > maxPoints) {
            sampledCoords = sampledCoords.slice(0, maxPoints);
          }
        }
        
        // Create the path string
        const pathString = `path-3+${color}-0.9(${
          sampledCoords.map(coord => `${coord[0]},${coord[1]}`).join(',')
        })`;
        
        // Create a static map URL with the bounds and path overlay
        const boundsString = `${minLng},${minLat},${maxLng},${maxLat}`;
        
        // Try to create a URL with both bounds and path
        try {
          // First attempt: Use auto positioning with the path
          const url = `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${pathString}/auto/${width}x${height}@2x?access_token=${accessToken}`;
          return url;
        } catch (error) {
          console.error('[generateStaticMapUrl] Error creating URL with path:', error);
          
          // Fallback: Use bounds without path
          const fallbackUrl = `https://api.mapbox.com/styles/v1/mapbox/${style}/static/[${boundsString}]/${width}x${height}@2x?access_token=${accessToken}`;
          return fallbackUrl;
        }
      }
    } catch (error) {
      console.error('[generateStaticMapUrl] Error processing routes:', error);
    }
  }

  // Fallback to center/zoom if route processing fails
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${center[0]},${center[1]},${zoom},0/${width}x${height}@2x?access_token=${accessToken}`;
};

/**
 * Determines if static maps should be used based on device and performance considerations
 * @returns {boolean} True if static maps should be used
 */
export const shouldUseStaticMaps = () => {
  // Always use static maps on mobile devices
  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    return true;
  }
  
  // Check for low-end devices or slow connections
  // Safely check for connection API which may not be available in all browsers
  if (typeof navigator !== 'undefined') {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
      return true;
    }
  }
  
  // Default to using static maps for landing page
  return true;
};

/**
 * Generates a static map image for a route and uploads it to Cloudinary
 * @param {Object} options - Configuration options
 * @param {Array} options.routes - Array of route objects with geojson data
 * @param {Array} options.center - [longitude, latitude] center coordinates
 * @param {number} options.zoom - Zoom level
 * @param {number} options.width - Image width in pixels (default: 800)
 * @param {number} options.height - Image height in pixels (default: 600)
 * @param {string} options.style - Mapbox style (default: 'satellite-streets-v12')
 * @returns {Promise<Object>} Object containing the Cloudinary URL and public ID
 */
export const generateStaticMapImage = async (options) => {
  const {
    routes = [],
    center,
    zoom,
    width = 800,
    height = 600,
    style = 'satellite-streets-v12'
  } = options;

  console.log('[generateStaticMapImage] Starting static map generation process');
  console.log(`[generateStaticMapImage] Processing ${routes.length} routes`);
  console.log('[generateStaticMapImage] Map options:', { 
    center: center ? `[${center[0].toFixed(4)}, ${center[1].toFixed(4)}]` : 'none', 
    zoom: zoom || 'default', 
    width, 
    height, 
    style 
  });

  try {
    console.log('[generateStaticMapImage] Creating temporary map container');
    // Create a temporary container for the map
    const mapContainer = document.createElement('div');
    mapContainer.style.width = `${width}px`;
    mapContainer.style.height = `${height}px`;
    mapContainer.style.position = 'absolute';
    mapContainer.style.visibility = 'hidden';
    document.body.appendChild(mapContainer);

    console.log('[generateStaticMapImage] Initializing Mapbox map');
    // Initialize the map
    const map = new mapboxgl.Map({
      container: mapContainer,
      style: `mapbox://styles/mapbox/${style}`,
      center: center || [0, 0],
      zoom: zoom || 1,
      preserveDrawingBuffer: true, // Required for canvas capture
      interactive: false, // Disable interactivity
      attributionControl: false, // Hide attribution
      logoPosition: 'bottom-left' // Position logo to be less intrusive
    });

    console.log('[generateStaticMapImage] Waiting for map to load');
    // Wait for the map to load
    await new Promise((resolve) => {
      map.on('load', resolve);
    });
    console.log('[generateStaticMapImage] Map loaded successfully');

    // Add routes to the map
    if (routes && routes.length > 0) {
      console.log('[generateStaticMapImage] Adding routes to map');
      // Calculate bounds to fit all routes
      const bounds = new mapboxgl.LngLatBounds();

      // Add each route to the map
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        console.log(`[generateStaticMapImage] Processing route ${i+1}/${routes.length}`);
        
        if (!route.geojson?.features?.[0]?.geometry?.coordinates) {
          console.warn('[generateStaticMapImage] Route has no coordinates, skipping');
          continue;
        }

        const routeId = route.routeId || `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const coordinates = route.geojson.features[0].geometry.coordinates;
        const color = route.color || '#ee5253';

        console.log(`[generateStaticMapImage] Route ${i+1} has ${coordinates.length} coordinates`);

        // Extend bounds with all coordinates
        coordinates.forEach(coord => {
          bounds.extend([coord[0], coord[1]]);
        });

        // Add the route source
        console.log(`[generateStaticMapImage] Adding source for route ${i+1}`);
        map.addSource(`${routeId}-source`, {
          type: 'geojson',
          data: route.geojson
        });

        // Add route border (white outline)
        console.log(`[generateStaticMapImage] Adding border layer for route ${i+1}`);
        map.addLayer({
          id: `${routeId}-border`,
          type: 'line',
          source: `${routeId}-source`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 5,
            'line-opacity': 1
          }
        });

        // Add route line
        console.log(`[generateStaticMapImage] Adding line layer for route ${i+1}`);
        map.addLayer({
          id: `${routeId}-line`,
          type: 'line',
          source: `${routeId}-source`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': color,
            'line-width': 3,
            'line-opacity': 1
          }
        });

        // Add unpaved sections if they exist
        if (route.unpavedSections?.length) {
          console.log(`[generateStaticMapImage] Adding ${route.unpavedSections.length} unpaved sections for route ${i+1}`);
          route.unpavedSections.forEach((section, index) => {
            const sourceId = `unpaved-section-${routeId}-${index}`;
            const layerId = `unpaved-section-layer-${routeId}-${index}`;
            
            // Add source with surface property
            map.addSource(sourceId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {
                  surface: section.surfaceType
                },
                geometry: {
                  type: 'LineString',
                  coordinates: section.coordinates
                }
              }
            });
            
            // Add white dashed line for unpaved segments
            map.addLayer({
              id: layerId,
              type: 'line',
              source: sourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#ffffff',
                'line-width': 2,
                'line-dasharray': [1, 3]
              }
            });
          });
        }
      }

      // Fit the map to the bounds of all routes
      if (!bounds.isEmpty()) {
        console.log('[generateStaticMapImage] Fitting map to route bounds');
        map.fitBounds(bounds, {
          padding: 50,
          duration: 0 // No animation
        });
      }
    }

    console.log('[generateStaticMapImage] Waiting for map rendering to complete');
    // Wait for the map to render completely
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('[generateStaticMapImage] Capturing map as image');
    // Capture the map as an image
    const canvas = map.getCanvas();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    console.log('[generateStaticMapImage] Converting data URL to Blob');
    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    console.log('[generateStaticMapImage] Creating File object from Blob');
    // Create a File object from the Blob
    const file = new File([blob], `static-map-${Date.now()}.jpg`, { type: 'image/jpeg' });

    // Upload to Cloudinary
    console.log('[generateStaticMapImage] Uploading static map image to Cloudinary');
    const result = await uploadToCloudinary(file);

    // Clean up
    console.log('[generateStaticMapImage] Cleaning up temporary map');
    map.remove();
    document.body.removeChild(mapContainer);

    console.log('[generateStaticMapImage] Static map generation complete');
    console.log('[generateStaticMapImage] Cloudinary URL:', result.url);
    return result;
  } catch (error) {
    console.error('[generateStaticMapImage] Error generating static map image:', error);
    throw error;
  }
};
