import { useAuth0 } from '@auth0/auth0-react';
import {
  SavedRouteState,
  SaveRouteRequest,
  SaveRouteResponse,
  LoadRouteResponse,
  ListRoutesResponse,
} from '../types/route.types';

export const useRouteService = () => {
  const { getAccessTokenSilently } = useAuth0();
  
  // Use environment variable for API base
  const API_BASE = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/routes` : 'http://localhost:8080/api/routes';

  const getAuthHeaders = async () => {
    try {
      const token = await getAccessTokenSilently();
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    } catch (error) {
      console.error('Failed to get auth token:', error);
      throw new Error('Authentication required');
    }
  };

  const handleResponse = async (response: Response) => {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    if (!response.ok) {
      // Clone the response before reading it
      const responseClone = response.clone();
      
      try {
        if (isJson) {
          const error = await responseClone.json();
          console.error('[routeService] Error details:', error);
          throw new Error(error.details || error.error || 'An error occurred');
        } else {
          const text = await responseClone.text();
          console.error('[routeService] Error details:', text);
          throw new Error(text || `HTTP error! status: ${response.status}`);
        }
      } catch (parseError) {
        console.error('[routeService] Failed to parse error response:', parseError);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    
    try {
      if (isJson) {
        return await response.json();
      }
      return await response.text();
    } catch (parseError) {
      console.error('[routeService] Failed to parse response:', parseError);
      throw new Error('Failed to parse server response');
    }
  };

  const saveRoute = async (
    routeData: SavedRouteState
  ): Promise<SaveRouteResponse> => {
    try {
      console.log('[routeService] Starting save route...');
      console.log('[routeService] POIs to save:', {
        draggable: routeData.pois.draggable.length + ' POIs',
        places: routeData.pois.places.length + ' POIs'
      });
      console.log('[routeService] POI details:', routeData.pois);
      
      const headers = await getAuthHeaders();
      console.log('[routeService] Making API call to:', API_BASE);
      console.log('[routeService] Request headers:', headers);
      console.log('[routeService] Request body:', JSON.stringify(routeData, null, 2));

      console.log('[routeService] POI raw data:', JSON.stringify(routeData.pois, null, 2));
      console.log('[routeService] Full route data:', JSON.stringify(routeData, null, 2));
      
// If routeData has a persistentId, it's an update to an existing route
const endpoint = routeData.persistentId ? `${API_BASE}/${routeData.persistentId}` : `${API_BASE}/save`;
const method = routeData.persistentId ? 'PUT' : 'POST';

const response = await fetch(endpoint, {
  method,
  headers,
  body: JSON.stringify(routeData),
  credentials: 'include'
});

      console.log('[routeService] Save response status:', response.status);
      
      const result = await handleResponse(response);
      console.log('[routeService] Server response:', result);
      console.log('[routeService] POIs have been saved to MongoDB');
      return result;
    } catch (error) {
      console.error('Save route error:', error);
      throw error;
    }
  };

  const loadRoute = async (persistentId: string): Promise<LoadRouteResponse> => {
    try {
      const headers = await getAuthHeaders();
      console.log('[routeService] Loading route:', persistentId);
      const response = await fetch(`${API_BASE}/${persistentId}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      console.log('[routeService] Load response status:', response.status);
      const data = await handleResponse(response);
      console.log('[routeService] Loaded route data:', data);
      
      // Add detailed logging for route data
      if (data.route && data.route.routes && data.route.routes.length > 0) {
        console.log('[routeService] First route details:', {
          id: data.route.routes[0].id,
          routeId: data.route.routes[0].routeId,
          hasGeojson: Boolean(data.route.routes[0].geojson),
          geojsonFeatures: data.route.routes[0].geojson?.features?.length || 0
        });
        
        if (!data.route.routes[0].geojson) {
          console.error('[routeService] Missing GeoJSON data in route');
        }
      } else {
        console.error('[routeService] No routes found in response');
      }
      
      return data;
    } catch (error) {
      console.error('Load route error:', error);
      throw error;
    }
  };

  const listRoutes = async (
    filters?: { type?: string; isPublic?: boolean }
  ): Promise<ListRoutesResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.type) {
        queryParams.append('type', filters.type);
      }
      if (filters?.isPublic !== undefined) {
        queryParams.append('isPublic', String(filters.isPublic));
      }

      const url = `${API_BASE}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      return handleResponse(response);
    } catch (error) {
      console.error('List routes error:', error);
      throw error;
    }
  };

  const deleteRoute = async (persistentId: string): Promise<void> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/${persistentId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      await handleResponse(response);
    } catch (error) {
      console.error('Delete route error:', error);
      throw error;
    }
  };

  return {
    saveRoute,
    loadRoute,
    listRoutes,
    deleteRoute,
  };
};
