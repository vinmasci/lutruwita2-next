/**
 * Cloudinary integration for photo storage
 * 
 * This module provides utilities for working with Cloudinary for photo storage,
 * including generating upload signatures, uploading files, and deleting files.
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dig9djqnj',
  api_key: process.env.CLOUDINARY_API_KEY || '682837882671547',
  api_secret: process.env.CLOUDINARY_API_SECRET || '1-yg9KSGYSSQzM2V9AuzWkBholk'
});

// Log Cloudinary configuration on module load
console.log(`[Cloudinary] Configured with cloud_name: ${cloudinary.config().cloud_name}`);
console.log(`[Cloudinary] API key configured: ${!!cloudinary.config().api_key}`);

/**
 * Generate a signature for direct upload to Cloudinary
 * @param {Object} params - Additional parameters to include in the signature
 * @returns {Object} - Signature and other required parameters for upload
 */
export function generateUploadSignature(params = {}) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // Create the string to sign
  const toSign = {
    timestamp,
    folder: 'uploads',
    upload_preset: 'lutruwita', // Add the upload preset name
    ...params
  };
  
  // Generate the signature
  const signature = cloudinary.utils.api_sign_request(toSign, process.env.CLOUDINARY_API_SECRET);
  
  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME
  };
}

/**
 * Upload a file to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - The upload result with URLs
 */
export async function uploadFile(fileBuffer, options = {}) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'uploads',
        ...options
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          // Generate URLs for different resolutions
          tinyThumbnailUrl: generateTinyThumbnailUrl(result.public_id),
          thumbnailUrl: generateSmallThumbnailUrl(result.public_id),
          mediumUrl: generateMediumThumbnailUrl(result.public_id),
          largeUrl: generateLargeImageUrl(result.public_id)
        });
      }
    ).end(fileBuffer);
  });
}

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public ID of the file to delete
 * @param {Object} options - Additional options for deletion
 * @param {string} options.resource_type - The resource type ('image', 'raw', etc.)
 * @returns {Promise<Object>} - The result of the delete operation
 */
export async function deleteFile(publicId, options = {}) {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: options.resource_type || 'image',
    ...options
  });
}

/**
 * Generate a tiny thumbnail URL for map markers (50-100px)
 * @param {string} publicId - The public ID of the image
 * @param {Object} options - Thumbnail options
 * @returns {string} - The tiny thumbnail URL
 */
export function generateTinyThumbnailUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    width: options.width || 100,
    height: options.height || 100,
    crop: 'fill',
    quality: options.quality || 60,
    format: 'auto',
    secure: true // Force HTTPS
  });
}

/**
 * Generate a small thumbnail URL for thumbnails (200px)
 * @param {string} publicId - The public ID of the image
 * @param {Object} options - Thumbnail options
 * @returns {string} - The small thumbnail URL
 */
export function generateSmallThumbnailUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    width: options.width || 200,
    height: options.height || 200,
    crop: 'fill',
    quality: options.quality || 70,
    format: 'auto',
    secure: true // Force HTTPS
  });
}

/**
 * Generate a medium thumbnail URL (400px)
 * @param {string} publicId - The public ID of the image
 * @param {Object} options - Thumbnail options
 * @returns {string} - The medium thumbnail URL
 */
export function generateMediumThumbnailUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    width: options.width || 400,
    height: options.height || 400,
    crop: 'fill',
    quality: options.quality || 75,
    format: 'auto',
    secure: true // Force HTTPS
  });
}

/**
 * Generate a large optimized image URL for modal view (1200px)
 * @param {string} publicId - The public ID of the image
 * @param {Object} options - Image options
 * @returns {string} - The large image URL
 */
export function generateLargeImageUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    width: options.width || 1200,
    height: options.height || 1200,
    crop: options.crop || 'limit',
    quality: options.quality || 80,
    format: 'auto',
    secure: true // Force HTTPS
  });
}

/**
 * Generate a thumbnail URL for Cloudinary image (backward compatibility)
 * @param {string} publicId - The public ID of the image
 * @param {Object} options - Thumbnail options
 * @returns {string} - The thumbnail URL
 */
export function generateThumbnailUrl(publicId, options = {}) {
  return generateSmallThumbnailUrl(publicId, options);
}

/**
 * Generate a URL for a Cloudinary image with custom transformations
 * @param {string} publicId - The public ID of the image
 * @param {Object} transformations - Cloudinary transformations
 * @returns {string} - The transformed image URL
 */
