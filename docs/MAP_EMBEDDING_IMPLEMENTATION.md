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

Our immediate next
# Map Embedding Implementation Plan

This document outlines the plan for implementing a map embedding feature that will allow users to embed maps with routes in their websites.

## Overview

The embedding functionality will enable users to generate an iframe code snippet that can be used to embed the current map view with all visible routes on external websites. The embedded map will maintain the same interactive features as the main application.

## Implementation Components

### 1. Add an Embed Icon to the Sidebar

We'll add a new "Embed" icon to the sidebar under the route list that will trigger the embed dialog.

**Files to modify:**
- `src/features/map/components/Sidebar/icons.js` - Add a new icon to the SidebarIcons object
- `src/features/map/components/Sidebar/SidebarListItems.js` - Add a new item to the bottomItems array

```javascript
// In icons.js
import { Route, Upload, Save, FolderOpen, Camera, MapPin, Eraser, RefreshCw, Code } from 'lucide-react';

export const SidebarIcons = {
    actions: {
        gpx: Route,
        upload: Upload,
        save: Save,
        load: FolderOpen,
        photos: Camera,
        poi: MapPin,
        clear: Eraser,
        embed: Code  // New embed icon
    }
};
```

```javascript
// In SidebarListItems.js - Add to bottomItems array
{
    id: 'embed',
    icon: SidebarIcons.actions.embed,
    text: 'Embed Map',
    onClick: handleEmbedClick
}
```

### 2. Create an Embed Dialog Component

We'll create a new dialog component that will be displayed when the embed icon is clicked. This dialog will:
- Allow users to customize the embed size
- Generate an iframe code snippet
- Provide a copy button for easy copying of the embed code

**Files to create:**
- `src/features/map/components/Sidebar/EmbedDialog.js` - New component for the embed dialog

```jsx
import { useState } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Grid, InputAdornment, Typography 
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useRouteContext } from '../../context/RouteContext';
import { useMapContext } from '../../context/MapContext';

export const EmbedDialog = ({ open, onClose }) => {
    const { routes, currentRoute } = useRouteContext();
    const { map } = useMapContext();
    const [copied, setCopied] = useState(false);
    const [embedSize, setEmbedSize] = useState({ width: 800, height: 600 });
    
    // Get current map state
    const mapState = map ? {
        center: map.getCenter(),
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        style: map.getStyle().name
    } : null;
    
    // Generate a state ID for the current map state
    const stateId = useMemo(() => {
        if (!routes.length) return '';
        // Create a hash of the current routes and map state
        const routeData = routes.map(r => ({
            id: r.id || r.routeId,
            visible: true // We'll show all routes in the embed
        }));
        
        return btoa(JSON.stringify({
            routes: routeData,
            mapState
        }));
    }, [routes, mapState]);
    
    // Generate embed code
    const embedCode = `<iframe 
  src="${window.location.origin}/embed/${stateId}" 
  width="${embedSize.width}" 
  height="${embedSize.height}" 
  style="border:0;" 
  allowfullscreen="" 
  loading="lazy">
</iframe>`;

    // Copy to clipboard functionality
    const handleCopy = () => {
        navigator.clipboard.writeText(embedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Embed Map</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Embed the current map view with all visible routes in your website.
                </Typography>
                
                {/* Size controls */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                        <TextField
                            label="Width"
                            type="number"
                            value={embedSize.width}
                            onChange={(e) => setEmbedSize({...embedSize, width: e.target.value})}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">px</InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            label="Height"
                            type="number"
                            value={embedSize.height}
                            onChange={(e) => setEmbedSize({...embedSize, height: e.target.value})}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">px</InputAdornment>,
                            }}
                        />
                    </Grid>
                </Grid>
                
                {/* Embed code display */}
                <TextField
                    label="Embed Code"
                    multiline
                    rows={4}
                    fullWidth
                    value={embedCode}
                    InputProps={{
                        readOnly: true,
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={handleCopy}
                    startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                    color={copied ? "success" : "primary"}
                >
                    {copied ? "Copied!" : "Copy Code"}
                </Button>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};
```

### 3. Create an Embed View Component

