import {
  SavedRouteState,
  SaveRouteRequest,
  SaveRouteResponse,
  LoadRouteResponse,
  ListRoutesResponse,
} from '../types/route.types';

export const useRouteService = () => {
  const API_BASE = 'http://localhost:3000/api/routes';

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    // Auth header will be added automatically by the browser
  });

  const handleResponse = async (response: Response) => {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'An error occurred');
    }
    return response.json();
  };

  const saveRoute = async (
    routeData: SavedRouteState
  ): Promise<SaveRouteResponse> => {
    try {
      console.log('Making save route API call to:', `${API_BASE}/save`);
      console.log('Request headers:', getAuthHeaders());
      console.log('Request body:', routeData);

      const response = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(routeData),
      });

      console.log('Save route response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save route API error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to save route');
      }

      const result = await response.json();
      console.log('Save route API success:', result);
      return result;
    } catch (error) {
      console.error('Save route error:', error);
      throw error;
    }
  };

  const loadRoute = async (id: string): Promise<LoadRouteResponse> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
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
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('List routes error:', error);
      throw error;
    }
  };

  const deleteRoute = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to delete route');
      }
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
