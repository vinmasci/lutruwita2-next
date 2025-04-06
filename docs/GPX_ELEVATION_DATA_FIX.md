# GPX Elevation Data Fix

## Issue
When downloading GPX files from the elevation profile, the elevation data was missing in the exported files. The coordinates were correctly exported, but all elevation values were set to 0 or missing entirely.

## Root Cause
The issue was in the `geojsonToGpx` function in `src/utils/gpx/export.js`. The function was looking for elevation data in the wrong location within the GeoJSON structure.

Previously, the function was trying to extract elevation data from the third element of each coordinate array:
```javascript
const ele = coord[2] || 0; // Elevation might be optional
```

However, in our application, elevation data is stored separately in the GeoJSON structure under `feature.properties.coordinateProperties.elevation` as an array of elevation values. This matches how the data is imported when parsing GPX files (see `src/features/gpx/utils/gpxParser.js`).

## Solution
The fix modifies the `geojsonToGpx` function to properly extract elevation data from the `coordinateProperties` structure:

```javascript
// Get elevation data from coordinateProperties if available
const elevations = routeFeature.properties?.coordinateProperties?.elevation || [];

// Add track points with elevation data from coordinateProperties
coordinates.forEach((coord, index) => {
  const lon = coord[0];
  const lat = coord[1];
  // Use elevation from coordinateProperties if available, otherwise fallback to coord[2] or 0
  const ele = (index < elevations.length) ? elevations[index] : (coord[2] || 0);
  
  gpx += `
    <trkpt lat="${lat}" lon="${lon}">
      <ele>${ele}</ele>
    </trkpt>`;
});
```

This ensures that:
1. We first try to use the elevation data from the `coordinateProperties.elevation` array
2. If that's not available for a specific point, we fall back to the third element of the coordinate array
3. If neither is available, we use 0 as a default value

## Data Structure
For reference, here's how the GPX data is structured in our application:

### When importing GPX files (gpxParser.js)
```javascript
return {
  type: 'Feature',
  properties: {
    name,
    time,
    coordinateProperties: {
      elevation: points.map(p => p.elevation).filter(e => e !== undefined)
    }
  },
  geometry: {
    type: 'LineString',
    coordinates: points.map(p => p.coordinates)
  }
};
```

### When exporting GPX files (export.js)
The function now correctly accesses the elevation data from the same structure, ensuring consistency between import and export operations.

## Testing
To test this fix:
1. Load a route with elevation data
2. Open the elevation profile panel
3. Click the download button (GPX icon)
4. Open the downloaded GPX file in a text editor or GPX viewer
5. Verify that the `<ele>` tags contain proper elevation values, not just zeros
