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
const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/routes`;

/**
 * List public routes with optional type filter
 * @param type Optional route type filter
 * @returns Array of route maps
 */
export const listPublicRoutes = async (type?: string): Promise<RouteMap[]> => {
  try {
    const queryParams = type ? `?type=${type}` : '';
    const response = await fetch(`${API_BASE}/public${queryParams}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`API response not OK: ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch public routes');
    }
    
    const data = await response.json();
    
    if (!data.routes) {
      return [];
    }
    
    return data.routes;
  } catch (error) {
    console.error('Error listing public routes:', error);
    throw error;
  }
};

/**
 * Load a specific route by its persistent ID
 * @param persistentId The persistent ID of the route
 * @returns The route map data
 */
export const loadPublicRoute = async (persistentId: string): Promise<RouteMap> => {
  try {
    const response = await fetch(`${API_BASE}/public/${persistentId}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`API response not OK: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to load public route: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data) {
      console.error('API returned null or undefined data');
      throw new Error('API returned empty data');
    }
    
    return data;
  } catch (error) {
    console.error('Error loading public route:', error);
    throw error;
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
