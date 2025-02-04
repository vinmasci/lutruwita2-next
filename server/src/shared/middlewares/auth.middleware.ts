import { Response, NextFunction } from 'express';
import { auth as auth0 } from 'express-oauth2-jwt-bearer';
import { RequestWithAuth } from '../types/auth.types.js';

// Initialize Auth0 middleware
const auth0Middleware = auth0({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: 'RS256'
});

// Wrap Auth0 middleware to extract user info
export const auth = async (req: RequestWithAuth, res: Response, next: NextFunction) => {
  try {
    // Verify JWT token
    await auth0Middleware(req, res, () => {});

    // Extract user info from token
    if (req.auth?.payload.sub) {
      req.user = {
        sub: req.auth.payload.sub,
        email: req.auth.payload.email as string | undefined,
        name: req.auth.payload.name as string | undefined
      };
    } else {
      throw new Error('Missing required user ID in token');
    }

    next();
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      details: error instanceof Error ? error.message : 'Invalid token'
    });
  }
};
