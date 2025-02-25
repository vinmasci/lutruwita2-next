import { createApiHandler } from '../lib/middleware.js';
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db.js';

// Define POI schema
const POISchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere', required: true }
  },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', index: true },
  photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
  metadata: {
    elevation: Number,
    surface: String,
    tags: [String],
    custom: mongoose.Schema.Types.Mixed
  },
  persistentId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Initialize the model
let POI;
try {
  // Try to get the model if it exists
  POI = mongoose.model('POI');
} catch (e) {
  // Create the model if it doesn't exist
  POI = mongoose.model('POI', POISchema);
}

// Handler for creating a POI
async function handleCreatePOI(req, res) {
  try {
    // Check if required fields are provided
    if (!req.body || !req.body.name || !req.body.icon || !req.body.location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { name, description, icon, location, routeId, photos, metadata } = req.body;
    
    // Create a new POI
    const poi = new POI({
      userId: req.body.userId || 'anonymous', // In a real app, get from auth
      name,
      description,
      icon,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      },
      routeId,
      photos,
      metadata,
      persistentId: req.body.persistentId || `poi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    });
    
    // Save to database
    await poi.save();
    
    return res.status(201).json(poi);
  } catch (error) {
    console.error('Create POI error:', error);
    return res.status(500).json({ 
      error: 'Failed to create POI',
      details: error.message
    });
  }
}

// Handler for updating a POI
async function handleUpdatePOI(req, res) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing POI ID' });
    }
    
    // Get POI
    const poi = await POI.findById(id);
    
    if (!poi) {
      return res.status(404).json({ error: 'POI not found' });
    }
    
    // Update fields
    const { name, description, icon, location, routeId, photos, metadata } = req.body;
    
    if (name) poi.name = name;
    if (description !== undefined) poi.description = description;
    if (icon) poi.icon = icon;
    if (location) {
      poi.location = {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      };
    }
    if (routeId !== undefined) poi.routeId = routeId;
    if (photos) poi.photos = photos;
    if (metadata) poi.metadata = { ...poi.metadata, ...metadata };
    
    poi.updatedAt = new Date();
    
    // Save to database
    await poi.save();
    
    return res.status(200).json(poi);
  } catch (error) {
    console.error('Update POI error:', error);
    return res.status(500).json({ 
      error: 'Failed to update POI',
      details: error.message
    });
  }
}

// Handler for deleting a POI
async function handleDeletePOI(req, res) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing POI ID' });
    }
    
    // Delete POI
    const result = await POI.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({ error: 'POI not found' });
    }
    
    return res.status(200).json({ message: 'POI deleted successfully' });
  } catch (error) {
    console.error('Delete POI error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete POI',
      details: error.message
    });
  }
}

// Handler for getting POIs
async function handleGetPOIs(req, res) {
  try {
    const { userId, routeId, limit = 50, skip = 0, near, persistentId } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by user ID if provided
    if (userId) {
      query.userId = userId;
    }
    
    // Filter by route ID if provided
    if (routeId) {
      query.routeId = routeId;
    }
    
    // Filter by persistent ID if provided
    if (persistentId) {
      query.persistentId = persistentId;
    }
    
    // Filter by location if provided
    if (near) {
      const [longitude, latitude, maxDistance] = near.split(',').map(parseFloat);
      
      if (!isNaN(longitude) && !isNaN(latitude)) {
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: maxDistance || 1000 // Default to 1km
          }
        };
      }
    }
    
    // Get POIs
    const pois = await POI.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    // Get total count
    const total = await POI.countDocuments(query);
    
    return res.status(200).json({
      pois,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Get POIs error:', error);
    return res.status(500).json({ 
      error: 'Failed to get POIs',
      details: error.message
    });
  }
}

// Handler for getting a single POI
async function handleGetPOI(req, res) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing POI ID' });
    }
    
    // Get POI
    const poi = await POI.findById(id);
    
    if (!poi) {
      return res.status(404).json({ error: 'POI not found' });
    }
    
    return res.status(200).json(poi);
  } catch (error) {
    console.error('Get POI error:', error);
    return res.status(500).json({ 
      error: 'Failed to get POI',
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
      // Handle POI creation
      return handleCreatePOI(req, res);
    
    case 'PUT':
      // Handle POI update
      return handleUpdatePOI(req, res);
    
    case 'DELETE':
      // Handle POI deletion
      return handleDeletePOI(req, res);
    
    case 'GET':
      // Check if it's a single POI request
      if (req.query.id) {
        return handleGetPOI(req, res);
      }
      
      // Otherwise, it's a POIs list request
      return handleGetPOIs(req, res);
    
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
};

// Export the handler with middleware
export default createApiHandler(handler, { requireDb: true });
