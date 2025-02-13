import { DOMParser, Element } from '@xmldom/xmldom';
export interface GpxPoint {
  coordinates: [number, number];
  elevation?: number;
  time?: string;
}

export interface GpxParseResult {
  type: 'Feature';
  properties: {
    name?: string;
    time?: string;
    coordinateProperties?: {
      elevation: number[];
    };
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

const extractPoints = (gpx: ReturnType<DOMParser['parseFromString']>): GpxPoint[] => {
  return Array.from(gpx.getElementsByTagName('trkpt')).map(point => {
    const trkpt = point as unknown as Element;
    const timeElement = trkpt.getElementsByTagName('time')[0];
    const eleElement = trkpt.getElementsByTagName('ele')[0];
    return {
      coordinates: [
        parseFloat(trkpt.getAttribute('lon') || '0'),
        parseFloat(trkpt.getAttribute('lat') || '0')
      ] as [number, number],
      elevation: eleElement ? parseFloat(eleElement.textContent || '0') : undefined,
      time: timeElement?.textContent || undefined
    };
  });
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

    // Debug elevation data
    const elevations = points.map(p => p.elevation).filter(e => e !== undefined);
    console.log('[gpxParser] Elevation data:', {
      count: elevations.length,
      min: Math.min(...elevations),
      max: Math.max(...elevations),
      sample: elevations.slice(0, 5)
    });

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
  } catch (error) {
    throw new Error(`Failed to parse GPX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
