import React, { useMemo, useCallback } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Defs, LinearGradient, Stop, Rect, Circle, Pattern } from 'react-native-svg';
import { RouteData, UnpavedSection } from '../../../services/routeService';
import { useStyles } from './styles';
import { formatElevationMetric } from '../../../utils/unitUtils';
import { 
  extractElevationPoints, 
  detectClimbs, 
  assignClimbCategories,
  calculateSegmentGradients,
  groupByGradientCategory,
  CATEGORY_CONFIG,
  GRADIENT_COLOR_CONFIG
} from '../../../utils/climbUtils';

interface ElevationChartProps {
  route: RouteData;
  height: number;
  width?: number | string;
  tracerPosition?: number | null;
}

// Function to mix two colors with a given ratio
const mixColors = (color1: string, color2: string, ratio: number): string => {
  // Parse the hex colors to RGB
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);
  
  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);
  
  // Mix the colors
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  
  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Function to get color based on gradient percentage with more aggressive thresholds
const getColorForGradient = (gradient: number): string => {
  if (gradient >= 10) {
    return "#660000"; // Very dark maroon for >10%
  } else if (gradient >= 8) {
    return GRADIENT_COLOR_CONFIG.STEEP.color; // Maroon for 8-10%
  } else if (gradient >= 5) {
    return GRADIENT_COLOR_CONFIG.HARD.color; // Red for 5-8%
  } else if (gradient >= 3) {
    return GRADIENT_COLOR_CONFIG.MODERATE.color; // Orange for 3-5%
  } else if (gradient >= 1) {
    return GRADIENT_COLOR_CONFIG.EASY.color; // Yellow for 1-3%
  } else {
    return GRADIENT_COLOR_CONFIG.FLAT.color; // Green for <1% (including downhill)
  }
};

// Function to calculate average gradient for a segment
const calculateAverageGradient = (points: any[]): number => {
  if (points.length < 2) return 0;
  
  const startElevation = points[0].elevation;
  const endElevation = points[points.length - 1].elevation;
  const startDistance = points[0].distance;
  const endDistance = points[points.length - 1].distance;
  
  const elevationChange = endElevation - startElevation;
  const distance = endDistance - startDistance;
  
  return distance > 0 ? (elevationChange / distance) * 100 : 0;
};

