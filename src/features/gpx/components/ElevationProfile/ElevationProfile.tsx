import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography } from '@mui/material';
import { ResponsiveLine } from '@nivo/line';
import { ProcessedRoute } from '../../types/gpx.types';
import { ElevationContent } from './ElevationProfile.styles';
import { Alert, AlertTitle, AlertDescription } from "../../../../components/ui/alert";
import { useMapContext } from '../../../map/context/MapContext';
import { detectClimbs } from '../../utils/climbUtils';
import type { Climb } from '../../utils/climbUtils';

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

export const ElevationProfile: React.FC<ElevationProfileProps> = ({ route, isLoading, error }) => {
  const { setHoverCoordinates, hoverCoordinates, map } = useMapContext();
  const [tooltip, setTooltip] = useState<{ content: React.ReactNode; x: number; y: number } | null>(null);
  const [data, setData] = useState<Array<{ id: string; data: Point[] }>>([]);
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [currentProfilePoint, setCurrentProfilePoint] = useState<{ x: number, y: number } | null>(null);
  const [stats, setStats] = useState<Stats>({ 
    elevationGained: 0, 
    elevationLost: 0, 
    totalDistance: 0,
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
      let closestPoint = null;
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
        // Convert the index to a distance along the route
        const totalPoints = coordinates.length;
        const distanceRatio = closestIndex / (totalPoints - 1);
        const totalDistance = stats.totalDistance;
        const distanceAlongRoute = distanceRatio * totalDistance / 1000; // in km
        
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

      const elevationData = elevations.map((elev: number, index: number) => {
        const distance = (index / (elevations.length - 1)) * totalDistance;
        let isPaved = true;

        if (route.unpavedSections) {
          for (const section of route.unpavedSections) {
            const sectionStartDist = (section.startIndex / (elevations.length - 1)) * totalDistance;
            const sectionEndDist = (section.endIndex / (elevations.length - 1)) * totalDistance;
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

      let elevationGained = 0;
      let elevationLost = 0;
      for (let i = 1; i < elevationData.length; i++) {
        const elevDiff = elevationData[i].y - elevationData[i - 1].y;
        if (elevDiff > 0) {
          elevationGained += elevDiff;
        } else {
          elevationLost += Math.abs(elevDiff);
        }
      }

      setStats({
        elevationGained,
        elevationLost,
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
      color: 'rgba(2, 136, 209, 0.3)',
      rotation: -65,
      lineWidth: 1,
      spacing: 2
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
      lineWidth: 1,
      spacing: 2
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
              fontFamily: 'Futura',
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
              fontFamily: 'Futura' 
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
                fontFamily: 'Futura',
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
                fontFamily: 'Futura',
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
                fontFamily: 'Futura',
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
              fontFamily: 'Futura',
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
              fontFamily: 'Futura',
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
              ({ xScale, yScale, innerHeight }) => {
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
                      
                      {/* Circle at the current position - LUTRUWITA MAP TRACER */}
                      <circle
                        cx={x}
                        cy={y}
                        r={4}
                        fill="#ff0000"
                        stroke="white"
                        strokeWidth={1.5}
                      />
                      <text
                        x={x}
                        y={y - 12}
                        textAnchor="middle"
                        fill="white"
                        strokeWidth={1.5}
                        fontSize="10px"
                        fontWeight="bold"
                        paintOrder="stroke"
                      >
                        {currentProfilePoint.y.toFixed(0)}m
                      </text>
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
            onClick={() => {}}
            onMouseEnter={() => {}}
            onMouseMove={(point, event) => {
              if (point?.data) {
                const pointData = point.data as { x: number; y: number };
                const feature = route.geojson.features[0];
                if (feature.geometry.type === 'LineString') {
                  const coordinates = feature.geometry.coordinates;
                  const index = Math.floor((pointData.x * 1000 / stats.totalDistance) * (coordinates.length - 1));
                  if (coordinates[index]) {
                    // Set hover coordinates for the map marker
                    setHoverCoordinates([coordinates[index][0], coordinates[index][1]]);
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
                      fontFamily: 'Futura',
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
