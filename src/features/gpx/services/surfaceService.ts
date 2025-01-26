// Get Mapbox token from environment
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export interface UnpavedSection {
  startIndex: number;
  endIndex: number;
  coordinates: [number, number][];
  surfaceType: 'unpaved' | 'dirt' | 'gravel' | 'fine_gravel';
}

// Cache for surface query results
const surfaceCache = new Map<string, string>();

const querySurfaceType = async (lng: number, lat: number): Promise<string | undefined> => {
  const cacheKey = `${lng},${lat}`;
  if (surfaceCache.has(cacheKey)) {
    return surfaceCache.get(cacheKey);
  }

  try {
    if (!MAPBOX_TOKEN) {
      throw new Error('Mapbox token not found in environment variables');
    }

    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=10&limit=1&access_token=${MAPBOX_TOKEN}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Surface query failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    const features = data.features;
    
    if (!features?.length) {
      return undefined;
    }

    const properties = features[0].properties || {};
    const surface = properties.surface || properties.class;
    
    // Cache the result
    surfaceCache.set(cacheKey, surface);
    
    return surface;
  } catch (error) {
    console.error('Surface query error:', error);
    return undefined;
  }
};

const isUnpavedSurface = (surface?: string): boolean => {
  const unpavedTypes = ['unpaved', 'dirt', 'gravel', 'fine_gravel', 'path', 'track'];
  return unpavedTypes.includes(surface || '');
};

export const detectUnpavedSections = async (
  matchedCoordinates: [number, number][]
): Promise<UnpavedSection[]> => {
  if (!MAPBOX_TOKEN) {
    console.error('Mapbox token not found in environment variables');
    return [];
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
    const surfaceType = await querySurfaceType(lng, lat);
    
    if (isUnpavedSurface(surfaceType)) {
      if (!currentSection) {
        currentSection = {
          startIndex: i,
          endIndex: i,
          coordinates: [matchedCoordinates[i]],
          surfaceType: 'unpaved' // Default to generic unpaved
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
