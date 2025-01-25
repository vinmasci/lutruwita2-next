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

    return new Promise<ProcessedRoute>((resolve, reject) => {
      const eventSource = new EventSource(API_ENDPOINT);
      let finalResult: ProcessedRoute | null = null;

      eventSource.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        if (onProgress) {
          onProgress(data.progress);
        }
      });

      eventSource.addEventListener('complete', (event) => {
        const processedData: ProcessedRoute & {
          mapboxMatch: MapboxMatchResult;
          surface: SurfaceAnalysis;
        } = JSON.parse(event.data);
        
        finalResult = {
          ...processedData,
          geojson: processedData.mapboxMatch.geojson
        };
      });

      eventSource.addEventListener('error', (event) => {
        eventSource.close();
        if (!finalResult) {
          reject(new Error('GPX processing failed'));
        }
      });

      eventSource.addEventListener('open', async () => {
        // Once connection is established, send the file
        const uploadResponse = await fetch(API_ENDPOINT, {
          method: 'POST',
          body: formData,
          headers: {
            'Debug-Mode': 'true'
          }
        });

        if (!uploadResponse.ok) {
          eventSource.close();
          const error = await uploadResponse.json();
          reject(new Error(error.message || 'GPX processing failed'));
        }
      });

      // Cleanup when complete
      eventSource.addEventListener('complete', () => {
        eventSource.close();
        if (finalResult) {
          resolve(finalResult);
        } else {
          reject(new Error('No result received from server'));
        }
      });
    });
  };

  return { processGpxFile };
};
