import mapboxgl from 'mapbox-gl';
import { Feature, LineString, MultiLineString, Geometry } from 'geojson';
import { RoadConfidence, RoadSegment, UnpavedSection } from '../types/gpx.types';
import { getBearing, getDistanceToRoad, getVariance, getConsecutiveMatches } from '../utils/roadUtils';

// Constants
const ROAD_LAYER_ID = 'custom-roads';
const SOURCE_LAYER = 'lutruwita';
const PAVED_SURFACES = ['paved', 'asphalt', 'concrete', 'compacted', 'sealed', 'bitumen', 'tar', 'chipseal'];
const UNPAVED_SURFACES = ['unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth', 'ground', 'sand', 'grass'];
const UNPAVED_HIGHWAYS = ['track', 'trail', 'path'];

// Constants for road detection
const VERIFICATION_WINDOW = 3;
const BEARING_TOLERANCE = 30; // Increased for better matching
const VARIANCE_THRESHOLD = 8; // Increased for more flexibility
const TURN_ANGLE_THRESHOLD = 45; // Increased for sharper turns
const MIN_SEGMENT_LENGTH = 3; // Reduced for shorter segments
const DEFAULT_QUERY_BOX = 20; // Increased default query box
const JUNCTION_QUERY_BOX = 40; // Increased junction query box
const RETRY_DELAY = 50; // Reduced delay between retries for faster processing
const MAX_RETRIES = 5; // Reduced retries - will use previous point's surface if failed
const BATCH_SIZE = 10; // Process points in batches

// Helper to convert [lon, lat] array to LngLatLike object with validation
const toLngLat = (coord: [number, number]): { lng: number; lat: number } | null => {
  if (!coord || coord.length !== 2 || !isFinite(coord[0]) || !isFinite(coord[1])) {
    return null;
  }
  return {
    lng: coord[0],
    lat: coord[1]
  };
};

interface Point {
  lat: number;
  lon: number;
  surface?: 'paved' | 'unpaved';
}

type Coordinate = [number, number];
type LineStringCoords = Array<Coordinate>;
type MultiLineStringCoords = Array<LineStringCoords>;

interface RoadFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: LineStringCoords;
  } | {
    type: 'MultiLineString';
    coordinates: MultiLineStringCoords;
  };
  properties: {
    surface?: string;
    highway?: string;
    name?: string;
    ref?: string;
  };
}

// Helper to validate coordinates
const isValidCoordArray = (coords: any): coords is LineStringCoords => {
  return Array.isArray(coords) && coords.length > 0 && 
         coords.every(coord => Array.isArray(coord) && coord.length === 2 &&
                              typeof coord[0] === 'number' && typeof coord[1] === 'number');
};

const isValidMultiLineStringCoords = (coords: any): coords is MultiLineStringCoords => {
  return Array.isArray(coords) && coords.length > 0 && 
         coords.every(line => isValidCoordArray(line));
};

