import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { ProcessedRoute } from '../../../gpx/types/gpx.types';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { detectClimbs } from '../../../gpx/utils/climbUtils';
import type { Climb } from '../../../gpx/utils/climbUtils';

const ElevationContent = styled('div')({
  width: '100%',
  height: '220px',
  padding: 0,
  backgroundColor: '#1a1a1a',
  '& .recharts-cartesian-grid-horizontal line, & .recharts-cartesian-grid-vertical line': {
    stroke: 'rgba(255, 255, 255, 0.05)'
  },
  '& .recharts-text': {
    fill: 'rgba(255, 255, 255, 0.7)'
  },
  '& .recharts-tooltip-wrapper': {
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    '& .recharts-default-tooltip': {
      background: 'linear-gradient(135deg, rgba(238, 82, 83, 0.15) 0%, rgba(30, 30, 30, 0.95) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '4px',
      padding: '6px 8px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      '& .recharts-tooltip-label': {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: '0.75rem',
        fontFamily: 'Futura, sans-serif',
        marginBottom: '2px'
      },
      '& .recharts-tooltip-item': {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: '0.75rem',
        fontFamily: 'Futura, sans-serif',
        padding: '1px 0'
      },
      '& .recharts-tooltip-item-name': {
        color: 'rgba(255, 255, 255, 0.7)'
      }
    }
  },
  '& .recharts-area-area': {
    fill: '#4b6584'
  },
  '& .recharts-area-curve': {
    stroke: '#4b6584',
    strokeWidth: 2
  }
});

interface PresentationElevationProfileProps {
  route: ProcessedRoute;
  isLoading?: boolean;
  error?: string;
}

