import { useState } from 'react';
import { useMapContext } from '../../map/context/MapContext';
import { parseGpx } from '../utils/gpxParser';
import { normalizeRoute } from '../../map/types/route.types';
import { v4 as uuidv4 } from 'uuid';
import { assignSurfacesWithSpatialIndex, generateUnpavedSections } from '../services/spatialSurfaceService';
export const useClientGpxProcessing = () => {
    const { map } = useMapContext(); // Get map instance for surface detection
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const processGpx = async (file, onProgress) => {
        console.log('[useClientGpxProcessing] Starting GPX processing', { fileName: file.name });
        setIsLoading(true);
        setError(null);
        try {
            console.log('[useClientGpxProcessing] Parsing GPX file');
            const parsed = await parseGpx(file);
            const rawGpx = await file.text();
            if (!parsed.geometry.coordinates.length) {
                throw new Error('No valid track points found in GPX file');
            }
            console.log('[useClientGpxProcessing] Creating GeoJSON', {
                parsedElevations: parsed.properties.coordinateProperties?.elevation?.length || 0,
                elevationSample: parsed.properties.coordinateProperties?.elevation?.slice(0, 5)
            });
            const geojson = {
                type: 'FeatureCollection',
                features: [{
                        type: 'Feature',
                        properties: {
                            ...parsed.properties,
                            coordinateProperties: {
                                elevation: parsed.properties.coordinateProperties?.elevation || []
                            }
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: parsed.geometry.coordinates
                        }
                    }]
            };
            // Calculate basic statistics
            const elevations = parsed.properties.coordinateProperties?.elevation || [];
            console.log('[useClientGpxProcessing] Processing elevation statistics:', {
                elevationCount: elevations.length,
                hasElevations: elevations.length > 0,
                minElevation: elevations.length ? Math.min(...elevations) : 'N/A',
                maxElevation: elevations.length ? Math.max(...elevations) : 'N/A'
            });
            // Calculate total distance from original coordinates since map matching might fail
            const totalDistance = parsed.geometry.coordinates.reduce((acc, coord, i) => {
                if (i === 0)
                    return 0;
                const [lon1, lat1] = parsed.geometry.coordinates[i - 1];
                const [lon2, lat2] = coord;
                const R = 6371e3; // Earth's radius in meters
                const φ1 = lat1 * Math.PI / 180;
                const φ2 = lat2 * Math.PI / 180;
                const Δφ = (lat2 - lat1) * Math.PI / 180;
                const Δλ = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return acc + (R * c);
            }, 0);
            let maxElevation = elevations.length ? Math.max(...elevations) : 0;
            let minElevation = elevations.length ? Math.min(...elevations) : 0;
            
            // Apply smoothing to elevation data before calculating gain/loss
            // This reduces the impact of GPS noise on elevation calculations
            const smoothingWindow = 5;
            const smoothedElevations = [...elevations]; // Create a copy to avoid modifying original
            
            if (elevations.length > smoothingWindow) {
                for (let i = 0; i < elevations.length; i++) {
                    const windowStart = Math.max(0, i - Math.floor(smoothingWindow / 2));
                    const windowEnd = Math.min(elevations.length, i + Math.floor(smoothingWindow / 2) + 1);
                    const window = elevations.slice(windowStart, windowEnd);
                    const avgElevation = window.reduce((sum, elevation) => sum + elevation, 0) / window.length;
                    smoothedElevations[i] = avgElevation;
                }
            }
            
            // Calculate elevation gain/loss using smoothed data
            let elevationGain = 0;
            let elevationLoss = 0;
            
            for (let i = 1; i < smoothedElevations.length; i++) {
                const diff = smoothedElevations[i] - smoothedElevations[i - 1];
                if (diff > 0)
                    elevationGain += diff;
                else
                    elevationLoss += Math.abs(diff);
            }
            
            console.log('[useClientGpxProcessing] Elevation statistics:', {
                rawElevationPoints: elevations.length,
                smoothedElevationPoints: smoothedElevations.length,
                elevationGain: Math.round(elevationGain),
                elevationLoss: Math.round(elevationLoss)
            });
            const statistics = {
                totalDistance,
                elevationGain,
                elevationLoss,
                maxElevation,
                minElevation,
                averageSpeed: 0, // TODO: Calculate if time data is available
                movingTime: 0, // TODO: Calculate if time data is available
                totalTime: 0 // TODO: Calculate if time data is available
            };
            const id = uuidv4();
            const route = normalizeRoute({
                id,
                routeId: `route-${id}`,
                name: parsed.properties.name || file.name.replace(/\.gpx$/i, ''),
                color: '#ff4d4d', // Default red color
                isVisible: true,
                gpxData: JSON.stringify(parsed),
                rawGpx,
                geojson,
                statistics,
                status: {
                    processingState: 'completed',
                    progress: 100
                }
            });
            // Add surface detection using spatial indexing
            try {
                if (onProgress) onProgress('Detecting surface types using spatial indexing...');
                
                // Extract points from the route
                const points = parsed.geometry.coordinates.map(coord => ({
                    lon: coord[0],
                    lat: coord[1],
                    elevation: coord[2]
                }));
                
                // Process surface types using the spatial index
                const pointsWithSurface = await assignSurfacesWithSpatialIndex(
                    points,
                    (progress, total) => {
                        if (onProgress) {
                            const percentage = Math.round((progress / total) * 100);
                            onProgress(`Surface detection progress: ${percentage}%`);
                        }
                    }
                );
                
                // Generate unpaved sections from the results
                route.unpavedSections = generateUnpavedSections(pointsWithSurface);
                
                if (onProgress) onProgress('Surface detection complete');
            } catch (error) {
                console.error('[useClientGpxProcessing] Surface detection error:', error);
            }
            console.log('[useClientGpxProcessing] Processing complete', { routeId: route.id });
            return route;
        }
        catch (err) {
            const gpxError = {
                code: err instanceof Error && err.message.includes('Map is not ready') ? 'MAP_NOT_READY' : 'PARSING_ERROR',
                message: err instanceof Error ? err.message : 'Failed to process GPX file',
                details: err instanceof Error ? err.stack : undefined
            };
            setError(gpxError);
            console.error('[useClientGpxProcessing] Processing error:', gpxError);
            return null;
        }
        finally {
            setIsLoading(false);
        }
    };
    return {
        processGpx,
        isLoading,
        error
    };
};