// Wait for map style and vector tiles to load
const waitForMapResources = (map: mapboxgl.Map): Promise<void> => {
  return new Promise((resolve) => {
    const checkResources = () => {
      const source = map.getSource('australia-roads') as mapboxgl.VectorTileSource;
      if (!source) {
        console.log('[surfaceService] Waiting for source to be added...');
        return false;
      }

      if (source.loaded()) {
        console.log('[surfaceService] Vector tiles loaded');
        return true;
      }
      console.log('[surfaceService] Waiting for tiles to load...');
      return false;
    };

    if (checkResources()) {
      resolve();
    } else {
      const checkInterval = setInterval(() => {
        if (checkResources()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        console.warn('[surfaceService] Timeout waiting for resources');
        resolve();
      }, 10000);
    }
  });
};

// Find nearest road with sophisticated detection
const findNearestRoad = (map: mapboxgl.Map, point: [number, number]): RoadFeature | null => {
  const lngLat = toLngLat(point);
  if (!lngLat) {
    console.warn('[findNearestRoad] Invalid coordinates:', point);
    return null;
  }
  
  const projectedPoint = map.project(lngLat);
  
  // First, do a wide scan to detect junction areas
  const wideAreaFeatures = map.queryRenderedFeatures(
    [
      [projectedPoint.x - 50, projectedPoint.y - 50],
      [projectedPoint.x + 50, projectedPoint.y + 50]
    ],
    {
      layers: [ROAD_LAYER_ID],
      filter: ['in', 'highway', 'trunk', 'primary', 'secondary', 'residential']
    }
  );

  // Analyze junction complexity
  const isComplexJunction = wideAreaFeatures.length > 1;
  let queryBox = DEFAULT_QUERY_BOX;

  if (isComplexJunction) {
    // Count unique road names/refs and analyze road types
    const uniqueRoads = new Set(
      wideAreaFeatures
        .map(f => f.properties?.name || f.properties?.ref)
        .filter(Boolean)
    );
    
    const hasMainRoads = wideAreaFeatures.some(f => 
      ['trunk', 'primary', 'secondary'].includes(f.properties?.highway || '')
    );
    
    queryBox = uniqueRoads.size > 1 ? JUNCTION_QUERY_BOX : // Major junction
              hasMainRoads ? JUNCTION_QUERY_BOX * 0.75 : // Main road junction
              wideAreaFeatures.length > 2 ? JUNCTION_QUERY_BOX * 0.5 : // Minor junction
              DEFAULT_QUERY_BOX;
  }

  // Initial box query
  let features: mapboxgl.MapboxGeoJSONFeature[] = map.queryRenderedFeatures(
    [
      [projectedPoint.x - queryBox, projectedPoint.y - queryBox],
      [projectedPoint.x + queryBox, projectedPoint.y + queryBox]
    ],
    { layers: [ROAD_LAYER_ID] }
  );

  // If no features found at junction, try circular pattern
  if (isComplexJunction && features.length === 0) {
    for (let angle = 0; angle < 360; angle += 45) {
      const radian = (angle * Math.PI) / 180;
      const offsetX = Math.cos(radian) * 40;
      const offsetY = Math.sin(radian) * 40;
      
      const radialFeatures: mapboxgl.MapboxGeoJSONFeature[] = map.queryRenderedFeatures(
        [
          [projectedPoint.x + offsetX - 10, projectedPoint.y + offsetY - 10],
          [projectedPoint.x + offsetX + 10, projectedPoint.y + offsetY + 10]
        ],
        { layers: [ROAD_LAYER_ID] }
      );
      
      if (radialFeatures.length > 0) {
        features = features.concat(radialFeatures);
        break;
      }
    }
  }

  // Convert MapboxGeoJSONFeatures to RoadFeatures and prioritize
  if (features.length > 0) {
    // Convert features to RoadFeatures
    const validFeatures = features.filter(f => 
      f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString'
    );

    const roadFeatures = validFeatures
      .map(f => {
        if (!f.geometry) return null;
        
        const isLineString = f.geometry.type === 'LineString';
        const geometry = f.geometry as LineString | MultiLineString;
        
        let coordinates: LineStringCoords;
        
        if (isLineString && isValidCoordArray(geometry.coordinates)) {
          coordinates = geometry.coordinates;
        } else if (!isLineString && Array.isArray(geometry.coordinates) && 
                   geometry.coordinates[0] && isValidCoordArray(geometry.coordinates[0])) {
          coordinates = geometry.coordinates[0];
        } else {
          return null;
        }

        return {
          type: 'Feature' as const,
          geometry: isLineString 
            ? {
                type: 'LineString' as const,
                coordinates: coordinates.map(coord => [coord[0], coord[1]] as [number, number])
              }
            : {
                type: 'MultiLineString' as const,
                coordinates: [coordinates.map(coord => [coord[0], coord[1]] as [number, number])]
              },
          properties: {
            surface: f.properties?.surface,
            highway: f.properties?.highway,
            name: f.properties?.name,
            ref: f.properties?.ref
          }
        } as RoadFeature;
      })
      .filter((f): f is RoadFeature => f !== null);

    return roadFeatures.reduce<RoadFeature | null>((best, current) => {
      if (!best) return current;
      
      // Prioritize main roads
      const bestIsMain = ['trunk', 'primary', 'secondary'].includes(best.properties?.highway || '');
      const currentIsMain = ['trunk', 'primary', 'secondary'].includes(current.properties?.highway || '');
      
      if (bestIsMain && !currentIsMain) return best;
      if (!bestIsMain && currentIsMain) return current;
      
      // If same road type, use the closest one
      let bestCoord: Coordinate | null = null;
      let currentCoord: Coordinate | null = null;

      if (best.geometry.type === 'LineString') {
        bestCoord = best.geometry.coordinates[0];
      } else {
        const coords = best.geometry.coordinates[0];
        if (coords && coords.length > 0) bestCoord = coords[0];
      }

      if (current.geometry.type === 'LineString') {
        currentCoord = current.geometry.coordinates[0];
      } else {
        const coords = current.geometry.coordinates[0];
        if (coords && coords.length > 0) currentCoord = coords[0];
      }

      if (!bestCoord || !currentCoord) {
        return best;
      }
      
      const bestLngLat = toLngLat(bestCoord as [number, number]);
      const currentLngLat = toLngLat(currentCoord as [number, number]);
      
      if (!bestLngLat || !currentLngLat) {
        return best;
      }
      
      const bestDist = map.project(bestLngLat).dist(projectedPoint);
      const currentDist = map.project(currentLngLat).dist(projectedPoint);
      
      return currentDist < bestDist ? current : best;
    }, null);
  }

  return null;
};

// Core surface detection function that processes points one at a time
export const assignSurfacesViaNearest = async (
  map: mapboxgl.Map,
  coords: Point[],
  onProgress?: (progress: number, total: number) => void
): Promise<Point[]> => {
  console.log('[assignSurfacesViaNearest] Starting surface detection...');

  if (!map) {
    console.log('[assignSurfacesViaNearest] No map provided, returning coords unmodified');
    return coords;
  }

  const results: Point[] = [];
  let cachedRoads: RoadFeature[] | null = null;

  // Process one point at a time
  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];

    // Update progress
    if (onProgress) {
      onProgress(i + 1, coords.length);
    }

    // Create bounding box around point (~100m in each direction)
    const bbox = [
      pt.lon - 0.001,
      pt.lat - 0.001,
      pt.lon + 0.001,
      pt.lat + 0.001
    ];

    // Set map view for this point
    map.fitBounds(
      [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
      {
        padding: 50,
        duration: 0,
        maxZoom: 14,
        minZoom: 12
      }
    );

    // Process points in batches to allow tiles to load
    if (i % BATCH_SIZE === 0) {
      // Wait for map to stabilize and tiles to load
      await new Promise<void>((resolve) => {
        let attempts = 0;
        
        const checkTiles = async () => {
          // Try to find roads for the next batch of points
          const batchStart = i;
          const batchEnd = Math.min(i + BATCH_SIZE, coords.length);
          let foundAnyRoads = false;
          
          for (let j = batchStart; j < batchEnd; j++) {
            const road = findNearestRoad(map, [coords[j].lon, coords[j].lat]);
            if (road) {
              foundAnyRoads = true;
              break;
            }
          }

          if (foundAnyRoads) {
            resolve();
            return;
          }

          attempts++;
          if (attempts >= MAX_RETRIES) {
            console.warn(`[assignSurfacesViaNearest] No roads found for batch ${batchStart}-${batchEnd-1} after ${MAX_RETRIES} attempts`);
            resolve();
            return;
          }

          setTimeout(checkTiles, RETRY_DELAY);
        };

        checkTiles();
      });
    }

    // Find nearest road for current point
    const road = findNearestRoad(map, [pt.lon, pt.lat]);
    cachedRoads = road ? [road] : null;

    // Process the point
    let bestSurface: 'paved' | 'unpaved' = 'unpaved';
    let minDist = Infinity;

    if (i % 100 === 0) {
      console.log(
        `[assignSurfacesViaNearest] Processing point #${i}, coords=(${pt.lat}, ${pt.lon})`
      );
    }

    // If no roads found, use previous point's surface type if available
    if (!cachedRoads || cachedRoads.length === 0) {
      const previousPoint = results[results.length - 1];
      results.push({ 
        ...pt, 
        surface: previousPoint ? previousPoint.surface : 'unpaved' 
      });
    } else {
      // Evaluate each road
      for (const road of cachedRoads) {
        if (
          road.geometry.type !== 'LineString' &&
          road.geometry.type !== 'MultiLineString'
        ) {
          continue;
        }

        // Get coordinates based on geometry type
        let lineCoords: LineStringCoords;
        
        try {
          if (road.geometry.type === 'LineString' && isValidCoordArray(road.geometry.coordinates)) {
            lineCoords = road.geometry.coordinates;
          } else if (road.geometry.type === 'MultiLineString' && 
                     isValidMultiLineStringCoords(road.geometry.coordinates)) {
            lineCoords = road.geometry.coordinates[0];
          } else {
            continue;
          }
        } catch (error) {
          console.warn('[assignSurfacesViaNearest] Invalid coordinates:', error);
          continue;
        }

        const dist = getDistanceToRoad([pt.lon, pt.lat], lineCoords);

        // Add a small threshold to prefer staying on main roads
        const DISTANCE_THRESHOLD = 0.001; // 1 meter buffer

        if (dist < minDist - DISTANCE_THRESHOLD ||
          (road.properties?.highway === 'trunk' && dist < minDist + DISTANCE_THRESHOLD)) {
          minDist = dist;
          const surfaceRaw = (road.properties?.surface || '').toLowerCase();
          const highwayType = (road.properties?.highway || '').toLowerCase();
          
          if (PAVED_SURFACES.includes(surfaceRaw)) {
            bestSurface = 'paved';
          } else if (UNPAVED_SURFACES.includes(surfaceRaw) || UNPAVED_HIGHWAYS.includes(highwayType)) {
            bestSurface = 'unpaved';
          } else {
            bestSurface = 'unpaved'; // fallback
          }
        }
      }
      results.push({ ...pt, surface: bestSurface });
    }

    // Clear roads cache after each point
    cachedRoads = null;
  }

  console.log('[assignSurfacesViaNearest] => Finished processing. Returning coords...');
  return results;
};

