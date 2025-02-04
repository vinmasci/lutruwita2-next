import { Request, Response } from 'express';
import { GPXProcessingService } from '../services/gpx/gpx.processing';
import crypto from 'crypto';
import { logger } from '../shared/config/logger.config';

interface ProcessingJob {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
}

export class GPXController {
  private gpxService: GPXProcessingService;
  private processingJobs: Map<string, ProcessingJob> = new Map();
  private surfaceCache: Map<string, { type: 'road' | 'trail' | 'water' | 'unknown'; percentage: number; distance: number }> = new Map();

  constructor() {
    this.gpxService = new GPXProcessingService(process.env.MAPBOX_TOKEN || '');
  }

  async getSurfaceType(req: Request, res: Response): Promise<void> {
    const { lng, lat } = req.query;

    if (!lng || !lat) {
      res.status(400).json({ error: 'Missing longitude or latitude' });
      return;
    }

    try {
      const longitude = parseFloat(lng as string);
      const latitude = parseFloat(lat as string);

      // Check cache first
      const cacheKey = `${longitude},${latitude}`;
      if (this.surfaceCache.has(cacheKey)) {
        res.json({ surface: this.surfaceCache.get(cacheKey) });
        return;
      }

      // Use analyzeSurfaces to get surface type
      const result = await this.gpxService.analyzeSurfaces({
        geojson: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [[longitude, latitude]]
            }
          }]
        }
      });

      const surfaceType = result.surfaceTypes[0] || { type: 'unknown', percentage: 100, distance: 0 };
      this.surfaceCache.set(cacheKey, surfaceType);

      res.json({ surface: surfaceType.type });
    } catch (error) {
      logger.error('Surface detection error:', error);
      res.status(500).json({ 
        error: 'Surface detection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async batchGetSurfaceTypes(req: Request, res: Response): Promise<void> {
    const { coordinates } = req.body;

    if (!Array.isArray(coordinates)) {
      res.status(400).json({ error: 'Invalid coordinates array' });
      return;
    }

    try {
      // Use analyzeSurfaces for the entire batch
      const result = await this.gpxService.analyzeSurfaces({
        geojson: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates
            }
          }]
        }
      });

      // Process results into sections
      interface Section {
        startIndex: number;
        endIndex: number;
        coordinates: [number, number][];
        surfaceType: string;
      }

      const sections: Section[] = [];
      let currentSection: Section | null = null;
      
      coordinates.forEach((coord, index) => {
        const surfaceType = result.surfaceTypes[0] || { type: 'unknown', percentage: 100, distance: 0 };
        const isUnpaved = ['unpaved', 'dirt', 'gravel', 'fine_gravel', 'path', 'track', 'service', 'unknown'].includes(surfaceType.type);
        
        if (isUnpaved) {
          if (!currentSection) {
            currentSection = {
              startIndex: index,
              endIndex: index,
              coordinates: [coord],
              surfaceType: surfaceType.type
            };
          } else {
            currentSection.endIndex = index;
            currentSection.coordinates.push(coord);
          }
        } else if (currentSection) {
          sections.push(currentSection);
          currentSection = null;
        }
      });

      if (currentSection) {
        sections.push(currentSection);
      }

      res.json(sections);
    } catch (error) {
      logger.error('Batch surface detection error:', error);
      res.status(500).json({ 
        error: 'Batch surface detection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async uploadGPX(req: Request, res: Response): Promise<void> {
    logger.debug('Starting GPX file upload process');
    
    // Log memory usage before processing
    const startMemory = process.memoryUsage();
    logger.debug(`Initial memory usage: 
      RSS: ${startMemory.rss / 1024 / 1024} MB
      Heap Used: ${startMemory.heapUsed / 1024 / 1024} MB
      Heap Total: ${startMemory.heapTotal / 1024 / 1024} MB`);
    
    if (!req.file) {
      logger.error('No file provided in upload request');
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    try {
      logger.debug(`Received file: ${req.file.originalname} (${req.file.size} bytes)`);
      logger.debug(`File mimetype: ${req.file.mimetype}`);
      logger.debug(`File encoding: ${req.file.encoding}`);
      logger.debug(`File buffer length: ${req.file.buffer.length} bytes`);
      
      // Log memory usage after receiving file
      const fileMemory = process.memoryUsage();
      logger.debug(`Memory usage after file received: 
        RSS: ${fileMemory.rss / 1024 / 1024} MB
        Heap Used: ${fileMemory.heapUsed / 1024 / 1024} MB
        Heap Total: ${fileMemory.heapTotal / 1024 / 1024} MB`);
      
      // Generate upload ID
      const uploadId = crypto.randomUUID();
      logger.debug(`Generated upload ID: ${uploadId}`);

      // Store initial job state
      this.processingJobs.set(uploadId, {
        status: 'pending',
        progress: 0
      });
      logger.debug(`Created processing job for upload ID: ${uploadId}`);
      
      // Log memory usage after creating job
      const jobMemory = process.memoryUsage();
      logger.debug(`Memory usage after job creation: 
        RSS: ${jobMemory.rss / 1024 / 1024} MB
        Heap Used: ${jobMemory.heapUsed / 1024 / 1024} MB
        Heap Total: ${jobMemory.heapTotal / 1024 / 1024} MB`);

      // Start processing in background
      logger.debug('Starting background processing');
      const startTime = Date.now();
      
      // Convert buffer to string with error handling
      try {
        const fileContent = req.file.buffer.toString('utf-8');
        logger.debug(`File content length: ${fileContent.length} characters`);
        logger.debug(`First 100 chars: ${fileContent.substring(0, 100)}`);
        
        // Log memory usage after string conversion
        const stringMemory = process.memoryUsage();
        logger.debug(`Memory usage after string conversion: 
          RSS: ${stringMemory.rss / 1024 / 1024} MB
          Heap Used: ${stringMemory.heapUsed / 1024 / 1024} MB
          Heap Total: ${stringMemory.heapTotal / 1024 / 1024} MB`);
          
        this.processInBackground(uploadId, fileContent);
      } catch (err) {
        logger.error('Failed to convert file buffer to string:', err);
        throw new Error('Failed to process file content');
      }
      
      const endTime = Date.now();
      logger.debug(`Background processing started in ${endTime - startTime}ms`);

      // Return upload ID immediately
      logger.debug(`Returning upload ID to client: ${uploadId}`);
      res.status(200).json({ uploadId });
      return;

    } catch (error) {
      logger.error('Upload error:', error);
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
    logger.debug(`Starting background processing for upload ID: ${uploadId}`);
    
    try {
      logger.debug('Calling GPX processing service');
      const result = await this.gpxService.processGPXFile(
        fileContent,
        {
          onProgress: (progress) => {
            logger.debug(`Processing progress for ${uploadId}: ${progress}`);
            const job = this.processingJobs.get(uploadId);
            if (job) {
              job.progress = progress;
              job.status = 'processing';
            }
          }
        }
      );

      // Store completion
      logger.debug(`Processing completed for upload ID: ${uploadId}`);
      this.processingJobs.set(uploadId, {
        status: 'completed',
        progress: 1,
        result
      });
      logger.debug('Processing job successfully stored');

    } catch (error) {
      logger.error('Processing error:', error);
      logger.error(`Error details: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
      
      this.processingJobs.set(uploadId, {
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      logger.error(`Error state stored for upload ID: ${uploadId}`);
    }
  }
}

export const gpxController = new GPXController();
