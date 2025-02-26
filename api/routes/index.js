import { createApiHandler } from '../lib/middleware.js';
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db.js';

// Define Route schema
const RouteSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  isPublic: { type: Boolean, default: false },
  publicId: { type: String, index: true, sparse: true },
  data: {
    geojson: mongoose.Schema.Types.Mixed,
    points: [{ type: [Number] }],
    distance: Number,
    elevation: {
      gain: Number,
      loss: Number,
      min: Number,
      max: Number
    },
    bounds: {
      north: Number,
      south: Number,
      east: Number,
      west: Number
    },
    surfaces: [{
      type: String,
      percentage: Number,
      distance: Number
    }]
  },
  metadata: {
    tags: [String],
    difficulty: String,
    season: String,
    custom: mongoose.Schema.Types.Mixed
  },
  persistentId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Initialize the model
let Route;
try {
  // Try to get the model if it exists
  Route = mongoose.model('Route');
} catch (e) {
  // Create the model if it doesn't exist
  Route = mongoose.model('Route', RouteSchema);
}

// Handler for creating a route
async function handleCreateRoute(req, res) {
  try {
    // Check if required fields are provided
    if (!req.body || !req.body.name || !req.body.data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { name, description, isPublic, data, metadata } = req.body;
    
    // Generate a public ID if the route is public
    const publicId = isPublic ? `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
    
    // Create a new route
    const route = new Route({
      userId: req.body.userId || 'anonymous', // In a real app, get from auth
      name,
      description,
      isPublic: !!isPublic,
      publicId,
      data,
      metadata,
      persistentId: req.body.persistentId || `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    });
    
    // Save to database
    await route.save();
    
    return res.status(201).json(route);
  } catch (error) {
    console.error('Create route error:', error);
    return res.status(500).json({ 
      error: 'Failed to create route',
      details: error.message
    });
  }
}

