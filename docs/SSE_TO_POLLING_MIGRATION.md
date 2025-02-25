# Server-Sent Events to Polling Migration

## Overview

This document explains the migration from Server-Sent Events (SSE) to polling for GPX processing progress updates in the Lutruwita2 application. This change is necessary to make the application fully compatible with serverless architecture on Vercel.

## Why This Change Was Needed

The original implementation used Server-Sent Events (SSE) to provide real-time progress updates during GPX file processing. While SSE works well in a traditional server environment, it has several limitations in a serverless context:

1. **Long-lived Connections**: Serverless functions are designed for short-lived, stateless operations. They're not well-suited for maintaining long-lived connections like SSE requires.

2. **Connection Limits**: Serverless platforms often have limits on connection duration and may terminate connections after a certain period.

3. **Cold Starts**: When a serverless function experiences a cold start, any existing connections would be lost.

4. **Scaling Complexity**: Managing SSE connections across multiple serverless function instances adds significant complexity.

The original masterplan did identify SSE as a potential issue (in the "Serverless State Concerns" section), but the specific implementation details and the fact that the frontend was still trying to use SSE with the serverless backend wasn't fully addressed in the initial phases.

## Implementation Details

### Before: Server-Sent Events

The original implementation used:
- An Express endpoint that kept connections open
- EventSource in the frontend to establish and maintain the SSE connection
- In-memory state on the server to track processing jobs

```javascript
// Frontend (original)
const eventSource = new EventSource(`${API_BASE}/progress/${data.uploadId}`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle progress updates
};
```

### After: Polling

The new implementation uses:
- Redis for job state persistence
- Regular HTTP endpoints for checking job status
- A polling mechanism in the frontend to periodically check job status

```javascript
// Frontend (new)
const pollJobStatus = () => {
  fetch(`${API_BASE}?jobId=${data.jobId}`)
    .then(response => response.json())
    .then(statusData => {
      // Handle progress updates
      // Continue polling if job is still in progress
      setTimeout(pollJobStatus, POLLING_INTERVAL);
    });
};
```

## Files Changed

1. `src/features/gpx/services/gpxService.ts` - Updated to use polling instead of SSE
2. `docs/VERCEL_MIGRATION_MASTERPLAN.md` - Updated to reflect the current status and add details about the SSE to polling migration

## Testing the Changes

To test these changes:

1. **Local Testing with Vercel Dev**:
   ```
   vercel dev
   ```
   This will run the serverless functions locally.

2. **Upload a GPX File**:
   - Navigate to the application
   - Upload a GPX file through the interface
   - Verify that progress updates are shown
   - Confirm that the file is processed successfully

3. **Check Console Logs**:
   - Open browser developer tools
   - Verify that polling requests are being made to the API
   - Confirm that progress updates are being received

4. **Verify No Server Dependency**:
   - Ensure the Express server is not running
   - Confirm that GPX processing still works using only the serverless functions

## Benefits

This migration provides several benefits:

1. **Serverless Compatibility**: The application can now run fully on serverless architecture without requiring the Express server.

2. **Simplified Architecture**: Using a consistent polling approach is simpler than managing SSE connections in a distributed environment.

3. **Improved Reliability**: Polling is more resilient to temporary network issues or function restarts.

4. **Better Scalability**: The stateless nature of polling aligns better with serverless scaling characteristics.

## Potential Improvements

In the future, we could consider:

1. **Adaptive Polling**: Adjust polling frequency based on expected processing time.

2. **Batch Status Updates**: Allow checking multiple job statuses in a single request.

3. **WebSocket Alternative**: For truly real-time updates, consider using a WebSocket service like Pusher or Socket.io, which is designed to work with serverless architectures.