export function generateImageUrl(publicId, transformations = {}) {
  // Ensure secure is set to true in the transformations
  const secureTransformations = {
    ...transformations,
    secure: true // Force HTTPS
  };
  return cloudinary.url(publicId, secureTransformations);
}

/**
 * Utility function to ensure a URL uses HTTPS instead of HTTP
 * @param {string} url - The URL to check and potentially convert
 * @returns {string} - The URL with HTTPS protocol
 */
export function ensureHttpsUrl(url) {
  if (typeof url === 'string' && url.startsWith('http:')) {
    return url.replace('http:', 'https:');
  }
  return url;
}

/**
 * Upload JSON data to Cloudinary as a raw file
 * @param {Object} jsonData - The JSON data to upload
 * @param {string} publicId - The public ID to use for the file
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} - The upload result with URLs
 */
export async function uploadJsonData(jsonData, publicId, options = {}) {
  try {
    console.log(`[Cloudinary][DEBUG] uploadJsonData called with publicId: ${publicId}`);
    console.log(`[Cloudinary][DEBUG] uploadJsonData options:`, JSON.stringify(options));
    console.log(`[Cloudinary][DEBUG] uploadJsonData folder: ${options.folder || 'embeds'}`);
    
    // Convert JSON to string
    const jsonString = JSON.stringify(jsonData);
    console.log(`[Cloudinary][DEBUG] JSON data stringified, length: ${jsonString.length}`);
    
    // Convert string to Buffer
    const buffer = Buffer.from(jsonString);
    console.log(`[Cloudinary][DEBUG] Buffer created, size: ${buffer.length}`);
    
    // Log Cloudinary config
    console.log(`[Cloudinary][DEBUG] Cloudinary config - cloud_name: ${cloudinary.config().cloud_name}`);
    console.log(`[Cloudinary][DEBUG] Cloudinary config - api_key exists: ${!!cloudinary.config().api_key}`);
    
    return new Promise((resolve, reject) => {
      console.log(`[Cloudinary][DEBUG] Starting upload_stream`);
      
      const uploadOptions = {
        resource_type: 'raw', // Important: specify raw for JSON files
        public_id: publicId,
        folder: options.folder || 'embeds',
        format: 'json',
        ...options
      };
      
      console.log(`[Cloudinary][DEBUG] Upload options:`, JSON.stringify(uploadOptions));
      
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error(`[Cloudinary][ERROR] Upload failed:`, error);
            return reject(error);
          }
          
          console.log(`[Cloudinary][DEBUG] Upload successful:`, JSON.stringify(result));
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            version: result.version
          });
        }
      ).end(buffer);
    });
  } catch (error) {
    console.error(`[Cloudinary][ERROR] Exception in uploadJsonData:`, error);
    throw error;
  }
}

/**
 * Fetch JSON data from Cloudinary
 * @param {string} url - The URL of the JSON file
 * @returns {Promise<Object>} - The parsed JSON data
 */
