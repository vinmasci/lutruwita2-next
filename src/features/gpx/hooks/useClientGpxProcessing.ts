import { useState } from 'react';
import { useMapContext } from '../../map/context/MapContext';
import mapboxgl from 'mapbox-gl';
import { parseGpx, GpxParseResult } from '../utils/gpxParser';
import { matchTrackToRoads } from '../services/mapMatchingService';
import { detectUnpavedSections, UnpavedSection } from '../services/surfaceService';
import { ProcessedRoute, GPXProcessingError } from '../types/gpx.types';
import { v4 as uuidv4 } from 'uuid';
import type { FeatureCollection, Feature, LineString } from 'geojson';

export const useClientGpxProcessing = () => {
  console.log('[useClientGpxProcessing] Hook initializing');
  const { map, isMapReady } = useMapContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GPXProcessingError | null>(null);

  const processGpx = async (file: File): Promise<ProcessedRoute | null> => {
    console.log('[useClientGpxProcessing] Starting GPX processing', { fileName: file.name });
    setIsLoading(true);
    setError(null);

    try {
      console.log('[useClientGpxProcessing] Parsing GPX file');
      const parsed = await parseGpx(file);
      const rawGpx = await file.text();
      
      if (!parsed.geometry.coordinates.length) {
        throw new Error('No valid track points found in GPX file');
      }

      console.log('[useClientGpxProcessing] Matching track to roads');
      const matched = await matchTrackToRoads(parsed.geometry.coordinates, {
        confidenceThreshold: 0.6,
        radiusMultiplier: 3,
        maxGapDistance: 0.0002,
        interpolationPoints: 5
      });

      console.log('[useClientGpxProcessing] Checking map initialization', { isMapReady });
      if (!map || !isMapReady) {
        throw new Error('Map is not ready for processing. Please wait for map initialization to complete.');
      }
      const unpavedSections = await detectUnpavedSections(matched, map as mapboxgl.Map);

      console.log('[useClientGpxProcessing] Creating GeoJSON');
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

      console.log('[useClientGpxProcessing] Processing complete', { routeId: processedRoute.id });
      return processedRoute;
    } catch (err) {
      const gpxError: GPXProcessingError = {
        code: err instanceof Error && err.message.includes('Map is not ready') ? 'MAP_NOT_READY' : 'PARSING_ERROR',
        message: err instanceof Error ? err.message : 'Failed to process GPX file',
        details: err instanceof Error ? err.stack : undefined
      };
      setError(gpxError);
      console.error('[useClientGpxProcessing] Processing error:', gpxError);
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
