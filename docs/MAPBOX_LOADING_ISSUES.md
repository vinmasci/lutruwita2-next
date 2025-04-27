# Mapbox Loading Issues in Mobile App

## Problem Description

The mobile app is experiencing persistent issues with Mapbox map loading, resulting in the following errors:

```
ERROR  [MapScreen] Map failed to load
ERROR  Map error in MapScreen: [Error: Map failed to load]
ERROR  Mapbox [error] MapLoad error Failed to load tile: The network connection was lost.
ERROR  [MapScreen] Map failed to load
ERROR  Map error in MapScreen: [Error: Map failed to load]
[MapboxCommon] [Error, maps-core]: {}[Setup]: Failed to load style: The network connection was lost.
ERROR  [MapScreen] Map failed to load
ERROR  Map error in MapScreen: [Error: Map failed to load]
ERROR  Mapbox [error] MapLoad error Failed to load style: The network connection was lost.
```

These errors suggest problems with loading map tiles and styles, with the common message being "The network connection was lost."

## Current Status

**The problem still persists** despite our attempts to fix it. Additionally, a new issue has emerged: when trying to switch between map layers using the layer icon on the map, the route simply disappears instead of changing the map style.

## Attempted Solutions

### 1. Updated Map Style URLs

We updated the map style URLs in `mobile/lutruwita-mobile/src/config/mapbox.ts` to use the latest versions:

```typescript
// Map style URLs - Updated to latest versions
export const MAP_STYLES = {
  STREET: 'mapbox://styles/mapbox/streets-v12',
  OUTDOORS: 'mapbox://styles/mapbox/outdoors-v12',
  SATELLITE: 'mapbox://styles/mapbox/satellite-v9',
  SATELLITE_STREETS: 'mapbox://styles/mapbox/satellite-streets-v12',
  DARK: 'mapbox://styles/mapbox/dark-v11',
  LIGHT: 'mapbox://styles/mapbox/light-v11',
};
```

This was done to ensure compatibility with the current Mapbox SDK version (10.1.38).

### 2. Updated Deprecated Event Handler

We replaced the deprecated `onDidFailLoadingMap` event handler with the recommended `onMapLoadingError` handler:

```typescript
// Old code
onDidFailLoadingMap={() => {
  console.error('[MapScreen] Map failed to load');
  handleMapError(new Error('Map failed to load'));
}}

// New code
onMapLoadingError={() => {
  console.error('[MapScreen] Map failed to load');
  handleMapError(new Error('Map failed to load'));
}}
```

This change was made to follow Mapbox's recommended practices and eliminate deprecation warnings.

### 3. Improved Photo Markers

We replaced the ShapeSource/SymbolLayer approach for photo markers with individual MarkerView components to ensure better visibility and performance:

```typescript
{photos.length > 0 && photos.map((photo, index) => (
  <MapboxGL.MarkerView
    key={`photo-marker-${photo._id || index}`}
    coordinate={ensureCorrectCoordinateOrder([photo.coordinates.lng, photo.coordinates.lat])}
    anchor={{ x: 0.5, y: 0.5 }}
  >
    <TouchableOpacity onPress={() => { /* ... */ }}>
      <View style={{ /* ... */ }}>
        <Camera size={5} color="#FFFFFF" strokeWidth={2} />
      </View>
    </TouchableOpacity>
  </MapboxGL.MarkerView>
))}
```

### 4. Enhanced Photo Sorting Logic

We improved the photo sorting logic with:
- A function to calculate the total length of each route
- Sanity checks to flag unreasonably large distances
- Logic to cap distances to prevent sorting issues

```typescript
// Calculate and log the total length of each route
const routeLengths: number[] = [];
routes.forEach((route, index) => {
  let routeLength = 0;
  if (route.geojson?.features?.[0]?.geometry?.coordinates) {
    const routeCoords = route.geojson.features[0].geometry.coordinates as [number, number][];
    routeLength = calculateRouteLength(routeCoords);
    routeLengths[index] = routeLength;
    console.log(`[photoClusteringUtils] Route ${index}: ${route.name || `Route ${index + 1}`}, Length: ${(routeLength/1000).toFixed(2)} km`);
  } else {
    console.log(`[photoClusteringUtils] Route ${index}: ${route.name || `Route ${index + 1}`}, No coordinates available`);
  }
});

// Sanity check for unreasonably large distances
const routeLength = routeLengths[bestRouteIndex] || 0;
if (routeLength > 0 && distanceAlongRoute > routeLength * 1.5) {
  console.warn(`[photoClusteringUtils] WARNING: Photo ${originalIndex} has unreasonably large distance along route ${bestRouteIndex}: ${(distanceAlongRoute/1000).toFixed(2)} km (route length: ${(routeLength/1000).toFixed(2)} km)`);
  // Cap the distance to the route length to prevent sorting issues
  distanceAlongRoute = routeLength;
}
```

## Potential Next Steps

Since the issues persist, we should consider:

1. **Network Connectivity Issues**: The error messages consistently mention "The network connection was lost." This could indicate:
   - Intermittent network connectivity
   - Firewall or proxy issues
   - Rate limiting from Mapbox

2. **Mapbox Access Token**: Verify that the access token has the necessary permissions and is not expired or rate-limited.

3. **Simplify Map Configuration**: Try a minimal map configuration to isolate the issue:
   - Disable terrain and 3D features
   - Use a single, simple map style
   - Remove custom layers temporarily

4. **Alternative Map Styles**: Try using a different set of map styles or custom styles.

5. **Mapbox SDK Version**: Consider testing with a different version of the Mapbox SDK.

6. **Offline Maps**: Implement offline map capabilities to reduce dependency on network connectivity.

7. **Debug Network Requests**: Add more detailed logging of network requests to identify exactly which requests are failing.
