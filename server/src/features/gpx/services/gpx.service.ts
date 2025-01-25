import fs from 'fs/promises';
import { UploadStatus } from '../types/gpx.types';
import { GPXProcessingService } from '../../../services/gpx/gpx.processing';
import dotenv from 'dotenv';

dotenv.config();

export class GPXService {
  private uploadStatuses: Map<string, UploadStatus> = new Map();
  private gpxProcessor: GPXProcessingService;

  constructor() {
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN environment variable is required');
    }
    this.gpxProcessor = new GPXProcessingService(mapboxToken);
  }

  async processGPXFile(filePath: string): Promise<string> {
    try {
      // Generate a unique upload ID
      const uploadId = `upload_${Date.now()}`;
      
      // Verify file exists
      await fs.access(filePath);
      
      // Initialize status
      this.uploadStatuses.set(uploadId, {
        status: 'processing',
        progress: 0,
        message: 'Starting GPX processing'
      });

      // Read and process GPX file
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const result = await this.gpxProcessor.processGPXFile(fileContent, {
        onProgress: (progress) => {
          this.uploadStatuses.set(uploadId, {
            status: 'processing',
            progress,
            message: 'Processing GPX file'
          });
        }
      });

      // Update status to complete
      this.uploadStatuses.set(uploadId, {
        status: 'complete',
        progress: 100,
        message: 'GPX processing complete'
      });

      return uploadId;
    } catch (error) {
      console.error('Error processing GPX file:', error);
      throw new Error('Failed to process GPX file');
    }
  }

  async getUploadStatus(uploadId: string): Promise<UploadStatus> {
    const status = this.uploadStatuses.get(uploadId);
    if (!status) {
      return {
        status: 'error',
        progress: 0,
        message: 'Upload not found'
      };
    }
    return status;
  }
}
