# Map Embedding Implementation Plan

This document outlines the plan for implementing a map embedding feature that will allow users to embed maps with routes in their websites.

## Overview

The embedding functionality will enable users to generate an iframe code snippet that can be used to embed the current map view with all visible routes on external websites. The embedded map will maintain the same interactive features as the main application.

## Current Implementation Status and Issues

We've implemented a basic embedding functionality that works as follows:

1. Users can click an "Embed" icon in the sidebar to generate an iframe code
2. The iframe loads a React component (`EmbedMapView.jsx`) that displays the map with routes
3. The component decodes a state ID from the URL, which contains information about which routes to display
4. The component makes API calls to fetch route data for each route referenced in the state ID
5. The fetched data is used to render the map with routes, POIs, and other features

However, this implementation has several issues:

1. **Performance Problems**:
   - Multiple API calls are required (one per route)
   - The component architecture is complex with many context providers
   - Loading times are slow, especially for maps with multiple routes
   - POIs, photos, and other features don't always load correctly

2. **Maintenance Challenges**:
   - The code is tightly coupled to the main application architecture
   - Changes to the main app can break the embed functionality
   - Debugging is difficult due to the complex data flow

3. **User Experience Issues**:
   - Embedded maps take too long to load on external websites
   - Some features (like POI icons) don't display correctly
   - The sidebar and elevation profile have styling issues

## New Approach: Pre-processed Embed Data with Cloudinary

After evaluating the current implementation, we've implemented a more efficient approach using pre-processed data stored in Cloudinary:

### Key Concepts

1. **Pre-processed Data**: When a route is saved or updated, we generate a complete "embed-ready" data package containing all necessary information (routes, POIs, elevation data, etc.)

2. **Cloudinary Storage**: Instead of storing this data in our database or generating it on-demand, we upload it as a JSON file to Cloudinary using their raw file storage capabilities

3. **Direct CDN Access**: The embed component fetches this pre-processed data directly from Cloudinary's CDN, eliminating the need for complex API calls and data processing

4. **Simplified Component**: The embed component has been simplified to focus solely on rendering the pre-processed data, without relying on complex context providers

### Advantages of This Approach

1. **Performance**: Significantly faster loading times due to:
   - Single request to Cloudinary's global CDN
   - No server-side processing required at embed time
   - Pre-optimized data format

2. **Simplicity**: Simpler architecture with:
   - Direct data flow from CDN to component
   - Fewer dependencies on main application code
   - Easier maintenance and debugging

3. **Reliability**: More reliable embedding with:
   - Consistent data format
   - Fewer points of failure
   - Automatic CDN caching and distribution

## Implementation Plan

Here's our step-by-step implementation of the new approach:

### 1. Create Cloudinary JSON Upload Functionality
- [x] Added a function to `api/lib/cloudinary.js` for uploading JSON data as raw files
- [x] Created a consistent naming convention for embed data files (e.g., `embeds/embed-{persistentId}.json`)
- [x] Implemented versioning to handle updates using timestamps

```javascript
// In api/lib/cloudinary.js
export async function uploadJsonData(jsonData, publicId, options = {}) {
  // Convert JSON to string
  const jsonString = JSON.stringify(jsonData);
  
  // Convert string to Buffer
  const buffer = Buffer.from(jsonString);
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw', // Important: specify raw for JSON files
        public_id: publicId,
        folder: 'embeds',
        format: 'json',
        ...options
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          version: result.version
        });
      }
    ).end(buffer);
  });
}
```

### 2. Modify Route Save/Update Process
- [x] Updated route schema to include an `embedUrl` field to store the Cloudinary URL
- [x] Modified route creation and update handlers to generate and upload embed data
- [x] Implemented automatic upload to Cloudinary whenever a route is saved or updated
- [x] Added code to delete embed data from Cloudinary when a route is deleted

