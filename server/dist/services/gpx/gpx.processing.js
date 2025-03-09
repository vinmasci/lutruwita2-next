"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GPXProcessingService = void 0;
const xmldom_1 = require("@xmldom/xmldom");
class GPXProcessingService {
    constructor(mapboxToken) {
        this.mapboxToken = mapboxToken;
    }
    roundCoordinate(value) {
        return Number(value.toFixed(5));
    }
    roundElevation(value) {
        return Number(value.toFixed(1));
    }
    async processGPXFile(fileContent, options) {
        const { onProgress } = options || {};
        try {
            // Parse GPX file
            const gpxDoc = new xmldom_1.DOMParser().parseFromString(fileContent, 'text/xml');
            onProgress?.(20);
            // Extract track points
            const trackPoints = this.extractTrackPoints(gpxDoc);
            onProgress?.(40);
            // Create GeoJSON from track points
            const geojson = {
                type: 'FeatureCollection',
                features: [{
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: trackPoints
                        }
                    }]
            };
            onProgress?.(60);
            // Analyze surface types using raw track
            const surfaceAnalysis = await this.analyzeSurfaces({ geojson });
            onProgress?.(80);
            const elevations = await this.calculateElevation(trackPoints);
            const totalDistance = this.calculateTotalDistance(trackPoints);
            // Prepare final result
            const result = {
                id: `temp-id-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: this.extractTrackName(gpxDoc) || 'Unnamed Track',
                color: '#FF0000', // Default red color
                isVisible: true,
                geojson: geojson,
                surface: surfaceAnalysis,
                statistics: {
                    totalDistance,
                    elevationGain: 0, // Calculate from elevations
                    elevationLoss: 0, // Calculate from elevations
                    maxElevation: Math.max(...elevations),
                    minElevation: Math.min(...elevations),
                    averageSpeed: 0,
                    movingTime: 0,
                    totalTime: 0
                },
                status: {
                    processingState: 'completed',
                    progress: 100
                }
            };
            onProgress?.(100);
            return result;
        }
        catch (error) {
            console.error('GPX processing failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : '';
            console.error(`GPX Processing Failure Details:
        Error: ${errorMessage}
        Stack: ${stack}
        Mapbox Token: ${this.mapboxToken ? 'Present' : 'Missing'}
      `);
            throw new Error(`GPX processing failed: ${errorMessage}`);
        }
    }
    extractTrackPoints(gpxDoc) {
        const trackPoints = [];
        const trkptNodes = gpxDoc.getElementsByTagName('trkpt');
        for (let i = 0; i < trkptNodes.length; i++) {
            const point = trkptNodes[i];
            const lat = parseFloat(point.getAttribute('lat') || '0');
            const lon = parseFloat(point.getAttribute('lon') || '0');
            if (lat && lon) {
                trackPoints.push([
                    this.roundCoordinate(lon),
                    this.roundCoordinate(lat)
                ]);
            }
        }
        return trackPoints;
    }
    calculateTotalDistance(points) {
        let totalDistance = 0;
        for (let i = 1; i < points.length; i++) {
            const [lon1, lat1] = points[i - 1];
            const [lon2, lat2] = points[i];
            // Simple Haversine formula for distance calculation
            const R = 6371e3; // Earth's radius in meters
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const d = R * c;
            totalDistance += d;
        }
        return totalDistance;
    }
    async analyzeSurfaces(input) {
        try {
            const feature = input.geojson.features[0];
            if (!feature || feature.geometry.type !== 'LineString') {
                return this.getDefaultSurfaceAnalysis();
            }
            const coordinates = feature.geometry.coordinates;
            if (!coordinates) {
                return this.getDefaultSurfaceAnalysis();
            }
            const totalDistance = this.calculateTotalDistance(coordinates);
            return {
                surfaceTypes: [{
                        type: 'trail',
                        percentage: 100,
                        distance: totalDistance
                    }],
                elevationProfile: coordinates.map((coord, i) => ({
                    elevation: 0,
                    distance: (i / coordinates.length) * totalDistance,
                    grade: 0
                })),
                totalDistance,
                roughness: 0.5,
                difficultyRating: 0.5,
                surfaceQuality: 0.8
            };
        }
        catch (error) {
            console.error('Surface analysis error:', error);
            return this.getDefaultSurfaceAnalysis();
        }
    }
    getDefaultSurfaceAnalysis() {
        return {
            surfaceTypes: [{
                    type: 'unknown',
                    percentage: 100,
                    distance: 0
                }],
            elevationProfile: [],
            totalDistance: 0,
            roughness: 0,
            difficultyRating: 0,
            surfaceQuality: 0
        };
    }
    async calculateElevation(points) {
        try {
            // Use Mapbox Terrain-RGB tiles for elevation data
            const elevations = await Promise.all(points.map(async ([lon, lat]) => {
                const response = await fetch(`https://api.mapbox.com/v4/mapbox.terrain-rgb/${lon},${lat},14/256x256.pngraw?access_token=${this.mapboxToken}`);
                if (!response.ok) {
                    console.warn(`Failed to get elevation for point [${lon}, ${lat}]`);
                    return 0;
                }
                // Process the RGB values to get elevation
                // Elevation = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
                const buffer = await response.arrayBuffer();
                const view = new Uint8Array(buffer);
                const elevation = -10000 + ((view[0] * 256 * 256 + view[1] * 256 + view[2]) * 0.1);
                return this.roundElevation(elevation);
            }));
            return elevations;
        }
        catch (error) {
            console.error('Failed to calculate elevations:', error);
            return points.map(() => 0);
        }
    }
    extractTrackName(gpxDoc) {
        const nameNode = gpxDoc.getElementsByTagName('name')[0];
        return nameNode ? nameNode.textContent : null;
    }
}
exports.GPXProcessingService = GPXProcessingService;
