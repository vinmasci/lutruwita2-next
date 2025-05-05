# MapTiler Offline Maps Implementation - Part 2: MapTiler Region Service

## Implementation Plan: MapTiler Region Service

This section covers the implementation of the MapTiler Region Service, which is responsible for managing geographic regions and determining which region a route belongs to.

### MapTiler Region Service

Create a new service that adapts our existing region logic from the web app:

```typescript
// mobile/lutruwita-mobile/src/services/mapTilerRegionService.ts
import { regionBounds, tileSources } from '../config/mapTilerRegions';

export interface Region {
  id: string;
  name: string;
  bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  tileSource: string;
  estimatedSize: number; // in MB
}

export const useMapTilerRegionService = () => {
  // Get all available regions
  const getAvailableRegions = (): Region[] => {
    return Object.entries(regionBounds).map(([id, bounds]) => ({
      id,
      name: formatRegionName(id),
      bounds,
      tileSource: tileSources[id],
      estimatedSize: estimateRegionSize(id, bounds)
    }));
  };

  // Determine which region a route belongs to
  const getRegionForRoute = (route: RouteMap): Region | null => {
    // Reuse _getRegionsForBounds logic from vectorTileService.js
    if (!route || !route.boundingBox) return null;
    
    const [minLon, minLat] = route.boundingBox[0];
    const [maxLon, maxLat] = route.boundingBox[1];
    const bounds = [minLon, minLat, maxLon, maxLat];
    
    // Check each region for intersection
    for (const [region, regionBounds] of Object.entries(regionBounds)) {
      const [rMinLon, rMinLat, rMaxLon, rMaxLat] = regionBounds;
      
      // Check if the bounds intersect
      if (!(maxLon < rMinLon || minLon > rMaxLon || maxLat < rMinLat || minLat > rMaxLat)) {
        return {
          id: region,
          name: formatRegionName(region),
          bounds: regionBounds,
          tileSource: tileSources[region],
          estimatedSize: estimateRegionSize(region, regionBounds)
        };
      }
    }
    
    // If no regions intersect, return the closest one
    let closestRegion = null;
    let minDistance = Infinity;
    
    // Calculate center of input bounds
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    
    for (const [region, regionBounds] of Object.entries(regionBounds)) {
      const [rMinLon, rMinLat, rMaxLon, rMaxLat] = regionBounds;
      
      // Calculate center of region bounds
      const rCenterLon = (rMinLon + rMaxLon) / 2;
      const rCenterLat = (rMinLat + rMaxLat) / 2;
      
      // Calculate distance between centers
      const distance = Math.sqrt(
        Math.pow(centerLon - rCenterLon, 2) + 
        Math.pow(centerLat - rCenterLat, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestRegion = {
          id: region,
          name: formatRegionName(region),
          bounds: regionBounds,
          tileSource: tileSources[region],
          estimatedSize: estimateRegionSize(region, regionBounds)
        };
      }
    }
    
    return closestRegion;
  };

  // Format region name for display
  const formatRegionName = (regionId: string): string => {
    const names: Record<string, string> = {
      'tasmania': 'Tasmania',
      'victoria-north': 'Victoria (North)',
      'victoria-south': 'Victoria (South)',
      'nsw-part1': 'New South Wales (West)',
      'nsw-part2': 'New South Wales (East)',
      'queensland': 'Queensland',
      'south-australia': 'South Australia',
      'western-australia': 'Western Australia',
      'nt-act': 'Northern Territory & ACT',
      'new-zealand': 'New Zealand'
    };
    return names[regionId] || regionId;
  };

  // Estimate download size based on region bounds and zoom levels
  const estimateRegionSize = (regionId: string, bounds: [number, number, number, number]): number => {
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const minZoom = 9;
    const maxZoom = 15;
    
    let totalTiles = 0;
    
    // For each zoom level, calculate the number of tiles
    for (let z = minZoom; z <= maxZoom; z++) {
      // Convert bounds to tile coordinates
      const minX = long2tile(minLon, z);
      const maxX = long2tile(maxLon, z);
      const minY = lat2tile(maxLat, z);
      const maxY = lat2tile(minLat, z);
      
      // Calculate number of tiles at this zoom level
      const tilesX = maxX - minX + 1;
      const tilesY = maxY - minY + 1;
      totalTiles += tilesX * tilesY;
    }
    
    // Estimate size based on average tile size (15KB)
    const estimatedSizeMB = Math.round(totalTiles * 15 / 1024);
    
    return estimatedSizeMB;
  };

  // Helper functions for tile coordinate calculations
  const long2tile = (lon: number, zoom: number): number => {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  };
  
  const lat2tile = (lat: number, zoom: number): number => {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  };

  return {
    getAvailableRegions,
    getRegionForRoute
  };
};
```

### Key Features of the Region Service

1. **Region Definition**: Each region is defined by its geographic bounds (min/max longitude and latitude).

2. **Region Detection**: The service can determine which region a route belongs to by checking if the route's bounding box intersects with any defined region.

3. **Fallback Logic**: If a route doesn't intersect with any region, the service finds the closest region based on the distance between centers.

4. **Size Estimation**: The service estimates the download size for each region based on the number of tiles required at different zoom levels.

5. **User-Friendly Names**: Region IDs are mapped to user-friendly display names.

See [Part 3](./MAPTILER_OFFLINE_MAPS_IMPLEMENTATION_PART3.md) for the MapTiler Configuration and Tile Storage Service implementation.
