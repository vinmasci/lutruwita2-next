# Photo Storage Implementation

## Overview
We're implementing AWS S3 storage for photos to replace the current approach of storing base64 data URLs in MongoDB, which is causing buffer size issues.

## Changes Made

### Backend
1. Created new photo feature structure:
```
server/src/features/photo/
├── controllers/
│   └── photo.controller.ts    # Handles photo upload/delete requests
├── routes/
│   └── photo.routes.ts        # Defines API endpoints
└── services/
    └── photo.service.ts       # Handles S3 operations
```

2. Installed dependencies:
- aws-sdk: For S3 operations
- sharp: For image processing and compression
- multer: For handling file uploads

3. Implemented photo service with:
- Image compression (max 2048x2048, 80% JPEG quality)
- Thumbnail generation (800x800, 70% JPEG quality)
- S3 upload/delete operations

### Frontend
1. Created photo service:
```
src/features/photo/services/photoService.ts
```
- Handles API calls to upload/delete photos
- Uses Auth0 for authenticated requests

2. Updated PhotoUploader component:
- Removed local base64 conversion
- Now uploads directly to S3 via the new API
- Stores S3 URLs instead of base64 data

## Implementation Status

### ✅ Completed
1. Created photo feature structure with controllers, routes, and services
2. Installed required dependencies (aws-sdk, sharp)
3. Implemented S3 photo service with compression and thumbnails
4. Updated PhotoUploader component to use S3
5. Added AWS configuration to server/.env
6. Registered photo routes in server.ts
7. Fixed file size limits for photo uploads (increased to 100MB)
8. Added support for image file types (.jpg, .jpeg, .png, .heic)
9. Implemented EXIF orientation handling to ensure correct photo orientation
10. Tested and verified S3 upload functionality
11. Verified compression and thumbnail generation
12. Confirmed AWS credentials and S3 bucket configuration
13. Fixed coordinate handling in photo serialization/deserialization

### 🔄 In Progress
1. **Route Loading Issues**
   - Photos are successfully uploading to S3 and MongoDB
   - Photos appear in the database with correct coordinates
   - However, GPX routes are not loading properly after recent changes
   - Issue appears to be related to GeoJSON data handling during route loading
   - Investigating potential issues with:
     * GeoJSON serialization/deserialization in MongoDB
     * Route data transformation in RouteContext
     * Map style loading synchronization

   **Investigation Details (Feb 9, 2025)**:
   - Found that routes are loading from MongoDB with correct GeoJSON data
   - MongoDB data structure shows GeoJSON at `routes[0].geojson`
   - Issue identified in RouteLayer component's conditional rendering:
     ```typescript
     {currentRoute._type === 'loaded' && (
       <RouteLayer map={mapInstance.current} route={currentRoute} />
     )}
     ```
   - Routes weren't being marked as 'loaded' type correctly
   - Attempted fix using normalizeRoute utility:
     ```typescript
     const normalizedRoute = normalizeRoute(route);
     setCurrentRoute(normalizedRoute);
     ```
   - Fix didn't resolve the issue despite:
     * Proper data structure in MongoDB
     * GeoJSON being present in the response
     * Route state being set correctly
     * POIs and photos loading successfully
   - Next steps:
     * Further investigation of route type handling
     * Review MapView component's route rendering logic
     * Check for potential race conditions in style loading
     * Investigate why normalizeRoute utility isn't properly marking routes as 'loaded'
     * Add additional logging in RouteLayer component to track route type changes
     * Consider alternative approach to route type handling that doesn't rely on _type property
     * Review the entire route loading flow from MongoDB to map rendering

### ❌ Still To Do
1. Created photo feature structure with controllers, routes, and services
2. Installed required dependencies (aws-sdk, sharp)
3. Implemented S3 photo service with compression and thumbnails
4. Updated PhotoUploader component to use S3
5. Added AWS configuration to server/.env
6. Registered photo routes in server.ts
7. Fixed file size limits for photo uploads (increased to 100MB)
8. Added support for image file types (.jpg, .jpeg, .png, .heic)
9. Implemented EXIF orientation handling to ensure correct photo orientation
10. Tested and verified S3 upload functionality
11. Verified compression and thumbnail generation
12. Confirmed AWS credentials and S3 bucket configuration

### ❌ Still To Do
1. **Error Handling Improvements**
- Add better error handling for S3 upload failures
- Implement retry logic for failed uploads
- Add cleanup for partial uploads

2. **Migration**
- Create migration script for existing photos
- Move existing base64 photos to S3
- Update database records with new S3 URLs

## API Endpoints

### POST /api/photos/upload
- Accepts multipart form data with 'photo' field
- Returns: `{ url: string, thumbnailUrl: string }`

### DELETE /api/photos/delete
- Accepts: `{ url: string }`
- Returns: `{ message: string }`

## Implementation Details

### Image Processing
- Main images are resized to max 2048x2048
- Thumbnails are generated at 800x800
- JPEG compression: 80% for main, 70% for thumbnails
- Maintains aspect ratio during resizing

### Storage Structure
- Photos stored in S3 bucket under:
  - Main images: `photos/{uuid}.jpg`
  - Thumbnails: `photos/thumbnails/{uuid}-thumb.jpg`

### Security
- Uses Auth0 for API authentication
- S3 bucket should be private
- Signed URLs used for public access
