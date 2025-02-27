# Direct-to-S3 Upload Implementation Plan

## Why We Need This

Currently, our photo upload functionality is failing in the serverless environment due to issues with multipart form data parsing. The current approach attempts to:

1. Send files from the frontend to our serverless function
2. Parse the multipart form data in the serverless function
3. Upload the file to S3 from the serverless function

This approach has several critical problems in a serverless environment:

- **Serverless Function Limitations**: Serverless functions have size and time limits that make handling large file uploads problematic
- **Multipart Form Data Parsing**: The express-fileupload middleware doesn't work reliably in serverless environments
- **Hybrid Implementation**: Our current "hybrid" approach tries to adapt Express patterns to serverless, creating compatibility issues

The error logs show that while our manual parsing detects files, it fails to correctly identify them with the field name "photo" that the handler expects.

## The Solution: Direct-to-S3 Uploads

Instead of trying to fix the broken middleware approach, we'll implement a more modern and reliable pattern: direct-to-S3 uploads. This approach:

1. **Bypasses the serverless function** for the actual file transfer
2. **Leverages S3 presigned URLs** for secure direct uploads
3. **Follows serverless best practices** rather than trying to adapt Express patterns

This is not only more reliable but also more efficient and cost-effective.

## Implementation Plan

### 1. Backend Changes (api/photos/index.js)

The good news is that most of the backend infrastructure is already in place. We have:

- A `getPresignedUploadUrl` function in `api/lib/storage.js`
- A route handler for presigned URLs in `api/photos/index.js`

We just need to ensure these are working correctly and make any necessary adjustments.

#### Tasks:

- Verify the presigned URL generation endpoint is working correctly
- Ensure the endpoint returns all necessary information (URL, key, fields)
- Add proper error handling and logging
- Configure CORS for the S3 bucket to allow direct uploads

### 2. Frontend Changes

#### 2.1. Update photoService.js

Modify `src/features/photo/services/photoService.js` to use the presigned URL approach with enhanced features:

```javascript
/**
 * Extracts metadata from an image file
 * @param {File} file - The image file
 * @returns {Promise<Object>} - The extracted metadata
 */
const extractMetadata = async (file) => {
  // Implementation depends on what library you're using for metadata extraction
  // This is a placeholder for the actual implementation
  return new Promise((resolve) => {
    // For example, you might use the FileReader API to extract EXIF data
    const reader = new FileReader();
    reader.onload = (event) => {
      // Extract metadata from event.target.result
      // For now, we'll just return a placeholder
      resolve({
        gps: null, // Will be populated with actual GPS data
        timestamp: new Date().toISOString()
      });
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Processes an image before upload (resize, compress)
 * @param {File} file - The image file
 * @param {Object} options - Processing options
 * @returns {Promise<Blob>} - The processed image
 */
const processImage = async (file, options = {}) => {
  // This would be implemented with a library like browser-image-compression
  // For now, we'll just return the original file
  return file;
};

/**
 * Generates a thumbnail from an image file
 * @param {File} file - The image file
 * @param {Object} options - Thumbnail options
 * @returns {Promise<Blob>} - The thumbnail image
 */
const generateThumbnail = async (file, options = {}) => {
  // This would be implemented with a library like browser-image-compression
  // For now, we'll just return the original file
  return file;
};

/**
 * Uploads a photo with retry logic
 * @param {File} file - The image file to upload
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Upload options
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Object>} - The upload result
 */
const uploadWithRetry = async (file, onProgress, options = {}, maxRetries = 3) => {
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

/**
 * Uploads a photo to S3 directly using presigned URLs
 * @param {File} file - The image file to upload
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - The upload result with URLs
 */
const uploadPhoto = async (file, onProgress, options = {}) => {
  try {
    // Default options
    const { 
      maxWidth = 2048, 
      quality = 0.9, 
      generateThumbnail: shouldGenerateThumbnail = true 
    } = options;
    
    // Process image before upload (resize, compress)
    const processedFile = await processImage(file, { maxWidth, quality });
    
    // Extract metadata (GPS coordinates, etc.)
    const metadata = await extractMetadata(file);
    
    // Generate thumbnail if needed
    let thumbnailFile;
    if (shouldGenerateThumbnail) {
      thumbnailFile = await generateThumbnail(file, { width: 300, quality: 0.8 });
    }
    
    // Step 1: Get a presigned URL from our API
    const response = await fetch(`${API_BASE}?presigned=true`, {
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
    
    const { url, key } = await handleResponse(response);
    
    // Step 2: Upload directly to S3 using the presigned URL with progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
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
          // Step 3: Construct the final URLs
          const fileUrl = `https://${process.env.VITE_AWS_S3_BUCKET}.s3.${process.env.VITE_AWS_REGION}.amazonaws.com/${key}`;
          
          // For thumbnails, we could either generate them on the fly or use a naming convention
          const thumbnailUrl = thumbnailFile 
            ? `https://${process.env.VITE_AWS_S3_BUCKET}.s3.${process.env.VITE_AWS_REGION}.amazonaws.com/thumbnails/${key}`
            : fileUrl;
          
          // If we have a thumbnail, upload it too
          if (thumbnailFile) {
            // This would be implemented to upload the thumbnail
            // For now, we'll just resolve with the main file URL
          }
          
          resolve({ url: fileUrl, thumbnailUrl, metadata });
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
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.timeout = 30000; // 30 second timeout
      xhr.send(processedFile);
    });
  } catch (error) {
    console.error('[photoService] Upload error:', error);
    throw error;
  }
};

