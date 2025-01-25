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
      
      const eventSource = new EventSource(`/api/gpx/progress?file=${file.name}`);
      
      return new Promise<ProcessedRoute>((resolve, reject) => {
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.progress) {
            onProgress?.(data.progress);
            return;
          }

          if (data.error) {
            eventSource.close();
            reject(new Error(data.error));
            return;
          }

          eventSource.close();
          resolve({
            ...data,
            geojson: data.mapboxMatch?.geojson,
            id: crypto.randomUUID(),
            name: file.name.replace('.gpx', ''),
            color: '#3b82f6',
            isVisible: true
          });
        };

        eventSource.onerror = (error) => {
          eventSource.close();
          reject(new Error('Connection to server failed'));
        };

        // Send the file data
        fetch(API_ENDPOINT, {
          method: 'POST',
          body: formData,
          headers: {
            'Debug-Mode': 'true'
          }
        }).catch(error => {
          eventSource.close();
          reject(error);
        });
      });
    } catch (error) {
      console.error('GPX processing error:', error);
      throw error;
    }
  };

  return { processGpxFile };
};
