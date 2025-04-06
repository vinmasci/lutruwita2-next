import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography } from '@mui/material';
import { ResponsiveLine } from '@nivo/line';
import { ProcessedRoute } from '../../types/gpx.types';
import { ElevationContent } from './ElevationProfile.styles';
import { Alert, AlertTitle, AlertDescription } from "../../../../components/ui/alert";
import { useMapContext } from '../../../map/context/MapContext';
import { detectClimbs } from '../../utils/climbUtils';

// Define the Climb interface based on the return value of detectClimbs
interface Climb {
  startPoint: {
    distance: number;
    elevation: number;
    gradient: number;
  };
  endPoint: {
    distance: number;
    elevation: number;
    gradient: number;
  };
  totalDistance: number;
  elevationGain: number;
  averageGradient: number;
  fietsScore: number;
  category: string;
  color: string;
  number?: number;
}

interface ElevationProfileProps {
  route: ProcessedRoute;
  isLoading?: boolean;
  error?: string;
}

interface Stats {
  elevationGained: number;
  elevationLost: number;
  totalDistance: number;
  unpavedPercentage: number;
}

interface Segment {
  points: Array<{ x: number; y: number; isPaved: boolean }>;
  type: 'normal' | 'climb';
  climbCategory?: string;
  color?: string;
  isPaved: boolean;
}

interface Point {
  x: number;
  y: number;
  isPaved: boolean;
}

