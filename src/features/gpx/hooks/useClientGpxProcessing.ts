import { useState } from 'react';
import { useMapContext } from '../../map/context/MapContext';
import mapboxgl from 'mapbox-gl';
import { parseGpx, GpxParseResult } from '../utils/gpxParser';
import { matchTrackToRoads } from '../services/mapMatchingService';
import { ProcessedRoute, GPXProcessingError } from '../types/gpx.types';
import { v4 as uuidv4 } from 'uuid';
import type { FeatureCollection, Feature, LineString } from 'geojson';

export const useClientGpxProcessing = () => {
  console.log('[useClientGpxProcessing] Hook initializing');
  const {} = useMapContext(); // Keep the hook for future use
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

      console.log('[useClientGpxProcessing] Creating GeoJSON', {
        parsedElevations: parsed.properties.coordinateProperties?.elevation?.length || 0,
        elevationSample: parsed.properties.coordinateProperties?.elevation?.slice(0, 5)
      });
      const geojson: FeatureCollection<LineString> = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {
            ...parsed.properties,
            coordinateProperties: {
              elevation: parsed.properties.coordinateProperties?.elevation || []
            }
          },
          geometry: {
            type: 'LineString',
            coordinates: matched
          }
        }]
      };

      // Calculate basic statistics
      const elevations = parsed.properties.coordinateProperties?.elevation || [];
      console.log('[useClientGpxProcessing] Processing elevation statistics:', {
        elevationCount: elevations.length,
        hasElevations: elevations.length > 0,
        minElevation: elevations.length ? Math.min(...elevations) : 'N/A',
        maxElevation: elevations.length ? Math.max(...elevations) : 'N/A'
      });
      // Calculate total distance from original coordinates since map matching might fail
      const totalDistance = parsed.geometry.coordinates.reduce((acc, coord, i) => {
        if (i === 0) return 0;
        const [lon1, lat1] = parsed.geometry.coordinates[i - 1];
        const [lon2, lat2] = coord;
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return acc + (R * c);
      }, 0);

      let elevationGain = 0;
      let elevationLoss = 0;
      let maxElevation = elevations.length ? Math.max(...elevations) : 0;
      let minElevation = elevations.length ? Math.min(...elevations) : 0;

      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1];
        if (diff > 0) elevationGain += diff;
        else elevationLoss += Math.abs(diff);
      }

      const statistics = {
        totalDistance,
        elevationGain,
        elevationLoss,
        maxElevation,
        minElevation,
        averageSpeed: 0, // TODO: Calculate if time data is available
        movingTime: 0,   // TODO: Calculate if time data is available
        totalTime: 0     // TODO: Calculate if time data is available
      };

      const processedRoute: ProcessedRoute = {
        id: uuidv4(),
        name: parsed.properties.name || file.name.replace(/\.gpx$/i, ''),
        color: '#ff4d4d', // Default red color
        isVisible: true,
        gpxData: JSON.stringify(parsed),
        rawGpx,
        geojson,
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
