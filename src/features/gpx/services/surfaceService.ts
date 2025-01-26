export interface UnpavedSection {
  startIndex: number;
  endIndex: number;
  coordinates: [number, number][];
  surfaceType: 'unpaved' | 'dirt' | 'gravel' | 'fine_gravel';
}

// Complement server-side caching
const surfaceCache = new Map<string, string>();

const querySurfaceType = async (lng: number, lat: number): Promise<string | undefined> => {
  const cacheKey = `${lng},${lat}`;
  if (surfaceCache.has(cacheKey)) {
    return surfaceCache.get(cacheKey);
  }

  try {
    // Use existing server's GPXProcessingService
    const response = await fetch(`/api/gpx/surface?lng=${lng}&lat=${lat}`);
    
    if (!response.ok) {
      throw new Error(`Surface query failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    const surface = data.surface;
    
    if (surface) {
      surfaceCache.set(cacheKey, surface);
    }
    
    return surface;
  } catch (error) {
    console.error('Surface query error:', error);
    return undefined;
  }
};

// Match server's surface types from gpx.processing.ts
const isUnpavedSurface = (surface?: string): boolean => {
  const unpavedTypes = [
    'unpaved', 'dirt', 'gravel', 'fine_gravel', 
    'path', 'track', 'service', 'unknown'
  ];
  return unpavedTypes.includes(surface || '');
};

export const detectUnpavedSections = async (
  matchedCoordinates: [number, number][]
): Promise<UnpavedSection[]> => {
  try {
    // Use server's batch processing first (from GPXProcessingService)
    const response = await fetch('/api/gpx/surface/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ coordinates: matchedCoordinates })
    });

    if (response.ok) {
      return await response.json();
    }

    // Fallback to point-by-point if batch fails
    const sections: UnpavedSection[] = [];
    let currentSection: UnpavedSection | null = null;

    for (let i = 0; i < matchedCoordinates.length; i++) {
      const [lng, lat] = matchedCoordinates[i];
      const surfaceType = await querySurfaceType(lng, lat);
      
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
  } catch (error) {
    console.error('Failed to detect unpaved sections:', error);
    return [];
  }
};
