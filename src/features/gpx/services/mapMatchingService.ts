import { LngLat } from 'mapbox-gl';

interface MatchingOptions {
  confidenceThreshold?: number;
  radiusMultiplier?: number;
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
const matchBatch = async (
  points: [number, number][],
  confidenceThreshold: number,
  radiusMultiplier: number
): Promise<[number, number][]> => {
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
      return points; // Return original points if no matches
    }

    // Use the first match if available
    if (data.matchings && data.matchings.length > 0) {
      return data.matchings[0].geometry.coordinates;
    }
    
    console.warn('No matches found for batch');
    return points;
  } catch (error) {
    console.error('Error in map matching:', error);
    return points; // Return original points on error
  }
};

/**
 * Combines matched batches into a single track
 */
const combineBatches = (batches: [number, number][][]): [number, number][] => {
  return batches.flat();
};

/**
 * Main function to match a track to roads
 */
export const matchTrackToRoads = async (
  points: [number, number][],
  options: MatchingOptions = {}
): Promise<[number, number][]> => {
  const { confidenceThreshold = 0.8, radiusMultiplier = 2 } = options;

  // Split points into batches
  const batches = chunkArray(points, BATCH_SIZE);

  // Process each batch
  const matchedBatches = await Promise.all(
    batches.map(batch => matchBatch(batch, confidenceThreshold, radiusMultiplier))
  );

  // Combine results
  return combineBatches(matchedBatches);
};

/**
 * Converts GeoJSON coordinates to Mapbox LngLat array
 */
export const coordsToLngLat = (coords: [number, number][]): LngLat[] => {
  return coords.map(([lng, lat]) => new LngLat(lng, lat));
};
