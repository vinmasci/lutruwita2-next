import { parse as parseGPX } from '@xmldom/xmldom';
import { ProcessedRoute } from '../../../types';
import type { MapboxMatchResult, SurfaceAnalysis } from '../types/gpx.types';

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
      const gpxDoc = parseGPX(fileContent);
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
        id: crypto.randomUUID(),
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
      throw new Error(`GPX processing failed: ${error.message}`);
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
    const coordinates = points
      .map(([lon, lat]) => `${lon},${lat}`)
      .join(';');

    const response = await fetch(
      `https://api.mapbox.com/matching/v5/mapbox/cycling/${coordinates}?access_token=${this.mapboxToken}&geometries=geojson&radiuses=25;25&steps=true`
    );

    if (!response.ok) {
      throw new Error('Mapbox matching failed');
    }

    return await response.json();
  }

  private async analyzeSurfaces(
    mapboxMatch: MapboxMatchResult
  ): Promise<SurfaceAnalysis> {
    // Implement surface analysis logic here
    // This could involve checking OSM tags, known trail databases, etc.
    return {
      surfaceTypes: ['unknown'],
      confidence: 0.8
    };
  }

  private async calculateElevation(
    points: Array<[number, number]>
  ): Promise<number[]> {
    // Implement elevation calculation
    // Could use Mapbox Terrain-RGB tiles or other elevation services
    return points.map(() => 0); // Placeholder
  }

  private extractTrackName(gpxDoc: Document): string | null {
    const nameNode = gpxDoc.getElementsByTagName('name')[0];
    return nameNode ? nameNode.textContent : null;
  }
}