# GPX Implementation Status

## Important Context
We have an existing server implementation that:
- Lives in the `server/` directory
- Handles complex GPX processing
- Includes surface detection
- Uses Express server on port 3001
- Has map matching capabilities

We're currently bypassing this server temporarily to:
1. Get basic GPX functionality working
2. Simplify the implementation
3. Test core features
4. Keep the server code for later use

The server code remains in place but unused while we implement client-side processing first.

## ⚠️ CURRENT UPLOAD BOX LOCATION
The file upload box in the sidebar is controlled by these files:

1. Main Sidebar Component:
```
src/features/map/components/Sidebar/Sidebar.tsx
```

2. Upload Box Implementation:
```
src/features/map/components/Sidebar/SidebarListItems.tsx  <-- Contains the Upload box item
```

3. Actual Upload Logic:
```
src/features/gpx/components/Uploader/Uploader.tsx  <-- Now uses client-side processing
src/features/gpx/hooks/useClientGpxProcessing.ts  <-- Handles client-side file processing
src/features/gpx/utils/gpxParser.ts              <-- Converts GPX to GeoJSON
```

## Phase 1: ✅ Client-Side Implementation (COMPLETED)
Successfully implemented:
- Client-side GPX to GeoJSON conversion
- Direct map display
- Removed server dependency
- Functional upload box in sidebar
- All validation points passed
- All error handling in place

## Phase 2: ✅ Map Matching Implementation (COMPLETED)

### Current Implementation Status

#### ✅ Completed
- Added Mapbox access token from environment
- Created `src/features/gpx/services/mapMatchingService.ts`
- Implemented point batching (100 points per request)
- Modified `gpxParser.ts` to handle matched tracks
- Implemented automatic map matching without UI controls
- Added error handling for failed matches
- Fixed route display and point skipping issues
- Implemented clean route visualization

#### 🎯 Improvements Made
1. Route Display:
   - Simplified to a single route layer
   - Added white border (8px) for better visibility
   - Implemented red line (#ee5253, 6px) for main route
   - Removed individual point markers
   - Removed duplicate route display

2. Map Matching Optimization:
   - Switched to 'driving' profile for better road matching
   - Lowered confidence threshold (0.6) to accept more matches
   - Increased radius multiplier (3) for better parallel road handling
   - Improved point interpolation (5 points, 20m threshold)
   - Added overview=full parameter for complete route coverage

### Map Matching Service Implementation
```typescript
// src/features/gpx/services/mapMatchingService.ts
interface MatchingOptions {
  confidenceThreshold?: number;
  radiusMultiplier?: number;
  maxGapDistance?: number;
  interpolationPoints?: number;
}

export const matchTrackToRoads = async (
  points: [number, number][],
  options: MatchingOptions = {}
) => {
  const {
    confidenceThreshold = 0.6,
    radiusMultiplier = 3,
    maxGapDistance = 0.0002,
    interpolationPoints = 5
  } = options;
  
  // Get coordinates from Mapbox API
  const matchedCoordinates = await getMatchedCoordinates(points);
  
  return matchedCoordinates;
};
```

## Phase 3: 🚀 Surface Detection Implementation (IN PROGRESS)

### Overview
Reactivating our existing server implementation to:
1. Use existing `server/src/services/gpx/gpx.processing.ts` for surface detection
2. Leverage server-side caching and error handling
3. Display unpaved sections in yellow overlay
4. Keep existing red route underneath

### Implementation Steps

#### 1. Start Using Existing Server ✅
- [x] Start server with existing surface detection:
```bash
cd server
npm install
npm start   # Now running on port 8080 (changed from 3001)
```

- [x] Configure server port and proxy:
```typescript
// server/src/shared/config/server.config.ts
export const SERVER_CONFIG = {
    port: process.env.PORT || 8080,
    // ... other config
};

// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
```

- [x] Added surface detection endpoints:
```typescript
// server/src/routes/gpx.routes.ts
router.get('/surface', gpxController.getSurfaceType);
router.post('/surface/batch', gpxController.batchGetSurfaceTypes);
```

- [x] Implemented surface detection controller with caching:
```typescript
// server/src/controllers/gpx.controller.ts
private surfaceCache: Map<string, string> = new Map();

async getSurfaceType(req: Request, res: Response) {
  // Handles single point surface detection
}

async batchGetSurfaceTypes(req: Request, res: Response) {
  // Handles batch surface detection
}
```

#### 2. Connect to Existing Surface Detection Service
```typescript
// src/features/gpx/services/surfaceService.ts
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
```

#### 3. Update Processing Hook to Use Server Results
```typescript
// src/features/gpx/hooks/useClientGpxProcessing.ts
import { detectUnpavedSections } from '../services/surfaceService';
import { ProcessedRoute } from '../types/gpx.types';

// Add server's surface detection results to route
interface ProcessedRoute {
  // ... existing properties ...
  unpavedSections?: UnpavedSection[];
}

export const useClientGpxProcessing = () => {
  const processGpx = async (file: File): Promise<ProcessedRoute | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const rawGpx = await file.text();
      
      // Get matched route first
      const parsedFeature = await parseAndMatchGpx(file);

      // Use server's surface detection
      const unpavedSections = await detectUnpavedSections(
        parsedFeature.matched.coordinates
      );

      const geometry = parsedFeature.matched || parsedFeature.geometry;
      
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: parsedFeature.properties,
          geometry
        }]
      };

      const processedRoute: ProcessedRoute = {
        id: uuidv4(),
        name: parsedFeature.properties?.name || file.name,
        color: '#FF0000',
        isVisible: true,
        gpxData: rawGpx,
        rawGpx: rawGpx,
        geojson,
        unpavedSections, // Add server's surface detection results
        statistics: {
          totalDistance: 0,
          elevationGain: 0,
          elevationLoss: 0,
          maxElevation: 0,
          minElevation: 0,
          averageSpeed: 0,
          movingTime: 0,
          totalTime: 0
        },
        status: {
          processingState: 'completed',
          progress: 100
        }
      };

      return processedRoute;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process GPX file';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    processGpx,
    isLoading,
    error
  };
};
```

#### 4. Keep Map Display Implementation
```typescript
// In MapView.tsx
const displayUnpavedSections = (
  map: mapboxgl.Map,
  sections: UnpavedSection[]
) => {
  sections.forEach((section, index) => {
    map.addSource(`unpaved-${index}`, {
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

    map.addLayer({
      id: `unpaved-${index}`,
      type: 'line',
      source: `unpaved-${index}`,
      paint: {
        'line-color': '#f9ca24', // Yellow
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
  });
};
```

### Server Integration Points
1. Using existing `GPXProcessingService` from `server/src/services/gpx/gpx.processing.ts`
2. Leveraging server's batch processing capabilities
3. Using server's surface type detection logic
4. Benefiting from server-side caching
5. Utilizing server's error handling

### Validation Points
- [ ] Server starts successfully
- [ ] Server's surface detection responds
- [ ] Batch processing works for large routes
- [ ] Surface types match server definitions
- [ ] Client properly displays results
- [ ] Yellow overlay appears correctly
- [ ] Performance is acceptable with server

### Known Issues to Handle
1. Server connection errors
2. Server API response failures
3. Batch processing timeouts
4. Surface detection accuracy
5. Loading states during server processing

### Next Steps
1. Test server endpoints
2. Verify surface detection accuracy
3. Add proper error handling
4. Implement loading states
5. Test with sample routes
6. Optimize if needed