```javascript
// In api/routes/index.js - handleCreateRoute function
// Generate and upload embed data to Cloudinary
try {
  console.log(`[API] Generating embed data for route: ${route.name}`);
  
  // Create the embed data package
  const embedData = {
    id: route._id,
    persistentId: route.persistentId,
    name: route.name,
    routes: route.routes.map(r => ({
      routeId: r.routeId,
      name: r.name,
      color: r.color,
      geojson: r.geojson,
      surface: r.surface,
      unpavedSections: r.unpavedSections
    })),
    mapState: route.mapState,
    pois: route.pois || { draggable: [], places: [] },
    photos: route.photos || [],
    elevation: route.routes.map(r => r.surface?.elevationProfile || []),
    _type: 'loaded',
    _loadedState: {
      name: route.name,
      pois: route.pois || { draggable: [], places: [] },
      photos: route.photos || []
    }
  };
  
  // Upload to Cloudinary
  const publicId = `embed-${route.persistentId}`;
  console.log(`[API] Uploading embed data to Cloudinary with public ID: ${publicId}`);
  
  const result = await uploadJsonData(embedData, publicId);
  
  // Update the route with the embed URL
  route.embedUrl = result.url;
  await route.save();
  
  console.log(`[API] Embed data uploaded successfully: ${result.url}`);
} catch (embedError) {
  console.error(`[API] Error generating embed data:`, embedError);
  // Continue even if embed data generation fails
}
```

### 3. Update the Embed API Endpoint
- [x] Modified `api/routes/embed/index.js` to check for pre-processed data in Cloudinary
- [x] Implemented fallback logic for routes without pre-processed data
- [x] Maintained view count tracking and other analytics

```javascript
// In api/routes/embed/index.js
// Check if we have pre-processed embed data in Cloudinary
if (route.embedUrl) {
  console.log(`[API] Using pre-processed embed data from Cloudinary: ${route.embedUrl}`);
  
  try {
    // Add a timestamp parameter to force a fresh version
    const embedUrl = `${route.embedUrl}?t=${Date.now()}`;
    
    // Fetch the pre-processed data from Cloudinary
    const response = await fetch(embedUrl);
    
    if (response.ok) {
      // Parse the JSON data
      const embedData = await response.json();
      
      // Set cache headers for better performance
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      
      // Return the pre-processed data
      return res.status(200).json(embedData);
    } else {
      console.error(`[API] Failed to fetch embed data from Cloudinary: ${response.status} ${response.statusText}`);
      // Fall back to generating embed data on-the-fly
    }
  } catch (error) {
    console.error(`[API] Error fetching embed data from Cloudinary:`, error);
    // Fall back to generating embed data on-the-fly
  }
}
```

### 4. Simplify the Embed Component
- [x] Updated `src/features/presentation/components/EmbedMapView/EmbedMapView.jsx` to fetch data from Cloudinary
- [x] Implemented progressive loading for better user experience
- [x] Added fallback to API if Cloudinary data isn't available

```javascript
// In src/features/presentation/components/EmbedMapView/EmbedMapView.jsx
try {
  // First try to load from Cloudinary pre-processed data
  console.log(`Trying to load pre-processed data from Cloudinary for route: ${routeId}`);
  
  // Construct the Cloudinary URL for the embed data
  const cloudinaryUrl = `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/raw/upload/embeds/embed-${routeId}.json?t=${Date.now()}`;
  
  // Fetch the data from Cloudinary
  const cloudinaryResponse = await fetch(cloudinaryUrl);
  
  if (cloudinaryResponse.ok) {
    // Parse the response
    const data = await cloudinaryResponse.json();
    console.log(`Successfully loaded pre-processed data from Cloudinary: ${data.name || 'Unnamed'}`);
    
    // Store the route data
    setRouteData(data);
    
    // Set the current route
    // ...
    
    setIsLoading(false);
    return; // Exit early if we successfully loaded from Cloudinary
  } else {
    console.log(`No pre-processed data found in Cloudinary, falling back to API: ${cloudinaryResponse.status}`);
  }
} catch (cloudinaryError) {
  console.error('Error loading from Cloudinary:', cloudinaryError);
  console.log('Falling back to API...');
}

// Fallback to API if Cloudinary fails
// ...
```

### 5. Test and Optimize
- [x] Created test cases for various route configurations
- [x] Updated the test-embed.html file to use the new implementation
- [x] Verified that the system automatically generates and uploads embed data to Cloudinary
- [x] Confirmed that the embed component correctly loads data from Cloudinary

## Files to Modify

1. **Cloudinary Integration**:
   - `api/lib/cloudinary.js` - Add JSON upload functionality

2. **Route Management**:
   - `api/routes/index.js` - Update route save/update handlers
   - `server/src/features/gpx/controllers/gpx.controller.ts` - Update route creation logic
   - Any other files that handle route updates

3. **Embed API**:
   - `api/routes/embed/index.js` - Update to use pre-processed data