We'll create a new component for the embedded view that will be displayed in the iframe. This component will:
- Load and display routes based on the state ID
- Provide the same interactive features as the main application
- Be optimized for embedding in external websites

**Files to create:**
- `src/features/presentation/components/EmbedMapView/EmbedMapView.js` - New component for the embedded map view

```jsx
import { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, CircularProgress, Typography } from '@mui/material';
import { RouteLayer } from '../../../map/components/RouteLayer';
import { MapProvider } from '../../../map/context/MapContext';
import { RouteProvider } from '../../../map/context/RouteContext';
import { POIProvider } from '../../../poi/context/POIContext';
import { PhotoProvider } from '../../../photo/context/PhotoContext';
import { PlaceProvider } from '../../../place/context/PlaceContext';
import { MAP_STYLES } from '../../../map/components/StyleControl/StyleControl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function EmbedMapView() {
    const { stateId } = useParams();
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [routes, setRoutes] = useState([]);
    const [mapState, setMapState] = useState(null);
    const [error, setError] = useState(null);
    
    // Decode the state ID to get routes and map state
    useEffect(() => {
        try {
            if (!stateId) {
                setError('No state ID provided');
                return;
            }
            
            const decodedState = JSON.parse(atob(stateId));
            setMapState(decodedState.mapState);
            
            // Load routes based on the state
            const loadRoutes = async () => {
                try {
                    const routePromises = decodedState.routes.map(async (routeRef) => {
                        // Load route data from API
                        const response = await fetch(`/api/routes/embed/${routeRef.id}`);
                        if (!response.ok) {
                            throw new Error(`Failed to load route: ${response.statusText}`);
                        }
                        const routeData = await response.json();
                        return {
                            ...routeData,
                            visible: routeRef.visible
                        };
                    });
                    
                    const loadedRoutes = await Promise.all(routePromises);
                    setRoutes(loadedRoutes);
                } catch (error) {
                    console.error('Failed to load routes:', error);
                    setError('Failed to load routes');
                }
            };
            
            loadRoutes();
        } catch (error) {
            console.error('Failed to decode embed state:', error);
            setError('Invalid embed state');
        }
    }, [stateId]);
    
    // Initialize map
    useEffect(() => {
        if (!mapRef.current || !mapState) return;
        
        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: mapState.style ? MAP_STYLES[mapState.style].url : MAP_STYLES.satellite.url,
            center: mapState.center || [146.5, -42.0],
            zoom: mapState.zoom || 10,
            bearing: mapState.bearing || 0,
            pitch: mapState.pitch || 0,
            width: '100%',
            height: '100%'
        });
        
        map.on('load', () => {
            // Add terrain
            map.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14
            });
            
            map.setTerrain({
                source: 'mapbox-dem',
                exaggeration: 1.5
            });
            
            setIsMapReady(true);
        });
        
        // Add Mapbox controls
        map.addControl(new mapboxgl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true
        }), 'top-right');
        
        map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
        
        mapInstance.current = map;
        
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [mapRef, mapState]);
    
    // Map context value
    const mapContextValue = useMemo(() => ({
        map: mapInstance.current,
        dragPreview: null,
        setDragPreview: () => {},
        isMapReady,
        isInitializing: false,
        hoverCoordinates: null,
        setHoverCoordinates: () => {},
        onPoiPlacementClick: undefined,
        setPoiPlacementClick: () => {},
        poiPlacementMode: false,
        setPoiPlacementMode: () => {}
    }), [isMapReady]);
    
    // Render the embedded map view
    return (
        <RouteProvider>
            <MapProvider value={mapContextValue}>
                <POIProvider>
                    <PhotoProvider>
                        <PlaceProvider>
                            <Box sx={{ width: '100%', height: '100vh', position: 'relative' }}>
                                <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                                
                                {!isMapReady && (
                                    <Box sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 1000
                                    }}>
                                        <CircularProgress size={60} sx={{ mb: 2 }} />
                                        <Typography variant="h6" color="white">
                                            Loading map...
                                        </Typography>
                                    </Box>
                                )}
                                
                                {error && (
                                    <Box sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 1000
                                    }}>
                                        <Typography variant="h6" color="error">
                                            Error: {error}
                                        </Typography>
                                    </Box>
                                )}
                                
                                {isMapReady && mapInstance.current && routes.map(route => (
                                    <RouteLayer
                                        map={mapInstance.current}
                                        route={route}
                                        key={route.id || route.routeId}
                                    />
                                ))}
                            </Box>
                        </PlaceProvider>
                    </PhotoProvider>
                </POIProvider>
            </MapProvider>
        </RouteProvider>
    );
}
```

