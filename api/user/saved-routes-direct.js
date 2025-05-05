import { createApiHandler } from '../lib/middleware.js';
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db.js';
import { 
  getUserSavedRoutes, 
  saveUserSavedRoutesDirectly, 
  addRouteToUserSavedRoutes, 
  removeRouteFromUserSavedRoutes 
} from '../lib/cloudinary.js';

// Handler for getting saved routes
async function handleGetSavedRoutes(req, res) {
  try {
    // Get user ID from auth middleware
    const userId = req.user.sub;
    
    console.log(`[API][DEBUG] handleGetSavedRoutes - User ID from auth: ${userId}`);
    console.log(`[API][DEBUG] handleGetSavedRoutes - Request headers:`, JSON.stringify(req.headers));
    
    if (!userId) {
      console.log(`[API][ERROR] handleGetSavedRoutes - No user ID found in auth`);
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log(`[API] Getting saved routes for user: ${userId}`);
    
    // Get saved routes from Cloudinary directly
    console.log(`[API][DEBUG] handleGetSavedRoutes - Calling getUserSavedRoutes`);
    const savedRoutesData = await getUserSavedRoutes(userId);
    console.log(`[API][DEBUG] handleGetSavedRoutes - getUserSavedRoutes returned:`, JSON.stringify(savedRoutesData));
    
    const savedRouteIds = savedRoutesData.savedRoutes || [];
    
    console.log(`[API] Found ${savedRouteIds.length} saved routes for user: ${userId}`);
    console.log(`[API][DEBUG] handleGetSavedRoutes - Saved route IDs:`, JSON.stringify(savedRouteIds));
    
    // If no saved routes, return empty array immediately
    if (savedRouteIds.length === 0) {
      console.log(`[API][DEBUG] handleGetSavedRoutes - No saved routes found, returning empty array`);
      return res.status(200).json({ routes: [] });
    }
    
    // Get route details for each saved route
    console.log(`[API][DEBUG] handleGetSavedRoutes - Querying MongoDB for route details`);
    const Route = mongoose.model('Route');
    
    // IMPORTANT: Add a check to ensure we're not querying with an empty array
    // MongoDB will return ALL documents if you query with an empty $in array
    if (savedRouteIds.length === 0) {
      console.log(`[API][DEBUG] handleGetSavedRoutes - No saved route IDs, returning empty array`);
      return res.status(200).json({ routes: [] });
    }
    
    // Log the MongoDB query we're about to execute
    console.log(`[API][DEBUG] handleGetSavedRoutes - MongoDB query: { persistentId: { $in: ${JSON.stringify(savedRouteIds)} } }`);
    
    // Add a limit to the query to prevent returning too many routes
    const routes = await Route.find({ persistentId: { $in: savedRouteIds } }).limit(savedRouteIds.length);
    
    console.log(`[API] Found ${routes.length} route details for user: ${userId}`);
    console.log(`[API][DEBUG] handleGetSavedRoutes - Route IDs found in MongoDB:`, routes.map(r => r.persistentId));
    
    // Check if we found all the routes
    if (routes.length !== savedRouteIds.length) {
      console.log(`[API][WARN] handleGetSavedRoutes - Not all saved routes were found in the database`);
      console.log(`[API][WARN] handleGetSavedRoutes - Missing routes:`, 
        savedRouteIds.filter(id => !routes.some(r => r.persistentId === id)));
    }
    
    return res.status(200).json({ routes });
  } catch (error) {
    console.error(`[API][ERROR] Get saved routes error:`, error);
    console.error(`[API][ERROR] Error stack:`, error.stack);
    return res.status(500).json({ 
      error: 'Failed to get saved routes',
      details: error.message
    });
  }
}

// Handler for saving a route
async function handleSaveRoute(req, res) {
  try {
    // Get user ID from auth middleware
    const userId = req.user.sub;
    
    console.log(`[API][DEBUG] handleSaveRoute - User ID from auth: ${userId}`);
    console.log(`[API][DEBUG] handleSaveRoute - Request body:`, JSON.stringify(req.body));
    console.log(`[API][DEBUG] handleSaveRoute - Request headers:`, JSON.stringify(req.headers));
    
    if (!userId) {
      console.log(`[API][ERROR] handleSaveRoute - No user ID found in auth`);
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get route ID from request body
    const { routeId } = req.body;
    
    if (!routeId) {
      console.log(`[API][ERROR] handleSaveRoute - No routeId in request body`);
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    console.log(`[API] Saving route ${routeId} for user: ${userId}`);
    
    // Add route to user's saved routes in Cloudinary directly
    console.log(`[API][DEBUG] handleSaveRoute - Calling addRouteToUserSavedRoutes`);
    const updatedSavedRoutes = await addRouteToUserSavedRoutes(userId, routeId);
    
    console.log(`[API][DEBUG] handleSaveRoute - addRouteToUserSavedRoutes returned:`, JSON.stringify(updatedSavedRoutes));
    console.log(`[API] Route ${routeId} saved for user: ${userId}`);
    
    return res.status(200).json({ 
      success: true,
      message: 'Route saved successfully',
      savedRoutes: updatedSavedRoutes.savedRoutes
    });
  } catch (error) {
    console.error(`[API][ERROR] Save route error:`, error);
    console.error(`[API][ERROR] Error stack:`, error.stack);
    return res.status(500).json({ 
      error: 'Failed to save route',
      details: error.message
    });
  }
}

// Handler for removing a saved route
async function handleRemoveRoute(req, res) {
  try {
    // Get user ID from auth middleware
    const userId = req.user.sub;
    
    console.log(`[API][DEBUG] handleRemoveRoute - User ID from auth: ${userId}`);
    console.log(`[API][DEBUG] handleRemoveRoute - Request URL: ${req.url}`);
    console.log(`[API][DEBUG] handleRemoveRoute - Request headers:`, JSON.stringify(req.headers));
    console.log(`[API][DEBUG] handleRemoveRoute - Request query:`, JSON.stringify(req.query));
    
    if (!userId) {
      console.log(`[API][ERROR] handleRemoveRoute - No user ID found in auth`);
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get route ID from URL parameter or path
    let routeId;
    
    // Check if routeId is in the URL path (e.g., /api/user/saved-routes-direct/route123)
    if (req.url.includes('/saved-routes-direct/')) {
      // Extract the route ID from the URL path
      const urlParts = req.url.split('/');
      routeId = urlParts[urlParts.length - 1].split('?')[0];
      console.log(`[API] Extracted routeId from URL path: ${routeId}`);
    } 
    // Otherwise check query parameters
    else {
      routeId = req.query.routeId;
      console.log(`[API] Using routeId from query parameter: ${routeId}`);
    }
    
    if (!routeId) {
      console.log(`[API][ERROR] handleRemoveRoute - No routeId found in URL or query parameters`);
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    console.log(`[API] Removing route ${routeId} for user: ${userId}`);
    
    // Remove route from user's saved routes in Cloudinary directly
    console.log(`[API][DEBUG] handleRemoveRoute - Calling removeRouteFromUserSavedRoutes`);
    const updatedSavedRoutes = await removeRouteFromUserSavedRoutes(userId, routeId);
    
    console.log(`[API][DEBUG] handleRemoveRoute - removeRouteFromUserSavedRoutes returned:`, JSON.stringify(updatedSavedRoutes));
    console.log(`[API] Route ${routeId} removed for user: ${userId}`);
    
    return res.status(200).json({ 
      success: true,
      message: 'Route removed successfully',
      savedRoutes: updatedSavedRoutes.savedRoutes
    });
  } catch (error) {
    console.error(`[API][ERROR] Remove route error:`, error);
    console.error(`[API][ERROR] Error stack:`, error.stack);
    return res.status(500).json({ 
      error: 'Failed to remove route',
      details: error.message
    });
  }
}

// Route handler
const handler = async (req, res) => {
  // Ensure database connection (still needed for fetching route details)
  await connectToDatabase();
  
  console.log(`[API] Saved Routes Direct - Request: ${req.method} ${req.url}`);
  console.log(`[API] Saved Routes Direct - Headers:`, JSON.stringify(req.headers));
  console.log(`[API] Saved Routes Direct - Body:`, JSON.stringify(req.body));
  
  // Parse the URL to extract path parameters
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathParts = url.pathname.split('/').filter(part => part.length > 0);
  
  console.log(`[API] Saved Routes Direct - Path parts:`, pathParts);
  
  // Extract routeId from path if present (for DELETE requests)
  if (req.method === 'DELETE' && pathParts.length > 0) {
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart !== 'saved-routes-direct') {
      // Add the routeId to the query params
      req.query.routeId = lastPart;
      console.log(`[API] Saved Routes Direct - Extracted routeId from path: ${lastPart}`);
    }
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return handleGetSavedRoutes(req, res);
    
    case 'POST':
      console.log(`[API] Saved Routes Direct - Handling POST request with body:`, JSON.stringify(req.body));
      return handleSaveRoute(req, res);
    
    case 'DELETE':
      return handleRemoveRoute(req, res);
    
    case 'OPTIONS':
      // Handle preflight requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(200).end();
    
    default:
      console.log(`[API] Saved Routes Direct - Method not allowed: ${req.method}`);
      return res.status(405).json({ error: 'Method not allowed' });
  }
};

// Export the handler with middleware - require authentication
export default createApiHandler(handler, { requireDb: true, requireAuth: true });
