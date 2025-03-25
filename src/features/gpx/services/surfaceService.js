import { getDistanceToRoad } from '../utils/roadUtils';
// Helper function to round coordinates to 5 decimal places
const roundCoordinate = (value) => {
    return Number(value.toFixed(5));
};
// Constants
const ROAD_LAYER_ID = 'custom-roads';
const SOURCE_LAYER = 'lutruwita';
const PAVED_SURFACES = ['paved', 'asphalt', 'concrete', 'sealed', 'bitumen', 'tar', 'chipseal', 'paving_stones'];
const UNPAVED_SURFACES = ['unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth', 'ground', 'sand', 'grass', 'compacted', 'crushed_stone', 'woodchips', 'pebblestone', 'mud', 'rock', 'stones', 'gravel;grass'];
const UNPAVED_HIGHWAYS = ['track', 'trail', 'path'];
// Constants for road detection
const VERIFICATION_WINDOW = 3;
const BEARING_TOLERANCE = 30; // Increased for better matching
const VARIANCE_THRESHOLD = 8; // Increased for more flexibility
const TURN_ANGLE_THRESHOLD = 45; // Increased for sharper turns
const MIN_SEGMENT_LENGTH = 3; // Reduced for shorter segments
const DEFAULT_QUERY_BOX = 7; // Reduced default query box
const JUNCTION_QUERY_BOX = 5; // Reduced junction query box
const RETRY_DELAY = 10; // Reduced delay between retries for faster processing
const MAX_RETRIES = 10; // Reduced retries - will use previous point's surface if failed
const BATCH_SIZE = 3; // Process points in batches