### 4. Add Routing for Embed View

We'll need to add a new route to the application to handle the embed view.

**Files to modify:**
- `src/App.tsx` or the main routing file - Add a new route for the embed view

```jsx
// In the router configuration
<Route path="/embed/:stateId" element={<EmbedMapView />} />
```

### 5. Create Backend API Endpoint for Embed

We'll need to create a new API endpoint to serve route data for embedding.

**Files to create/modify:**
- `server/src/features/gpx/routes/embed.routes.ts` - New route file for embed endpoints
- `server/src/features/gpx/controllers/embed.controller.ts` - New controller for embed endpoints

```typescript
// embed.routes.ts
import { Router } from 'express';
import { getRouteForEmbed } from '../controllers/embed.controller';

const router = Router();

router.get('/:routeId', getRouteForEmbed);

export default router;
```

```typescript
// embed.controller.ts
import { Request, Response } from 'express';
import { RouteModel } from '../models/route.model';

export const getRouteForEmbed = async (req: Request, res: Response) => {
    try {
        const { routeId } = req.params;
        
        // Find the route by ID
        const route = await RouteModel.findOne({ 
            $or: [
                { id: routeId },
                { routeId: routeId },
                { persistentId: routeId }
            ]
        });
        
        if (!route) {
            return res.status(404).json({ error: 'Route not found' });
        }
        
        // Return the route data
        return res.json(route);
    } catch (error) {
        console.error('Error getting route for embed:', error);
        return res.status(500).json({ error: 'Failed to get route' });
    }
};
```

### 6. Configure CORS for Embedding

We'll need to configure CORS to allow embedding from external domains.

**Files to modify:**
- `server/src/server.ts` or the main server file - Update CORS configuration

