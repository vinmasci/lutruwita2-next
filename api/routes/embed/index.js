import { createApiHandler } from '../../lib/middleware.js';
import mongoose from 'mongoose';
import { connectToDatabase } from '../../lib/db.js';
// Use built-in fetch instead of importing node-fetch

// Handler for getting a route for embedding
async function handleGetRouteForEmbed(req, res) {
  try {
    const { routeId } = req.query;
    
    if (!routeId) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    console.log(`[API] Attempting to find route for embed with ID: ${routeId}`);
    
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
    
    let route = null;
    
    // Try to find by persistentId first
    console.log(`[API] Trying to find route by persistentId: ${routeId}`);
    route = await Route.findOne({ persistentId: routeId });
    
    if (route) {
      console.log(`[API] Found route by persistentId: ${route.name}`);
    } else {
      // Try case-insensitive search
      console.log(`[API] Route not found by persistentId, trying case-insensitive search`);
      
      route = await Route.findOne({ 
        persistentId: { $regex: new RegExp('^' + routeId + '$', 'i') } 
      });
      
      if (route) {
        console.log(`[API] Found route by case-insensitive persistentId: ${route.name}`);
      }
    }
    
    // If not found by persistentId and the ID is a valid ObjectId,
    // try to find by MongoDB _id
    if (!route && mongoose.Types.ObjectId.isValid(routeId)) {
      console.log(`[API] Trying to find route by MongoDB _id: ${routeId}`);
      route = await Route.findById(routeId);
      
      if (route) {
        console.log(`[API] Found route by MongoDB _id: ${route._id}`);
      }
    }
    
    // If not found by persistentId or _id, try to find by publicId
    if (!route) {
      console.log(`[API] Trying to find route by publicId: ${routeId}`);
      route = await Route.findOne({ publicId: routeId });
      
      if (route) {
        console.log(`[API] Found route by publicId: ${route.publicId}`);
      }
    }
    
    // If not found by any of the above, try to find by subroute routeId
    if (!route) {
      console.log(`[API] Trying to find route by subroute routeId: ${routeId}`);
      route = await Route.findOne({ 'routes.routeId': routeId });
      
      if (route) {
        console.log(`[API] Found route by subroute routeId: ${route.name}`);
      }
    }
    
    if (!route) {
      console.log(`[API] Route not found with ID: ${routeId}`);
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Increment view count
    route.viewCount = (route.viewCount || 0) + 1;
    route.lastViewed = new Date();
    await route.save();
    
    // Check if we have pre-processed embed data in Cloudinary
    if (route.embedUrl) {
      console.log(`[API] Using pre-processed embed data from Cloudinary: ${route.embedUrl}`);
      
      try {
        // Add a timestamp parameter to force a fresh version
        const embedUrl = `${route.embedUrl}?t=${Date.now()}`;
        
        // Fetch the pre-processed data from Cloudinary
        const response = await fetch(embedUrl);
        
        if (response.ok) {
          // Parse the JSON data
          const embedData = await response.json();
          
          // Set cache headers for better performance
          res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
          
          // Return the pre-processed data
          return res.status(200).json(embedData);
        } else {
          console.error(`[API] Failed to fetch embed data from Cloudinary: ${response.status} ${response.statusText}`);
          // Fall back to generating embed data on-the-fly
        }
      } catch (error) {
        console.error(`[API] Error fetching embed data from Cloudinary:`, error);
        // Fall back to generating embed data on-the-fly
      }
    }
    
    console.log(`[API] Generating embed data on-the-fly for route: ${route.name} with ID: ${route.persistentId}`);
    
    // Generate embed data on-the-fly (fallback)
    const embedRoute = {
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
      // Include all data needed for the embed view in a flat structure
      pois: route.pois || { draggable: [], places: [] },
      photos: route.photos || [],
      elevation: route.routes.map(r => r.surface?.elevationProfile || []),
      description: route.description, // Include the top-level description field
      headerSettings: route.headerSettings, // Include the header settings
      _type: 'loaded',
      _loadedState: {
        name: route.name,
        pois: route.pois || { draggable: [], places: [] },
        photos: route.photos || [],
        headerSettings: route.headerSettings // Include header settings in _loadedState too
      }
    };
    
    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    
    return res.status(200).json(embedRoute);
  } catch (error) {
    console.error('Get route for embed error:', error);
    return res.status(500).json({ 
      error: 'Failed to get route for embed',
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
  
  console.log(`[API] Embed Request: ${req.method} ${url.pathname}`);
  console.log(`[API] Path parts after filtering:`, pathParts);
  
  // Extract routeId from path if present (e.g., /api/routes/embed/[routeId])
  let routeId = null;
  
  // Check if this is a route request with a routeId
  if (pathParts.length > 0) {
    // Check if the last part of the path is the routeId
    const lastPart = pathParts[pathParts.length - 1];
    
    if (lastPart && lastPart.indexOf('?') === -1) {
      routeId = decodeURIComponent(lastPart);
      console.log(`[API] Detected routeId from path: ${routeId}`);
      
      // Add the routeId to query params for existing handlers
      req.query.routeId = routeId;
    }
  }
  
  // Only allow GET requests for embed
  if (req.method === 'GET') {
    return handleGetRouteForEmbed(req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};

// Export the handler with middleware - make auth optional for embedding
export default createApiHandler(handler, { requireDb: true, requireAuth: false });
