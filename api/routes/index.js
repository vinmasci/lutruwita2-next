import { createApiHandler } from '../lib/middleware.js';
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db.js';
import { deleteFile, uploadJsonData } from '../lib/cloudinary.js';

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
  embedUrl: { type: String }, // URL to the pre-processed embed data in Cloudinary
  
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
    
    // Generate and upload embed data to Cloudinary
    try {
      console.log(`[API] Generating embed data for route: ${route.name}`);
      
      // Create the embed data package
      const embedData = {
        id: route._id,
        persistentId: route.persistentId,
        name: route.name,
        routes: route.routes.map(r => ({
          routeId: r.routeId,
          name: r.name,
          color: r.color,
          geojson: r.geojson,
          surface: r.surface,
          unpavedSections: r.unpavedSections,
          description: r.description // Include the description field
        })),
        mapState: route.mapState,
        pois: route.pois || { draggable: [], places: [] },
        photos: route.photos || [],
        elevation: route.routes.map(r => r.surface?.elevationProfile || []),
        description: route.description, // Include the top-level description field
        _type: 'loaded',
        _loadedState: {
          name: route.name,
          pois: route.pois || { draggable: [], places: [] },
          photos: route.photos || []
        }
      };
      
      // Upload to Cloudinary
      const publicId = `embed-${route.persistentId}`;
      console.log(`[API] Uploading embed data to Cloudinary with public ID: ${publicId}`);
      
      const result = await uploadJsonData(embedData, publicId);
      
      // Update the route with the embed URL
      route.embedUrl = result.url;
      await route.save();
      
      console.log(`[API] Embed data uploaded successfully: ${result.url}`);
    } catch (embedError) {
      console.error(`[API] Error generating embed data:`, embedError);
      // Continue even if embed data generation fails
    }
    
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
    
    // Generate and upload embed data to Cloudinary
    try {
      console.log(`[API] Generating updated embed data for route: ${route.name}`);
      
      // Create the embed data package
      const embedData = {
        id: route._id,
        persistentId: route.persistentId,
        name: route.name,
        routes: route.routes.map(r => ({
          routeId: r.routeId,
          name: r.name,
          color: r.color,
          geojson: r.geojson,
          surface: r.surface,
          unpavedSections: r.unpavedSections,
          description: r.description // Include the description field
        })),
        mapState: route.mapState,
        pois: route.pois || { draggable: [], places: [] },
        photos: route.photos || [],
        elevation: route.routes.map(r => r.surface?.elevationProfile || []),
        description: route.description, // Include the top-level description field
        _type: 'loaded',
        _loadedState: {
          name: route.name,
          pois: route.pois || { draggable: [], places: [] },
          photos: route.photos || []
        }
      };
      
      // Upload to Cloudinary with the same public ID to replace the existing file
      const publicId = `embed-${route.persistentId}`;
      console.log(`[API] Uploading updated embed data to Cloudinary with public ID: ${publicId}`);
      
      // Add a timestamp to force a version update
      const options = {
        timestamp: Date.now()
      };
      
      const result = await uploadJsonData(embedData, publicId, options);
      
      // Update the route with the embed URL if it changed
      if (route.embedUrl !== result.url) {
        route.embedUrl = result.url;
        await route.save();
      }
      
      console.log(`[API] Updated embed data uploaded successfully: ${result.url}`);
    } catch (embedError) {
      console.error(`[API] Error generating updated embed data:`, embedError);
      // Continue even if embed data generation fails
    }
    
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
    
    // Delete the embed data from Cloudinary if it exists
    if (route.embedUrl) {
      try {
        const publicId = `embeds/embed-${route.persistentId}`;
        console.log(`[API] Deleting embed data from Cloudinary: ${publicId}`);
        await deleteFile(publicId);
        console.log(`[API] Deleted embed data: ${publicId}`);
      } catch (embedError) {
        console.error(`[API] Error deleting embed data: ${embedError.message}`);
        // Continue with route deletion even if embed data deletion fails
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

import { getCache, setCache, deleteCache, CACHE_DURATIONS } from '../lib/redis.js';
import { getRedisClient } from '../lib/redis.js';

// Initialize Redis client
global.redisClient = getRedisClient();

// In-memory storage for serverless environments where Redis might not be available
const memoryStorage = {
  sessions: {},
  chunks: {}
};

// Start a chunked upload session
async function handleStartChunkedUpload(req, res) {
  try {
    const { persistentId, totalChunks, totalSize, isUpdate } = req.body;
    
    // Generate a session ID
    const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Session info object
    const sessionInfo = {
      persistentId,
      totalChunks,
      totalSize,
      receivedChunks: 0,
      isUpdate,
      chunks: {},
      createdAt: Date.now()
    };
    
    console.log(`[API] Creating chunked upload session: ${sessionId}`);
    
    // Try to store in Redis first
    const redisSuccess = await setCache(`chunked:${sessionId}:info`, sessionInfo, 3600);
    
    // Check if Redis is available
    if (!redisSuccess) {
      console.log(`[API] Redis unavailable, using in-memory storage for session ${sessionId}`);
      
      // Initialize memory storage if needed
      if (!memoryStorage.sessions) {
        memoryStorage.sessions = {};
      }
      if (!memoryStorage.chunks) {
        memoryStorage.chunks = {};
      }
      
      // Store session info in memory
      memoryStorage.sessions[sessionId] = sessionInfo;
      console.log(`[API] Session stored in memory storage`);
    } else {
      console.log(`[API] Session stored in Redis`);
    }
    
    console.log(`[API] Chunked upload session created: ${sessionId} for ${isUpdate ? 'update' : 'new'} route`);
    
    return res.status(200).json({ sessionId });
  } catch (error) {
    console.error('Start chunked upload error:', error);
    return res.status(500).json({ 
      error: 'Failed to start chunked upload',
      details: error.message
    });
  }
}

// Handle a chunk upload
async function handleUploadChunk(req, res) {
  try {
    const { sessionId, chunkIndex, data } = req.body;
    
    console.log(`[API] Processing chunk ${chunkIndex} for session ${sessionId}`);
    
    // Try to get session info from Redis first
    let sessionInfo = await getCache(`chunked:${sessionId}:info`);
    let usingMemoryStorage = false;
    
    // If not in Redis, check in-memory storage
    if (!sessionInfo && memoryStorage.sessions[sessionId]) {
      console.log(`[API] Session ${sessionId} found in memory storage`);
      sessionInfo = memoryStorage.sessions[sessionId];
      usingMemoryStorage = true;
    }
    
    // If session not found in either storage
    if (!sessionInfo) {
      console.log(`[API] Session ${sessionId} not found in Redis or memory storage`);
      return res.status(404).json({ error: 'Upload session not found or expired' });
    }
    
    console.log(`[API] Session info retrieved, using ${usingMemoryStorage ? 'memory storage' : 'Redis'}`);
    
    // Store the chunk (try Redis first, then fallback to memory)
    if (!usingMemoryStorage) {
      // Try to store the chunk in Redis
      const redisSuccess = await setCache(`chunked:${sessionId}:chunk:${chunkIndex}`, data, 3600);
      
      // If Redis fails, use in-memory storage
      if (!redisSuccess) {
        console.log(`[API] Redis storage failed for chunk ${chunkIndex}, using in-memory storage`);
        usingMemoryStorage = true;
      }
    }
    
    // If using memory storage or Redis failed
    if (usingMemoryStorage) {
      if (!memoryStorage.chunks[sessionId]) {
        memoryStorage.chunks[sessionId] = {};
      }
      memoryStorage.chunks[sessionId][chunkIndex] = data;
      console.log(`[API] Chunk ${chunkIndex} stored in memory`);
    }
    
    // Update session info
    sessionInfo.receivedChunks += 1;
    sessionInfo.chunks[chunkIndex] = true;
    
    // Update session info in the appropriate storage
    if (usingMemoryStorage) {
      memoryStorage.sessions[sessionId] = sessionInfo;
      console.log(`[API] Updated session info in memory storage`);
    } else {
      const sessionUpdateSuccess = await setCache(`chunked:${sessionId}:info`, sessionInfo, 3600);
      
      // If Redis update fails, fall back to memory storage
      if (!sessionUpdateSuccess) {
        console.log(`[API] Redis update failed, falling back to memory storage`);
        memoryStorage.sessions[sessionId] = sessionInfo;
      }
    }
    
    console.log(`[API] Received chunk ${chunkIndex + 1}/${sessionInfo.totalChunks} for session ${sessionId}`);
    
    return res.status(200).json({ 
      success: true,
      receivedChunks: sessionInfo.receivedChunks,
      totalChunks: sessionInfo.totalChunks
    });
  } catch (error) {
    console.error('Upload chunk error:', error);
    return res.status(500).json({ 
      error: 'Failed to upload chunk',
      details: error.message
    });
  }
}

// Complete a chunked upload
async function handleCompleteChunkedUpload(req, res) {
  try {
    const { sessionId } = req.body;
    
    console.log(`[API] Processing completion request for session ${sessionId}`);
    
    // Try to get session info from Redis first
    let sessionInfo = await getCache(`chunked:${sessionId}:info`);
    let usingMemoryStorage = false;
    
    // If not in Redis, check in-memory storage
    if (!sessionInfo && memoryStorage.sessions && memoryStorage.sessions[sessionId]) {
      console.log(`[API] Session ${sessionId} found in memory storage for completion`);
      sessionInfo = memoryStorage.sessions[sessionId];
      usingMemoryStorage = true;
    }
    
    // If session not found in either storage
    if (!sessionInfo) {
      console.log(`[API] Session ${sessionId} not found in Redis or memory storage`);
      return res.status(404).json({ error: 'Upload session not found or expired' });
    }
    
    console.log(`[API] Session info retrieved, using ${usingMemoryStorage ? 'memory storage' : 'Redis'}`);
    
    // Check if all chunks are received
    if (sessionInfo.receivedChunks !== sessionInfo.totalChunks) {
      console.log(`[API] Not all chunks received: ${sessionInfo.receivedChunks}/${sessionInfo.totalChunks}`);
      return res.status(400).json({ 
        error: 'Not all chunks received',
        receivedChunks: sessionInfo.receivedChunks,
        totalChunks: sessionInfo.totalChunks
      });
    }
    
    console.log(`[API] Reassembling ${sessionInfo.totalChunks} chunks for session ${sessionId}`);
    
    // Reassemble the data
    let completeData = '';
    for (let i = 0; i < sessionInfo.totalChunks; i++) {
      let chunkData = null;
      
      // Get chunk from the appropriate storage
      if (usingMemoryStorage) {
        if (memoryStorage.chunks && memoryStorage.chunks[sessionId] && memoryStorage.chunks[sessionId][i] !== undefined) {
          chunkData = memoryStorage.chunks[sessionId][i];
          console.log(`[API] Chunk ${i} retrieved from memory storage`);
        }
      } else {
        // Try to get chunk from Redis
        chunkData = await getCache(`chunked:${sessionId}:chunk:${i}`);
        
        // If not in Redis but we have it in memory storage as fallback
        if (!chunkData && memoryStorage.chunks && memoryStorage.chunks[sessionId] && memoryStorage.chunks[sessionId][i] !== undefined) {
          chunkData = memoryStorage.chunks[sessionId][i];
          console.log(`[API] Chunk ${i} not in Redis, retrieved from memory storage fallback`);
        }
      }
      
      // If chunk not found in either storage
      if (!chunkData) {
        console.log(`[API] Chunk ${i} not found in any storage`);
        return res.status(500).json({ error: `Chunk ${i} not found or expired` });
      }
      
      completeData += chunkData;
    }
    
    console.log(`[API] All chunks retrieved successfully`);
    
    // Parse the reassembled data
    let routeData;
    try {
      routeData = JSON.parse(completeData);
      console.log(`[API] Successfully reassembled data for session ${sessionId}, size: ${completeData.length} bytes`);
    } catch (parseError) {
      console.error(`[API] Error parsing reassembled data:`, parseError);
      return res.status(400).json({ 
        error: 'Failed to parse reassembled data',
        details: parseError.message
      });
    }
    
    // Process the route data using existing handlers
    let result;
    
    // Save the original request body and query
    const originalBody = req.body;
    const originalQuery = req.query;
    
    try {
      if (sessionInfo.isUpdate) {
        // Update existing route
        req.body = routeData;
        req.query.id = sessionInfo.persistentId;
        await handleUpdateRoute(req, res);
      } else {
        // Create new route
        req.body = routeData;
        await handleCreateRoute(req, res);
      }
      
      // The response has already been sent by the handler
      result = true;
    } catch (error) {
      console.error(`[API] Error processing reassembled data:`, error);
      
      // Restore the original request body and query
      req.body = originalBody;
      req.query = originalQuery;
      
      return res.status(500).json({ 
        error: 'Failed to process reassembled data',
        details: error.message
      });
    }
    
    // Clean up Redis/Vercel KV keys
    try {
      // Clean up Redis
      await deleteCache(`chunked:${sessionId}:info`);
      for (let i = 0; i < sessionInfo.totalChunks; i++) {
        await deleteCache(`chunked:${sessionId}:chunk:${i}`);
      }
      
      // Clean up memory storage
      if (memoryStorage.sessions[sessionId]) {
        delete memoryStorage.sessions[sessionId];
      }
      if (memoryStorage.chunks[sessionId]) {
        delete memoryStorage.chunks[sessionId];
      }
      
      console.log(`[API] Cleaned up temporary data for session ${sessionId}`);
    } catch (cleanupError) {
      console.error(`[API] Error cleaning up temporary data:`, cleanupError);
      // Continue even if cleanup fails
    }
    
    // If we get here, the response has already been sent by the handler
    return result;
  } catch (error) {
    console.error('Complete chunked upload error:', error);
    return res.status(500).json({ 
      error: 'Failed to complete chunked upload',
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
  
  // Handle chunked upload endpoints
  if (pathParts.includes('chunked')) {
    console.log(`[API] Handling chunked upload request: ${url.pathname}`);
    
    // Find the index of 'chunked' in the path
    const chunkedIndex = pathParts.indexOf('chunked');
    
    // Get the action (the part after 'chunked')
    const action = chunkedIndex < pathParts.length - 1 ? pathParts[chunkedIndex + 1] : null;
    
    console.log(`[API] Chunked upload action: ${action}`);
    
    if (req.method === 'POST') {
      if (action === 'start') {
        return handleStartChunkedUpload(req, res);
      } else if (action === 'upload') {
        return handleUploadChunk(req, res);
      } else if (action === 'complete') {
        return handleCompleteChunkedUpload(req, res);
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Extract persistentId from path if present (e.g., /api/routes/[persistentId])
  let persistentId = null;
  
  // Check if this is a route request with a persistentId
  if (pathParts.length > 0) {
    // Check if the last part of the path is the persistentId
    const lastPart = pathParts[pathParts.length - 1];
    
    // If the last part is not 'routes', 'save', or contains a query string,
    // it's likely a persistentId
    if (lastPart && 
        !['routes', 'save', 'public', 'chunked', 'start', 'upload', 'complete'].includes(lastPart) && 
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
