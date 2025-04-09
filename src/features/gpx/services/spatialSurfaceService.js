import { vectorTileService } from './vectorTileService';
import { 
  smoothSurfaceDetection, 
  applyInverseSmoothing, 
  fillSurfaceGaps,
  removeChatter
} from './surfaceService'; // Reuse existing post-processing logic

/**
 * Process surface types for a route using spatial indexing.
 */
export const assignSurfacesWithSpatialIndex = async (
  coords,
  onProgress
) => {
  // Process surface types for a route using spatial indexing
  if (!coords || coords.length === 0) return coords;

  // 1. Calculate bounding box for the entire route
  const bounds = getBoundsFromCoordinates(coords);

  // 2. Ensure necessary road data is loaded
  try {
    await vectorTileService.loadTilesForBounds(bounds);
  } catch (error) {
    console.error("Failed to load necessary road data. Proceeding without surface detection.", error);
    return coords.map(pt => ({ ...pt, surface: 'unpaved' })); 
  }

  // 3. Process points
  const results = [];
  const totalPoints = coords.length;

  for (let i = 0; i < totalPoints; i++) {
    const pt = coords[i];
    const pointCoords = [pt.lon, pt.lat];

    // Find nearest road using the indexed service with a smaller search radius
    const nearestRoad = vectorTileService.findNearestRoad(pointCoords, 0.00005); // 5m search radius
    
    // Determine surface type
    const surface = vectorTileService.determineSurfaceType(nearestRoad);
    
    results.push({ ...pt, surface });

    // Update progress
    if (onProgress && (i % 100 === 0 || i === totalPoints - 1)) {
      onProgress(i + 1, totalPoints);
    }
  }

  // Apply post-processing

  // 4. Apply post-processing (reuse existing functions)
  const gapFilledResults = fillSurfaceGaps(results); 
  const smoothedResults = smoothSurfaceDetection(gapFilledResults);
  const inverseSmoothedResults = applyInverseSmoothing(smoothedResults);
  
  // 5. Apply chatter removal to eliminate short segments
  console.log('[spatialSurfaceService] Removing surface type chatter...');
  const finalResults = removeChatter(inverseSmoothedResults, 10); // Decreased minimum segment length to 5 points

  // Return the final results
  return finalResults;
};

/** Helper to calculate bounding box */
function getBoundsFromCoordinates(coords) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  
  coords.forEach(pt => {
    minLon = Math.min(minLon, pt.lon);
    minLat = Math.min(minLat, pt.lat);
    maxLon = Math.max(maxLon, pt.lon);
    maxLat = Math.max(maxLat, pt.lat);
  });
  
  // Add a small buffer
  const buffer = 0.01; 
  return [minLon - buffer, minLat - buffer, maxLon + buffer, maxLat + buffer];
}

/**
 * Generate unpaved sections from points with surface information
 */
export const generateUnpavedSections = (points) => {
  const sections = [];
  let currentSection = null;
  
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    
    if (point.surface === 'unpaved') {
      if (!currentSection) {
        // Start a new unpaved section
        currentSection = {
          startIndex: i,
          endIndex: i,
          coordinates: [[point.lon, point.lat]]
        };
      } else {
        // Extend the current unpaved section
        currentSection.endIndex = i;
        currentSection.coordinates.push([point.lon, point.lat]);
      }
    } else if (currentSection) {
      // End of an unpaved section
      sections.push(currentSection);
      currentSection = null;
    }
  }
  
  // Don't forget to add the last section if we ended on an unpaved point
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
};
