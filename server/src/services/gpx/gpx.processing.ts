import { DOMParser } from '@xmldom/xmldom';
import { ProcessedRoute } from '@shared/types/gpx.types';
import type { MapboxMatchResult, SurfaceAnalysis } from '@shared/types/gpx.types';

interface ProcessingOptions {
  onProgress?: (progress: number) => void;
}

export class GPXProcessingService {
  private mapboxToken: string;

  constructor(mapboxToken: string) {
    this.mapboxToken = mapboxToken;
  }

  async processGPXFile(
    fileContent: string,
    options?: ProcessingOptions
  ): Promise<ProcessedRoute> {
    const { onProgress } = options || {};
    
    try {
      // Parse GPX file
      const gpxDoc = new DOMParser().parseFromString(fileContent, 'text/xml');
      onProgress?.(20);

      // Extract track points
      const trackPoints = this.extractTrackPoints(gpxDoc);
      onProgress?.(40);

      // Match to Mapbox roads
      const mapboxMatch = await this.matchToMapbox(trackPoints);
      onProgress?.(60);

      // Analyze surface types
      const surfaceAnalysis = await this.analyzeSurfaces(mapboxMatch);
      onProgress?.(80);

      // Prepare final result
      const result: ProcessedRoute = {
        id: `temp-id-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: this.extractTrackName(gpxDoc) || 'Unnamed Track',
        geojson: mapboxMatch.geojson,
        surface: surfaceAnalysis,
        metadata: {
          distance: mapboxMatch.distance,
          duration: mapboxMatch.duration,
          elevation: await this.calculateElevation(trackPoints)
        }
      };

      onProgress?.(100);
      return result;
    } catch (error) {
      console.error('GPX processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : '';
      console.error(`GPX Processing Failure Details:
        Error: ${errorMessage}
        Stack: ${stack}
        Mapbox Token: ${this.mapboxToken ? 'Present' : 'Missing'}
      `);
      throw new Error(`GPX processing failed: ${errorMessage}`);
    }
  }

  private extractTrackPoints(gpxDoc: Document): Array<[number, number]> {
    const trackPoints: Array<[number, number]> = [];
    const trkptNodes = gpxDoc.getElementsByTagName('trkpt');

    for (let i = 0; i < trkptNodes.length; i++) {
      const point = trkptNodes[i];
      const lat = parseFloat(point.getAttribute('lat') || '0');
      const lon = parseFloat(point.getAttribute('lon') || '0');
      
      if (lat && lon) {
        trackPoints.push([lon, lat]);
      }
    }

    return trackPoints;
  }

  private async matchToMapbox(
    points: Array<[number, number]>
  ): Promise<MapboxMatchResult> {
    if (points.length === 0) {
      throw new Error('No valid track points found in GPX file');
    }

    if (points.length < 2) {
      throw new Error('GPX file must contain at least 2 track points');
    }

    // Validate coordinates
    points.forEach(([lon, lat], index) => {
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        throw new Error(`Invalid coordinates at point ${index}: [${lon}, ${lat}]`);
      }
    });

    const coordinates = points
      .map(([lon, lat]) => `${lon},${lat}`)
      .join(';');

    // Calculate dynamic radius based on point density
    const calculateRadius = (index: number) => {
      if (index === 0 || index === points.length - 1) return '25'; // Fixed radius for start/end points
      
      const prev = points[index - 1];
      const curr = points[index];
      const next = points[index + 1];
      
      // Calculate distances to neighboring points
      const distToPrev = Math.sqrt(Math.pow(curr[0] - prev[0], 2) + Math.pow(curr[1] - prev[1], 2));
      const distToNext = Math.sqrt(Math.pow(curr[0] - next[0], 2) + Math.pow(curr[1] - next[1], 2));
      
      // Use larger distance to determine search radius, with minimum of 25m and maximum of 100m
      const radius = Math.max(25, Math.min(100, Math.max(distToPrev, distToNext) * 10000));
      return radius.toString();
    };

    const radiuses = points.map((_, index) => calculateRadius(index)).join(';');

    const response = await fetch(
      `https://api.mapbox.com/matching/v5/mapbox/cycling/${coordinates}?access_token=${this.mapboxToken}&geometries=geojson&radiuses=${radiuses}&steps=true`
    );

    if (!response.ok) {
      let errorMessage = `Mapbox matching failed: ${response.status} ${response.statusText}`;
      const clonedResponse = response.clone();
      
      try {
        const errorBody = await response.json();
        if (errorBody.message) {
          errorMessage = `Mapbox matching failed: ${errorBody.message}`;
        }
      } catch {
        try {
          const errorText = await clonedResponse.text();
          console.error('Mapbox API Failure:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            errorBody: errorText
          });
        } catch (e) {
          console.error('Failed to read error response:', e);
        }
      }
      throw new Error(errorMessage);
    }

    try {
      return await response.json();
    } catch (error) {
      console.error('Failed to parse Mapbox response:', error);
      throw new Error('Failed to parse Mapbox response');
    }
  }

  private async analyzeSurfaces(
    mapboxMatch: MapboxMatchResult
  ): Promise<SurfaceAnalysis> {
    // Extract surface types from Mapbox steps data if available
    const surfaceTypes = new Set<string>();
    
    if (mapboxMatch.matchings && mapboxMatch.matchings[0]?.legs) {
      mapboxMatch.matchings[0].legs.forEach(leg => {
        leg.steps?.forEach(step => {
          if (step.surface) {
            surfaceTypes.add(step.surface);
          }
        });
      });
    }

    return {
      surfaceTypes: surfaceTypes.size > 0 ? Array.from(surfaceTypes) : ['unknown'],
      confidence: surfaceTypes.size > 0 ? 0.9 : 0.5
    };
  }

  private async calculateElevation(
    points: Array<[number, number]>
  ): Promise<number[]> {
    try {
      // Use Mapbox Terrain-RGB tiles for elevation data
      const elevations = await Promise.all(points.map(async ([lon, lat]) => {
        const response = await fetch(
          `https://api.mapbox.com/v4/mapbox.terrain-rgb/${lon},${lat},14/256x256.pngraw?access_token=${this.mapboxToken}`
        );
        
        if (!response.ok) {
          console.warn(`Failed to get elevation for point [${lon}, ${lat}]`);
          return 0;
        }

        // Process the RGB values to get elevation
        // Elevation = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
        const buffer = await response.arrayBuffer();
        const view = new Uint8Array(buffer);
        const elevation = -10000 + ((view[0] * 256 * 256 + view[1] * 256 + view[2]) * 0.1);
        
        return Math.round(elevation);
      }));

      return elevations;
    } catch (error) {
      console.error('Failed to calculate elevations:', error);
      return points.map(() => 0);
    }
  }

  private extractTrackName(gpxDoc: Document): string | null {
    const nameNode = gpxDoc.getElementsByTagName('name')[0];
    return nameNode ? nameNode.textContent : null;
  }
}