function createLinePath(points: Point[], xScale: any, yScale: any): string {
  let linePath = `M ${xScale(points[0].x)},${yScale(points[0].y)}`;
  const tension = 0.3;

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

function createAreaPath(points: Point[], xScale: any, yScale: any, height: number): string {
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

function createSegments(points: Point[], climbs: Climb[]): Segment[] {
  const segments: Segment[] = [];
  let currentPoints: Point[] = [];
  let currentIndex = 0;

  const createSegment = (points: Point[], climb: Climb | null, isPaved: boolean): Segment => ({
    points,
    type: climb ? 'climb' : 'normal' as const,
    climbCategory: climb?.category,
    color: climb?.color,
    isPaved
  });

  const findClimbAtPoint = (point: Point): Climb | null => {
    const pointDistance = point.x * 1000;
    const climb = climbs.find(climb => 
      pointDistance >= climb.startPoint.distance && 
      pointDistance <= climb.endPoint.distance
    );
    return climb || null;
  };

  while (currentIndex < points.length) {
    const point = points[currentIndex];
    const activeClimb = findClimbAtPoint(point);

    if (currentPoints.length === 0) {
      currentPoints.push(point);
      currentIndex++;
      continue;
    }

    const prevPoint = currentPoints[currentPoints.length - 1];
    const prevClimb = findClimbAtPoint(prevPoint);

    const climbChanged = !!activeClimb !== !!prevClimb || 
      (activeClimb && prevClimb && activeClimb.category !== prevClimb.category);
    const surfaceChanged = point.isPaved !== prevPoint.isPaved;

    if (climbChanged || surfaceChanged) {
      currentPoints.push(point);
      segments.push(createSegment([...currentPoints], prevClimb, prevPoint.isPaved));
      currentPoints = [point];
    } else {
      currentPoints.push(point);
    }

    currentIndex++;
  }

  if (currentPoints.length > 0) {
    const finalClimb = findClimbAtPoint(currentPoints[0]);
    segments.push(createSegment(currentPoints, finalClimb, currentPoints[0].isPaved));
  }

  return segments;
}

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

// Calculate distance between two points using Haversine formula
const calculateDistance = (point1: number[], point2: number[]): number => {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  
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

// Helper function to calculate gradient
const calculateGradient = (currentPoint: { x: number, y: number } | null, profileData: Point[]): string => {
  if (!currentPoint) return '0.0%';
  
  const currentPointIndex = profileData.findIndex(p => 
    p.x === currentPoint.x && p.y === currentPoint.y);
  
  if (currentPointIndex > 0) {
    const prevPoint = profileData[currentPointIndex - 1];
    const elevationChange = currentPoint.y - prevPoint.y;
    const distanceChange = (currentPoint.x - prevPoint.x) * 1000; // convert to meters
    const gradientValue = (elevationChange / distanceChange) * 100;
    return `${Math.round(gradientValue)}%`;
  }
  return '0.0%';
};

export const ElevationProfile: React.FC<ElevationProfileProps> = ({ route, isLoading, error }) => {
  const { setHoverCoordinates, hoverCoordinates, map } = useMapContext();
  const [tooltip, setTooltip] = useState<{ content: React.ReactNode; x: number; y: number } | null>(null);
  const [data, setData] = useState<Array<{ id: string; data: Point[] }>>([]);
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [currentProfilePoint, setCurrentProfilePoint] = useState<{ x: number, y: number } | null>(null);
  const [stats, setStats] = useState<Stats>({ 
    elevationGained: route.statistics?.elevationGain || 0, 
    elevationLost: route.statistics?.elevationLoss || 0, 
    totalDistance: route.statistics?.totalDistance || 0,
    unpavedPercentage: route.surface?.surfaceTypes?.find(t => t.type === 'trail')?.percentage || 0
  });

  // Find the closest point on the route to the hover coordinates
  useEffect(() => {
    if (!hoverCoordinates || !route?.geojson?.features?.[0]?.geometry) {
      setCurrentProfilePoint(null);
      return;
    }

    try {
      const feature = route.geojson.features[0];
      if (feature.geometry.type !== 'LineString') {
        setCurrentProfilePoint(null);
        return;
      }
      
      const coordinates = feature.geometry.coordinates;
      
      // Find the closest point on the route to the hover coordinates
      let closestPoint: number[] | null = null;
      let minDistance = Infinity;
      let closestIndex = -1;
      
      coordinates.forEach((coord, index) => {
        const dx = coord[0] - hoverCoordinates[0];
        const dy = coord[1] - hoverCoordinates[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = coord;
          closestIndex = index;
        }
      });
      
      if (closestIndex >= 0 && data.length > 0 && data[0].data.length > 0) {
        // Calculate cumulative distances using Haversine formula
        const cumulativeDistances = [0]; // First point is at distance 0
        let totalDistanceCalculated = 0;
        
        for (let i = 1; i < coordinates.length; i++) {
          const distance = calculateDistance(coordinates[i-1], coordinates[i]);
          totalDistanceCalculated += distance;
          cumulativeDistances.push(totalDistanceCalculated);
        }
        
        // Get the actual distance at the closest index using Haversine
        const distanceAlongRoute = cumulativeDistances[closestIndex] / 1000; // in km
        
        // Find the closest point in the elevation profile data
        const profileData = data[0].data;
        let closestProfilePoint = profileData[0];
        let minProfileDistance = Math.abs(profileData[0].x - distanceAlongRoute);
        
        for (let i = 1; i < profileData.length; i++) {
          const distance = Math.abs(profileData[i].x - distanceAlongRoute);
          if (distance < minProfileDistance) {
            minProfileDistance = distance;
            closestProfilePoint = profileData[i];
          }
        }
        
        setCurrentProfilePoint(closestProfilePoint);
      } else {
        setCurrentProfilePoint(null);
      }
    } catch (error) {
      console.error('Error finding closest point:', error);
      setCurrentProfilePoint(null);
    }
  }, [hoverCoordinates, route?.geojson, data, stats.totalDistance]);

  useEffect(() => {
    if (!route?.geojson?.features?.[0]?.properties?.coordinateProperties?.elevation) {
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

      // Calculate distance between two points using Haversine formula
      const calculateDistance = (point1: number[], point2: number[]): number => {
        const [lon1, lat1] = point1;
        const [lon2, lat2] = point2;
        
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

      // Calculate cumulative distances for each point
      const coordinates = feature.geometry.coordinates;
      const cumulativeDistances = [0]; // First point is at distance 0
      let totalDistanceCalculated = 0;
      
      for (let i = 1; i < coordinates.length; i++) {
        const distance = calculateDistance(coordinates[i-1], coordinates[i]);
        totalDistanceCalculated += distance;
        cumulativeDistances.push(totalDistanceCalculated);
      }

      // Create elevation data with accurate distances
      const elevationData = elevations.map((elev: number, index: number) => {
        // Use the actual cumulative distance for this point
        const distance = cumulativeDistances[index];
        let isPaved = true;

        if (route.unpavedSections) {
          for (const section of route.unpavedSections) {
            // Use actual distances for unpaved sections too
            const sectionStartDist = cumulativeDistances[section.startIndex];
            const sectionEndDist = cumulativeDistances[section.endIndex];
            if (distance >= sectionStartDist && distance <= sectionEndDist) {
              isPaved = false;
              break;
            }
          }
        }

        return {
          x: distance / 1000, // Convert to km
          y: elev,
          isPaved
        };
      });

      let unpavedDistance = 0;
      if (route.unpavedSections) {
        for (const section of route.unpavedSections) {
          const sectionStartDist = (section.startIndex / (elevations.length - 1)) * totalDistance;
          const sectionEndDist = (section.endIndex / (elevations.length - 1)) * totalDistance;
          unpavedDistance += sectionEndDist - sectionStartDist;
        }
      }
      const unpavedPercentage = route.surface?.surfaceTypes?.find(t => t.type === 'trail')?.percentage || 
                               (unpavedDistance / totalDistance) * 100;

      // Use the elevation gain/loss values from route.statistics
      // These are now calculated with smoothing during initial GPX processing
      setStats({
        elevationGained: route.statistics?.elevationGain || 0,
        elevationLost: route.statistics?.elevationLoss || 0,
        totalDistance,
        unpavedPercentage
      });

      setData([{
        id: 'elevation',
        data: elevationData
      }]);

      const detectedClimbs = detectClimbs(elevationData.map(point => ({
        distance: point.x * 1000,
        elevation: point.y
      })));
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

  const defs = [
    {
      id: 'unpavedPattern',
      type: 'patternLines',
      background: 'rgba(2, 136, 209, 0.2)',
      color: 'rgba(2, 136, 209, 0.5)',
      rotation: -65,
      lineWidth: 3,
      spacing: 6
    }
  ];

  const sortedClimbs = [...climbs].sort((a, b) => a.startPoint.distance - b.startPoint.distance);
  const categoryCount: { [key: string]: number } = {};
  sortedClimbs.forEach(climb => {
    categoryCount[climb.category] = (categoryCount[climb.category] || 0) + 1;
    climb.number = categoryCount[climb.category];
    
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

  const climbsByCategory: { [key: string]: Climb[] } = {};
  sortedClimbs.forEach(climb => {
    if (!climbsByCategory[climb.category]) {
      climbsByCategory[climb.category] = [];
    }
    climbsByCategory[climb.category].push(climb);
  });

  const customLayer = (props: any) => {
    const { data, xScale, yScale } = props;
    const points = data[0].data as Point[];
    const height = props.innerHeight;
    const segments = createSegments(points, climbs);

    return (
      <g>
        {segments.map((segment, i) => {
          const linePath = createLinePath(segment.points, xScale, yScale);
          const areaPath = createAreaPath(segment.points, xScale, yScale, height);

          const baseColor = segment.type === 'climb' && segment.color 
            ? segment.color.replace('99', '66')
            : "rgba(2, 136, 209, 0.4)";

          const patternId = segment.type === 'climb' && segment.climbCategory
            ? `unpavedPattern-${segment.climbCategory}-${
                climbsByCategory[segment.climbCategory].find(c => 
                  c.startPoint.distance <= segment.points[0].x * 1000 && 
                  c.endPoint.distance >= segment.points[0].x * 1000
                )?.number || 1
              }`
            : 'unpavedPattern';

          const lineColor = segment.type === 'climb' && segment.color 
            ? segment.color.replace('99', 'ff')
            : 'rgba(2, 136, 209, 0.9)';

          return (
            <g key={i}>
              <path
                d={areaPath}
                fill={baseColor}
              />
              {!segment.isPaved && (
                <path
                  d={areaPath}
                  fill={`url(#${patternId})`}
                  fillOpacity={0.6}
                />
              )}
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
        {sortedClimbs.map((climb, i) => {
          const startX = xScale(climb.startPoint.distance / 1000);
          const startY = yScale(climb.startPoint.elevation);
          const endX = xScale(climb.endPoint.distance / 1000);
          const endY = yScale(climb.endPoint.elevation);
          const color = climb.color.replace('99', 'ff');
          
          const distance = (climb.endPoint.distance - climb.startPoint.distance) / 1000;
          const elevation = climb.endPoint.elevation - climb.startPoint.elevation;
          const gradient = ((elevation / (distance * 1000)) * 100).toFixed(1);

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
              sx={{ 
                fontSize: '0.75rem', 
                fontFamily: 'Futura',
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
              background: 'repeating-linear-gradient(-60deg, rgba(2, 136, 209, 0.4), rgba(2, 136, 209, 0.4) 3px, transparent 3px, transparent 6px)'
            }} />
            Unpaved
          </Typography>
        </Box>
        <div style={{ height: 'calc(100% - 82px)' }}>
          <ResponsiveLine
            data={data}
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
              (props: { xScale: any; yScale: any; innerHeight: number }) => {
                const { xScale, yScale, innerHeight } = props;
                // Render the current position marker
                if (currentProfilePoint && xScale && yScale) {
                  const x = xScale(currentProfilePoint.x);
                  const y = yScale(currentProfilePoint.y);
                  
                  return (
                    <g>
                      {/* Vertical line from bottom to point */}
                      <line
                        x1={x}
                        y1={innerHeight}
                        x2={x}
                        y2={y}
                        stroke="rgba(255, 255, 255, 0.5)"
                        strokeWidth={1}
                        strokeDasharray="3,3"
                      />
                      
                      {/* Map Pin at the current position - LUTRUWITA MAP TRACER */}
                      <g transform={`translate(${x}, ${y})`}>
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
                          x={x > 630 ? x - 100 : x + 80} // 900px * 0.7 = 630px (assuming 900px width)
                          y={y}
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
                              <span>{currentProfilePoint.y.toFixed(0)}m</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fa-solid fa-arrow-right" style={{ fontSize: '11px', color: '#0288d1', width: '14px' }}></i>
                              <span>{currentProfilePoint.x.toFixed(1)}km</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fa-solid fa-percent" style={{ fontSize: '11px', color: '#0288d1', width: '14px' }}></i>
                              <span>
                                {/* Calculate gradient */}
                                {calculateGradient(currentProfilePoint, data[0].data)}
                              </span>
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    </g>
                  );
                }
                return null;
              },
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
                    fontFamily: 'Futura'
                  }
                },
                legend: {
                  text: {
                    fill: 'rgba(255, 255, 255, 0.7)',
                    fontSize: 12,
                    fontFamily: 'Futura'
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
            onClick={(point, event) => {/* No action needed */}}
            onMouseEnter={(point, event) => {/* No action needed */}}
            onMouseMove={(point, event) => {
              if (point?.data) {
                const pointData = point.data as { x: number; y: number };
                const feature = route.geojson.features[0];
                if (feature.geometry.type === 'LineString') {
                  const coordinates = feature.geometry.coordinates;
                  
                  // Find the closest point in the data based on actual distance
                  const targetDistance = pointData.x * 1000; // Convert km to meters
                  
                  // Calculate cumulative distances for each point
                  const cumulativeDistances = [0]; // First point is at distance 0
                  let totalDistanceCalculated = 0;
                  
                  for (let i = 1; i < coordinates.length; i++) {
                    const distance = calculateDistance(coordinates[i-1], coordinates[i]);
                    totalDistanceCalculated += distance;
                    cumulativeDistances.push(totalDistanceCalculated);
                  }
                  
                  // Find the closest point to our target distance
                  let closestIndex = 0;
                  let minDistanceDiff = Math.abs(cumulativeDistances[0] - targetDistance);
                  
                  for (let i = 1; i < cumulativeDistances.length; i++) {
                    const distanceDiff = Math.abs(cumulativeDistances[i] - targetDistance);
                    if (distanceDiff < minDistanceDiff) {
                      minDistanceDiff = distanceDiff;
                      closestIndex = i;
                    }
                  }
                  
                  if (coordinates[closestIndex]) {
                    // Set hover coordinates for the map marker
                    setHoverCoordinates([coordinates[closestIndex][0], coordinates[closestIndex][1]]);
                  }
                }
              }
            }}
            onMouseLeave={() => {
              setHoverCoordinates(null);
            }}
            tooltip={({ point }) => {
              const pointData = point.data as { x: number; y: number };
              const currentIndex = data[0].data.findIndex((d: Point) => d.x === pointData.x);
              if (currentIndex > 0) {
                const currentPoint = data[0].data[currentIndex] as Point;
                const prevPoint = data[0].data[currentIndex - 1] as Point;
                const elevationChange = currentPoint.y - prevPoint.y;
                const distanceChange = currentPoint.x - prevPoint.x;
                const gradient = ((elevationChange / (distanceChange * 1000)) * 100);

                return (
                  <div style={{ 
                    background: 'rgba(30, 30, 30, 0.95)',
                    padding: '8px 12px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px'
                  }}>
                    <div style={{ 
                      fontFamily: 'Lato',
                      color: 'white',
                      display: 'flex',
                      gap: '4px'
                    }}>
                      <span>el:</span>
                      <span>{pointData.y.toFixed(1)} m</span>
                    </div>
                    <div style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.75rem',
                      marginTop: '4px',
                      fontFamily: 'Futura',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {gradient > 0 ? '↗' : '↘'} {Math.abs(gradient).toFixed(1)}%
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
        </div>
      </ElevationContent>
      {tooltip && <Tooltip {...tooltip} />}
    </div>
  );
};
