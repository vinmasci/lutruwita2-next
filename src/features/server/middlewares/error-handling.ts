import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../../types/api.types.ts';

export const errorHandler = (
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`[Error] ${status} - ${message}`);
  
  res.status(status).json({
    status,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
};
