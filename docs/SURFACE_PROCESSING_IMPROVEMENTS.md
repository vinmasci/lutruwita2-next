# Surface Processing Improvements Plan

This document outlines the analysis of the current surface processing implementation and proposes a plan for improvement based on performance and accuracy considerations.

## 1. Analysis of Current Implementation (`surfaceService.js/ts`)

The existing surface detection system operates as follows:

1.  **Point-by-Point Processing**: Iterates through each GPS coordinate individually using `assignSurfacesViaNearest`.
2.  **Map Rendering Dependency**: For each point or batch:
    *   Fits the map view to the point's bounding box.
    *   Waits for map tiles to load.
    *   Queries rendered map features (`queryRenderedFeatures`) to find nearby roads.
    *   Determines surface type based on properties of the nearest rendered road feature.
3.  **Post-Processing**: Applies smoothing (`smoothSurfaceDetection`, `applyInverseSmoothing`) and gap-filling (`fillSurfaceGaps`) algorithms to refine the results.

### Limitations

*   **Performance**: Very slow due to the need to render map tiles and query features for each point/batch. This is especially problematic for long routes.
*   **Accuracy**: Dependent on map data quality at the specific zoom level used for querying. Can be inconsistent.
*   **Client-Side Only**: Requires a Mapbox GL map instance, making it unsuitable for server-side or background processing.
*   **Resource Intensive**: High CPU usage due to repeated rendering and querying.

## 2. Proposed Alternatives

Several alternative approaches could offer significant improvements:

1.  **Vector Tile Direct Processing**: Load and query vector tile data directly without rendering the map. Faster and suitable for server-side use.
2.  **Spatial Index (R-tree)**: Load road data once, build a spatial index (e.g., using RBush), and perform fast nearest-neighbor queries against the index. Very efficient.
3.  **Machine Learning**: Train a model to predict surface types based on route features (geometry, speed, elevation changes, proximity to known features). Potentially very accurate but complex to implement.
4.  **Segment-Based Processing**: Group consecutive points into segments and determine the surface type for the entire segment based on a representative point or dominant road type. Reduces the number of queries.
5.  **Pre-computed Surface Data API**: Use an external API or pre-computed dataset that provides surface information for given coordinates or routes.

## 3. Recommended Approach: Spatial Index (R-tree)

The **Spatial Index (R-tree)** approach using the `rbush` library is recommended as it offers the best balance of performance, accuracy, and implementation complexity within the current project structure.

### Detailed Implementation Plan: Spatial Index (R-tree)

Here's a step-by-step guide to implementing the R-tree spatial indexing approach:

#### Step 1: Add the RBush Library

First, add the RBush library to your project:

```bash
npm install rbush @types/rbush
# or
yarn add rbush @types/rbush
```

#### Step 2: Create a Road Data Service

Create a new service (`src/features/gpx/services/roadDataService.ts`) to handle loading and indexing road data. This service will encapsulate the logic for fetching data and querying the spatial index.

