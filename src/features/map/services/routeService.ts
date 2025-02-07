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
      if (isJson) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'An error occurred');
      } else {
        const text = await response.text();
        throw new Error(text || `HTTP error! status: ${response.status}`);
      }
    }
    
    if (isJson) {
      return response.json();
    }
    return response.text();
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
      
// Transform frontend IDs to MongoDB _ids for POIs
const transformedData = {
  ...routeData,
  pois: {
    draggable: routeData.pois.draggable.map(poi => ({
      ...poi,
      _id: poi.id,
      id: undefined
    })),
    places: routeData.pois.places.map(poi => ({
      ...poi,
      _id: poi.id,
      id: undefined
    }))
  }
};

const response = await fetch(`${API_BASE}/save`, {
  method: 'POST',
  headers,
  body: JSON.stringify(transformedData),
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

  const loadRoute = async (id: string): Promise<LoadRouteResponse> => {
    try {
      const headers = await getAuthHeaders();
      console.log('[routeService] Loading route:', id);
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      console.log('[routeService] Load response status:', response.status);
      const data = await handleResponse(response);
      console.log('[routeService] Loaded route data:', data);
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

  const deleteRoute = async (id: string): Promise<void> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/${id}`, {
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
