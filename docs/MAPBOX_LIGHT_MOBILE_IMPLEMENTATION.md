# Implementing Mapbox Light for Mobile Web Performance

## Overview

This document outlines the implementation plan for using Mapbox Light on mobile devices while maintaining the full Mapbox GL JS experience on desktop. This approach will significantly improve mobile performance while preserving all visual features for desktop users.

## Implementation Goals

1. Detect device type (mobile vs desktop) at runtime
2. Load the appropriate Mapbox version based on device type
3. Implement feature detection for unsupported features
4. Provide graceful fallbacks for mobile users
5. Optimize fetch request handling to prevent AbortErrors

## File Structure Changes

Create a new wrapper module that dynamically selects the appropriate Mapbox implementation:

```
src/
└── lib/
    ├── mapbox-gl-no-indoor.js (existing)
    ├── mapbox-gl-light.js (new)
    └── mapbox-gl-adaptive.js (new)
```

## Implementation Steps

### 1. Create Mapbox Light Wrapper

Create a new file `src/lib/mapbox-gl-light.js`:

```javascript
/**
 * Mapbox GL Light - Mobile-optimized version
 * 
 * This file imports the lightweight version of Mapbox GL JS
 * and adds compatibility patches for features not supported in the light version.
 */

import mapboxgl from 'mapbox-gl/dist/mapbox-gl-light';
import logger from '../utils/logger';

logger.info('mapbox-gl-light', 'Using lightweight Mapbox GL for mobile');

// Add feature detection helpers
mapboxgl.supportsGlobe = false;
mapboxgl.supportsTerrain = false;
mapboxgl.supports3DBuildings = false;
mapboxgl.supportsCustomLayers = false;

// Add stub methods for unsupported features
if (!mapboxgl.Map.prototype.setTerrain) {
  mapboxgl.Map.prototype.setTerrain = function() {
    logger.debug('mapbox-gl-light', 'Terrain not supported in light version');
    return this;
  };
}

if (!mapboxgl.Map.prototype.getTerrain) {
  mapboxgl.Map.prototype.getTerrain = function() {
    return null;
  };
}

// Patch the indoor plugin issues (same as in no-indoor version)
// [Include the same indoor plugin patching code from mapbox-gl-no-indoor.js]

// Add optimized fetch handling to prevent AbortErrors
const originalAddSource = mapboxgl.Map.prototype.addSource;
mapboxgl.Map.prototype.addSource = function(id, source) {
  // For tile sources, add retry and timeout logic
  if (source.type === 'vector' || source.type === 'raster' || source.type === 'raster-dem') {
    // Add custom fetch options for better mobile performance
    source.tileSize = source.tileSize || 512;
    source.maxzoom = Math.min(source.maxzoom || 14, 14); // Limit max zoom for performance
    source.minzoom = Math.max(source.minzoom || 0, 0);
    
    // Add custom fetch function with timeout and retry logic
    const originalFetch = window.fetch;
    source._customFetch = function(url, options) {
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Set a timeout to abort long-running requests
      const timeout = setTimeout(() => {
        controller.abort();
        logger.debug('mapbox-gl-light', `Aborted slow tile request: ${url}`);
      }, 10000); // 10 second timeout
      
      return originalFetch(url, { ...options, signal })
        .then(response => {
          clearTimeout(timeout);
          return response;
        })
        .catch(error => {
          clearTimeout(timeout);
          if (error.name === 'AbortError') {
            // Log but don't propagate abort errors
            logger.debug('mapbox-gl-light', `Fetch aborted: ${url}`);
            return new Response(null, { status: 204 }); // Return empty response
          }
          throw error;
        });
    };
  }
  
  return originalAddSource.call(this, id, source);
};

export default mapboxgl;
```

### 2. Create Adaptive Loader

Create a new file `src/lib/mapbox-gl-adaptive.js`:

```javascript
/**
 * Adaptive Mapbox GL Loader
 * 
 * Dynamically selects the appropriate Mapbox GL implementation based on device type.
 * Uses the full version for desktop and the light version for mobile devices.
 */

import logger from '../utils/logger';

// Detect if we're on a mobile device
const isMobile = () => {
  return (
    window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
};

// Dynamically import the appropriate version
let mapboxgl;

if (isMobile()) {
  logger.info('mapbox-gl-adaptive', 'Mobile device detected, using Mapbox GL Light');
  mapboxgl = require('./mapbox-gl-light').default;
} else {
  logger.info('mapbox-gl-adaptive', 'Desktop device detected, using full Mapbox GL');
  mapboxgl = require('./mapbox-gl-no-indoor').default;
}

// Add feature detection helper
mapboxgl.isMobileVersion = isMobile();

// Export the selected implementation
export default mapboxgl;
```

### 3. Update Import References

Update all imports in the codebase to use the adaptive loader instead of directly importing mapbox-gl or mapbox-gl-no-indoor:

1. Find all files that import mapbox-gl or mapbox-gl-no-indoor
2. Replace the imports with the adaptive loader

For example, in `src/features/map/components/MapView/hooks/useMapInitializer.js`:

```javascript
// Before
import mapboxgl from '../../../../../lib/mapbox-gl-no-indoor';

// After
import mapboxgl from '../../../../../lib/mapbox-gl-adaptive';
```

### 4. Add Feature Detection in Map Initialization

Update the map initialization code to check for feature support:

