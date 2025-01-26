import { DOMParser, Element } from '@xmldom/xmldom';
import { matchTrackToRoads } from '../services/mapMatchingService';

export interface GpxPoint {
  coordinates: [number, number];
  time?: string;
}

export interface GpxParseResult {
  type: 'Feature';
  properties: {
    name?: string;
    time?: string;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  matched?: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

const extractPoints = (gpx: ReturnType<DOMParser['parseFromString']>): GpxPoint[] => {
  return Array.from(gpx.getElementsByTagName('trkpt')).map(point => {
    const trkpt = point as unknown as Element;
    const timeElement = trkpt.getElementsByTagName('time')[0];
    return {
      coordinates: [
        parseFloat(trkpt.getAttribute('lon') || '0'),
        parseFloat(trkpt.getAttribute('lat') || '0')
      ] as [number, number],
      time: timeElement?.textContent || undefined
    };
  });
};

export const parseAndMatchGpx = async (
  file: File,
  options?: { confidenceThreshold?: number; radiusMultiplier?: number }
): Promise<GpxParseResult> => {
  // First parse the GPX as before
  const result = await parseGpx(file);
  
  try {
    // Then match to roads
    const matchedTrack = await matchTrackToRoads(
      result.geometry.coordinates,
      options
    );
    
    return {
      ...result,
      matched: {
        type: 'LineString',
        coordinates: matchedTrack
      }
    };
  } catch (error) {
    console.error('Map matching failed:', error);
    // Return original parse result if matching fails
    return result;
  }
};

export const parseGpx = async (file: File): Promise<GpxParseResult> => {
  try {
    const text = await file.text();
    const parser = new DOMParser();
    const gpx = parser.parseFromString(text, "text/xml");
    
    // Get track name if available
    const nameElement = gpx.getElementsByTagName('name')[0];
    const name = nameElement?.textContent || undefined;
    
    // Get track time if available
    const timeElement = gpx.getElementsByTagName('time')[0];
    const time = timeElement?.textContent || undefined;
    
    // Extract track points with timestamps
    const points = extractPoints(gpx);

    if (points.length === 0) {
      throw new Error('No track points found in GPX file');
    }

    return {
      type: 'Feature',
      properties: {
        name,
        time
      },
      geometry: {
        type: 'LineString',
        coordinates: points.map(p => p.coordinates)
      }
    };
  } catch (error) {
    throw new Error(`Failed to parse GPX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
