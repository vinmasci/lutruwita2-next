import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err.name === 'MulterError') {
    res.status(400).json({
      error: 'File upload error',
      message: err.message
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
};
