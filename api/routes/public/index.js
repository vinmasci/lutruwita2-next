import { createApiHandler } from '../../lib/middleware.js';
import mongoose from 'mongoose';
import { connectToDatabase } from '../../lib/db.js';
import { getCache, setCache } from '../../lib/redis.js';
import { CACHE_DURATIONS } from '../../lib/redis.js';

// Define Route schema (same as in the main routes API)
const photoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  dateAdded: String,
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  rotation: Number,
  altitude: Number
});

// POI base schema - for points of interest along routes
const poiSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Use temporary IDs
  coordinates: {
    type: [Number],
    required: true,
    validate: [
      {
        validator: function(v) {
          return v.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]'
      }
    ]
  },
  name: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: [
      'road-information',
      'accommodation',
      'food-drink',
      'natural-features',
      'event-information',
      'town-services',
      'transportation'
    ],
    required: true
  },
  icon: { type: String, required: true },
  photos: [{
    url: { type: String, required: true },
    caption: String
  }],
  style: {
    color: String,
    size: Number
  }
});

// POI variants
const draggablePOISchema = poiSchema.clone();
draggablePOISchema.add({
  type: { type: String, enum: ['draggable'], required: true }
});

const placeNamePOISchema = poiSchema.clone();
placeNamePOISchema.add({
  type: { type: String, enum: ['place'], required: true },
  placeId: { type: String, required: true }
});

// Description schema for route descriptions
const descriptionSchema = new mongoose.Schema({
  description: { type: String, required: false },
  photos: { type: [photoSchema], required: false }
});

// Main route schema
const RouteSchema = new mongoose.Schema({
  persistentId: { 
    type: String, 
    required: true,
    unique: true,
    index: true 
  },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['tourism', 'event', 'bikepacking', 'single'],
    required: true
  },
  isPublic: { type: Boolean, required: true },
  userId: { type: String, required: true },
  viewCount: { type: Number, default: 0 },
  lastViewed: { type: Date },
  
  // Map view state
  mapState: {
    zoom: { type: Number, required: true },
    center: { 
      type: [Number],
      required: true
    },
    bearing: { type: Number, required: true },
    pitch: { type: Number, required: true },
    style: String
  },

  // Route data array - can contain multiple routes
  routes: [{
    order: { type: Number, required: true },
    routeId: String,
    name: { type: String, required: true },
    color: { type: String, required: true },
    isVisible: { type: Boolean, required: true },
    geojson: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: descriptionSchema, required: false },

    // Surface information - core part of route analysis
    surface: {
      surfaceTypes: [{
        type: { 
          type: String, 
          required: true 
        },
        percentage: { type: Number, required: true },
        distance: { type: Number, required: true }
      }],
      elevationProfile: [{
        elevation: { 
          type: Number,
          required: true
        },
        distance: { type: Number, required: true },
        grade: { type: Number, required: true }
      }],
      // Made explicitly optional
      totalDistance: { type: Number, required: false },
      roughness: { type: Number, required: false },
      difficultyRating: { type: Number, required: false },
      surfaceQuality: { type: Number, required: false }
    },

    // Unpaved section markers
    unpavedSections: [{
      startIndex: { type: Number, required: true },
      endIndex: { type: Number, required: true },
      coordinates: { 
        type: [[Number]],
        required: true
      },
      surfaceType: { 
        type: String, 
        required: true 
      }
    }],

    // Route statistics
    statistics: {
      totalDistance: { type: Number, required: true },
      elevationGain: { type: Number, required: true },
      elevationLoss: { type: Number, required: true },
      maxElevation: { type: Number, required: true },
      minElevation: { type: Number, required: true },
      averageSpeed: { type: Number, required: true },
      movingTime: { type: Number, required: true },
      totalTime: { type: Number, required: true }
    },

    // Processing status
    status: {
      processingState: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], required: true },
      progress: { type: Number, required: true },
      error: {
        code: String,
        message: String,
        details: String
      }
    },
  }],

  // Associated data (optional)
  photos: { type: [photoSchema], required: false },
  pois: {
    type: {
      draggable: { type: [draggablePOISchema], required: false },
      places: { type: [placeNamePOISchema], required: false }
    },
    required: false
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Only transform dates
      ret.createdAt = ret.createdAt.toISOString();
      ret.updatedAt = ret.updatedAt.toISOString();
      
      // Clean up MongoDB internal fields
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Indexes for efficient queries
RouteSchema.index({ userId: 1 });
RouteSchema.index({ type: 1 });
RouteSchema.index({ isPublic: 1 });
RouteSchema.index({ createdAt: -1 });
RouteSchema.index({ persistentId: 1 });

// Initialize the model
let Route;
try {
  // Try to get the model if it exists
  Route = mongoose.model('Route');
} catch (e) {
  // Create the model if it doesn't exist
  Route = mongoose.model('Route', RouteSchema);
}

// Handler for getting a public route by its persistent ID
async function handleGetPublicRoute(req, res) {
  try {
    const { publicId } = req.query;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Missing route ID parameter' });
    }
    
    console.log(`[API] Loading public route with persistentId: ${publicId}`);
    console.log(`[API] Request URL: ${req.url}`);
    console.log(`[API] Request headers:`, req.headers);
    
    // Check cache first
    let cachedRoute = null;
    const routeCacheKey = `public-route:${publicId}`;
    cachedRoute = await getCache(routeCacheKey);
    
    if (cachedRoute) {
      console.log(`[API] Found route in cache`);
      return res.status(200).json(cachedRoute);
    } else {
      console.log(`[API] No cached data found, fetching from database...`);
    }
    
    // Log all available collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`[API] Available collections:`, collections.map(c => c.name));
    
    // Get a count of routes in the database
    const routeCount = await Route.countDocuments();
    console.log(`[API] Total routes in database: ${routeCount}`);
    
    // Get a count of public routes
    const publicRouteCount = await Route.countDocuments({ isPublic: true });
    console.log(`[API] Total public routes in database: ${publicRouteCount}`);
    
    // List all persistentIds of public routes
    const publicRoutes = await Route.find({ isPublic: true }).select('persistentId name');
    console.log(`[API] Public routes:`, publicRoutes.map(r => ({ id: r.persistentId, name: r.name })));
    
    // Get route from database and update view count
    console.log(`[API] Finding and updating route with persistentId: ${publicId}`);
    const route = await Route.findOneAndUpdate(
      { persistentId: publicId, isPublic: true },
      { 
        $inc: { viewCount: 1 },
        $set: { lastViewed: new Date() }
      },
      { new: true }
    );
    
    if (!route) {
      console.error(`[API] Public route not found with ID: ${publicId}`);
      
      // Try to find the route without the isPublic filter to see if it exists but isn't public
      const privateRoute = await Route.findOne({ persistentId: publicId });
      if (privateRoute) {
        console.log(`[API] Found a private route with this ID. isPublic=${privateRoute.isPublic}`);
      } else {
        console.log(`[API] No route found with this ID at all`);
      }
      
      return res.status(404).json({ error: 'Public route not found' });
    }
    
    console.log(`[API] Found route: ${route.name} with ID: ${publicId}`);
    
    // Convert to JSON to apply the schema transformations
    const routeData = route.toJSON();
    
    // Return the route document directly
    const publicRouteData = routeData;
    
    console.log('[API] Returning route data:', {
      id: routeData.id,
      persistentId: routeData.persistentId,
      name: routeData.name,
      routeCount: routeData.routes?.length,
      hasMapState: !!routeData.mapState
    });
    
    // Cache the result - getCache/setCache functions already handle Redis errors internally
    const cacheResult = await setCache(routeCacheKey, publicRouteData, CACHE_DURATIONS.publicRoutes);
    if (cacheResult) {
      console.log(`[API] Successfully cached route data`);
    }
    
    return res.status(200).json(publicRouteData);
  } catch (error) {
    console.error('[API] Get public route error:', error);
    return res.status(500).json({ 
      error: 'Failed to get public route',
      details: error.message
    });
  }
}

