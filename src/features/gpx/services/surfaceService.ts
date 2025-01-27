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

// Wait for map style to load
const waitForMapStyle = (map: mapboxgl.Map): Promise<void> => {
  return new Promise((resolve) => {
    if (map.isStyleLoaded()) {
      resolve();
    } else {
      map.once('styledata', () => resolve());
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
  try {
    // 1. Wait for map style
    await waitForMapStyle(map);
    
    // 2. Check for roads layer
    if (!checkRoadsLayer(map)) {
      console.error('Roads layer not available');
      return;
    }

    // 3. Process each coordinate
    const coordinates = routeFeature.geometry.coordinates;
    const sections: UnpavedSection[] = [];
    let currentSection: UnpavedSection | null = null;

    for (let i = 0; i < coordinates.length; i++) {
      const [lng, lat] = coordinates[i];
      
      // Query the road surface at this point
      const features = map.queryRenderedFeatures(
        map.project([lng, lat]),
        { 
          layers: [ROAD_LAYER_ID]
        }
      );

      const surfaceType = features[0]?.properties?.surface;

      // Handle unpaved sections
      if (isUnpavedSurface(surfaceType)) {
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

    // 4. Add sections to map
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
    });
  } catch (error) {
    console.error('Error in surface detection:', error);
  }
};