// Add surface detection overlay
export const addSurfaceOverlay = async (
  map: mapboxgl.Map,
  routeFeature: Feature<LineString>
): Promise<void> => {
  console.log('[surfaceService] Starting surface detection...');

  try {
    // Wait for resources and ensure proper zoom
    await waitForMapResources(map);

    // Convert route coordinates to points
    const points: Point[] = routeFeature.geometry.coordinates.map(coord => ({
      lon: coord[0],
      lat: coord[1]
    }));

    // Process points with surface detection
    const processedPoints = await assignSurfacesViaNearest(map, points);

    // Create sections based on surface changes
    const sections: UnpavedSection[] = [];
    let currentSection: UnpavedSection | null = null;

    for (let i = 0; i < processedPoints.length; i++) {
      const point = processedPoints[i];
      if (point.surface === 'unpaved') {
        if (!currentSection) {
          currentSection = {
            startIndex: i,
            endIndex: i,
            coordinates: [[point.lon, point.lat]],
            surfaceType: 'unpaved'
          };
        } else {
          currentSection.endIndex = i;
          currentSection.coordinates.push([point.lon, point.lat]);
        }
      } else if (currentSection) {
        sections.push(currentSection);
        currentSection = null;
      }
    }

    // Add final section if exists
    if (currentSection) {
      sections.push(currentSection);
    }

    // Add sections to map
    sections.forEach((section, index) => {
      const sourceId = `unpaved-section-${index}`;
      const layerId = `unpaved-section-layer-${index}`;

      // Clean up existing
      if (map.getSource(sourceId)) {
        map.removeLayer(layerId);
        map.removeSource(sourceId);
      }

      // Add source with surface property
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            surface: 'unpaved' // Add surface property
          },
          geometry: {
            type: 'LineString',
            coordinates: section.coordinates as [number, number][]
          }
        }
      });

      // Add simple white dashed line for unpaved segments
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
          'line-dasharray': [1, 3]
        }
      });
    });

    console.log('[surfaceService] Surface detection complete');
  } catch (error) {
    console.error('[surfaceService] Error in surface detection:', error);
    throw error;
  }
};
