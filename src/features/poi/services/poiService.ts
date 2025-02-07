import { useAuth0 } from '@auth0/auth0-react';
import { POIType, NewPOIInput } from '../types/poi.types';

export const usePOIService = () => {
  const { getAccessTokenSilently } = useAuth0();
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/pois';

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

  const getAllPOIs = async (): Promise<POIType[]> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(API_BASE, {
        headers,
        credentials: 'include'
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Get POIs error:', error);
      throw error;
    }
  };

  const createPOI = async (poi: POIType): Promise<POIType> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers,
        body: JSON.stringify(poi),
        credentials: 'include'
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Create POI error:', error);
      throw error;
    }
  };

  const updatePOI = async (id: string, updates: Partial<POIType>): Promise<POIType> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
        credentials: 'include'
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Update POI error:', error);
      throw error;
    }
  };

  const deletePOI = async (id: string): Promise<void> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      await handleResponse(response);
    } catch (error) {
      console.error('Delete POI error:', error);
      throw error;
    }
  };

  return {
    getAllPOIs,
    createPOI,
    updatePOI,
    deletePOI
  };
};
