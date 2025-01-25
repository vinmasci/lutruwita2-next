import { Request, Response, NextFunction } from 'express';

interface User {
  id: string;
  role: string;
}

declare module 'express' {
  interface Request {
    user?: User;
  }
}
import jwt, { JwtPayload } from 'jsonwebtoken';

interface JwtUserPayload extends JwtPayload {
  id: string;
  role: string;
}
import { HttpError } from '../../../lib/errors.ts';

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new HttpError('Unauthorized', 401));
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtUserPayload;
    req.user = {
      id: decoded.id,
      role: decoded.role
    };
    next();
  } catch (err) {
    next(new HttpError('Invalid token', 401));
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError('Forbidden', 403));
    }
    next();
  };
};
