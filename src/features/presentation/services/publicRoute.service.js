class PublicRouteService {
    async listRoutes(type) {
        try {
            const queryParams = type ? `?type=${type}` : '';
            const response = await fetch(`/api/routes/public${queryParams}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error(`[publicRoute.service] API response not OK: ${response.status} ${response.statusText}`);
                throw new Error('Failed to fetch public routes');
            }
            
            // Check content type to ensure we're getting JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error(`[publicRoute.service] Unexpected content type: ${contentType}`);
                throw new Error('API returned non-JSON response');
            }
            
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
            // Add Accept header to ensure we get JSON back
            const response = await fetch(`/api/routes/public/${persistentId}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error(`[publicRoute.service] API response not OK: ${response.status} ${response.statusText}`);
                throw new Error(`Failed to load public route: ${response.status} ${response.statusText}`);
            }
            
            // Check content type to ensure we're getting JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error(`[publicRoute.service] Unexpected content type: ${contentType}`);
                throw new Error('API returned non-JSON response');
            }
            
            // Get the data directly using response.json()
            const data = await response.json();
            
            // Validate the data structure
            if (!data) {
                console.error('[publicRoute.service] API returned null or undefined data');
                throw new Error('API returned empty data');
            }
            
            // Check if the data has the expected structure
            if (!data.routes || !Array.isArray(data.routes)) {
                console.error('[publicRoute.service] API returned data without routes array:', data);
                
                // If the API returns a different structure, try to adapt it
                // This is a fallback in case the API response format has changed
                if (data.route && typeof data.route === 'object') {
                    data.routes = [data.route];
                } else if (Array.isArray(data)) {
                    return { routes: data };
                }
            }
            
            return data;
        }
        catch (error) {
            console.error('[publicRoute.service] Error loading public route:', error);
            throw error;
        }
    }
}
export const publicRouteService = new PublicRouteService();