```typescript
// In the server configuration
app.use(cors({
    origin: '*', // Allow embedding from any domain
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Security Considerations

When implementing the embedding functionality, we need to consider the following security aspects:

1. **Cross-Origin Resource Sharing (CORS)**: Configure CORS headers to allow embedding from external domains.

2. **Content Security Policy (CSP)**: Adjust CSP to allow content to be embedded in iframes on other sites.

3. **Data Privacy**: Ensure that sensitive route data isn't inadvertently exposed.

4. **Rate Limiting**: Implement rate limiting on the embed endpoint to prevent abuse.

5. **Clickjacking Protection**: Consider whether to allow all domains to embed maps or restrict to specific trusted domains.

## Implementation Steps

1. ✅ Add the embed icon to the sidebar
   - Added the Code icon from lucide-react to the SidebarIcons object in `src/features/map/components/Sidebar/icons.js`
   - Added a new item to the bottomItems array in `src/features/map/components/Sidebar/SidebarListItems.js`
   - Added a handler function for the embed icon click event
   - Added state for the embed dialog

2. ✅ Create the EmbedDialog component
   - Created a new component for the embed dialog in `src/features/map/components/Sidebar/EmbedDialog.jsx`
   - Implemented the dialog UI with size controls and embed code display
   - Added copy to clipboard functionality
   - Fixed JSX syntax issues by using .jsx extension

3. ✅ Create the EmbedMapView component
   - Created a new component for the embedded map view in `src/features/presentation/components/EmbedMapView/EmbedMapView.jsx`
   - Implemented loading and displaying routes based on the state ID
   - Added error handling for invalid state IDs or missing routes

4. ✅ Add routing for the embed view
   - Added a new route to the application in `src/App.tsx` to handle the embed view
   - Used React.lazy for code splitting to improve performance

5. ✅ Create backend API endpoints for embed
   - Created a new API endpoint in `api/routes/embed/index.js` to serve route data for embedding
   - Implemented route data retrieval based on route ID
   - Added support for finding routes by persistentId, MongoDB _id, and publicId
   - Added view count tracking for embedded routes

6. ✅ Configure CORS for embedding
   - Updated CORS configuration in vercel.json to allow embedding from external domains
   - Added Access-Control-Allow-Origin: * header to the embed API endpoint
   - Added appropriate CORS headers for methods and headers

7. ✅ Test the embedding functionality
   - Created a test HTML page in `public/test-embed.html` for testing the embedding functionality
   - Updated the test page with a real embed code containing actual route data
   - Fixed an issue in the EmbedMapView component to handle map style names properly
   - Fixed an issue with route ID lookup in the API endpoint to support finding routes by subroute routeId
   - Enhanced the EmbedMapView component to handle parent routes with multiple subroutes
   - Added error handling and fallback mechanisms for routes that can't be loaded
   - Tested the embedded map by opening the test page in a browser

## Current Implementation Issues

The current implementation has several issues that need to be addressed:

1. **Performance Issues**:
   - Routes take a long time to load in the embed view
   - Multiple API calls (one per route) create network overhead
   - Full context architecture adds unnecessary complexity and processing

2. **Missing Features**:
   - POIs are not displaying in the embed view
   - Photos are not properly loaded
   - The sidebar and elevation profile should be included

3. **Data Flow Issues**:
   - The POI context isn't properly initialized with data from the API
   - The currentRoute reference that the POI layer needs isn't properly set

## Improved Implementation Plan

After analyzing other map embedding solutions (like Ride With GPS), we've identified a better approach:

### 1. Simplified iFrame-Based Embedding

- Continue using an iframe to embed maps on external sites
- Create a dedicated, lightweight embed page that's optimized for embedding
- Focus on core functionality while maintaining the sidebar, POIs, photos, and elevation profile

### 2. Single API Request

- Create a dedicated `/api/embed/{embedId}` endpoint that returns ALL necessary data in one request
- Include route geometry, POIs, photos, elevation data, etc. in a single response
- Structure the response to be as simple and flat as possible

```javascript
// Example of improved API response structure
{
  route: {
    id: "route-123",
    name: "Sample Route",
    geojson: { /* GeoJSON data */ },
    // Other essential route data
  },
  pois: {
    draggable: [/* POI objects */],
    places: [/* Place POI objects */]
  },
  photos: [/* Photo objects */],
  elevation: [/* Elevation profile data */],
  mapState: {
    center: [146.5, -42.0],
    zoom: 10,
    bearing: 0,
    pitch: 45,
    style: "satellite"
  }
}
```

### 3. Simplified Component Architecture

- Create a more lightweight embed component that doesn't rely on the full context hierarchy
- Use a more direct data flow from API to display
- Maintain the sidebar, POI markers, and elevation profile with simplified implementations

### 4. Progressive Loading

- Load the map and basic route data first
- Then load POIs, photos, and other details in a second phase
- This gives users a responsive experience while additional data loads

### 5. Caching Strategy

- Implement server-side caching for the embed API endpoint
- Set appropriate cache headers (e.g., Cache-Control with a reasonable max-age)
- This balances freshness with performance - data updates within minutes rather than instantly

## Implementation Steps for the Improved Approach

1. ✅ **Create a Unified Embed API Endpoint**:
   - ✅ Modified the existing embed API endpoint to return all necessary data in one request
   - ✅ Included routes, POIs, photos, and elevation data in the response
   - ✅ Added caching headers for better performance (5-minute cache)
   - ✅ Optimized the data format for the embed view with a flatter structure

2. ✅ **Simplify the Embed Component**:
   - ✅ Refactored the EmbedMapView component to use a more direct data flow
   - ✅ Removed unnecessary context providers and simplified the component hierarchy
   - ✅ Implemented progressive loading (map loads first, then route data)
   - ✅ Created a direct POI marker implementation without using context

3. ✅ **Add POI, Photo, and Elevation Support**:
   - ✅ Implemented direct rendering of POIs from the API response
   - ✅ Added the POI viewer component
   - ✅ Included the elevation profile component
   - ⬜ Add photo markers and viewers (to be completed)

4. ✅ **Optimize for Performance**:
   - ✅ Implemented caching for the embed API endpoint
   - ✅ Minimized client-side processing by using direct component rendering
   - ✅ Used simplified versions of components where possible
   - ✅ Reduced the number of API calls from multiple to just one

5. ⬜ **Test and Refine**:
   - ⬜ Test the embed view with various routes and configurations
   - ⬜ Measure and optimize performance
   - ⬜ Ensure all features work correctly

## Current Implementation Issues

The current implementation has several issues that need to be addressed:

1. **Sidebar Issues**:
   - The sidebar isn't loading properly in the embed view
   - Sidebar styling and content needs to be adjusted for the embed context

2. **Elevation Profile Issues**:
   - The elevation profile isn't loading properly
   - PresentationElevationProfilePanel component may be using context providers that aren't available in the embed view

3. **POI Marker Issues**:
   - POIs are all blue without the proper icons in them
   - The colors and icons aren't working correctly
   - This may be due to CSS styling issues or incorrect icon references

4. **Route Loading Issues**:
   - Only one route is loading, not all of them
   - The embed view is currently only loading the first route from the state
   - Need to modify the code to load and display all routes specified in the state

## Next Steps to Fix Issues

1. **Fix Sidebar Issues**:
   - Create a simplified version of the sidebar specifically for the embed view
   - Ensure proper styling and content for the embed context
   - Remove any dependencies on context providers

2. **Fix Elevation Profile Issues**:
   - Create a simplified version of the elevation profile component for the embed view
   - Ensure it works without depending on context providers
   - Verify that elevation data is properly passed to the component

3. **Fix POI Marker Issues**:
   - Debug the POI marker styling and icon issues
   - Ensure proper CSS is loaded for the POI markers
   - Verify that icon references are correct
   - Add proper styling for the marker bubbles and icons

4. **Fix Route Loading Issues**:
   - Modify the code to load and display all routes specified in the state
   - Update the API endpoint to return all necessary route data
   - Ensure proper handling of multiple routes in the embed view

## Future Enhancements

1. **Customization Options**: Add more options for customizing the embedded map (e.g., show/hide specific features, change map style).

2. **Embed Analytics**: Track usage of embedded maps to understand how they're being used.

3. **Domain Restrictions**: Allow users to restrict which domains can embed their maps.

4. **Responsive Embeds**: Improve responsiveness of embedded maps for different screen sizes.

5. **Embed Presets**: Create preset configurations for common embedding scenarios.

## Code Refactoring

To improve maintainability and code organization, we've refactored the EmbedMapView component by breaking it down into smaller, more focused components:

1. ✅ **Component Extraction**:
   - ✅ Created a components directory: `src/features/presentation/components/EmbedMapView/components/`
   - ✅ Extracted `SimplifiedRouteLayer` into its own component file
   - ✅ Extracted `POIMarker` into its own component file
   - ✅ Extracted `EmbedSidebar` into its own component file
   - ✅ Updated imports and fixed path references

2. ✅ **Main Component Simplification**:
   - ✅ Simplified the main `EmbedMapView.jsx` file by importing the extracted components
   - ✅ Fixed import paths and dependencies
   - ✅ Ensured all components have proper prop passing

3. ✅ **Benefits of Refactoring**:
   - ✅ Improved code maintainability with smaller, focused components
   - ✅ Better separation of concerns
   - ✅ Easier debugging and testing
   - ✅ More manageable file sizes

This refactoring maintains all the functionality of the original implementation while making the code more maintainable and easier to understand. Each component now has a clear, single responsibility, following best practices for React component design.

## Recent Fixes

### Elevation Profile Fix

We identified and fixed an issue with the elevation profile not rendering properly in the embed view:

1. ✅ **Issue Identification**:
   - The elevation profile was showing "No elevation data available" even when elevation data was present
   - Debugging revealed that the route's totalDistance was being set to 0, which prevented the elevation profile from rendering

2. ✅ **Solution Implementation**:
   - Implemented a more robust approach to calculate the totalDistance by:
     - First checking if the route already has a statistics.totalDistance property
     - If not, trying to get the distance from the last point in the elevation profile
     - If that's not available, trying to get it from the geojson properties
     - If that's not available, calculating an approximate distance from the coordinates
     - As a last resort, using a fallback value of 10km

3. ✅ **Elevation Data Handling**:
   - Added proper handling of elevation data from multiple sources:
     - From route.surface.elevationProfile if available
     - From the separate elevation array in the pre-processed data
     - Ensuring the data is in the correct format for the PresentationElevationProfile component

4. ✅ **Debugging Improvements**:
   - Added detailed logging to help debug elevation data issues
   - Logging includes the source of elevation data, number of points, and sample values

The elevation profile now displays correctly with the proper styling, matching the presentation mode experience. This fix ensures that users can see the elevation profile in embedded maps, which is a critical feature for route visualization.

### Distance Markers Implementation

We've added distance markers to the embedded map view to help users understand the distances along the route:

1. ✅ **Feature Implementation**:
   - Added distance markers at 1km intervals along the route
   - Each marker shows the distance in kilometers from the start of the route
   - Markers are styled with white circles and black text for good visibility on all map styles

2. ✅ **Toggle Functionality**:
   - Added a toggle button in the sidebar to show/hide distance markers
   - The toggle state is stored in the component state and passed to the route layer

3. ✅ **Technical Implementation**:
   - Used the @turf/turf library to calculate points along the route at regular intervals
   - Created a separate GeoJSON source for the distance markers
   - Added two layers for each marker: a circle layer for the background and a symbol layer for the text
   - Implemented proper cleanup to remove markers when the component unmounts or when the route changes

4. ✅ **Performance Considerations**:
   - Distance markers are only calculated and added when they are visible
   - Used efficient GeoJSON processing to minimize performance impact

This feature enhances the usability of embedded maps by providing distance reference points, which is especially useful for longer routes or when planning activities based on distance.

### POI Category Visibility Fix

We've fixed an issue with the POI category visibility toggles in the sidebar not affecting the actual visibility of POI markers on the map:

1. ✅ **Issue Identification**:
   - The sidebar was correctly updating the `visiblePOICategories` state when clicking on POI category icons
   - However, this state wasn't being used to control the actual visibility of the POI markers on the map
   - The "hide photo markers" and "hide distance labels" toggles were working correctly, but POI category toggles had no effect

2. ✅ **Solution Implementation**:
   - Modified the `EmbedMapView.jsx` file to pass the `visiblePOICategories` state to each POI marker component
   - Enhanced the `POIMarker.jsx` component to check if its category is in the visible categories list
   - Added conditional rendering logic to only show markers for visible categories
   - Implemented proper cleanup of markers when visibility changes

3. ✅ **Technical Details**:
   - Added a dependency on `visiblePOICategories` in the POI marker's useEffect hook to ensure markers update when visibility changes
   - Used a ref to track marker instances for proper cleanup
   - Updated the comment in the `togglePOICategoryVisibility` function to reflect that POI markers now update automatically

This fix ensures that users can toggle the visibility of different POI categories (road information, accommodation, food & drink, etc.) directly from the sidebar, providing better control over the map's visual elements and reducing clutter when needed.

### Route Description Display Fix

We've added support for displaying route descriptions in the embedded map view:

1. ✅ **Issue Identification**:
   - The route description data was not being included in the embed data sent to the client
   - Even when routes had descriptions, they weren't visible in the embedded view

2. ✅ **Solution Implementation**:
   - Modified the API endpoints in `api/routes/embed/index.js` to include the description field in the embed data
   - Updated the Cloudinary upload functions in `api/routes/index.js` to include the description field in the pre-processed embed data
   - Enhanced the `EmbedSidebar` component to display the route description in a styled container

3. ✅ **UI Improvements**:
   - Added a dedicated section for the route description in the sidebar
   - Applied appropriate styling to make the description stand out from other route information
   - Used proper text formatting with support for multi-line descriptions

This enhancement ensures that important route information stored in descriptions is properly displayed in embedded maps, providing viewers with the same context and details available in the main application.
