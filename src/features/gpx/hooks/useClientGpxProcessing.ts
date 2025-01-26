import { useState } from 'react';
import { parseGpx, GpxParseResult } from '../utils/gpxParser';
import { matchTrackToRoads } from '../services/mapMatchingService';
import { detectUnpavedSections, UnpavedSection } from '../services/surfaceService';
import { ProcessedRoute, GPXProcessingError } from '../types/gpx.types';
import { v4 as uuidv4 } from 'uuid';
import type { FeatureCollection, Feature, LineString } from 'geojson';

export const useClientGpxProcessing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GPXProcessingError | null>(null);

  const processGpx = async (file: File): Promise<ProcessedRoute | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Parse GPX file
      const parsed = await parseGpx(file);
      const rawGpx = await file.text();
      
      if (!parsed.geometry.coordinates.length) {
        throw new Error('No valid track points found in GPX file');
      }

      // Match to roads
      const matched = await matchTrackToRoads(parsed.geometry.coordinates, {
        confidenceThreshold: 0.6,
        radiusMultiplier: 3,
        maxGapDistance: 0.0002,
        interpolationPoints: 5
      });

      // Detect unpaved sections using server's surface detection
      const unpavedSections = await detectUnpavedSections(matched);

      // Create GeoJSON
      const geojson: FeatureCollection<LineString> = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: matched
          }
        }]
      };

      // Calculate basic statistics
      const statistics = {
        totalDistance: 0, // TODO: Calculate from matched points
        elevationGain: 0,
        elevationLoss: 0,
        maxElevation: 0,
        minElevation: 0,
        averageSpeed: 0,
        movingTime: 0,
        totalTime: 0
      };

      const processedRoute: ProcessedRoute = {
        id: uuidv4(),
        name: parsed.properties.name || file.name.replace(/\.gpx$/i, ''),
        color: '#ff4d4d', // Default red color
        isVisible: true,
        gpxData: JSON.stringify(parsed),
        rawGpx,
        geojson,
        unpavedSections, // Add unpaved sections to the processed route
        statistics,
        status: {
          processingState: 'completed',
          progress: 100
        }
      };

      return processedRoute;
    } catch (err) {
      const gpxError: GPXProcessingError = {
        code: 'PARSING_ERROR',
        message: err instanceof Error ? err.message : 'Failed to process GPX file',
        details: err instanceof Error ? err.stack : undefined
      };
      setError(gpxError);
      console.error('GPX processing error:', gpxError);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    processGpx,
    isLoading,
    error
  };
};
