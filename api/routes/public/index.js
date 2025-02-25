import { createApiHandler } from '../../lib/middleware.js';
import mongoose from 'mongoose';
import { connectToDatabase } from '../../lib/db.js';
import { getCache, setCache } from '../../lib/redis.js';
import { CACHE_DURATIONS } from '../../lib/redis.js';

// Define Route schema (same as in the main routes API)
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

// Handler for getting a public route by its public ID
async function handleGetPublicRoute(req, res) {
  try {
    const { publicId } = req.query;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Missing publicId parameter' });
    }
    
    // Check cache first
    const cacheKey = `public-route:${publicId}`;
    const cachedRoute = await getCache(cacheKey);
    
    if (cachedRoute) {
      return res.status(200).json(cachedRoute);
    }
    
    // Get route from database
    const route = await Route.findOne({ publicId, isPublic: true });
    
    if (!route) {
      return res.status(404).json({ error: 'Public route not found' });
    }
    
    // Prepare the public route data (exclude sensitive information)
    const publicRouteData = {
      id: route._id,
      name: route.name,
      description: route.description,
      publicId: route.publicId,
      data: route.data,
      metadata: route.metadata,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt
    };
    
    // Cache the result
    await setCache(cacheKey, publicRouteData, CACHE_DURATIONS.publicRoutes);
    
    return res.status(200).json(publicRouteData);
  } catch (error) {
    console.error('Get public route error:', error);
    return res.status(500).json({ 
      error: 'Failed to get public route',
      details: error.message
    });
  }
}

// Handler for getting public routes
async function handleGetPublicRoutes(req, res) {
  try {
    const { limit = 10, skip = 0, tags } = req.query;
    
    // Build query
    const query = { isPublic: true };
    
    // Filter by tags if provided
    if (tags) {
      const tagList = tags.split(',');
      query['metadata.tags'] = { $in: tagList };
    }
    
    // Check cache first
    const cacheKey = `public-routes:${JSON.stringify(query)}:${limit}:${skip}`;
    const cachedRoutes = await getCache(cacheKey);
    
    if (cachedRoutes) {
      return res.status(200).json(cachedRoutes);
    }
    
    // Get routes from database
    const routes = await Route.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .select('name description publicId data.distance data.elevation metadata createdAt updatedAt');
    
    // Get total count
    const total = await Route.countDocuments(query);
    
    // Prepare the response
    const response = {
      routes,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    };
    
    // Cache the result
    await setCache(cacheKey, response, CACHE_DURATIONS.publicRoutes);
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Get public routes error:', error);
    return res.status(500).json({ 
      error: 'Failed to get public routes',
      details: error.message
    });
  }
}

// Handler for getting POIs associated with a public route
async function handleGetPublicRoutePOIs(req, res) {
  try {
    const { publicId } = req.query;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Missing publicId parameter' });
    }
    
    // Check cache first
    const cacheKey = `public-route-pois:${publicId}`;
    const cachedPOIs = await getCache(cacheKey);
    
    if (cachedPOIs) {
      return res.status(200).json(cachedPOIs);
    }
    
    // Get route from database
    const route = await Route.findOne({ publicId, isPublic: true });
    
    if (!route) {
      return res.status(404).json({ error: 'Public route not found' });
    }
    
    // Get POIs associated with the route
    const POI = mongoose.model('POI');
    const pois = await POI.find({ routeId: route._id })
      .select('name description icon location metadata persistentId createdAt updatedAt');
    
    // Cache the result
    await setCache(cacheKey, { pois }, CACHE_DURATIONS.publicRoutes);
    
    return res.status(200).json({ pois });
  } catch (error) {
    console.error('Get public route POIs error:', error);
    return res.status(500).json({ 
      error: 'Failed to get public route POIs',
      details: error.message
    });
  }
}

// Handler for getting photos associated with a public route
async function handleGetPublicRoutePhotos(req, res) {
  try {
    const { publicId } = req.query;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Missing publicId parameter' });
    }
    
    // Check cache first
    const cacheKey = `public-route-photos:${publicId}`;
    const cachedPhotos = await getCache(cacheKey);
    
    if (cachedPhotos) {
      return res.status(200).json(cachedPhotos);
    }
    
    // Get route from database
    const route = await Route.findOne({ publicId, isPublic: true });
    
    if (!route) {
      return res.status(404).json({ error: 'Public route not found' });
    }
    
    // Get POIs associated with the route to get their photos
    const POI = mongoose.model('POI');
    const pois = await POI.find({ routeId: route._id });
    
    // Extract photo IDs from POIs
    const photoIds = pois.reduce((ids, poi) => {
      if (poi.photos && poi.photos.length > 0) {
        return [...ids, ...poi.photos];
      }
      return ids;
    }, []);
    
    // Get photos
    const Photo = mongoose.model('Photo');
    const photos = await Photo.find({ _id: { $in: photoIds } })
      .select('filename url metadata.location createdAt');
    
    // Cache the result
    await setCache(cacheKey, { photos }, CACHE_DURATIONS.publicRoutes);
    
    return res.status(200).json({ photos });
  } catch (error) {
    console.error('Get public route photos error:', error);
    return res.status(500).json({ 
      error: 'Failed to get public route photos',
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
    case 'GET':
      // Check if it's a POIs request
      if (req.query.publicId && req.query.pois === 'true') {
        return handleGetPublicRoutePOIs(req, res);
      }
      
      // Check if it's a photos request
      if (req.query.publicId && req.query.photos === 'true') {
        return handleGetPublicRoutePhotos(req, res);
      }
      
      // Check if it's a single public route request
      if (req.query.publicId) {
        return handleGetPublicRoute(req, res);
      }
      
      // Otherwise, it's a public routes list request
      return handleGetPublicRoutes(req, res);
    
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
};

// Export the handler with middleware (no auth required for public routes)
export default createApiHandler(handler, { requireDb: true, requireAuth: false });
