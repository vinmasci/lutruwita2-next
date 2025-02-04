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

      const elevations = await this.calculateElevation(trackPoints);
      const totalDistance = this.calculateTotalDistance(trackPoints);

      // Prepare final result
      const result: ProcessedRoute = {
        id: `temp-id-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: this.extractTrackName(gpxDoc) || 'Unnamed Track',
        color: '#FF0000', // Default red color
        isVisible: true,
        gpxData: fileContent,
        rawGpx: fileContent,
        geojson: mapboxMatch.geojson,
        surface: surfaceAnalysis,
        mapboxMatch,
        statistics: {
          totalDistance,
          elevationGain: 0, // Calculate from elevations
          elevationLoss: 0, // Calculate from elevations
          maxElevation: Math.max(...elevations),
          minElevation: Math.min(...elevations),
          averageSpeed: 0,
          movingTime: 0,
          totalTime: 0
        },
        status: {
          processingState: 'completed',
          progress: 100
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

  private calculateTotalDistance(points: Array<[number, number]>): number {
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const [lon1, lat1] = points[i - 1];
      const [lon2, lat2] = points[i];
      
      // Simple Haversine formula for distance calculation
      const R = 6371e3; // Earth's radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const d = R * c;

      totalDistance += d;
    }
    return totalDistance;
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
      const data = await response.json();
      return {
        geojson: data.matchings[0].geometry,
        confidence: data.matchings[0].confidence,
        matchingStatus: data.matchings[0].confidence > 0.8 ? 'matched' : 'partial'
      };
    } catch (error) {
      console.error('Failed to parse Mapbox response:', error);
      throw new Error('Failed to parse Mapbox response');
    }
  }

  public async analyzeSurfaces(
    input: { geojson: GeoJSON.FeatureCollection }
  ): Promise<SurfaceAnalysis> {
    try {
      const feature = input.geojson.features[0];
      if (!feature || feature.geometry.type !== 'LineString') {
        return this.getDefaultSurfaceAnalysis();
      }
      const coordinates = feature.geometry.coordinates;
      if (!coordinates) {
        return this.getDefaultSurfaceAnalysis();
      }

      const totalDistance = this.calculateTotalDistance(coordinates as [number, number][]);

      return {
        surfaceTypes: [{
          type: 'trail',
          percentage: 100,
          distance: totalDistance
        }],
        elevationProfile: coordinates.map((coord, i) => ({
          elevation: 0,
          distance: (i / coordinates.length) * totalDistance,
          grade: 0
        })),
        totalDistance,
        roughness: 0.5,
        difficultyRating: 0.5,
        surfaceQuality: 0.8
      };
    } catch (error) {
      console.error('Surface analysis error:', error);
      return this.getDefaultSurfaceAnalysis();
    }
  }

  private getDefaultSurfaceAnalysis(): SurfaceAnalysis {
    return {
      surfaceTypes: [{
        type: 'unknown',
        percentage: 100,
        distance: 0
      }],
      elevationProfile: [],
      totalDistance: 0,
      roughness: 0,
      difficultyRating: 0,
      surfaceQuality: 0
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
