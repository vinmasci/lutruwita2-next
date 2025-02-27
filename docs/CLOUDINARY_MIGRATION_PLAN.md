# Cloudinary Migration Plan for Photo Upload System

## Overview

This document outlines the plan to migrate the current AWS S3-based photo upload system to Cloudinary. This migration will solve the CORS issues, simplify the upload process, and provide better integration with Vercel's serverless architecture.

## Why Cloudinary for Vercel

Cloudinary is an ideal solution for Vercel deployments for several reasons:

1. **Serverless-Friendly Architecture**
   - Direct browser-to-cloud uploads reduce serverless function load
   - Simpler authentication flow compared to S3 presigned URLs
   - Fewer cold start issues with lightweight Cloudinary SDK

2. **Built-in Image Transformations**
   - Automatic thumbnail generation without custom code
   - On-the-fly image resizing and optimization
   - Automatic format optimization based on browser capabilities

3. **Simplified Environment Setup**
   - Fewer environment variables to manage
   - No complex CORS configuration required
   - Pre-configured CDN with global edge locations

4. **Global CDN Integration**
   - Complements Vercel's edge network
   - Faster image loading for users worldwide
   - Automatic optimization for different devices

5. **Reduced API Complexity**
   - Simpler API with better documentation
   - Fewer moving parts means fewer potential failure points
   - Better error handling and retry mechanisms

## Migration Plan

### Phase 1: Setup & Configuration

- [ ] **Create Cloudinary Account**
   - Sign up for Cloudinary (free tier available)
   - Create a cloud name, API key, and API secret
   - Configure upload presets for automatic transformations:
     - Main images: max 2048x2048, 80% quality
     - Thumbnails: 800x800, 70% quality

- [ ] **Update Environment Variables**
   - Add to `.env` and `.env.local`:
     ```
     # Backend variables
     CLOUDINARY_CLOUD_NAME=dig9djqnj
     CLOUDINARY_API_KEY=682837882671547
     CLOUDINARY_API_SECRET=1-yg9KSGYSSQzM2V9AuzWkBholk
     CLOUDINARY_URL=cloudinary://682837882671547:1-yg9KSGYSSQzM2V9AuzWkBholk@dig9djqnj
     
     # Frontend variables (for Vite)
     VITE_CLOUDINARY_CLOUD_NAME=dig9djqnj
     VITE_CLOUDINARY_API_KEY=682837882671547
     ```
   - Add to Vercel project settings for production
   - Update `.env.vercel.template` with new variables

- [ ] **Install Dependencies**
   - Add Cloudinary packages:
     ```
     npm install cloudinary cloudinary-react
     ```

### Phase 2: Backend Implementation

- [ ] **Create Cloudinary Utility Module**
   - Create `api/lib/cloudinary.js` to replace `api/lib/storage.js`
   - Implement core functions:
     - `generateUploadSignature` - For client-side uploads
     - `uploadFile` - For server-side uploads
     - `deleteFile` - For removing images
     - `generateThumbnailUrl` - For creating thumbnail URLs

- [ ] **Update API Endpoints**
   - Modify `api/photos/index.js` to use Cloudinary instead of S3:
     - Update `handleGetPresignedUrl` to generate Cloudinary signatures
     - Update `handleUploadPhoto` to use Cloudinary upload
     - Update `handleDeletePhoto` to use Cloudinary delete
     - Update URL construction for images and thumbnails

- [ ] **Create Test Script**
   - Create `test-cloudinary-upload.js` similar to existing `test-direct-upload.js`
   - Test direct uploads to Cloudinary
   - Verify thumbnail generation and transformations

### Phase 3: Frontend Service Changes

- [ ] **Update Photo Service**
   - Modify `src/features/photo/services/photoService.js`:
     - Replace S3 upload logic with Cloudinary upload
     - Update URL construction for images and thumbnails
     - Implement Cloudinary's transformation URLs
     - Update error handling and retry logic

- [ ] **Implement Direct Upload to Cloudinary**
   - Replace the current XHR upload with Cloudinary's upload
   - Update progress tracking to work with Cloudinary's API
   - Implement proper error handling and retries

- [ ] **Update Image Loading Functions**
   - Update `loadImageFromS3` to work with Cloudinary URLs
   - Update `fetchImageFromS3` to work with Cloudinary URLs
   - Implement Cloudinary's responsive image loading

### Phase 4: UI Component Updates

- [ ] **Update PhotoUploader Component**
   - Modify `src/features/photo/components/Uploader/PhotoUploader.js`:
     - Update upload flow to work with Cloudinary
     - Keep the same user experience and loading states
     - Update the URL handling for thumbnails and full images

- [ ] **Update PhotoUploaderUI Component**
   - Ensure it works with the new URL structure from Cloudinary
   - Update image preview handling if needed
   - Keep the same UI experience

- [ ] **Update PhotoMarker Component**
   - Modify `src/features/photo/components/PhotoMarker/PhotoMarker.js`:
     - Update image loading to work with Cloudinary URLs
     - Implement responsive image loading if needed

- [ ] **Update PhotoCluster Component**
   - Modify `src/features/photo/components/PhotoCluster/PhotoCluster.js`:
     - Update image loading to work with Cloudinary URLs
     - Ensure clustering works with new URL structure

