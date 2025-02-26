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
            console.log(`[publicRoute.service] Fetching route with persistentId: ${persistentId}`);
            
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
            
            console.log(`[publicRoute.service] Response received, status: ${response.status}`);
            
            // Check content type to ensure we're getting JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error(`[publicRoute.service] Unexpected content type: ${contentType}`);
                throw new Error('API returned non-JSON response');
            }
            
            // Get the data directly using response.json()
            const data = await response.json();
            console.log(`[publicRoute.service] Parsed JSON data:`, data);
            
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
                    console.log('[publicRoute.service] Found route object, adapting data structure');
                    data.routes = [data.route];
                } else if (Array.isArray(data)) {
                    console.log('[publicRoute.service] Data is an array, adapting data structure');
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