// Export the main function that will be used by components
export const uploadPhotoWithProgress = (file, onProgress, options) => {
  return uploadWithRetry(file, onProgress, options);
};
```

#### 2.2. Update PhotoUploader.tsx

The `PhotoUploader.tsx` component will need to be updated to support progress tracking:

```javascript
// Example of how to update the PhotoUploader component
const handleFileUpload = async (file) => {
  setIsUploading(true);
  setUploadProgress(0);
  
  try {
    const result = await photoService.uploadPhotoWithProgress(
      file,
      (progressEvent) => {
        if (progressEvent.type === 'progress') {
          setUploadProgress(progressEvent.percent);
        } else if (progressEvent.type === 'retry') {
          // Show retry notification
          setUploadStatus(`Retrying upload (${progressEvent.attempt}/${progressEvent.maxRetries})...`);
        }
      },
      { maxWidth: 2048, quality: 0.9 }
    );
    
    // Handle successful upload
    onPhotoUploaded(result);
    setIsUploading(false);
    setUploadProgress(0);
  } catch (error) {
    // Handle upload error
    setUploadError(error.message);
    setIsUploading(false);
    setUploadProgress(0);
  }
};
```

### 3. S3 Bucket CORS Configuration

To allow direct uploads from the browser to S3, we need to configure CORS on the S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET", "DELETE"],
    "AllowedOrigins": [
      "https://your-production-domain.com", 
      "https://your-staging-domain.vercel.app", 
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag", "x-amz-meta-*"]
  }
]
```

This configuration should be applied to your S3 bucket through the AWS Management Console or using the AWS CLI:

```bash
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://cors-config.json
```

### 4. Security Considerations

#### 4.1. Presigned URL Security

- **Short Expiration Times**: Set presigned URLs to expire quickly (5-15 minutes)
- **Content Type Validation**: Validate content types server-side before generating presigned URLs
- **Size Limits**: Implement size limits for uploads
- **Path Restrictions**: Restrict the paths where files can be uploaded

```javascript
// Example of how to implement these security measures in api/photos/index.js
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// In your presigned URL generation endpoint
if (!ALLOWED_MIME_TYPES.includes(req.body.contentType)) {
  return res.status(400).json({ error: 'Invalid file type' });
}

if (req.body.size && req.body.size > MAX_FILE_SIZE) {
  return res.status(400).json({ error: 'File too large' });
}

const presignedUrl = await getPresignedUploadUrl({
  contentType: req.body.contentType,
  key: `uploads/${userId}/${Date.now()}-${req.body.filename}`,
  expiresIn: 900 // 15 minutes
});
```

#### 4.2. Authentication

