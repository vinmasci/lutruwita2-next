# Distance Calculation Fix

## Overview

This document outlines the changes made to fix distance calculation issues in the application. The primary issue was that distance markers on the route were not being placed at their correct geographic locations, causing discrepancies between our app and RWGPS GPX files. Additionally, the elevation profile wasn't showing the correct distances or mirroring the correct distance markers.

## What Was Fixed

### ✅ Distance Markers on the Route

The `DistanceMarkers.js` component was updated to use accurate geographic distance calculations:

- **Before**: The code was using a linear interpolation based on array indices to place distance markers:
  ```javascript
  const getPointsAtInterval = (coordinates, totalDistance, interval) => {
      const points = [];
      const numMarkers = Math.floor(totalDistance / interval);
      for (let i = 1; i <= numMarkers; i++) {
          const fraction = (i * interval) / totalDistance;
          const index = Math.floor(fraction * (coordinates.length - 1));
          points.push(coordinates[index]);
      }
      return points;
  };
  ```

- **After**: Now it uses the Haversine formula to calculate actual geographic distances between points and interpolates between points to place markers at exact intervals:
  ```javascript
  const getPointsAtInterval = (coordinates, totalDistanceKm, interval) => {
      // If no coordinates or invalid interval, return empty array
      if (!coordinates || coordinates.length < 2 || interval <= 0) {
          return [];
      }
      
      const points = [];
      const cumulativeDistances = [0]; // First point is at distance 0
      let totalDistanceM = 0;
      
      // Calculate cumulative distances for each point
      for (let i = 1; i < coordinates.length; i++) {
          const distance = calculateDistance(coordinates[i-1], coordinates[i]);
          totalDistanceM += distance;
          cumulativeDistances.push(totalDistanceM);
      }
      
      // Convert interval to meters
      const intervalM = interval * 1000;
      
      // Find points at each interval
      for (let targetDistance = intervalM; targetDistance < totalDistanceM; targetDistance += intervalM) {
          // Find the point just before or at our target distance
          let index = 0;
          while (index < cumulativeDistances.length - 1 && 
                 cumulativeDistances[index + 1] < targetDistance) {
              index++;
          }
          
          // If we're at the last point, we can't interpolate
          if (index >= coordinates.length - 1) {
              continue;
          }
          
          // If we're exactly at a point, use that point
          if (cumulativeDistances[index] === targetDistance) {
              points.push(coordinates[index]);
              continue;
          }
          
          // Otherwise, we need to interpolate between two points
          const beforeDist = cumulativeDistances[index];
          const afterDist = cumulativeDistances[index + 1];
          const segmentLength = afterDist - beforeDist;
          
          // How far along this segment is our target distance?
          const ratio = (targetDistance - beforeDist) / segmentLength;
          
          // Interpolate between the two points
          const beforePoint = coordinates[index];
          const afterPoint = coordinates[index + 1];
          const interpolatedPoint = [
              beforePoint[0] + ratio * (afterPoint[0] - beforePoint[0]),
              beforePoint[1] + ratio * (afterPoint[1] - beforePoint[1])
          ];
          
          points.push(interpolatedPoint);
      }
      
      return points;
  };
  ```

This change ensures that distance markers (15km, 20km, 25km, etc.) are placed at their true geographic positions along the route.

### ✅ Elevation Profile

The elevation profile components were updated to use the same accurate distance calculations:

1. The `ElevationProfile.tsx` component was modified to use the Haversine formula for distance calculations.

2. The `PresentationElevationProfile.tsx` component (used in presentation mode) was also updated to use the Haversine formula.

3. The hover functionality in the elevation profile was fixed to correctly map between the elevation profile and the map.

### ✅ Distance Markers in Presentation and Embed Modes

The distance markers in presentation and embed modes were also updated to use the same accurate distance calculations:

1. The `PresentationDistanceMarkers.js` component (used in presentation mode) was updated to use the Haversine formula and interpolation.

2. The `SimplifiedRouteLayer.jsx` component (used in embed mode) was updated to use the Haversine formula and interpolation.

## Technical Details

The key improvement was moving from a linear interpolation approach to an accurate geographic calculation using the Haversine formula:

```javascript
// Haversine formula to calculate distance between two points
const calculateDistance = (point1, point2) => {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;
    
    // Convert to radians
    const toRad = (value) => value * Math.PI / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    
    // Haversine formula
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    // Earth's radius in meters
    const R = 6371e3;
    return R * c;
};
```

This approach accounts for the fact that GPS points are not evenly distributed along a route. Points are typically closer together in areas with turns or complex features, and further apart on straight sections.

Additionally, we improved the marker placement by interpolating between points to place markers at exact distance intervals, rather than just finding the closest point. This ensures that distance markers are placed at their exact geographic positions.

## Results

With these changes:

1. Distance markers are now placed at their true geographic positions along the route in all modes (main, presentation, and embed).

2. The elevation profile now shows the correct distances that match the distance markers.

3. When hovering on the map, the elevation profile shows the correct position and elevation.

4. When hovering on the elevation profile, the map shows the correct position on the route.

5. All components now use a consistent approach to distance calculations, ensuring that the distance markers, elevation profile, and hover functionality all work together correctly.
