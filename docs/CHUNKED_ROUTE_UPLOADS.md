# Chunked Route Uploads for Vercel

## The Problem: 413 Request Entity Too Large

When saving larger route files to Vercel, we encounter a "413 Request Entity Too Large" error. This occurs because:

```
[Error] Failed to load resource: the server responded with a status of 413 () (save, line 0)
[Log] [routeService] Save response status: – 413 (index-BvI9Zl04.js, line 2611)
[Error] [routeService] Error details:
"Request Entity Too Large
FUNCTION_PAYLOAD_TOO_LARGE
syd1::4h9zk-1740996533460-e0292595f1fb"
```

### Root Cause Analysis

1. **Vercel Serverless Function Limitations**:
   - Vercel imposes a maximum payload size limit on serverless functions (typically 4-6MB)
   - The error `FUNCTION_PAYLOAD_TOO_LARGE` explicitly indicates we're hitting this limit

2. **Large Route Data**:
   - Complex routes with many waypoints generate large GeoJSON data
   - Routes with many POIs, photos, and metadata compound the issue
   - Our current implementation sends the entire route data as a single JSON payload

3. **Current Implementation Issues**:
   - The `routeService.js` sends the complete route data in one request
   - While data optimization has been implemented, it's insufficient for very large routes
   - We've successfully uploaded a 860KB route but fail with routes around 1MB

## The Solution: Chunked Route Uploads

We can solve this by implementing a chunked upload approach similar to what we've done for photo uploads. This involves:

1. Breaking large route data into smaller chunks
2. Sending each chunk separately
3. Reassembling the data on the server

### Benefits of This Approach

- Bypasses Vercel's payload size limitations
- Allows saving routes of any size
- Leverages our existing Redis/Vercel KV infrastructure
- Similar to our proven photo upload implementation

## Implementation Plan

### 1. Frontend Changes (routeService.js)

