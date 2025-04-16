/**
 * Route Service for Mobile App
 * 
 * This service handles fetching routes and maps from the API.
 * It provides methods to list public routes and load specific routes.
 */

// Define types for route data
export interface RouteStatistics {
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  averageSpeed: number;
  movingTime: number;
  totalTime: number;
}

export interface RouteMetadata {
  country?: string;
  state?: string;
  lga?: string;
  totalDistance?: number;
  totalAscent?: number;
  unpavedPercentage?: number;
  isLoop?: boolean;
}

export interface RouteStatus {
  processingState: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: {
    code: string;
    message: string;
    details: string;
  };
}

export interface RouteData {
  order: number;
  routeId: string;
  name: string;
  color: string;
  isVisible: boolean;
  geojson: any; // GeoJSON data
  statistics: RouteStatistics;
  status: RouteStatus;
  metadata?: RouteMetadata;
}

export interface MapState {
  zoom: number;
  center: [number, number]; // [longitude, latitude]
  bearing: number;
  pitch: number;
  style?: string;
}

export interface POI {
  id: string;
  coordinates: [number, number]; // [longitude, latitude]
  name: string;
  description?: string;
  category: string;
  icon: string;
  photos?: Array<{
    url: string;
    caption?: string;
  }>;
  style?: {
    color?: string;
    size?: number;
  };
}

export interface RouteMap {
  id: string;
  persistentId: string;
  name: string;
  type: 'tourism' | 'event' | 'bikepacking' | 'single';
  isPublic: boolean;
  viewCount: number;
  lastViewed?: string;
  createdAt: string;
  updatedAt: string;
  mapState: MapState;
  routes: RouteData[];
  pois?: {
    draggable: POI[];
    places: POI[];
  };
  photos?: any[];
  metadata?: RouteMetadata;
  createdBy?: {
    id?: string;
    name: string;
  };
}

// API base URL - use environment variable for API URL
const API_BASE = process.env.EXPO_PUBLIC_API_URL?.endsWith('/api')
  ? `${process.env.EXPO_PUBLIC_API_URL}/routes`
  : `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/routes`;

/**
 * List public routes with optional type filter
 * @param type Optional route type filter
 * @returns Array of route maps
 */
export const listPublicRoutes = async (type?: string): Promise<RouteMap[]> => {
  try {
    const queryParams = type ? `?type=${type}` : '';
    const url = `${API_BASE}/public${queryParams}`;
    console.log('Fetching routes from URL:', url);
    
    // No timeout - allow request to complete no matter how long it takes
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`API response not OK: ${response.status} ${response.statusText}`);
      // Log the response body for debugging
      const responseText = await response.text();
      console.error('Response body:', responseText);
      throw new Error(`Failed to fetch public routes: ${response.status} ${response.statusText}`);
    }
    
    // Get the response as text first for debugging
    const responseText = await response.text();
    
    // Try to parse the JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      const parseError = error as Error;
      console.error('JSON parse error:', parseError);
      console.error('Response that failed to parse:', responseText);
      throw new Error(`JSON parse error: ${parseError.message}`);
    }
    
    if (!data || !data.routes) {
      console.log('No routes found in response, returning empty array');
      return [];
    }
    
    console.log(`Found ${data.routes.length} routes`);
    return data.routes;
  } catch (error: unknown) {
    console.error('Error listing public routes:', error);
    // Return empty array instead of mock data
    return [];
  }
};

// Cache for route requests to prevent duplicate API calls
const routeCache: Record<string, {
  data: RouteMap;
  timestamp: number;
}> = {};

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// In-flight requests tracking to prevent duplicate simultaneous requests
const inFlightRequests: Record<string, Promise<RouteMap>> = {};

/**
 * Load a specific route by its persistent ID
 * @param persistentId The persistent ID of the route
 * @param forceRefresh Whether to bypass the cache and force a fresh request
 * @returns The route map data
 */
