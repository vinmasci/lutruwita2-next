/**
 * Utility functions for exporting route data to GPX format
 */

/**
 * Convert GeoJSON to GPX format
 * @param {Object} geojson - GeoJSON object representing the route
 * @param {string} routeName - Name of the route
 * @returns {string} - GPX formatted string
 */
export const geojsonToGpx = (geojson, routeName = 'Unnamed Route') => {
  if (!geojson || !geojson.features || !geojson.features.length) {
    throw new Error('Invalid GeoJSON data');
  }

  // Find the LineString feature that represents the route
  const routeFeature = geojson.features.find(
    feature => feature.geometry && feature.geometry.type === 'LineString'
  );

  if (!routeFeature || !routeFeature.geometry || !routeFeature.geometry.coordinates) {
    throw new Error('No valid route found in GeoJSON');
  }

  const coordinates = routeFeature.geometry.coordinates;
  
  // Get elevation data from coordinateProperties if available
  const elevations = routeFeature.properties?.coordinateProperties?.elevation || [];
  
  // Log elevation data for debugging
  console.log('[gpxExport] Elevation data:', {
    count: elevations.length,
    coordCount: coordinates.length,
    sample: elevations.slice(0, 5)
  });
  
  // Create GPX XML
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Lutruwita Route Planner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>`;

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

  // Close GPX tags
  gpx += `
    </trkseg>
  </trk>
</gpx>`;

  return gpx;
};

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
const escapeXml = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Create a downloadable GPX file from route data
 * @param {Object} route - Route object with GeoJSON data
 * @returns {void} - Triggers file download
 */
export const downloadRouteAsGpx = (route) => {
  if (!route || !route.geojson) {
    console.error('Invalid route data for GPX export');
    return;
  }

  try {
    // Convert GeoJSON to GPX
    const gpxContent = geojsonToGpx(route.geojson, route.name || 'Unnamed Route');
    
    // Create blob and download link
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${route.name || 'route'}.gpx`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error creating GPX file:', error);
  }
};
