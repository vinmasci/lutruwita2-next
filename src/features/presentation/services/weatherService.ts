import { getStartingLocation } from '../utils/locationUtils';

interface WeatherData {
  month: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
}

interface WeatherResponse {
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    time: string[];
  };
}

interface LocationData {
  weatherData: WeatherData[];
  location: string;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Cache weather data to avoid redundant API calls
const weatherCache = new Map<string, LocationData>();

function getCacheKey(lat: number, lon: number): string {
  // Round to 2 decimal places for cache efficiency
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function processWeatherData(data: WeatherResponse): WeatherData[] {
  const monthlyData = new Map<string, { 
    maxTemps: number[],
    minTemps: number[],
    precips: number[] 
  }>();

  // Initialize monthly data arrays
  MONTHS.forEach(month => {
    monthlyData.set(month, {
      maxTemps: [],
      minTemps: [],
      precips: []
    });
  });

  // Group data by month
  data.daily.time.forEach((date, index) => {
    const month = MONTHS[new Date(date).getMonth()];
    const monthData = monthlyData.get(month)!;
    monthData.maxTemps.push(data.daily.temperature_2m_max[index]);
    monthData.minTemps.push(data.daily.temperature_2m_min[index]);
    monthData.precips.push(data.daily.precipitation_sum[index]);
  });

  // Calculate monthly averages for temperature, but sum for precipitation
  return MONTHS.map(month => {
    const monthData = monthlyData.get(month)!;
    return {
      month,
      maxTemp: monthData.maxTemps.reduce((a, b) => a + b, 0) / monthData.maxTemps.length,
      minTemp: monthData.minTemps.reduce((a, b) => a + b, 0) / monthData.minTemps.length,
      precipitation: monthData.precips.reduce((a, b) => a + b, 0) // Sum precipitation instead of averaging
    };
  });
}

export async function getClimateData(lat: number, lon: number, routeName: string): Promise<LocationData> {
  const cacheKey = getCacheKey(lat, lon);
  
  // Check cache first
  const cachedData = weatherCache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    // Get last year's data for historical averages
    const lastYear = new Date().getFullYear() - 1;
    const startDate = `${lastYear}-01-01`;
    const endDate = `${lastYear}-12-31`;

    const [weatherResponse, locationInfo] = await Promise.all([
      fetch(
        `https://archive-api.open-meteo.com/v1/archive?` +
        `latitude=${lat}&longitude=${lon}&` +
        `start_date=${startDate}&end_date=${endDate}&` +
        `daily=temperature_2m_max,temperature_2m_min,precipitation_sum&` +
        `timezone=auto`
      ),
      getStartingLocation({ features: [{ geometry: { type: 'LineString', coordinates: [[lon, lat]] } }] })
    ]);

    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const data: WeatherResponse = await weatherResponse.json();
    const processedData = processWeatherData(data);
    const locationData = {
      weatherData: processedData,
      location: `${locationInfo.city}, ${locationInfo.state}`
    };

    // Cache the results
    weatherCache.set(cacheKey, locationData);

    return locationData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}
