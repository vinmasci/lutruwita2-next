# Presentation Mode Cloudinary Optimization

## Overview

This document outlines a strategy to optimize the presentation mode in the Lutruwita app by leveraging pre-processed Cloudinary data instead of direct MongoDB queries. This approach mirrors what's already implemented in the embed mode and mobile app, ensuring consistency across platforms while significantly improving performance.

## Current Issues

1. **Slow Loading**: Presentation mode currently queries MongoDB directly, causing unnecessary database load and slower response times.
2. **Redundant Processing**: We're re-processing route data that's already available in a pre-processed format in Cloudinary.
3. **Inconsistent Data Sources**: Embed mode and mobile app use Cloudinary data, while presentation mode uses direct API calls.

## Solution Architecture

Modify the presentation mode to follow a two-step data loading approach:

1. **Initial Lightweight API Request**: Fetch only the minimal metadata including the embedUrl
2. **Cloudinary Data Fetch**: Use the embedUrl to fetch pre-processed data from Cloudinary's CDN
3. **Skip MongoDB Query**: Bypass the full MongoDB query for route data

## Implementation Plan

### 1. Identify Key Files for Modification

The primary files that need to be modified are:

- `src/features/presentation/components/RoutePresentation/RoutePresentation.js` - Main component for presentation mode
- `src/features/map/context/RouteContext.js` - Handles route data loading and state

### 2. Create a Cloudinary Data Loading Utility

Create a new utility function in `src/utils/cloudinaryUtils.js` that handles fetching data from Cloudinary:

```javascript
// Function signature (implementation details to be added)
export const fetchRouteDataFromCloudinary = async (embedUrl) => {
  // Add timestamp to force fresh version
  // Fetch data from Cloudinary
  // Process and return the data
};
```

### 3. Modify RoutePresentation.js

Update the data loading logic in RoutePresentation.js to:

1. First fetch minimal metadata with the embedUrl from the API
2. Then use the utility function to fetch the full data from Cloudinary
3. Fall back to the current API approach if Cloudinary data isn't available

Key changes:
- Modify the `useEffect` hook that loads route data
- Add state for tracking Cloudinary data loading
- Update the rendering logic to use Cloudinary data when available

### 4. Reference Implementation

The web app already has a robust implementation of Cloudinary data loading in the embed mode. Use the `useRouteDataLoader` hook in `src/features/presentation/components/EmbedMapView/hooks/useRouteDataLoader.js` as a primary reference:

```javascript
// First get the route data from the API to get the embedUrl
console.log(`Fetching route data from API to get embedUrl for route: ${routeId}`);
const routeResponse = await fetch(`/api/routes/embed/${routeId}`);

if (!routeResponse.ok) {
    console.error(`Failed to load route data: ${routeResponse.status} ${routeResponse.statusText}`);
    throw new Error(`Failed to load route data: ${routeResponse.statusText}`);
}

// Parse the response to get the embedUrl
const routeData = await routeResponse.json();

// Check if we have an embedUrl
if (!routeData.embedUrl) {
    console.error('No embedUrl found in route data');
    throw new Error('No embedUrl found in route data');
}

console.log(`Using embedUrl from route data: ${routeData.embedUrl}`);

// Add a timestamp parameter to force a fresh version
const cloudinaryUrl = `${routeData.embedUrl}?t=${Date.now()}`;

// Fetch the data from Cloudinary using the embedUrl
const cloudinaryResponse = await fetch(cloudinaryUrl);

if (cloudinaryResponse.ok) {
    // Parse the response
    const data = await cloudinaryResponse.json();
    console.log(`Successfully loaded pre-processed data from Cloudinary: ${data.name || 'Unnamed'}`);
    
    // Process and use the data
    // ...
} else {
    console.log(`No pre-processed data found in Cloudinary, falling back to API: ${cloudinaryResponse.status}`);
    // Fall back to API implementation
}
```

The mobile app also has a similar implementation in `mobile/lutruwita-mobile/src/services/routeService.ts` that follows the same pattern:

```typescript
// First, get the route metadata to check for embedUrl
const metadataUrl = `${API_BASE}/embed/${persistentId}`;
const metadataResponse = await fetch(metadataUrl);
const metadata = await metadataResponse.json();

// Check if we have an embedUrl in the metadata
if (metadata && metadata.embedUrl) {
  // Add a timestamp parameter to force a fresh version
  const cloudinaryUrl = `${metadata.embedUrl}?t=${Date.now()}`;
  
  // Fetch the data from Cloudinary
  const cloudinaryResponse = await fetch(cloudinaryUrl);
  
  if (cloudinaryResponse.ok) {
    const cloudinaryData = await cloudinaryResponse.json();
    
    // Process the Cloudinary data
    const processedData = {
      ...cloudinaryData,
      embedUrl: metadata.embedUrl
    };
    
    return processedData;
  }
}

// Fall back to direct API request if Cloudinary approach fails
```

