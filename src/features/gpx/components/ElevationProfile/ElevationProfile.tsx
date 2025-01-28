import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ProcessedRoute } from '../../types/gpx.types';
import { ElevationContent } from './ElevationProfile.styles';
import { Box, Typography } from '@mui/material';

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
            formatter={(value: number) => [`${value.toFixed(1)} m`, 'Elevation']}
            labelFormatter={(label) => `${(label / 1000).toFixed(2)} km`}
          />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#ee5253"
            fill="#ee5253"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ElevationContent>
  );
};
