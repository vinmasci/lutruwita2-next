import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { RouteData } from '../../../services/routeService';
import { useTheme } from '../../../theme';
import { Cloud, CloudRain, Sun, ArrowUp } from 'lucide-react-native';
import { getLocationName } from '../../../utils/geocodingUtils';

interface WeatherForecastProps {
  route: RouteData;
}

interface WeatherData {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    weathercode: number[];
    windspeed_10m_max: number[];
    winddirection_10m_dominant: number[];
  };
}

const WeatherForecast: React.FC<WeatherForecastProps> = ({ route }) => {
  const { isDark } = useTheme();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        if (!route.geojson || !route.geojson.features || route.geojson.features.length === 0) {
          setError('No route data available');
          setLoading(false);
          return;
        }

        // Get coordinates from the starting point of the route
        const coordinates = route.geojson.features[0].geometry.coordinates;
        const [longitude, latitude] = coordinates[0]; // Use first point (starting point)

        // Get location name
        try {
          const name = await getLocationName(latitude, longitude);
          setLocationName(name || 'Route Area');
        } catch (err) {
          console.error('Error getting location name:', err);
          setLocationName('Route Area');
        }

        // Fetch weather data from Open-Meteo API
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant&timezone=auto`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();
        setWeather(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching weather:', err);
        setError('Failed to load weather data');
        setLoading(false);
      }
    };

    fetchWeather();
  }, [route]);

  // Function to get weather icon based on weather code
  const getWeatherIcon = (code: number) => {
    // WMO Weather interpretation codes (WW)
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog and depositing rime fog
    // 51, 53, 55: Drizzle: Light, moderate, and dense intensity
    // 56, 57: Freezing Drizzle: Light and dense intensity
    // 61, 63, 65: Rain: Slight, moderate and heavy intensity
    // 66, 67: Freezing Rain: Light and heavy intensity
    // 71, 73, 75: Snow fall: Slight, moderate, and heavy intensity
    // 77: Snow grains
    // 80, 81, 82: Rain showers: Slight, moderate, and violent
    // 85, 86: Snow showers slight and heavy
    // 95: Thunderstorm: Slight or moderate
    // 96, 99: Thunderstorm with slight and heavy hail

    if (code === 0) {
      return <Sun size={20} color="#ffa502" />;
    } else if (code >= 1 && code <= 3) {
      return <Cloud size={20} color="#A9A9A9" />;
    } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code === 95 || code === 96 || code === 99) {
      return <CloudRain size={20} color="#4682B4" />;
    } else {
      return <Cloud size={20} color="#A9A9A9" />;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Weather Forecast</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0288d1" />
          <Text style={styles.loadingText}>Loading weather data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Weather Forecast</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!weather) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Weather Forecast</Text>
        <Text style={styles.errorText}>No weather data available</Text>
      </View>
    );
  }

  // Format date to display day of week
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  // Function to convert wind direction degrees to cardinal direction
  const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };
  
  // Function to render a wind direction arrow
  const renderWindDirectionArrow = (degrees: number) => {
    // ArrowUp rotated to point in the wind direction
    // Wind direction is where the wind is coming FROM, so we need to point the arrow
    // in the opposite direction (where the wind is blowing TO)
    return (
      <ArrowUp 
        size={12} 
        color="#666666" 
        style={{ 
          transform: [{ rotate: `${degrees}deg` }] 
        }} 
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Weather for {locationName}</Text>
      
      <View style={styles.forecastContainer}>
        {weather.daily.time.slice(0, 7).map((day, index) => (
          <View key={day} style={styles.dayContainer}>
            <Text style={styles.dayText}>{formatDate(day)}</Text>
            <View style={styles.iconContainer}>
              {getWeatherIcon(weather.daily.weathercode[index])}
            </View>
            <View style={styles.tempContainer}>
              <Text style={styles.tempText}>
                {Math.round(weather.daily.temperature_2m_max[index])}°
              </Text>
              <Text style={styles.tempText}>
                {Math.round(weather.daily.temperature_2m_min[index])}°
              </Text>
            </View>
            <View style={styles.precipContainer}>
              <CloudRain size={12} color="#4682B4" />
              <Text style={styles.precipText}>
                {weather.daily.precipitation_probability_max[index]}%
              </Text>
            </View>
            <View style={styles.precipContainer}>
              <Text style={styles.precipText}>
                {weather.daily.precipitation_sum[index]}mm
              </Text>
            </View>
            <View style={styles.windContainer}>
              <Text style={styles.windText}>
                {Math.round(weather.daily.windspeed_10m_max[index])}km/h
              </Text>
            </View>
            <View style={styles.windDirContainer}>
              {renderWindDirectionArrow(weather.daily.winddirection_10m_dominant[index])}
              <Text style={styles.windDirText}>
                {getWindDirection(weather.daily.winddirection_10m_dominant[index])}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#121212',
  },
  forecastContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  dayContainer: {
    alignItems: 'center',
    width: '14%', // 7 days per week
    marginBottom: 8,
  },
  dayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#121212',
    marginBottom: 4,
  },
  iconContainer: {
    marginBottom: 4,
    height: 24,
    justifyContent: 'center',
  },
  tempContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    justifyContent: 'center',
    gap: 4,
  },
  tempText: {
    fontSize: 12,
    color: '#333333',
  },
  precipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  precipText: {
    fontSize: 12,
    color: '#333333',
    marginLeft: 2,
  },
  windContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  windDirContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  windText: {
    fontSize: 10,
    color: '#333333',
  },
  windDirText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666666',
  },
  errorText: {
    color: '#FF5722',
    textAlign: 'center',
    padding: 10,
  },
});

export default WeatherForecast;