4. **Embed Component**:
   - `src/features/presentation/components/EmbedMapView/EmbedMapView.jsx` - Simplify and update
   - `src/features/map/components/Sidebar/EmbedDialog.jsx` - Update if needed

5. **Database Schema**:
   - Update route schema to include `embedUrl` field

## Security Considerations

1. **CORS Configuration**: Ensure Cloudinary's CORS settings allow access from domains where maps will be embedded

2. **Data Privacy**: Ensure sensitive route data isn't inadvertently exposed in the pre-processed data

3. **Rate Limiting**: Implement rate limiting on the embed endpoint to prevent abuse

4. **Versioning**: Implement proper versioning to ensure embed data can be updated without breaking existing embeds

## Issue: Route Description Not Appearing in Embedded View

After investigating the issue with route descriptions not appearing in the embedded view, we've identified the following:

1. **Database Storage**: The route description is correctly stored in the MongoDB database. Each route in the `routes` array has a `description` object with a `description` property containing the HTML content.

2. **Cloudinary JSON**: When examining the Cloudinary JSON data (`docs/CLOUDINARYJSON.md`), we noticed that the description field is missing from the JSON data stored in Cloudinary.

3. **Code Analysis**: In `api/routes/index.js`, the description is included in the embedData object that's uploaded to Cloudinary:
   ```javascript
   const embedData = {
     // ...
     routes: route.routes.map(r => ({
       routeId: r.routeId,
       name: r.name,
       color: r.color,
       geojson: r.geojson,
       surface: r.surface,
       unpavedSections: r.unpavedSections,
       description: r.description // Include the description field
     })),
     // ...
     description: route.description, // Include the top-level description field
     // ...
   };
   ```

4. **Issue Identified**: The description is being included in the embedData object, but it's not being properly transferred to the Cloudinary JSON data. This suggests that there might be an issue with how the description is being processed when the embedData is uploaded to Cloudinary.

### Potential Solutions

1. **Check Cloudinary Upload Process**: Verify that the `uploadJsonData` function in `api/lib/cloudinary.js` is correctly handling the description field.

2. **Verify JSON Serialization**: Ensure that the description object (which contains HTML content) is being properly serialized to JSON before being uploaded to Cloudinary.

3. **Update EmbedMapView Component**: Modify the `EmbedMapView.jsx` component to correctly handle the description data structure, ensuring it looks for the description in the right location.

4. **Add Logging**: Add logging statements to track the description field throughout the process, from database retrieval to Cloudinary upload to client-side rendering.

## Next Steps

### Implementing Scaling Functionality

To improve the user experience across different devices, we've implemented a scaling functionality for the embedded map view, similar to what's already in place for the PresentationMapView. This ensures that the map and its components are properly sized and positioned regardless of the screen size.

#### Implementation Steps

1. **Created CSS for Scaling**:
   - Added a new CSS file for EmbedMapView with scaling-related styles
   - Set up the container with `transform-origin: top left` to ensure proper scaling
   - Added responsive styles for different components within the map view

2. **Added Container Reference**:
   - Added a container ref in EmbedMapView.jsx
   - Restructured the component's JSX to use this container

3. **Implemented Scale Listener**:
   - Imported the `setupScaleListener` utility from scaleUtils.js
   - Added a useEffect hook to set up the scale listener
   - This automatically adjusts the scale based on window size

4. **Adjusted Layout Structure**:
   - Modified the component structure to accommodate scaling
   - Ensured all child components (sidebar, elevation profile, POI markers) scale properly
   - Maintained proper positioning of all elements when scaled

#### Benefits of Scaling

- **Improved Responsiveness**: The embedded map now adapts to different screen sizes
- **Consistent Experience**: Users get a similar experience to the main application
- **Better Mobile Support**: The map is more usable on smaller screens
- **Proper Component Sizing**: All UI elements maintain their relative sizes and positions

#### Files Modified

- `src/features/presentation/components/EmbedMapView/EmbedMapView.jsx`
- Created `src/features/presentation/components/EmbedMapView/EmbedMapView.css`

### Photo Marker Clustering Improvements

To improve the photo marker clustering in the embedded map view, we've made the following enhancements:

1. **Fixed Duplicate Rendering Issue**:
   - Identified and fixed an issue where both clusters and individual photos were being displayed simultaneously
   - Modified the rendering logic to only display clustered photos, eliminating the duplicate markers

