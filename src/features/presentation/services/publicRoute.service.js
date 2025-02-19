class PublicRouteService {
    async listRoutes(type) {
        try {
            const queryParams = type ? `?type=${type}` : '';
            const response = await fetch(`/api/routes/public${queryParams}`);
            if (!response.ok)
                throw new Error('Failed to fetch public routes');
            const data = await response.json();
            return data.routes;
        }
        catch (error) {
            console.error('Error listing public routes:', error);
            throw error;
        }
    }
    async loadRoute(persistentId) {
        try {
            const response = await fetch(`/api/routes/public/${persistentId}`);
            if (!response.ok)
                throw new Error('Failed to load public route');
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error('Error loading public route:', error);
            throw error;
        }
    }
}
export const publicRouteService = new PublicRouteService();
