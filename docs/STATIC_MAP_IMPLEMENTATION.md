# Static Map Implementation

## Overview

This document outlines the implementation of static maps for the landing page to improve loading performance. The dynamic Mapbox maps were causing slow loading times, especially on mobile devices or with slower connections. By replacing them with pre-generated static map images, we significantly improve the initial load time of the landing page.

## Implementation Approach

After exploring different approaches, we've decided to pivot to a more reliable solution using Cloudinary for pre-generated static maps:

### Pre-Generated Static Maps with Cloudinary

Instead of generating static map URLs on the fly (which can lead to URL length limitations and rendering issues), we'll:

1. Pre-generate static map images for each route
2. Upload these images to Cloudinary
3. Store the Cloudinary URLs in MongoDB as part of the route data
4. Use these pre-generated images in the landing page

This approach has several advantages:
- Avoids URL length limitations that occur with complex routes
- Leverages Cloudinary's image optimization capabilities
- Provides more reliable rendering of routes
- Allows for more complex route visualizations
- Integrates with our existing Cloudinary infrastructure

## Implementation Details

### 1. Static Map Generation Process

We'll implement the static map generation during the route save process in `RouteContext.js`:
- Generate static map images for each route using Mapbox GL
- Capture these as images using canvas
- Upload them to Cloudinary using our existing Cloudinary utilities
- Store the resulting URLs in MongoDB as part of the route data

### 2. Integration with Save Process

The static map generation will be integrated into the existing save process:
- It will run after uploading photos and logo to Cloudinary
- The Cloudinary URL will be included in the `partialUpdate` object sent to the backend
- The backend will store this URL in MongoDB along with other route data

### 3. ImageSlider Component Updates

The `ImageSlider` component will be updated to:
- Use the pre-generated static map images from Cloudinary
- Fall back to dynamic maps only if a static map image is not available
- Leverage Cloudinary's image optimization features for responsive loading

### 4. RouteCard Component Updates

The `RouteCard` component will be updated to:
- Use the Cloudinary static map URLs retrieved from MongoDB
- Pass these URLs to the ImageSlider component

## How It Works

1. When a route is created or updated in creation mode, a static map image is generated and uploaded to Cloudinary
2. The Cloudinary URL is stored in MongoDB as part of the route data
3. When a route card is rendered on the landing page, it retrieves and uses this pre-generated image
4. The image loads quickly since it's a static image optimized by Cloudinary

## Accessing Static Map Assets

### In MongoDB

The static map URLs are stored in the route documents in MongoDB with these fields:
- `staticMapUrl`: The full Cloudinary URL to the static map image (e.g., `https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/logos/abcdef123456.jpg`)
- `staticMapPublicId`: The Cloudinary public ID of the image (e.g., `logos/abcdef123456`)

You can view these fields directly in the MongoDB database using MongoDB Compass or the MongoDB Atlas web interface.

### In Frontend Code

To access the static map URL in your frontend components:

```javascript
// In a component that receives route data
function MyComponent({ route }) {
  // Check if the route has a static map URL
  if (route.staticMapUrl) {
    // Use the static map URL
    return <img src={route.staticMapUrl} alt="Route map" />;
  }
  
  // Fall back to dynamic map if no static map URL is available
  return <DynamicMap routes={route.routes} />;
}
```

The `RouteCard` component already passes the `staticMapUrl` to the `ImageSlider` component, which prioritizes using this URL over generating a dynamic map.

### In Backend Code

When handling route data in the backend:

```javascript
// When creating or updating a route
app.post('/api/routes', (req, res) => {
  const { staticMapUrl, staticMapPublicId, ...otherRouteData } = req.body;
  
  // Save the route data including the static map URL
  const route = new Route({
    staticMapUrl,
    staticMapPublicId,
    ...otherRouteData
  });
  
  route.save()
    .then(savedRoute => res.json(savedRoute))
    .catch(err => res.status(500).json({ error: err.message }));
});
```

The API endpoints in `api/routes/index.js` and `api/routes/public/index.js` have been updated to handle these fields.

### In Cloudinary Embed Data

The static map URLs are also included in the Cloudinary embed data JSON files, which are used for embedded maps and presentations:

- The embed data is stored in Cloudinary with the public ID format: `embed-{persistentId}`
- The embed data JSON includes the `staticMapUrl` and `staticMapPublicId` fields at the top level
- It also includes these fields in the `_loadedState` object

You can access the embed data directly from Cloudinary using the URL format:
```
https://res.cloudinary.com/your-cloud-name/raw/upload/v1234567890/embeds/embed-{persistentId}.json
```

Or through the API endpoint:
```
/api/routes/embed/{persistentId}
```

This allows embedded maps and presentations to use the static map images for faster loading, just like the landing page.

### Automatic Updates

The embed data is automatically updated whenever the static map URL changes:

- When a route is created, the static map image is generated and included in the embed data
- When a route is updated, if the static map URL changes, the embed data is regenerated with the new URL
- Even partial updates that only change the static map URL will trigger an embed data update
- This ensures that embedded maps and presentations always use the latest static map image

The backend API has been configured to include `staticMapUrl` and `staticMapPublicId` in the list of fields that trigger an embed data update, so you don't need to manually update the embed data when the static map changes.

## Benefits

- **Faster Loading**: Pre-generated static images load much faster than initializing a Mapbox GL instance
- **More Reliable**: Avoids URL length limitations and rendering issues
- **Better Route Visualization**: Can include more complex route details in the pre-generated images
- **Optimized Images**: Leverages Cloudinary's image optimization for different devices and screen sizes
- **Reduced Resource Usage**: No JavaScript execution or WebGL context creation for map rendering
- **Better Mobile Experience**: Particularly beneficial for mobile users with limited bandwidth

## Implementation Plan

1. Update `RouteContext.js` to generate static map images during the save process
2. Create a utility function to render routes on an off-screen canvas
3. Integrate with Cloudinary for image upload using existing utilities
4. Update the route data structure to include the static map URL
5. Ensure the backend API stores this URL in MongoDB
6. Modify the ImageSlider and RouteCard components to use these URLs
7. Implement a background process to generate static maps for existing routes

## Future Improvements

- Add a regeneration mechanism to update static maps when routes change
- Implement different map styles for different contexts (e.g., satellite for some views, terrain for others)
- Add custom markers and styling to the pre-generated maps
- Implement progressive loading of dynamic maps after static maps are displayed
- Add caching mechanisms to avoid regenerating maps when routes haven't changed
