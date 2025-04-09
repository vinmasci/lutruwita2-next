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
// Import the vector tile service
import { vectorTileService } from './vectorTileService';

// Wait for vector tile service to be ready
const waitForVectorTileService = async (bounds) => {
    console.log('[surfaceService] Waiting for vector tile service to be ready...');
    try {
        // Load tiles for the given bounds
        await vectorTileService.loadTilesForBounds(bounds);
        console.log('[surfaceService] Vector tile service ready');
        return true;
    } catch (error) {
        console.error('[surfaceService] Error loading vector tiles:', error);
        return false;
    }
};
// Find nearest road using vector tile service
const findNearestRoad = (point) => {
    if (!point || point.length !== 2) {
        console.warn('[findNearestRoad] Invalid coordinates:', point);
        return null;
    }
    
    // Use the vector tile service to find the nearest road
    return vectorTileService.findNearestRoad(point, 0.00005); // 5m search radius
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

/**
 * Remove "chatter" - short segments of different surface types
 * @param {Array} processedPoints - Array of points with surface information
 * @param {number} minSegmentLength - Minimum number of consecutive points to keep a segment
 * @returns {Array} - Processed points with chatter removed
 */
export const removeChatter = (processedPoints, minSegmentLength = 5) => {
    if (!processedPoints || processedPoints.length < minSegmentLength) {
        return processedPoints;
    }
    
    const result = [...processedPoints]; // Create a copy
    
    // First pass: identify segments
    const segments = [];
    let currentType = result[0].surface;
    let startIndex = 0;
    
    for (let i = 1; i < result.length; i++) {
        if (result[i].surface !== currentType) {
            // End of segment
            segments.push({
                type: currentType,
                start: startIndex,
                end: i - 1,
                length: i - startIndex
            });
            
            // Start new segment
            currentType = result[i].surface;
            startIndex = i;
        }
    }
    
    // Add the last segment
    segments.push({
        type: currentType,
        start: startIndex,
        end: result.length - 1,
        length: result.length - startIndex
    });
    
    console.log(`[removeChatter] Identified ${segments.length} segments before processing`);
    
    // Second pass: remove short segments
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        // If this is a short segment
        if (segment.length < minSegmentLength) {
            // Determine what surface type to use instead
            let replacementType;
            
            // If this is the first or last segment, use the adjacent segment's type
            if (i === 0 && segments.length > 1) {
                replacementType = segments[1].type;
            } else if (i === segments.length - 1 && segments.length > 1) {
                replacementType = segments[i-1].type;
            } else if (segments.length > 2) {
                // For middle segments, use the type of the longer adjacent segment
                const prevSegment = segments[i-1];
                const nextSegment = segments[i+1];
                
                // If both adjacent segments have the same type, use that
                if (prevSegment.type === nextSegment.type) {
                    replacementType = prevSegment.type;
                } else {
                    // Otherwise use the type of the longer adjacent segment
                    replacementType = (prevSegment.length >= nextSegment.length) ? 
                        prevSegment.type : nextSegment.type;
                }
            }
            
            // Apply the replacement type to all points in this segment
            if (replacementType) {
                console.log(`[removeChatter] Replacing segment ${i} (${segment.start}-${segment.end}, length ${segment.length}) of type '${segment.type}' with '${replacementType}'`);
                for (let j = segment.start; j <= segment.end; j++) {
                    result[j].surface = replacementType;
                }
            }
        }
    }
    
    // Count segments after processing
    let processedSegments = 1;
    let currentSurface = result[0].surface;
    
    for (let i = 1; i < result.length; i++) {
        if (result[i].surface !== currentSurface) {
            processedSegments++;
            currentSurface = result[i].surface;
        }
    }
    
    console.log(`[removeChatter] Reduced to ${processedSegments} segments after processing`);
    
    return result;
};

// Helper function to smooth surface detection by looking at surrounding points
export const smoothSurfaceDetection = (processedPoints) => {
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
            result[i].surface = 'paved';
        }
    }
    
    return result;
};

// Helper function to apply inverse smoothing (paved to unpaved)
export const applyInverseSmoothing = (processedPoints) => {
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
            result[i].surface = 'unpaved';
        }
    }
    
    return result;
};

// Helper function to fill in gaps in surface detection
export const fillSurfaceGaps = (processedPoints) => {
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
                    // Fill gap with known category
                    
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
export const assignSurfacesViaNearest = async (coords, onProgress) => {
    console.log('[assignSurfacesViaNearest] Starting surface detection...');
    
    if (!coords || coords.length === 0) {
        console.log('[assignSurfacesViaNearest] No coordinates provided, returning empty array');
        return [];
    }
    
    // Calculate bounding box for all coordinates
    const bounds = [
        Math.min(...coords.map(pt => pt.lon)) - 0.01, // Add buffer
        Math.min(...coords.map(pt => pt.lat)) - 0.01,
        Math.max(...coords.map(pt => pt.lon)) + 0.01,
        Math.max(...coords.map(pt => pt.lat)) + 0.01
    ];
    
    // Load vector tiles for the entire route
    console.log('[assignSurfacesViaNearest] Loading vector tiles for bounds:', bounds);
    await waitForVectorTileService(bounds);
    
    const results = [];
    
    // Process one point at a time
    for (let i = 0; i < coords.length; i++) {
        const pt = coords[i];
        
        // Update progress
        if (onProgress) {
            onProgress(i + 1, coords.length);
        }
        
        // Find nearest road for current point using vector tile service
        const road = findNearestRoad([pt.lon, pt.lat]);
        
        // Process the point
        let bestSurface = 'paved'; // Default to paved
        
        if (i % 100 === 0) {
            console.log(`[assignSurfacesViaNearest] Processing point #${i}, coords=(${pt.lat}, ${pt.lon})`);
        }
        
        // If no road found, use previous point's surface type if available
        if (!road) {
            const previousPoint = results[results.length - 1];
            results.push({
                ...pt,
                surface: previousPoint ? previousPoint.surface : 'paved' // Default to paved when no roads found
            });
        } else {
            // Determine surface type from road properties
            const surfaceRaw = (road.properties?.surface || '').toLowerCase();
            
            if (PAVED_SURFACES.includes(surfaceRaw)) {
                bestSurface = 'paved';
            } else if (UNPAVED_SURFACES.includes(surfaceRaw)) {
                bestSurface = 'unpaved';
            } else if (['track', 'trail'].includes(road.properties?.highway)) {
                // Tracks and trails are almost always unpaved
                bestSurface = 'unpaved';
            }
            
            results.push({ ...pt, surface: bestSurface });
        }
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
    
    console.log('[assignSurfacesViaNearest] => Applying chatter removal...');
    
    // Apply chatter removal to eliminate short segments
    const chatterRemovedResults = removeChatter(inverseSmoothedResults, 5);
    
    console.log('[assignSurfacesViaNearest] => Finished processing. Returning coords...');
    return chatterRemovedResults;
};
// Add surface detection overlay
export const addSurfaceOverlay = async (map, routeFeature) => {
    console.log('[surfaceService] Starting surface detection...');
    try {
        // Convert route coordinates to points
        const points = routeFeature.geometry.coordinates.map(coord => ({
            lon: coord[0],
            lat: coord[1]
        }));
        
        // Process points with surface detection and gap filling
        let processedPoints = await assignSurfacesViaNearest(points);
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