```typescript
// src/features/gpx/services/roadDataService.ts
import RBush from 'rbush';
import { Feature, LineString, MultiLineString } from 'geojson';
import { getDistanceToRoad } from '../utils/roadUtils'; // Assuming this utility exists

// Define types for road features and indexed segments
interface RoadFeatureProperties {
  surface?: string;
  highway?: string;
  name?: string;
  ref?: string;
  // Add other relevant properties
}

interface RoadFeature extends Feature<LineString | MultiLineString, RoadFeatureProperties> {}

interface IndexedRoadSegment {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  feature: RoadFeature;
  segment: number[][]; // [ [lon1, lat1], [lon2, lat2] ]
}

class RoadDataService {
  private roadIndex: RBush<IndexedRoadSegment> | null = null;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;
  private loadedRegions: Set<string> = new Set(); // Track loaded regions/files
  private cachedRoadData: Map<string, RoadFeature[]> = new Map(); // Cache fetched data

  // Constants for surface types (reuse from surfaceService.ts)
  private readonly PAVED_SURFACES = ['paved', 'asphalt', 'concrete', 'sealed', 'bitumen', 'tar', 'chipseal', 'paving_stones'];
  private readonly UNPAVED_SURFACES = ['unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth', 'ground', 'sand', 'grass', 'compacted', 'crushed_stone', 'woodchips', 'pebblestone', 'mud', 'rock', 'stones', 'gravel;grass'];
  private readonly UNPAVED_HIGHWAYS = ['track', 'trail', 'path'];

  constructor() {
    this.roadIndex = new RBush<IndexedRoadSegment>();
  }

  /**
   * Ensure road data for the given bounds is loaded and indexed.
   * Loads data by region if necessary.
   */
  async ensureDataLoaded(bounds: [number, number, number, number]): Promise<void> {
    const requiredRegions = this.getRegionsForBounds(bounds);
    const regionsToLoad = requiredRegions.filter(region => !this.loadedRegions.has(region));

    if (regionsToLoad.length === 0) {
      return; // All required data is already loaded
    }

    // If already loading, wait for the current load process
    if (this.isLoading && this.loadPromise) {
      await this.loadPromise;
      // Re-check if the required regions were loaded by the concurrent process
      const stillMissingRegions = requiredRegions.filter(region => !this.loadedRegions.has(region));
      if (stillMissingRegions.length === 0) return;
      // If still missing, proceed to load them (this might indicate an issue or a very large area)
      console.warn(`[RoadDataService] Concurrent load finished, but still missing regions: ${stillMissingRegions.join(', ')}`);
    }

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        const newIndexItems: IndexedRoadSegment[] = [];
        for (const region of regionsToLoad) {
          console.log(`[RoadDataService] Loading road data for region: ${region}`);
          const regionData = await this.fetchRoadDataForRegion(region);
          this.cachedRoadData.set(region, regionData); // Cache raw data
          
          for (const feature of regionData) {
            // Process and add segments to index items
             if (feature.geometry.type === 'LineString') {
                const coords = feature.geometry.coordinates;
                for (let i = 0; i < coords.length - 1; i++) {
                    newIndexItems.push(this.createIndexItem(feature, [coords[i], coords[i + 1]]));
                }
             } else if (feature.geometry.type === 'MultiLineString') {
                for (const line of feature.geometry.coordinates) {
                    for (let i = 0; i < line.length - 1; i++) {
                        newIndexItems.push(this.createIndexItem(feature, [line[i], line[i + 1]]));
                    }
                }
             }
          }
          this.loadedRegions.add(region); // Mark region as loaded
        }

        // Bulk load new items into the index
        if (newIndexItems.length > 0) {
            this.roadIndex?.load(newIndexItems);
            console.log(`[RoadDataService] Indexed ${newIndexItems.length} new road segments for regions: ${regionsToLoad.join(', ')}`);
        }
      } catch (error) {
        console.error('[RoadDataService] Error loading road data:', error);
        // Decide how to handle errors: throw, or allow partial loading?
      } finally {
        this.isLoading = false;
        this.loadPromise = null;
      }
    })();

    await this.loadPromise;
  }

  /**
   * Fetch road data for a specific region (e.g., from Cloudinary).
   * Replace with your actual data fetching logic.
   */
  private async fetchRoadDataForRegion(region: string): Promise<RoadFeature[]> {
    // Example: Fetching from Cloudinary (adjust URL structure as needed)
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME; // Ensure env var is accessible client-side if needed
    if (!cloudName) {
        console.error("Cloudinary cloud name not configured!");
        return [];
    }
    const url = `https://res.cloudinary.com/${cloudName}/raw/upload/road-data/australia-roads-${region}.json`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load road data for ${region}: ${response.statusText} (URL: ${url})`);
        }
        const data = await response.json();
        // Basic validation
        if (!data || !Array.isArray(data.features)) {
             throw new Error(`Invalid GeoJSON structure for region ${region}`);
        }
        return data.features as RoadFeature[];
    } catch (error) {
        console.error(`[RoadDataService] Error fetching region ${region}:`, error);
        return []; // Return empty array on error to avoid breaking the process
    }
  }

  /**
   * Determine which region(s) a bounding box overlaps with.
   * Implement based on your regional boundaries.
   */
  private getRegionsForBounds(bounds: [number, number, number, number]): string[] {
    // Placeholder: Needs implementation based on actual region definitions
    // For simplicity, start with just loading 'tasmania' or a default region
    // A more robust implementation would use spatial checks against region polygons
    // Example: Check corners and center point against region boundaries
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const pointsToCheck = [
        [minLon, minLat], [maxLon, minLat], [minLon, maxLat], [maxLon, maxLat], // Corners
        [(minLon + maxLon) / 2, (minLat + maxLat) / 2] // Center
    ];
    const regions = new Set<string>();
    pointsToCheck.forEach(([lon, lat]) => {
        // Replace with actual region lookup logic
        if (lon >= 144 && lon <= 149 && lat >= -44 && lat <= -40) { // Approx Tasmania bounds
             regions.add('tasmania');
        }
        // Add checks for other Australian states/regions here...
        else {
             regions.add('default'); // Add a default or broader region if needed
        }
    });
    
    // If starting simple, just return the Tasmania region for now
    // return ['tasmania']; 
    return Array.from(regions);
  }

  /** Create an item suitable for insertion into the RBush index. */
  private createIndexItem(feature: RoadFeature, segment: number[][]): IndexedRoadSegment {
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

  /** Find the nearest road segment to a point using the spatial index. */
  findNearestRoad(point: [number, number], searchRadius: number = 0.001): RoadFeature | null {
    if (!this.roadIndex) {
      console.warn('[RoadDataService] Road index not initialized');
      return null;
    }

    const [lon, lat] = point;
    const searchArea = {
      minX: lon - searchRadius, minY: lat - searchRadius,
      maxX: lon + searchRadius, maxY: lat + searchRadius
    };

    const nearbySegments = this.roadIndex.search(searchArea);

    if (nearbySegments.length === 0) return null;

    let minDist = Infinity;
    let closestFeature: RoadFeature | null = null;

    for (const indexedSegment of nearbySegments) {
      // Use getDistanceToRoad utility (ensure it handles [lon, lat] format)
      const dist = getDistanceToRoad(point, indexedSegment.segment);
      if (dist < minDist) {
        minDist = dist;
        closestFeature = indexedSegment.feature;
      }
    }
    return closestFeature;
  }

  /** Determine surface type ('paved' or 'unpaved') from road properties. */
  determineSurfaceType(road: RoadFeature | null): 'paved' | 'unpaved' {
    if (!road?.properties) return 'unpaved'; // Default if no road or properties

    const surface = (road.properties.surface || '').toLowerCase();
    const highway = (road.properties.highway || '').toLowerCase();

    if (this.PAVED_SURFACES.includes(surface)) return 'paved';
    if (this.UNPAVED_SURFACES.includes(surface)) return 'unpaved';
    if (this.UNPAVED_HIGHWAYS.includes(highway)) return 'unpaved';

    // Default assumption for roads without explicit surface info might need tuning.
    // Consider defaulting to 'paved' for major highway types if surface is unknown.
    // For now, defaulting to 'unpaved' if unsure.
    return 'unpaved';
  }
}

