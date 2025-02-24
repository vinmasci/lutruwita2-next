import { useState } from 'react';
import { ProcessedRoute, normalizeRoute } from '../types/route.types';
import { parseGpx } from '@/utils/gpx/parsing';
import { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

export const useGpxProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processGpxFile = async (file: File): Promise<ProcessedRoute | null> => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      const parsed = parseGpx(text);
      
      const feature: Feature<Geometry, GeoJsonProperties> = {
        type: "Feature",
        geometry: parsed.geometry,
        properties: parsed.properties
      };

      const geojson: FeatureCollection<Geometry, GeoJsonProperties> = {
        type: "FeatureCollection",
        features: [feature]
      };

      const route = normalizeRoute({
        id: crypto.randomUUID(),
        name: file.name.replace('.gpx', ''),
        color: '#3b82f6',
        isVisible: true,
        gpxData: text,
        rawGpx: text,
        geojson,
        status: {
          processingState: 'completed',
          progress: 100
        },
        statistics: {
          totalDistance: 0,
          elevationGain: 0,
          elevationLoss: 0,
          maxElevation: 0,
          minElevation: 0,
          averageSpeed: 0,
          movingTime: 0,
          totalTime: 0
        }
      });

      return route;
    } catch (error) {
      console.error('Error processing GPX:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processGpxFile,
    isProcessing
  };
};