const ElevationChart: React.FC<ElevationChartProps> = ({ 
  route, 
  height, 
  width = Dimensions.get('window').width,
  tracerPosition = null
}) => {
  const styles = useStyles();
  
  // Colors for the chart
  const textColor = '#666666';
  const gridColor = 'rgba(0, 0, 0, 0.1)';
  const elevationLineColor = '#000000';
  
  // Check if this is a master route
  const isMasterRoute = route.routeId === 'master-route';
  
  // Extract elevation data from route and calculate gradients - using useMemo to optimize performance
  const elevationData = useMemo(() => {
    try {
      // Extract elevation points from the route
      const elevationPoints = extractElevationPoints(route);
      
      if (elevationPoints.length === 0) {
        // Create synthetic data if no elevation data available
        const pointCount = 100;
        const { maxElevation = 1000, minElevation = 0 } = route.statistics || {};
        
        // Create a synthetic profile
        const syntheticData = Array.from({ length: pointCount }, (_, index) => {
          // Create a more natural-looking elevation profile
          const progress = index / (pointCount - 1);
          
          // Use multiple sine waves to create a more natural terrain look
          const y = minElevation + 
                (maxElevation - minElevation) * 0.5 * (1 + Math.sin(progress * Math.PI)) +
                (maxElevation - minElevation) * 0.2 * Math.sin(progress * Math.PI * 3) +
                (maxElevation - minElevation) * 0.1 * Math.sin(progress * Math.PI * 7);
          
          // Calculate synthetic gradient
          const nextProgress = Math.min(1, progress + 0.01);
          const nextY = minElevation + 
                (maxElevation - minElevation) * 0.5 * (1 + Math.sin(nextProgress * Math.PI)) +
                (maxElevation - minElevation) * 0.2 * Math.sin(nextProgress * Math.PI * 3) +
                (maxElevation - minElevation) * 0.1 * Math.sin(nextProgress * Math.PI * 7);
          
          const distance = progress * (route.statistics?.totalDistance || 5000);
          const nextDistance = nextProgress * (route.statistics?.totalDistance || 5000);
          const gradient = (nextY - y) / (nextDistance - distance) * 100;
          
          return {
            x: index,
            y,
            elevation: y,
            distance,
            gradient,
            isPaved: true
          };
        });
        
        return syntheticData;
      }
      
      // Create data points with x, y coordinates
      const dataPoints = elevationPoints.map((point, index) => ({
        x: index,
        y: point.elevation,
        elevation: point.elevation,
        distance: point.distance,
        isPaved: !isCoordinateInUnpavedSection(
          Math.floor((index / elevationPoints.length) * (route.geojson?.features[0]?.geometry?.coordinates?.length || 0)), 
          route.unpavedSections
        )
      }));
      
      return dataPoints;
    } catch (error) {
      console.error('Error processing elevation data:', error);
      return [];
    }
  }, [route]);
  
  // Divide the route into 1km segments and calculate average gradient for each segment
  // Skip gradient calculations for master routes to improve performance
  const segmentData = useMemo(() => {
    if (elevationData.length === 0) return [];
    
    // For master routes, return an empty array to skip gradient calculations
    if (isMasterRoute) return [];
    
    const segments = [];
    const segmentLength = 1000; // 1km segments
    
    // Get total route distance
    const totalDistance = elevationData[elevationData.length - 1].distance;
    
    // Calculate number of segments
    const numSegments = Math.ceil(totalDistance / segmentLength);
    
    for (let i = 0; i < numSegments; i++) {
      const startDistance = i * segmentLength;
      const endDistance = Math.min((i + 1) * segmentLength, totalDistance);
      
      // Find points in this segment
      const segmentPoints = elevationData.filter(
        point => point.distance >= startDistance && point.distance <= endDistance
      );
      
      if (segmentPoints.length >= 2) {
        const avgGradient = calculateAverageGradient(segmentPoints);
        const color = getColorForGradient(avgGradient);
        
        segments.push({
          startDistance,
          endDistance,
          avgGradient,
          color,
          startIndex: elevationData.findIndex(p => p.distance >= startDistance),
          endIndex: elevationData.findIndex(p => p.distance >= endDistance) || elevationData.length - 1
        });
      }
    }
    
    return segments;
  }, [elevationData, isMasterRoute]);
  
  // Check if a coordinate index is in an unpaved section
  function isCoordinateInUnpavedSection(index: number, unpavedSections?: UnpavedSection[]) {
    if (!unpavedSections || unpavedSections.length === 0) {
      return false;
    }
    
    return unpavedSections.some(section => 
      index >= section.startIndex && index <= section.endIndex
    );
  }
  
  // Calculate chart dimensions and scales - using useMemo to optimize performance
  const chartDimensions = useMemo(() => {
    const chartWidth = typeof width === 'number' ? width : parseInt(width as string, 10) || Dimensions.get('window').width;
    const chartHeight = height - 30; // Further reduced space for labels to give more room for the chart
    const paddingBottom = 20; // Bottom padding for distance labels
    const paddingTop = 10; // Reduced padding to prevent top cutoff
    const paddingLeft = 40;
    const paddingRight = 45; // Increased from 25 to 40 to provide even more space for the last distance marker
    
    // Use statistics if available, otherwise calculate from data
    let minElevation, maxElevation;
    if (route.statistics && route.statistics.minElevation !== undefined && route.statistics.maxElevation !== undefined) {
      minElevation = route.statistics.minElevation;
      maxElevation = route.statistics.maxElevation;
    } else {
      minElevation = Math.min(...elevationData.map((d: { y: number }) => d.y));
      maxElevation = Math.max(...elevationData.map((d: { y: number }) => d.y));
    }
    
    // Round min/max to nice values
    minElevation = Math.floor(minElevation / 100) * 100;
    maxElevation = Math.ceil(maxElevation / 100) * 100;
    
    // Ensure we have a reasonable range (avoid division by zero)
    const elevationRange = Math.max(maxElevation - minElevation, 100);
    
    return {
      chartWidth,
      chartHeight,
      paddingBottom,
      paddingLeft,
      paddingRight,
      minElevation,
      maxElevation,
      elevationRange
    };
  }, [width, height, route.statistics, elevationData]);
  
  const { chartWidth, chartHeight, paddingBottom, paddingLeft, paddingRight, 
          minElevation, maxElevation, elevationRange } = chartDimensions;
  
  // Create the elevation profile outline path
  const outlinePath = useMemo(() => {
    try {
      if (elevationData.length === 0) return '';
      
      const points: string[] = [];
      
      for (let i = 0; i < elevationData.length; i++) {
        const d = elevationData[i];
        const x = paddingLeft + (i / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
        const y = chartHeight - paddingBottom - ((d.y - minElevation) / elevationRange) * (chartHeight - paddingBottom);
        
        // Validate coordinates to ensure they're valid numbers
        if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
          console.warn(`Invalid coordinate at index ${i}: x=${x}, y=${y}`);
          continue; // Skip this point
        }
        
        points.push(`${points.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
      }
      
      return points.join(' ');
    } catch (error) {
      console.error('Error generating outline path:', error);
      return '';
    }
  }, [elevationData, chartWidth, chartHeight, paddingBottom, paddingLeft, paddingRight, minElevation, elevationRange]);
  
  // Create area paths for each segment
  const segmentAreaPaths = useMemo(() => {
    try {
      if (elevationData.length === 0) return [];
      
      // For master routes, create a single area path with a neutral color
      if (isMasterRoute) {
        const points: string[] = [];
        const baselineY = chartHeight - paddingBottom;
        
        // Start at the baseline
        points.push(`M${paddingLeft.toFixed(1)},${baselineY.toFixed(1)}`);
        
        // Add all points
        for (let i = 0; i < elevationData.length; i++) {
          const d = elevationData[i];
          const x = paddingLeft + (i / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
          const y = chartHeight - paddingBottom - ((d.y - minElevation) / elevationRange) * (chartHeight - paddingBottom);
          
          // Validate coordinates
          if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
            console.warn(`Invalid coordinate at index ${i}: x=${x}, y=${y}`);
            continue;
          }
          
          points.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
        }
        
        // Return to the baseline
        points.push(`L${(chartWidth - paddingRight).toFixed(1)},${baselineY.toFixed(1)}`);
        
        // Close the path
        points.push('Z');
        
        return [{
          path: points.join(' '),
          color: '#d9d9d9', // Light gray for master route
          avgGradient: 0,
          startDistance: 0,
          endDistance: elevationData[elevationData.length - 1].distance
        }];
      }
      
      // For regular routes, create segment paths with gradient colors
      if (segmentData.length === 0) return [];
      
      return segmentData.map(segment => {
        const points: string[] = [];
        const baselineY = chartHeight - paddingBottom;
        
        // Start at the baseline
        const startX = paddingLeft + (segment.startIndex / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
        points.push(`M${startX.toFixed(1)},${baselineY.toFixed(1)}`);
        
        // Add all points in this segment
        for (let i = segment.startIndex; i <= segment.endIndex; i++) {
          const d = elevationData[i];
          const x = paddingLeft + (i / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
          const y = chartHeight - paddingBottom - ((d.y - minElevation) / elevationRange) * (chartHeight - paddingBottom);
          
          // Validate coordinates
          if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
            console.warn(`Invalid coordinate at index ${i}: x=${x}, y=${y}`);
            continue;
          }
          
          points.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
        }
        
        // Return to the baseline
        const endX = paddingLeft + (segment.endIndex / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
        points.push(`L${endX.toFixed(1)},${baselineY.toFixed(1)}`);
        
        // Close the path
        points.push('Z');
        
        return {
          path: points.join(' '),
          color: segment.color,
          avgGradient: segment.avgGradient,
          startDistance: segment.startDistance,
          endDistance: segment.endDistance
        };
      });
    } catch (error) {
      console.error('Error generating segment area paths:', error);
      return [];
    }
  }, [elevationData, segmentData, chartWidth, chartHeight, paddingBottom, paddingLeft, paddingRight, minElevation, elevationRange, isMasterRoute]);
  
  // Generate gradient definitions for smooth transitions between segments
  const gradientDefs = useMemo(() => {
    // Skip gradient definitions for master routes
    if (isMasterRoute || segmentAreaPaths.length < 2) return [];
    
    return segmentAreaPaths.map((segment, index) => {
      // For the first segment, transition from its color to the next segment's color
      if (index === 0) {
        const nextSegment = segmentAreaPaths[1];
        return {
          id: `gradient-${index}`,
          x1: "0", y1: "0", x2: "1", y2: "0",
          stops: [
            { offset: "0", color: segment.color },
            { offset: "1", color: nextSegment.color }
          ]
        };
      }
      // For the last segment, transition from the previous segment's color to its color
      else if (index === segmentAreaPaths.length - 1) {
        const prevSegment = segmentAreaPaths[index - 1];
        return {
          id: `gradient-${index}`,
          x1: "0", y1: "0", x2: "1", y2: "0",
          stops: [
            { offset: "0", color: prevSegment.color },
            { offset: "1", color: segment.color }
          ]
        };
      }
      // For middle segments, create a smoother transition with more stops
      else {
        const prevSegment = segmentAreaPaths[index - 1];
        const nextSegment = segmentAreaPaths[index + 1];
        return {
          id: `gradient-${index}`,
          x1: "0", y1: "0", x2: "1", y2: "0",
          stops: [
            { offset: "0", color: prevSegment.color },
            { offset: "0.2", color: mixColors(prevSegment.color, segment.color, 0.6) },
            { offset: "0.4", color: mixColors(prevSegment.color, segment.color, 0.2) },
            { offset: "0.6", color: mixColors(segment.color, nextSegment.color, 0.2) },
            { offset: "0.8", color: mixColors(segment.color, nextSegment.color, 0.6) },
            { offset: "1", color: nextSegment.color }
          ]
        };
      }
    });
  }, [segmentAreaPaths, isMasterRoute]);
  
  // Calculate distance markers
  const distanceMarkers = useMemo(() => {
    if (!route.statistics || !route.statistics.totalDistance) return [];
    
    const totalDistanceKm = route.statistics.totalDistance / 1000;
    const markers = [];
    
    // Create evenly spaced markers
    const numMarkers = 5;
    for (let i = 0; i < numMarkers; i++) {
      const percent = i / (numMarkers - 1);
      const distance = totalDistanceKm * percent;
      const x = paddingLeft + percent * (chartWidth - paddingLeft - paddingRight);
      
      markers.push({
        x,
        distance: distance.toFixed(0)
      });
    }
    
    return markers;
  }, [route.statistics, chartWidth, paddingLeft, paddingRight]);
  
  // Calculate elevation markers
  const elevationMarkers = useMemo(() => {
    const markers = [];
    const numMarkers = 3;
    
    // Use a smaller number of markers and ensure they're properly spaced
    for (let i = 0; i < numMarkers; i++) {
      const percent = i / (numMarkers - 1);
      const elevation = minElevation + elevationRange * percent;
      
      // Calculate y position with a small buffer from the top for the highest marker
      const availableHeight = chartHeight - paddingBottom;
      const buffer = 15; // Buffer from the top for the highest marker
      const y = chartHeight - paddingBottom - percent * (availableHeight - buffer);
      
      markers.push({
        y,
        elevation: Math.round(elevation)
      });
    }
    
    return markers;
  }, [chartHeight, paddingBottom, minElevation, elevationRange]);
  
  // Get Y position for tracer - using useCallback to optimize performance
  const getYForTracerPosition = useCallback((position: number): number => {
    if (!elevationData.length) return 0;
    
    // Convert position to data index
    const dataWidth = chartWidth - paddingLeft - paddingRight;
    const positionRatio = (position - paddingLeft) / dataWidth;
    const dataIndex = Math.round(positionRatio * (elevationData.length - 1));
    
    // Ensure index is within bounds
    const safeIndex = Math.max(0, Math.min(dataIndex, elevationData.length - 1));
    
    // Get elevation at this index
    const elevation = elevationData[safeIndex].y;
    
    // Convert to Y coordinate
    return chartHeight - paddingBottom - ((elevation - minElevation) / elevationRange) * (chartHeight - paddingBottom);
  }, [elevationData, chartWidth, chartHeight, paddingBottom, paddingLeft, paddingRight, minElevation, elevationRange]);
  
  // If no elevation data, show a message
  if (elevationData.length === 0) {
    return (
      <View style={[styles.chartContainer, { height }]}>
        <Text style={styles.noDataText}>No elevation data available</Text>
      </View>
    );
  }

  // Wrap the rendering in a try-catch block
  try {
    return (
      <View style={[styles.chartContainer, { flex: 1 }]}>
        <Svg 
          width="100%" 
          height="100%" 
          style={styles.elevationChart}
        >
          <Defs>
            {/* Create gradient definitions for smooth transitions between segments */}
          {gradientDefs.map(gradient => (
            <LinearGradient 
              key={gradient.id} 
              id={gradient.id} 
              x1={gradient.x1} 
              y1={gradient.y1} 
              x2={gradient.x2} 
              y2={gradient.y2}
            >
              {gradient.stops.map((stop, stopIndex) => (
                <Stop 
                  key={`${gradient.id}-stop-${stopIndex}`} 
                  offset={stop.offset} 
                  stopColor={stop.color} 
                  stopOpacity="0.7" 
                />
              ))}
            </LinearGradient>
          ))}
          
          {/* Pattern for unpaved sections - gravel-like stipple pattern */}
          <Pattern
            id="unpavedPattern"
            patternUnits="userSpaceOnUse"
            width="10"
            height="10"
          >
            {/* Random dots to simulate gravel */}
            <Circle cx="2" cy="2" r="0.8" fill="#000000" opacity="0.5" />
            <Circle cx="7" cy="3" r="0.6" fill="#000000" opacity="0.5" />
            <Circle cx="4" cy="7" r="0.7" fill="#000000" opacity="0.5" />
            <Circle cx="9" cy="8" r="0.5" fill="#000000" opacity="0.5" />
            <Circle cx="1" cy="9" r="0.6" fill="#000000" opacity="0.5" />
          </Pattern>
          </Defs>
          
          {/* Background grid */}
          {distanceMarkers.map((marker, index) => (
            <Line
              key={`grid-v-${index}`}
              x1={marker.x}
              y1={0}
              x2={marker.x}
              y2={chartHeight - paddingBottom}
              stroke={gridColor}
              strokeWidth="1"
            />
          ))}
          
          {elevationMarkers.map((marker, index) => (
            <Line
              key={`grid-h-${index}`}
              x1={paddingLeft}
              y1={marker.y}
              x2={chartWidth - paddingRight}
              y2={marker.y}
              stroke={gridColor}
              strokeWidth="1"
            />
          ))}
          
          {/* Render segment areas with gradient fills */}
          {segmentAreaPaths.map((segment, index) => {
            if (!segment || !segment.path || segment.path.trim() === '') {
              return null;
            }
            
            // For master routes, use a solid fill color instead of gradients
            const fillColor = isMasterRoute ? segment.color : `url(#gradient-${index})`;
            
            return (
              <Path
                key={`segment-${index}`}
                d={segment.path}
                fill={fillColor}
                fillOpacity={isMasterRoute ? "0.3" : "1"} // Lower opacity for master routes
                strokeWidth="0"
              />
            );
          })}
          
          {/* Elevation outline */}
          {outlinePath && outlinePath.trim() !== '' && (
            <Path
              d={outlinePath}
              fill="none"
              stroke={elevationLineColor}
              strokeWidth="1.5"
            />
          )}
          
          {/* Unpaved section overlays */}
          {elevationData.length > 0 && (
            <>
              {(() => {
                // Define types for the elevation data point and segments
                type ElevationPoint = typeof elevationData[0];
                
                const unpavedSegments: ElevationPoint[][] = [];
                let currentSegment: ElevationPoint[] = [];
                let inUnpavedSection = !elevationData[0].isPaved;
                
                elevationData.forEach((point, index) => {
                  const isCurrentPointPaved = point.isPaved;
                  
                  // If we're transitioning between paved/unpaved
                  if (inUnpavedSection !== !isCurrentPointPaved) {
                    // If we were in an unpaved section, save the segment
                    if (inUnpavedSection && currentSegment.length > 0) {
                      unpavedSegments.push([...currentSegment]);
                    }
                    // Reset the current segment
                    currentSegment = [];
                    inUnpavedSection = !isCurrentPointPaved;
                  }
                  
                  // If we're in an unpaved section, add the point
                  if (!isCurrentPointPaved) {
                    currentSegment.push(point);
                  }
                  
                  // If this is the last point and we're in an unpaved section
                  if (index === elevationData.length - 1 && !isCurrentPointPaved && currentSegment.length > 0) {
                    unpavedSegments.push([...currentSegment]);
                  }
                });
                
                // Render each unpaved segment
                return unpavedSegments.map((segment, segmentIndex) => {
                  if (segment.length === 0) return null;
                  
                  // Create path for this segment
                  const pathData = segment.map((point: ElevationPoint, i: number) => {
                    const x = paddingLeft + (elevationData.indexOf(point) / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
                    const y = chartHeight - paddingBottom - ((point.y - minElevation) / elevationRange) * (chartHeight - paddingBottom);
                    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                  }).join(' ');
                  
                  // For fill, we need to close the path
                  const lastPoint = segment[segment.length - 1];
                  const firstPoint = segment[0];
                  const lastX = paddingLeft + (elevationData.indexOf(lastPoint) / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
                  const firstX = paddingLeft + (elevationData.indexOf(firstPoint) / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
                  
                  const fillPathData = pathData + 
                    ` L${lastX},${chartHeight - paddingBottom}` +
                    ` L${firstX},${chartHeight - paddingBottom}` +
                    ' Z';
                  
                  return (
                    <Path
                      key={`unpaved-segment-${segmentIndex}`}
                      d={fillPathData}
                      fill="url(#unpavedPattern)"
                      fillOpacity="0.7"
                      stroke="none"
                    />
                  );
                });
              })()}
            </>
          )}
          
          {/* Distance markers */}
          {distanceMarkers.map((marker, index) => (
            <SvgText
              key={`distance-${index}`}
              x={marker.x}
              y={chartHeight - 5}
              fontSize="10"
              fill={textColor}
              textAnchor="middle"
            >
              {marker.distance} km
            </SvgText>
          ))}
          
          {/* Elevation markers */}
          {elevationMarkers.map((marker, index) => (
            <SvgText
              key={`elevation-${index}`}
              x={paddingLeft - 5}
              y={marker.y + 4}
              fontSize="10"
              fill={textColor}
              textAnchor="end"
            >
              {marker.elevation}m
            </SvgText>
          ))}
          
          {/* Tracer marker */}
          {tracerPosition !== null && (
            <React.Fragment>
              <Line
                x1={tracerPosition}
                y1={0}
                x2={tracerPosition}
                y2={chartHeight - paddingBottom}
                stroke="#ff0000"
                strokeWidth="1"
              />
              <Circle
                cx={tracerPosition}
                cy={getYForTracerPosition(tracerPosition)}
                r="4"
                fill="#ff0000"
                stroke="#ffffff"
                strokeWidth="1"
              />
            </React.Fragment>
          )}
        </Svg>
      </View>
    );
  } catch (error) {
    console.error('Error rendering elevation chart:', error);
    return (
      <View style={[styles.chartContainer, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#666666', fontSize: 14 }}>
          Unable to render elevation chart. Please try again.
        </Text>
      </View>
    );
  }
};

export default ElevationChart;
