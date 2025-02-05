import { POIType, NewPOIInput } from '../types/poi.types';

const API = {
  async getAllPOIs(): Promise<POIType[]> {
    const response = await fetch('/api/pois');
    if (!response.ok) throw new Error('Failed to fetch POIs');
    return response.json();
  },

  async createPOI(poi: NewPOIInput): Promise<POIType> {
    const response = await fetch('/api/pois', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(poi),
    });
    if (!response.ok) throw new Error('Failed to create POI');
    return response.json();
  },

  async updatePOI(id: string, updates: Partial<POIType>): Promise<POIType> {
    const response = await fetch(`/api/pois/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update POI');
    return response.json();
  },

  async deletePOI(id: string): Promise<void> {
    const response = await fetch(`/api/pois/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete POI');
  },
};

export default API;
