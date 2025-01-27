import mapboxgl from 'mapbox-gl';

export interface UnpavedSection {
  startIndex: number;
  endIndex: number;
  coordinates: [number, number][];
  surfaceType: 'unpaved' | 'dirt' | 'gravel' | 'fine_gravel';
}

const PAVED_SURFACES = [
  'paved', 'asphalt', 'concrete', 'compacted',
  'sealed', 'bitumen', 'tar'
];

const UNPAVED_SURFACES = [
  'unpaved', 'gravel', 'fine', 'fine_gravel', 
  'dirt', 'earth', 'path', 'track', 'service'
];

// Cache for surface query results
const surfaceCache = new Map<string, string>();

const querySurfaceType = async (
  lng: number,
  lat: number,
  map: mapboxgl.Map
): Promise<string | undefined> => {
  const cacheKey = `${lng},${lat}`;
  if (surfaceCache.has(cacheKey)) {
    return surfaceCache.get(cacheKey);
  }

  try {
    // Check if we're within the zoom range where surface data is available
    const zoom = map.getZoom();
    if (zoom < 12 || zoom > 14) {
      return undefined;
    }

    const features = map.queryRenderedFeatures(
      map.project([lng, lat]),
      { layers: ['custom-roads'] }
    );

    if (!features.length) return undefined;

    // Get surface type from feature properties
    const surface = features[0].properties?.surface?.toLowerCase();

    // Only return surface if it's one we care about
    if (surface && (UNPAVED_SURFACES.includes(surface) || PAVED_SURFACES.includes(surface))) {
      surfaceCache.set(cacheKey, surface);
      return surface;
    }
    
    return undefined;
  } catch (error) {
    console.error('Surface query error:', error);
    return undefined;
  }
};

const isUnpavedSurface = (surface?: string): boolean => {
  return UNPAVED_SURFACES.includes(surface || '');
};

export const detectUnpavedSections = async (
  matchedCoordinates: [number, number][],
  map: mapboxgl.Map
): Promise<UnpavedSection[]> => {
  // Wait for the custom-roads layer to be loaded
  if (!map.getLayer('custom-roads') || !map.isStyleLoaded()) {
    console.error('Roads layer not found or style not fully loaded');
    return [];
  }

  // Ensure we're at a zoom level where surface data is available
  const currentZoom = map.getZoom();
  if (currentZoom < 12 || currentZoom > 14) {
    map.setZoom(13); // Set to middle of valid zoom range
    // Wait for zoom to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const sections: UnpavedSection[] = [];
  let currentSection: UnpavedSection | null = null;

  // Process coordinates in batches to avoid rate limiting
  const batchSize = 50;
  
  for (let i = 0; i < matchedCoordinates.length; i++) {
    // Add delay between batches
    if (i > 0 && i % batchSize === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const [lng, lat] = matchedCoordinates[i];
    const surfaceType = await querySurfaceType(lng, lat, map);
    
    if (isUnpavedSurface(surfaceType)) {
      if (!currentSection) {
        currentSection = {
          startIndex: i,
          endIndex: i,
          coordinates: [matchedCoordinates[i]],
          surfaceType: 'unpaved'
        };
      } else {
        currentSection.endIndex = i;
        currentSection.coordinates.push(matchedCoordinates[i]);
      }
    } else if (currentSection) {
      sections.push(currentSection);
      currentSection = null;
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
};
