import { useAuth0 } from '@auth0/auth0-react';
export const useRouteService = () => {
    const { getAccessTokenSilently } = useAuth0();
    // Always use relative URL for serverless deployment
    const API_BASE = '/api/routes';
    const getAuthHeaders = async () => {
        try {
            const token = await getAccessTokenSilently();
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
        }
        catch (error) {
            console.error('Failed to get auth token:', error);
            throw new Error('Authentication required');
        }
    };
    const handleResponse = async (response) => {
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        if (!response.ok) {
            // Clone the response before reading it
            const responseClone = response.clone();
            try {
                if (isJson) {
                    const error = await responseClone.json();
                    console.error('[routeService] Error details:', error);
                    throw new Error(error.details || error.error || 'An error occurred');
                }
                else {
                    const text = await responseClone.text();
                    console.error('[routeService] Error details:', text);
                    throw new Error(text || `HTTP error! status: ${response.status}`);
                }
            }
            catch (parseError) {
                console.error('[routeService] Failed to parse error response:', parseError);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
        try {
            if (isJson) {
                return await response.json();
            }
            return await response.text();
        }
        catch (parseError) {
            console.error('[routeService] Failed to parse response:', parseError);
            throw new Error('Failed to parse server response');
        }
    };
    const saveRoute = async (routeData) => {
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
            
            // Transform the data structure to match what the API expects
            // The API requires a 'data' field, but our client uses 'routes'
            const transformedData = {
                ...routeData,
                // Ensure persistentId is in UUID format if not already set
                persistentId: routeData.persistentId || generateUUID(),
                data: {
                    // Store all routes in the data structure
                    allRoutes: routeData.routes || [],
                    
                    // For backward compatibility, keep the first route's data in the expected fields
                    geojson: routeData.routes && routeData.routes.length > 0 ? routeData.routes[0].geojson : null,
                    
                    // Extract points from the geojson if available
                    points: routeData.routes && routeData.routes.length > 0 && 
                            routeData.routes[0].geojson && 
                            routeData.routes[0].geojson.features && 
                            routeData.routes[0].geojson.features.length > 0 ? 
                            routeData.routes[0].geojson.features[0].geometry.coordinates : [],
                    
                    // Include other statistics if available
                    distance: routeData.routes && routeData.routes.length > 0 && 
                              routeData.routes[0].statistics ? 
                              routeData.routes[0].statistics.totalDistance : 0,
                    
                    elevation: {
                        gain: routeData.routes && routeData.routes.length > 0 && 
                              routeData.routes[0].statistics ? 
                              routeData.routes[0].statistics.elevationGain : 0,
                        loss: routeData.routes && routeData.routes.length > 0 && 
                              routeData.routes[0].statistics ? 
                              routeData.routes[0].statistics.elevationLoss : 0,
                        min: routeData.routes && routeData.routes.length > 0 && 
                             routeData.routes[0].statistics ? 
                             routeData.routes[0].statistics.minElevation : 0,
                        max: routeData.routes && routeData.routes.length > 0 && 
                             routeData.routes[0].statistics ? 
                             routeData.routes[0].statistics.maxElevation : 0
                    },
                    
                    // Add bounds data - required by the MongoDB schema
                    bounds: calculateBounds(routeData)
                }
            };
            
            // Helper function to generate a UUID
            function generateUUID() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }
            
            // Helper function to calculate bounds from route data
            function calculateBounds(routeData) {
                // Default bounds if we can't calculate from coordinates
                const defaultBounds = {
                    north: 90,
                    south: -90,
                    east: 180,
                    west: -180
                };
                
                // Try to extract coordinates from the route's geojson
                if (routeData.routes && 
                    routeData.routes.length > 0 && 
                    routeData.routes[0].geojson && 
                    routeData.routes[0].geojson.features && 
                    routeData.routes[0].geojson.features.length > 0 &&
                    routeData.routes[0].geojson.features[0].geometry &&
                    routeData.routes[0].geojson.features[0].geometry.coordinates &&
                    routeData.routes[0].geojson.features[0].geometry.coordinates.length > 0) {
                    
                    const coordinates = routeData.routes[0].geojson.features[0].geometry.coordinates;
                    
                    // Initialize bounds with the first coordinate
                    let north = coordinates[0][1]; // latitude
                    let south = coordinates[0][1]; // latitude
                    let east = coordinates[0][0];  // longitude
                    let west = coordinates[0][0];  // longitude
                    
                    // Find min/max values from all coordinates
                    coordinates.forEach(coord => {
                        const lon = coord[0];
                        const lat = coord[1];
                        
                        north = Math.max(north, lat);
                        south = Math.min(south, lat);
                        east = Math.max(east, lon);
                        west = Math.min(west, lon);
                    });
                    
                    return {
                        north,
                        south,
                        east,
                        west
                    };
                }
                
                // If we couldn't extract coordinates, return default bounds
                return defaultBounds;
            }
            
            console.log('[routeService] Transformed data for API:', JSON.stringify(transformedData, null, 2));
            
            // If routeData has a persistentId, it's an update to an existing route
            const endpoint = routeData.persistentId ? `${API_BASE}/${routeData.persistentId}` : `${API_BASE}/save`;
            const method = routeData.persistentId ? 'PUT' : 'POST';
            const response = await fetch(endpoint, {
                method,
                headers,
                body: JSON.stringify(transformedData),
                credentials: 'include'
            });
            console.log('[routeService] Save response status:', response.status);
            const result = await handleResponse(response);
            console.log('[routeService] Server response:', result);
            console.log('[routeService] POIs have been saved to MongoDB');
            return result;
        }
        catch (error) {
            console.error('Save route error:', error);
            throw error;
        }
    };
    const loadRoute = async (persistentId) => {
        try {
            const headers = await getAuthHeaders();
            console.log('[routeService] Loading route:', persistentId);
            const response = await fetch(`${API_BASE}/${persistentId}`, {
                method: 'GET',
                headers,
                credentials: 'include'
            });
            console.log('[routeService] Load response status:', response.status);
            const data = await handleResponse(response);
            console.log('[routeService] Loaded route data:', data);
            
            // Transform the API response to match what the client expects
            let transformedData = data;
            
            // Check if this is the new API format (with data field but no routes array)
            if (data.data && !data.routes) {
                console.log('[routeService] Detected new API format, transforming data');
                
                // Check if we have allRoutes in the data field (our new format)
                if (data.data.allRoutes && Array.isArray(data.data.allRoutes) && data.data.allRoutes.length > 0) {
                    console.log('[routeService] Found allRoutes in data, using these routes');
                    
                    // Use the allRoutes array directly
                    transformedData = {
                        ...data,
                        routes: data.data.allRoutes
                    };
                } else {
                    // Fallback to creating a single route from the data field
                    console.log('[routeService] No allRoutes found, creating a single route from data');
                    
                    // Create a route object from the data field
                    const routeObject = {
                        routeId: `route-${Date.now()}`,
                        name: data.name || 'Unnamed Route',
                        color: '#ff4d4d', // Default color
                        isVisible: true,
                        geojson: data.data.geojson || null,
                        statistics: {
                            totalDistance: data.data.distance || 0,
                            elevationGain: data.data.elevation?.gain || 0,
                            elevationLoss: data.data.elevation?.loss || 0,
                            maxElevation: data.data.elevation?.max || 0,
                            minElevation: data.data.elevation?.min || 0,
                            averageSpeed: 0,
                            movingTime: 0,
                            totalTime: 0
                        },
                        status: {
                            processingState: 'completed',
                            progress: 100
                        }
                    };
                    
                    // Create a transformed data structure with routes array
                    transformedData = {
                        ...data,
                        routes: [routeObject]
                    };
                }
                
                console.log('[routeService] Transformed data:', transformedData);
            }
            
            // Handle both formats: data.route (old format) or data directly (new format)
            // Check if the data has a 'route' property or if it has 'routes' directly
            const routeData = transformedData.route || transformedData;
            
            // Add detailed logging for route data
            if (routeData && routeData.routes && routeData.routes.length > 0) {
                console.log('[routeService] First route details:', {
                    id: routeData.routes[0].id,
                    routeId: routeData.routes[0].routeId,
                    hasGeojson: Boolean(routeData.routes[0].geojson),
                    geojsonFeatures: routeData.routes[0].geojson?.features?.length || 0,
                    persistentId: routeData.persistentId
                });
                
                if (!routeData.routes[0].geojson) {
                    console.error('[routeService] Missing GeoJSON data in route');
                }
            }
            else {
                console.error('[routeService] No routes found in response');
            }
            
            // If the data doesn't have a 'route' property but has 'routes' directly,
            // wrap it in a 'route' property to maintain compatibility with the rest of the code
            if (!transformedData.route && transformedData.routes) {
                return { route: transformedData };
            }
            
            return transformedData;
        }
        catch (error) {
            console.error('Load route error:', error);
            throw error;
        }
    };
    const listRoutes = async (filters) => {
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
        }
        catch (error) {
            console.error('List routes error:', error);
            throw error;
        }
    };
    const deleteRoute = async (persistentId) => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE}/${persistentId}`, {
                method: 'DELETE',
                headers,
                credentials: 'include'
            });
            await handleResponse(response);
        }
        catch (error) {
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
