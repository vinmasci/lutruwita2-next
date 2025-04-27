import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { RouteData } from '../../../services/routeService';
import { useTheme } from '../../../theme';
import { Cloud, CloudRain, Sun, Thermometer } from 'lucide-react-native';
import { getLocationName } from '../../../utils/geocodingUtils';
import { getStartingCoordinates } from '../../../utils/masterRouteUtils';

interface HistoricalWeatherProps {
  route: RouteData;
}

interface MonthlyClimateData {
  month: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
}

const HistoricalWeather: React.FC<HistoricalWeatherProps> = ({ route }) => {
  const { isDark } = useTheme();
  const [climateData, setClimateData] = useState<MonthlyClimateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  useEffect(() => {
    const fetchClimateData = async () => {
      try {
        // Get coordinates from the starting point of the route
        const coordinates = getStartingCoordinates(route);
        if (!coordinates) {
          setError('No route data available');
          setLoading(false);
          return;
        }

        const [longitude, latitude] = coordinates;

        // Get location name
        try {
          const name = await getLocationName(latitude, longitude);
          setLocationName(name || 'Route Area');
        } catch (err) {
          console.error('Error getting location name:', err);
          setLocationName('Route Area');
        }

        // Fetch historical climate data from Open-Meteo API
        // Using the archive API to get climate data
        const response = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=1991-01-01&end_date=2020-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&models=best_match`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch climate data');
        }

        const data = await response.json();
        
        // Process the data to get monthly averages over the 30-year period
        const monthlyData = processClimateData(data);
        setClimateData(monthlyData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching climate data:', err);
        setError('Failed to load climate data');
        setLoading(false);
      }
    };

    fetchClimateData();
  }, [route]);

  // Process the climate data to get monthly averages
  const processClimateData = (data: any): MonthlyClimateData[] => {
    // If no data is available, return empty array
    if (!data || !data.daily || !data.daily.time) {
      return [];
    }

    // Initialize monthly totals and counts
    const monthlyTotals: Record<string, { 
      maxTempSum: number, 
      minTempSum: number, 
      precipSum: number, 
      count: number 
    }> = {};

    // Month names for display
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Process each day's data
    for (let i = 0; i < data.daily.time.length; i++) {
      const date = new Date(data.daily.time[i]);
      const month = date.getMonth(); // 0-11
      const monthKey = month.toString();

      // Initialize month data if not exists
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = {
          maxTempSum: 0,
          minTempSum: 0,
          precipSum: 0,
          count: 0
        };
      }

      // Add this day's data to the monthly totals
      monthlyTotals[monthKey].maxTempSum += data.daily.temperature_2m_max[i] || 0;
      monthlyTotals[monthKey].minTempSum += data.daily.temperature_2m_min[i] || 0;
      monthlyTotals[monthKey].precipSum += data.daily.precipitation_sum[i] || 0;
      monthlyTotals[monthKey].count++;
    }

    // Calculate monthly averages
    const monthlyAverages: MonthlyClimateData[] = [];
    for (let i = 0; i < 12; i++) {
      const monthKey = i.toString();
      if (monthlyTotals[monthKey] && monthlyTotals[monthKey].count > 0) {
        const count = monthlyTotals[monthKey].count;
        monthlyAverages.push({
          month: monthNames[i],
          maxTemp: Math.round(monthlyTotals[monthKey].maxTempSum / count),
          minTemp: Math.round(monthlyTotals[monthKey].minTempSum / count),
          precipitation: Math.round((monthlyTotals[monthKey].precipSum / count) * 30) // Approximate monthly total
        });
      } else {
        // If no data for this month, add placeholder
        monthlyAverages.push({
          month: monthNames[i],
          maxTemp: 0,
          minTemp: 0,
          precipitation: 0
        });
      }
    }

    return monthlyAverages;
  };

  // Function to get weather icon based on precipitation and temperature
  const getMonthIcon = (data: MonthlyClimateData) => {
    if (data.precipitation > 100) {
      return <CloudRain size={20} color="#4682B4" />;
    } else if (data.maxTemp > 25) {
      return <Sun size={20} color="#ffa502" />;
    } else {
      return <Cloud size={20} color="#A9A9A9" />;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Historical Climate Data</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0288d1" />
          <Text style={styles.loadingText}>Loading climate data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Historical Climate Data</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (climateData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Historical Climate Data</Text>
        <Text style={styles.errorText}>No climate data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Historical Climate for {locationName}</Text>
      <Text style={styles.subtitle}>30-year average (1991-2020)</Text>
      
      <View style={styles.forecastContainer}>
        {climateData.map((monthData) => (
          <View key={monthData.month} style={styles.monthContainer}>
            <Text style={styles.monthText}>{monthData.month}</Text>
            <View style={styles.iconContainer}>
              {getMonthIcon(monthData)}
            </View>
            <View style={styles.tempContainer}>
              <Thermometer size={12} color="#ee5253" />
              <Text style={styles.maxTempText}>
                {monthData.maxTemp}°
              </Text>
            </View>
            <View style={styles.tempContainer}>
              <Thermometer size={12} color="#4b6584" />
              <Text style={styles.minTempText}>
                {monthData.minTemp}°
              </Text>
            </View>
            <View style={styles.precipContainer}>
              <CloudRain size={12} color="#4682B4" />
              <Text style={styles.precipText}>
                {monthData.precipitation}mm
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
    marginBottom: 4,
    color: '#121212',
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 12,
  },
  forecastContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  monthContainer: {
    alignItems: 'center',
    width: '16%', // 6 months per row
    marginBottom: 16,
  },
  monthText: {
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
  },
  maxTempText: {
    fontSize: 12,
    color: '#ee5253',
    marginLeft: 2,
  },
  minTempText: {
    fontSize: 12,
    color: '#4b6584',
    marginLeft: 2,
  },
  precipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  precipText: {
    fontSize: 12,
    color: '#4682B4',
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

export default HistoricalWeather;
