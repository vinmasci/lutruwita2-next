import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { createPortal } from 'react-dom';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ResponsiveLine } from '@nivo/line';
import { detectClimbs } from '../../../gpx/utils/climbUtils';
import { ProcessedRoute } from '../../../gpx/types/gpx.types';
import { 
    findClosestPointOnRoute, 
    createRouteSpatialGrid, 
    calculateCumulativeDistances 
} from '../../../../utils/routeUtils';

const ElevationContent = styled('div')({
    width: '100%',
    height: '100%',
    padding: 0,
    backgroundColor: '#1a1a1a',
    '& .recharts-cartesian-grid-horizontal line, & .recharts-cartesian-grid-vertical line': {
        stroke: 'rgba(255, 255, 255, 0.9)'
    },
    '& .recharts-text': {
        fill: 'rgba(255, 255, 255, 0.7)'
    }
});

interface ElevationPoint {
    distance: number;
    elevation: number;
    isPaved: boolean;
}

interface Props {
    route: ProcessedRoute;
    isLoading: boolean;
    error?: string;
}

interface Stats {
    elevationGained: number;
    elevationLost: number;
    totalDistance: number;
    unpavedPercentage: number;
}

interface Segment {
    points: Array<{x: number, y: number, isPaved: boolean}>;
    type: 'normal' | 'climb';
    climbCategory?: string;
    color?: string;
    isPaved: boolean;
}

interface ClimbPoint {
    distance: number;
    elevation: number;
}

interface Climb {
    startPoint: ClimbPoint;
    endPoint: ClimbPoint;
    category: string;
    color: string;
    number?: number;
}

function createLinePath(points: Array<{x: number, y: number}>, xScale: any, yScale: any): string {
    let linePath = `M ${xScale(points[0].x)},${yScale(points[0].y)}`;
    const tension = 0.3; // Increased tension for smoother curves

    for (let i = 0; i < points.length - 1; i++) {
        const x0 = i > 0 ? xScale(points[i - 1].x) : xScale(points[i].x);
        const y0 = i > 0 ? yScale(points[i - 1].y) : yScale(points[i].y);
        const x1 = xScale(points[i].x);
        const y1 = yScale(points[i].y);
        const x2 = xScale(points[i + 1].x);
        const y2 = yScale(points[i + 1].y);
        const x3 = i < points.length - 2 ? xScale(points[i + 2].x) : x2;
        const y3 = i < points.length - 2 ? yScale(points[i + 2].y) : y2;

        const cp1x = x1 + (x2 - x0) * tension;
        const cp1y = y1 + (y2 - y0) * tension;
        const cp2x = x2 - (x3 - x1) * tension;
        const cp2y = y2 - (y3 - y1) * tension;

        linePath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
    }

    return linePath;
}

function createAreaPath(points: Array<{x: number, y: number}>, xScale: any, yScale: any, height: number): string {
    let areaPath = `M ${xScale(points[0].x)},${height}`;
    areaPath += ` L ${xScale(points[0].x)},${yScale(points[0].y)}`;

    for (let i = 0; i < points.length - 1; i++) {
        const x1 = xScale(points[i].x);
        const y1 = yScale(points[i].y);
        const x2 = xScale(points[i + 1].x);
        const y2 = yScale(points[i + 1].y);

        const cp1x = x1 + (x2 - x1) / 2;
        const cp1y = y1;
        const cp2x = x2 - (x2 - x1) / 2;
        const cp2y = y2;

        areaPath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
    }

    areaPath += ` L ${xScale(points[points.length-1].x)},${height} Z`;
    return areaPath;
}

