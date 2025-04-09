import RBush from 'rbush';
import { getDistanceToRoad } from '../utils/roadUtils';
import Protobuf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';

// Constants for surface types (reuse from surfaceService.js)
const PAVED_SURFACES = ['paved', 'asphalt', 'concrete', 'sealed', 'bitumen', 'tar', 'chipseal', 'paving_stones'];
const UNPAVED_SURFACES = ['unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth', 'ground', 'sand', 'grass', 'compacted', 'crushed_stone', 'woodchips', 'pebblestone', 'mud', 'rock', 'stones', 'gravel;grass'];
const UNPAVED_HIGHWAYS = ['track', 'trail', 'path'];

class VectorTileService {
  constructor() {
    this.roadIndex = new RBush();
    this.isLoading = false;
    this.loadPromise = null;
    this.loadedTiles = new Set();
    
    // Replace single tileSource with a map of regions to sources
    this.tileSources = {
      'tasmania': 'https://api.maptiler.com/tiles/0196150f-725e-7ed9-946d-0c834ce8fc95/tiles.json?key=DFSAZFJXzvprKbxHrHXv',
      'victoria-north': 'https://api.maptiler.com/tiles/0196195a-de88-76e9-843f-9e8a373cc078/tiles.json?key=DFSAZFJXzvprKbxHrHXv',
      'victoria-south': 'https://api.maptiler.com/tiles/01961954-9312-726f-a37b-320cfa76aea0/tiles.json?key=DFSAZFJXzvprKbxHrHXv'
    };
    
    // Define geographic bounds for each region
    this.regionBounds = {
      'tasmania': [144.5, -43.7, 148.5, -40.5], // [minLon, minLat, maxLon, maxLat]
      'victoria-north': [141.0, -37.0, 150.0, -34.0],
      'victoria-south': [141.0, -39.2, 150.0, -37.0]
    };
    
    this.tileCache = new Map();
    this.indexedFeatures = [];
    this.tileInfo = {}; // Store metadata for each region
  }

