/**
 * Utility functions for route operations
 */

// Type definitions
interface RoutePoint {
  x: number;
  y: number;
}

interface RouteCoordinateData {
  raw: number[][];
  grid: {
    [key: string]: Array<{ coord: number[]; index: number }>;
  };
  memoized: Map<string, number[]>;
  distanceMap?: Map<string, number>;
}

/**
 * Find the closest point on a route to the given coordinates using spatial grid optimization
 * 
 * @param mouseCoords The coordinates to find the closest point to [lng, lat]
 * @param routeData The route data with spatial grid and memoization
 * @returns The closest point on the route, or null if none found
 */
export const findClosestPointOnRoute = (
  mouseCoords: number[],
  routeData: RouteCoordinateData | null
): number[] | null => {
  if (!routeData) return null;
  
  // Check memoization cache first (with some rounding to create "bins")
  const memoKey = `${Math.round(mouseCoords[0] * 10000)},${Math.round(mouseCoords[1] * 10000)}`;
  if (routeData.memoized.has(memoKey)) {
    return routeData.memoized.get(memoKey) || null;
  }
  
  // Find which grid cell the mouse is in
  const gridSize = 0.00025; // About 25m at the equator - matching the grid creation size
  const gridX = Math.floor(mouseCoords[0] / gridSize);
  const gridY = Math.floor(mouseCoords[1] / gridSize);
  
  // Get points from this cell and adjacent cells
  let candidatePoints: Array<{ coord: number[]; index: number }> = [];
  for (let x = gridX - 1; x <= gridX + 1; x++) {
    for (let y = gridY - 1; y <= gridY + 1; y++) {
      const key = `${x},${y}`;
      if (routeData.grid[key]) {
        candidatePoints = candidatePoints.concat(routeData.grid[key]);
      }
    }
  }
  
  // If no candidates in nearby cells, fall back to checking all points
  if (candidatePoints.length === 0) {
    // Fall back to using all points to maintain accuracy
    const rawCoordinates = routeData.raw;
    if (!rawCoordinates || rawCoordinates.length === 0) {
      return null;
    }
    
    // Use a more comprehensive sampling approach for the fallback
    let closestPoint: number[] | null = null;
    let minDistanceSq = Infinity;
    
    // First pass with even finer sampling (reduced from 10 to 5)
    const coarseSampleRate = 5;
    for (let i = 0; i < rawCoordinates.length; i += coarseSampleRate) {
      const coord = rawCoordinates[i];
      if (coord && coord.length >= 2) {
        const dx = coord[0] - mouseCoords[0];
        const dy = coord[1] - mouseCoords[1];
        const distanceSq = dx * dx + dy * dy;
        
        if (distanceSq < minDistanceSq) {
          minDistanceSq = distanceSq;
          closestPoint = [coord[0], coord[1]];
        }
      }
    }
    
    // Second pass with fine sampling around the best area
    if (closestPoint) {
      // Find the index of the closest point from the first pass
      let closestIndex = 0;
      for (let i = 0; i < rawCoordinates.length; i++) {
        const coord = rawCoordinates[i];
        if (coord && coord.length >= 2 && 
            coord[0] === closestPoint[0] && 
            coord[1] === closestPoint[1]) {
          closestIndex = i;
          break;
        }
      }
      
      // Search more precisely around this area with an even wider window
      // Increased from coarseSampleRate * 2 to coarseSampleRate * 4
      const searchStart = Math.max(0, closestIndex - coarseSampleRate * 4);
      const searchEnd = Math.min(rawCoordinates.length, closestIndex + coarseSampleRate * 4);
      
      minDistanceSq = Infinity; // Reset for second pass
      for (let i = searchStart; i < searchEnd; i++) {
        const coord = rawCoordinates[i];
        if (coord && coord.length >= 2) {
          const dx = coord[0] - mouseCoords[0];
          const dy = coord[1] - mouseCoords[1];
          const distanceSq = dx * dx + dy * dy;
          
          if (distanceSq < minDistanceSq) {
            minDistanceSq = distanceSq;
            closestPoint = [coord[0], coord[1]];
          }
        }
      }
    }
    
    // Define a threshold distance (squared) - approx 1km
    const distanceThresholdSq = 0.000081;
    
    // Only return if within threshold
    if (closestPoint && minDistanceSq < distanceThresholdSq) {
      // Store in memoization cache
      routeData.memoized.set(memoKey, closestPoint);
      return closestPoint;
    }
    
    return null;
  }
  
  // Find closest point among candidates
  let closestPoint: number[] | null = null;
  let minDistanceSq = Infinity;
  let closestIndex = -1;
  
  for (const { coord, index } of candidatePoints) {
    if (coord && coord.length >= 2) {
      const dx = coord[0] - mouseCoords[0];
      const dy = coord[1] - mouseCoords[1];
      const distanceSq = dx * dx + dy * dy;
      
      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        closestPoint = [coord[0], coord[1]];
        closestIndex = index;
        
        // Early termination if we find a very close point
        if (distanceSq < 0.00000001) { // Very small threshold
          break;
        }
      }
    }
  }
  
  // Define a threshold distance (squared) - approx 1km
  // 1km is roughly 0.009 degrees latitude, squared is ~0.000081
  const distanceThresholdSq = 0.000081;
  
  // Only store valid points within threshold
  if (closestPoint && minDistanceSq < distanceThresholdSq) {
    // Store in memoization cache
    routeData.memoized.set(memoKey, closestPoint);
    
    // Limit cache size to prevent memory issues
    if (routeData.memoized.size > 1000) {
      // Remove oldest entries (this is a simple approach)
      const keys = Array.from(routeData.memoized.keys());
      for (let i = 0; i < 200; i++) {
        routeData.memoized.delete(keys[i]);
      }
    }
    
    return closestPoint;
  }
  
  return null;
};

