import { createApiHandler } from '../lib/middleware.js';
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db.js';
import { uploadFile, deleteFile, generateUploadSignature, generateThumbnailUrl } from '../lib/cloudinary.js';

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

// Handler for getting a signature for direct Cloudinary upload
async function handleGetPresignedUrl(req, res) {
  try {
    // Check if we have the required data in the request body
    const { filename, contentType, metadata, additionalParams } = req.body;
    
    if (!filename || !contentType) {
      return res.status(400).json({ error: 'Missing filename or contentType' });
    }
    
    // Define allowed MIME types
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];
    
    // Validate content type
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return res.status(400).json({ error: 'Invalid file type. Supported types: JPEG, PNG, GIF, WebP, HEIC' });
    }
    
    // Generate a unique key for the file
    const userId = req.user?.sub || 'anonymous';
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    
    // Prepare parameters for signature
    const signatureParams = {
      // Add any additional parameters for the signature
      public_id: `uploads/${userId}/${timestamp}-${randomString}-${filename}`,
      // Add any metadata as context
      context: metadata?.gps ? `lat=${metadata.gps.latitude}|lng=${metadata.gps.longitude}` : undefined
    };
    
    // Include any additional parameters provided by the client
    // This allows the client to include parameters like upload_preset and context
    // that need to be part of the signature calculation
    if (additionalParams && typeof additionalParams === 'object') {
      console.log('Including additional parameters in signature:', additionalParams);
      Object.assign(signatureParams, additionalParams);
    }
    
    // Get a signature for Cloudinary upload
    const signatureData = generateUploadSignature(signatureParams);
    
    // Return the signature data
    return res.status(200).json({
      ...signatureData,
      // Include any additional metadata that might be needed client-side
      metadata: {
        ...metadata,
        userId,
        timestamp
      }
    });
  } catch (error) {
    console.error('Get signature error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate signature',
      details: error.message
    });
  }
}

