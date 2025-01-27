import mapboxgl from 'mapbox-gl';
import { Feature, LineString } from 'geojson';

// Constants from your MapView
const ROAD_LAYER_ID = 'custom-roads';
const SOURCE_LAYER = 'lutruwita';

export interface UnpavedSection {
  startIndex: number;
  endIndex: number;
  coordinates: [number, number][];
  surfaceType: string;
}

// Wait for map style and vector tiles to load
const waitForMapResources = (map: mapboxgl.Map): Promise<void> => {
  return new Promise((resolve) => {
    const checkResources = () => {
      const source = map.getSource('australia-roads') as mapboxgl.VectorTileSource;
      if (!source) {
        console.log('[surfaceService] Waiting for source to be added...');
        return false;
      }

      // Check if source is loaded and has tiles
      try {
        const bounds = map.getBounds();
        const zoom = Math.min(Math.max(map.getZoom(), 12), 14); // Constrain zoom
        
        // Check if source is loaded
        if (source.loaded()) {
          console.log('[surfaceService] Vector tiles loaded');
          return true;
        }
        console.log('[surfaceService] Waiting for tiles to load...');
        return false;
      } catch (e) {
        console.log('[surfaceService] Error checking source loaded state:', e);
        return false;
      }
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

      // Set a timeout to avoid infinite waiting
      setTimeout(() => {
        clearInterval(checkInterval);
        console.warn('[surfaceService] Timeout waiting for resources');
        resolve();
      }, 10000);
    }
  });
};

// Check if roads layer exists
const checkRoadsLayer = (map: mapboxgl.Map): boolean => {
  return !!map.getLayer(ROAD_LAYER_ID);
};

// Check if surface is unpaved
const isUnpavedSurface = (surface?: string): boolean => {
  const unpavedTypes = ['unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth'];
  return unpavedTypes.includes(surface || '');
};

