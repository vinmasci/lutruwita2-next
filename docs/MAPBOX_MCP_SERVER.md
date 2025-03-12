# Mapbox MCP Server Documentation

## Overview

The Mapbox MCP (Model Context Protocol) server is a custom integration that allows Claude to interact directly with Mapbox APIs. This server enables Claude to perform various mapping operations like geocoding, routing, and generating static maps without requiring you to manually use the Mapbox API.

## Server Location

The Mapbox MCP server is located at:
```
/Users/vincentmasci/Documents/Cline/MCP/mapbox-server
```

## Configuration

The server has been configured with your Mapbox access token and installed in the Claude desktop app configuration. The configuration is stored in:
```
/Users/vincentmasci/Library/Application Support/Claude/claude_desktop_config.json
```

If you need to update the Mapbox API key, edit this file and update the `MAPBOX_API_KEY` value in the `mapbox` server configuration.

## Available Tools

The Mapbox MCP server provides the following tools:

### 1. Geocoding

Convert addresses or place names to coordinates.

**Example usage:**
```
What are the coordinates for Sydney Opera House?
```

**Parameters:**
- `query`: The address or place name to geocode (required)
- `limit`: Maximum number of results to return (optional, default: 5)

### 2. Reverse Geocoding

Get location information from coordinates.

**Example usage:**
```
What's at latitude -33.856, longitude 151.215?
```

**Parameters:**
- `longitude`: The longitude coordinate (required)
- `latitude`: The latitude coordinate (required)
- `limit`: Maximum number of results to return (optional, default: 5)

### 3. Directions

Get routing information between multiple points.

**Example usage:**
```
Show me directions from Melbourne to Sydney
```

**Parameters:**
- `waypoints`: Array of waypoints in [longitude, latitude] format (required)
- `profile`: Routing profile to use (optional, options: "driving", "walking", "cycling", default: "driving")
- `alternatives`: Whether to return alternative routes (optional, default: false)
- `steps`: Whether to return step-by-step instructions (optional, default: false)

### 4. Static Maps

Generate static map image URLs with custom markers.

**Example usage:**
```
Generate a map of Hobart, Tasmania
```

**Parameters:**
- `longitude`: Center longitude (required)
- `latitude`: Center latitude (required)
- `zoom`: Zoom level (optional, range: 0-22, default: 12)
- `width`: Image width in pixels (optional, range: 1-1280, default: 600)
- `height`: Image height in pixels (optional, range: 1-1280, default: 400)
- `style`: Map style (optional, options: "streets-v12", "outdoors-v12", "light-v11", "dark-v11", "satellite-v9", "satellite-streets-v12", default: "streets-v12")
- `markers`: Array of marker objects with longitude, latitude, color, and size (optional)

## How to Use in Your Project

To use the Mapbox MCP server in your project, simply ask Claude questions related to mapping, locations, directions, or static maps. Claude will automatically use the appropriate Mapbox API tool to answer your questions.

### Example Queries

1. **Geocoding:**
   ```
   What are the coordinates for Mount Wellington in Hobart?
   ```

2. **Reverse Geocoding:**
   ```
   What's at these coordinates: 42.8871° S, 147.3331° E?
   ```

3. **Directions:**
   ```
   What's the best route from Hobart to Launceston?
   ```

4. **Static Maps:**
   ```
   Generate a satellite map of Cradle Mountain
   ```
   
   ```
   Show me a map of Freycinet Peninsula with markers at Wineglass Bay and Hazards Beach
   ```

## Maintenance

If you need to update or modify the Mapbox MCP server:

1. Edit the source code at `/Users/vincentmasci/Documents/Cline/MCP/mapbox-server/src/index.ts`
2. Rebuild the server with:
   ```
   cd /Users/vincentmasci/Documents/Cline/MCP/mapbox-server && npm run build
   ```
3. If you need to update the API key, edit the Claude desktop configuration file at:
   ```
   /Users/vincentmasci/Library/Application Support/Claude/claude_desktop_config.json
   ```

## Troubleshooting

If you encounter issues with the Mapbox MCP server:

1. Ensure the server is properly configured in the Claude desktop configuration file
2. Check that your Mapbox API key is valid and has the necessary permissions
3. Verify that the server has been built correctly
4. Restart the Claude desktop app to reload the MCP servers

For more information on MCP servers, refer to the [Model Context Protocol documentation](https://github.com/anthropics/anthropic-cookbook/tree/main/model_context_protocol).
