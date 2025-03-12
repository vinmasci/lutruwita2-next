# Chunked Upload MongoDB Fallback

## Overview

This document describes the implementation of a MongoDB fallback for the chunked upload system in the Lutruwita application. The fallback ensures that chunked uploads work reliably in serverless environments like Vercel, where in-memory storage is not persistent across function invocations and Redis connections may be unreliable.

## Problem

In serverless environments, each API request is handled by a separate function invocation. This means that in-memory storage (using `global.memoryStorage`) is not shared between these invocations. When Redis is unavailable, the chunked upload system would fail because:

1. The first chunk would be stored in memory
2. When the second chunk is uploaded, it's a new function invocation with a fresh memory state
3. The session information from the first chunk is lost, resulting in a 404 "Upload session not found or expired" error

## Solution

The solution is to implement a three-tier storage system for chunked uploads:

1. **Redis** (Primary): Fast, shared storage for all function invocations
2. **MongoDB** (Secondary): Persistent, shared storage when Redis is unavailable
3. **In-memory** (Tertiary): Last resort fallback within a single function invocation

This ensures that even if Redis is unavailable, the chunked upload system can still function reliably using MongoDB as a fallback.

## Implementation

### MongoDB Schemas

Two new MongoDB schemas were created to store chunked upload data:

1. **ChunkedUploadSession**: Stores session metadata
   ```javascript
   const ChunkedUploadSessionSchema = new mongoose.Schema({
     sessionId: { type: String, required: true, unique: true, index: true },
     persistentId: { type: String },
     totalChunks: { type: Number, required: true },
     totalSize: { type: Number, required: true },
     receivedChunks: { type: Number, default: 0 },
     isUpdate: { type: Boolean, default: false },
     chunks: { type: Map, of: Boolean, default: new Map() },
     createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-expire after 1 hour
   });
   ```

2. **ChunkedUploadChunk**: Stores chunk data
   ```javascript
   const ChunkedUploadChunkSchema = new mongoose.Schema({
     sessionId: { type: String, required: true, index: true },
     chunkIndex: { type: Number, required: true },
     data: { type: String, required: true },
     createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-expire after 1 hour
   });
   ```

Both schemas include a TTL index on the `createdAt` field to automatically expire documents after 1 hour, preventing database bloat.

### Helper Functions

Four helper functions were created to abstract the storage operations:

1. **getSessionInfo**: Retrieves session info from Redis, MongoDB, or memory
   ```javascript
   async function getSessionInfo(sessionId) {
     // Try Redis first
     let sessionInfo = await getCache(`chunked:${sessionId}:info`);
     if (sessionInfo) {
       return { sessionInfo, source: 'redis' };
     }
     
     // Try MongoDB next
     try {
       const session = await ChunkedUploadSession.findOne({ sessionId });
       if (session) {
         // Convert MongoDB document to plain object
         sessionInfo = session.toObject();
         // Convert Map to plain object for chunks
         sessionInfo.chunks = Object.fromEntries(session.chunks);
         return { sessionInfo, source: 'mongodb' };
       }
     } catch (error) {
       console.error('[API] Error getting session from MongoDB:', error);
     }
     
     // Try memory storage last
     if (memoryStorage.sessions[sessionId]) {
       return { sessionInfo: memoryStorage.sessions[sessionId], source: 'memory' };
     }
     
     // Session not found in any storage
     return { sessionInfo: null, source: null };
   }
   ```

2. **storeSessionInfo**: Stores session info in Redis, MongoDB, or memory
   ```javascript
   async function storeSessionInfo(sessionId, sessionInfo) {
     // Try Redis first
     const redisSuccess = await setCache(`chunked:${sessionId}:info`, sessionInfo, 3600);
     
     // If Redis successful, return
     if (redisSuccess) {
       return { success: true, source: 'redis' };
     }
     
     // Try MongoDB next
     try {
       // Convert chunks object to Map for MongoDB
       const chunksMap = new Map(Object.entries(sessionInfo.chunks));
       
       // Create or update session in MongoDB
       await ChunkedUploadSession.findOneAndUpdate(
         { sessionId },
         { 
           ...sessionInfo,
           chunks: chunksMap
         },
         { upsert: true, new: true }
       );
       
       return { success: true, source: 'mongodb' };
     } catch (error) {
       console.error('[API] Error storing session in MongoDB:', error);
     }
     
     // Fall back to memory storage
     memoryStorage.sessions[sessionId] = sessionInfo;
     return { success: true, source: 'memory' };
   }
   ```

3. **getChunkData**: Retrieves chunk data from Redis, MongoDB, or memory
4. **storeChunkData**: Stores chunk data in Redis, MongoDB, or memory

### Handler Updates

The chunked upload handlers were updated to use these helper functions:

1. **handleStartChunkedUpload**: Creates a new upload session
2. **handleUploadChunk**: Processes an individual chunk
3. **handleCompleteChunkedUpload**: Reassembles and processes the complete data

## Benefits

1. **Improved Reliability**: Chunked uploads now work reliably even when Redis is unavailable
2. **Graceful Degradation**: The system falls back to MongoDB when Redis fails
3. **Automatic Cleanup**: TTL indexes ensure that temporary data is automatically cleaned up
4. **Consistent API**: The API behavior remains the same from the client's perspective

## Testing

To test the MongoDB fallback:

1. Disable Redis in the environment (set `REDIS_URL` to an invalid value)
2. Upload a large route (>800KB)
3. Verify that all chunks are successfully uploaded and processed
4. Check the MongoDB database for temporary documents (they should be automatically cleaned up after 1 hour)

## Future Improvements

1. **Monitoring**: Add metrics to track which storage tier is being used
2. **Compression**: Compress chunk data to reduce storage requirements
3. **Batch Operations**: Use batch operations for cleaning up multiple chunks
4. **Sharding**: Consider sharding for very large uploads if needed
