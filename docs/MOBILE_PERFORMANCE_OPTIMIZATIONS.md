# Mobile Performance Optimizations

## Problem Description

The application was experiencing crashes on mobile devices in presentation mode. The crashes were occurring due to excessive GPU and CPU load caused by resource-intensive rendering features that mobile devices struggle to handle efficiently. Specifically:

1. **High GPU Memory Usage**: 3D terrain, 3D buildings, and high-quality antialiasing were consuming too much GPU memory on mobile devices.
2. **Excessive Rendering Load**: Angled views (pitch) and complex animations were causing rendering performance issues.
3. **Touch Event Conflicts**: Hover markers designed for desktop mouse interactions were interfering with touch events on mobile.
4. **Resource-Intensive Animations**: The flyby animation was causing performance issues on less powerful mobile devices.

These issues combined to create an unstable experience on mobile devices, leading to frequent crashes and poor performance.

## Implemented Fixes

### 1. EmbedMapView.jsx Optimizations

The `EmbedMapView.jsx` component has been optimized with the following changes:

#### Terrain Rendering
```javascript
// Set terrain with appropriate exaggeration based on device
// Use no exaggeration on mobile for better performance
map.setTerrain({
    source: 'mapbox-dem',
    exaggeration: isCurrentlyMobile ? 0.0 : 1.5
});
```

#### 3D Buildings
```javascript
// Add 3D buildings layer only on non-mobile devices
if (!isCurrentlyMobile) {
    try {
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
    } catch (error) {
        console.error('[EmbedMapView] Error adding 3D buildings layer:', error);
    }
}
```

#### Map Initialization Optimizations
```javascript
map = new mapboxgl.Map({
    container: mapRef.current,
    style: mapStyle,
    center: mapState.center || [146.5, -42.0],
    zoom: mapState.zoom || 10,
    bearing: mapState.bearing || 0,
    pitch: initialIsMobile ? 0 : (mapState.pitch || 0), // Use flat view on mobile
    projection: 'mercator', // Always use mercator for better performance and compatibility
    maxPitch: initialIsMobile ? 0 : 85, // Limit pitch on mobile
    width: '100%',
    height: '100%',
    failIfMajorPerformanceCaveat: false, // Don't fail on performance issues
    preserveDrawingBuffer: true, // Needed for screenshots
    attributionControl: false, // We'll add this manually
    antialias: initialIsMobile ? false : true // Disable antialiasing on mobile for better performance
});
```

#### Hover Marker Optimization
```javascript
// Add mousemove event to set hover coordinates
map.on('mousemove', (e) => {
    // Skip trace marker functionality on mobile devices to prevent touch event interception
    // This fixes the double-press issue with POIs, line components, climb categories, and route list
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        // Clear any existing hover coordinates on mobile
        if (hoverCoordinates) {
            setHoverCoordinates(null);
        }
        return;
    }
    
    // Rest of hover marker code...
});
```

### 2. PresentationMapView.js Optimizations

The `PresentationMapView.js` component already had similar optimizations implemented:

#### Terrain Rendering
```javascript
// Set terrain with appropriate exaggeration based on device
// Use no exaggeration on mobile for better performance
map.setTerrain({
    source: 'mapbox-dem',
    exaggeration: isCurrentlyMobile ? 0.0 : 1.5
});
```

#### 3D Buildings
```javascript
// Add 3D buildings layer only on non-mobile devices
if (!isCurrentlyMobile) {
    try {
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
    } catch (error) {
        console.error('[PresentationMapView] Error adding 3D buildings layer:', error);
    }
}
```

#### Map Initialization Optimizations
```javascript
map = new mapboxgl.Map({
    container: mapRef.current,
    style: MAP_STYLES.satellite.url,
    bounds: [[144.5, -43.7], [148.5, -40.5]], // Tasmania bounds
    fitBoundsOptions: {
        padding: 0,
        pitch: initialIsMobile ? 0 : 45, // Use flat view on mobile
        bearing: 0
    },
    projection: 'mercator', // Always use mercator for better performance and compatibility
    maxPitch: initialIsMobile ? 0 : 85, // Limit pitch on mobile
    width: '100%',
    height: '100%',
    failIfMajorPerformanceCaveat: false, // Don't fail on performance issues
    preserveDrawingBuffer: true, // Needed for screenshots
    attributionControl: false, // We'll add this manually
    antialias: initialIsMobile ? false : true // Disable antialiasing on mobile for better performance
});
```

