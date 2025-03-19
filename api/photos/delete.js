import { createApiHandler } from '../lib/middleware.js';
import { deleteFile } from '../lib/cloudinary.js';

/**
 * API handler for deleting photos from Cloudinary
 * This endpoint accepts a POST request with a publicId parameter
 * and deletes the corresponding file from Cloudinary
 */
const handler = async (req, res) => {
  // Allow both POST and DELETE requests
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // For DELETE requests, the data is in req.body
  const requestBody = req.method === 'DELETE' ? req.body : req.body;

  try {
    // Get the publicId from the request body
    const { publicId } = requestBody;

    if (!publicId) {
      return res.status(400).json({ error: 'Missing publicId parameter' });
    }

    console.log(`Deleting file from Cloudinary with publicId: ${publicId}`);

    // Delete the file from Cloudinary
    const result = await deleteFile(publicId);

    console.log('Cloudinary deletion result:', result);

    // Check if the deletion was successful
    if (result.result === 'ok') {
      return res.status(200).json({ 
        message: 'File deleted successfully',
        result
      });
    } else {
      return res.status(400).json({ 
        error: 'Failed to delete file',
        result
      });
    }
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
};

// Export the handler with middleware
export default createApiHandler(handler);