### 5. API Endpoint for Embed URL

Ensure the API endpoint for getting the embed URL is accessible from the presentation mode. The endpoint should be:

```
/api/embed/:persistentId
```

This endpoint should return minimal metadata including the embedUrl.

## Detailed Implementation Steps

### Step 1: Create Cloudinary Utility Function

Create or modify `src/utils/cloudinaryUtils.js`:

```javascript
/**
 * Fetches route data from Cloudinary using the embed URL
 * @param {string} embedUrl - The Cloudinary embed URL for the route
 * @returns {Promise<Object>} - The processed route data
 */
export const fetchRouteDataFromCloudinary = async (embedUrl) => {
  if (!embedUrl) {
    throw new Error('No embed URL provided');
  }

  try {
    // Add timestamp to force fresh version
    const cloudinaryUrl = `${embedUrl}?t=${Date.now()}`;
    
    // Fetch the data from Cloudinary
    const response = await fetch(cloudinaryUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Cloudinary: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return the processed data
    return {
      ...data,
      embedUrl,
      _type: 'loaded',
      _loadedState: data
    };
  } catch (error) {
    console.error('Error fetching from Cloudinary:', error);
    throw error;
  }
};
```

### Step 2: Modify RoutePresentation.js

Locate the data loading logic in `src/features/presentation/components/RoutePresentation/RoutePresentation.js` and modify it to use Cloudinary data:

1. Import the new utility function:
   ```javascript
   import { fetchRouteDataFromCloudinary } from '../../../../utils/cloudinaryUtils';
   ```

2. Add state for tracking Cloudinary data:
   ```javascript
   const [cloudinaryData, setCloudinaryData] = useState(null);
   const [isLoadingCloudinary, setIsLoadingCloudinary] = useState(false);
   ```

3. Modify the useEffect hook that loads route data:
   ```javascript
   useEffect(() => {
     const loadRouteData = async () => {
       setLoading(true);
       try {
         // First try to get the embed URL
         const metadataResponse = await fetch(`/api/embed/${persistentId}`);
         const metadata = await metadataResponse.json();
         
         if (metadata && metadata.embedUrl) {
           setIsLoadingCloudinary(true);
           try {
             // Fetch from Cloudinary
             const data = await fetchRouteDataFromCloudinary(metadata.embedUrl);
             setCloudinaryData(data);
             setIsLoadingCloudinary(false);
             setLoading(false);
             return;
           } catch (cloudinaryError) {
             console.error('Error loading from Cloudinary, falling back to API:', cloudinaryError);
             setIsLoadingCloudinary(false);
           }
         }
         
         // Fall back to current API approach if Cloudinary fails
         // ... existing API loading code ...
       } catch (error) {
         setError(error);
         setLoading(false);
       }
     };
     
     if (persistentId) {
       loadRouteData();
     }
   }, [persistentId]);
   ```

4. Update the rendering logic to use Cloudinary data when available:
   ```javascript
   // Use cloudinaryData if available, otherwise use the existing route data
   const routeData = cloudinaryData || route;
   
   // Then use routeData throughout the component
   ```

### Step 3: Update RouteContext.js (if needed)

If the RouteContext is used to manage route data, update it to support Cloudinary data:

1. Add support for setting route data from Cloudinary
2. Ensure all consumers of the context can handle the Cloudinary data format

### Step 4: Test the Implementation

1. Test the presentation mode with various routes
2. Verify that Cloudinary data is being used by checking network requests
3. Compare performance with and without the optimization

## Expected Benefits

1. **Faster Loading**: Cloudinary's CDN delivers data quickly from edge locations
2. **Reduced Database Load**: Fewer MongoDB queries means less strain on the database
3. **Consistent Experience**: Same data source across embed mode, mobile app, and presentation mode
4. **Better Caching**: Cloudinary's CDN provides excellent caching
5. **Improved Reliability**: Less dependency on database availability

## Fallback Mechanism

The implementation includes a fallback to the current API approach if:
1. The embed URL is not available
2. Cloudinary data fetch fails
3. Cloudinary data processing encounters errors

This ensures robustness while still providing the performance benefits in the majority of cases.

## Future Considerations

1. **Offline Support**: The pre-processed Cloudinary data could be cached for offline use
2. **Progressive Loading**: Implement progressive loading of route details as the user interacts
3. **Data Versioning**: Add version information to handle data format changes
4. **Error Monitoring**: Add specific error monitoring for Cloudinary data loading
5. **Performance Metrics**: Implement tracking to measure the performance improvement

## References

1. Mobile app implementation in `mobile/lutruwita-mobile/src/services/routeService.ts`
2. Cloudinary data format in `docs/cloudinaryraw.md`
3. Cloudinary optimization documentation in `docs/CLOUDINARY_ROUTE_DATA_OPTIMIZATION.md`
