import { LngLat } from 'mapbox-gl';

interface MatchingOptions {
  confidenceThreshold?: number;
  radiusMultiplier?: number;
  maxGapDistance?: number; // Maximum allowed gap between points before interpolation
  interpolationPoints?: number; // Number of points to interpolate between gaps
}

interface MatchingResponse {
  code: string;
  matchings: Array<{
    confidence: number;
    geometry: {
      coordinates: [number, number][];
    };
  }>;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const BATCH_SIZE = 100; // Mapbox limit

/**
 * Splits an array into chunks of specified size
 */
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Matches a single batch of points to roads using Mapbox Map Matching API
 */
interface MatchResult {
  coordinates: [number, number][];
  matchedIndices: number[]; // Indices of points that were successfully matched
}

const matchBatch = async (
  points: [number, number][],
  confidenceThreshold: number,
  radiusMultiplier: number
): Promise<MatchResult> => {
  const coordinates = points.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const radiuses = points.map(() => 25 * radiusMultiplier).join(';'); // Default 25m radius * multiplier

  const url = `https://api.mapbox.com/matching/v5/mapbox/walking/${coordinates}?access_token=${MAPBOX_TOKEN}&radiuses=${radiuses}&tidy=true&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Map matching failed: ${response.statusText}`);
    }

    const data: MatchingResponse = await response.json();

    // Check if we got any matches
    if (!data.matchings?.length) {
      console.warn('No matches found for batch');
      return {
        coordinates: points,
        matchedIndices: [] // No points were matched
      };
    }

    // Use the first match if available
    if (data.matchings && data.matchings.length > 0) {
      const matched = data.matchings[0];
      if (matched.confidence >= confidenceThreshold) {
        return {
          coordinates: matched.geometry.coordinates,
          matchedIndices: Array.from({length: matched.geometry.coordinates.length}, (_, i) => i)
        };
      }
    }
    
    console.warn('No matches found for batch');
    return {
      coordinates: points,
      matchedIndices: [] // No points were matched
    };
  } catch (error) {
    console.error('Error in map matching:', error);
    return {
      coordinates: points,
      matchedIndices: [] // No points were matched
    };
  }
};

/**
 * Combines matched batches into a single track
 */
/**
 * Interpolates between points that are too far apart
 */
const interpolatePoints = (
  points: [number, number][],
  maxGapDistance: number,
  interpolationPoints: number
): [number, number][] => {
  const interpolated: [number, number][] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    
    // Calculate distance between points
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    interpolated.push(points[i]);
    
    if (distance > maxGapDistance) {
      // Add interpolated points
      for (let j = 1; j <= interpolationPoints; j++) {
        const t = j / (interpolationPoints + 1);
        interpolated.push([
          x1 + dx * t,
          y1 + dy * t
        ]);
      }
    }
  }
  
  interpolated.push(points[points.length - 1]);
  return interpolated;
};

const combineBatches = (
  batches: MatchResult[],
  options: MatchingOptions
): [number, number][] => {
  // Combine coordinates
  const combined = batches.flatMap(b => b.coordinates);
  
  // Interpolate large gaps if needed
  if (options.maxGapDistance && options.interpolationPoints) {
    return interpolatePoints(
      combined,
      options.maxGapDistance,
      options.interpolationPoints
    );
  }
  
  return combined;
};

/**
 * Main function to match a track to roads
 */
export const matchTrackToRoads = async (
  points: [number, number][],
  options: MatchingOptions = {}
): Promise<[number, number][]> => {
  const {
    confidenceThreshold = 0.8,
    radiusMultiplier = 1.5, // Reduced from 2 to 1.5 for tighter matching
    maxGapDistance = 0.0005, // ~50 meters in degrees
    interpolationPoints = 3
  } = options;

  // Split points into batches
  const batches = chunkArray(points, BATCH_SIZE);

  // Process each batch
  const matchedBatches = await Promise.all(
    batches.map(batch => matchBatch(batch, confidenceThreshold, radiusMultiplier))
  );

  // Combine results with interpolation
  return combineBatches(matchedBatches, {
    maxGapDistance,
    interpolationPoints
  });
};

/**
 * Converts GeoJSON coordinates to Mapbox LngLat array
 */
export const coordsToLngLat = (coords: [number, number][]): LngLat[] => {
  return coords.map(([lng, lat]) => new LngLat(lng, lat));
};