```javascript
const saveRoute = async (routeData) => {
  try {
    console.log('[routeService] Starting save route...');
    
    // Add userId to the routeData
    const routeDataWithUserId = {
      ...routeData,
      userId: userId
    };
    
    // Transform data as before
    const transformedData = {
      // ... existing transformation code ...
    };
    
    // Convert to JSON string to measure size
    const jsonData = JSON.stringify(transformedData);
    const payloadSizeInBytes = new Blob([jsonData]).size;
    const payloadSizeInMB = payloadSizeInBytes / (1024 * 1024);
    
    console.log(`[routeService] Payload size: ${payloadSizeInMB.toFixed(2)}MB`);
    
    // If payload is larger than 500KB (0.5MB), use chunked upload
    if (payloadSizeInBytes > 500 * 1024) {
      console.log('[routeService] Large payload detected, using chunked upload');
      return await saveRouteChunked(transformedData, routeDataWithUserId.persistentId);
    } else {
      // Use existing direct upload for smaller payloads
      const endpoint = routeDataWithUserId.persistentId ? 
        `${API_BASE}/${routeDataWithUserId.persistentId}` : 
        `${API_BASE}/save`;
      const method = routeDataWithUserId.persistentId ? 'PUT' : 'POST';
      const headers = await getAuthHeaders();
      
      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(transformedData),
        credentials: 'include'
      });
      
      console.log('[routeService] Save response status:', response.status);
      const result = await handleResponse(response);
      console.log('[routeService] Server response:', result);
      return result;
    }
  } catch (error) {
    console.error('Save route error:', error);
    throw error;
  }
};

// New function to handle chunked uploads
const saveRouteChunked = async (routeData, persistentId) => {
  try {
    const headers = await getAuthHeaders();
    const jsonData = JSON.stringify(routeData);
    
    // Create chunks of 500KB each
    const chunkSize = 500 * 1024; // 500KB in bytes
    const totalChunks = Math.ceil(jsonData.length / chunkSize);
    const chunks = [];
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, jsonData.length);
      chunks.push(jsonData.slice(start, end));
    }
    
    console.log(`[routeService] Splitting data into ${chunks.length} chunks`);
    
    // Start a chunked upload session
    console.log('[routeService] Starting chunked upload session');
    const sessionResponse = await fetch(`${API_BASE}/chunked/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        persistentId,
        totalChunks: chunks.length,
        totalSize: jsonData.length,
        isUpdate: !!persistentId
      }),
      credentials: 'include'
    });
    
    const { sessionId } = await handleResponse(sessionResponse);
    console.log(`[routeService] Chunked upload session created: ${sessionId}`);
    
    // Upload each chunk
    for (let i = 0; i < chunks.length; i++) {
      console.log(`[routeService] Uploading chunk ${i+1}/${chunks.length}`);
      
      const chunkResponse = await fetch(`${API_BASE}/chunked/upload`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          chunkIndex: i,
          data: chunks[i]
        }),
        credentials: 'include'
      });
      
      await handleResponse(chunkResponse);
      console.log(`[routeService] Chunk ${i+1}/${chunks.length} uploaded successfully`);
    }
    
    // Complete the chunked upload
    console.log('[routeService] Completing chunked upload');
    const completeResponse = await fetch(`${API_BASE}/chunked/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sessionId
      }),
      credentials: 'include'
    });
    
    const result = await handleResponse(completeResponse);
    console.log('[routeService] Chunked upload completed successfully');
    return result;
  } catch (error) {
    console.error('[routeService] Chunked upload error:', error);
    throw error;
  }
};
```

### 2. Backend Changes (api/routes/index.js)

Add these new handlers to the existing routes API:

```javascript
// Start a chunked upload session
async function handleStartChunkedUpload(req, res) {
  try {
    const { persistentId, totalChunks, totalSize, isUpdate } = req.body;
    
    // Generate a session ID
    const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Store session info in Redis/Vercel KV with 1-hour expiration
    await setCache(`chunked:${sessionId}:info`, {
      persistentId,
      totalChunks,
      totalSize,
      receivedChunks: 0,
      isUpdate,
      chunks: {},
      createdAt: Date.now()
    }, 3600); // 1 hour expiration
    
    console.log(`[API] Chunked upload session created: ${sessionId} for ${isUpdate ? 'update' : 'new'} route`);
    
    return res.status(200).json({ sessionId });
  } catch (error) {
    console.error('Start chunked upload error:', error);
    return res.status(500).json({ 
      error: 'Failed to start chunked upload',
      details: error.message
    });
  }
}

// Handle a chunk upload
async function handleUploadChunk(req, res) {
  try {
    const { sessionId, chunkIndex, data } = req.body;
    
    // Get session info
    const sessionInfo = await getCache(`chunked:${sessionId}:info`);
    if (!sessionInfo) {
      return res.status(404).json({ error: 'Upload session not found or expired' });
    }
    
    // Store the chunk with 1-hour expiration
    await setCache(`chunked:${sessionId}:chunk:${chunkIndex}`, data, 3600);
    
    // Update session info
    sessionInfo.receivedChunks += 1;
    sessionInfo.chunks[chunkIndex] = true;
    await setCache(`chunked:${sessionId}:info`, sessionInfo, 3600);
    
    console.log(`[API] Received chunk ${chunkIndex + 1}/${sessionInfo.totalChunks} for session ${sessionId}`);
    
    return res.status(200).json({ 
      success: true,
      receivedChunks: sessionInfo.receivedChunks,
      totalChunks: sessionInfo.totalChunks
    });
  } catch (error) {
    console.error('Upload chunk error:', error);
    return res.status(500).json({ 
      error: 'Failed to upload chunk',
      details: error.message
    });
  }
}

// Complete a chunked upload
async function handleCompleteChunkedUpload(req, res) {
  try {
    const { sessionId } = req.body;
    
    // Get session info
    const sessionInfo = await getCache(`chunked:${sessionId}:info`);
    if (!sessionInfo) {
      return res.status(404).json({ error: 'Upload session not found or expired' });
    }
    
    // Check if all chunks are received
    if (sessionInfo.receivedChunks !== sessionInfo.totalChunks) {
      return res.status(400).json({ 
        error: 'Not all chunks received',
        receivedChunks: sessionInfo.receivedChunks,
        totalChunks: sessionInfo.totalChunks
      });
    }
    
    console.log(`[API] Reassembling ${sessionInfo.totalChunks} chunks for session ${sessionId}`);
    
    // Reassemble the data
    let completeData = '';
    for (let i = 0; i < sessionInfo.totalChunks; i++) {
      const chunkData = await getCache(`chunked:${sessionId}:chunk:${i}`);
      if (!chunkData) {
        return res.status(500).json({ error: `Chunk ${i} not found or expired` });
      }
      completeData += chunkData;
    }
    
    // Parse the reassembled data
    const routeData = JSON.parse(completeData);
    
    console.log(`[API] Successfully reassembled data for session ${sessionId}, size: ${completeData.length} bytes`);
    
    // Process the route data using existing handlers
    let result;
    if (sessionInfo.isUpdate) {
      // Update existing route
      req.body = routeData;
      req.query.id = sessionInfo.persistentId;
      result = await handleUpdateRoute(req, res);
    } else {
      // Create new route
      req.body = routeData;
      result = await handleCreateRoute(req, res);
    }
    
    // Clean up Redis/Vercel KV keys
    await deleteCache(`chunked:${sessionId}:info`);
    for (let i = 0; i < sessionInfo.totalChunks; i++) {
      await deleteCache(`chunked:${sessionId}:chunk:${i}`);
    }
    
    console.log(`[API] Cleaned up temporary data for session ${sessionId}`);
    
    return result;
  } catch (error) {
    console.error('Complete chunked upload error:', error);
    return res.status(500).json({ 
      error: 'Failed to complete chunked upload',
      details: error.message
    });
  }
}

// Add these to the route handler
const handler = async (req, res) => {
  // Ensure database connection
  await connectToDatabase();
  
  // Parse the URL to extract path parameters
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathParts = url.pathname.split('/').filter(part => part.length > 0);
  
  console.log(`[API] Request: ${req.method} ${url.pathname}`);
  
  // Handle chunked upload endpoints
  if (pathParts.includes('chunked')) {
    const action = pathParts[pathParts.length - 1];
    
    if (req.method === 'POST') {
      if (action === 'start') {
        return handleStartChunkedUpload(req, res);
      } else if (action === 'upload') {
        return handleUploadChunk(req, res);
      } else if (action === 'complete') {
        return handleCompleteChunkedUpload(req, res);
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Existing route handling code...
};
```

### 3. Update Routes in vercel.json

Add the new chunked upload routes to vercel.json:

```json
{
  "routes": [
    // Existing routes...
    
    {
      "src": "/api/routes/chunked/start",
      "dest": "/api/routes"
    },
    {
      "src": "/api/routes/chunked/upload",
      "dest": "/api/routes"
    },
    {
      "src": "/api/routes/chunked/complete",
      "dest": "/api/routes"
    }
  ]
}
```

## How It Works: Breaking Down the 500KB Chunks

1. **Size Determination**:
   - We convert the route data to a JSON string
   - We measure its size in bytes using `new Blob([jsonData]).size`
   - If it exceeds 500KB (500 * 1024 bytes), we use chunked upload

2. **Chunking Process**:
   - We divide the JSON string into 500KB segments
   - Each segment is a substring of the original JSON
   - The number of chunks is calculated as `Math.ceil(jsonData.length / chunkSize)`

3. **Session Management**:
   - We create a unique session ID for each chunked upload
   - Session metadata is stored in Redis/Vercel KV with a 1-hour expiration
   - This metadata tracks which chunks have been received

4. **Chunk Upload**:
   - Each 500KB chunk is sent in a separate HTTP request
   - The server stores each chunk in Redis/Vercel KV
   - The server updates the session metadata after each chunk

5. **Reassembly**:
   - Once all chunks are received, the server retrieves them in order
   - The chunks are concatenated to recreate the original JSON string
   - The JSON is parsed and processed using the existing route handlers

6. **Cleanup**:
   - After successful processing, all temporary chunk data is deleted
   - This prevents Redis/Vercel KV from filling up with temporary data

## Benefits of 500KB Chunks

- **Well Below Limits**: 500KB is safely below Vercel's payload size limits
- **Optimal Performance**: Large enough to minimize the number of requests
- **Reliable Transmission**: Small enough to ensure reliable transmission
- **Balanced Approach**: Balances efficiency with reliability

## Error Handling and Edge Cases

1. **Session Expiration**:
   - All Redis/Vercel KV keys have a 1-hour expiration
   - If the upload takes longer than 1 hour, the session will expire
   - The client should detect this and restart the upload

2. **Missing Chunks**:
   - The server verifies that all chunks are received before reassembly
   - If any chunks are missing, the upload is rejected

3. **Network Failures**:
   - If a chunk upload fails, the client can retry just that chunk
   - The session persists, allowing for resumable uploads

4. **Malformed Data**:
   - JSON parsing errors are caught and reported
   - The original error from the route handler is preserved

## Testing Plan

1. Test with routes of various sizes:
   - Small routes (< 500KB)
   - Medium routes (500KB - 1MB)
   - Large routes (1MB - 5MB)
   - Very large routes (> 5MB)

2. Test error scenarios:
   - Network interruptions during upload
   - Missing chunks
   - Session expiration
   - Invalid JSON data

3. Test performance:
   - Measure upload times for different route sizes
   - Compare with direct upload for small routes

## Conclusion

This chunked upload implementation will solve the 413 "Request Entity Too Large" error by breaking large route data into manageable 500KB chunks. It leverages our existing Redis/Vercel KV infrastructure and follows a similar pattern to our photo upload implementation. This approach will allow users to save routes of any size, regardless of Vercel's payload limitations.
