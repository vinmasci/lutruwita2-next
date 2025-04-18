/**
 * Route Service for Mobile App
 * 
 * This service handles fetching routes and maps from the API.
 * It provides methods to list public routes and load specific routes.
 * It now supports loading pre-processed data from Cloudinary for better performance.
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

export interface UnpavedSection {
  startIndex: number;
  endIndex: number;
  coordinates: [number, number][];
  surfaceType: string;
  _id: string;
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
  unpavedSections?: UnpavedSection[]; // Array of unpaved sections
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
  embedUrl?: string; // URL to pre-processed data in Cloudinary
  boundingBox?: [[number, number], [number, number]]; // [[minLng, minLat], [maxLng, maxLat]]
}

// API base URL - use environment variable for API URL
// Simplify the URL construction to avoid potential issues
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
console.log('Raw API URL from env:', API_URL);

// Always use the format: baseURL/api/routes
const API_BASE = `${API_URL}/api/routes`;
console.log('Constructed API_BASE:', API_BASE);

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
    console.log('API_BASE value:', API_BASE);
    console.log('Environment variables:', {
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.substring(0, 10) + '...',
    });
    
    // Log request details
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    console.log('Request headers:', headers);
    
    // Declare data variable outside the try-catch block
    let data: any = null;
    
    try {
      // No timeout - allow request to complete no matter how long it takes
      console.log('Starting fetch request...');
      const response = await fetch(url, {
        headers,
        method: 'GET'
      });
      
      console.log('Fetch response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: JSON.stringify(Object.fromEntries([...response.headers.entries()])),
        ok: response.ok,
        type: response.type,
        url: response.url
      });
      
      if (!response.ok) {
        console.error(`API response not OK: ${response.status} ${response.statusText}`);
        // Log the response body for debugging
        const responseText = await response.text();
        console.error('Error response body:', responseText);
        throw new Error(`Failed to fetch public routes: ${response.status} ${response.statusText}`);
      }
      
      // Get the response as text first for debugging
      const responseText = await response.text();
      console.log('Response text length:', responseText.length);
      console.log('Response text preview:', responseText.substring(0, 200) + '...');
      
      // Try to parse the JSON
      try {
        data = JSON.parse(responseText);
        console.log('JSON parsed successfully');
      } catch (error) {
        const parseError = error as Error;
        console.error('JSON parse error:', parseError);
        console.error('Response that failed to parse:', responseText);
        throw new Error(`JSON parse error: ${parseError.message}`);
      }
    } catch (fetchError: unknown) {
      const error = fetchError as Error;
      // Log the entire error object for more details
      console.error('-----------------------------------------');
      console.error('Fetch Error Object:', JSON.stringify(fetchError, null, 2));
      console.error('-----------------------------------------');
      console.error('Fetch error details:', error); // Keep original log
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error; // Re-throw the original error object
    }
    
    if (!data || !data.routes) {
      console.log('No routes found in response, returning empty array');
      return [];
    }
    
    console.log(`Found ${data.routes.length} routes`);
    return data.routes;
  } catch (error: unknown) {
    // Also log the detailed error here if it propagates
    console.error('-----------------------------------------');
    console.error('Error listing public routes (outer catch):', JSON.stringify(error, null, 2));
    console.error('-----------------------------------------');
    console.error('Error listing public routes:', error);
    // Return empty array instead of mock data in case of error
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
 * Helper function to calculate the bounding box from route coordinates
 * @param coordinates Array of [longitude, latitude] coordinates
 * @returns Bounding box as [[minLng, minLat], [maxLng, maxLat]]
 */