// Handler for uploading a photo directly to the server
async function handleUploadPhoto(req, res) {
  try {
    console.log('Upload request received:', {
      hasFiles: !!req.files,
      contentType: req.headers['content-type'],
      fileKeys: req.files ? Object.keys(req.files) : [],
      body: req.body ? Object.keys(req.body) : []
    });
    
    // For debugging, log the raw request
    console.log('Request headers:', req.headers);
    
    // Check if file is provided
    if (!req.files || !req.files.photo) {
      // Try to get the file from the raw body if it's not in req.files
      if (req.body && req.body.photo && typeof req.body.photo !== 'string') {
        console.log('Found photo in request body');
        const file = req.body.photo;
        
        // Generate a unique filename
        const filename = `${Date.now()}-photo.jpg`;
        const userId = req.user?.sub || 'anonymous';
        
        // Upload to Cloudinary
        const result = await uploadFile(file.data || file, {
          public_id: `uploads/${userId}/${filename}`,
          resource_type: 'image',
          format: 'jpg'
        });
        
        // Construct the response
        const response = {
          filename,
          originalFilename: file.name,
          url: result.url,
          tinyThumbnailUrl: result.tinyThumbnailUrl,
          thumbnailUrl: result.thumbnailUrl,
          mediumUrl: result.mediumUrl,
          largeUrl: result.largeUrl,
          size: file.size,
          mimeType: file.mimetype,
          publicId: result.publicId
        };
        
        return res.status(200).json(response);
      }
      
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = req.files.photo;
    console.log('File received:', {
      name: file.name,
      size: file.size,
      mimetype: file.mimetype
    });
    
    // Generate a unique filename
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const userId = req.user?.sub || 'anonymous';
    
    // Upload to Cloudinary
    const result = await uploadFile(file.data, {
      public_id: `uploads/${userId}/${filename}`,
      resource_type: 'auto',
      // Add any metadata as context
      context: req.body?.metadata ? JSON.stringify(req.body.metadata) : undefined
    });
    
    // Construct the response
    const response = {
      filename,
      originalFilename: file.name,
      url: result.url,
      tinyThumbnailUrl: result.tinyThumbnailUrl,
      thumbnailUrl: result.thumbnailUrl,
      mediumUrl: result.mediumUrl,
      largeUrl: result.largeUrl,
      size: file.size,
      mimeType: file.mimetype,
      publicId: result.publicId,
      width: result.width,
      height: result.height
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
    
    // Extract the public ID from the URL or use the stored publicId
    let publicId;
    if (photo.publicId) {
      // If we have the publicId stored directly, use it
      publicId = photo.publicId;
    } else {
      // Otherwise, try to extract it from the URL
      // Cloudinary URLs are typically in the format:
      // https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
      const url = new URL(photo.url);
      const pathParts = url.pathname.split('/');
      // The public ID is everything after /upload/vXXXXXXXXXX/
      const uploadIndex = pathParts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && uploadIndex + 2 < pathParts.length) {
        // Skip the version part (vXXXXXXXXXX)
        publicId = pathParts.slice(uploadIndex + 2).join('/');
      } else {
        throw new Error('Could not extract public ID from URL');
      }
    }
    
    // Delete from Cloudinary
    await deleteFile(publicId);
    
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

// Helper function to parse multipart form data manually
async function parseMultipartFormData(req) {
  if (!req.rawBody || !req.headers['content-type']?.includes('multipart/form-data')) {
    return null;
  }

  try {
    console.log('Attempting manual multipart form data parsing');
    const boundary = req.headers['content-type'].split('boundary=')[1];
    if (!boundary) {
      console.error('No boundary found in content-type header');
      return null;
    }

    const rawBody = req.rawBody.toString('binary');
    const parts = rawBody.split(`--${boundary}`);
    
    // Skip the first and last parts (they're empty or just boundary markers)
    const dataParts = parts.slice(1, -1);
    
    const files = {};
    let foundFile = false;
    
    for (const part of dataParts) {
      // Skip empty parts
      if (!part.trim()) continue;
      
      // Parse headers
      const [headerSection, ...bodyParts] = part.split('\r\n\r\n');
      const bodyContent = bodyParts.join('\r\n\r\n');
      
      // Extract content-disposition header
      const contentDispositionMatch = headerSection.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/i);
      if (!contentDispositionMatch) continue;
      
      const fieldName = contentDispositionMatch[1];
      const filename = contentDispositionMatch[2];
      
      // Extract content-type header
      const contentTypeMatch = headerSection.match(/Content-Type: (.+)/i);
      const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : null;
      
      if (filename && contentType) {
        // This is a file
        // Remove the trailing \r\n if it exists
        let fileData;
        if (bodyContent.endsWith('\r\n')) {
          fileData = Buffer.from(bodyContent.slice(0, -2), 'binary');
        } else {
          fileData = Buffer.from(bodyContent, 'binary');
        }
        
        // Always use 'photo' as the field name since that's what the handler expects
        files['photo'] = {
          name: filename,
          data: fileData,
          size: fileData.length,
          mimetype: contentType,
          mv: function(path, callback) {
            // Simple implementation of the mv function that express-fileupload provides
            require('fs').writeFile(path, this.data, callback);
          }
        };
        
        foundFile = true;
        console.log(`Parsed file as 'photo': original field name: ${fieldName}, filename: ${filename}, size: ${fileData.length}`);
      }
    }
    
    if (foundFile) {
      console.log('Successfully parsed file with field name "photo"');
    } else {
      console.log('No files found in multipart form data');
    }
    
    return { files };
  } catch (error) {
    console.error('Error parsing multipart form data:', error);
    return null;
  }
}

// Route handler
const handler = async (req, res) => {
  // Ensure database connection
  await connectToDatabase();
  
  // Get the path from the URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace('/api/photos', '');
  
  // Handle different HTTP methods and paths
  switch (req.method) {
    case 'POST':
      // Check if it's a presigned URL request
      if (req.query.presigned === 'true' || (req.body && req.body.presigned === true)) {
        return handleGetPresignedUrl(req, res);
      }
      
      // Handle /upload endpoint
      if (path === '/upload' && req.headers['content-type']?.includes('multipart/form-data')) {
        // If req.files is empty but we have rawBody, try to parse it manually
        if ((!req.files || Object.keys(req.files).length === 0) && req.rawBody) {
          const parsedData = await parseMultipartFormData(req);
          if (parsedData && parsedData.files) {
            req.files = parsedData.files;
            console.log('Successfully parsed multipart form data manually:', {
              hasFiles: !!req.files,
              fileKeys: req.files ? Object.keys(req.files) : []
            });
          }
        }
        
        return handleUploadPhoto(req, res);
      }
      
      // Otherwise, it's a photo record creation request
      return handleCreatePhoto(req, res);
    
    case 'PUT':
      // Handle photo update
      return handleUpdatePhoto(req, res);
    
    case 'DELETE':
      // Handle /delete endpoint
      if (path === '/delete') {
        // Extract URL or publicId from request body
        const { url, publicId } = req.body;
        if (!url && !publicId) {
          return res.status(400).json({ error: 'Missing URL or publicId parameter' });
        }
        
        try {
          let idToDelete;
          
          if (publicId) {
            // If publicId is provided directly, use it
            idToDelete = publicId;
          } else {
            // Otherwise, try to extract it from the URL
            // Cloudinary URLs are typically in the format:
            // https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            // The public ID is everything after /upload/vXXXXXXXXXX/
            const uploadIndex = pathParts.findIndex(part => part === 'upload');
            if (uploadIndex !== -1 && uploadIndex + 2 < pathParts.length) {
              // Skip the version part (vXXXXXXXXXX)
              idToDelete = pathParts.slice(uploadIndex + 2).join('/');
            } else {
              throw new Error('Could not extract public ID from URL');
            }
          }
          
          // Delete from Cloudinary
          await deleteFile(idToDelete);
          
          return res.status(200).json({ message: 'Photo deleted successfully' });
        } catch (error) {
          console.error('Delete photo error:', error);
          return res.status(500).json({ 
            error: 'Failed to delete photo',
            details: error.message
          });
        }
      }
      
      // Handle photo deletion by ID
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