  /**
   * Determine which regions a bounding box intersects with
   */
  _getRegionsForBounds(bounds) {
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const intersectingRegions = [];
    
    // Check each region for intersection
    for (const [region, regionBounds] of Object.entries(this.regionBounds)) {
      const [rMinLon, rMinLat, rMaxLon, rMaxLat] = regionBounds;
      
      // Check if the bounds intersect
      if (!(maxLon < rMinLon || minLon > rMaxLon || maxLat < rMinLat || minLat > rMaxLat)) {
        intersectingRegions.push(region);
      }
    }
    
    // If no regions intersect, return the closest one
    if (intersectingRegions.length === 0) {
      let closestRegion = null;
      let minDistance = Infinity;
      
      // Calculate center of input bounds
      const centerLon = (minLon + maxLon) / 2;
      const centerLat = (minLat + maxLat) / 2;
      
      for (const [region, regionBounds] of Object.entries(this.regionBounds)) {
        const [rMinLon, rMinLat, rMaxLon, rMaxLat] = regionBounds;
        
        // Calculate center of region bounds
        const rCenterLon = (rMinLon + rMaxLon) / 2;
        const rCenterLat = (rMinLat + rMaxLat) / 2;
        
        // Calculate distance between centers (simple Euclidean distance is sufficient here)
        const distance = Math.sqrt(
          Math.pow(centerLon - rCenterLon, 2) + 
          Math.pow(centerLat - rCenterLat, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestRegion = region;
        }
      }
      
      console.log(`[VectorTileService] No region intersection found, using closest region: ${closestRegion}`);
      return [closestRegion];
    }
    
    console.log(`[VectorTileService] Found intersecting regions: ${intersectingRegions.join(', ')}`);
    return intersectingRegions;
  }

  /**
   * Initialize the service by loading the tile source metadata for a specific region
   */
  async initialize(region) {
    try {
      console.log(`[VectorTileService] Initializing service for region: ${region}`);
      
      // If we've already initialized this region, return the cached metadata
      if (this.tileInfo[region]) {
        return this.tileInfo[region];
      }
      
      const tileSource = this.tileSources[region];
      if (!tileSource) {
        throw new Error(`Unknown region: ${region}`);
      }
      
      const response = await fetch(tileSource);
      if (!response.ok) {
        throw new Error(`Failed to load tile source for ${region}: ${response.statusText}`);
      }
      
      const metadata = await response.json();
      this.tileInfo[region] = metadata;
      
      console.log(`[VectorTileService] Tile source metadata loaded for ${region}:`, {
        name: metadata.name,
        minzoom: metadata.minzoom,
        maxzoom: metadata.maxzoom,
        format: metadata.format,
        tiles: metadata.tiles?.[0]
      });
      
      return metadata;
    } catch (error) {
      console.error(`[VectorTileService] Error initializing service for ${region}:`, error);
      throw error;
    }
  }

  /**
   * Load vector tiles for a given bounding box
   */
  async loadTilesForBounds(bounds) {
    if (this.isLoading) {
      await this.loadPromise;
    }
    
    this.isLoading = true;
    this.loadPromise = this._loadTilesForBoundsInternal(bounds);
    
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Internal method to load and process tiles
   */
  async _loadTilesForBoundsInternal(bounds) {
    try {
      // Determine which regions intersect with these bounds
      const regions = this._getRegionsForBounds(bounds);
      console.log(`[VectorTileService] Loading tiles for bounds in regions:`, regions);
      
      // Process each region
      for (const region of regions) {
        // If we haven't initialized this region yet, do it now
        if (!this.tileInfo[region]) {
          await this.initialize(region);
        }
        
        // Use the highest zoom level for maximum detail
        const zoom = 12; // Maximum zoom level for this tileset
        console.log(`[VectorTileService] Using zoom level ${zoom} for tile loading in ${region}`);
        const tiles = this._getTilesForBounds(bounds, zoom);
        
        console.log(`[VectorTileService] Loading ${tiles.length} tiles for bounds in ${region}:`, bounds);
        
        // Log the tile coordinates for debugging
        if (tiles.length === 0) {
          console.warn(`[VectorTileService] No tiles found for the given bounds and zoom level in ${region}!`);
          console.log('[VectorTileService] Trying a lower zoom level...');
          
          // Try a lower zoom level if no tiles were found
          const lowerZoom = 10;
          const lowerZoomTiles = this._getTilesForBounds(bounds, lowerZoom);
          console.log(`[VectorTileService] Found ${lowerZoomTiles.length} tiles at zoom level ${lowerZoom}`);
          
          if (lowerZoomTiles.length > 0) {
            console.log('[VectorTileService] Using lower zoom level tiles instead');
            tiles.push(...lowerZoomTiles);
          }
        } else {
          console.log('[VectorTileService] Tile coordinates:', tiles.map(t => `${t.z}/${t.x}/${t.y}`));
        }
        
        // Load each tile and index its features
        const newFeatures = [];
        
        for (const tile of tiles) {
          const tileId = `${region}/${tile.z}/${tile.x}/${tile.y}`;
          
          // Skip if we've already loaded this tile
          if (this.loadedTiles.has(tileId)) {
            continue;
          }
          
          // Construct the tile URL using the template from the metadata
          let tileUrl;
          if (this.tileInfo[region].tiles && this.tileInfo[region].tiles.length > 0) {
            tileUrl = this.tileInfo[region].tiles[0]
              .replace('{z}', tile.z)
              .replace('{x}', tile.x)
              .replace('{y}', tile.y);
          } else {
            // Fallback to direct URL construction if tiles template is not available
            tileUrl = `${this.tileSources[region].replace('tiles.json', '')}${tile.z}/${tile.x}/${tile.y}.pbf?key=DFSAZFJXzvprKbxHrHXv`;
          }
          
          console.log(`[VectorTileService] Loading tile: ${region}/${tile.z}/${tile.x}/${tile.y}`);
          
          // Fetch and process the tile
          const tileFeatures = await this._fetchAndProcessTile(tileUrl, tile);
          newFeatures.push(...tileFeatures);
          
          // Mark this tile as loaded
          this.loadedTiles.add(tileId);
        }
        
        // Add all new features to the index
        if (newFeatures.length > 0) {
          this._indexFeatures(newFeatures);
          console.log(`[VectorTileService] Added ${newFeatures.length} features to index from ${region}`);
        }
      }
    } catch (error) {
      console.error('[VectorTileService] Error loading tiles:', error);
      throw error;
    }
  }

  /**
   * Fetch and process a single vector tile
   */
  async _fetchAndProcessTile(url, tile) {
    try {
      // Check cache first
      if (this.tileCache.has(url)) {
        return this.tileCache.get(url);
      }
      
      console.log(`[VectorTileService] Fetching tile from URL: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`[VectorTileService] Failed to load tile: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to load tile: ${response.statusText}`);
      }
      console.log(`[VectorTileService] Tile fetch successful: ${response.status} ${response.statusText}`);
      
      // Get the tile data as an ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Parse the PBF data into a VectorTile object
      const vectorTile = new VectorTile(new Protobuf(arrayBuffer));
      
      // Extract road features from the tile
      const features = [];
      
      // Log all available layers in the vector tile
      const layerNames = Object.keys(vectorTile.layers);
      console.log(`[VectorTileService] Vector tile layers: ${layerNames.join(', ')}`);
      
      if (layerNames.length === 0) {
        console.warn('[VectorTileService] No layers found in vector tile!');
        return [];
      }
      
      // Get the first layer from the vector tile
      const layerName = layerNames[0];
      console.log(`[VectorTileService] Using vector tile layer: ${layerName}`);
      
      const layer = vectorTile.layers[layerName];
      
      if (!layer) {
        console.warn(`[VectorTileService] Layer "${layerName}" not found in vector tile!`);
        return [];
      }
      
      console.log(`[VectorTileService] Layer has ${layer.length} features`);
      
      if (layer) {
        for (let i = 0; i < layer.length; i++) {
          const feature = layer.feature(i);
          const geom = feature.loadGeometry();
          
          // Log some feature properties for debugging
          if (i < 5) { // Only log the first 5 features to avoid flooding the console
            console.log(`[VectorTileService] Feature ${i} properties:`, feature.properties);
          }
          
          // Convert to GeoJSON
          const geojson = this._vectorTileFeatureToGeoJSON(feature, geom, tile);
          if (geojson) {
            features.push(geojson);
          }
        }
      }
      
      console.log(`[VectorTileService] Extracted ${features.length} features from tile`);
      
      // Cache the features
      this.tileCache.set(url, features);
      
      return features;
    } catch (error) {
      console.error(`[VectorTileService] Error fetching tile ${url}:`, error);
      return [];
    }
  }

  /**
   * Convert a vector tile feature to GeoJSON
   */
  _vectorTileFeatureToGeoJSON(feature, geometry, tile) {
    // Extract properties
    const properties = {};
    for (const key in feature.properties) {
      properties[key] = feature.properties[key];
    }
    
    // Convert coordinates from tile space to longitude/latitude
    const coordinates = [];
    
    for (const ring of geometry) {
      const lineString = [];
      
      for (const point of ring) {
        // Convert from tile coordinates to longitude/latitude
        const lon = this._tileToLon(point.x, tile.x, tile.z);
        const lat = this._tileToLat(point.y, tile.y, tile.z);
        
        lineString.push([lon, lat]);
      }
      
      coordinates.push(lineString);
    }
    
    // Create GeoJSON feature
    return {
      type: 'Feature',
      properties,
      geometry: {
        type: coordinates.length === 1 ? 'LineString' : 'MultiLineString',
        coordinates: coordinates.length === 1 ? coordinates[0] : coordinates
      }
    };
  }

  /**
   * Convert tile X coordinate to longitude
   */
  _tileToLon(x, tileX, zoom) {
    const tileSize = 4096; // Vector tile extent
    const worldSize = Math.pow(2, zoom) * 256;
    const pixelX = (tileX * 256) + (x * 256 / tileSize);
    return (pixelX / worldSize) * 360 - 180;
  }

  /**
   * Convert tile Y coordinate to latitude
   */
  _tileToLat(y, tileY, zoom) {
    const tileSize = 4096; // Vector tile extent
    const worldSize = Math.pow(2, zoom) * 256;
    const pixelY = (tileY * 256) + (y * 256 / tileSize);
    const mercatorY = 180 - (pixelY / worldSize) * 360;
    return Math.atan(Math.sinh(mercatorY * Math.PI / 180)) * 180 / Math.PI;
  }

  /**
   * Calculate tile coordinates for a bounding box
   */
  _getTilesForBounds(bounds, zoom) {
    const [minLon, minLat, maxLon, maxLat] = bounds;
    
    console.log(`[VectorTileService] Converting bounds to tile coordinates: [${minLon}, ${minLat}, ${maxLon}, ${maxLat}] at zoom ${zoom}`);
    
    // Helper function to convert lon to tile X
    const lonToTileX = (lon) => {
      return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    };
    
    // Helper function to convert lat to tile Y
    const latToTileY = (lat) => {
      const latRad = lat * Math.PI / 180;
      // Note: The formula is inverted for tile Y coordinates
      return Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
    };
    
    // Convert bounds to tile coordinates
    // Note: For Y coordinates, maxLat corresponds to minY and minLat corresponds to maxY
    const minX = lonToTileX(minLon);
    const maxX = lonToTileX(maxLon);
    const minY = latToTileY(maxLat); // Note the inversion
    const maxY = latToTileY(minLat); // Note the inversion
    
    console.log(`[VectorTileService] Tile coordinates: X range [${minX}-${maxX}], Y range [${minY}-${maxY}]`);
    
    // Try a range of zoom levels if needed
    const tiles = [];
    
    // If we're at a high zoom level and no tiles are found, try a lower zoom
    if (zoom > 8 && (maxX - minX > 10 || maxY - minY > 10 || minX === maxX || minY === maxY)) {
      console.log(`[VectorTileService] Range too large or empty at zoom ${zoom}, trying lower zoom`);
      // Add a single tile at a lower zoom that covers the area
      const lowerZoom = 8;
      const centerLon = (minLon + maxLon) / 2;
      const centerLat = (minLat + maxLat) / 2;
      const centerX = Math.floor((centerLon + 180) / 360 * Math.pow(2, lowerZoom));
      const centerY = Math.floor((1 - Math.log(Math.tan(centerLat * Math.PI / 180) + 1 / Math.cos(centerLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, lowerZoom));
      
      tiles.push({ x: centerX, y: centerY, z: lowerZoom });
      console.log(`[VectorTileService] Added center tile at zoom ${lowerZoom}: ${centerX},${centerY}`);
    } else {
      // Add all tiles in the range
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          tiles.push({ x, y, z: zoom });
        }
      }
    }
    
    // If still no tiles, add a fallback tile at zoom level 6
    if (tiles.length === 0) {
      console.log(`[VectorTileService] No tiles found, adding fallback tile at zoom 6`);
      // Tasmania is approximately at these coordinates
      const tasmaniaX = Math.floor((147 + 180) / 360 * Math.pow(2, 6));
      const tasmaniaY = Math.floor((1 - Math.log(Math.tan(-42 * Math.PI / 180) + 1 / Math.cos(-42 * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, 6));
      tiles.push({ x: tasmaniaX, y: tasmaniaY, z: 6 });
    }
    
    console.log(`[VectorTileService] Generated ${tiles.length} tiles`);
    return tiles;
  }

  /**
   * Index features for fast spatial queries
   */
  _indexFeatures(features) {
    const indexItems = [];
    
    for (const feature of features) {
      if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates;
        for (let i = 0; i < coords.length - 1; i++) {
          indexItems.push(this._createIndexItem(feature, [coords[i], coords[i + 1]]));
        }
      } else if (feature.geometry.type === 'MultiLineString') {
        for (const line of feature.geometry.coordinates) {
          for (let i = 0; i < line.length - 1; i++) {
            indexItems.push(this._createIndexItem(feature, [line[i], line[i + 1]]));
          }
        }
      }
    }
    
    // Add to the index
    this.roadIndex.load(indexItems);
    this.indexedFeatures.push(...features);
  }

  /**
   * Create an item for the R-tree index
   */
  _createIndexItem(feature, segment) {
    const [[lon1, lat1], [lon2, lat2]] = segment;
    return {
      minX: Math.min(lon1, lon2),
      minY: Math.min(lat1, lat2),
      maxX: Math.max(lon1, lon2),
      maxY: Math.max(lat1, lat2),
      feature,
      segment
    };
  }

  /**
   * Find the nearest road to a point
   */
  findNearestRoad(point, searchRadius = 0.001) {
    const [lon, lat] = point;
    
    // Define search area
    const searchArea = {
      minX: lon - searchRadius,
      minY: lat - searchRadius,
      maxX: lon + searchRadius,
      maxY: lat + searchRadius
    };
    
    // Search the index
    const nearbySegments = this.roadIndex.search(searchArea);
    
    if (nearbySegments.length === 0) {
      return null;
    }
    
    // Find the closest segment
    let minDist = Infinity;
    let closestFeature = null;
    
    for (const indexedSegment of nearbySegments) {
      const dist = getDistanceToRoad(point, indexedSegment.segment);
      if (dist < minDist) {
        minDist = dist;
        closestFeature = indexedSegment.feature;
      }
    }
    
    return closestFeature;
  }

  /**
   * Determine surface type from road properties
   */
  determineSurfaceType(road) {
    if (!road?.properties) {
      // No properties found for road
      return 'unpaved'; // Default if no road or properties
    }
    
    const surface = (road.properties.surface || '').toLowerCase();
    const highway = (road.properties.highway || '').toLowerCase();
    
    if (PAVED_SURFACES.includes(surface)) {
      return 'paved';
    }
    
    if (UNPAVED_SURFACES.includes(surface)) {
      return 'unpaved';
    }
    
    if (UNPAVED_HIGHWAYS.includes(highway)) {
      return 'unpaved';
    }
    
    // Default assumption for roads without explicit surface info
    return 'paved';
  }
}

// Export a singleton instance
export const vectorTileService = new VectorTileService();