### Phase 5: Database Updates

- [ ] **Update Photo Schema**
   - Add Cloudinary-specific fields to the Photo schema:
     - `publicId` - Cloudinary's public ID for the image
     - `version` - Cloudinary's version number
     - Keep existing fields for backward compatibility

- [ ] **Create Migration Script**
   - Create a script to migrate existing S3 photos to Cloudinary
   - Update database records with new Cloudinary URLs
   - Implement batching to handle large numbers of photos

### Phase 6: Testing & Deployment

- [ ] **Test All Functionality**
   - Test uploading images with and without GPS data
   - Test thumbnail generation and transformations
   - Test error handling and retries
   - Test deleting images
   - Test image loading in different components

- [ ] **Performance Testing**
   - Compare load times between S3 and Cloudinary
   - Test with different network conditions
   - Test with different device types

- [ ] **Deploy to Staging**
   - Deploy to a staging environment
   - Verify all functionality works in production-like environment
   - Test with real users if possible

- [ ] **Deploy to Production**
   - Update production environment variables
   - Deploy new code to production
   - Monitor for any issues

## Implementation Details

### Cloudinary Utility Module (`api/lib/cloudinary.js`)

```javascript
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Alternative configuration using CLOUDINARY_URL
// cloudinary.config(); // This will automatically use CLOUDINARY_URL if present

// Generate a signature for direct upload
export function generateUploadSignature(params = {}) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // Create the string to sign
  const toSign = {
    timestamp,
    folder: 'uploads',
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

// Upload a file to Cloudinary
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
          thumbnailUrl: cloudinary.url(result.public_id, {
            width: 800,
            height: 800,
            crop: 'fill',
            quality: 70,
            format: 'auto'
          })
        });
      }
    ).end(fileBuffer);
  });
}

// Delete a file from Cloudinary
export async function deleteFile(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

// Generate a thumbnail URL
export function generateThumbnailUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    width: options.width || 800,
    height: options.height || 800,
    crop: 'fill',
    quality: options.quality || 70,
    format: 'auto'
  });
}
```

### Updated Photo Service (`src/features/photo/services/photoService.js`)

```javascript
import { useAuth0 } from '@auth0/auth0-react';
import exifr from 'exifr';

export const usePhotoService = () => {
  const { getAccessTokenSilently } = useAuth0();
  
  const API_BASE = '/api/photos';
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

  // ... existing auth and response handling code ...

  /**
   * Uploads a photo to Cloudinary directly
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
      
      // Step 1: Get a signature from our API
      const response = await fetch(`${API_BASE}?signature=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          metadata
        }),
        credentials: 'include'
      });
      
      const { signature, timestamp, apiKey, cloudName } = await handleResponse(response);
      
      // Step 2: Upload directly to Cloudinary with progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        
        // Add required parameters
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('folder', 'uploads');
        
        // Add metadata as context
        if (metadata.gps) {
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
            const result = JSON.parse(xhr.responseText);
            
            // Construct the URLs
            const url = result.secure_url;
            const thumbnailUrl = url.replace('/upload/', '/upload/w_800,h_800,c_fill,q_70/');
            
            // Notify progress callback of completion
            if (onProgress) {
              onProgress({
                type: 'complete',
                url
              });
            }
            
            resolve({ 
              url, 
              thumbnailUrl,
              publicId: result.public_id,
              metadata
            });
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
        xhr.open('POST', CLOUDINARY_UPLOAD_URL);
        xhr.timeout = 30000; // 30 second timeout
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

  // ... rest of the service with updated methods for Cloudinary ...

  return {
    // ... existing methods ...
  };
};
```

## Advantages Over S3

1. **Simplified Upload Process**
   - No need to generate complex presigned URLs
   - Direct browser-to-Cloudinary uploads
   - Built-in progress tracking and error handling

2. **Better Image Optimization**
   - Automatic format selection based on browser support
   - Responsive images with dynamic resizing
   - Better compression algorithms

3. **Improved Performance**
   - Global CDN with edge locations worldwide
   - Faster image loading times
   - Reduced bandwidth usage

4. **Enhanced Reliability**
   - No CORS issues to troubleshoot
   - Simpler authentication flow
   - Better error handling and retry mechanisms

5. **Vercel Integration**
   - Works seamlessly with Vercel's serverless architecture
   - Reduced function size and complexity
   - Lower memory usage and faster cold starts

## Rollback Plan

If issues occur with the Cloudinary implementation:

1. Keep both S3 and Cloudinary code paths initially
2. Add a feature flag to switch between implementations
3. If Cloudinary implementation fails, revert to S3 by toggling the feature flag
4. Once confident in Cloudinary implementation, remove S3 code path

## Future Enhancements

1. **Client-side Image Processing**
   - Resize and compress images before upload
   - Generate thumbnails client-side
   - Reduce bandwidth usage

2. **Advanced Image Features**
   - Implement face detection for better thumbnails
   - Add image filters and effects
   - Implement automatic tagging and categorization

3. **Video Support**
   - Extend to support video uploads
   - Implement video thumbnails and previews
   - Add video transcoding for different devices
