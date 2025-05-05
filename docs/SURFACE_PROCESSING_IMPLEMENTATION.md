# Surface Processing Implementation

## Overview

This document describes the implementation of the surface processing feature in the Lutruwita2 application. The feature uses vector tiles from MapTiler to detect the surface type (paved or unpaved) of roads along a GPX route. The application now supports all Australian states and territories as well as New Zealand.

## Implementation Details

### Vector Tile Service

The `vectorTileService.js` file provides functionality to load and process vector tiles from MapTiler. It uses the following key components:

1. **RBush Spatial Index**: For efficient spatial queries to find the nearest road to a given point.
2. **Vector Tile Loading**: Loads vector tiles from MapTiler based on the route's bounding box.
3. **Surface Type Detection**: Determines whether a road is paved or unpaved based on its properties.
4. **On-Demand Loading**: Tiles are loaded only when needed for surface detection, not as permanent map layers.

### Key Changes

1. **Updated MapTiler Sources**: 
   - Tasmania: "tasmania-roads-filtered" tileset
     - URL: `https://api.maptiler.com/tiles/0196150f-725e-7ed9-946d-0c834ce8fc95/tiles.json?key=DFSAZFJXzvprKbxHrHXv`
   - Victoria North: "victoria-north" tileset
     - URL: `https://api.maptiler.com/tiles/0196195a-de88-76e9-843f-9e8a373cc078/tiles.json?key=DFSAZFJXzvprKbxHrHXv`
   - Victoria South: "victoria-south" tileset
     - URL: `https://api.maptiler.com/tiles/01961954-9312-726f-a37b-320cfa76aea0/tiles.json?key=DFSAZFJXzvprKbxHrHXv`
   - NSW Part 1: "nsw-part1" tileset
     - URL: `https://api.maptiler.com/tiles/01961a2c-f4ea-7748-a9a9-e98d2dcab3dc/tiles.json?key=DFSAZFJXzvprKbxHrHXv`
   - NSW Part 2: "nsw-part2" tileset
     - URL: `https://api.maptiler.com/tiles/019619db-0a35-79cb-b098-2ac8ef8d8213/tiles.json?key=DFSAZFJXzvprKbxHrHXv`
   - Queensland: "queensland" tileset
     - URL: `https://api.maptiler.com/tiles/019619cb-40fa-7392-ac45-0a2bee28806b/tiles.json?key=DFSAZFJXzvprKbxHrHXv`
   - South Australia: "south-australia" tileset
     - URL: `https://api.maptiler.com/tiles/019619a2-1890-7dc3-b3a5-cd6ede88f26a/tiles.json?key=DFSAZFJXzvprKbxHrHXv`
   - Western Australia: "western-australia" tileset
     - URL: `https://api.maptiler.com/tiles/01961a53-6bf9-70b5-96f6-60c0be7cc9d0/tiles.json?key=DFSAZFJXzvprKbxHrHXv`
   - Northern Territory & ACT: "nt-act" tileset
     - URL: `https://api.maptiler.com/tiles/0196800b-307f-74ac-9634-e1004495bdf0/tiles.json?key=DFSAZFJXzvprKbxHrHXv`
   - New Zealand: "new-zealand" tileset
     - URL: `https://api.maptiler.com/tiles/01968004-0de6-7e5e-8dc8-9e452336a543/tiles.json?key=DFSAZFJXzvprKbxHrHXv`
   - These tilesets provide comprehensive road data with surface information for all of Australia and New Zealand

2. **Region-Based Tile Selection**:
   - Added automatic detection of route location across all Australian states/territories and New Zealand
   - Dynamically selects the appropriate tileset based on geographic bounds
   - Handles routes that cross between regions by loading tiles from multiple sources
   - Improved tile coordinate calculation with proper handling of Y-coordinate inversion
   - Implemented fallback mechanisms for different zoom levels

3. **Enhanced Surface Detection**:
   - Using a 5-meter search radius for precise surface detection
   - Applying smoothing and gap-filling algorithms to improve accuracy
   - Implementing "chatter removal" to eliminate short segments of different surface types
   - Generating unpaved sections for visualization on the map

4. **Progress Reporting**:
   - Added progress reporting during surface detection
   - Displaying percentage completion in the UI

5. **Route Deletion Fix**:
   - Improved the route deletion process to properly clean up all map layers
   - Added more comprehensive layer and source pattern matching
   - Implemented forced map redraw after deletion

## Usage

The surface detection process is automatically applied when uploading a GPX file. The application:

1. Parses the GPX file to extract coordinates
2. Loads vector tiles covering the route's bounding box
3. For each point in the route, finds the nearest road and determines its surface type
4. Applies smoothing and gap-filling to improve the results
5. Generates unpaved sections for visualization on the map

## Technical Details

### Surface Processing Pipeline

The surface detection process follows these steps:

1. **Initial Surface Detection**: For each point in the route, find the nearest road and determine its surface type
2. **Gap Filling**: Fill in unknown surface types based on surrounding known surfaces
3. **Smoothing**: Convert isolated unpaved points to paved if fewer than 40% of surrounding points are unpaved
4. **Inverse Smoothing**: Convert isolated paved points to unpaved if more than 40% of surrounding points are unpaved
5. **Chatter Removal**: Eliminate short segments of different surface types by replacing them with the surface type of adjacent longer segments

### Chatter Removal Algorithm

The chatter removal algorithm addresses the issue of small, isolated sections of different surface types appearing between sustained sections of the same type. This can happen due to missing data, GPS inaccuracies, or the system picking up nearby side roads.

The algorithm:
1. Identifies all segments of consistent surface type
2. Finds segments shorter than a minimum length (default: 5 points)
3. Replaces these short segments with the surface type of adjacent segments

This ensures a more consistent and accurate representation of the road surface along the route.

### Tile Coordinate Calculation

The conversion between geographic coordinates and tile coordinates is a critical part of the implementation. The formula for converting latitude and longitude to tile coordinates at a specific zoom level is:

```javascript
// Convert longitude to tile X coordinate
const lonToTileX = (lon, zoom) => {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
};

// Convert latitude to tile Y coordinate
const latToTileY = (lat, zoom) => {
  const latRad = lat * Math.PI / 180;
  // Note: The formula is inverted for tile Y coordinates
  return Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
};
```

### Surface Type Detection

The application determines surface types based on the following properties:

- **Paved Surfaces**: 'paved', 'asphalt', 'concrete', 'sealed', 'bitumen', 'tar', 'chipseal', 'paving_stones'
- **Unpaved Surfaces**: 'unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth', 'ground', 'sand', 'grass', 'compacted', 'crushed_stone', 'woodchips', 'pebblestone', 'mud', 'rock', 'stones', 'gravel;grass'
- **Unpaved Highways**: 'track', 'trail', 'path'

If a road has no explicit surface information, it defaults to 'paved'.

## Future Improvements

Potential future improvements to the surface detection feature include:

1. **Caching**: Implement caching of vector tiles and processed results to improve performance for repeated routes
2. **Server-Side Processing**: Move the surface detection process to the server for better performance
3. **Machine Learning**: Use machine learning to improve surface detection accuracy based on historical data
4. **Additional Surface Types**: Expand beyond the binary paved/unpaved classification to include more detailed surface types
5. **Mapbox Integration**: Evaluate if switching to Mapbox vector tiles would provide performance benefits
