import { useState } from 'react';
import { useMapContext } from '../../map/context/MapContext';
import { parseGpx } from '../utils/gpxParser';
import { GPXProcessingError } from '../types/gpx.types';
import { normalizeRoute, ProcessedRoute } from '../../map/types/route.types';
import { v4 as uuidv4 } from 'uuid';
import type { FeatureCollection, Feature, LineString } from 'geojson';
import { addSurfaceOverlay } from '../services/surfaceService';

export const useClientGpxProcessing = () => {
  const { map } = useMapContext(); // Get map instance for surface detection
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GPXProcessingError | null>(null);

  const processGpx = async (file: File): Promise<ProcessedRoute | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const parsed = await parseGpx(file);
      const rawGpx = await file.text();
      
      if (!parsed.geometry.coordinates.length) {
        throw new Error('No valid track points found in GPX file');
      }
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
            coordinates: parsed.geometry.coordinates
          }
        }]
      };

      // Calculate basic statistics
      const elevations = parsed.properties.coordinateProperties?.elevation || [];
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

      const id = uuidv4();
      const route = normalizeRoute({
        id,
        routeId: `route-${id}`,
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
      });

      // Add surface detection here
      if (map && route.geojson.features[0]) {
        const feature = route.geojson.features[0] as Feature<LineString>;
        try {
          const featureWithRouteId = {
            ...feature,
            properties: {
              ...feature.properties,
              routeId: route.routeId || route.id
            }
          };
          // Detect and save unpaved sections
          const sections = await addSurfaceOverlay(map, featureWithRouteId);
          route.unpavedSections = sections.map(section => ({
            startIndex: section.startIndex,
            endIndex: section.endIndex,
            coordinates: section.coordinates,
            surfaceType: section.surfaceType === 'unpaved' ? 'unpaved' :
                        section.surfaceType === 'gravel' ? 'gravel' : 'trail'
          }));
        } catch (error) {
          console.error('Surface detection error:', error);
        }
      }

      return route;
    } catch (err) {
      const gpxError: GPXProcessingError = {
        code: err instanceof Error && err.message.includes('Map is not ready') ? 'MAP_NOT_READY' : 'PARSING_ERROR',
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
