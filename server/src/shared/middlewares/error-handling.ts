import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

interface MulterError extends Error {
  code: string;
  field?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log detailed error information
  console.error('Error Details:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    file: req.file
  });

  // Handle specific error types
  if (err.name === 'MulterError' && err instanceof Error) {
    const multerError = err as MulterError;
    res.status(400).json({
      error: 'File upload error',
      message: err.message,
      code: multerError.code,
      field: multerError.field
    });
    return;
  }

  if (err.message.includes('No file uploaded')) {
    res.status(400).json({
      error: 'File upload error',
      message: 'No file was provided in the request'
    });
    return;
  }

  if (err.message.includes('Invalid file type')) {
    res.status(400).json({
      error: 'File validation error',
      message: 'Only .gpx files are allowed'
    });
    return;
  }

  // Handle GPX processing specific errors
  if (err.message.includes('GPX processing failed')) {
    res.status(500).json({
      error: 'GPX Processing Error',
      message: err.message,
      details: err.stack
    });
    return;
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
