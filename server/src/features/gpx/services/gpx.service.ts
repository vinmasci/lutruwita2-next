import fs from 'fs/promises';
import { UploadStatus } from '../types/gpx.types';
import { GPXProcessingService } from '../../../services/gpx/gpx.processing';
import { createUploadProgressTracker } from './progress.service';
import dotenv from 'dotenv';

dotenv.config();

export class GPXService {
  private progressTrackers: Map<string, ReturnType<typeof createUploadProgressTracker>> = new Map();
  private gpxProcessor: GPXProcessingService;

  constructor() {
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN environment variable is required');
    }
    this.gpxProcessor = new GPXProcessingService(mapboxToken);
  }

  async processGPXFile(filePath: string): Promise<string> {
    // Generate a unique upload ID
    const uploadId = `upload_${Date.now()}`;
    
    try {
      
      // Create progress tracker for this upload
      const progressTracker = createUploadProgressTracker();
      this.progressTrackers.set(uploadId, progressTracker);
      
      // Verify file exists
      await fs.access(filePath);
      
      // Initialize progress
      progressTracker.updateProgress({
        status: 'processing',
        progress: 0,
        currentTask: 'Starting GPX processing'
      });

      // Read and process GPX file
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const result = await this.gpxProcessor.processGPXFile(fileContent, {
        onProgress: (progress) => {
          progressTracker.updateProgress({
            status: 'processing',
            progress,
            currentTask: 'Processing GPX file'
          });
        }
      });

      // Update progress to complete
      progressTracker.updateProgress({
        status: 'complete',
        progress: 100,
        currentTask: 'GPX processing complete',
        result
      });

      return uploadId;
    } catch (error) {
      console.error('Error processing GPX file:', error);
      const progressTracker = this.progressTrackers.get(uploadId);
      if (progressTracker) {
        progressTracker.updateProgress({
          status: 'error',
          progress: 0,
          currentTask: 'Processing failed',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
      throw error;
    }
  }

  getProgressTracker(uploadId: string) {
    return this.progressTrackers.get(uploadId);
  }

  async getUploadStatus(uploadId: string): Promise<UploadStatus> {
    const tracker = this.progressTrackers.get(uploadId);
    if (!tracker) {
      return {
        status: 'error',
        progress: 0,
        message: 'Upload not found'
      };
    }
    const progress = tracker.getProgress();
    return {
      status: progress.status,
      progress: progress.progress,
      message: progress.currentTask
    };
  }
}
