import { Map as OlMap } from 'ol';
import { fromLonLat } from 'ol/proj';
import VectorTileLayer from 'ol/layer/VectorTile';
import { FeatureLike } from 'ol/Feature';

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
  map: OlMap,
  vectorLayer: VectorTileLayer
): Promise<string | undefined> => {
  const cacheKey = `${lng},${lat}`;
  if (surfaceCache.has(cacheKey)) {
    return surfaceCache.get(cacheKey);
  }

  try {
    // Convert to OpenLayers coordinate system
    const coordinate = fromLonLat([lng, lat]);
    
    // Get pixel coordinates
    const pixel = map.getPixelFromCoordinate(coordinate);
    if (!pixel) return undefined;

    // Query features at pixel
    const features = map.getFeaturesAtPixel(pixel, {
      layerFilter: (layer) => layer === vectorLayer,
      hitTolerance: 10
    }) as FeatureLike[];

    if (!features.length) return undefined;

    // Get surface type from feature properties
    const feature = features[0];
    const properties = feature.getProperties();
    const surface = (properties.surface || properties.class)?.toLowerCase();
    
    // Cache the result
    surfaceCache.set(cacheKey, surface);
    
    return surface;
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
  map: OlMap,
  vectorLayer: VectorTileLayer
): Promise<UnpavedSection[]> => {
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
    const surfaceType = await querySurfaceType(lng, lat, map, vectorLayer);
    
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