// Handler for getting public routes
async function handleGetPublicRoutes(req, res) {
  try {
    const { type } = req.query;
    const filter = {};
    
    // If type filter is provided
    if (type) {
      filter.type = type;
    }
    
    console.log(`[API] Listing public routes with filter:`, filter);
    
    // Check cache first - getCache function already handles Redis errors internally
    const routesListCacheKey = `public-routes:${JSON.stringify(filter)}`;
    const cachedRoutes = await getCache(routesListCacheKey);
    
    if (cachedRoutes) {
      console.log(`[API] Found routes in cache`);
      return res.status(200).json(cachedRoutes);
    } else {
      console.log(`[API] No cached routes found, fetching from database...`);
    }
    
    // Get routes from database
    const routes = await Route.find({ isPublic: true, ...filter })
      .select('_id persistentId name type viewCount lastViewed createdAt updatedAt mapState routes pois photos')
      .sort({ viewCount: -1, createdAt: -1 });
    
    console.log(`[API] Found ${routes.length} public routes`);
    
    // Format the response to match the Express server
    const response = {
      routes: routes.map(route => {
        // Convert to JSON to apply the schema transformations
        const routeData = route.toJSON();
        return {
          id: routeData.id,
          persistentId: routeData.persistentId,
          name: routeData.name,
          type: routeData.type,
          isPublic: true,
          viewCount: routeData.viewCount || 0,
          lastViewed: routeData.lastViewed ? new Date(routeData.lastViewed).toISOString() : undefined,
          createdAt: routeData.createdAt,
          updatedAt: routeData.updatedAt,
          mapState: routeData.mapState || { center: [-42.8821, 147.3272], zoom: 8 }, // Default to Tasmania
          routes: routeData.routes || [],
          pois: routeData.pois || { draggable: [], places: [] },
          photos: routeData.photos || []
        };
      })
    };
    
    // Cache the result - setCache function already handles Redis errors internally
    const cacheResult = await setCache(routesListCacheKey, response, CACHE_DURATIONS.publicRoutes);
    if (cacheResult) {
      console.log(`[API] Successfully cached routes list`);
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('[API] Get public routes error:', error);
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
      return res.status(400).json({ error: 'Missing route ID parameter' });
    }
    
    // Check cache first - getCache function already handles Redis errors internally
    const poisCacheKey = `public-route-pois:${publicId}`;
    const cachedPOIs = await getCache(poisCacheKey);
    
    if (cachedPOIs) {
      console.log(`[API] Found POIs in cache`);
      return res.status(200).json(cachedPOIs);
    } else {
      console.log(`[API] No cached POIs found, fetching from database...`);
    }
    
    // Get route from database - try to find by persistentId first, then by publicId
    let route = await Route.findOne({ persistentId: publicId, isPublic: true });
    
    // If not found by persistentId, try publicId as fallback
    if (!route) {
      route = await Route.findOne({ publicId, isPublic: true });
    }
    
    if (!route) {
      console.error(`Route not found with ID: ${publicId}`);
      return res.status(404).json({ error: 'Public route not found' });
    }
    
    // Get POIs associated with the route
    const POI = mongoose.model('POI');
    const pois = await POI.find({ routeId: route._id })
      .select('name description icon location metadata persistentId createdAt updatedAt');
    
    // Cache the result - setCache function already handles Redis errors internally
    const poisCacheResult = await setCache(poisCacheKey, { pois }, CACHE_DURATIONS.publicRoutes);
    if (poisCacheResult) {
      console.log(`[API] Successfully cached POIs data`);
    }
    
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
      return res.status(400).json({ error: 'Missing route ID parameter' });
    }
    
    // Check cache first - getCache function already handles Redis errors internally
    const photosCacheKey = `public-route-photos:${publicId}`;
    const cachedPhotos = await getCache(photosCacheKey);
    
    if (cachedPhotos) {
      console.log(`[API] Found photos in cache`);
      return res.status(200).json(cachedPhotos);
    } else {
      console.log(`[API] No cached photos found, fetching from database...`);
    }
    
    // Get route from database - try to find by persistentId first, then by publicId
    let route = await Route.findOne({ persistentId: publicId, isPublic: true });
    
    // If not found by persistentId, try publicId as fallback
    if (!route) {
      route = await Route.findOne({ publicId, isPublic: true });
    }
    
    if (!route) {
      console.error(`Route not found with ID: ${publicId}`);
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
    
    // Cache the result - setCache function already handles Redis errors internally
    const photosCacheResult = await setCache(photosCacheKey, { photos }, CACHE_DURATIONS.publicRoutes);
    if (photosCacheResult) {
      console.log(`[API] Successfully cached photos data`);
    }
    
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
  try {
    // Set content type to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    // Ensure database connection
    await connectToDatabase();
    
    // Parse the URL to extract path parameters
    const url = new URL(req.url, 'http://localhost');
    
    // Improved path parsing - filter out empty strings and handle URL encoding
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);
    
    console.log(`API Request: ${req.method} ${url.pathname}`);
    console.log(`Path parts after filtering:`, pathParts);
    
    // Extract persistentId from path if present (e.g., /api/routes/public/[persistentId])
    let persistentId = null;
    
    // Check if this is a public route request with a persistentId
    if (pathParts.length > 0) {
      // Check if the last part of the path is the persistentId
      const lastPart = pathParts[pathParts.length - 1];
      
      // If the path includes 'public' and has a part after it, that's likely the persistentId
      if (pathParts.includes('public') && pathParts.indexOf('public') < pathParts.length - 1) {
        persistentId = decodeURIComponent(lastPart);
        console.log(`Detected persistentId from path: ${persistentId}`);
        
        // Add the persistentId to query params for existing handlers
        req.query.publicId = persistentId;
      }
    }
  
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        // Check if it's a POIs request
        if ((req.query.publicId || persistentId) && req.query.pois === 'true') {
          return handleGetPublicRoutePOIs(req, res);
        }
        
        // Check if it's a photos request
        if ((req.query.publicId || persistentId) && req.query.photos === 'true') {
          return handleGetPublicRoutePhotos(req, res);
        }
        
        // Check if it's a single public route request
        if (req.query.publicId || persistentId) {
          return handleGetPublicRoute(req, res);
        }
        
        // Otherwise, it's a public routes list request
        return handleGetPublicRoutes(req, res);
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Export the handler with middleware (no auth required for public routes)
export default createApiHandler(handler, { requireDb: true, requireAuth: false });