export async function fetchJsonData(url) {
  try {
    // Add a timestamp parameter to avoid caching
    const timestampedUrl = `${url}?t=${Date.now()}`;
    
    // Fetch the JSON file
    const response = await fetch(timestampedUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON data: ${response.status} ${response.statusText}`);
    }
    
    // Parse the JSON data
    const jsonData = await response.json();
    return jsonData;
  } catch (error) {
    console.error('Error fetching JSON data from Cloudinary:', error);
    throw error;
  }
}

/**
 * Get a user's saved routes JSON file from Cloudinary
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - The user's saved routes data
 */
export async function getUserSavedRoutes(userId) {
  try {
    // Generate the URL for the user's saved routes file
    const publicId = `users/${userId}/saved-routes`;
    const url = cloudinary.url(publicId, {
      resource_type: 'raw',
      format: 'json',
      secure: true
    });
    
    console.log(`[Cloudinary] Fetching saved routes for user ${userId} from URL: ${url}`);
    
    try {
      // Fetch the JSON data
      const data = await fetchJsonData(url);
      console.log(`[Cloudinary] Successfully fetched saved routes for user ${userId}: ${JSON.stringify(data)}`);
      return data;
    } catch (fetchError) {
      // If the file doesn't exist, create an empty saved routes file
      console.log(`[Cloudinary] No saved routes found for user ${userId}, creating new file. Error: ${fetchError.message}`);
      
      // Create an empty saved routes file
      const emptyData = { savedRoutes: [] };
      await saveUserSavedRoutesDirectly(userId, []);
      
      return emptyData;
    }
  } catch (error) {
    console.error(`[Cloudinary][ERROR] Error getting saved routes for user ${userId}:`, error);
    console.error(`[Cloudinary][ERROR] Error stack:`, error.stack);
    
    // Return an empty object as fallback
    return { savedRoutes: [] };
  }
}

/**
 * Ensure the folder structure exists for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} - Whether the folder structure was created successfully
 */
export async function ensureUserFolderExists(userId) {
  try {
    console.log(`[Cloudinary] Ensuring folder structure exists for user ${userId}`);
    
    // Step 1: Ensure the 'users' folder exists
    try {
      console.log(`[Cloudinary][DEBUG] Checking if 'users' folder exists`);
      
      // Create a small placeholder file in the 'users' folder
      const usersInitData = {
        created: new Date().toISOString(),
        type: 'folder-init'
      };
      
      await uploadJsonData(usersInitData, 'folder-init', {
        folder: 'users',
        overwrite: true
      });
      
      console.log(`[Cloudinary][DEBUG] 'users' folder exists or was created`);
    } catch (error) {
      console.error(`[Cloudinary][ERROR] Error ensuring 'users' folder exists:`, error);
      throw error;
    }
    
    // Step 2: Ensure the specific user folder exists
    try {
      console.log(`[Cloudinary][DEBUG] Checking if user folder 'users/${userId}' exists`);
      
      // Create a small placeholder file in the user's folder
      const userInitData = {
        userId: userId,
        created: new Date().toISOString(),
        type: 'folder-init'
      };
      
      await uploadJsonData(userInitData, 'folder-init', {
        folder: `users/${userId}`,
        overwrite: true
      });
      
      console.log(`[Cloudinary][DEBUG] User folder 'users/${userId}' exists or was created`);
    } catch (error) {
      console.error(`[Cloudinary][ERROR] Error ensuring user folder exists:`, error);
      throw error;
    }
    
    console.log(`[Cloudinary] Successfully ensured folder structure for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`[Cloudinary][ERROR] Error ensuring folder structure:`, error);
    console.error(`[Cloudinary][ERROR] Error stack:`, error.stack);
    throw error;
  }
}

/**
 * Save a user's saved routes to Cloudinary
 * @param {string} userId - The user's ID
 * @param {string[]} routeIds - Array of route IDs to save
 * @returns {Promise<Object>} - The upload result
 */
export async function saveUserSavedRoutes(userId, routeIds) {
  try {
    console.log(`[Cloudinary] Saving ${routeIds.length} routes for user ${userId}: ${JSON.stringify(routeIds)}`);
    console.log(`[Cloudinary][DEBUG] saveUserSavedRoutes called for user: ${userId}`);
    
    // Use the direct approach instead of trying to create folders first
    return await saveUserSavedRoutesDirectly(userId, routeIds);
  } catch (error) {
    console.error(`[Cloudinary][ERROR] Error saving routes for user ${userId}:`, error);
    console.error(`[Cloudinary][ERROR] Error stack:`, error.stack);
    throw error;
  }
}

/**
 * Add a route to a user's saved routes
 * @param {string} userId - The user's ID
 * @param {string} routeId - The route ID to add
 * @returns {Promise<Object>} - The updated saved routes data
 */
export async function addRouteToUserSavedRoutes(userId, routeId) {
  try {
    console.log(`[Cloudinary] Adding route ${routeId} to saved routes for user ${userId}`);
    console.log(`[Cloudinary][DEBUG] addRouteToUserSavedRoutes called for user: ${userId}, route: ${routeId}`);
    
    // Get the user's current saved routes
    console.log(`[Cloudinary][DEBUG] Calling getUserSavedRoutes for user: ${userId}`);
    let savedRoutesData;
    try {
      savedRoutesData = await getUserSavedRoutes(userId);
    } catch (error) {
      // If there's an error or no saved routes yet, create an empty array
      console.log(`[Cloudinary] No saved routes found for user ${userId}, creating new data`);
      savedRoutesData = { savedRoutes: [] };
    }
    
    console.log(`[Cloudinary][DEBUG] getUserSavedRoutes returned:`, JSON.stringify(savedRoutesData));
    
    // Check if the route is already saved
    if (!savedRoutesData.savedRoutes.includes(routeId)) {
      console.log(`[Cloudinary] Route ${routeId} not found in saved routes, adding it`);
      
      // Add the route ID to the saved routes array
      savedRoutesData.savedRoutes.push(routeId);
      
      // Save the updated saved routes directly
      console.log(`[Cloudinary][DEBUG] Calling saveUserSavedRoutesDirectly with ${savedRoutesData.savedRoutes.length} routes`);
      await saveUserSavedRoutesDirectly(userId, savedRoutesData.savedRoutes);
      console.log(`[Cloudinary] Successfully added route ${routeId} to saved routes`);
    } else {
      console.log(`[Cloudinary] Route ${routeId} already in saved routes, skipping`);
    }
    
    return savedRoutesData;
  } catch (error) {
    console.error(`[Cloudinary][ERROR] Error adding route ${routeId} to saved routes:`, error);
    console.error(`[Cloudinary][ERROR] Error stack:`, error.stack);
    throw error;
  }
}