function createSegments(points: Array<{x: number, y: number, isPaved: boolean}>, climbs: Climb[]): Segment[] {
    const segments: Segment[] = [];
    let currentPoints: Array<{x: number, y: number, isPaved: boolean}> = [];
    let currentIndex = 0;

    const createSegment = (points: Array<{x: number, y: number, isPaved: boolean}>, climb: Climb | null, isPaved: boolean): Segment => ({
        points,
        type: climb ? 'climb' : 'normal' as const,
        climbCategory: climb?.category,
        color: climb?.color,
        isPaved
    });

    // Helper to find climb at a point
    const findClimbAtPoint = (point: {x: number, y: number, isPaved: boolean}) => {
        const pointDistance = point.x * 1000;
        return climbs.find(climb => 
            pointDistance >= climb.startPoint.distance && 
            pointDistance <= climb.endPoint.distance
        );
    };

    // Process all points
    while (currentIndex < points.length) {
        const point = points[currentIndex];
        const activeClimb = findClimbAtPoint(point);

        // Handle first point
        if (currentPoints.length === 0) {
            currentPoints.push(point);
            currentIndex++;
            continue;
        }

        const prevPoint = currentPoints[currentPoints.length - 1];
        const prevClimb = findClimbAtPoint(prevPoint);

        // Check if we need to create a new segment
        const climbChanged = !!activeClimb !== !!prevClimb || 
            (activeClimb && prevClimb && activeClimb.category !== prevClimb.category);
        const surfaceChanged = point.isPaved !== prevPoint.isPaved;

        if (climbChanged || surfaceChanged) {
            // Add transition point to current segment
            currentPoints.push(point);
            segments.push(createSegment([...currentPoints], prevClimb || null, prevPoint.isPaved));
            
            // Start new segment with the transition point
            currentPoints = [point];
        } else {
            currentPoints.push(point);
        }

        currentIndex++;
    }

    // Add final segment
    if (currentPoints.length > 0) {
        const finalClimb = climbs.find(climb => {
            const pointDistance = currentPoints[0].x * 1000;
            return pointDistance >= climb.startPoint.distance && 
                   pointDistance <= climb.endPoint.distance;
        });
        segments.push(createSegment(currentPoints, finalClimb || null, currentPoints[0].isPaved));
    }

    return segments;
}

// Haversine formula to calculate distance between two points
const calculateDistance = (point1: number[], point2: number[]): number => {
    // Ensure we have at least 2 elements in each point
    if (point1.length < 2 || point2.length < 2) {
        return 0; // Return 0 distance if points are invalid
    }
    
    const lon1 = point1[0];
    const lat1 = point1[1];
    const lon2 = point2[0];
    const lat2 = point2[1];
    
    // Convert to radians
    const toRad = (value: number) => value * Math.PI / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    
    // Haversine formula
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    // Earth's radius in meters
    const R = 6371e3;
    return R * c;
};

interface TooltipProps {
    content: React.ReactNode;
    x: number;
    y: number;
}

const Tooltip: React.FC<TooltipProps> = ({ content, x, y }) => {
    return createPortal(
        <div style={{
            position: 'fixed',
            left: x + 10,
            top: y + 10,
            zIndex: 1000
        }}>
            {content}
        </div>,
        document.body
    );
};