Ensure that only authenticated users can request presigned URLs:

```javascript
// In api/photos/index.js
if (!req.user) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### 5. Error Handling Edge Cases

#### 5.1. Timeout Handling

If the presigned URL expires during upload:

```javascript
// In photoService.js
const uploadPhoto = async (file, onProgress, options = {}) => {
  try {
    // ... existing code ...
    
    // Set a timeout that's shorter than the presigned URL expiration
    xhr.timeout = Math.min(options.timeout || 900000, 900000); // Default 15 minutes, max 15 minutes
    
    // ... existing code ...
  } catch (error) {
    // If we get a 403 Forbidden error, the URL might have expired
    if (error.message.includes('403')) {
      throw new Error('Upload URL expired. Please try again.');
    }
    throw error;
  }
};
```

#### 5.2. Partial Upload Recovery

For large files, implement resumable uploads:

```javascript
// This would be a more advanced implementation using the S3 multipart upload API
// For now, we're just using retry logic for simplicity
```

#### 5.3. Cleanup for Failed Uploads

If metadata recording fails after a successful upload:

```javascript
// In api/photos/index.js
try {
  // Record metadata in database
  await recordPhotoMetadata(userId, key, metadata);
} catch (error) {
  // If metadata recording fails, delete the uploaded file
  await deleteS3Object(key);
  throw error;
}
```

### 6. Testing Plan

1. **Local Testing**:
   - Test with small files (< 1MB)
   - Test with medium files (1-10MB)
   - Test with large files (> 10MB)
   - Test with various image formats (JPEG, PNG, HEIC, WebP, etc.)
   - Test with slow network connections
   - Test with connection interruptions during upload

2. **Error Handling**:
   - Test with invalid file types
   - Test with files exceeding size limits
   - Test with network interruptions
   - Test with S3 permission issues
   - Test with expired presigned URLs

3. **Integration Testing**:
   - Verify that uploaded photos appear correctly in the UI
   - Verify that GPS data extraction still works
   - Verify that photo deletion works correctly
   - Verify that progress indicators work correctly
   - Verify that retry logic works correctly

### 7. Rollout Strategy

1. **Development Environment**:
   - Implement and test in the development environment first
   - Fix any issues discovered during testing

2. **Staging Environment**:
   - Deploy to staging and perform thorough testing
   - Gather feedback from team members

3. **Production Environment**:
   - Deploy to production
   - Monitor for any issues
   - Be prepared to roll back if necessary

### 8. Implementation Order

1. Basic direct upload functionality
2. CORS configuration and security measures
3. Comprehensive error handling
4. Progress tracking
5. Client-side image processing and optimization
6. Retry logic

## Timeline

- **Basic Implementation**: 2-3 hours
- **Enhanced Features**: 3-4 hours
- **Testing**: 2-3 hours
- **Deployment**: 1 hour
- **Total**: 8-11 hours

## Future Improvements

Once this implementation is stable, we could consider:

1. **Advanced Client-side Image Processing**:
   - More sophisticated thumbnail generation
   - EXIF data preservation
   - Image compression options based on network conditions

2. **Resumable Uploads**:
   - Implement true resumable uploads using S3 multipart upload API
   - Allow pausing and resuming uploads

3. **Batch Uploads**:
   - Optimize for uploading multiple files simultaneously
   - Implement parallel uploads for better performance
   - Add queue management for large batches

4. **User Experience Enhancements**:
   - Drag and drop interface
   - Upload cancellation
   - Better progress visualization
   - Offline queue for uploads when connectivity is restored

## Avoiding Similar Issues in the Future

To avoid similar issues in the future, we should update our migration strategy to identify and replace "hybrid" approaches that try to adapt traditional server patterns to serverless environments. Specifically:

1. **File Handling**: Always use direct-to-cloud uploads for files in serverless environments
2. **State Management**: Avoid in-memory state in serverless functions
3. **Long-Running Processes**: Replace with event-driven or polling approaches
4. **Express Middleware**: Be cautious with Express middleware in serverless functions

These principles should be documented in our migration guide to prevent similar issues in other parts of the application.
