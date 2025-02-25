import { createApiHandler } from '../lib/middleware.js';
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db.js';
import { uploadToS3, getSignedUrl, deleteFromS3 } from '../lib/storage.js';

// Define Photo schema
const PhotoSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  filename: { type: String, required: true },
  originalFilename: { type: String },
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  size: { type: Number },
  mimeType: { type: String },
  metadata: {
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' }
    },
    captureDate: { type: Date },
    camera: { type: String },
    tags: [String],
    custom: mongoose.Schema.Types.Mixed
  },
  poiId: { type: mongoose.Schema.Types.ObjectId, ref: 'POI', index: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', index: true },
  persistentId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Initialize the model
let Photo;
try {
  // Try to get the model if it exists
  Photo = mongoose.model('Photo');
} catch (e) {
  // Create the model if it doesn't exist
  Photo = mongoose.model('Photo', PhotoSchema);
}

// Handler for creating a photo record
async function handleCreatePhoto(req, res) {
  try {
    // Check if required fields are provided
    if (!req.body || !req.body.filename || !req.body.url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { 
      filename, 
      originalFilename, 
      url, 
      thumbnailUrl, 
      size, 
      mimeType, 
      metadata, 
      poiId, 
      routeId 
    } = req.body;
    
    // Create a new photo record
    const photo = new Photo({
      userId: req.body.userId || 'anonymous', // In a real app, get from auth
      filename,
      originalFilename,
      url,
      thumbnailUrl,
      size,
      mimeType,
      metadata,
      poiId,
      routeId,
      persistentId: req.body.persistentId || `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    });
    
    // Save to database
    await photo.save();
    
    // If this photo is associated with a POI, update the POI's photos array
    if (poiId) {
      const POI = mongoose.model('POI');
      await POI.findByIdAndUpdate(
        poiId,
        { $push: { photos: photo._id } }
      );
    }
    
    return res.status(201).json(photo);
  } catch (error) {
    console.error('Create photo error:', error);
    return res.status(500).json({ 
      error: 'Failed to create photo record',
      details: error.message
    });
  }
}

// Handler for getting a presigned URL for direct S3 upload
async function handleGetUploadUrl(req, res) {
  try {
    const { filename, contentType } = req.query;
    
    if (!filename || !contentType) {
      return res.status(400).json({ error: 'Missing filename or contentType' });
    }
    
    // Generate a unique key for the file
    const key = `uploads/${req.user?.sub || 'anonymous'}/${Date.now()}-${filename}`;
    
    // Get a presigned URL for uploading
    const uploadUrl = await getSignedUrl(key, contentType, 'putObject');
    
    // Construct the final URL where the file will be accessible
    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    return res.status(200).json({
      uploadUrl,
      fileUrl,
      key
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate upload URL',
      details: error.message
    });
  }
}

// Handler for uploading a photo directly to the server
async function handleUploadPhoto(req, res) {
  try {
    // Check if file is provided
    if (!req.files || !req.files.photo) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = req.files.photo;
    
    // Generate a unique filename
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const key = `uploads/${req.user?.sub || 'anonymous'}/${filename}`;
    
    // Upload to S3
    const result = await uploadToS3(file.data, key, file.mimetype);
    
    // Construct the response
    const response = {
      filename,
      originalFilename: file.name,
      url: result.Location,
      size: file.size,
      mimeType: file.mimetype,
      key: result.Key
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Upload photo error:', error);
    return res.status(500).json({ 
      error: 'Failed to upload photo',
      details: error.message
    });
  }
}

// Handler for updating a photo
async function handleUpdatePhoto(req, res) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing photo ID' });
    }
    
    // Get photo
    const photo = await Photo.findById(id);
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Update fields
    const { metadata, poiId, routeId } = req.body;
    
    if (metadata) photo.metadata = { ...photo.metadata, ...metadata };
    if (poiId !== undefined) photo.poiId = poiId;
    if (routeId !== undefined) photo.routeId = routeId;
    
    photo.updatedAt = new Date();
    
    // Save to database
    await photo.save();
    
    return res.status(200).json(photo);
  } catch (error) {
    console.error('Update photo error:', error);
    return res.status(500).json({ 
      error: 'Failed to update photo',
      details: error.message
    });
  }
}

// Handler for deleting a photo
async function handleDeletePhoto(req, res) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing photo ID' });
    }
    
    // Get photo
    const photo = await Photo.findById(id);
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Extract the key from the URL
    const url = new URL(photo.url);
    const key = url.pathname.substring(1); // Remove leading slash
    
    // Delete from S3
    await deleteFromS3(key);
    
    // If this photo is associated with a POI, update the POI's photos array
    if (photo.poiId) {
      const POI = mongoose.model('POI');
      await POI.findByIdAndUpdate(
        photo.poiId,
        { $pull: { photos: photo._id } }
      );
    }
    
    // Delete from database
    await Photo.findByIdAndDelete(id);
    
    return res.status(200).json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Delete photo error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete photo',
      details: error.message
    });
  }
}

// Handler for getting photos
async function handleGetPhotos(req, res) {
  try {
    const { userId, poiId, routeId, limit = 50, skip = 0, near } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by user ID if provided
    if (userId) {
      query.userId = userId;
    }
    
    // Filter by POI ID if provided
    if (poiId) {
      query.poiId = poiId;
    }
    
    // Filter by route ID if provided
    if (routeId) {
      query.routeId = routeId;
    }
    
    // Filter by location if provided
    if (near) {
      const [longitude, latitude, maxDistance] = near.split(',').map(parseFloat);
      
      if (!isNaN(longitude) && !isNaN(latitude)) {
        query['metadata.location'] = {
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
    
    // Get photos
    const photos = await Photo.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    // Get total count
    const total = await Photo.countDocuments(query);
    
    return res.status(200).json({
      photos,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Get photos error:', error);
    return res.status(500).json({ 
      error: 'Failed to get photos',
      details: error.message
    });
  }
}

// Handler for getting a single photo
async function handleGetPhoto(req, res) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing photo ID' });
    }
    
    // Get photo
    const photo = await Photo.findById(id);
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    return res.status(200).json(photo);
  } catch (error) {
    console.error('Get photo error:', error);
    return res.status(500).json({ 
      error: 'Failed to get photo',
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
      // Check if it's a direct upload request
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        return handleUploadPhoto(req, res);
      }
      
      // Check if it's a presigned URL request
      if (req.query.presigned === 'true') {
        return handleGetUploadUrl(req, res);
      }
      
      // Otherwise, it's a photo record creation request
      return handleCreatePhoto(req, res);
    
    case 'PUT':
      // Handle photo update
      return handleUpdatePhoto(req, res);
    
    case 'DELETE':
      // Handle photo deletion
      return handleDeletePhoto(req, res);
    
    case 'GET':
      // Check if it's a single photo request
      if (req.query.id) {
        return handleGetPhoto(req, res);
      }
      
      // Otherwise, it's a photos list request
      return handleGetPhotos(req, res);
    
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
};

// Export the handler with middleware
export default createApiHandler(handler, { requireDb: true });