// Export a singleton instance
export const roadDataService = new RoadDataService();
```

#### Step 3: Create New Surface Detection Function

Create `src/features/gpx/services/spatialSurfaceService.ts` which uses the `RoadDataService`.

```typescript
// src/features/gpx/services/spatialSurfaceService.ts
import { roadDataService } from './roadDataService';
import { 
  smoothSurfaceDetection, 
  applyInverseSmoothing, 
  fillSurfaceGaps 
} from './surfaceService'; // Reuse existing post-processing logic if needed, or rewrite

interface Point {
  lat: number;
  lon: number;
  surface?: 'paved' | 'unpaved';
}

/**
 * Process surface types for a route using spatial indexing.
 */
export const assignSurfacesWithSpatialIndex = async (
  coords: Point[],
  onProgress?: (progress: number, total: number) => void
): Promise<Point[]> => {
  console.log('[assignSurfacesWithSpatialIndex] Starting surface detection...');
  if (!coords || coords.length === 0) return coords;

  // 1. Calculate bounding box for the entire route
  const bounds = getBoundsFromCoordinates(coords);

  // 2. Ensure necessary road data is loaded
  try {
      await roadDataService.ensureDataLoaded(bounds);
  } catch (error) {
      console.error("Failed to load necessary road data. Proceeding without surface detection.", error);
      // Return coords without surface info or with a default
      return coords.map(pt => ({ ...pt, surface: 'unpaved' })); 
  }


  // 3. Process points (can be done in parallel or batches)
  const results: Point[] = [];
  const totalPoints = coords.length;

  for (let i = 0; i < totalPoints; i++) {
    const pt = coords[i];
    const pointCoords: [number, number] = [pt.lon, pt.lat];

    // Find nearest road using the indexed service
    const nearestRoad = roadDataService.findNearestRoad(pointCoords);
    
    // Determine surface type
    const surface = roadDataService.determineSurfaceType(nearestRoad);
    
    results.push({ ...pt, surface });

    // Update progress
    if (onProgress && (i % 100 === 0 || i === totalPoints - 1)) { // Update progress periodically
      onProgress(i + 1, totalPoints);
    }
  }

  console.log('[assignSurfacesWithSpatialIndex] Initial detection complete. Applying post-processing...');

  // 4. Apply post-processing (reuse or adapt your existing functions)
  // Note: Ensure these functions are compatible with the Point[] structure
  const gapFilledResults = fillSurfaceGaps(results); 
  const smoothedResults = smoothSurfaceDetection(gapFilledResults);
  const finalResults = applyInverseSmoothing(smoothedResults);

  console.log('[assignSurfacesWithSpatialIndex] Surface detection complete.');
  return finalResults;
};

