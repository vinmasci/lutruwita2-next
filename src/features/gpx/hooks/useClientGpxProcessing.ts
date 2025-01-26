import { useState } from 'react';
import { parseAndMatchGpx } from '../utils/gpxParser';
import { ProcessedRoute } from '../types/gpx.types';
import { v4 as uuidv4 } from 'uuid';

export const useClientGpxProcessing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processGpx = async (file: File): Promise<ProcessedRoute | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const rawGpx = await file.text();
      
      // Always use map matching
      const parsedFeature = await parseAndMatchGpx(file);

      // Only use the matched track if available, otherwise use original
      const geometry = parsedFeature.matched || parsedFeature.geometry;
      
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: parsedFeature.properties,
          geometry
        }]
      };

      const processedRoute: ProcessedRoute = {
        id: uuidv4(),
        name: parsedFeature.properties?.name || file.name,
        color: '#FF0000', // Default red color
        isVisible: true,
        gpxData: rawGpx,
        rawGpx: rawGpx,
        geojson,
        statistics: {
          totalDistance: 0, // Would need more complex calculation
          elevationGain: 0,
          elevationLoss: 0,
          maxElevation: 0,
          minElevation: 0,
          averageSpeed: 0,
          movingTime: 0,
          totalTime: 0
        },
        status: {
          processingState: 'completed',
          progress: 100
        }
      };

      return processedRoute;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process GPX file';
      setError(message);
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
