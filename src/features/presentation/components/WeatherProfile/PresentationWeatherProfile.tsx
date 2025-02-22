import React, { useState, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography, useTheme, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ProcessedRoute } from '../../../gpx/types/gpx.types';
import { getClimateData } from '../../services/weatherService';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const WeatherContent = styled('div')({
  width: '100%',
  height: '100%',
  padding: 0,
  backgroundColor: '#1a1a1a',
  '& .recharts-cartesian-grid-horizontal line, & .recharts-cartesian-grid-vertical line': {
    stroke: 'rgba(255, 255, 255, 0.1)'
  },
  '& .recharts-text': {
    fill: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Futura'
  }
});

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{
        backgroundColor: '#1a1a1a',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        p: 1.5,
        fontFamily: 'Futura'
      }}>
        <Typography sx={{ fontSize: '0.8rem', color: 'white', mb: 1, fontFamily: 'Futura' }}>
          {label}
        </Typography>
        {payload.map((entry: any) => (
          <Typography 
            key={entry.name}
            sx={{ 
              fontSize: '0.75rem', 
              color: entry.color,
              fontFamily: 'Futura'
            }}
          >
            {`${entry.name}: ${entry.value.toFixed(1)}${entry.name.includes('Temperature') ? '°C' : 'mm'}`}
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

interface PresentationWeatherProfileProps {
  route: ProcessedRoute;
  isLoading?: boolean;
  error?: string;
}

export const PresentationWeatherProfile: React.FC<PresentationWeatherProfileProps> = ({
  route,
  isLoading,
  error
}) => {
  const theme = useTheme();

  interface WeatherDataPoint {
    month: string;
    maxTemp: number;
    minTemp: number;
    precipitation: number;
  }

  const [data, setData] = useState<WeatherDataPoint[]>([]);
  const [location, setLocation] = useState<string>('');
  const [stats, setStats] = useState<{
    totalPrecipitation: number;
  }>({ totalPrecipitation: 0 });

  const [yAxisDomains, setYAxisDomains] = useState<{
    temp: [number, number];
    precip: [number, number];
  }>({ temp: [0, 0], precip: [0, 0] });

  useEffect(() => {
    const feature = route?.geojson?.features?.[0];
    if (!feature || feature.geometry.type !== 'LineString') {
      setData([]);
      return;
    }

    const coordinates = (feature.geometry as GeoJSON.LineString).coordinates;
    if (!coordinates.length) {
      setData([]);
      return;
    }

    const [lon, lat] = coordinates[0];
    
    getClimateData(lat, lon, route.name)
      .then(response => {
        // Calculate statistics
        const totalPrecipitation = response.weatherData.reduce((sum, d) => sum + d.precipitation, 0);
        setStats({ totalPrecipitation });
        setLocation(response.location);

        // Calculate dynamic axis ranges
        const minTemp = Math.min(...response.weatherData.map(d => d.minTemp));
        const maxTemp = Math.max(...response.weatherData.map(d => d.maxTemp));
        const maxPrecip = Math.max(...response.weatherData.map(d => d.precipitation));

        setYAxisDomains({
          temp: [Math.floor(minTemp - 10), Math.ceil(maxTemp + 10)],
          precip: [0, Math.ceil(maxPrecip + 10)]
        });

        setData(response.weatherData);
      })
      .catch(err => {
        console.error('Error fetching weather data:', err);
        setData([]);
      });
  }, [route]);

  if (error) {
    return (
      <WeatherContent className="flex items-center justify-center p-4">
        <Alert severity="error" sx={{ 
          width: '100%', 
          backgroundColor: 'rgba(211, 47, 47, 0.1)',
          color: '#ff8a80',
          '& .MuiAlert-icon': { color: '#ff8a80' }
        }}>
          Error loading weather data: {error}
        </Alert>
      </WeatherContent>
    );
  }

  // Show loading state during initial load and data fetching
  if (!data.length || isLoading) {
    return (
      <WeatherContent className="flex flex-col items-center justify-center gap-2">
        <CircularProgress size={24} sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
        <Typography sx={{ fontFamily: 'Futura', color: 'rgba(255, 255, 255, 0.7)' }}>
          Loading weather data...
        </Typography>
      </WeatherContent>
    );
  }

  const maxTempColor = theme.palette.error.main;
  const minTempColor = theme.palette.info.main;

  return (
    <div className="weather-profile h-full">
      <WeatherContent>
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="subtitle2" color="white" sx={{ fontSize: '0.8rem', fontWeight: 500, mr: 3, fontFamily: 'Futura' }}>
            Climate Data: {location}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', height: 'calc(100% - 40px)' }}>
          <Box sx={{ width: '80%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="month"
                  tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 11, fontFamily: 'Futura' }}
                />
                <YAxis 
                  yAxisId="temp"
                  orientation="left"
                  domain={yAxisDomains.temp}
                  tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 11, fontFamily: 'Futura' }}
                  label={{ 
                    value: 'Temperature (°C)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontFamily: 'Futura' }
                  }}
                />
                <YAxis
                  yAxisId="precip"
                  orientation="right"
                  domain={yAxisDomains.precip}
                  tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 11, fontFamily: 'Futura' }}
                  label={{ 
                    value: 'Precipitation (mm)',
                    angle: 90,
                    position: 'insideRight',
                    style: { fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontFamily: 'Futura' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  yAxisId="precip"
                  dataKey="precipitation"
                  fill="#00c853"
                  opacity={0.6}
                  name="Precipitation"
                />
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="maxTemp"
                  stroke={maxTempColor}
                  strokeWidth={2}
                  dot={{ fill: maxTempColor, stroke: maxTempColor, strokeWidth: 2, r: 4 }}
                  name="Max Temp"
                />
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="minTemp"
                  stroke={minTempColor}
                  strokeWidth={2}
                  dot={{ fill: minTempColor, stroke: minTempColor, strokeWidth: 2, r: 4 }}
                  name="Min Temp"
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{
                    paddingTop: '10px',
                    fontSize: '11px',
                    fontFamily: 'Futura',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ 
            width: '20%', 
            pl: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 2 }}>
            <i className="fa-solid fa-location-dot" />
              <Typography variant="subtitle2" color="white" sx={{ fontSize: '0.8rem', fontFamily: 'Futura' }}>
                {location}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="white" sx={{ fontSize: '0.8rem', fontFamily: 'Futura', display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className="fa-solid fa-temperature-three-quarters" /> Temperature Range
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontFamily: 'Futura' }}>
                Highest: {Math.max(...data.map(d => d.maxTemp)).toFixed(1)}°C
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontFamily: 'Futura' }}>
                Lowest: {Math.min(...data.map(d => d.minTemp)).toFixed(1)}°C
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="white" sx={{ fontSize: '0.8rem', fontFamily: 'Futura', display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className="fa-solid fa-cloud-sun-rain" /> Precipitation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontFamily: 'Futura' }}>
                Annual: {stats.totalPrecipitation.toFixed(0)}mm
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontFamily: 'Futura' }}>
                Monthly Avg: {(stats.totalPrecipitation / 12).toFixed(1)}mm
              </Typography>
            </Box>
          </Box>
        </Box>
      </WeatherContent>
    </div>
  );
};
