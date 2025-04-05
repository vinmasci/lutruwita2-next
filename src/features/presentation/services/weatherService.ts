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

// New interfaces for forecast data
interface ForecastData {
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

interface ForecastResponse {
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
    time: string[];
    wind_speed_10m_max?: number[];
    wind_direction_10m_dominant?: number[];
  };
}

interface ForecastLocationData {
  forecastData: ForecastData[];
  location: string;
}

// Weather code mapping to descriptions
const weatherCodeMap: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Cache weather data to avoid redundant API calls
const weatherCache = new Map<string, LocationData>();
const forecastCache = new Map<string, ForecastLocationData>();

function getCacheKey(lat: number, lon: number): string {
  // Round to 2 decimal places for cache efficiency
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

// Get day of week from date string
function getDayOfWeek(dateString: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = new Date(dateString);
  return days[date.getDay()];
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

// New function to get 7-day weather forecast
export async function getWeatherForecast(lat: number, lon: number, routeName: string): Promise<ForecastLocationData> {
  const cacheKey = getCacheKey(lat, lon);
  
  // Check cache first - but with a short expiry (1 hour)
  const cachedData = forecastCache.get(cacheKey);
  const cacheTime = cachedData?.forecastData?.[0]?.date ? new Date(cachedData.forecastData[0].date).getTime() : 0;
  const now = new Date().getTime();
  const cacheExpired = now - cacheTime > 3600000; // 1 hour in milliseconds
  
  if (cachedData && !cacheExpired) {
    return cachedData;
  }

  try {
    const [forecastResponse, locationInfo] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${lat}&longitude=${lon}&` +
        `daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max,wind_direction_10m_dominant&` +
        `timezone=auto&forecast_days=7`
      ),
      getStartingLocation({ features: [{ geometry: { type: 'LineString', coordinates: [[lon, lat]] } }] })
    ]);

    if (!forecastResponse.ok) {
      throw new Error('Failed to fetch forecast data');
    }

    const data: ForecastResponse = await forecastResponse.json();
    
    // Process forecast data
    const forecastData: ForecastData[] = data.daily.time.map((date, index) => {
      const weatherCode = data.daily.weather_code[index];
      return {
        date,
        day: getDayOfWeek(date),
        maxTemp: data.daily.temperature_2m_max[index],
        minTemp: data.daily.temperature_2m_min[index],
        precipitation: data.daily.precipitation_sum[index],
        weatherCode,
        weatherDescription: weatherCodeMap[weatherCode] || 'Unknown',
        windSpeed: data.daily.wind_speed_10m_max?.[index],
        windDirection: data.daily.wind_direction_10m_dominant?.[index]
      };
    });
    
    const locationData = {
      forecastData,
      location: `${locationInfo.city}, ${locationInfo.state}`
    };

    // Cache the results
    forecastCache.set(cacheKey, locationData);

    return locationData;
  } catch (error) {
    console.error('Error fetching forecast data:', error);
    throw error;
  }
}
