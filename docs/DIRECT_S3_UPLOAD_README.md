# Direct-to-S3 Upload Implementation

This document provides an overview of the direct-to-S3 upload implementation and instructions for testing and using it.

## Overview

We've implemented a direct-to-S3 upload approach for photo uploads, which bypasses the serverless function for the actual file transfer. This approach:

1. **Improves reliability**: Avoids issues with multipart form data parsing in serverless environments
2. **Enhances performance**: Uploads go directly from the client to S3, reducing server load
3. **Reduces costs**: Serverless function execution time and data transfer costs are minimized
4. **Supports large files**: Bypasses serverless function size and time limits

## Implementation Details

### Backend Changes

1. **Presigned URL Generation**: The API now provides presigned URLs for direct uploads to S3
   - Endpoint: `POST /api/photos?presigned=true`
   - Request body: `{ filename: string, contentType: string, metadata?: object }`
   - Response: `{ url: string, key: string, metadata: object }`

2. **Security Measures**:
   - Content type validation
   - Short expiration times for presigned URLs (15 minutes)
   - Authentication required for presigned URL generation

### Frontend Changes

1. **Upload Process**:
   - Request a presigned URL from the API
   - Upload the file directly to S3 using the presigned URL
   - Track upload progress and display it to the user

2. **Enhanced Features**:
   - Progress tracking with visual feedback
   - Retry logic with exponential backoff
   - Error handling for various failure scenarios

## Testing the Implementation

### Prerequisites

1. AWS S3 bucket with proper CORS configuration (see [S3_CORS_CONFIGURATION.md](./S3_CORS_CONFIGURATION.md))
2. AWS credentials with permission to upload to the bucket
3. Environment variables set up correctly:
   - `VITE_AWS_S3_BUCKET` or `S3_BUCKET_NAME`: The name of your S3 bucket
   - `VITE_AWS_REGION` or `AWS_REGION`: The AWS region of your S3 bucket
   - `VITE_AWS_ACCESS_KEY_ID` or `AWS_ACCESS_KEY_ID`: Your AWS access key ID
   - `VITE_AWS_SECRET_ACCESS_KEY` or `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key

### Using the Test Script

We've provided a test script that verifies the direct-to-S3 upload functionality:

1. Install the required dependencies:
   ```bash
   npm install node-fetch@3
   ```

   Note: node-fetch v3 is an ESM-only package, which is compatible with this project's ESM setup.

2. Start the development server:
   ```bash
   npm run dev
   ```

3. In a separate terminal, run the test script:
   ```bash
   node test-direct-upload.js
   ```

4. The script will:
   - Get a presigned URL from the API
   - Upload a test image directly to S3
   - Verify that the upload was successful

   Note: The test script connects to the local development server at http://localhost:3000, so make sure the server is running before executing the script.

### Testing in the UI

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the application in your browser
3. Navigate to the photo upload section
4. Upload a photo and observe:
   - The progress bar showing upload progress
   - The photo appearing in the UI after successful upload

## Troubleshooting

### CORS Issues

If you encounter CORS errors when uploading directly to S3, check:

1. Your S3 bucket CORS configuration (see [S3_CORS_CONFIGURATION.md](./S3_CORS_CONFIGURATION.md))
2. The origin of your application matches the allowed origins in the CORS configuration
3. The HTTP/HTTPS protocol matches

### Authentication Issues

If you encounter authentication errors:

1. Check that your AWS credentials are correct
2. Verify that the credentials have permission to upload to the bucket
3. Check that the bucket name and region are correct

### Upload Failures

If uploads fail:

1. Check the browser console for error messages
2. Verify that the presigned URL is being generated correctly
3. Check that the content type of the file matches the content type specified in the presigned URL request
4. Verify that the file size is within the limits of your S3 bucket configuration

## Future Improvements

1. **Client-side Image Processing**:
   - Resize and compress images before upload
   - Generate thumbnails client-side

2. **Resumable Uploads**:
   - Implement true resumable uploads using S3 multipart upload API
   - Allow pausing and resuming uploads

3. **Batch Uploads**:
   - Optimize for uploading multiple files simultaneously
   - Implement parallel uploads for better performance

## References

- [AWS S3 Presigned URLs Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [AWS S3 CORS Configuration Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [Original Implementation Plan](./DIRECT_S3_UPLOAD_IMPLEMENTATION.md)
