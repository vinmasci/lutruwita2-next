import { Router } from 'express';
import type { Request, Response, RequestHandler, NextFunction } from 'express';
import type { ParamsDictionary, Query } from 'express-serve-static-core';
import fileUpload from 'express-fileupload';
import type { UploadedFile } from 'express-fileupload';
import { useGpxProcessingApi } from '../services/gpxService.ts';
import type { File } from '../types/gpx.types';
import { HttpError } from '@/types/api.types';

const router = Router();
const { processGpxFile } = useGpxProcessingApi();

// Configure express-fileupload middleware with proper typing
const fileUploadMiddleware: RequestHandler = fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  abortOnLimit: true,
  responseOnLimit: 'File size limit exceeded',
  useTempFiles: true,
  tempFileDir: '/tmp/'
});

router.use(fileUploadMiddleware);

router.post<ParamsDictionary, any, any, Query>('/api/gpx/process', async (req: Request, res: Response, next: NextFunction) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  try {
    if (!req.files || !('file' in req.files)) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const uploadedFile = req.files.file as UploadedFile;
    const file: File = {
      name: uploadedFile.name,
      data: uploadedFile.data,
      type: uploadedFile.mimetype,
      size: uploadedFile.size,
      lastModified: Date.now(),
      webkitRelativePath: '',
      bytes: async () => new Uint8Array(uploadedFile.data),
      arrayBuffer: async () => uploadedFile.data.buffer,
      slice: (start?: number, end?: number, contentType?: string) => {
        const slicedData = uploadedFile.data.slice(start, end);
        return new Blob([slicedData], { type: contentType });
      },
      stream: () => new ReadableStream({
        start(controller) {
          controller.enqueue(uploadedFile.data);
          controller.close();
        }
      }),
      text: async () => uploadedFile.data.toString()
    };
    
    if (Array.isArray(file)) {
      res.status(400).json({ error: 'Multiple files not supported' });
      return;
    }

    const result = await processGpxFile(file, (progress) => {
      // Send progress updates to client
      res.write(`event: progress\ndata: ${JSON.stringify({ progress })}\n\n`);
    });

    // Send the final result as a completion event
    res.write(`event: complete\ndata: ${JSON.stringify(result)}\n\n`);
    res.end();
  } catch (error: unknown) {
    let status = 500;
    let message = 'Unknown error occurred';
    
    if (error instanceof Error) {
      message = error.message;
      if ('status' in error && typeof error.status === 'number') {
        status = error.status;
      }
    }
    
    const err = new HttpError(status, message);
    next(err);
  }
});

router.get<{ id: string }, any, any, Query>('/:id', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
