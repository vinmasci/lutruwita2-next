import { useAuth0 } from '@auth0/auth0-react';
import { POIType, NewPOIInput } from '../types/poi.types';

export const usePOIService = () => {
  const { getAccessTokenSilently } = useAuth0();
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/pois` : '/api/pois';

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

  const getAllPOIs = async (): Promise<{ draggable: POIType[]; places: POIType[] }> => {
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

  const savePOIs = async (pois: { draggable: POIType[]; places: POIType[] }): Promise<{ draggable: POIType[]; places: POIType[] }> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers,
        body: JSON.stringify(pois),
        credentials: 'include'
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Save POIs error:', error);
      throw error;
    }
  };

  const deleteAllPOIs = async (): Promise<void> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(API_BASE, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      await handleResponse(response);
    } catch (error) {
      console.error('Delete POIs error:', error);
      throw error;
    }
  };

  return {
    getAllPOIs,
    savePOIs,
    deleteAllPOIs
  };
};
