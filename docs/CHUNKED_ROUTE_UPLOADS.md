# Chunked Route Uploads

## Overview

This document describes the implementation of chunked uploads for route data in the Lutruwita application. The chunked upload system allows the application to save large route data (>500KB) by breaking it into smaller chunks, avoiding Vercel's payload size limitations.

## Problem

Vercel serverless functions have a payload size limit of approximately 800KB. When saving complex routes with multiple segments, detailed elevation data, and many POIs, the payload can exceed this limit, resulting in 413 "Request Entity Too Large" errors.

## Solution

The solution is to implement a chunked upload system that:

1. Detects large payloads on the client side
2. Splits them into manageable chunks (500KB each)
3. Uploads each chunk separately
4. Reassembles the chunks on the server side

## Implementation

### Client-Side (routeService.js)

1. **Payload Size Detection**:
   ```javascript
   const jsonData = JSON.stringify(transformedData);
   const payloadSizeInBytes = new Blob([jsonData]).size;
   
   // If payload is larger than 500KB, use chunked upload
   if (payloadSizeInBytes > 500 * 1024) {
     return await saveRouteChunked(transformedData, persistentId);
   }
   ```

2. **Chunking Process**:
   ```javascript
   // Create chunks of 500KB each
   const chunkSize = 500 * 1024;
   const totalChunks = Math.ceil(jsonData.length / chunkSize);
   const chunks = [];
   
   for (let i = 0; i < totalChunks; i++) {
     const start = i * chunkSize;
     const end = Math.min(start + chunkSize, jsonData.length);
     chunks.push(jsonData.slice(start, end));
   }
   ```

3. **Upload Process**:
   - Start a session: `POST /api/routes/chunked/start`
   - Upload each chunk: `POST /api/routes/chunked/upload`
   - Complete the upload: `POST /api/routes/chunked/complete`

### Server-Side (api/routes/index.js)

1. **Session Management**:
   - Creates a unique session ID for each chunked upload
   - Stores session metadata in Redis/Vercel KV or in-memory fallback
   - Tracks received chunks and validates completeness

2. **Chunk Storage**:
   - Stores each chunk in Redis/Vercel KV or in-memory fallback
   - Uses a consistent key pattern: `chunked:{sessionId}:chunk:{index}`

3. **Reassembly Process**:
   - Retrieves all chunks in order
   - Concatenates them into a complete JSON string
   - Parses the JSON and processes it using existing route handlers

4. **Serverless Optimizations**:
   - Implements in-memory fallback when Redis is unavailable
   - Uses proper cleanup to prevent resource leaks
   - Handles connection issues gracefully

## API Endpoints

### 1. Start Chunked Upload

**Endpoint**: `POST /api/routes/chunked/start`

**Request Body**:
```json
{
  "persistentId": "optional-existing-route-id",
  "totalChunks": 5,
  "totalSize": 2500000,
  "isUpdate": false
}
```

**Response**:
```json
{
  "sessionId": "1741774469228-vpwj77pu"
}
```

### 2. Upload Chunk

**Endpoint**: `POST /api/routes/chunked/upload`

**Request Body**:
```json
{
  "sessionId": "1741774469228-vpwj77pu",
  "chunkIndex": 0,
  "data": "chunk-data-as-string"
}
```

**Response**:
```json
{
  "success": true,
  "receivedChunks": 1,
  "totalChunks": 5
}
```

### 3. Complete Chunked Upload

**Endpoint**: `POST /api/routes/chunked/complete`

**Request Body**:
```json
{
  "sessionId": "1741774469228-vpwj77pu"
}
```

**Response**: Same as regular route creation/update response

## Error Handling

The implementation includes robust error handling:

1. **Session Expiration**: Sessions expire after 1 hour to prevent resource leaks
2. **Missing Chunks**: Validates that all chunks are received before processing
3. **Redis Failures**: Falls back to in-memory storage when Redis is unavailable
4. **JSON Parsing Errors**: Validates reassembled data before processing

## Vercel Configuration

The `vercel.json` file includes route configurations to properly handle the chunked upload endpoints:

```json
{
  "src": "/api/routes/chunked/(.*)",
  "dest": "/api/routes"
}
```

This ensures that all chunked upload requests are routed to the main routes API handler.

## Benefits

1. **Unlimited Route Size**: Users can now save routes of any size
2. **Improved Reliability**: Reduces failures due to payload size limitations
3. **Serverless Compatibility**: Works within Vercel's serverless constraints
4. **Graceful Degradation**: Falls back to in-memory storage when Redis is unavailable

## Future Improvements

1. **Progress Tracking**: Add UI progress indicators for large uploads
2. **Resumable Uploads**: Allow resuming interrupted uploads
3. **Chunk Compression**: Compress chunks to reduce bandwidth usage
4. **Parallel Uploads**: Upload multiple chunks in parallel for faster uploads