// Add surface detection overlay
export const addSurfaceOverlay = async (
  map: mapboxgl.Map,
  routeFeature: Feature<LineString>
): Promise<void> => {
  console.log('[surfaceService] Starting surface detection...');

  try {
    // 1. First verify map state
    console.log('[surfaceService] Map loaded:', map.isStyleLoaded());
    console.log('[surfaceService] Terrain loaded:', map.getTerrain());
    console.log('[surfaceService] Roads source:', map.getSource('australia-roads'));
    console.log('[surfaceService] Roads layer:', map.getLayer('custom-roads'));

    // 2. Check route feature
    console.log('[surfaceService] Route feature:', {
      type: routeFeature.type,
      coordinates: routeFeature.geometry.coordinates.length,
      bbox: routeFeature.bbox,
      properties: routeFeature.properties
    });

    // Wait for resources and ensure proper zoom
    await waitForMapResources(map);
    
    // Check for roads layer
    if (!checkRoadsLayer(map)) {
      console.error('[surfaceService] Roads layer not available');
      return;
    }

    // Center on first coordinate and set zoom
    const testPoint = routeFeature.geometry.coordinates[0] as [number, number];
    console.log('[surfaceService] Centering on test point:', testPoint);
    
    map.setCenter(testPoint);
    const currentZoom = map.getZoom();
    if (currentZoom !== 13) {
      console.log('[surfaceService] Adjusting zoom level from', currentZoom, 'to 13');
      map.setZoom(13);
    }

    // Wait for map movements to finish and new tiles to load
    console.log('[surfaceService] Waiting for map to settle...');
    await new Promise<void>((resolve) => {
      const checkComplete = () => {
        // Check if map movement is complete
        if (!map.isMoving() && !map.isZooming()) {
          // Wait a bit more for tiles to render
          setTimeout(resolve, 500);
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      
      // Start checking after initial movement
      map.once('moveend', () => {
        console.log('[surfaceService] Move ended, checking tile loading...');
        checkComplete();
      });
    });

    // Additional wait for source data
    await new Promise<void>((resolve) => {
      const source = map.getSource('australia-roads') as mapboxgl.VectorTileSource;
      if (source.loaded()) {
        console.log('[surfaceService] Source already loaded');
        resolve();
      } else {
        console.log('[surfaceService] Waiting for source data...');
        map.once('sourcedata', () => {
          console.log('[surfaceService] Source data loaded');
          resolve();
        });
      }
    });

    // Log viewport state
    try {
      const bounds = map.getBounds();
      const center = map.getCenter();
      if (bounds) {
        console.log('[surfaceService] Viewport state:', {
          zoom: map.getZoom(),
          center: [center.lng, center.lat],
          bounds: [
            [bounds.getWest(), bounds.getSouth()],
            [bounds.getEast(), bounds.getNorth()]
          ]
        });
      } else {
        console.log('[surfaceService] Viewport state:', {
          zoom: map.getZoom(),
          center: [center.lng, center.lat],
          bounds: 'Not available'
        });
      }
    } catch (e) {
      console.error('[surfaceService] Error getting viewport state:', e);
    }

    // Add debug overlay for query area
    const debugSourceId = 'debug-query-area';
    const debugLayerId = 'debug-query-layer';
    
    // Remove existing debug overlay
    if (map.getSource(debugSourceId)) {
      map.removeLayer(debugLayerId);
      map.removeSource(debugSourceId);
    }

    // Try querying features with a larger radius
    const point = map.project(testPoint);
    console.log('[surfaceService] Projected point:', point);
    
    // Create a box around the point (30 pixel radius)
    const QUERY_RADIUS = 30;
    const bbox: [mapboxgl.Point, mapboxgl.Point] = [
      new mapboxgl.Point(point.x - QUERY_RADIUS, point.y - QUERY_RADIUS),
      new mapboxgl.Point(point.x + QUERY_RADIUS, point.y + QUERY_RADIUS)
    ];
    
    // Add visual debug overlay
    const debugBox = [
      map.unproject([point.x - QUERY_RADIUS, point.y - QUERY_RADIUS]),
      map.unproject([point.x + QUERY_RADIUS, point.y - QUERY_RADIUS]),
      map.unproject([point.x + QUERY_RADIUS, point.y + QUERY_RADIUS]),
      map.unproject([point.x - QUERY_RADIUS, point.y + QUERY_RADIUS]),
      map.unproject([point.x - QUERY_RADIUS, point.y - QUERY_RADIUS])
    ];
    
    map.addSource(debugSourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [debugBox.map(p => [p.lng, p.lat])]
        }
      }
    });
    
    map.addLayer({
      id: debugLayerId,
      type: 'fill',
      source: debugSourceId,
      paint: {
        'fill-color': '#FF0000',
        'fill-opacity': 0.2
      }
    });
    
    // Listen for source data events
    const onSourceData = () => {
      console.log('[surfaceService] Source data updated:', {
        zoom: map.getZoom(),
        center: map.getCenter(),
        moving: map.isMoving(),
        zooming: map.isZooming()
      });
    };
    map.on('sourcedata', onSourceData);
    
    // Query features
    const testFeatures = map.queryRenderedFeatures(bbox, {
      layers: ['custom-roads']
    });
    
    console.log('[surfaceService] Test point query:', {
      point: testPoint,
      projected: point,
      queryRadius: QUERY_RADIUS,
      features: testFeatures.length,
      properties: testFeatures[0]?.properties
    });
    
    // Clean up event listener
    map.off('sourcedata', onSourceData);

    // 4. Process each coordinate
    const coordinates = routeFeature.geometry.coordinates;
    console.log('[surfaceService] Processing coordinates:', coordinates.length);
    const sections: UnpavedSection[] = [];
    let currentSection: UnpavedSection | null = null;

    console.log('[surfaceService] Starting coordinate processing...');
    for (let i = 0; i < coordinates.length; i++) {
      const [lng, lat] = coordinates[i];
      
      // Query the road surface at this point with a small radius
      const projectedPoint = map.project([lng, lat]);
      const bbox: [mapboxgl.Point, mapboxgl.Point] = [
        new mapboxgl.Point(projectedPoint.x - 10, projectedPoint.y - 10),
        new mapboxgl.Point(projectedPoint.x + 10, projectedPoint.y + 10)
      ];
      const features = map.queryRenderedFeatures(bbox, {
        layers: [ROAD_LAYER_ID]
      });

      const surfaceType = features[0]?.properties?.surface;
      
      if (i % 1000 === 0 || i === coordinates.length - 1) {
        console.log(`[surfaceService] Processing point ${i}/${coordinates.length}, surface: ${surfaceType || 'unknown'}`);
      }

      // Handle unpaved sections
      if (isUnpavedSurface(surfaceType)) {
        console.log(`[surfaceService] Found unpaved surface at point ${i}: ${surfaceType}`);
        if (!currentSection) {
          currentSection = {
            startIndex: i,
            endIndex: i,
            coordinates: [coordinates[i] as [number, number]],
            surfaceType
          };
        } else {
          currentSection.endIndex = i;
          currentSection.coordinates.push(coordinates[i] as [number, number]);
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

    // 5. Add sections to map
    console.log('[surfaceService] Adding sections:', sections.length);
    console.log('[surfaceService] Section details:', sections.map(s => ({
      startIndex: s.startIndex,
      endIndex: s.endIndex,
      length: s.coordinates.length,
      surfaceType: s.surfaceType
    })));
    
    sections.forEach((section, index) => {
      const sourceId = `unpaved-${index}`;
      const layerId = `unpaved-layer-${index}`;

      // Clean up existing
      if (map.getSource(sourceId)) {
        map.removeLayer(layerId);
        map.removeSource(sourceId);
      }

      // Add source
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: section.coordinates
          }
        }
      });

      // Add layer
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#D35400', // Match your existing unpaved color
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
      
      console.log(`[surfaceService] Added layer ${layerId} with ${section.coordinates.length} points`);
    });
  } catch (error) {
    console.error('Error in surface detection:', error);
  }
};
