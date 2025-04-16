import { useAuth0 } from '@auth0/auth0-react';
import exifr from 'exifr';
import { Cloudinary } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { quality } from '@cloudinary/url-gen/actions/delivery';
import { format } from '@cloudinary/url-gen/actions/delivery';
import { auto } from '@cloudinary/url-gen/qualifiers/format';

export const usePhotoService = () => {
  const { getAccessTokenSilently } = useAuth0();
  
  const API_BASE = '/api/photos';

  const getAuthHeaders = async () => {
    try {
      const token = await getAccessTokenSilently();
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    } catch (error) {
      console.error('Failed to get auth token:', error);
      throw new Error('Authentication required');
    }
  };

  const handleResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    if (!response.ok) {
      if (isJson) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'An error occurred');
      } else {
        const text = await response.text();
        throw new Error(text || `HTTP error! status: ${response.status}`);
      }
    }
    
    if (isJson) {
      return response.json();
    }
    return response.text();
  };

  /**
   * Extracts metadata from an image file
   * @param {File} file - The image file
   * @returns {Promise<Object>} - The extracted metadata
   */
  const extractMetadata = async (file) => {
    try {
      // Use exifr to extract GPS and other metadata
      const exif = await exifr.parse(file, { gps: true });
      
      return {
        gps: exif?.latitude && exif?.longitude ? {
          latitude: exif.latitude,
          longitude: exif.longitude,
          altitude: exif.altitude
        } : null,
        timestamp: exif?.DateTimeOriginal || new Date().toISOString(),
        camera: exif?.Make && exif?.Model ? `${exif.Make} ${exif.Model}` : null
      };
    } catch (error) {
      console.warn('Failed to extract metadata:', error);
      return {
        gps: null,
        timestamp: new Date().toISOString()
      };
    }
  };

  /**
   * Uploads a photo with retry logic
   * @param {File} file - The image file to upload
   * @param {Function} onProgress - Progress callback
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - The upload result
   */
  const uploadPhotoWithRetry = async (file, onProgress, options = {}) => {
    const maxRetries = options.maxRetries || 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        return await uploadPhoto(file, onProgress, options);
      } catch (error) {
        attempt++;
        console.warn(`Upload attempt ${attempt} failed:`, error);
        
        if (attempt >= maxRetries) throw error;
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Notify progress callback of retry
        if (onProgress) {
          onProgress({
            type: 'retry',
            attempt,
            maxRetries,
            delay
          });
        }
      }
    }
  };

  // Initialize Cloudinary instance
  const cld = new Cloudinary({
    cloud: {
      cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo'
    }
  });

  /**
   * Uploads a photo to Cloudinary directly using unsigned uploads
   * @param {File} file - The image file to upload
   * @param {Function} onProgress - Progress callback
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - The upload result with URLs
   */
  const uploadPhoto = async (file, onProgress, options = {}) => {
    try {
      // If onProgress is provided, notify start
      if (onProgress) {
        onProgress({
          type: 'start',
          file: file.name
        });
      }
      
      // Extract metadata (GPS coordinates, etc.)
      const metadata = await extractMetadata(file);
      
      // Upload directly to Cloudinary using unsigned upload with progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        
        // Add the required Cloudinary parameters for unsigned upload
        formData.append('file', file);
        formData.append('upload_preset', 'lutruwita'); // The unsigned upload preset
        
        // Add folder for organization
        formData.append('folder', 'uploads');
        
        // Add context metadata if available
        if (metadata?.gps) {
          formData.append('context', `lat=${metadata.gps.latitude}|lng=${metadata.gps.longitude}`);
        }
        
        // Set up progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress({
              type: 'progress',
              percent: percentComplete,
              loaded: event.loaded,
              total: event.total
            });
          }
        });
        
        // Set up completion handler
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              
              // Get the URLs from the API response
              const url = result.url || result.secure_url;
              
              // Use the optimized URLs if they exist in the response, otherwise generate them
              const tinyThumbnailUrl = result.tinyThumbnailUrl || cld.image(result.public_id)
                .resize(fill().width(100).height(100))
                .delivery(quality(60))
                .delivery(format(auto()))
                .toURL();
                
              const thumbnailUrl = result.thumbnailUrl || cld.image(result.public_id)
                .resize(fill().width(200).height(200))
                .delivery(quality(70))
                .delivery(format(auto()))
                .toURL();
                
              const mediumUrl = result.mediumUrl || cld.image(result.public_id)
                .resize(fill().width(400).height(400))
                .delivery(quality(75))
                .delivery(format(auto()))
                .toURL();
                
              const largeUrl = result.largeUrl || cld.image(result.public_id)
                .resize(fill().width(1200).height(1200))
                .delivery(quality(80))
                .delivery(format(auto()))
                .toURL();
              
              // Notify progress callback of completion
              if (onProgress) {
                onProgress({
                  type: 'complete',
                  url
                });
              }
              
              resolve({ 
                url, 
                tinyThumbnailUrl,
                thumbnailUrl,
                mediumUrl,
                largeUrl,
                publicId: result.public_id,
                metadata,
                width: result.width,
                height: result.height,
                caption: '' // Initialize with empty caption
              });
            } catch (error) {
              reject(new Error(`Failed to parse upload response: ${error.message}`));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        });
        
        // Set up error handler
        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred during upload'));
        });
        
        // Set up timeout handler
        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timed out'));
        });
        
        // Set up abort handler
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'));
        });
        
        // Send the request
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`);
        xhr.timeout = 60000; // 60 second timeout
        xhr.send(formData);
      });
    } catch (error) {
      console.error('[photoService] Upload error:', error);
      
      // Notify progress callback of error
      if (onProgress) {
        onProgress({
          type: 'error',
          error: error.message
        });
      }
      
      throw error;
    }
  };

  /**
   * Loads an image from Cloudinary with retry logic
   * @param {string} url - The Cloudinary image URL
   * @param {Object} options - Options for loading the image
   * @returns {Promise<HTMLImageElement>} - A promise that resolves to an Image object
   */
  const loadImageWithRetry = async (url, options = {}) => {
    const maxRetries = options.maxRetries || 5;
    const initialDelay = options.initialDelay || 500; // Start with a 500ms delay
    const maxDelay = options.maxDelay || 5000; // Maximum delay of 5 seconds
    
    let attempt = 0;
    let lastError = null;
    
    while (attempt < maxRetries) {
      try {
        // If this isn't the first attempt, add a delay before trying again
        if (attempt > 0) {
          // Calculate delay with exponential backoff, but cap it at maxDelay
          const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
          console.log(`Retry attempt ${attempt} for ${url}, waiting ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Try to load the image
        return await loadImage(url);
      } catch (error) {
        attempt++;
        lastError = error;
        console.warn(`Image load attempt ${attempt}/${maxRetries} failed for ${url}:`, error);
        
        // If we've reached the maximum number of retries, throw the last error
        if (attempt >= maxRetries) {
          console.error(`All ${maxRetries} attempts to load image failed:`, url);
          throw lastError;
        }
      }
    }
    
    // This should never be reached due to the throw in the loop, but just in case
    throw lastError || new Error(`Failed to load image after ${maxRetries} attempts`);
  };

  /**
   * Loads an image using the Image object approach
   * @param {string} url - The image URL
   * @returns {Promise<HTMLImageElement>} - A promise that resolves to an Image object
   */
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve(img);
      };
      
      img.onerror = (error) => {
        console.error('Failed to load image:', url, error);
        reject(new Error(`Failed to load image: ${error}`));
      };
      
      // Set the source to start loading
      img.src = url;
    });
  };

  /**
   * Fetches an image using the fetch API
   * @param {string} url - The image URL
   * @returns {Promise<Blob>} - A promise that resolves to an image blob
   */
  const fetchImage = async (url) => {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'image/jpeg, image/png, image/*',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      return response.blob();
    } catch (error) {
      console.error('Failed to fetch image:', url, error);
      throw error;
    }
  };

  /**
   * Creates a data URL from a file for local preview
   * @param {File} file - The image file
   * @returns {Promise<string>} - A promise that resolves to a data URL
   */
  const createLocalImagePreview = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = (error) => {
        console.error('Failed to create local image preview:', error);
        reject(error);
      };
      
      reader.readAsDataURL(file);
    });
  };

  /**
   * Resizes an image to multiple sizes for optimization
   * @param {File} file - The image file to resize
   * @returns {Promise<Object>} - A promise that resolves to an object with different sized blob URLs
   */
  const resizeImageToMultipleSizes = async (file) => {
    try {
      // Create a bitmap from the file
      const bitmap = await createImageBitmap(file);
      
      // Define the sizes we want
      const sizes = {
        tiny: 100,    // 100x100 for map markers
        thumbnail: 200, // 200x200 for thumbnails
        medium: 400,  // 400x400 for medium previews
        large: 800    // 800x800 for modal views (reduced from 1200 to save memory)
      };
      
      // Create a canvas for resizing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Process each size
      const results = {};
      
      for (const [key, size] of Object.entries(sizes)) {
        // Set canvas size
        canvas.width = size;
        canvas.height = size;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate aspect ratio
        const aspectRatio = bitmap.width / bitmap.height;
        
        // Calculate dimensions to maintain aspect ratio
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        
        if (aspectRatio > 1) {
          // Landscape
          drawHeight = size;
          drawWidth = size * aspectRatio;
          offsetX = -(drawWidth - size) / 2;
        } else {
          // Portrait
          drawWidth = size;
          drawHeight = size / aspectRatio;
          offsetY = -(drawHeight - size) / 2;
        }
        
        // Draw the image centered
        ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
        
        // Get blob with appropriate quality
        const quality = key === 'tiny' ? 0.6 : 
                        key === 'thumbnail' ? 0.7 : 
                        key === 'medium' ? 0.75 : 0.8;
        
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', quality);
        });
        
        // Create a blob URL
        results[key] = URL.createObjectURL(blob);
        
        // Store the blob for later cleanup
        results[`${key}Blob`] = blob;
      }
      
      // Clean up
      bitmap.close();
      
      return results;
    } catch (error) {
      console.error('Failed to resize image:', error);
      throw error;
    }
  };
  
  /**
   * Revokes blob URLs to prevent memory leaks
   * @param {Object} urls - Object containing blob URLs to revoke
   */
  const revokeBlobUrls = (urls) => {
    if (!urls) return;
    
    // Revoke any blob URLs
    Object.entries(urls).forEach(([key, url]) => {
      if (typeof url === 'string' && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  };

  /**
   * Deletes a photo from Cloudinary
   * @param {string} url - The Cloudinary image URL or publicId
   * @returns {Promise<Object>} - A promise that resolves to the delete response
   */
  const deletePhoto = async (url, publicId) => {
    try {
      const headers = await getAuthHeaders();
      
      // If publicId is provided directly, use it
      if (publicId) {
        const response = await fetch(`${API_BASE}/delete`, {
          method: 'DELETE',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ publicId }),
          credentials: 'include'
        });
        
        return handleResponse(response);
      }
      
      // Otherwise, use the URL
      const encodedUrl = encodeURIComponent(url);
      
      const response = await fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: encodedUrl }),
        credentials: 'include'
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('[photoService] Delete error:', error);
      throw error;
    }
  };

  const getAllPhotos = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(API_BASE, {
        headers,
        credentials: 'include'
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('[photoService] Get all photos error:', error);
      throw error;
    }
  };

  /**
   * Compresses an original photo to reduce file size while maintaining quality
   * @param {File} file - The image file to compress
   * @param {number} maxSizeMB - Maximum target size in MB (default: 5)
   * @returns {Promise<File>} - A promise that resolves to a compressed File object
   */
  const compressOriginalPhoto = async (file, maxSizeMB = 5) => {
    // Skip small files that don't need compression
    if (file.size <= maxSizeMB * 1024 * 1024) {
      console.log(`[photoService] File ${file.name} already under ${maxSizeMB}MB, skipping compression`);
      return file;
    }
    
    console.log(`[photoService] Compressing ${file.name} (${(file.size/1024/1024).toFixed(2)}MB)...`);
    
    // Create image bitmap
    const bitmap = await createImageBitmap(file);
    
    // Calculate dimensions - reduce if extremely large
    let width = bitmap.width;
    let height = bitmap.height;
    const MAX_DIMENSION = 3000; // Cap at 3000px on longest side
    
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        height = Math.round(height * (MAX_DIMENSION / width));
        width = MAX_DIMENSION;
      } else {
        width = Math.round(width * (MAX_DIMENSION / height));
        height = MAX_DIMENSION;
      }
      console.log(`[photoService] Resized dimensions to ${width}x${height}`);
    }
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    // Draw image to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    
    // Start with higher quality
    let quality = 0.92;
    let blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    
    // If still too large, reduce quality until under target size
    // but don't go below 0.7 to maintain good quality
    while (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.7) {
      quality -= 0.05; // Smaller steps for finer control
      blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });
    }
    
    // Create new file object
    const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
    
    console.log(`[photoService] Compressed ${file.name} from ${(file.size/1024/1024).toFixed(2)}MB to ${(compressedFile.size/1024/1024).toFixed(2)}MB (quality: ${quality.toFixed(2)})`);
    
    // Clean up
    bitmap.close();
    
    return compressedFile;
  };

  return {
    uploadPhoto: (file) => uploadPhotoWithRetry(file),
    uploadPhotoWithProgress: uploadPhotoWithRetry,
    deletePhoto,
    getAllPhotos,
    extractMetadata,
    loadImage,
    loadImageWithRetry,
    fetchImage,
    createLocalImagePreview,
    resizeImageToMultipleSizes,
    revokeBlobUrls,
    compressOriginalPhoto
  };
};