export const PresentationElevationProfile: React.FC<PresentationElevationProfileProps> = ({ 
  route, 
  isLoading, 
  error 
}) => {
  const [data, setData] = useState<{distance: number; elevation: number}[]>([]);
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [stats, setStats] = useState<{
    elevationGained: number;
    elevationLost: number;
    totalDistance: number;
  }>({ elevationGained: 0, elevationLost: 0, totalDistance: 0 });

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

      // Calculate the distance between each point as a fraction of total distance
      const elevationData = elevations.map((elev: number, index: number) => {
        const distance = (index / (elevations.length - 1)) * totalDistance;
        return {
          distance,
          elevation: elev
        };
      });

      // Calculate elevation stats
      let elevationGained = 0;
      let elevationLost = 0;
      
      for (let i = 1; i < elevationData.length; i++) {
        const elevDiff = elevationData[i].elevation - elevationData[i-1].elevation;
        if (elevDiff > 0) {
          elevationGained += elevDiff;
        } else {
          elevationLost += Math.abs(elevDiff);
        }
      }

      setStats({
        elevationGained,
        elevationLost,
        totalDistance
      });

      setData(elevationData);
      
      // Detect climbs and store them
      const detectedClimbs = detectClimbs(elevationData);
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

  return (
    <div className="elevation-profile">
      <ElevationContent>
      <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="subtitle2" color="white" sx={{ fontSize: '0.8rem', fontWeight: 500, mr: 3, fontFamily: 'Futura' }}>
          Elevation Profile: {route.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, ml: 'auto' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontFamily: 'Futura' }}>
            {(stats.totalDistance / 1000).toFixed(1)} km
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontFamily: 'Futura' }}>
            ↑ {stats.elevationGained.toFixed(0)} m
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontFamily: 'Futura' }}>
            ↓ {stats.elevationLost.toFixed(0)} m
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, borderLeft: '1px solid rgba(255, 255, 255, 0.1)', pl: 2, ml: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'Futura', color: '#8B0000' }}>HC</Typography>
            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'Futura', color: '#FF0000' }}>CAT1</Typography>
            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'Futura', color: '#fa8231' }}>CAT2</Typography>
            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'Futura', color: '#f7b731' }}>CAT3</Typography>
            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'Futura', color: '#228B22' }}>CAT4</Typography>
          </Box>
        </Box>
      </Box>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={data}
          margin={{ top: 30, right: 15, left: 5, bottom: 55 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="distance"
            label={{ 
              value: 'Distance (km)', 
              position: 'bottom', 
              dy: -10,
              style: { fontSize: '0.7rem', fontFamily: 'Futura' }
            }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}`}
            domain={[0, 'dataMax']}
            type="number"
            scale="linear"
            allowDataOverflow={false}
            tick={{ fontSize: '0.45rem', fontFamily: 'Futura' }}
            tickSize={3}
          />
          <YAxis
            label={{ 
              value: 'Elevation (m)', 
              angle: -90, 
              position: 'left', 
              dx: 20,
              style: { fontSize: '0.7rem', fontFamily: 'Futura' }
            }}
            tick={{ fontSize: '0.55rem', fontFamily: 'Futura' }}
            tickSize={3}
          />
          <Tooltip 
            formatter={(value: number, name: string, props: any) => {
              const currentIndex = data.findIndex(d => d.distance === props.payload.distance);
              if (currentIndex > 0) {
                const currentPoint = data[currentIndex];
                const prevPoint = data[currentIndex - 1];
                const elevationChange = currentPoint.elevation - prevPoint.elevation;
                const distanceChange = (currentPoint.distance - prevPoint.distance) / 1000;
                const gradient = ((elevationChange / (distanceChange * 1000)) * 100);
                
                return [
                  <div key="tooltip">
                    <div style={{ 
                      fontFamily: 'Futura',
                      color: 'white',
                      display: 'flex',
                      gap: '4px'
                    }}>
                      <span>el:</span>
                      <span>{value.toFixed(1)} m</span>
                    </div>
                    <div style={{ 
                      color: 'white', 
                      fontSize: '0.75rem', 
                      marginTop: '4px',
                      fontFamily: 'Futura',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.7)' }}>
                        {gradient > 0 ? '↗' : '↘'} {Math.abs(gradient).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ];
              }
              return [`${value.toFixed(1)} m`, ''];
            }}
            labelFormatter={(label) => `${(label / 1000).toFixed(2)} km`}
            contentStyle={{ background: 'none', border: 'none' }}
            wrapperStyle={{ outline: 'none' }}
          />
          {/* Climb markers */}
          {climbs.map((climb, index) => (
            <React.Fragment key={index}>
              {/* Start marker */}
              <ReferenceLine
                x={climb.startPoint.distance}
                stroke={climb.color}
                strokeWidth={2}
                label={({ viewBox }) => {
                  const text = `${(climb.totalDistance/1000).toFixed(1)}km @ ${(climb.averageGradient).toFixed(1)}%`;
                  const textWidth = text.length * 5.5;
                  const isNearEnd = climb.startPoint.distance > (data[data.length - 1].distance * 0.75);
                  const xOffset = isNearEnd ? -(textWidth + 15) : 5;
                  return (
                    <g>
                      <filter id={`shadow-${index}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3"/>
                      </filter>
                      <rect
                        x={viewBox.x + xOffset}
                        y={viewBox.y - 25}
                        width={textWidth}
                        height="16"
                        rx="2"
                        fill={climb.color}
                        fillOpacity={0.9}
                        filter={`url(#shadow-${index})`}
                      />
                      <text
                        x={viewBox.x + xOffset + 5}
                        y={viewBox.y - 13}
                        fill="#fff"
                        fontSize={8}
                        fontFamily="Futura"
                      >
                        {text}
                      </text>
                    </g>
                  );
                }}
                isFront={true}
              />
              {/* End marker */}
              <ReferenceLine
                x={climb.endPoint.distance}
                stroke={climb.color}
                strokeWidth={2}
                strokeDasharray="4 2"
                isFront={true}
              />
            </React.Fragment>
          ))}
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#4b6584"
            fill="rgba(75, 101, 132, 0.2)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
      </ElevationContent>
    </div>
  );
};
