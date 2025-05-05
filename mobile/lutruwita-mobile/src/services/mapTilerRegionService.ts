import { regionBounds, tileSources } from '../config/mapTilerRegions';
import { RouteMap } from './routeService';

export interface Region {
  id: string;
  name: string;
  bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  tileSource: string;
  estimatedSize: number; // in MB
  downloadSize?: number; // Actual download size in bytes
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
    // If route doesn't have a bounding box, return null
    if (!route || !route.boundingBox) return null;
    
    const [minLon, minLat] = route.boundingBox[0];
    const [maxLon, maxLat] = route.boundingBox[1];
    const bounds = [minLon, minLat, maxLon, maxLat] as [number, number, number, number];
    
    // Check each region for intersection
    for (const [region, regBounds] of Object.entries(regionBounds)) {
      const [rMinLon, rMinLat, rMaxLon, rMaxLat] = regBounds;
      
      // Check if the bounds intersect
      if (!(maxLon < rMinLon || minLon > rMaxLon || maxLat < rMinLat || minLat > rMaxLat)) {
        return {
          id: region,
          name: formatRegionName(region),
          bounds: regBounds,
          tileSource: tileSources[region],
          estimatedSize: estimateRegionSize(region, regBounds)
        };
      }
    }
    
    // If no regions intersect, return the closest one
    let closestRegion = null;
    let minDistance = Infinity;
    
    // Calculate center of input bounds
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    
    for (const [region, regBounds] of Object.entries(regionBounds)) {
      const [rMinLon, rMinLat, rMaxLon, rMaxLat] = regBounds;
      
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
          bounds: regBounds,
          tileSource: tileSources[region],
          estimatedSize: estimateRegionSize(region, regBounds)
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
    getRegionForRoute,
    formatRegionName
  };
};