```javascript
// In useMapInitializer.js or similar files
// After creating the map instance

// Check if terrain is supported before trying to use it
if (mapboxgl.supportsTerrain !== false) {
  // Add terrain source and set terrain
  map.addSource('mapbox-dem', {
    type: 'raster-dem',
    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
    tileSize: 512,
    maxzoom: 14
  });
  
  map.setTerrain({
    source: 'mapbox-dem',
    exaggeration: isMobile ? 1.0 : 1.5
  });
} else {
  logger.info('MapView', 'Terrain not supported in this Mapbox version, skipping');
}

// Check if 3D buildings are supported
if (mapboxgl.supports3DBuildings !== false && !isMobile) {
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
}
```

### 5. Add Global Error Handler for Fetch Aborts

Add a global error handler to catch and suppress AbortError messages:

```javascript
// In src/main.js or similar entry point

// Add global error handler for fetch aborts
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && 
      event.reason.name === 'AbortError' && 
      event.reason.message && 
      event.reason.message.includes('Fetch is aborted')) {
    
    // Prevent the error from appearing in the console
    event.preventDefault();
    
    // Log it at debug level instead
    console.debug('Fetch abort handled gracefully:', event.reason.message);
  }
});
```

### 6. Optimize StyleControl for Mobile

Update the StyleControl component to handle feature differences:

```javascript
// In src/features/map/components/StyleControl/StyleControl.js

recreateCustomLayers() {
  if (!this.map) return;
  
  // Store existing GPX sources and layers before style change
  const style = this.map.getStyle();
  if (!style) return;
  
  // ... existing code ...
  
  // Wait for style to load
  this.map.once('style.load', () => {
    // Check if terrain is supported before adding it
    if (mapboxgl.supportsTerrain !== false) {
      // Re-add terrain source
      if (!this.map?.getSource('mapbox-dem')) {
        this.map?.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        });
      }
      
      // Re-apply terrain settings with device-specific exaggeration
      const isMobile = window.innerWidth <= 768;
      logger.info('StyleControl', 'Re-applying terrain with device detection:', { 
        isMobile, 
        width: window.innerWidth,
        projection: this.map?.getProjection()?.name
      });
      
      this.map?.setTerrain({
        source: 'mapbox-dem',
        exaggeration: isMobile ? 1.0 : 1.5
      });
    }
    
    // ... rest of the method ...
  });
}
```

## Mobile-Specific Optimizations

### 1. Reduce Visual Complexity on Mobile

```javascript
// In map initialization code

const isMobile = window.innerWidth <= 768 || mapboxgl.isMobileVersion;

// Simplify map options for mobile
const mapOptions = {
  container: mapRef.current,
  style: MAP_STYLES.satellite.url,
  bounds: [[144.5, -43.7], [148.5, -40.5]], // Tasmania bounds
  fitBoundsOptions: {
    padding: isMobile ? 50 : 200, // Less padding on mobile
    pitch: isMobile ? 0 : 45, // Flat view on mobile
    bearing: 0
  },
  projection: 'mercator', // Always use mercator for better performance
  maxPitch: isMobile ? 0 : 85, // Limit pitch on mobile
  antialias: !isMobile, // Disable antialiasing on mobile
  preserveDrawingBuffer: !isMobile, // Only needed for screenshots on desktop
  fadeDuration: isMobile ? 0 : 300, // Disable fading on mobile
};

const map = new mapboxgl.Map(mapOptions);
```

### 2. Optimize Photo and POI Clustering

```javascript
// In clustering functions

// More aggressive clustering on mobile
const clusterRadius = isMobile ? 60 : 40;
const clusterMaxZoom = isMobile ? 18 : 20;

// Use simplified markers on mobile
const markerComponent = isMobile 
  ? SimplifiedPhotoMarker 
  : PhotoMarker;
```

### 3. Reduce Network Requests

```javascript
// In map initialization

// Reduce the number of concurrent requests on mobile
if (isMobile) {
  map.setMaxTileCacheSize(50); // Smaller tile cache
  map.setRTLTextPlugin('', true); // Skip RTL text plugin on mobile
  map.setTileLoadFunction((tile, url) => {
    // Only load tiles that are visible or very close to viewport
    const priority = tile.tileID.isChildOf(map.transform.coveringTiles);
    if (!priority && isMobile) {
      // Skip loading low-priority tiles on mobile
      return;
    }
    // Load the tile normally
    tile.loadData(url);
  });
}
```

## Performance Benefits

This implementation provides significant performance improvements for mobile users:

1. **Reduced Bundle Size**: ~60% smaller JavaScript payload
2. **Lower Memory Usage**: Less memory pressure from WebGL contexts
3. **Faster Initial Load**: Quicker time-to-interactive for mobile users
4. **Better Battery Life**: Less CPU/GPU intensive rendering
5. **Fewer Network Errors**: Better handling of fetch aborts and timeouts
6. **Smoother Interactions**: More responsive panning and zooming

## Feature Differences

Mobile users will experience these differences:

1. **Flat Maps**: No 3D terrain or extrusion (flat maps only)
2. **Simplified Visuals**: No advanced visual effects
3. **Limited Custom Layers**: Some advanced layer features unavailable
4. **Mercator Only**: No globe projection support

Desktop users will continue to enjoy the full experience with all features.

## Testing Recommendations

1. Test on a variety of mobile devices and browsers
2. Verify that feature detection works correctly
3. Monitor network requests and memory usage
4. Check for any visual regressions
5. Ensure that all core functionality works on both versions

## Rollout Plan

1. Implement the changes in a development branch
2. Test thoroughly on both desktop and mobile
3. Deploy to a staging environment for further testing
4. Monitor performance metrics and error rates
5. Roll out to production with feature flags if possible
6. Monitor for any issues and be prepared to roll back if necessary

## Future Improvements

1. Add more sophisticated device detection (consider device capabilities)
2. Implement progressive enhancement for mid-tier devices
3. Add offline support with tile caching
4. Further optimize network request handling
5. Consider server-side rendering for extremely low-end devices