/**
 * Create a spatial grid for a route to optimize point lookups
 * 
 * @param coordinates The route coordinates
 * @returns The route data with spatial grid and memoization
 */
export const createRouteSpatialGrid = (coordinates: number[][]): RouteCoordinateData => {
  // Create spatial buckets for faster initial lookup
  const spatialGrid: { [key: string]: Array<{ coord: number[]; index: number }> } = {};
  const gridSize = 0.00025; // Reduced from 0.0005 to 0.00025 (about 25m at the equator) for even more precise grid
  
  coordinates.forEach((coord, index) => {
    if (coord && coord.length >= 2) {
      const gridX = Math.floor(coord[0] / gridSize);
      const gridY = Math.floor(coord[1] / gridSize);
      const key = `${gridX},${gridY}`;
      
      if (!spatialGrid[key]) {
        spatialGrid[key] = [];
      }
      spatialGrid[key].push({ coord, index });
    }
  });
  
  // Store both the raw coordinates and the spatial grid
  return {
    raw: coordinates,
    grid: spatialGrid,
    memoized: new Map() // Cache for previous calculations
  };
};

/**
 * Calculate the distance between two points using the Haversine formula
 * 
 * @param point1 First point [lng, lat]
 * @param point2 Second point [lng, lat]
 * @returns Distance in meters
 */
export const calculateDistance = (point1: number[], point2: number[]): number => {
  // Ensure we have at least 2 elements in each point
  if (point1.length < 2 || point2.length < 2) {
    return 0; // Return 0 distance if points are invalid
  }
  
  const lon1 = point1[0];
  const lat1 = point1[1];
  const lon2 = point2[0];
  const lat2 = point2[1];
  
  // Convert to radians
  const toRad = (value: number) => value * Math.PI / 180;
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

/**
 * Pre-calculate cumulative distances for a route
 * 
 * @param coordinates The route coordinates
 * @returns Map of coordinate index to cumulative distance
 */
export const calculateCumulativeDistances = (coordinates: number[][]): Map<number, number> => {
  const distanceMap = new Map<number, number>();
  distanceMap.set(0, 0); // First point is at distance 0
  
  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const distance = calculateDistance(coordinates[i-1], coordinates[i]);
    totalDistance += distance;
    distanceMap.set(i, totalDistance);
  }
  
  return distanceMap;
};