/** Helper to calculate bounding box */
function getBoundsFromCoordinates(coords: Point[]): [number, number, number, number] {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  coords.forEach(pt => {
    minLon = Math.min(minLon, pt.lon); minLat = Math.min(minLat, pt.lat);
    maxLon = Math.max(maxLon, pt.lon); maxLat = Math.max(maxLat, pt.lat);
  });
  // Add a small buffer
  const buffer = 0.01; 
  return [minLon - buffer, minLat - buffer, maxLon + buffer, maxLat + buffer];
}

// Make sure to export necessary functions if they are in surfaceService.ts
// e.g., export { smoothSurfaceDetection, applyInverseSmoothing, fillSurfaceGaps };
```

#### Step 4: Integrate with Existing Code

Modify `src/features/gpx/hooks/useClientGpxProcessing.js` (or `.ts`) to use the new service.

```javascript
// In useClientGpxProcessing.js (or .ts)

// Import the new function
import { assignSurfacesWithSpatialIndex } from '../services/spatialSurfaceService'; 
// Potentially update addSurfaceOverlay or create a new version using spatialSurfaceService

// ... inside the processGpx function ...

            // Replace the existing surface detection block:
            /* 
            if (map && route.geojson.features[0]) {
                // ... existing code using addSurfaceOverlay ...
            }
            */
           
            // With the new spatial index approach:
            console.log('[useClientGpxProcessing] Starting spatial surface detection...');
            try {
                const pointsWithSurface = await assignSurfacesWithSpatialIndex(
                    route.geojson.features[0].geometry.coordinates.map(coord => ({ lon: coord[0], lat: coord[1] })),
                    (progress, total) => {
                        // Optional: Update UI with progress
                        console.log(`Surface detection progress: ${progress}/${total}`);
                    }
                );

                // Update the GeoJSON coordinates with surface info if needed,
                // or store surface info separately. For simplicity, let's assume
                // we just need the unpaved sections list.

                // Generate unpaved sections from the results
                route.unpavedSections = generateUnpavedSections(pointsWithSurface);

                console.log(`[useClientGpxProcessing] Spatial surface detection complete. Found ${route.unpavedSections.length} unpaved sections.`);

                // If you still need to add overlays to the map, adapt addSurfaceOverlay
                // to use the generated sections instead of doing its own detection.
                if (map) {
                    await addSurfaceOverlayFromSections(map, route.unpavedSections, route.routeId || route.id);
                }

            } catch (surfaceError) {
                console.error('[useClientGpxProcessing] Spatial surface detection error:', surfaceError);
                // Decide how to handle: proceed without surface data, show error, etc.
                route.unpavedSections = []; 
            }

// Helper function to generate unpaved sections list from processed points
function generateUnpavedSections(processedPoints) {
    const sections = [];
    let currentSection = null;
    processedPoints.forEach((point, i) => {
        if (point.surface === 'unpaved') {
            const coord = [point.lon, point.lat]; // Ensure correct order
            if (!currentSection) {
                currentSection = { startIndex: i, endIndex: i, coordinates: [coord], surfaceType: 'unpaved' };
            } else {
                currentSection.endIndex = i;
                currentSection.coordinates.push(coord);
            }
        } else {
            if (currentSection) {
                // Only add section if it has more than one point (or adjust as needed)
                if (currentSection.coordinates.length > 1) { 
                    sections.push(currentSection);
                }
                currentSection = null;
            }
        }
    });
    if (currentSection && currentSection.coordinates.length > 1) {
        sections.push(currentSection);
    }
    return sections;
}

// Adapt or create this function if you need map overlays
async function addSurfaceOverlayFromSections(map, sections, routeId) {
    // Similar logic to your existing addSurfaceOverlay, but uses the pre-calculated sections
    sections.forEach((section, index) => {
        const sourceId = `unpaved-section-${routeId}-${index}`;
        const layerId = `unpaved-section-layer-${routeId}-${index}`;

        if (map.getSource(sourceId)) {
            map.removeLayer(layerId);
            map.removeSource(sourceId);
        }
        map.addSource(sourceId, { /* ... GeoJSON source using section.coordinates ... */ });
        map.addLayer({ /* ... layer definition ... */ });
    });
}

