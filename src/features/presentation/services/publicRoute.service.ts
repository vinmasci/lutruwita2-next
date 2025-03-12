import { ListPublicRoutesResponse, LoadPublicRouteResponse, PublicRouteMetadata } from '../types/route.types';

class PublicRouteService {
  async listRoutes(type?: string): Promise<PublicRouteMetadata[]> {
    try {
      const queryParams = type ? `?type=${type}` : '';
      const response = await fetch(`/api/routes/public${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch public routes');
      const data: ListPublicRoutesResponse = await response.json();
      return data.routes;
    } catch (error) {
      console.error('Error listing public routes:', error);
      throw error;
    }
  }

  async loadRoute(persistentId: string): Promise<LoadPublicRouteResponse> {
    try {
      const response = await fetch(`/api/routes/public/${persistentId}`);
      if (!response.ok) throw new Error('Failed to load public route');
      const data: LoadPublicRouteResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading public route:', error);
      throw error;
    }
  }
}

export const publicRouteService = new PublicRouteService();
