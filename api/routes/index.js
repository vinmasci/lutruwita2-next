import { createApiHandler } from '../lib/middleware.js';
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db.js';
import { deleteFile } from '../lib/cloudinary.js';

// Define Route schema to match the original structure
const RouteSchema = new mongoose.Schema({
  // Top-level fields
  persistentId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['tourism', 'event', 'bikepacking', 'single'], required: true },
  isPublic: { type: Boolean, default: false },
  userId: { type: String, required: true, index: true },
  viewCount: { type: Number, default: 0 },
  lastViewed: { type: Date },
  publicId: { type: String, index: true, sparse: true },
  
  // Map state
  mapState: {
    zoom: { type: Number, default: 0 },
    center: { type: [Number], default: [0, 0] },
    bearing: { type: Number, default: 0 },
    pitch: { type: Number, default: 0 },
    style: { type: String, default: 'default' }
  },
  
  // Routes array
  routes: [{
    order: { type: Number }, // Made optional by removing required: true
    routeId: { type: String },
    name: { type: String, required: true },
    color: { type: String, required: true, default: '#ee5253' },
    isVisible: { type: Boolean, required: true, default: true },
    geojson: { type: mongoose.Schema.Types.Mixed },
    description: {
      title: { type: String },
      description: { type: String }
    },
    surface: {
      surfaceTypes: [{ 
        type: { type: String },
        percentage: { type: Number },
        distance: { type: Number }
      }],
      elevationProfile: [{ 
        elevation: { type: Number },
        distance: { type: Number },
        grade: { type: Number }
      }]
    },
    unpavedSections: [{
      startIndex: { type: Number },
      endIndex: { type: Number },
      coordinates: { type: [[Number]] },
      surfaceType: { type: String }
    }],
    statistics: { type: mongoose.Schema.Types.Mixed },
    status: { type: mongoose.Schema.Types.Mixed }
  }],
  
  // Photos array
  photos: [{
    name: { type: String },
    url: { type: String },
    thumbnailUrl: { type: String },
    dateAdded: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    },
    rotation: { type: Number },
    altitude: { type: Number }
  }],
  
  // POIs object
  pois: {
    draggable: [{
      id: { type: String, required: true },
      coordinates: { type: [Number], required: true },
      name: { type: String, required: true },
      description: { type: String },
      category: { type: String, required: true },
      icon: { type: String, required: true },
      photos: [{ type: mongoose.Schema.Types.Mixed }],
      type: { type: String, enum: ['draggable'], required: true }
    }],
    places: [{
      id: { type: String, required: true },
      coordinates: { type: [Number], required: true },
      name: { type: String, required: true },
      category: { type: String, required: true },
      icon: { type: String, required: true },
      photos: [{ type: mongoose.Schema.Types.Mixed }],
      type: { type: String, enum: ['place'], required: true },
      placeId: { type: String, required: true }
    }]
  },
  
  // Data object
  data: {
    points: { type: [mongoose.Schema.Types.Mixed], default: [] },
    surfaces: { type: [mongoose.Schema.Types.Mixed], default: [] },
    geojson: mongoose.Schema.Types.Mixed,
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
    }
  },
  
  // Metadata object
  metadata: {
    tags: { type: [String], default: [] },
    difficulty: String,
    season: String,
    custom: mongoose.Schema.Types.Mixed
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  __v: { type: Number, default: 0 }
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
    if (!req.body || !req.body.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { name, description, isPublic, data, metadata, type, routes, pois, mapState, photos } = req.body;
    
    // Generate a public ID if the route is public
    const publicId = isPublic ? `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
    
    // Generate a persistent ID if not provided
    const persistentId = req.body.persistentId || `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    console.log(`[API] Creating new route with persistentId: ${persistentId}`);
    
    // Create a new route with the original schema structure
    const route = new Route({
      // Required top-level fields
      persistentId,
      name,
      type: type || 'bikepacking', // Default to bikepacking if not provided
      isPublic: !!isPublic,
      userId: req.body.userId || 'anonymous', // In a real app, get from auth
      viewCount: 0,
      publicId,
      
      // Optional fields with defaults
      description,
      lastViewed: new Date(),
      
      // Complex structures
      mapState: mapState || {
        zoom: 0,
        center: [0, 0],
        bearing: 0,
        pitch: 0,
        style: 'default'
      },
      
      routes: routes || [],
      photos: photos || [],
      
      pois: pois || {
        draggable: [],
        places: []
      },
      
      data: data || {
        points: [],
        surfaces: []
      },
      
      metadata: metadata || {
        tags: []
      },
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    });
    
    console.log(`[API] Route object created, saving to database...`);
    
    // Save to database
    await route.save();
    
    console.log(`[API] Route saved successfully with ID: ${route._id}`);
    
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
    
    console.log(`[API] Updating route: ${route.name} with ID: ${route.persistentId}`);
    
    // Update all fields that are provided in the request
    const { 
      name, description, isPublic, type, data, metadata, 
      mapState, routes: routeSegments, pois, photos, viewCount, lastViewed 
    } = req.body;
    
    // Update basic fields
    if (name) route.name = name;
    if (description !== undefined) route.description = description;
    if (type) route.type = type;
    if (viewCount !== undefined) route.viewCount = viewCount;
    
    // Update isPublic and generate publicId if needed
    if (isPublic !== undefined) {
      route.isPublic = isPublic;
      
      // Generate a public ID if the route is being made public
      if (isPublic && !route.publicId) {
        route.publicId = `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
    }
    
    // Update complex structures
    if (mapState) {
      route.mapState = {
        ...route.mapState,
        ...mapState
      };
    }
    
    if (routeSegments) {
      // If routes is an array, replace the entire array
      if (Array.isArray(routeSegments)) {
        route.routes = routeSegments;
      } else {
        // If it's an object with specific updates, apply them
        console.log(`[API] Received route segments update: ${JSON.stringify(routeSegments)}`);
      }
    }
    
    if (pois) {
      // Handle POIs object with draggable and places arrays
      if (pois.draggable) route.pois.draggable = pois.draggable;
      if (pois.places) route.pois.places = pois.places;
    }
    
    if (photos) {
      route.photos = photos;
    }
    
    // Update data and metadata
    if (data) {
      route.data = {
        ...route.data,
        ...data
      };
    }
    
    if (metadata) {
      route.metadata = {
        ...route.metadata,
        ...metadata
      };
    }
    
    // Update timestamps
    route.updatedAt = new Date();
    if (lastViewed) {
      route.lastViewed = lastViewed;
    } else {
      route.lastViewed = new Date();
    }
    
    console.log(`[API] Saving updated route to database...`);
    
    // Save to database
    await route.save();
    
    console.log(`[API] Route updated successfully`);
    
    return res.status(200).json(route);
  } catch (error) {
    console.error('Update route error:', error);
    return res.status(500).json({ 
      error: 'Failed to update route',
      details: error.message
    });
  }
}

/**
 * Extract Cloudinary public ID from a URL
 * @param {string} url The Cloudinary URL
 * @returns {string|undefined} The extracted public ID or undefined if not found
 */
function extractPublicIdFromUrl(url) {
  try {
    // Cloudinary URLs are typically in the format:
    // https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // The public ID is everything after /upload/vXXXXXXXXXX/
    const uploadIndex = pathParts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && uploadIndex + 2 < pathParts.length) {
      // Skip the version part (vXXXXXXXXXX)
      return pathParts.slice(uploadIndex + 2).join('/');
    }
    return undefined;
  } catch (error) {
    console.error('[API] Error extracting public ID from URL:', error);
    return undefined;
  }
}

// Handler for deleting a route
async function handleDeleteRoute(req, res) {
  try {
    const { id, findBy } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    let route = null;
    
    // Try to find by persistentId first (prioritize this method)
    // Unless findBy is explicitly set to 'objectId'
    if (findBy !== 'objectId') {
      console.log(`[API] Trying to find route by persistentId for deletion: ${id}`);
      route = await Route.findOne({ persistentId: id });
      
      if (route) {
        console.log(`[API] Found route by persistentId for deletion: ${route.name}`);
      }
    }
    
    // If not found by persistentId and the ID is a valid ObjectId,
    // try to find by MongoDB _id (only if findBy isn't explicitly set to 'persistentId')
    if (!route && findBy !== 'persistentId' && mongoose.Types.ObjectId.isValid(id)) {
      console.log(`[API] Trying to find route by MongoDB _id: ${id}`);
      route = await Route.findById(id);
    }
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Delete associated photos from Cloudinary
    if (route.photos && route.photos.length > 0) {
      console.log(`[API] Deleting ${route.photos.length} photos from Cloudinary`);
      
      for (const photo of route.photos) {
        try {
          // Extract publicId from URL or use stored publicId
          let publicId = photo.publicId;
          
          if (!publicId && photo.url) {
            publicId = extractPublicIdFromUrl(photo.url);
          }
          
          if (publicId) {
            await deleteFile(publicId);
            console.log(`[API] Deleted photo: ${publicId}`);
          } else {
            console.warn(`[API] Could not extract public ID from photo URL: ${photo.url}`);
          }
        } catch (photoError) {
          console.error(`[API] Error deleting photo: ${photoError.message}`);
          // Continue with other photos even if one fails
        }
      }
    }
    
    // Delete the route
    const result = await Route.findByIdAndDelete(route._id);
    
    if (!result) {
      return res.status(404).json({ error: 'Failed to delete route' });
    }
    
    return res.status(200).json({ message: 'Route and associated photos deleted successfully' });
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
