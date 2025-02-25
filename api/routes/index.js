import { createApiHandler } from '../lib/middleware';
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db';

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
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    // Get route
    const route = await Route.findById(id);
    
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
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    // Delete route
    const result = await Route.findByIdAndDelete(id);
    
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
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    // Get route
    const route = await Route.findById(id);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
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

// Export the handler with middleware
export default createApiHandler(handler, { requireDb: true, requireAuth: true });
