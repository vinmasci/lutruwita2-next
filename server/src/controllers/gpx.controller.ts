import { Request, Response } from 'express';
import { GPXProcessingService } from '../services/gpx/gpx.processing';
import crypto from 'crypto';

interface ProcessingJob {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
}

export class GPXController {
  private gpxService: GPXProcessingService;
  private processingJobs: Map<string, ProcessingJob> = new Map();

  constructor() {
    this.gpxService = new GPXProcessingService(process.env.MAPBOX_TOKEN || '');
  }

  async uploadGPX(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    try {
      // Generate upload ID
      const uploadId = crypto.randomUUID();

      // Store initial job state
      this.processingJobs.set(uploadId, {
        status: 'pending',
        progress: 0
      });

      // Start processing in background
      this.processInBackground(uploadId, req.file.buffer.toString('utf-8'));

      // Return upload ID immediately
      res.status(200).json({ uploadId });
      return;

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }

  async trackProgress(req: Request, res: Response): Promise<void> {
    const { uploadId } = req.params;
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Check if job exists
    const job = this.processingJobs.get(uploadId);
    if (!job) {
      res.write(`data: ${JSON.stringify({ error: 'Invalid upload ID' })}\n\n`);
      res.end();
      return;
    }

    // Send initial status
    res.write(`data: ${JSON.stringify({ progress: job.progress })}\n\n`);

    // Set up interval to check progress
    const intervalId = setInterval(() => {
      const currentJob = this.processingJobs.get(uploadId);
      if (!currentJob) {
        clearInterval(intervalId);
        res.end();
        return;
      }

      if (currentJob.status === 'completed') {
        res.write(`data: ${JSON.stringify(currentJob.result)}\n\n`);
        clearInterval(intervalId);
        res.end();
        return;
      }

      if (currentJob.status === 'error') {
        res.write(`data: ${JSON.stringify({ error: currentJob.error })}\n\n`);
        clearInterval(intervalId);
        res.end();
        return;
      }

      res.write(`data: ${JSON.stringify({ progress: currentJob.progress })}\n\n`);
    }, 1000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(intervalId);
    });
  }

  private async processInBackground(uploadId: string, fileContent: string) {
    try {
      const result = await this.gpxService.processGPXFile(
        fileContent,
        {
          onProgress: (progress) => {
            const job = this.processingJobs.get(uploadId);
            if (job) {
              job.progress = progress;
              job.status = 'processing';
            }
          }
        }
      );

      // Store completion
      this.processingJobs.set(uploadId, {
        status: 'completed',
        progress: 1,
        result
      });

    } catch (error) {
      console.error('Processing error:', error);
      this.processingJobs.set(uploadId, {
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const gpxController = new GPXController();