/**
 * Remove a route from a user's saved routes
 * @param {string} userId - The user's ID
 * @param {string} routeId - The route ID to remove
 * @returns {Promise<Object>} - The updated saved routes data
 */
export async function removeRouteFromUserSavedRoutes(userId, routeId) {
  try {
    console.log(`[Cloudinary] Removing route ${routeId} from saved routes for user ${userId}`);
    console.log(`[Cloudinary][DEBUG] removeRouteFromUserSavedRoutes called for user: ${userId}, route: ${routeId}`);
    
    // Get the user's current saved routes
    console.log(`[Cloudinary][DEBUG] Calling getUserSavedRoutes for user: ${userId}`);
    let savedRoutesData;
    try {
      savedRoutesData = await getUserSavedRoutes(userId);
    } catch (error) {
      // If there's an error or no saved routes yet, create an empty array
      console.log(`[Cloudinary] No saved routes found for user ${userId}, nothing to remove`);
      return { savedRoutes: [] };
    }
    
    console.log(`[Cloudinary][DEBUG] getUserSavedRoutes returned:`, JSON.stringify(savedRoutesData));
    
    // Check if the route exists in saved routes
    if (savedRoutesData.savedRoutes.includes(routeId)) {
      console.log(`[Cloudinary] Route ${routeId} found in saved routes, removing it`);
      
      // Remove the route ID from the saved routes array
      savedRoutesData.savedRoutes = savedRoutesData.savedRoutes.filter(id => id !== routeId);
      console.log(`[Cloudinary][DEBUG] Filtered saved routes:`, JSON.stringify(savedRoutesData.savedRoutes));
      
      // Save the updated saved routes directly
      console.log(`[Cloudinary][DEBUG] Calling saveUserSavedRoutesDirectly with ${savedRoutesData.savedRoutes.length} routes`);
      await saveUserSavedRoutesDirectly(userId, savedRoutesData.savedRoutes);
      console.log(`[Cloudinary] Successfully removed route ${routeId} from saved routes`);
    } else {
      console.log(`[Cloudinary] Route ${routeId} not found in saved routes, nothing to remove`);
    }
    
    return savedRoutesData;
  } catch (error) {
    console.error(`[Cloudinary][ERROR] Error removing route ${routeId} from saved routes:`, error);
    console.error(`[Cloudinary][ERROR] Error stack:`, error.stack);
    throw error;
  }
}

/**
 * Directly save a user's saved routes to Cloudinary without folder creation
 * @param {string} userId - The user's ID
 * @param {string[]} routeIds - Array of route IDs to save
 * @returns {Promise<Object>} - The upload result
 */
export async function saveUserSavedRoutesDirectly(userId, routeIds) {
  try {
    console.log(`[Cloudinary] Directly saving ${routeIds.length} routes for user ${userId}`);
    
    // Create the JSON data
    const jsonData = {
      savedRoutes: routeIds,
      updatedAt: new Date().toISOString()
    };
    
    // Upload the JSON data directly with the full path in the public_id
    const publicId = `users/${userId}/saved-routes`;
    console.log(`[Cloudinary] Uploading saved routes with public ID: ${publicId}`);
    
    const result = await uploadJsonData(jsonData, publicId, {
      resource_type: 'raw',
      format: 'json',
      overwrite: true
    });
    
    console.log(`[Cloudinary] Successfully saved routes for user ${userId}`);
    return result;
  } catch (error) {
    console.error(`[Cloudinary][ERROR] Error directly saving routes for user ${userId}:`, error);
    console.error(`[Cloudinary][ERROR] Error stack:`, error.stack);
    throw error;
  }
}

export default {
  generateUploadSignature,
  uploadFile,
  deleteFile,
  generateTinyThumbnailUrl,
  generateSmallThumbnailUrl,
  generateMediumThumbnailUrl,
  generateLargeImageUrl,
  generateThumbnailUrl,
  generateImageUrl,
  uploadJsonData
};