```

#### Step 5: Data Preparation and Hosting

*   **Extract OSM Data**: Use tools like Overpass Turbo ([https://overpass-turbo.eu/](https://overpass-turbo.eu/)) or Osmium to get road data (`highway=*`) with `surface=*` tags for your target regions.
*   **Convert to GeoJSON**: Ensure the output is valid GeoJSON.
*   **Split by Region**: Create separate files (e.g., `tasmania.geojson`, `victoria.geojson`).
*   **Upload to Cloudinary**: Use the Cloudinary dashboard or API (like your `uploadJsonData` function, adapted for file uploads or large JSON) to upload these files into a specific folder (e.g., `road-data`) as `raw` resources. Make sure they are publicly accessible via URL.

### Implementation Plan

1.  **Add Dependency**: `npm install rbush @types/rbush`
2.  **Data Source**: Prepare road network data (e.g., from OpenStreetMap) for the relevant region (Tasmania or all of Australia) as a GeoJSON file, including `surface` and `highway` properties.
3.  **Hosting**:
    *   For Tasmania: Host the GeoJSON file statically (e.g., in `/public/data/`).
    *   For Australia: The file will be large. Host it on a dedicated storage service like **Cloudinary** (recommended, as it's already used in the project) or AWS S3. Split the data by region (e.g., state/territory) to keep individual file sizes manageable. Vercel's static hosting has limitations on large files, making it less ideal for a full Australia dataset.
4.  **Create `RoadDataService`**:
    *   Manages loading GeoJSON data (potentially by region from Cloudinary URLs).
    *   Builds an `RBush` spatial index from the road segments.
    *   Provides a `findNearestRoad(point)` method using the index.
    *   Provides a `determineSurfaceType(roadFeature)` method.
5.  **Create New Surface Detection Function (`assignSurfacesWithSpatialIndex`)**:
    *   Takes route coordinates as input.
    *   Calculates the route's bounding box.
    *   Ensures necessary regional road data is loaded via `RoadDataService`.
    *   Iterates through coordinates (can be done in batches).
    *   For each point, uses `roadDataService.findNearestRoad` to query the index.
    *   Determines surface using `roadDataService.determineSurfaceType`.
    *   Applies the existing post-processing functions (`fillSurfaceGaps`, `smoothSurfaceDetection`, `applyInverseSmoothing`).
6.  **Integrate**: Update `useClientGpxProcessing.js` and `addSurfaceOverlay` to call the new `assignSurfacesWithSpatialIndex` function instead of `assignSurfacesViaNearest`.

### Benefits of R-tree Approach
*   **No Map Rendering**: Eliminates the bottleneck of rendering map tiles.
*   **Scalability**: Handles large datasets efficiently.
*   **Consistency**: Results are independent of map zoom level.

## 4. Data Preparation (Example for OSM)

1.  **Extract**: Use Overpass API or Osmium to extract ways tagged with `highway` for the desired region. Include `surface` tags.
2.  **Convert**: Convert OSM data to GeoJSON format.
3.  **Process**: Filter unnecessary properties, simplify geometries if needed.
4.  **Split (if needed)**: Divide into regional files (e.g., `tasmania-roads.geojson`, `victoria-roads.geojson`).
5.  **Upload**: Upload the GeoJSON files to the chosen hosting location (e.g., Cloudinary).

This plan provides a clear path to significantly improving the performance and reliability of the surface detection feature.

## 5. Implementation Status Update

### 5.1 Vector Tile Service Implementation

The vector tile service has been successfully implemented and now supports all Australian states and territories as well as New Zealand. The implementation includes:

1. **Expanded Region Coverage**:
   - Added support for NSW (split into two parts)
   - Added support for Queensland
   - Added support for South Australia
   - Added support for Western Australia
   - Added support for Northern Territory and ACT (combined)
   - Added support for New Zealand

2. **Dynamic Region Selection**:
   - The system automatically detects which region(s) a route intersects with
   - For routes that cross regional boundaries, it loads tiles from multiple regions
   - If no intersection is found, it selects the closest region

3. **Geographic Bounds Definition**:
   - Defined precise geographic bounds for each region to ensure accurate region selection
   - Implemented fallback mechanisms for edge cases

The implementation is available in `src/features/gpx/services/vectorTileService.js` and has been thoroughly tested with routes from various regions.

### 5.2 Future Work

While the current implementation provides comprehensive coverage for Australia and New Zealand, there are still opportunities for further optimization:

1. **Caching Improvements**: Implement more sophisticated caching strategies to reduce redundant tile loading
2. **Performance Optimization**: Further optimize the tile loading and processing pipeline
3. **Server-Side Processing**: Consider moving some of the processing to the server side
4. **Machine Learning Integration**: Explore using machine learning to improve surface detection accuracy
