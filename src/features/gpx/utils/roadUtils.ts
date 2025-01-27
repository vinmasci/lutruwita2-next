/**
 * Helper functions for road detection and surface analysis
 */

/**
 * Convert degrees to radians
 */
const toRad = (degrees: number): number => {
  return degrees * Math.PI / 180;
};

/**
 * Convert radians to degrees
 */
const toDeg = (radians: number): number => {
  return radians * 180 / Math.PI;
};

/**
 * Calculate bearing between two points
 * @param start Starting point [longitude, latitude]
 * @param end Ending point [longitude, latitude]
 * @returns Bearing in degrees (0-360)
 */
export const getBearing = (start: [number, number], end: [number, number]): number => {
  const startLat = toRad(start[1]);
  const startLng = toRad(start[0]);
  const endLat = toRad(end[1]);
  const endLng = toRad(end[0]);

  const dLng = endLng - startLng;

  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
           Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  let bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
};

/**
 * Calculate distance from a point to a line segment
 * @param point Point to check [longitude, latitude]
 * @param lineStart Start of line segment [longitude, latitude]
 * @param lineEnd End of line segment [longitude, latitude]
 * @returns Distance in meters
 */
const pointToLineDistance = (
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number => {
  const lat = point[1];
  const lng = point[0];
  const lat1 = lineStart[1];
  const lng1 = lineStart[0];
  const lat2 = lineEnd[1];
  const lng2 = lineEnd[0];

  // Convert to radians for calculations
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const φ = toRad(lat);
  const λ1 = toRad(lng1);
  const λ2 = toRad(lng2);
  const λ = toRad(lng);

  // If start and end points are the same, just return distance to that point
  if (lat1 === lat2 && lng1 === lng2) {
    return haversineDistance([lng, lat], [lng1, lat1]);
  }

  // Cross track distance formula
  const R = 6371e3; // Earth's radius in meters

  // Angular distance between start and point
  const δ13 = haversineDistance([lng1, lat1], [lng, lat]) / R;
  // Initial bearing from start to point
  const θ13 = toRad(getBearing([lng1, lat1], [lng, lat]));
  // Initial bearing from start to end
  const θ12 = toRad(getBearing([lng1, lat1], [lng2, lat2]));

  const dxt = Math.asin(Math.sin(δ13) * Math.sin(θ13 - θ12)) * R;

  // Get closest point on line
  const δ12 = haversineDistance([lng1, lat1], [lng2, lat2]) / R;
  const along = Math.acos(Math.cos(δ13) / Math.cos(dxt / R)) * R;

  // Check if closest point is beyond ends of line segment
  if (along > haversineDistance([lng1, lat1], [lng2, lat2])) {
    return haversineDistance([lng, lat], [lng2, lat2]);
  }
  if (along < 0) {
    return haversineDistance([lng, lat], [lng1, lat1]);
  }

  return Math.abs(dxt);
};

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 First point [longitude, latitude]
 * @param point2 Second point [longitude, latitude]
 * @returns Distance in meters
 */
const haversineDistance = (point1: [number, number], point2: [number, number]): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = toRad(point1[1]);
  const φ2 = toRad(point2[1]);
  const Δφ = toRad(point2[1] - point1[1]);
  const Δλ = toRad(point2[0] - point1[0]);

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
           Math.cos(φ1) * Math.cos(φ2) *
           Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

/**
 * Calculate minimum distance from a point to a road (polyline)
 * @param point Point to check [longitude, latitude]
 * @param roadCoords Array of road coordinates [longitude, latitude][]
 * @returns Minimum distance in meters
 */
export const getDistanceToRoad = (
  point: [number, number],
  roadCoords: [number, number][]
): number => {
  let minDist = Infinity;

  // Check each segment of the road
  for (let i = 0; i < roadCoords.length - 1; i++) {
    const dist = pointToLineDistance(point, roadCoords[i], roadCoords[i + 1]);
    minDist = Math.min(minDist, dist);
  }

  return minDist;
};

/**
 * Calculate variance of a set of numbers
 * @param numbers Array of numbers
 * @returns Variance
 */
export const getVariance = (numbers: number[]): number => {
  const mean = numbers.reduce((a, b) => a + b) / numbers.length;
  const squareDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squareDiffs.reduce((a, b) => a + b) / numbers.length;
};

/**
 * Calculate the number of consecutive matching road IDs
 * @param roadMatches Array of road features or null values
 * @returns Number of consecutive matches
 */
export const getConsecutiveMatches = (roadMatches: Array<{ id: string } | null>): number => {
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  let lastId: string | null = null;

  for (const match of roadMatches) {
    if (match && match.id === lastId) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 1;
    }
    lastId = match?.id ?? null;
  }

  return maxConsecutive;
};
