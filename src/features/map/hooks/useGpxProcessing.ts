import { useState } from 'react';
import { ProcessedRoute, normalizeRoute } from '../types/route.types';
import { parseGpx } from '@/utils/gpx/parsing';

export const useGpxProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processGpxFile = async (file: File): Promise<ProcessedRoute | null> => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      const parsed = parseGpx(text);
      
      const route = normalizeRoute({
        id: crypto.randomUUID(),
        name: file.name.replace('.gpx', ''),
        color: '#3b82f6',
        isVisible: true,
        gpxData: text,
        segments: parsed.segments,
        geojson: parsed.geojson
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