export const PresentationElevationProfile: React.FC<Props> = ({ route, isLoading, error }) => {
    const [tooltip, setTooltip] = useState<{ content: React.ReactNode; x: number; y: number } | null>(null);
    const [data, setData] = useState<ElevationPoint[]>([]);
    const [climbs, setClimbs] = useState<Climb[]>([]);
    const [stats, setStats] = useState<Stats>({ 
        elevationGained: route.statistics?.elevationGain || 0, 
        elevationLost: route.statistics?.elevationLoss || 0, 
        totalDistance: route.statistics?.totalDistance || 0,
        unpavedPercentage: 0
    });
    const [currentProfilePoint, setCurrentProfilePoint] = useState<{ x: number, y: number } | null>(null);
    const { hoverCoordinates } = useMapContext();
    
    // Reference to store the route spatial grid and distance map
    const routeDataRef = useRef<{
        spatialGrid: ReturnType<typeof createRouteSpatialGrid> | null;
        distanceMap: Map<number, number> | null;
        indexMap: Map<string, number> | null;
    }>({
        spatialGrid: null,
        distanceMap: null,
        indexMap: null
    });

    // Create a cache for route data to avoid recalculating for the same route
    const routeDataCache = useRef<Map<string, {
        spatialGrid: ReturnType<typeof createRouteSpatialGrid> | null;
        distanceMap: Map<number, number> | null;
        indexMap: Map<string, number> | null;
    }>>(new Map());

    // Memoize the route data creation to avoid unnecessary recalculations
    const routeData = useMemo(() => {
        if (!route?.geojson?.features?.[0]) {
            return {
                spatialGrid: null,
                distanceMap: null,
                indexMap: null
            };
        }

        // Use route ID as cache key
        const routeId = route.id || route.routeId;
        
        // If we have cached data for this route, use it
        if (routeId && routeDataCache.current.has(routeId)) {
            return routeDataCache.current.get(routeId)!;
        }

        const feature = route.geojson.features[0];
        if (feature.geometry.type !== 'LineString') {
            return {
                spatialGrid: null,
                distanceMap: null,
                indexMap: null
            };
        }

        const coordinates = feature.geometry.coordinates;
        
        // Create spatial grid for optimized point lookup
        const spatialGrid = createRouteSpatialGrid(coordinates);
        
        // Pre-calculate cumulative distances
        const distanceMap = new Map<number, number>();
        distanceMap.set(0, 0); // First point is at distance 0
        
        let totalDistanceCalculated = 0;
        for (let i = 1; i < coordinates.length; i++) {
            const distance = calculateDistance(coordinates[i-1], coordinates[i]);
            totalDistanceCalculated += distance;
            distanceMap.set(i, totalDistanceCalculated);
        }
        
        // Create a map to quickly find the index of a coordinate
        const indexMap = new Map<string, number>();
        coordinates.forEach((coord, index) => {
            if (coord && coord.length >= 2) {
                const key = `${coord[0]},${coord[1]}`;
                indexMap.set(key, index);
            }
        });
        
        const result = {
            spatialGrid,
            distanceMap,
            indexMap
        };
        
        // Cache the result for this route
        if (routeId) {
            routeDataCache.current.set(routeId, result);
            console.log(`[PresentationElevationProfile] ✅ Cached spatial grid and distance map for route ${routeId}`);
        } else {
            console.log('[PresentationElevationProfile] ✅ Created spatial grid and distance map for elevation profile (not cached - no route ID)');
        }
        
        return result;
    }, [route]);

    // Update the ref with the memoized data
    useEffect(() => {
        routeDataRef.current = routeData;
    }, [routeData]);

    // Effect to update the current profile point based on hover coordinates
    useEffect(() => {
        if (!hoverCoordinates || !data.length || !route?.geojson?.features?.[0] || !routeDataRef.current.spatialGrid) {
            setCurrentProfilePoint(null);
            return;
        }

        // Use the optimized function to find the closest point
        const closestPoint = findClosestPointOnRoute(hoverCoordinates, routeDataRef.current.spatialGrid);
        
        if (!closestPoint) {
            setCurrentProfilePoint(null);
            return;
        }
        
        // Find the index of this point in the route
        const pointKey = `${closestPoint[0]},${closestPoint[1]}`;
        const closestIndex = routeDataRef.current.indexMap?.get(pointKey);
        
        if (closestIndex !== undefined) {
            // Get the pre-calculated distance at this index
            const distanceAlongRoute = (routeDataRef.current.distanceMap?.get(closestIndex) || 0) / 1000; // in km
            
            // Find the closest point in the elevation data
            const closestDataPoint = data.reduce((closest, point, index) => {
                const distDiff = Math.abs(point.distance / 1000 - distanceAlongRoute);
                if (distDiff < closest.diff) {
                    return { index, diff: distDiff };
                }
                return closest;
            }, { index: 0, diff: Infinity });
            
            const elevation = data[closestDataPoint.index]?.elevation || 0;
            
            setCurrentProfilePoint({ x: distanceAlongRoute, y: elevation });
        } else {
            setCurrentProfilePoint(null);
        }
    }, [hoverCoordinates, data, route]);

    useEffect(() => {
        // More robust null checking for route data
        if (!route?.geojson?.features?.[0]?.properties?.coordinateProperties?.elevation) {
            console.log('[PresentationElevationProfile] No elevation data available for route:', 
                route?.id || route?.routeId || 'unknown');
            setData([]);
            return;
        }
        try {
            const feature = route.geojson.features[0];
            if (feature.geometry.type !== 'LineString') {
                setData([]);
                return;
            }
            const elevations = feature.properties?.coordinateProperties?.elevation;
            const totalDistance = route.statistics.totalDistance;
            if (!Array.isArray(elevations)) {
                setData([]);
                return;
            }


            // Create elevation data with surface type
            const elevationData: ElevationPoint[] = [];
            const pointCount = elevations.length;
            
            // Calculate unpaved distance
            let unpavedDistance = 0;
            if (route.unpavedSections) {
                for (const section of route.unpavedSections) {
                    const sectionStartDist = (section.startIndex / (pointCount - 1)) * totalDistance;
                    const sectionEndDist = (section.endIndex / (pointCount - 1)) * totalDistance;
                    unpavedDistance += sectionEndDist - sectionStartDist;
                }
            }
            const unpavedPercentage = (unpavedDistance / totalDistance) * 100;
            
            for (let i = 0; i < pointCount; i++) {
                const distance = (i / (pointCount - 1)) * totalDistance;
                const elevation = elevations[i];
                
                // Determine if this point is in an unpaved section
                let isPaved = true;
                if (route.unpavedSections) {
                    for (const section of route.unpavedSections) {
                        const sectionStartDist = (section.startIndex / (pointCount - 1)) * totalDistance;
                        const sectionEndDist = (section.endIndex / (pointCount - 1)) * totalDistance;
                        
                        if (distance >= sectionStartDist && distance <= sectionEndDist) {
                            isPaved = false;
                            break;
                        }
                    }
                }
                
                elevationData.push({
                    distance,
                    elevation,
                    isPaved
                });
            }


            // Use the elevation gain/loss values from route.statistics
            // These are now calculated with smoothing during initial GPX processing
            setStats({
                elevationGained: route.statistics?.elevationGain || 0,
                elevationLost: route.statistics?.elevationLoss || 0,
                totalDistance,
                unpavedPercentage
            });

            setData(elevationData);

            // Detect climbs and store them
            const climbData = elevationData.map(point => ({
                distance: point.distance,
                elevation: point.elevation
            }));
            const detectedClimbs = detectClimbs(climbData);
            setClimbs(detectedClimbs);
        } catch (err) {
            console.error('Error processing elevation data:', err);
            setData([]);
        }
    }, [route]);

    if (error) {
        return (
            <ElevationContent className="flex items-center justify-center text-red-500">
                Error loading elevation data: {error}
            </ElevationContent>
        );
    }

    if (isLoading) {
        return (
            <ElevationContent className="flex items-center justify-center text-muted-foreground">
                Loading elevation data...
            </ElevationContent>
        );
    }

    if (!data.length) {
        return (
            <ElevationContent className="flex items-center justify-center text-muted-foreground">
                No elevation data available
            </ElevationContent>
        );
    }

    // Create a single data series with pattern information
    const chartData = [{
        id: 'elevation',
        data: data.map(d => ({
            x: d.distance / 1000, // Convert to km
            y: d.elevation,
            isPaved: d.isPaved
        })),
        color: '#4b6584'
    }];

    // Create defs for the patterns - one for default and one for each climb category
    const defs = [
        {
            id: 'unpavedPattern',
            type: 'patternLines',
            background: 'rgba(2, 136, 209, 0.2)',
            color: 'rgba(2, 136, 209, 0.3)',
            rotation: -65,
            lineWidth: 3,
            spacing: 6
        }
    ];

    // First sort climbs by distance to get them in route order
    const sortedClimbs = [...climbs].sort((a, b) => a.startPoint.distance - b.startPoint.distance);

    // Then assign numbers within each category
    const categoryCount: { [key: string]: number } = {};
    sortedClimbs.forEach(climb => {
        categoryCount[climb.category] = (categoryCount[climb.category] || 0) + 1;
        climb.number = categoryCount[climb.category];
        
        // Create pattern for this climb
        defs.push({
            id: `unpavedPattern-${climb.category}-${climb.number}`,
            type: 'patternLines',
            background: climb.color.replace('99', '33'),
            color: climb.color.replace('99', '66'),
            rotation: -60,
            lineWidth: 3,
            spacing: 6
        });
    });

    // Group climbs by category for easier lookup
    const climbsByCategory: { [key: string]: Climb[] } = {};
    sortedClimbs.forEach(climb => {
        if (!climbsByCategory[climb.category]) {
            climbsByCategory[climb.category] = [];
        }
        climbsByCategory[climb.category].push(climb);
    });

    // Create custom layer to handle different patterns
    const customLayer = (props: any) => {
        const { data, xScale, yScale } = props;
        const points = data[0].data;
        const height = props.innerHeight;

        // Create segments at climb boundaries
        const segments = createSegments(points, climbs);


        return (
            <g>
                {/* First render all segments */}
                {segments.map((segment, i) => {
                    const linePath = createLinePath(segment.points, xScale, yScale);
                    const areaPath = createAreaPath(segment.points, xScale, yScale, height);

                    // Determine colors based on whether it's a climb segment
                    const baseColor = segment.type === 'climb' && segment.color 
                        ? segment.color.replace('99', '66') // Use climb color with 40% opacity
                        : "rgba(2, 136, 209, 0.4)"; // Default blue

                    const patternId = segment.type === 'climb' && segment.climbCategory
                        ? `unpavedPattern-${segment.climbCategory}-${
                            climbsByCategory[segment.climbCategory]?.find(c => 
                                c.startPoint.distance <= segment.points[0].x * 1000 && 
                                c.endPoint.distance >= segment.points[0].x * 1000
                            )?.number || 1
                          }`
                        : 'unpavedPattern';

                    const lineColor = segment.type === 'climb' && segment.color 
                        ? segment.color.replace('99', 'ff') // Full opacity for line
                        : 'rgba(2, 136, 209, 0.9)';

                    return (
                        <g key={i}>
                            {/* Base area fill */}
                            <path
                                d={areaPath}
                                fill={baseColor}
                            />
                            {/* Unpaved pattern */}
                            {!segment.isPaved && (
                                <path
                                    d={areaPath}
                                    fill={`url(#${patternId})`}
                                    fillOpacity={0.6}
                                />
                            )}
                            {/* Line on top */}
                            <path
                                d={linePath}
                                fill="none"
                                stroke={lineColor}
                                strokeWidth={0.2}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                strokeOpacity={1}
                            />
                        </g>
                    );
                })}
                {/* Then render all flags (start and end) in sorted order */}
                {sortedClimbs.map((climb, i) => {
                    const startX = xScale(climb.startPoint.distance / 1000);
                    const startY = yScale(climb.startPoint.elevation);
                    const endX = xScale(climb.endPoint.distance / 1000);
                    const endY = yScale(climb.endPoint.elevation);
                    const color = climb.color.replace('99', 'ff');
                    
                    // Calculate climb stats
                    const distance = (climb.endPoint.distance - climb.startPoint.distance) / 1000; // km
                    const elevation = climb.endPoint.elevation - climb.startPoint.elevation; // m
                    const gradient = ((elevation / (distance * 1000)) * 100).toFixed(1); // %

                    // Create tooltip content specific to this climb
                    const tooltipContent = (
                        <div style={{ 
                            background: 'rgba(30, 30, 30, 0.95)',
                            padding: '8px 12px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '4px',
                            fontFamily: 'Lato',
                            fontSize: '12px',
                            color: 'white'
                        }}>
                            <div style={{ marginBottom: '4px', color: color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {climb.category} {climb.category === 'HC' && <i className="fa-regular fa-skull-crossbones" />}
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '4px', 
                                color: 'rgba(255,255,255,0.7)', 
                                marginTop: '8px' 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-route" style={{ fontSize: '11px', color: '#0288d1', width: '14px' }} />
                                    <span>{distance.toFixed(1)} km</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-mountains" style={{ fontSize: '11px', color: '#0288d1', width: '14px' }} />
                                    <span>{elevation.toFixed(0)} m</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-angle" style={{ fontSize: '11px', color: '#0288d1', width: '14px' }} />
                                    <span>{gradient}%</span>
                                </div>
                            </div>
                        </div>
                    );

                    return (
                        <g key={`flag-${i}`}>
                            {/* Start flag with hover area */}
                            <g transform={`translate(${startX},${startY - 20})`}>
                                <g>
                                    <line
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="20"
                                        stroke={color}
                                        strokeWidth="0.5"
                                        strokeOpacity={0.7}
                                    />
                                    <path
                                        d="M0,0 L8,4 L0,8 Z"
                                        fill={color}
                                        stroke="#1a1a1a"
                                        strokeWidth="0.5"
                                        strokeOpacity={0.7}
                                    />
                                    {/* Invisible hover area */}
                                    <rect
                                        x="-4"
                                        y="0"
                                        width="12"
                                        height="20"
                                        fill="transparent"
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={(e) => setTooltip({ content: tooltipContent, x: e.clientX, y: e.clientY })}
                                        onMouseLeave={() => setTooltip(null)}
                                    />
                                </g>
                            </g>
                            {/* End flag with hover area */}
                            <g transform={`translate(${endX},${endY - 20})`}>
                                <g>
                                    <line
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="20"
                                        stroke={color}
                                        strokeWidth="0.5"
                                        strokeOpacity={0.7}
                                    />
                                    <path
                                        d="M0,0 L-8,4 L0,8 Z"
                                        fill={color}
                                        stroke="#1a1a1a"
                                        strokeWidth="0.5"
                                        strokeOpacity={0.7}
                                    />
                                    {/* Invisible hover area */}
                                    <rect
                                        x="-4"
                                        y="0"
                                        width="12"
                                        height="20"
                                        fill="transparent"
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={(e) => setTooltip({ content: tooltipContent, x: e.clientX, y: e.clientY })}
                                        onMouseLeave={() => setTooltip(null)}
                                    />
                                </g>
                            </g>
                            {/* Find the segments that correspond to this climb */}
                            {segments
                                .filter(segment => segment.type === 'climb' && segment.climbCategory === climb.category)
                                .map((segment, j) => (
                                    <path
                                        key={`climb-hover-${i}-${j}`}
                                        d={createLinePath(segment.points, xScale, yScale)}
                                        fill="none"
                                        stroke="transparent"
                                        strokeWidth={10}
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={(e: React.MouseEvent) => setTooltip({ content: tooltipContent, x: e.clientX, y: e.clientY })}
                                        onMouseLeave={() => setTooltip(null)}
                                    />
                                ))}
                        </g>
                    );
                })}
                
                {/* Render the hover marker - LUTRUWITA MAP TRACER */}
                {currentProfilePoint && (
                    <g>
                        {/* Vertical line from bottom to point */}
                        <line
                            x1={xScale(currentProfilePoint.x)}
                            y1={height}
                            x2={xScale(currentProfilePoint.x)}
                            y2={yScale(currentProfilePoint.y)}
                            stroke="rgba(255, 255, 255, 0.5)"
                            strokeWidth={1}
                            strokeDasharray="3,3"
                        />
                        
                        {/* Map Pin at the current position */}
                        <g transform={`translate(${xScale(currentProfilePoint.x)}, ${yScale(currentProfilePoint.y)})`}>
                            {/* White stroke for the pin */}
                            <path
                                d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
                                transform="translate(-8, -16)"
                                stroke="white"
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                            />
                            {/* Red fill for the pin */}
                            <path
                                d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
                                transform="translate(-8, -16)"
                                fill="#ff0000"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>
                        {/* Elevation and distance text with higher z-index - positioned far to the right */}
                        <g style={{ zIndex: 1000 }}>
                            <foreignObject
                                x={xScale(currentProfilePoint.x) > props.innerWidth * 0.7 ? xScale(currentProfilePoint.x) - 100 : xScale(currentProfilePoint.x) + 80}
                                y={yScale(currentProfilePoint.y)}
                                width="110"
                                height="70"
                                style={{ overflow: 'visible' }}
                            >
                                <div
                                    style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        color: 'white',
                                        padding: '6px 10px',
                                        borderRadius: '4px',
                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                        fontFamily: 'Arial, sans-serif',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        letterSpacing: '0.2px',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                        zIndex: 1000,
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <i className="fa-solid fa-arrow-up-right" style={{ fontSize: '11px', color: '#0288d1', width: '14px' }}></i>
                                        <span>{Math.round(currentProfilePoint.y)}m</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <i className="fa-solid fa-arrow-right" style={{ fontSize: '11px', color: '#0288d1', width: '14px' }}></i>
                                        <span>{currentProfilePoint.x.toFixed(1)}km</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <i className="fa-solid fa-percent" style={{ fontSize: '11px', color: '#0288d1', width: '14px' }}></i>
                                        <span>
                                            {(() => {
                                                // Use the chartData structure which is similar to ElevationProfile.tsx
                                                const profileData = chartData[0].data;
                                                
                                                // Find the closest point in the profile data to the current profile point
                                                let closestIndex = -1;
                                                let minDistance = Infinity;
                                                
                                                for (let i = 0; i < profileData.length; i++) {
                                                    const dist = Math.abs(profileData[i].x - currentProfilePoint.x) + 
                                                                Math.abs(profileData[i].y - currentProfilePoint.y);
                                                    if (dist < minDistance) {
                                                        minDistance = dist;
                                                        closestIndex = i;
                                                    }
                                                }
                                                
                                                // If we found a point and it's not the first point
                                                if (closestIndex > 0) {
                                                    const point = profileData[closestIndex];
                                                    const prevPoint = profileData[closestIndex - 1];
                                                    
                                                    // Calculate elevation change
                                                    const elevChange = point.y - prevPoint.y;
                                                    // Calculate distance change (in meters)
                                                    const distChange = (point.x - prevPoint.x) * 1000;
                                                    
                                                    if (distChange > 0) {
                                                        // Calculate gradient as percentage
                                                        const gradient = (elevChange / distChange) * 100;
                                                        return `${Math.round(gradient)}%`;
                                                    }
                                                }
                                                
                                                return '0.0%';
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </foreignObject>
                        </g>
                    </g>
                )}
                {/* Debug info */}
                <text
                    x={10}
                    y={10}
                    fill="#ffffff"
                    fontSize={10}
                >
                    Hover: {hoverCoordinates ? `${hoverCoordinates[0].toFixed(4)}, ${hoverCoordinates[1].toFixed(4)}` : 'None'}
                </text>
            </g>
        );
    };

    return (
        <div className="elevation-profile">
            <ElevationContent>
                <Box 
                    sx={{ 
                        px: 2, 
                        py: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)' 
                    }}
                >
                    <Typography 
                        variant="subtitle2" 
                        color="white" 
                        sx={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 500, 
                            mr: 3, 
                            fontFamily: 'Lato' 
                        }}
                    >
                        Elevation Profile: {route.name}
                    </Typography>
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            gap: 3, 
                            ml: 'auto' 
                        }}
                    >
                        <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            component="div"
                            sx={{ 
                                fontSize: '0.75rem', 
                                fontFamily: 'Lato',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <i className="fa-solid fa-route" style={{ color: '#0288d1' }} />
                            {(stats.totalDistance / 1000).toFixed(1)} km
                        </Typography>
                        <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            component="div"
                            sx={{ 
                                fontSize: '0.75rem', 
                                fontFamily: 'Lato',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <i className="fa-solid fa-up-right" style={{ color: '#0288d1' }} />
                            {stats.elevationGained.toFixed(0)} m
                        </Typography>
                        <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            component="div"
                            sx={{ 
                                fontSize: '0.75rem', 
                                fontFamily: 'Lato',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <i className="fa-solid fa-down-right" style={{ color: '#0288d1' }} />
                            {stats.elevationLost.toFixed(0)} m
                        </Typography>
                        <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            component="div"
                            sx={{ 
                                fontSize: '0.75rem', 
                                fontFamily: 'Lato',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <i className="fa-solid fa-person-biking-mountain" style={{ color: '#0288d1' }} />
                            {stats.unpavedPercentage.toFixed(0)}%
                        </Typography>
                    </Box>
                </Box>
                <Box 
                    sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end',
                        gap: 3,
                        px: 2,
                        py: 1,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                >
                    <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        component="div"
                        sx={{ 
                            fontSize: '0.75rem', 
                            fontFamily: 'Lato',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            backgroundColor: 'rgba(2, 136, 209, 0.4)'
                        }} />
                        Paved
                    </Typography>
                    <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        component="div"
                        sx={{ 
                            fontSize: '0.75rem', 
                            fontFamily: 'Lato',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            background: 'repeating-linear-gradient(-60deg, rgba(2, 136, 209, 0.4), rgba(2, 136, 209, 0.4) 2px, transparent 2px, transparent 4px)'
                        }} />
                        Unpaved
                    </Typography>
                </Box>
                <div style={{ height: 'calc(100% - 82px)' }}>
                    <ResponsiveLine
                        data={chartData}
                        margin={{ top: 30, right: 15, left: 50, bottom: 55 }}
                        xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                        curve="natural"
                        enableArea={true}
                        areaOpacity={0.2}
                        enablePoints={false}
                        enableSlices="x"
                        enableGridX={true}
                        enableGridY={true}
                        defs={defs}
                        layers={[
                            'grid',
                            'axes',
                            customLayer,
                            'markers',
                            'legends'
                        ]}
                        axisBottom={{
                            tickSize: 5,
                            tickPadding: 5,
                            tickRotation: 0,
                            legend: 'Distance (km)',
                            legendOffset: 36,
                            legendPosition: 'middle'
                        }}
                        axisLeft={{
                            tickSize: 5,
                            tickPadding: 5,
                            tickRotation: 0,
                            legend: 'Elevation (m)',
                            legendOffset: -40,
                            legendPosition: 'middle'
                        }}
                        theme={{
                            axis: {
                                ticks: {
                                    text: {
                                        fill: 'rgba(255, 255, 255, 0.7)',
                                        fontSize: 11,
                                        fontFamily: 'Lato'
                                    }
                                },
                                legend: {
                                    text: {
                                        fill: 'rgba(255, 255, 255, 0.7)',
                                        fontSize: 12,
                                        fontFamily: 'Lato'
                                    }
                                }
                            },
                            grid: {
                                line: {
                                    stroke: 'rgba(255, 255, 255, 0.05)',
                                    strokeWidth: 1
                                }
                            },
                            tooltip: {
                                container: {
                                    background: 'rgba(30, 30, 30, 0.95)',
                                    color: 'white',
                                    fontSize: 12,
                                    borderRadius: 4,
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                                }
                            }
                        }}
                        tooltip={() => {
                            // Simplified tooltip implementation to avoid TypeScript errors
                            return (
                                <div style={{ 
                                    background: 'rgba(30, 30, 30, 0.95)',
                                    padding: '8px 12px',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '4px',
                            fontFamily: 'Lato',
                            color: 'white'
                                }}>
                                    <div>Elevation data</div>
                                </div>
                            );
                        }}
                    />
                </div>
            </ElevationContent>
            {tooltip && <Tooltip {...tooltip} />}
        </div>
    );
};
