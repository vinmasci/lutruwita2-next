import { ProcessedRoute } from '../../../types';
import type { MapboxMatchResult, SurfaceAnalysis } from '../types/gpx.types';

type ProcessingProgressCallback = (progress: number) => void;

export const useGpxProcessingApi = () => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/gpx` : '/api/gpx';
  
  // Polling interval in milliseconds
  const POLLING_INTERVAL = 1000;

  const processGpxFile = async (
    file: File,
    onProgress?: ProcessingProgressCallback
  ): Promise<ProcessedRoute> => {
    const formData = new FormData();
    formData.append('gpxFile', file);

    try {
      return new Promise<ProcessedRoute>((resolve, reject) => {
        // Send the file data first to get jobId
        fetch(`${API_BASE}`, {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          if (!data.jobId) {
            throw new Error('No job ID received from server');
          }
          
          // Start polling for job status
          const pollJobStatus = () => {
            fetch(`${API_BASE}?jobId=${data.jobId}`, {
              method: 'GET'
            })
            .then(response => response.json())
            .then(statusData => {
              // Check for errors
              if (statusData.status === 'error') {
                  reject(new Error(statusData.error || 'Processing failed'));
                return;
              }
              
              // Update progress
              if (statusData.progress !== undefined) {
                onProgress?.(statusData.progress);
              }
              
              // Check if job is completed
              if (statusData.status === 'completed' && statusData.result) {
                  resolve({
                  ...statusData.result,
                  id: crypto.randomUUID(),
                  name: file.name.replace('.gpx', ''),
                  color: '#3b82f6',
                  isVisible: true
                });
                return;
              }
              
              // Continue polling if job is still in progress
              setTimeout(pollJobStatus, POLLING_INTERVAL);
            })
            .catch(error => {
              console.error('Error polling job status');
              reject(error);
            });
          };
          
          // Start the polling process
          pollJobStatus();
        })
        .catch(error => {
          console.error('Upload error');
          reject(error);
        });
      });
    } catch (error) {
      console.error('GPX processing error');
      throw error;
    }
  };

  return { processGpxFile };
};
