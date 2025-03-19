import axios from 'axios';

export async function uploadToCloudinary(file) {
  // Create a FormData object to send the file
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'lutruwita'); // Use the same preset as photos
  formData.append('folder', 'logos'); // Store logos in a separate folder
  
  try {
    // Upload to Cloudinary
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      formData
    );
    
    // Return both the secure URL and the public ID of the uploaded image
    return {
      url: response.data.secure_url,
      publicId: response.data.public_id
    };
  } catch (error) {
    console.error('Error uploading logo to Cloudinary:', error);
    throw error;
  }
}

/**
 * Extracts the public ID from a Cloudinary URL
 * @param {string} url - The Cloudinary URL
 * @returns {string|null} - The public ID or null if not a valid Cloudinary URL
 */
export function getPublicIdFromUrl(url) {
  if (!url) return null;
  
  try {
    // Check if it's a Cloudinary URL
    if (!url.includes('cloudinary.com')) {
      return null;
    }
    
    // Extract the public ID from the URL
    // Format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.ext
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1 || uploadIndex + 2 >= urlParts.length) {
      return null;
    }
    
    // Get everything after 'upload' and the version number
    const publicIdParts = urlParts.slice(uploadIndex + 2);
    
    // Join the parts to get the public ID
    const publicId = publicIdParts.join('/');
    
    // Remove any query parameters
    return publicId.split('?')[0];
  } catch (error) {
    console.error('Error extracting public ID from URL:', error);
    return null;
  }
}

/**
 * Deletes an image from Cloudinary using the Admin API
 * Note: This requires server-side implementation
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<boolean>} - True if deletion was successful
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId) {
    console.warn('No public ID provided for deletion');
    return false;
  }
  
  try {
    // Make a request to the server to delete the image
    // This requires a server-side endpoint that will use the Cloudinary Admin API
    // We can use either DELETE or POST method, but we need to ensure the data is sent correctly
    // For DELETE, we need to use the 'data' property to send the body
    const response = await axios.post('/api/photos/delete', { 
      publicId 
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Successfully deleted image from Cloudinary:', publicId);
    return response.data && response.data.result && response.data.result.result === 'ok';
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return false;
  }
}