2. **More Aggressive Clustering**:
   - Decreased the `maxZoom` value from 12 to 9 in the Supercluster configuration
   - Increased the clustering radius from 40 to 80 pixels
   - This ensures photos remain clustered at higher zoom levels, providing a cleaner map view

3. **Improved Supercluster Integration**:
   - Removed the manual `cluster: true` property to let Supercluster handle clustering natively
   - Updated the `isCluster` function to properly detect Supercluster-generated clusters
   - Enhanced the cluster click handler to work with both Supercluster's ID format and our custom format

4. **UI and Performance Improvements**:
   - Added fallback random IDs for photos and clusters that don't have IDs to prevent React key warnings
   - Removed noisy console logs to keep the browser console clean
   - Fixed styling issues to ensure consistent appearance of photo markers and clusters

These improvements result in a more polished user experience with better photo organization at various zoom levels, matching the behavior of the presentation mode.

## Recent Code Refactoring for Improved Maintainability

To address the maintenance challenges with the EmbedMapView component, we've implemented a comprehensive refactoring that significantly improves code organization and maintainability:

### 1. Elevation Calculation Utilities Extraction

We've extracted all elevation calculation functions into a separate utility file:

- **New File**: `src/features/presentation/components/EmbedMapView/utils/elevationUtils.js`
- **Functions Extracted**:
  - `calculateElevationGained`: Calculates total elevation gained from a route object
  - `calculateElevationLost`: Calculates total elevation lost from a route object
  - `calculateElevationFromArray`: Calculates elevation gained from an array of elevation values
  - `calculateElevationLostFromArray`: Calculates elevation lost from an array of elevation values
- **Benefits**:
  - Pure utility functions are now separated from component logic
  - Functions can be easily reused across the application
  - Improved testability of elevation calculation logic
  - Reduced size and complexity of the main component file

### 2. Data Loading Logic Extraction

We've extracted the complex data loading logic into a custom React hook:

- **New File**: `src/features/presentation/components/EmbedMapView/hooks/useRouteDataLoader.js`
- **Functionality Extracted**:
  - State ID decoding
  - API data fetching (from Cloudinary or API fallback)
  - Route data processing and enhancement
  - Error handling
  - Loading state management
- **Benefits**:
  - Separation of data loading concerns from UI rendering
  - Cleaner component code focused on presentation
  - Easier to understand and maintain data flow
  - Simplified testing of data loading logic in isolation

### 3. Component Structure Improvements

The main EmbedMapView component has been updated to use these extracted modules:

- **Import Changes**:
  - Added imports for the new utility functions and custom hook
  - Removed redundant code that's now handled by the extracted modules
- **State Management**:
  - Simplified state management by using the custom hook
  - Reduced the number of useState calls in the main component
  - Clearer separation between UI state and data state
- **Component Logic**:
  - Main component now focuses primarily on UI rendering and user interactions
  - Data loading and processing logic is abstracted away
  - Clearer separation of concerns throughout the component

### Results of Refactoring

This refactoring has significantly improved the maintainability of the EmbedMapView component:

1. **Reduced File Size**: The main component file is now approximately 500 lines shorter
2. **Improved Code Organization**: Logical sections are now in separate, focused files
3. **Better Separation of Concerns**: Clear distinction between data loading, utility functions, and UI rendering
4. **Enhanced Readability**: Each file has a single responsibility, making the code easier to understand
5. **Easier Maintenance**: Changes to one aspect (e.g., data loading) can be made without affecting other parts
6. **Improved Testability**: Isolated functions and hooks are easier to test than a monolithic component

These improvements make the code more maintainable for future development while preserving all the functionality and performance benefits of our Cloudinary-based embedding approach.

## Future Enhancements

1. **Customization Options**: Add more options for customizing the embedded map (e.g., show/hide specific features, change map style).

2. **Embed Analytics**: Track usage of embedded maps to understand how they're being used.

3. **Domain Restrictions**: Allow users to restrict which domains can embed their maps.

4. **Responsive Embeds**: Improve responsiveness of embedded maps for different screen sizes.

5. **Embed Presets**: Create preset configurations for common embedding scenarios.

6. **Further Component Extraction**: Continue breaking down the EmbedMapView component into smaller, more focused components:
   - Extract the map initialization logic into a custom hook
   - Extract photo clustering logic into a custom hook
   - Extract map fitting logic into a custom hook
   - Extract toggle functions into a utility file
   - Extract UI components like loading overlay, error overlay, etc. into separate component files
