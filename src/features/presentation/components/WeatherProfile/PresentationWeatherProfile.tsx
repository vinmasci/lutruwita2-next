import React, { useState, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography, useTheme, CircularProgress, Alert, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ProcessedRoute } from '../../../gpx/types/gpx.types';
import { getClimateData, getWeatherForecast } from '../../services/weatherService';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import OpacityIcon from '@mui/icons-material/Opacity';
import ThermostatIcon from '@mui/icons-material/Thermostat';

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

const ForecastDay = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgba(26, 26, 26, 0.8)',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '8px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
  }
}));

// Global average monthly precipitation in mm
// Source: Approximate global averages based on climate data
const GLOBAL_AVG_PRECIPITATION = {
  Jan: 80,
  Feb: 78,
  Mar: 86,
  Apr: 83,
  May: 80,
  Jun: 76,
  Jul: 78,
  Aug: 79,
  Sep: 82,
  Oct: 84,
  Nov: 82,
  Dec: 81
};

// Function to determine color based on temperature for cycling
// Cold: Blue (below 10°C)
// Warm: Yellow (20-25°C)
// Hot: Red (above 30°C)
// With gradients in between
const getTemperatureColor = (temp: number): string => {
  if (temp <= 5) return '#0000ff'; // Very cold - deep blue
  if (temp <= 10) return '#4d4dff'; // Cold - blue
  if (temp <= 15) return '#80b3ff'; // Cool - light blue
  if (temp <= 20) return '#a6caf0'; // Mild - very light blue
  if (temp <= 25) return '#ffeb3b'; // Warm - yellow
  if (temp <= 30) return '#ffc107'; // Warmer - amber
  if (temp <= 35) return '#ff6600'; // Hot - orange
  return '#ff0000'; // Very hot - red
};

// Function to determine if precipitation is high or low compared to global average
const getPrecipitationComparison = (month: string, precipitation: number): {
  status: 'high' | 'average' | 'low';
  percentage: number;
} => {
  const globalAvg = GLOBAL_AVG_PRECIPITATION[month as keyof typeof GLOBAL_AVG_PRECIPITATION] || 80;
  const percentage = Math.round((precipitation / globalAvg) * 100);
  
  if (percentage >= 130) return { status: 'high', percentage };
  if (percentage <= 70) return { status: 'low', percentage };
  return { status: 'average', percentage };
};

// Function to get color for precipitation comparison
const getPrecipitationComparisonColor = (status: 'high' | 'average' | 'low'): string => {
  switch (status) {
    case 'high': return '#3f51b5'; // Blue for high precipitation
    case 'low': return '#ff9800';  // Orange for low precipitation
    default: return '#4caf50';     // Green for average precipitation
  }
};

// Helper function to get precipitation condition text and icon
const getPrecipitationInfo = (month: string, precipitation: number): {
  condition: string;
  icon: string;
  color: string;
} => {
  const globalAvg = GLOBAL_AVG_PRECIPITATION[month as keyof typeof GLOBAL_AVG_PRECIPITATION] || 80;
  const percentage = Math.round((precipitation / globalAvg) * 100);
  
  if (percentage <= 30) return { 
    condition: 'Very dry', 
    icon: 'fa-solid fa-sun', 
    color: '#ff4500' // Orange-red
  };
  if (percentage <= 70) return { 
    condition: 'Dry', 
    icon: 'fa-solid fa-cloud-sun', 
    color: '#ff9800' // Orange
  };
  if (percentage <= 130) return { 
    condition: 'Average rainfall', 
    icon: 'fa-solid fa-cloud-sun-rain', 
    color: '#ffeb3b' // Yellow
  };
  if (percentage <= 200) return { 
    condition: 'Wet', 
    icon: 'fa-solid fa-cloud-rain', 
    color: '#42a5f5' // Blue
  };
  return { 
    condition: 'Very wet', 
    icon: 'fa-solid fa-cloud-hail', 
    color: '#1976d2' // Dark blue
  };
};

