# Optimized Partial Updates Implementation

## Problem Statement

We've been experiencing significant performance issues when saving small changes to routes, particularly when updating the Map Overview tab. The system was sending the entire route data (95+ MB) to the server, even when only updating a few lines of text.

Key issues:
- Updating just the map overview text was triggering a full save of the entire route (95.51MB)
- The compression only reduced this to 92.25MB (96.59% of original)
- This required chunking the data into 189 chunks for upload
- The process was slow, resource-intensive, and potentially error-prone
- Users experienced long wait times for simple text edits

## Root Cause Analysis

The root cause was in the save process architecture:

1. The `RouteContext.saveCurrentState` function correctly identified changed sections
2. However, the `routeService.saveRoute` function was transforming all updates into a complete payload
3. Even when only the map overview changed, the entire route data was being sent
4. The API endpoint was replacing the entire document in MongoDB

This approach worked well for initial route creation but was extremely inefficient for small updates.

## Solution: Optimized Partial Updates

We implemented a comprehensive solution for all types of partial updates:

### 1. Server-Side Changes

- Added a new `/partial/:persistentId` endpoint that accepts PATCH requests
- Created a `handlePartialUpdate` function that:
  - Only updates the specified fields in MongoDB
  - Handles nested objects like mapOverview and headerSettings intelligently
  - Only regenerates embed data when necessary
  - Returns a success response with the list of updated fields

### 2. Client-Side Changes

- Modified `saveRoute` in `routeService.js` to:
  - Detect partial updates (has persistentId and doesn't include route data)
  - Create a minimal payload with just the necessary fields
  - Use the new PATCH endpoint for these updates
  - Log the size of the optimized payload

### 3. Benefits

- Drastically reduced payload size for partial updates (from 95MB to a few KB)
- Eliminated the need for chunked uploads for small changes
- Improved save performance and reduced server load
- Maintained all existing functionality and backward compatibility

## Implementation Details

### Server-Side (api/routes/index.js)

```javascript
// Handler for partial updates
async function handlePartialUpdate(req, res) {
  try {
    const persistentId = req.query.id || req.params?.persistentId;
    
    if (!persistentId) {
      return res.status(400).json({ error: 'Missing persistentId' });
    }
    
    // Find the route
    const route = await Route.findOne({ persistentId });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Extract only the fields that need updating
    const updateFields = req.body;
    
    // Apply updates to specific fields only
    Object.keys(updateFields).forEach(field => {
      if (field !== 'id' && field !== 'persistentId' && field !== 'userId') {
        if (field === 'mapOverview') {
          route.mapOverview = {
            ...route.mapOverview || {},
            ...updateFields.mapOverview
          };
        } 
        else if (field === 'headerSettings') {
          route.headerSettings = {
            ...route.headerSettings || {},
            ...updateFields.headerSettings
          };
        }
        else {
          route[field] = updateFields[field];
        }
      }
    });
    
    // Update timestamp
    route.updatedAt = new Date();
    
    // Save the route with only the changed fields
    await route.save();
    
    // Update embed data if needed
    // ...
    
    return res.status(200).json({ 
      success: true, 
      message: 'Route partially updated',
      updatedFields: Object.keys(updateFields).filter(f => f !== 'id' && f !== 'persistentId' && f !== 'userId')
    });
  } catch (error) {
    console.error('Partial update error:', error);
    return res.status(500).json({ 
      error: 'Failed to update route',
      details: error.message
    });
  }
}
```

### Client-Side (routeService.js)

```javascript
const saveRoute = async (routeData) => {
  try {
    // Add userId to the routeData
    const routeDataWithUserId = {
      ...routeData,
      userId: userId
    };
    
    // Check if this is a partial update
    const isUpdate = !!routeDataWithUserId.persistentId;
    const isPartialUpdate = isUpdate && !routeData.routes;
    
    if (isPartialUpdate) {
      console.log('[routeService] Detected partial update, using optimized endpoint');
      
      // Create a minimal payload with just the necessary fields
      const minimalPayload = {
        ...routeData,
        userId: userId
      };
      
      // Use the partial update endpoint
      const endpoint = `${API_BASE}/partial/${routeDataWithUserId.persistentId}`;
      const method = 'PATCH';
      
      // Set the Content-Type to application/json for the minimal payload
      headers['Content-Type'] = 'application/json';
      
      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(minimalPayload),
        credentials: 'include'
      });
      
      return handleResponse(response);
    }
    
    // For full updates or new routes, continue with the existing logic
    // ...
  }
  catch (error) {
    console.error('Save route error:', error);
    throw error;
  }
};
```

## Testing Results

Before optimization:
- Map overview update payload: 95.51MB
- Compressed payload: 92.25MB
- Required 189 chunks for upload
- Slow save process

After optimization:
- Map overview update payload: ~2KB
- No compression needed
- Single HTTP request
- Near-instantaneous save

## Future Improvements

1. **Version Control**: Add a version field to detect concurrent edits
2. **Selective Embed Updates**: Only update embed data for fields that affect the embed
3. **Batch Updates**: Allow multiple partial updates to be batched together
4. **Differential Sync**: Implement true differential sync for route coordinates

## Conclusion

The optimized partial updates implementation significantly improves the performance and efficiency of the save process, especially for small changes like updating the map overview text. This approach maintains all the existing functionality while drastically reducing the amount of data transferred and processed.
