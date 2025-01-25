import { Request, Response } from 'express';
import { GPXProcessingService } from '../services/gpx/gpx.processing';

export class GPXController {
  private gpxService: GPXProcessingService;

  constructor() {
    this.gpxService = new GPXProcessingService(process.env.MAPBOX_TOKEN || '');
  }

  async processGPX(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const fileContent = req.file.buffer.toString('utf-8');
      
      const sendProgress = (progress: number) => {
        res.write(`event: progress\ndata: ${JSON.stringify({ progress })}\n\n`);
      };

      const result = await this.gpxService.processGPXFile(fileContent, {
        onProgress: sendProgress
      });

      // Send complete event
      res.write(`event: complete\ndata: ${JSON.stringify(result)}\n\n`);
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
      res.end();
    }
  }
}

export const gpxController = new GPXController();