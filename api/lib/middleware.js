import pkg from 'jsonwebtoken';
const { verify } = pkg;
import { parse } from 'url';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import { connectToDatabase } from './db.js';

// Auth0 configuration
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-for-development';

// Simplified JWT token verification
async function verifyToken(token) {
  try {
    // For development/testing, we'll use a simpler approach with HS256
    return new Promise((resolve, reject) => {
      verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        // We're not strictly checking audience and issuer in development
        // but you can uncomment these for production
        // audience: AUTH0_AUDIENCE,
        // issuer: `https://${AUTH0_DOMAIN}/`
      }, (err, decoded) => {
        if (err) {
          console.log('JWT verification error:', err.message);
          
          // For development, we'll create a mock user if verification fails
          if (process.env.NODE_ENV !== 'production') {
            console.log('Using mock user for development');
            resolve({
              sub: 'mock-user-id',
              email: 'mock-user@example.com',
              name: 'Mock User',
              // Add any other user properties you need
            });
            return;
          }
          
          reject(err);
        } else {
          resolve(decoded);
        }
      });
    });
  } catch (error) {
    console.error('Token verification error:', error);
    
    // For development, return a mock user
    if (process.env.NODE_ENV !== 'production') {
      console.log('Using mock user for development due to error');
      return {
        sub: 'mock-user-id',
        email: 'mock-user@example.com',
        name: 'Mock User',
        // Add any other user properties you need
      };
    }
    
    throw error;
  }
}

// Authentication middleware
async function authenticate(req, res) {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false };
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = await verifyToken(token);
    
    // Add user info to request
    req.user = decoded;
    
    return { authenticated: true, user: decoded };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authenticated: false, error };
  }
}

// Error handling middleware
function handleError(error, req, res) {
  console.error('API error:', error);
  
  // Determine status code
  let statusCode = 500;
  let message = 'Internal server error';
  
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = error.message || 'Not found';
  }
  
  // Send error response
  res.status(statusCode).json({
    error: message,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
}

// Parse request body
function parseBody(req) {
  if (req.body) {
    return;
  }
  
  // Parse JSON body
  if (req.headers['content-type']?.includes('application/json')) {
    try {
      req.body = JSON.parse(req.body);
    } catch (error) {
      console.error('JSON parse error:', error);
      req.body = {};
    }
  }
  
  // Parse URL-encoded body
  if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
    try {
      const params = new URLSearchParams(req.body);
      req.body = Object.fromEntries(params);
    } catch (error) {
      console.error('URL-encoded parse error:', error);
      req.body = {};
    }
  }
}

// Parse query parameters
function parseQuery(req) {
  if (req.query) {
    return;
  }
  
  const parsedUrl = parse(req.url, true);
  req.query = parsedUrl.query;
}

// Create API handler with middleware
export function createApiHandler(handler, options = {}) {
  const { requireAuth = false, requireDb = false } = options;
  
  return async (req, res) => {
    try {
      // Enable CORS
      await new Promise((resolve) => {
        cors({
          origin: '*',
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization']
        })(req, res, resolve);
      });
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      
      // Parse request
      parseQuery(req);
      parseBody(req);
      
      // Handle file uploads
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        await new Promise((resolve) => {
          fileUpload({
            useTempFiles: false,
            limits: { fileSize: 50 * 1024 * 1024 } // 50MB
          })(req, res, resolve);
        });
      }
      
      // Connect to database if required
      if (requireDb) {
        await connectToDatabase();
      }
      
      // Authenticate if required
      if (requireAuth) {
        const authResult = await authenticate(req, res);
        
        if (!authResult.authenticated) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
      } else {
        // Still try to authenticate, but don't require it
        await authenticate(req, res);
      }
      
      // Call the handler
      await handler(req, res);
    } catch (error) {
      handleError(error, req, res);
    }
  };
}

// Create custom errors
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}