#### Device Type Change Handler
```javascript
// Function to handle device type changes (e.g., orientation changes)
const handleDeviceTypeChange = useCallback(() => {
    if (!mapInstance.current) return;
    
    const isMobile = window.innerWidth <= 768;
    const map = mapInstance.current;
    
    // Update projection if needed - always use mercator on mobile for better performance
    const currentProjection = map.getProjection().name;
    const targetProjection = isMobile ? 'mercator' : 'globe';
    
    if (currentProjection !== targetProjection) {
        try {
            map.setProjection(targetProjection);
        } catch (error) {
            console.error('[PresentationMapView] Error setting projection:', error);
            // Fallback to mercator if there's an error
            if (currentProjection !== 'mercator') {
                try {
                    map.setProjection('mercator');
                } catch (innerError) {
                    console.error('[PresentationMapView] Error setting fallback projection:', innerError);
                }
            }
        }
    }
    
    // Update terrain exaggeration - use flat terrain on mobile
    if (map.getTerrain()) {
        try {
            map.setTerrain({
                source: 'mapbox-dem',
                exaggeration: isMobile ? 0.0 : 1.5 // No exaggeration on mobile for better performance
            });
        } catch (error) {
            console.error('[PresentationMapView] Error updating terrain:', error);
        }
    }
    
    // Update pitch if needed - use flat view on mobile
    const currentPitch = map.getPitch();
    const targetPitch = isMobile ? 0 : 45;
    
    if (Math.abs(currentPitch - targetPitch) > 5) {
        try {
            map.setPitch(targetPitch);
        } catch (error) {
            console.error('[PresentationMapView] Error setting pitch:', error);
            // Try to set pitch to 0 as a fallback
            if (currentPitch !== 0) {
                try {
                    map.setPitch(0);
                } catch (innerError) {
                    console.error('[PresentationMapView] Error setting fallback pitch:', innerError);
                }
            }
        }
    }
}, []);
```

#### Hover Marker Optimization
```javascript
// Add mousemove event to set hover coordinates
map.on('mousemove', (e) => {
    // Skip trace marker functionality on mobile devices to prevent touch event interception
    // This fixes the double-press issue with POIs, line components, climb categories, and route list
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        // Clear any existing hover coordinates on mobile
        if (hoverCoordinates) {
            setHoverCoordinates(null);
        }
        return;
    }
    
    // Rest of hover marker code...
});
```

## Technical Explanation

### Why These Optimizations Work

1. **Terrain Exaggeration (0.0 on mobile)**: 
   - Setting terrain exaggeration to 0.0 effectively flattens the terrain, significantly reducing the GPU workload.
   - 3D terrain requires complex calculations for lighting, shadows, and perspective, which are particularly taxing on mobile GPUs.

2. **Disabled 3D Buildings on Mobile**:
   - 3D building rendering requires loading and processing additional data.
   - Each building requires multiple polygons and textures, multiplying the rendering workload.
   - By conditionally adding this layer only on non-mobile devices, we avoid this overhead entirely on mobile.

3. **Flat View on Mobile (pitch: 0)**:
   - Angled views require more complex perspective calculations and can expose rendering artifacts.
   - Flat (top-down) views are much simpler to render and require fewer calculations.
   - Setting `maxPitch: 0` prevents users from accidentally entering resource-intensive angled views.

4. **Disabled Antialiasing on Mobile**:
   - Antialiasing smooths jagged edges but requires additional processing for each pixel.
   - Mobile GPUs have limited processing power compared to desktop GPUs.
   - The visual quality trade-off is acceptable for the performance gain on mobile.

5. **Optimized Hover Markers for Mobile**:
   - Hover effects designed for mouse interactions can interfere with touch events on mobile.
   - By disabling hover markers on mobile, we prevent conflicts with touch interactions.
   - This improves the responsiveness of touch interactions with POIs, line components, and other interactive elements.

6. **Mercator Projection on Mobile**:
   - The globe projection is more resource-intensive as it requires 3D sphere calculations.
   - Mercator projection is flat and requires simpler calculations, making it more efficient for mobile devices.

## Expected Results

These optimizations should significantly reduce the GPU and CPU load on mobile devices, preventing crashes and improving overall performance in presentation mode. Users should experience:

1. Smoother map navigation and interactions
2. Faster loading times
3. Reduced battery consumption
4. Elimination of crashes related to GPU memory limitations
5. More responsive touch interactions

The trade-off is slightly reduced visual fidelity on mobile devices (flat terrain instead of 3D, no 3D buildings, less smooth edges), but this is a worthwhile compromise for stable performance.