export const calculateBoundingBox = (coordinates: [number, number][]): [[number, number], [number, number]] => {
  if (!coordinates || coordinates.length === 0) {
    // Default to Tasmania if no coordinates
    return [[145.0, -43.0], [148.0, -40.0]];
  }

  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];

  coordinates.forEach(coord => {
    minLng = Math.min(minLng, coord[0]);
    maxLng = Math.max(maxLng, coord[0]);
    minLat = Math.min(minLat, coord[1]);
    maxLat = Math.max(maxLat, coord[1]);
  });

  return [[minLng, minLat], [maxLng, maxLat]];
};

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
        // First, get the route metadata to check for embedUrl
        const metadataUrl = `${API_BASE}/embed/${persistentId}`;
        console.log(`Fetching route metadata from URL: ${metadataUrl} (Attempt ${retryCount + 1}/${maxRetries + 1})`);
        
        const metadataResponse = await fetch(metadataUrl, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!metadataResponse.ok) {
          console.error(`API metadata response not OK: ${metadataResponse.status} ${metadataResponse.statusText}`);
          // Log the response body for debugging
          const responseText = await metadataResponse.text();
          console.error('Metadata response body:', responseText);
          throw new Error(`Failed to load route metadata: ${metadataResponse.status} ${metadataResponse.statusText}`);
        }
        
        // Parse the metadata response
        const metadataText = await metadataResponse.text();
        let metadata;
        
        try {
          metadata = JSON.parse(metadataText);
          console.log('Metadata JSON parsed successfully');
        } catch (error) {
          const parseError = error as Error;
          console.error('Metadata JSON parse error:', parseError);
          console.error('Response that failed to parse:', metadataText);
          throw new Error(`Metadata JSON parse error: ${parseError.message}`);
        }
        
        // Check if we have an embedUrl in the metadata
        if (metadata && metadata.embedUrl) {
          console.log(`Found embedUrl in metadata: ${metadata.embedUrl}`);
          
          try {
            // Add a timestamp parameter to force a fresh version
            const cloudinaryUrl = `${metadata.embedUrl}?t=${Date.now()}`;
            console.log(`Fetching pre-processed data from Cloudinary: ${cloudinaryUrl}`);
            
            // Fetch the data from Cloudinary
            const cloudinaryResponse = await fetch(cloudinaryUrl);
            
            if (cloudinaryResponse.ok) {
              // Parse the Cloudinary response
              const cloudinaryText = await cloudinaryResponse.text();
              let cloudinaryData;
              
              try {
                cloudinaryData = JSON.parse(cloudinaryText);
                console.log('Cloudinary JSON parsed successfully');
              } catch (error) {
                const parseError = error as Error;
                console.error('Cloudinary JSON parse error:', parseError);
                // Don't log the full response as it might be very large
                console.error('Cloudinary response parse error, falling back to API');
                // Fall through to API fallback
                throw new Error(`Cloudinary JSON parse error: ${parseError.message}`);
              }
              
              // Process the Cloudinary data
              console.log(`Successfully loaded pre-processed data from Cloudinary: ${cloudinaryData.name || 'Unnamed'}`);
              
              // Ensure the data has the required structure
              const processedData = {
                ...cloudinaryData,
                // Make sure embedUrl is included
                embedUrl: metadata.embedUrl
              };
              
              // Calculate bounding box for the route if it has coordinates
              if (processedData.routes && processedData.routes.length > 0) {
                const firstRoute = processedData.routes[0];
                if (firstRoute.geojson && 
                    firstRoute.geojson.features && 
                    firstRoute.geojson.features.length > 0 &&
                    firstRoute.geojson.features[0].geometry &&
                    firstRoute.geojson.features[0].geometry.coordinates) {
                  
                  const coordinates = firstRoute.geojson.features[0].geometry.coordinates;
                  const boundingBox = calculateBoundingBox(coordinates);
                  
                  // Add bounding box to the route data
                  processedData.boundingBox = boundingBox;
                  console.log('Added bounding box to route data:', boundingBox);
                }
              }
              
              // Cache the successful response
              routeCache[persistentId] = {
                data: processedData,
                timestamp: Date.now()
              };
              
              return processedData;
            } else {
              console.error(`Cloudinary response not OK: ${cloudinaryResponse.status} ${cloudinaryResponse.statusText}`);
              // Fall through to API fallback
            }
          } catch (cloudinaryError) {
            console.error('Error loading from Cloudinary:', cloudinaryError);
            console.log('Falling back to API...');
            // Fall through to API fallback
          }
        }
        
        // Fallback to direct API request if Cloudinary approach fails
        const url = `${API_BASE}/public/${persistentId}`;
        console.log(`Falling back to direct API request: ${url}`);
        
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
        
        // Calculate bounding box for the route if it has coordinates
        if (data.routes && data.routes.length > 0) {
          const firstRoute = data.routes[0];
          if (firstRoute.geojson && 
              firstRoute.geojson.features && 
              firstRoute.geojson.features.length > 0 &&
              firstRoute.geojson.features[0].geometry &&
              firstRoute.geojson.features[0].geometry.coordinates) {
            
            const coordinates = firstRoute.geojson.features[0].geometry.coordinates;
            const boundingBox = calculateBoundingBox(coordinates);
            
            // Add bounding box to the route data
            data.boundingBox = boundingBox;
            console.log('Added bounding box to route data:', boundingBox);
          }
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
