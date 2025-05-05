import { useAuth } from '../context/AuthContext';

// Base API URL from environment variables
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://lutruwita2-next.vercel.app';

// API service hook
export const useApiService = () => {
  const { getAccessToken } = useAuth();
  
  // Generic fetch function with authentication
  const authenticatedFetch = async (
    endpoint: string, 
    options: RequestInit = {}
  ) => {
    try {
      // Get access token
      const token = await getAccessToken();
      
      // Set up headers with authentication
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
      };
      
      // Make the request
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });
      
      // Check if response is OK
      if (!response.ok) {
        // Handle different error status codes
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required');
        }
        
        throw new Error(`API error: ${response.status}`);
      }
      
      // Parse JSON response
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };
  
  // API methods
  return {
    // Routes
    getRoutes: () => authenticatedFetch('/api/routes'),
    getRouteById: (id: string) => authenticatedFetch(`/api/routes/${id}`),
    
    // User profile
    getUserProfile: () => authenticatedFetch('/api/user/profile'),
    updateUserProfile: (data: any) => authenticatedFetch('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    
    // User saved routes - using the direct API endpoint that bypasses the 405 errors
    getUserSavedRoutes: () => authenticatedFetch('/api/user/saved-routes-direct'),
    saveUserRoute: (routeId: string) => authenticatedFetch('/api/user/saved-routes-direct', {
      method: 'POST',
      body: JSON.stringify({ routeId })
    }),
    deleteUserRoute: (routeId: string) => authenticatedFetch(`/api/user/saved-routes-direct/${routeId}`, {
      method: 'DELETE'
    }),
    
    // Add more API methods as needed
  };
};