// Helper function to get temperature icon and color
const getTemperatureIcon = (temp: number): {
  icon: string;
  color: string;
  condition: string;
} => {
  if (temp <= 5) return { 
    icon: 'fa-solid fa-temperature-snow', 
    color: '#0000ff', // Very cold - dark blue
    condition: 'Very cold for cycling'
  };
  if (temp <= 10) return { 
    icon: 'fa-solid fa-temperature-snow', 
    color: '#4d4dff', // Cold - blue
    condition: 'Cold for cycling'
  };
  if (temp <= 15) return { 
    icon: 'fa-solid fa-temperature-snow', 
    color: '#80b3ff', // Cool - light blue
    condition: 'Cool for cycling'
  };
  if (temp <= 20) return { 
    icon: 'fa-solid fa-temperature-sun', 
    color: '#ffeb3b', // Ideal - yellow
    condition: 'Ideal for cycling'
  };
  if (temp <= 25) return { 
    icon: 'fa-solid fa-temperature-sun', 
    color: '#ffeb3b', // Warm - yellow
    condition: 'Warm for cycling'
  };
  if (temp <= 30) return { 
    icon: 'fa-solid fa-temperature-sun', 
    color: '#ffc107', // Hot - amber
    condition: 'Hot for cycling'
  };
  return { 
    icon: 'fa-solid fa-temperature-sun', 
    color: '#ff0000', // Very hot - red
    condition: 'Very hot for cycling'
  };
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Get the data point for this month to access the temperature color
    const dataPoint = payload[0]?.payload;
    
    // Get temperature and precipitation info
    const tempIcon = getTemperatureIcon(dataPoint?.avgTemp);
    const precipInfo = getPrecipitationInfo(dataPoint?.month, dataPoint?.precipitation);
    
    // Extract condition without "for cycling"
    const tempCondition = tempIcon.condition.replace(' for cycling', '');
    
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
        
        {/* High temperature in white */}
        <Typography 
          sx={{ 
            fontSize: '0.75rem', 
            color: 'white',
            fontFamily: 'Futura',
            mb: 0.5
          }}
        >
          {`High: ${dataPoint?.maxTemp.toFixed(1)}°C`}
        </Typography>
        
        {/* Low temperature in white */}
        <Typography 
          sx={{ 
            fontSize: '0.75rem', 
            color: 'white',
            fontFamily: 'Futura',
            mb: 0.5
          }}
        >
          {`Low: ${dataPoint?.minTemp.toFixed(1)}°C`}
        </Typography>
        
        {/* Add cycling condition description under temperatures with matching color and icon in front */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <i className={tempIcon.icon} style={{ color: tempIcon.color, fontSize: '12px', marginRight: '4px' }} />
          <Typography 
            sx={{ 
              fontSize: '0.7rem', 
              color: tempIcon.color,
              fontFamily: 'Futura',
              fontStyle: 'italic'
            }}
          >
            {`(${tempCondition})`}
          </Typography>
        </Box>
        
        {/* Precipitation in white without icon */}
        <Typography 
          sx={{ 
            fontSize: '0.75rem', 
            color: 'white',
            fontFamily: 'Futura',
            mb: 0.5
          }}
        >
          {`Ave. Rain: ${dataPoint?.precipitation.toFixed(1)} mm`}
        </Typography>
        
        {/* Add precipitation condition description with matching color and icon in front */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <i className={precipInfo.icon} style={{ color: precipInfo.color, fontSize: '12px', marginRight: '4px' }} />
          <Typography 
            sx={{ 
              fontSize: '0.7rem', 
              color: precipInfo.color,
              fontFamily: 'Futura',
              fontStyle: 'italic'
            }}
          >
            {`(${precipInfo.condition})`}
          </Typography>
        </Box>
      </Box>
    );
  }
  return null;
};

// Helper function to get cycling condition text based on temperature
const getTempConditionText = (temp: number): string => {
  if (!temp) return '';
  if (temp <= 5) return 'Very cold for cycling';
  if (temp <= 10) return 'Cold for cycling';
  if (temp <= 15) return 'Cool for cycling';
  if (temp <= 20) return 'Ideal for cycling';
  if (temp <= 25) return 'Warm for cycling';
  if (temp <= 30) return 'Hot for cycling';
  if (temp <= 35) return 'Very hot for cycling';
  return 'Extremely hot for cycling';
};

