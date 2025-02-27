/**
 * Cloudinary integration for photo storage
 * 
 * This module provides utilities for working with Cloudinary for photo storage,
 * including generating upload signatures, uploading files, and deleting files.
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
 * @returns {Promise<Object>} - The result of the delete operation
 */
export async function deleteFile(publicId) {
  return cloudinary.uploader.destroy(publicId);
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
    format: 'auto'
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
    format: 'auto'
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
    format: 'auto'
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
    format: 'auto'
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
  return cloudinary.url(publicId, transformations);
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
  generateImageUrl
};
