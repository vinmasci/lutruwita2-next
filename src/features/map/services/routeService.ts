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
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/routes';

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
      const headers = await getAuthHeaders();
      
      console.log('[routeService] Making API call to:', `${API_BASE}/save`);
      console.log('[routeService] Request headers:', headers);
      console.log('[routeService] Request body:', routeData);

      const response = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify(routeData),
        credentials: 'include'
      });

      console.log('[routeService] Save response status:', response.status);
      return handleResponse(response);
    } catch (error) {
      console.error('Save route error:', error);
      throw error;
    }
  };

  const loadRoute = async (id: string): Promise<LoadRouteResponse> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      return handleResponse(response);
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
