import { createApiHandler } from '../lib/middleware.js';
import { getUserData, updateUserData } from '../user/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Log environment variables (excluding sensitive ones)
console.log('[API][DEBUG] Environment variables available:', 
  Object.keys(process.env)
    .filter(key => !key.includes('SECRET') && !key.includes('KEY'))
    .join(', ')
);

// More detailed logging for MONGODB_URI
console.log('[API][DEBUG] MONGODB_URI available:', !!process.env.MONGODB_URI);
console.log('[API][DEBUG] MONGODB_URI length:', process.env.MONGODB_URI?.length || 0);
console.log('[API][DEBUG] MONGODB_URI type:', typeof process.env.MONGODB_URI);
console.log('[API][DEBUG] MONGODB_URI starts with:', process.env.MONGODB_URI?.substring(0, 10) + '...');

// Log other important environment variables
console.log('[API][DEBUG] NODE_ENV:', process.env.NODE_ENV);
console.log('[API][DEBUG] VERCEL_ENV:', process.env.VERCEL_ENV);
console.log('[API][DEBUG] VERCEL:', process.env.VERCEL);

/**
 * Handler for /api/user
 * Handles user data operations
 */
const handler = async (req, res) => {
  console.log(`[API][DEBUG] User API handler called with method: ${req.method}`);
  console.log(`[API][DEBUG] Request URL: ${req.url}`);
  console.log(`[API][DEBUG] Request headers:`, JSON.stringify(req.headers, null, 2));
  
  if (req.method === 'POST') {
    console.log(`[API][DEBUG] POST request body:`, JSON.stringify(req.body, null, 2));
  } else if (req.method === 'GET') {
    console.log(`[API][DEBUG] GET request query:`, JSON.stringify(req.query, null, 2));
  }
  
  try {
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        console.log('[API][DEBUG] Calling getUserData handler');
        // Get user data
        return getUserData(req, res);
      
      case 'POST':
        console.log('[API][DEBUG] Calling updateUserData handler');
        // Update user data
        return updateUserData(req, res);
      
      case 'OPTIONS':
        console.log('[API][DEBUG] Handling OPTIONS request');
        // Handle preflight requests
        return res.status(200).end();
      
      default:
        console.log(`[API][DEBUG] Method not allowed: ${req.method}`);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`[API][DEBUG] Error in user API handler:`, error);
    console.error(`[API][DEBUG] Error stack:`, error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Export the handler with middleware - make auth optional for now
console.log('[API][DEBUG] Creating API handler with requireDb=true, requireAuth=false');
export default createApiHandler(handler, { requireDb: true, requireAuth: false });
