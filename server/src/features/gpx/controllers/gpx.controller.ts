import { Request, Response } from 'express';
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
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const uploadId = await this.gpxService.processGPXFile(req.file.path);
      res.json({ uploadId });
    } catch (error) {
      console.error('GPX Upload Error:', error);
      res.status(500).json({ error: 'Failed to process GPX file' });
    }
  };

  getProgress = async (req: Request, res: Response): Promise<void> => {
    const { uploadId } = req.params;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const progressTracker = createUploadProgressTracker();
    
    const onProgress = (progress: any) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
      
      if (progress.status === 'complete' || progress.status === 'error') {
        progressTracker.removeListener('progress', onProgress);
        res.end();
      }
    };

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
