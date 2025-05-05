/**
 * Authenticated Route Service for Mobile App
 * 
 * This service extends the functionality of routeService.ts by adding
 * authentication support for accessing protected routes and user-specific data.
 */

import { useApiService } from './apiService';
import { 
  RouteMap, 
  RouteData, 
  calculateBoundingBox 
} from './routeService';

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
 * Hook for accessing authenticated route services
 */
export const useAuthenticatedRouteService = () => {
  const api = useApiService();
  
  /**
   * List user's saved routes
   * @returns Array of route maps saved by the user
   */
  const listUserRoutes = async (): Promise<RouteMap[]> => {
    try {
      // CRITICAL BUG FIX: Use getUserSavedRoutes instead of getRoutes
      // The previous implementation was using api.getRoutes() which returns ALL routes,
      // not just the user's saved routes
      const data = await api.getUserSavedRoutes();
      
      if (!data || !data.routes) {
        console.log('No user routes found, returning empty array');
        return [];
      }
      
      console.log(`Found ${data.routes.length} user routes`);
      return data.routes;
    } catch (error) {
      console.error('Error listing user routes:', error);
      return [];
    }
  };
  
  /**
   * Load a specific route by its persistent ID with authentication
   * @param persistentId The persistent ID of the route
   * @param forceRefresh Whether to bypass the cache and force a fresh request
   * @returns The route map data
   */
  const loadUserRoute = async (persistentId: string, forceRefresh = false): Promise<RouteMap> => {
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
      try {
        // Get the route data with authentication
        const data = await api.getRouteById(persistentId);
        
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
      } catch (error) {
        console.error('Error loading user route:', error);
        throw error;
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
   * Save a route to the user's saved routes
   * @param routeId The ID of the route to save
   * @returns Success status
   */
  const saveRoute = async (routeId: string): Promise<boolean> => {
    try {
      // Use the API service to save the route
      await api.saveUserRoute(routeId);
      return true;
    } catch (error) {
      console.error('Error saving route:', error);
      throw error;
    }
  };

  /**
   * Remove a route from the user's saved routes
   * @param routeId The ID of the route to remove
   * @returns Success status
   */
  const removeRoute = async (routeId: string): Promise<boolean> => {
    try {
      // Use the API service to remove the route
      await api.deleteUserRoute(routeId);
      return true;
    } catch (error) {
      console.error('Error removing route:', error);
      throw error;
    }
  };
  
  return {
    listUserRoutes,
    loadUserRoute,
    saveRoute,
    removeRoute
  };
};