// Constants for surface smoothing
const SMOOTHING_WINDOW_SIZE = 5; // Number of points to consider (current point + points on each side)
const SMOOTHING_THRESHOLD = 0.4; // Percentage of points in window that must be unpaved to keep a point as unpaved
const INVERSE_SMOOTHING_THRESHOLD = 0.4; // Percentage of points that must be unpaved to convert a paved point to unpaved
// Helper to convert [lon, lat] array to LngLatLike object with validation
const toLngLat = (coord) => {
    if (!coord || coord.length !== 2 || !isFinite(coord[0]) || !isFinite(coord[1])) {
        return null;
    }
    return {
        lng: coord[0],
        lat: coord[1]
    };
};
// Helper to validate coordinates
const isValidCoordArray = (coords) => {
    return Array.isArray(coords) && coords.length > 0 &&
        coords.every(coord => Array.isArray(coord) && coord.length === 2 &&
            typeof coord[0] === 'number' && typeof coord[1] === 'number');
};
const isValidMultiLineStringCoords = (coords) => {
    return Array.isArray(coords) && coords.length > 0 &&
        coords.every(line => isValidCoordArray(line));
};
// Wait for map style and vector tiles to load
const waitForMapResources = (map) => {
    return new Promise((resolve) => {
        const checkResources = () => {
            const source = map.getSource('australia-roads');
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
        }
        else {
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
const findNearestRoad = (map, point) => {
    const lngLat = toLngLat(point);
    if (!lngLat) {
        console.warn('[findNearestRoad] Invalid coordinates:', point);
        return null;
    }
    const projectedPoint = map.project(lngLat);
    // First, do a wide scan to detect junction areas
    const wideAreaFeatures = map.queryRenderedFeatures([
        [projectedPoint.x - 25, projectedPoint.y - 25],
        [projectedPoint.x + 25, projectedPoint.y + 25]
    ], {
        layers: [ROAD_LAYER_ID],
        filter: ['in', 'highway', 'trunk', 'primary', 'secondary', 'residential', 'path', 'track', 'trail', 'footway', 'bridleway', 'cycleway', 'service', 'unclassified']
    });
    // Analyze junction complexity
    const isComplexJunction = wideAreaFeatures.length > 1;
    let queryBox = DEFAULT_QUERY_BOX;
    if (isComplexJunction) {
        // Count unique road names/refs and analyze road types
        const uniqueRoads = new Set(wideAreaFeatures
            .map(f => f.properties?.name || f.properties?.ref)
            .filter(Boolean));
        queryBox = uniqueRoads.size > 1 ? JUNCTION_QUERY_BOX : // Complex junction
            wideAreaFeatures.length > 2 ? JUNCTION_QUERY_BOX * 0.5 : // Simple junction
                DEFAULT_QUERY_BOX;
    }
    // Initial box query
    let features = map.queryRenderedFeatures([
        [projectedPoint.x - queryBox, projectedPoint.y - queryBox],
        [projectedPoint.x + queryBox, projectedPoint.y + queryBox]
    ], { layers: [ROAD_LAYER_ID] });
    // If no features found at junction, try circular pattern
    if (isComplexJunction && features.length === 0) {
        for (let angle = 0; angle < 360; angle += 45) {
            const radian = (angle * Math.PI) / 180;
            const offsetX = Math.cos(radian) * 40;
            const offsetY = Math.sin(radian) * 40;
            const radialFeatures = map.queryRenderedFeatures([
                [projectedPoint.x + offsetX - 10, projectedPoint.y + offsetY - 10],
                [projectedPoint.x + offsetX + 10, projectedPoint.y + offsetY + 10]
            ], { layers: [ROAD_LAYER_ID] });
            if (radialFeatures.length > 0) {
                features = features.concat(radialFeatures);
                break;
            }
        }
    }
    // Convert MapboxGeoJSONFeatures to RoadFeatures and prioritize
    if (features.length > 0) {
        // Convert features to RoadFeatures
        const validFeatures = features.filter(f => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString');
        const roadFeatures = validFeatures
            .map(f => {
            if (!f.geometry)
                return null;
            const isLineString = f.geometry.type === 'LineString';
            const geometry = f.geometry;
            let coordinates;
            if (isLineString && isValidCoordArray(geometry.coordinates)) {
                coordinates = geometry.coordinates;
            }
            else if (!isLineString && Array.isArray(geometry.coordinates) &&
                geometry.coordinates[0] && isValidCoordArray(geometry.coordinates[0])) {
                coordinates = geometry.coordinates[0];
            }
            else {
                return null;
            }
            return {
                type: 'Feature',
                geometry: isLineString
                    ? {
                        type: 'LineString',
                        coordinates: coordinates.map(coord => [coord[0], coord[1]])
                    }
                    : {
                        type: 'MultiLineString',
                        coordinates: [coordinates.map(coord => [coord[0], coord[1]])]
                    },
                properties: {
                    surface: f.properties?.surface,
                    highway: f.properties?.highway,
                    name: f.properties?.name,
                    ref: f.properties?.ref
                }
            };
        })
            .filter((f) => f !== null);
        return roadFeatures.reduce((best, current) => {
            if (!best)
                return current;
            // Use the closest road
            let bestCoord = null;
            let currentCoord = null;
            if (best.geometry.type === 'LineString') {
                bestCoord = best.geometry.coordinates[0];
            }
            else {
                const coords = best.geometry.coordinates[0];
                if (coords && coords.length > 0)
                    bestCoord = coords[0];
            }
            if (current.geometry.type === 'LineString') {
                currentCoord = current.geometry.coordinates[0];
            }
            else {
                const coords = current.geometry.coordinates[0];
                if (coords && coords.length > 0)
                    currentCoord = coords[0];
            }
            if (!bestCoord || !currentCoord) {
                return best;
            }
            const bestLngLat = toLngLat(bestCoord);
            const currentLngLat = toLngLat(currentCoord);
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
// Helper function to normalize surface types to just "paved" or "unpaved"
const normalizeSurfaceType = (surface) => {
    if (!surface) return null;
    
    const surfaceLower = surface.toLowerCase();
    
    if (PAVED_SURFACES.includes(surfaceLower)) {
        return 'paved';
    } else if (UNPAVED_SURFACES.includes(surfaceLower) || 
               ['track', 'trail'].includes(surfaceLower)) {
        return 'unpaved';
    }
    
    return surface; // Keep original if not recognized
};

// Helper function to smooth surface detection by looking at surrounding points
const smoothSurfaceDetection = (processedPoints) => {
    if (!processedPoints || processedPoints.length < SMOOTHING_WINDOW_SIZE) {
        return processedPoints;
    }
    
    const result = [...processedPoints]; // Create a copy to avoid modifying the original
    const halfWindow = Math.floor(SMOOTHING_WINDOW_SIZE / 2);
    
    // For each point
    for (let i = 0; i < result.length; i++) {
        // Skip if the point is not unpaved
        if (result[i].surface !== 'unpaved' && 
            !UNPAVED_SURFACES.includes(result[i].surface?.toLowerCase()) &&
            !['track', 'trail'].includes(result[i].surface?.toLowerCase())) {
            continue;
        }
        
        // Count unpaved points in the window
        let unpavedCount = 0;
        let windowSize = 0;
        
        // Look at points in the window
        for (let j = Math.max(0, i - halfWindow); j <= Math.min(result.length - 1, i + halfWindow); j++) {
            windowSize++;
            
            if (result[j].surface === 'unpaved' || 
                UNPAVED_SURFACES.includes(result[j].surface?.toLowerCase()) ||
                ['track', 'trail'].includes(result[j].surface?.toLowerCase())) {
                unpavedCount++;
            }
        }
        
        // If the percentage of unpaved points is below the threshold, convert to paved
        if (unpavedCount / windowSize < SMOOTHING_THRESHOLD) {
            console.log(`[Surface Smoothing] Converting point at index ${i} from unpaved to paved (${unpavedCount}/${windowSize} unpaved points in window)`);
            result[i].surface = 'paved';
        }
    }
    
    return result;
};

// Helper function to apply inverse smoothing (paved to unpaved)
const applyInverseSmoothing = (processedPoints) => {
    if (!processedPoints || processedPoints.length < SMOOTHING_WINDOW_SIZE) {
        return processedPoints;
    }
    
    const result = [...processedPoints]; // Create a copy to avoid modifying the original
    const halfWindow = Math.floor(SMOOTHING_WINDOW_SIZE / 2);
    
    // For each point
    for (let i = 0; i < result.length; i++) {
        // Skip if the point is not paved
        if (result[i].surface !== 'paved') {
            continue;
        }
        
        // Count unpaved points in the window
        let unpavedCount = 0;
        let windowSize = 0;
        
        // Look at points in the window
        for (let j = Math.max(0, i - halfWindow); j <= Math.min(result.length - 1, i + halfWindow); j++) {
            windowSize++;
            
            if (result[j].surface === 'unpaved' || 
                UNPAVED_SURFACES.includes(result[j].surface?.toLowerCase()) ||
                ['track', 'trail'].includes(result[j].surface?.toLowerCase())) {
                unpavedCount++;
            }
        }
        
        // If the percentage of unpaved points is ABOVE the inverse threshold, convert to unpaved
        if (unpavedCount / windowSize > INVERSE_SMOOTHING_THRESHOLD) {
            console.log(`[Surface Smoothing] Converting point at index ${i} from paved to unpaved (${unpavedCount}/${windowSize} unpaved points in window)`);
            result[i].surface = 'unpaved';
        }
    }
    
    return result;
};

// Helper function to fill in gaps in surface detection
const fillSurfaceGaps = (processedPoints) => {
    if (!processedPoints || processedPoints.length < 3) return processedPoints;
    
    const result = [...processedPoints]; // Create a copy to avoid modifying the original
    
    let startIndex = 0;
    let knownCategory = null; // 'paved' or 'unpaved'
    
    // First pass: normalize all surface types to 'paved' or 'unpaved'
    for (let i = 0; i < result.length; i++) {
        const currentSurface = result[i].surface;
        if (currentSurface) {
            const normalizedType = normalizeSurfaceType(currentSurface);
            // Only update if it's one of our two main categories
            if (normalizedType === 'paved' || normalizedType === 'unpaved') {
                result[i].normalizedSurface = normalizedType;
            }
        }
    }
    
    // Second pass: fill in gaps between sections with the same category
    for (let i = 0; i < result.length; i++) {
        const currentCategory = result[i].normalizedSurface;
        
        if (currentCategory === 'paved' || currentCategory === 'unpaved') {
            if (knownCategory === null) {
                // Start of a new section
                knownCategory = currentCategory;
                startIndex = i;
            } else if (knownCategory === currentCategory) {
                // End of a section with the same category
                // Fill in any unknown surfaces in between
                if (i - startIndex > 1) {
                    console.log(`[Surface Detection] Filling gap from index ${startIndex} to ${i} with surface category: ${knownCategory}`);
                    
                    for (let j = startIndex + 1; j < i; j++) {
                        // Only fill in unknown surfaces
                        if (!result[j].surface) {
                            result[j].surface = knownCategory;
                            result[j].normalizedSurface = knownCategory;
                        }
                    }
                }
                
                // Update start for next potential section
                startIndex = i;
            } else {
                // Different category - start a new section
                knownCategory = currentCategory;
                startIndex = i;
            }
        }
    }
    
    // Clean up temporary property
    for (let i = 0; i < result.length; i++) {
        delete result[i].normalizedSurface;
    }
    
    return result;
};

// Core surface detection function that processes points one at a time
export const assignSurfacesViaNearest = async (map, coords, onProgress) => {
    console.log('[assignSurfacesViaNearest] Starting surface detection...');
    if (!map) {
        console.log('[assignSurfacesViaNearest] No map provided, returning coords unmodified');
        return coords;
    }
    const results = [];
    let cachedRoads = null;
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
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {
            padding: 50,
            duration: 0,
            maxZoom: 14,
            minZoom: 12
        });
        // Process points in batches to allow tiles to load
        if (i % BATCH_SIZE === 0) {
            // Wait for map to stabilize and tiles to load
            await new Promise((resolve) => {
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
                        console.warn(`[assignSurfacesViaNearest] No roads found for batch ${batchStart}-${batchEnd - 1} after ${MAX_RETRIES} attempts`);
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
        let bestSurface = 'paved'; // Default to paved
        let minDist = Infinity;
        if (i % 100 === 0) {
            console.log(`[assignSurfacesViaNearest] Processing point #${i}, coords=(${pt.lat}, ${pt.lon})`);
        }
        // If no roads found, use previous point's surface type if available
        if (!cachedRoads || cachedRoads.length === 0) {
            const previousPoint = results[results.length - 1];
            results.push({
                ...pt,
                surface: previousPoint ? previousPoint.surface : 'paved' // Default to paved when no roads found
            });
        }
        else {
            // Evaluate each road
            for (const road of cachedRoads) {
                if (road.geometry.type !== 'LineString' &&
                    road.geometry.type !== 'MultiLineString') {
                    continue;
                }
                // Get coordinates based on geometry type
                let lineCoords;
                try {
                    if (road.geometry.type === 'LineString' && isValidCoordArray(road.geometry.coordinates)) {
                        lineCoords = road.geometry.coordinates;
                    }
                    else if (road.geometry.type === 'MultiLineString' &&
                        isValidMultiLineStringCoords(road.geometry.coordinates)) {
                        lineCoords = road.geometry.coordinates[0];
                    }
                    else {
                        continue;
                    }
                }
                catch (error) {
                    console.warn('[assignSurfacesViaNearest] Invalid coordinates:', error);
                    continue;
                }
                const dist = getDistanceToRoad([pt.lon, pt.lat], lineCoords);
                // Simple distance comparison
                if (dist < minDist) {
                    minDist = dist;
                    const surfaceRaw = (road.properties?.surface || '').toLowerCase();
                    console.log(`[Surface Detection] Point at (${pt.lat}, ${pt.lon}):`, {
                        surface: surfaceRaw,
                        isPaved: PAVED_SURFACES.includes(surfaceRaw),
                        isUnpaved: UNPAVED_SURFACES.includes(surfaceRaw)
                    });
                    if (PAVED_SURFACES.includes(surfaceRaw)) {
                        bestSurface = 'paved';
                    }
                    else if (UNPAVED_SURFACES.includes(surfaceRaw)) {
                        bestSurface = 'unpaved';
                    }
                    else if (['track', 'trail'].includes(road.properties?.highway)) {
                        // Tracks and trails are almost always unpaved
                        bestSurface = 'unpaved';
                        console.log(`[Surface Detection] Using highway type '${road.properties?.highway}' to determine surface as unpaved`);
                    }
                    else {
                        bestSurface = 'paved'; // fallback for unknown surfaces
                    }
                }
            }
            results.push({ ...pt, surface: bestSurface });
        }
        // Clear roads cache after each point
        cachedRoads = null;
    }
    console.log('[assignSurfacesViaNearest] => Finished initial processing. Filling gaps...');
    
    // Apply gap filling to improve surface detection
    const gapFilledResults = fillSurfaceGaps(results);
    
    console.log('[assignSurfacesViaNearest] => Gap filling complete. Applying smoothing...');
    
    // Apply smoothing to eliminate false positives at intersections
    const smoothedResults = smoothSurfaceDetection(gapFilledResults);
    
    console.log('[assignSurfacesViaNearest] => Smoothing complete. Applying inverse smoothing...');
    
    // Apply inverse smoothing to eliminate false negatives
    const inverseSmoothedResults = applyInverseSmoothing(smoothedResults);
    
    console.log('[assignSurfacesViaNearest] => Finished processing. Returning coords...');
    return inverseSmoothedResults;
};
// Add surface detection overlay
export const addSurfaceOverlay = async (map, routeFeature) => {
    console.log('[surfaceService] Starting surface detection...');
    try {
        // Wait for resources and ensure proper zoom
        await waitForMapResources(map);
        // Convert route coordinates to points
        const points = routeFeature.geometry.coordinates.map(coord => ({
            lon: coord[0],
            lat: coord[1]
        }));
        // Process points with surface detection and gap filling
        let processedPoints = await assignSurfacesViaNearest(map, points);
        // Create sections based on surface changes
        const sections = [];
        let currentSection = null;
        for (let i = 0; i < processedPoints.length; i++) {
            const point = processedPoints[i];
            // Check if the point has an unpaved surface (including specific types like dirt)
            if (point.surface === 'unpaved' || 
                UNPAVED_SURFACES.includes(point.surface?.toLowerCase()) ||
                ['track', 'trail'].includes(point.surface?.toLowerCase())) {
                if (!currentSection) {
                    currentSection = {
                        startIndex: i,
                        endIndex: i,
                        coordinates: [[roundCoordinate(point.lon), roundCoordinate(point.lat)]],
                        surfaceType: 'unpaved'
                    };
                }
                else {
                    currentSection.endIndex = i;
                    currentSection.coordinates.push([roundCoordinate(point.lon), roundCoordinate(point.lat)]);
                }
            }
            else if (currentSection) {
                sections.push(currentSection);
                currentSection = null;
            }
        }
        // Add final section if exists
        if (currentSection) {
            sections.push(currentSection);
        }
        // Add sections to map
        const routeId = routeFeature.properties?.routeId || 'unknown';
        sections.forEach((section, index) => {
            const sourceId = `unpaved-section-${routeId}-${index}`;
            const layerId = `unpaved-section-layer-${routeId}-${index}`;
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
                        coordinates: section.coordinates
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
        return sections; // Return the sections array
    }
    catch (error) {
        console.error('[surfaceService] Error in surface detection:', error);
        throw error;
    }
};
