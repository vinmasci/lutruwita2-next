import { ProcessedRoute } from '../../../types';
import type { MapboxMatchResult, SurfaceAnalysis } from '../types/gpx.types';

type ProcessingProgressCallback = (progress: number) => void;

export const useGpxProcessingApi = () => {
  const API_ENDPOINT = '/api/gpx/process';

  const processGpxFile = async (
    file: File,
    onProgress?: ProcessingProgressCallback
  ): Promise<ProcessedRoute> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Starting GPX file upload...');
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: {
          'Debug-Mode': 'true'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.message || 'GPX processing failed');
      }

      console.log('File upload successful, waiting for processing...');
      
      const result = await response.json();
      
      if (!result) {
        throw new Error('No result received from server');
      }

      console.log('Processing completed successfully');
      
      return {
        ...result,
        geojson: result.mapboxMatch?.geojson,
        id: crypto.randomUUID(),
        name: file.name.replace('.gpx', ''),
        color: '#3b82f6',
        isVisible: true
      };
    } catch (error) {
      console.error('GPX processing error:', error);
      throw error;
    }
  };

  return { processGpxFile };
};
