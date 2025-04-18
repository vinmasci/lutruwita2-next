# Cloudinary Route Data Optimization

## Overview

This document summarizes our implementation of Cloudinary-based pre-processed route data loading for the Lutruwita mobile app. This approach significantly improves performance, reduces data transfer, and ensures proper map display.

## Problem Statement

We encountered several issues with the mobile app's map display:

1. **Map Zooming Issues**: The map wasn't properly zooming to show the entire route
2. **Performance Concerns**: Loading full route data directly from the API was inefficient
3. **Network Failures**: The iOS simulator had issues with certain network requests
4. **Data Size**: Route data could be very large, causing performance issues on mobile devices

## Solution

We implemented a two-step data loading process that leverages pre-processed data stored in Cloudinary:

1. First fetch minimal metadata with the embedUrl from the API
2. Then fetch the optimized, pre-processed data from Cloudinary
3. Calculate a bounding box from the route coordinates
4. Use the bounding box to fit the camera view to show the entire route

This approach mirrors what's already being used in the web app's embed view, ensuring consistency across platforms.

## Technical Implementation

### 1. Route Service Modifications

We updated `routeService.ts` to:

```typescript
// First, get the route metadata to check for embedUrl
const metadataUrl = `${API_BASE}/embed/${persistentId}`;
const metadataResponse = await fetch(metadataUrl);
const metadata = await metadataResponse.json();

// Check if we have an embedUrl in the metadata
if (metadata && metadata.embedUrl) {
  // Add a timestamp parameter to force a fresh version
  const cloudinaryUrl = `${metadata.embedUrl}?t=${Date.now()}`;
  
  // Fetch the data from Cloudinary
  const cloudinaryResponse = await fetch(cloudinaryUrl);
  
  if (cloudinaryResponse.ok) {
    const cloudinaryData = await cloudinaryResponse.json();
    
    // Process the Cloudinary data
    const processedData = {
      ...cloudinaryData,
      embedUrl: metadata.embedUrl
    };
    
    // Calculate bounding box for the route
    if (processedData.routes && processedData.routes.length > 0) {
      const firstRoute = processedData.routes[0];
      if (firstRoute.geojson?.features?.[0]?.geometry?.coordinates) {
        const coordinates = firstRoute.geojson.features[0].geometry.coordinates;
        const boundingBox = calculateBoundingBox(coordinates);
        
        // Add bounding box to the route data
        processedData.boundingBox = boundingBox;
      }
    }
    
    return processedData;
  }
}

// Fall back to direct API request if Cloudinary approach fails
```

We also added a helper function to calculate the bounding box:

```typescript
export const calculateBoundingBox = (coordinates: [number, number][]): [[number, number], [number, number]] => {
  if (!coordinates || coordinates.length === 0) {
    // Default to Tasmania if no coordinates
    return [[145.0, -43.0], [148.0, -40.0]];
  }

  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];

  coordinates.forEach(coord => {
    minLng = Math.min(minLng, coord[0]);
    maxLng = Math.max(maxLng, coord[0]);
    minLat = Math.min(minLat, coord[1]);
    maxLat = Math.max(maxLat, coord[1]);
  });

  return [[minLng, minLat], [maxLng, maxLat]];
};
```

### 2. Map Screen Updates

We updated `MapScreen.tsx` to use the bounding box for camera positioning:

```typescript
<MapboxGL.Camera
  ref={(ref) => {
    if (ref && mapReady && mapDetails.boundingBox) {
      // If we have a bounding box, use it to fit the camera
      ref.fitBounds(
        mapDetails.boundingBox[0],
        mapDetails.boundingBox[1],
        100, // padding
        1000 // animation duration
      );
    }
  }}
  zoomLevel={mapDetails.mapState?.zoom || 9}
  centerCoordinate={mapDetails.mapState?.center || [146.8087, -41.4419]}
  animationDuration={0}
/>
```

## Benefits

This implementation provides several significant benefits:

1. **Reduced Data Transfer**: Pre-processed data from Cloudinary is optimized and smaller
2. **Faster Loading**: Cloudinary's CDN delivers data quickly from edge locations
3. **Proper Map Zooming**: The bounding box ensures the entire route is visible
4. **Consistency**: Uses the same data source as the web app
5. **Fallback Mechanism**: Falls back to direct API if Cloudinary data isn't available
6. **Future-Proof**: Any new features added to the web app's embed data will automatically be available to the mobile app

## Future Considerations

1. **Offline Support**: The pre-processed Cloudinary data could be cached for offline use
2. **Route Display**: When ready to display the route on the map, the data is already optimized
3. **Progressive Loading**: Could implement progressive loading of route details as the user zooms in
4. **Data Versioning**: Consider adding version information to handle data format changes
5. **Error Handling**: Enhance error handling for network failures or data format issues

## Conclusion

By leveraging the existing Cloudinary infrastructure used by the web app, we've significantly improved the mobile app's performance and user experience. This approach ensures consistency across platforms while addressing the specific needs and constraints of mobile devices.

The implementation is robust with proper fallback mechanisms and sets the foundation for future enhancements like offline support and progressive data loading.
