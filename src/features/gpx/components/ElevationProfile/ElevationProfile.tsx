import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ProcessedRoute } from '../../types/gpx.types';
import { ElevationContent } from './ElevationProfile.styles';
import { Box, Typography } from '@mui/material';
import { detectClimbs } from '../../utils/climbUtils';

interface ElevationProfileProps {
  route: ProcessedRoute;
  isLoading?: boolean;
  error?: string;
}

export const ElevationProfile = ({ route, isLoading, error }: ElevationProfileProps) => {
  const [data, setData] = useState<{distance: number; elevation: number}[]>([]);
  const [stats, setStats] = useState<{
    elevationGained: number;
    elevationLost: number;
    totalDistance: number;
  }>({ elevationGained: 0, elevationLost: 0, totalDistance: 0 });
  useEffect(() => {
    console.log('[ElevationProfile] Route data:', {
      hasGeojson: !!route?.geojson,
      hasFeatures: !!route?.geojson?.features?.length,
      hasElevation: !!route?.geojson?.features?.[0]?.properties?.coordinateProperties?.elevation,
      elevationCount: route?.geojson?.features?.[0]?.properties?.coordinateProperties?.elevation?.length || 0
    });

    if (!route?.geojson?.features?.[0]?.properties?.coordinateProperties?.elevation) {
      console.log('[ElevationProfile] No elevation data found');
      setData([]);
      return;
    }

    try {
      const feature = route.geojson.features[0];
      if (feature.geometry.type !== 'LineString') {
        console.error('Expected LineString geometry');
        setData([]);
        return;
      }

      const elevations = feature.properties?.coordinateProperties?.elevation;
      const coordinates = feature.geometry.coordinates;
      const totalDistance = route.statistics.totalDistance;

      console.log('[ElevationProfile] Processing elevation data:', {
        count: elevations?.length,
        totalDistance,
        sample: elevations?.slice(0, 5)
      });

      if (!Array.isArray(elevations)) {
        console.error('Invalid elevation or coordinate data');
        setData([]);
        return;
      }

      // Calculate the distance between each point as a fraction of total distance
      const elevationData = elevations.map((elev: number, index: number) => {
        // Calculate the fraction of total distance based on point index
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
        totalDistance: totalDistance
      });

      setData(elevationData);
      
      // Detect climbs
      const climbs = detectClimbs(elevationData);
      console.log('[ElevationProfile] Detected climbs:', climbs);
      
      console.log('[ElevationProfile] Processed data:', {
        count: elevationData.length,
        sample: elevationData.slice(0, 5),
        stats: { elevationGained, elevationLost, totalDistance }
      });
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
    <ElevationContent>
      <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="subtitle2" color="white" sx={{ fontSize: '0.8rem', fontWeight: 500, mr: 3, fontFamily: 'Futura' }}>
          Elevation Profile
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
        </Box>
      </Box>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={data}
          margin={{ top: 10, right: 15, left: 5, bottom: 55 }}
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
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}`}
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
                const distanceChange = (currentPoint.distance - prevPoint.distance) / 1000; // Convert to km
                const gradient = ((elevationChange / (distanceChange * 1000)) * 100).toFixed(1);
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
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {parseFloat(gradient) > 0 ? '↗' : '↘'} {Math.abs(parseFloat(gradient))}%
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
          <defs>
            <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ee5253" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ee5253" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#ee5253"
            fill="url(#elevationGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ElevationContent>
  );
};