export const loadPublicRoute = async (persistentId: string, forceRefresh = false): Promise<RouteMap> => {
  // Check cache first if not forcing refresh
  if (!forceRefresh && routeCache[persistentId]) {
    const cachedData = routeCache[persistentId];
    const now = Date.now();
    
    // Return cached data if it's still valid
    if (now - cachedData.timestamp < CACHE_EXPIRATION) {
      console.log(`Using cached data for route ${persistentId}`);
      return cachedData.data;
    } else {
      // Cache expired, remove it
      console.log(`Cache expired for route ${persistentId}`);
      delete routeCache[persistentId];
    }
  }
  
  // Check if there's already a request in flight for this route
  if (persistentId in inFlightRequests) {
    console.log(`Request already in flight for route ${persistentId}, reusing promise`);
    return inFlightRequests[persistentId];
  }
  
  // Create a new request promise
  const requestPromise = (async () => {
    const maxRetries = 2;
    let retryCount = 0;
    let lastError: Error | null = null;
    
    while (retryCount <= maxRetries) {
      try {
        const url = `${API_BASE}/public/${persistentId}`;
        console.log(`Fetching route from URL: ${url} (Attempt ${retryCount + 1}/${maxRetries + 1})`);
        
        // No timeout - allow request to complete no matter how long it takes
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error(`API response not OK: ${response.status} ${response.statusText}`);
          // Log the response body for debugging
          const responseText = await response.text();
          console.error('Response body:', responseText);
          throw new Error(`Failed to load public route: ${response.status} ${response.statusText}`);
        }
        
        // Get the response as text first for debugging
        const responseText = await response.text();
        
        // Try to parse the JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (error) {
          const parseError = error as Error;
          console.error('JSON parse error:', parseError);
          console.error('Response that failed to parse:', responseText);
          throw new Error(`JSON parse error: ${parseError.message}`);
        }
        
        if (!data) {
          console.error('API returned null or undefined data');
          throw new Error('API returned empty data');
        }
        
        // Cache the successful response
        routeCache[persistentId] = {
          data,
          timestamp: Date.now()
        };
        
        return data;
      } catch (error: unknown) {
        lastError = error as Error;
        console.error(`Error loading public route (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
        
        // Only retry on network errors or 5xx server errors
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          retryCount++;
          if (retryCount <= maxRetries) {
            // Exponential backoff: 1s, 2s, 4s, etc.
            const backoffTime = Math.pow(2, retryCount - 1) * 1000;
            console.log(`Retrying in ${backoffTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        } else {
          // Don't retry on other types of errors
          break;
        }
      }
    }
    
    // If we get here, all retries failed
    if (lastError) {
      throw lastError;
    } else {
      throw new Error('Failed to load route after multiple attempts');
    }
  })();
  
  // Store the promise in the in-flight requests
  inFlightRequests[persistentId] = requestPromise;
  
  try {
    // Wait for the request to complete
    const result = await requestPromise;
    return result;
  } finally {
    // Remove from in-flight requests when done (whether successful or not)
    delete inFlightRequests[persistentId];
  }
};

/**
 * Mock implementation for offline development
 * @returns Array of mock route maps
 */
export const getMockRoutes = (): RouteMap[] => {
  return [
    {
      id: '1',
      persistentId: '1',
      name: 'Cradle Mountain',
      type: 'tourism',
      isPublic: true,
      viewCount: 120,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mapState: {
        zoom: 12,
        center: [146.0594, -41.6384], // Cradle Mountain
        bearing: 0,
        pitch: 0
      },
      routes: [
        {
          order: 0,
          routeId: '101',
          name: 'Overland Track',
          color: '#ff4d4d',
          isVisible: true,
          geojson: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [146.0594, -41.6384],
                    [146.0600, -41.6390],
                    [146.0610, -41.6400],
                    [146.0620, -41.6410]
                  ]
                }
              }
            ]
          },
          statistics: {
            totalDistance: 65000, // 65 km
            elevationGain: 2500,
            elevationLoss: 2300,
            maxElevation: 1545,
            minElevation: 720,
            averageSpeed: 0,
            movingTime: 0,
            totalTime: 0
          },
          status: {
            processingState: 'completed',
            progress: 100
          }
        }
      ],
      metadata: {
        country: 'Australia',
        state: 'Tasmania',
        lga: 'Cradle Coast',
        totalDistance: 65,
        totalAscent: 2500,
        unpavedPercentage: 80,
        isLoop: false
      },
      createdBy: {
        name: 'Tasmania Parks'
      }
    },
    {
      id: '2',
      persistentId: '2',
      name: 'Freycinet Peninsula',
      type: 'tourism',
      isPublic: true,
      viewCount: 85,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mapState: {
        zoom: 12,
        center: [148.2982, -42.1571], // Freycinet
        bearing: 0,
        pitch: 0
      },
      routes: [
        {
          order: 0,
          routeId: '201',
          name: 'Wineglass Bay',
          color: '#4d7fff',
          isVisible: true,
          geojson: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [148.2982, -42.1571],
                    [148.2990, -42.1580],
                    [148.3000, -42.1590],
                    [148.3010, -42.1600]
                  ]
                }
              }
            ]
          },
          statistics: {
            totalDistance: 4000, // 4 km
            elevationGain: 300,
            elevationLoss: 300,
            maxElevation: 450,
            minElevation: 0,
            averageSpeed: 0,
            movingTime: 0,
            totalTime: 0
          },
          status: {
            processingState: 'completed',
            progress: 100
          }
        }
      ],
      metadata: {
        country: 'Australia',
        state: 'Tasmania',
        lga: 'East Coast',
        totalDistance: 4,
        totalAscent: 300,
        unpavedPercentage: 20,
        isLoop: true
      },
      createdBy: {
        name: 'Tasmania Parks'
      }
    }
  ];
};
