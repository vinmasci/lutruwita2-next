import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import { GPXService } from '../services/gpx.service';
import { createUploadProgressTracker } from '../services/progress.service';

export class GPXController {
  private gpxService: GPXService;

  constructor() {
    this.gpxService = new GPXService();
  }

  uploadGPX = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ 
          error: 'Upload Error',
          message: 'No file uploaded',
          details: 'Request must include a file with field name "gpxFile"'
        });
        return;
      }

      // Verify file exists on disk
      try {
        await fs.access(req.file.path);
      } catch (err) {
        res.status(500).json({ 
          error: 'Upload Error',
          message: 'File not saved correctly',
          details: 'The uploaded file was not saved to disk properly'
        });
        return;
      }

      // Process the file and get upload ID
      const uploadId = await this.gpxService.processGPXFile(req.file.path);
      
      if (!uploadId) {
        res.status(500).json({ 
          error: 'Processing Error',
          message: 'No upload ID generated',
          details: 'The server failed to generate an upload ID'
        });
        return;
      }

      res.json({ 
        uploadId,
        message: 'File uploaded successfully',
        filename: req.file.originalname
      });
    } catch (error) {
      console.error('GPX Upload Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      
      res.status(500).json({ 
        error: 'Processing Error',
        message: 'Failed to process GPX file',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      });
    }
  };

  getProgress = async (req: Request, res: Response): Promise<void> => {
    const { uploadId } = req.params;
    
    const progressTracker = this.gpxService.getProgressTracker(uploadId);
    if (!progressTracker) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const onProgress = (progress: any) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
      
      if (progress.status === 'complete' || progress.status === 'error') {
        progressTracker.removeListener('progress', onProgress);
        res.end();
      }
    };

    // Send initial progress
    const currentProgress = progressTracker.getProgress();
    res.write(`data: ${JSON.stringify(currentProgress)}\n\n`);

    // Listen for future updates
    progressTracker.on('progress', onProgress);

    // Handle client disconnect
    req.on('close', () => {
      progressTracker.removeListener('progress', onProgress);
    });
  };

  getStatus = async (req: Request, res: Response): Promise<void> => {
    const { uploadId } = req.params;
    const status = await this.gpxService.getUploadStatus(uploadId);
    res.json(status);
  };
}