// Helper function to get weather icon based on weather code
const getWeatherIcon = (weatherCode: number): { icon: string; color: string; isPartlyCloudy?: boolean } => {
  // Simple mapping of weather codes to icon classes and colors
  if (weatherCode === 0) return { icon: 'fa-solid fa-sun', color: '#ffeb3b' }; // Clear sky - yellow
  if (weatherCode === 1) return { icon: 'fa-solid fa-sun', color: '#ffeb3b' }; // Mainly clear - yellow
  if (weatherCode === 2) return { icon: 'fa-solid fa-cloud-sun', color: '#ffeb3b', isPartlyCloudy: true }; // Partly cloudy - special case
  if (weatherCode === 3) return { icon: 'fa-solid fa-cloud', color: '#9e9e9e' }; // Overcast - grey
  if (weatherCode <= 48) return { icon: 'fa-solid fa-cloud', color: '#9e9e9e' }; // Fog - grey
  if (weatherCode <= 57) return { icon: 'fa-solid fa-cloud-drizzle', color: '#90caf9' }; // Drizzle - light blue
  if (weatherCode <= 67) return { icon: 'fa-solid fa-cloud-rain', color: '#42a5f5' }; // Rain - blue
  if (weatherCode <= 77) return { icon: 'fa-solid fa-snowflake', color: '#e0e0e0' }; // Snow - white
  if (weatherCode <= 82) return { icon: 'fa-solid fa-cloud-showers-heavy', color: '#1976d2' }; // Rain showers - dark blue
  if (weatherCode <= 86) return { icon: 'fa-solid fa-snowflake', color: '#e0e0e0' }; // Snow showers - white
  return { icon: 'fa-solid fa-cloud-bolt', color: '#5e35b1' }; // Thunderstorm - purple
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

  // Interface for historical climate data (for the chart)
  interface WeatherDataPoint {
    month: string;
    maxTemp: number;
    minTemp: number;
    avgTemp: number;
    precipitation: number;
    tempColor: string;
  }

  // Interface for forecast data (for the left panel)
  interface ForecastDataPoint {
    date: string;
    day: string;
    maxTemp: number;
    minTemp: number;
    precipitation: number;
    weatherCode: number;
    weatherDescription: string;
    windSpeed?: number;
    windDirection?: number;
  }

  const [chartData, setChartData] = useState<WeatherDataPoint[]>([]);
  const [forecastData, setForecastData] = useState<ForecastDataPoint[]>([]);
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
      setChartData([]);
      setForecastData([]);
      return;
    }

    const coordinates = (feature.geometry as GeoJSON.LineString).coordinates;
    if (!coordinates.length) {
      setChartData([]);
      setForecastData([]);
      return;
    }

    const [lon, lat] = coordinates[0];
    
    // Fetch both historical climate data and forecast data
    Promise.all([
      getClimateData(lat, lon, route.name),
      getWeatherForecast(lat, lon, route.name)
    ])
      .then(([climateResponse, forecastResponse]) => {
        // Process climate data for the chart with average temperature
        const totalPrecipitation = climateResponse.weatherData.reduce((sum, d) => sum + d.precipitation, 0);
        setStats({ totalPrecipitation });
        setLocation(climateResponse.location);

        // Calculate average temperature and add color for each month
        const processedChartData = climateResponse.weatherData.map(data => {
          const avgTemp = (data.maxTemp + data.minTemp) / 2;
          return {
            ...data,
            avgTemp,
            tempColor: getTemperatureColor(avgTemp)
          };
        });

        // Calculate dynamic axis ranges for the chart
        const minTemp = Math.min(...processedChartData.map(d => d.minTemp));
        const maxTemp = Math.max(...processedChartData.map(d => d.maxTemp));
        const maxPrecip = Math.max(...processedChartData.map(d => d.precipitation));
        
        // Set a fixed minimum value for the temperature axis to ensure all bars are visible
        // This ensures that even temperatures near 0°C will have visible bars
        const fixedMinTemp = -10; // Fixed minimum value well below 0

        setYAxisDomains({
          temp: [fixedMinTemp, Math.ceil(maxTemp + 5)],
          precip: [0, Math.ceil(maxPrecip + 10)]
        });

        setChartData(processedChartData);
        
        // Set forecast data for the left panel
        setForecastData(forecastResponse.forecastData);
      })
      .catch(err => {
        console.error('Error fetching weather data:', err);
        setChartData([]);
        setForecastData([]);
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
  if ((!chartData.length || !forecastData.length) || isLoading) {
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
            Weather Data: {location}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', height: 'calc(100% - 40px)' }}>
          {/* Forecast panel on the left with added padding */}
          <Box sx={{ 
            width: '25%', // Increased from 20% to give more space
            pr: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            overflowY: 'auto',
            py: 2,
            px: 3 // Added more padding on the left and right
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <LocationOnIcon fontSize="small" sx={{ color: 'white' }} />
              <Typography variant="subtitle2" color="white" sx={{ fontSize: '0.8rem', fontFamily: 'Futura' }}>
                {location}
              </Typography>
            </Box>
            
            <Typography variant="subtitle2" color="white" sx={{ 
              fontSize: '0.9rem', 
              fontFamily: 'Futura', 
              fontWeight: 'bold',
              mb: 1,
              mt: 1
            }}>
              7-Day Forecast
            </Typography>
            
            {/* Daily forecast cards */}
            {forecastData.map((day, index) => (
              <ForecastDay key={day.date} elevation={0}>
                <Typography variant="subtitle2" color="white" sx={{ 
                  fontSize: '0.85rem', 
                  fontFamily: 'Futura', 
                  fontWeight: 'bold',
                  mb: 0.5
                }}>
                  {index === 0 ? 'Today' : day.day}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  {/* Weather icon with dynamic color based on weather type */}
                  {getWeatherIcon(day.weatherCode).isPartlyCloudy ? (
                    <div style={{ position: 'relative', width: '24px', height: '16px', marginRight: '8px' }}>
                      {/* Sun icon in yellow */}
                      <i className="fa-solid fa-sun" style={{ 
                        color: '#ffeb3b',
                        position: 'absolute',
                        left: '0',
                        top: '0',
                        fontSize: '16px'
                      }} />
                      {/* Cloud icon in grey, positioned on top */}
                      <i className="fa-solid fa-cloud" style={{ 
                        color: '#9e9e9e',
                        position: 'absolute',
                        left: '8px',
                        top: '0',
                        fontSize: '16px'
                      }} />
                    </div>
                  ) : (
                    <i className={getWeatherIcon(day.weatherCode).icon} style={{ 
                      color: getWeatherIcon(day.weatherCode).color, 
                      marginRight: '8px',
                      fontSize: '16px'
                    }} />
                  )}
                  <Typography variant="body2" color="white" sx={{ 
                    fontSize: '0.75rem', 
                    fontFamily: 'Futura'
                  }}>
                    {day.weatherDescription}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <ThermostatIcon sx={{ color: maxTempColor, fontSize: '16px', mr: 0.5 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    fontSize: '0.75rem', 
                    fontFamily: 'Futura',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}>
                    {day.maxTemp.toFixed(1)}°C
                  </Typography>
                  <Typography sx={{ mx: 0.5, color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.7rem' }}>/</Typography>
                  <ThermostatIcon sx={{ color: minTempColor, fontSize: '16px', mr: 0.5 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    fontSize: '0.75rem', 
                    fontFamily: 'Futura',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}>
                    {day.minTemp.toFixed(1)}°C
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <OpacityIcon sx={{ color: '#00FFFF', fontSize: '16px', mr: 0.5 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    fontSize: '0.75rem', 
                    fontFamily: 'Futura',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}>
                    {day.precipitation.toFixed(1)} mm
                  </Typography>
                </Box>
                
                {/* Wind information */}
                {day.windSpeed && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <i className="fa-solid fa-wind" style={{ 
                      color: '#b0bec5', 
                      marginRight: '8px',
                      fontSize: '16px'
                    }} />
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      fontSize: '0.75rem', 
                      fontFamily: 'Futura',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                      {day.windSpeed.toFixed(1)} km/h
                      {day.windDirection && (
                        <span style={{ marginLeft: '4px' }}>
                          <i className="fa-solid fa-arrow-up" style={{ 
                            transform: `rotate(${day.windDirection}deg)`,
                            display: 'inline-block',
                            fontSize: '12px',
                            marginLeft: '2px'
                          }} />
                        </span>
                      )}
                    </Typography>
                  </Box>
                )}
              </ForecastDay>
            ))}
          </Box>
          
          {/* Historical climate chart on the right */}
          <Box sx={{ width: '75%', height: '100%' }}> {/* Reduced from 80% */}
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="month"
                  height={40} // Reduced height since icons are side by side
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const dataPoint = chartData.find(d => d.month === payload.value);
                    
                    // If no data point, return empty text element (must return a React element)
                    if (!dataPoint) {
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          dy={16} 
                          textAnchor="middle" 
                          fill="rgba(255, 255, 255, 0.7)"
                        >
                          {payload.value}
                        </text>
                      );
                    }
                    
                    // Get temperature and precipitation icons
                    const tempIcon = getTemperatureIcon(dataPoint.avgTemp);
                    const precipIcon = getPrecipitationInfo(dataPoint.month, dataPoint.precipitation);
                    
                    return (
                      <g transform={`translate(${x},${y})`}>
                        {/* Month text */}
                        <text 
                          x={0} 
                          y={0} 
                          dy={16} 
                          textAnchor="middle" 
                          fill="rgba(255, 255, 255, 0.7)"
                          style={{ fontSize: 11, fontFamily: 'Futura' }}
                        >
                          {payload.value}
                        </text>
                        
                        {/* Temperature icon - positioned to the left */}
                        <foreignObject x={-24} y={20} width={24} height={24}>
                          <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <i className={tempIcon.icon} style={{ 
                              color: tempIcon.color, 
                              fontSize: '14px' 
                            }} />
                          </div>
                        </foreignObject>
                        
                        {/* Precipitation icon - positioned to the right */}
                        <foreignObject x={0} y={20} width={24} height={24}>
                          <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <i className={precipIcon.icon} style={{ 
                              color: precipIcon.color, 
                              fontSize: '14px' 
                            }} />
                          </div>
                        </foreignObject>
                      </g>
                    );
                  }}
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
                {/* Removed precipitation Y-axis as requested, but kept precipitation info in tooltips */}
                <Tooltip content={<CustomTooltip />} />
                {/* Bar chart for maximum temperature */}
                <Bar
                  yAxisId="temp"
                  dataKey="maxTemp"
                  fill="#ffc107" // Darker yellow for max temp
                  opacity={0.9}
                  name="Max Temp"
                  barSize={20} // Slightly narrower bars
                  // Use shape to customize each bar's color and ensure minimum height
                  shape={(props) => {
                    const { x, y, width, height } = props;
                    const dataPoint = props.payload;
                    
                    // Get color based on the max temperature
                    const maxTempColor = getTemperatureColor(dataPoint.maxTemp);
                    
                    // Ensure a minimum height for the bar
                    const minHeight = 15;
                    const actualHeight = Math.max(height, minHeight);
                    
                    // If we're using a minimum height, adjust y position to align with the baseline
                    const adjustedY = height < minHeight ? y - (minHeight - height) : y;
                    
                    return (
                      <rect
                        x={x}
                        y={adjustedY}
                        width={width}
                        height={actualHeight}
                        fill={maxTempColor} // Use color based on temperature
                        stroke="none"
                        strokeWidth={0}
                        rx={3} // Slightly rounded corners
                        ry={3}
                      />
                    );
                  }}
                />
                
                {/* Bar chart for minimum temperature */}
                <Bar
                  yAxisId="temp"
                  dataKey="minTemp"
                  fill="#80b3ff" // Light blue for min temp
                  opacity={0.9}
                  name="Min Temp"
                  barSize={20} // Slightly narrower bars
                  // Use shape to customize each bar's color and ensure minimum height
                  shape={(props) => {
                    const { x, y, width, height } = props;
                    const dataPoint = props.payload;
                    
                    // Get color based on the min temperature
                    const minTempColor = getTemperatureColor(dataPoint.minTemp);
                    
                    // Ensure a minimum height for the bar
                    const minHeight = 15;
                    const actualHeight = Math.max(height, minHeight);
                    
                    // If we're using a minimum height, adjust y position to align with the baseline
                    const adjustedY = height < minHeight ? y - (minHeight - height) : y;
                    
                    return (
                      <rect
                        x={x}
                        y={adjustedY}
                        width={width}
                        height={actualHeight}
                        fill={minTempColor} // Use color based on temperature
                        stroke="none"
                        strokeWidth={0}
                        rx={3} // Slightly rounded corners
                        ry={3}
                      />
                    );
                  }}
                />
                {/* Removed precipitation line component as we're now showing icons in the X-axis */}
                <Legend
                  verticalAlign="top"
                  height={36}
                  content={(props) => {
                    const { payload } = props;
                    
                    return (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        paddingTop: '10px',
                        fontSize: '11px',
                        fontFamily: 'Futura',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>
                        {/* Historical Averages heading */}
                        <span style={{ 
                          fontWeight: 'bold',
                          marginRight: '20px',
                          fontSize: '11px',
                          fontFamily: 'Futura',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                          Historical Averages
                        </span>
                        
                        {/* Legend items */}
                        {payload?.map((entry, index) => (
                          <span key={`legend-item-${index}`} style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center',
                            marginRight: '10px'
                          }}>
                            <span style={{ 
                              display: 'inline-block',
                              width: '10px',
                              height: '10px',
                              backgroundColor: entry.color,
                              marginRight: '5px',
                              borderRadius: '2px'
                            }} />
                            <span style={{ 
                              color: entry.dataKey === 'maxTemp' ? '#ffc107' : '#80b3ff',
                              fontFamily: 'Futura',
                              fontSize: '11px'
                            }}>
                              {entry.value}
                            </span>
                          </span>
                        ))}
                      </div>
                    );
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </WeatherContent>
    </div>
  );
};