// Handler for updating a route
async function handleUpdateRoute(req, res) {
  try {
    const { id, findBy } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    let route = null;
    
    // Try to find by persistentId first (prioritize this method)
    // Unless findBy is explicitly set to 'objectId'
    if (findBy !== 'objectId') {
      console.log(`[API] Trying to find route by persistentId for update: ${id}`);
      route = await Route.findOne({ persistentId: id });
      
      if (route) {
        console.log(`[API] Found route by persistentId for update: ${route.name}`);
      }
    }
    
    // If not found by persistentId and the ID is a valid ObjectId,
    // try to find by MongoDB _id (only if findBy isn't explicitly set to 'persistentId')
    if (!route && findBy !== 'persistentId' && mongoose.Types.ObjectId.isValid(id)) {
      console.log(`[API] Trying to find route by MongoDB _id for update: ${id}`);
      route = await Route.findById(id);
      
      if (route) {
        console.log(`[API] Found route by MongoDB _id for update: ${route._id}`);
      }
    }
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Update fields
    const { name, description, isPublic, data, metadata } = req.body;
    
    if (name) route.name = name;
    if (description !== undefined) route.description = description;
    if (isPublic !== undefined) {
      route.isPublic = isPublic;
      
      // Generate a public ID if the route is being made public
      if (isPublic && !route.publicId) {
        route.publicId = `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
    }
    if (data) route.data = { ...route.data, ...data };
    if (metadata) route.metadata = { ...route.metadata, ...metadata };
    
    route.updatedAt = new Date();
    
    // Save to database
    await route.save();
    
    return res.status(200).json(route);
  } catch (error) {
    console.error('Update route error:', error);
    return res.status(500).json({ 
      error: 'Failed to update route',
      details: error.message
    });
  }
}

// Handler for deleting a route
async function handleDeleteRoute(req, res) {
  try {
    const { id, findBy } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    let result = null;
    let route = null;
    
    // Try to find by persistentId first (prioritize this method)
    // Unless findBy is explicitly set to 'objectId'
    if (findBy !== 'objectId') {
      console.log(`[API] Trying to find route by persistentId for deletion: ${id}`);
      route = await Route.findOne({ persistentId: id });
      
      if (route) {
        console.log(`[API] Found route by persistentId for deletion: ${route.name}`);
        // Delete the route
        result = await Route.findByIdAndDelete(route._id);
      }
    }
    
    // If not found by persistentId and the ID is a valid ObjectId,
    // try to find and delete by MongoDB _id (only if findBy isn't explicitly set to 'persistentId')
    if (!result && findBy !== 'persistentId' && mongoose.Types.ObjectId.isValid(id)) {
      console.log(`[API] Trying to find and delete route by MongoDB _id: ${id}`);
      result = await Route.findByIdAndDelete(id);
    }
    
    if (!result) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    return res.status(200).json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Delete route error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete route',
      details: error.message
    });
  }
}

// Handler for getting routes
async function handleGetRoutes(req, res) {
  try {
    const { userId, limit = 50, skip = 0, isPublic, persistentId } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by user ID if provided
    if (userId) {
      query.userId = userId;
    }
    
    // Filter by public status if provided
    if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }
    
    // Filter by persistent ID if provided
    if (persistentId) {
      query.persistentId = persistentId;
    }
    
    // Get routes
    const routes = await Route.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    // Get total count
    const total = await Route.countDocuments(query);
    
    return res.status(200).json({
      routes,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Get routes error:', error);
    return res.status(500).json({ 
      error: 'Failed to get routes',
      details: error.message
    });
  }
}

// Handler for getting a single route
async function handleGetRoute(req, res) {
  try {
    const { id, findBy } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    console.log(`[API] Attempting to find route with ID: ${id}, findBy: ${findBy || 'auto'}`);
    
    // Log all available collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`[API] Available collections:`, collections.map(c => c.name));
    
    // Get a count of routes in the database
    const routeCount = await Route.countDocuments();
    console.log(`[API] Total routes in database: ${routeCount}`);
    
    // List all persistentIds of routes
    const allRoutes = await Route.find().select('persistentId name');
    console.log(`[API] All routes:`, allRoutes.map(r => ({ id: r.persistentId, name: r.name })));
    
    let route = null;
    
    // Try to find by persistentId first (prioritize this method)
    // Unless findBy is explicitly set to 'objectId'
    if (findBy !== 'objectId') {
      console.log(`[API] Trying to find route by persistentId: ${id}`);
      route = await Route.findOne({ persistentId: id });
      
      if (route) {
        console.log(`[API] Found route by persistentId: ${route.name}`);
      } else if (findBy !== 'persistentId') {
        // If not found by persistentId and findBy isn't explicitly set to 'persistentId',
        // try case-insensitive search
        console.log(`[API] Route not found by persistentId, trying case-insensitive search`);
        
        route = await Route.findOne({ 
          persistentId: { $regex: new RegExp('^' + id + '$', 'i') } 
        });
        
        if (route) {
          console.log(`[API] Found route by case-insensitive persistentId: ${route.name}`);
        }
      }
    }
    
    // If not found by persistentId and the ID is a valid ObjectId,
    // try to find by MongoDB _id (only if findBy isn't explicitly set to 'persistentId')
    if (!route && findBy !== 'persistentId' && mongoose.Types.ObjectId.isValid(id)) {
      console.log(`[API] Trying to find route by MongoDB _id: ${id}`);
      route = await Route.findById(id);
      
      if (route) {
        console.log(`[API] Found route by MongoDB _id: ${route._id}`);
      }
    }
    
    if (!route) {
      console.log(`[API] Route not found with ID: ${id}`);
      return res.status(404).json({ error: 'Route not found' });
    }
    
    console.log(`[API] Returning route: ${route.name} with ID: ${route.persistentId}`);
    return res.status(200).json(route);
  } catch (error) {
    console.error('Get route error:', error);
    return res.status(500).json({ 
      error: 'Failed to get route',
      details: error.message
    });
  }
}

// Route handler
const handler = async (req, res) => {
  // Ensure database connection
  await connectToDatabase();
  
  // Parse the URL to extract path parameters
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  
  // Improved path parsing - filter out empty strings and handle URL encoding
  const pathParts = url.pathname.split('/').filter(part => part.length > 0);
  
  console.log(`[API] Request: ${req.method} ${url.pathname}`);
  console.log(`[API] Path parts after filtering:`, pathParts);
  
  // Extract persistentId from path if present (e.g., /api/routes/[persistentId])
  let persistentId = null;
  
  // Check if this is a route request with a persistentId
  if (pathParts.length > 0) {
    // Check if the last part of the path is the persistentId
    const lastPart = pathParts[pathParts.length - 1];
    
    // If the last part is not 'routes', 'save', or contains a query string,
    // it's likely a persistentId
    if (lastPart && 
        !['routes', 'save', 'public'].includes(lastPart) && 
        lastPart.indexOf('?') === -1) {
      persistentId = decodeURIComponent(lastPart);
      console.log(`[API] Detected persistentId from path: ${persistentId}`);
      
      // Add the persistentId to query params for existing handlers
      req.query.id = persistentId;
    }
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'POST':
      // Handle route creation
      return handleCreateRoute(req, res);
    
    case 'PUT':
      // Handle route update
      return handleUpdateRoute(req, res);
    
    case 'DELETE':
      // Handle route deletion
      return handleDeleteRoute(req, res);
    
    case 'GET':
      // Check if it's a single route request
      if (req.query.id) {
        return handleGetRoute(req, res);
      }
      
      // Otherwise, it's a routes list request
      return handleGetRoutes(req, res);
    
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
};

// Export the handler with middleware - make auth optional for debugging
export default createApiHandler(handler, { requireDb: true, requireAuth: false });
