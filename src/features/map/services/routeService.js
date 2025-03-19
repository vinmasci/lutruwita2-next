import { useAuth0 } from '@auth0/auth0-react';
import { compressJSON, decompressJSON } from '../../../utils/compression';

export const useRouteService = () => {
    const { getAccessTokenSilently, user } = useAuth0();
    const userId = user?.sub;
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

    // Function to fetch location data from coordinates using a reverse geocoding API
    const fetchLocationData = async (coordinates) => {
        try {
            if (!coordinates || coordinates.length < 2) {
                console.error('[routeService] Invalid coordinates for location lookup:', coordinates);
                return null;
            }
            
            const [longitude, latitude] = coordinates;
            
            // Use OpenStreetMap Nominatim API for reverse geocoding
            // This is a free service with usage limits (1 request per second)
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
            
            console.log('[routeService] Fetching location data from:', url);
            
            const response = await fetch(url, {
                headers: {
                    // Add a user agent as required by Nominatim's usage policy
                    'User-Agent': 'Lutruwita-Route-Planner/1.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('[routeService] Nominatim response:', data);
            
            // Extract state and LGA information from the response
            const locationData = {
                state: '',
                lga: ''
            };
            
            if (data.address) {
                // For Australia, the state is usually in state or state_district
                locationData.state = data.address.state || 
                                    data.address.state_district || 
                                    data.address.region || 
                                    '';
                
                // LGA could be in county, municipality, city_district, or similar fields
                locationData.lga = data.address.county || 
                                data.address.municipality || 
                                data.address.city_district || 
                                data.address.district || 
                                data.address.suburb || 
                                '';
            }
            
            console.log('[routeService] Extracted location data:', locationData);
            return locationData;
        } catch (error) {
            console.error('[routeService] Error fetching location data:', error);
            return null;
        }
    };

    const saveRoute = async (routeData) => {
        try {
            console.log('[routeService] Starting save route...');
            
            // Add userId to the routeData
            const routeDataWithUserId = {
                ...routeData,
                userId: userId // Use the userId from Auth0
            };
            
            const headers = await getAuthHeaders();
            
            // Use existing metadata from routes if available, otherwise use empty object
            const routeMetadata = {};
            
            // Collect metadata from all routes
            if (routeData.routes && routeData.routes.length > 0) {
                // Gather metadata from all routes
                const countries = new Set();
                const states = new Set();
                const lgas = new Set();
                let totalDistance = 0;
                let totalAscent = 0;
                let totalUnpavedDistance = 0;
                let totalRouteDistance = 0;
                let isLoop = false;
                
                // First, check if we have a routeSummary in the routeData
                if (routeData.routeSummary) {
                    console.log('[routeService] Using existing route summary:', routeData.routeSummary);
                    
                    // Use the existing summary data
                    if (routeData.routeSummary.countries) {
                        routeData.routeSummary.countries.forEach(country => countries.add(country));
                    }
                    if (routeData.routeSummary.states) {
                        routeData.routeSummary.states.forEach(state => states.add(state));
                    }
                    if (routeData.routeSummary.lgas) {
                        routeData.routeSummary.lgas.forEach(lga => lgas.add(lga));
                    }
                    
                    totalDistance = routeData.routeSummary.totalDistance * 1000 || 0; // Convert back to meters
                    totalAscent = routeData.routeSummary.totalAscent || 0;
                    isLoop = routeData.routeSummary.isLoop || false;
                    
                    // Calculate unpaved percentage
                    const unpavedPercentage = routeData.routeSummary.unpavedPercentage || 0;
                    totalUnpavedDistance = (totalDistance * unpavedPercentage / 100);
                    totalRouteDistance = totalDistance;
                } else {
                    // Calculate from individual routes
                    routeData.routes.forEach(route => {
                        if (route.metadata) {
                            if (route.metadata.country) countries.add(route.metadata.country);
                            if (route.metadata.state) states.add(route.metadata.state);
                            if (route.metadata.lga) lgas.add(route.metadata.lga);
                            isLoop = isLoop || route.metadata.isLoop;
                        }
                        
                        // Add distance and ascent
                        if (route.statistics) {
                            totalDistance += route.statistics.totalDistance || 0;
                            totalAscent += route.statistics.elevationGain || 0;
                        }
                        
                        // Calculate unpaved percentage
                        const routeDistance = getRouteDistance(route);
                        totalRouteDistance += routeDistance;
                        
                        // Get unpaved percentage from the route
                        const unpavedPercentage = getUnpavedPercentage(route);
                        totalUnpavedDistance += (routeDistance * unpavedPercentage / 100);
                    });
                }
                
                // Convert to kilometers
                totalDistance = Math.round(totalDistance / 1000);
                
                // Calculate unpaved percentage for all routes combined
                const unpavedPercentage = totalRouteDistance > 0 
                    ? Math.round((totalUnpavedDistance / totalRouteDistance) * 100) 
                    : 0;
                
                // Set the combined metadata
                Object.assign(routeMetadata, {
                    country: Array.from(countries).join(', ') || 'Australia',
                    state: Array.from(states).join(', ') || '',
                    lga: Array.from(lgas).join(', ') || '',
                    totalDistance,
                    totalAscent,
                    unpavedPercentage,
                    isLoop
                });
            }
            
            console.log('[routeService] Using route metadata:', routeMetadata);
            
            // Transform the data structure to match what the API expects
            // The API requires a 'data' field, but our client uses 'routes'
            const transformedData = {
                ...routeDataWithUserId,
                // Ensure persistentId is in UUID format if not already set
                persistentId: routeDataWithUserId.persistentId || generateUUID(),
                // Add metadata for filtering
                metadata: {
                    ...routeDataWithUserId.metadata || {},
                    ...routeMetadata
                },
                // Include POIs in the transformed data
                pois: routeData.pois || { draggable: [], places: [] },
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
            
            // Convert to JSON string to measure size
            const jsonData = JSON.stringify(transformedData);
            const payloadSizeInBytes = new Blob([jsonData]).size;
            const payloadSizeInMB = payloadSizeInBytes / (1024 * 1024);
            
            console.log(`[routeService] Original payload size: ${payloadSizeInMB.toFixed(2)}MB`);
            
            // Compress the JSON data
            const compressedData = compressJSON(jsonData);
            const compressedSizeInBytes = new Blob([compressedData]).size;
            const compressedSizeInMB = compressedSizeInBytes / (1024 * 1024);
            
            console.log(`[routeService] Compressed payload size: ${compressedSizeInMB.toFixed(2)}MB (${(compressedSizeInBytes / payloadSizeInBytes * 100).toFixed(2)}% of original)`);
            
            // Add compression flag to headers and set content type
            headers['X-Content-Encoding'] = 'gzip';
            headers['Content-Type'] = 'text/plain';
            
            // If compressed payload is larger than 500KB, use chunked upload
            if (compressedSizeInBytes > 500 * 1024) {
                console.log('[routeService] Large payload detected, using chunked upload');
                return await saveRouteChunked(compressedData, routeDataWithUserId.persistentId, true);
            } else {
                // Use existing direct upload for smaller payloads
                const endpoint = routeDataWithUserId.persistentId ? 
                    `${API_BASE}/${routeDataWithUserId.persistentId}` : 
                    `${API_BASE}/save`;
                const method = routeDataWithUserId.persistentId ? 'PUT' : 'POST';
                
                // Set the Content-Type to text/plain for compressed data
                headers['Content-Type'] = 'text/plain';
                
                const response = await fetch(endpoint, {
                    method,
                    headers,
                    body: compressedData, // Send compressed data instead of JSON
                    credentials: 'include'
                });
                
                console.log('[routeService] Save response status:', response.status);
                const result = await handleResponse(response);
                console.log('[routeService] Server response:', result);
                return result;
            }
        }
        catch (error) {
            console.error('Save route error:', error);
            throw error;
        }
    };

    // Helper function to calculate route metadata for filtering
    async function calculateRouteMetadata(routeData) {
        const metadata = {
            country: 'Australia', // Default country
            state: '', // Will be populated from location API
            lga: '', // Will be populated from location API
            totalDistance: 0,
            totalAscent: 0,
            unpavedPercentage: 0,
            isLoop: false
        };
        
        // Log the entire routeData structure for debugging
        console.log('[routeService] RouteData structure:', JSON.stringify(routeData, null, 2).substring(0, 500) + '...');
        
        // Calculate total distance across all routes
        if (routeData.routes && routeData.routes.length > 0) {
            console.log('[routeService] Route statistics:', routeData.routes.map(r => r.statistics));
            
            // Try to get distance from multiple possible locations in the data structure
            metadata.totalDistance = routeData.routes.reduce((total, route) => {
                // Check multiple possible locations for distance data
                const distance = 
                    route.statistics?.totalDistance || // First check statistics.totalDistance
                    route.data?.distance ||           // Then check data.distance
                    (route.geojson?.features?.[0]?.properties?.distance) || // Then check geojson properties
                    0;  // Default to 0 if not found
                
                console.log('[routeService] Route distance found:', distance);
                return total + distance;
            }, 0);
            
            // Convert to kilometers
            metadata.totalDistance = Math.round(metadata.totalDistance / 1000);
            console.log('[routeService] Total distance in km:', metadata.totalDistance);
            
            // Calculate total ascent - check multiple possible locations
            metadata.totalAscent = routeData.routes.reduce((total, route) => {
                // Check multiple possible locations for elevation gain data
                const elevationGain = 
                    route.statistics?.elevationGain ||  // First check statistics.elevationGain
                    route.data?.elevation?.gain ||      // Then check data.elevation.gain
                    (route.geojson?.features?.[0]?.properties?.elevationGain) || // Then check geojson properties
                    0;  // Default to 0 if not found
                
                console.log('[routeService] Route elevation gain found:', elevationGain);
                return total + elevationGain;
            }, 0);
            console.log('[routeService] Total ascent:', metadata.totalAscent);
            
            // Get coordinates for the first route to determine location
            let coordinates = null;
            if (routeData.routes[0].geojson?.features?.[0]?.geometry?.coordinates?.length > 0) {
                // Get the middle point of the route for more accurate location determination
                const coords = routeData.routes[0].geojson.features[0].geometry.coordinates;
                const midIndex = Math.floor(coords.length / 2);
                coordinates = coords[midIndex];
                console.log('[routeService] Using coordinates for location lookup:', coordinates);
                
                // Call reverse geocoding API to get location information
                try {
                    const locationData = await fetchLocationData(coordinates);
                    if (locationData) {
                        console.log('[routeService] Location data received:', locationData);
                        // Update metadata with location information
                        metadata.state = locationData.state || '';
                        metadata.lga = locationData.lga || '';
                    }
                } catch (error) {
                    console.error('[routeService] Error fetching location data:', error);
                }
            }
            
            // Calculate unpaved percentage (placeholder - actual calculation would depend on surface data)
            // This would need to be replaced with actual surface type data when available
            let totalUnpavedDistance = 0;
            let totalRouteDistance = 0;
            
            console.log('[routeService] Calculating unpaved percentage');
            
            routeData.routes.forEach(route => {
                console.log('[routeService] Route surface:', route.surface);
                console.log('[routeService] Route unpavedSections:', route.unpavedSections);
                
                if (route.surface && route.surface.surfaceTypes) {
                    console.log('[routeService] Using surface types for unpaved calculation');
                    route.surface.surfaceTypes.forEach(surface => {
                        if (surface.type && surface.type.toLowerCase().includes('unpaved')) {
                            totalUnpavedDistance += surface.distance || 0;
                            console.log('[routeService] Added unpaved distance:', surface.distance);
                        }
                        totalRouteDistance += surface.distance || 0;
                    });
                } else if (route.unpavedSections && route.unpavedSections.length > 0) {
                    console.log('[routeService] Using unpaved sections for calculation');
                    // Alternative calculation if using unpavedSections
                    let unpavedDistance = route.unpavedSections.reduce((total, section) => {
                        // Calculate distance of this section if coordinates are available
                        if (section.coordinates && section.coordinates.length > 1) {
                            let sectionDistance = 0;
                            for (let i = 1; i < section.coordinates.length; i++) {
                                const [lon1, lat1] = section.coordinates[i-1];
                                const [lon2, lat2] = section.coordinates[i];
                                // Simple distance calculation (could be improved)
                                const dx = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
                                const dy = lat2 - lat1;
                                const distance = Math.sqrt(dx * dx + dy * dy) * 111.32 * 1000; // approx meters
                                sectionDistance += distance;
                            }
                            return total + sectionDistance;
                        }
                        return total;
                    }, 0);
                    
                    console.log('[routeService] Calculated unpaved distance from sections:', unpavedDistance);
                    totalUnpavedDistance += unpavedDistance;
                    totalRouteDistance += (route.statistics?.totalDistance || 0);
                } else {
                    console.log('[routeService] No surface data, using default 10% unpaved');
                    // If no surface data, use a default percentage (e.g., 10%)
                    const defaultUnpaved = (route.statistics?.totalDistance || 0) * 0.1;
                    totalUnpavedDistance += defaultUnpaved;
                    totalRouteDistance += (route.statistics?.totalDistance || 0);
                    console.log('[routeService] Added default unpaved distance:', defaultUnpaved);
                }
            });
            
            console.log('[routeService] Total unpaved distance:', totalUnpavedDistance);
            console.log('[routeService] Total route distance:', totalRouteDistance);
            
            if (totalRouteDistance > 0) {
                metadata.unpavedPercentage = Math.round((totalUnpavedDistance / totalRouteDistance) * 100);
                console.log('[routeService] Calculated unpaved percentage:', metadata.unpavedPercentage);
            }
            
            // Determine if route is a loop
            // A route is considered a loop if the start and end points are close to each other
            console.log('[routeService] Checking if route is a loop');
            
            if (routeData.routes.length === 1 && routeData.routes[0].geojson && 
                routeData.routes[0].geojson.features && 
                routeData.routes[0].geojson.features.length > 0) {
                
                const coordinates = routeData.routes[0].geojson.features[0].geometry.coordinates;
                if (coordinates && coordinates.length > 1) {
                    const start = coordinates[0];
                    const end = coordinates[coordinates.length - 1];
                    
                    console.log('[routeService] Start point:', start);
                    console.log('[routeService] End point:', end);
                    
                    // Calculate distance between start and end points
                    const dx = (end[0] - start[0]) * Math.cos((start[1] + end[1]) / 2 * Math.PI / 180);
                    const dy = end[1] - start[1];
                    const distance = Math.sqrt(dx * dx + dy * dy) * 111.32 * 1000; // approx meters
                    
                    console.log('[routeService] Distance between start and end:', distance, 'meters');
                    
                    // If start and end are within 500 meters, consider it a loop
                    metadata.isLoop = distance < 500;
                    console.log('[routeService] Is loop:', metadata.isLoop);
                } else {
                    console.log('[routeService] No valid coordinates found for loop check');
                }
            } else {
                console.log('[routeService] Route structure not suitable for loop check');
            }
        }
        
        return metadata;
    }

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

    // New function to handle chunked uploads
    const saveRouteChunked = async (data, persistentId, isCompressed = false) => {
        try {
            const headers = await getAuthHeaders();
            
            // If data is already compressed, use it directly
            // Otherwise, compress it
            const dataToSend = isCompressed ? data : compressJSON(JSON.stringify(data));
            
            // Create chunks of 500KB each
            const chunkSize = 500 * 1024; // 500KB in bytes
            const totalChunks = Math.ceil(dataToSend.length / chunkSize);
            const chunks = [];
            
            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, dataToSend.length);
                chunks.push(dataToSend.slice(start, end));
            }
            
            console.log(`[routeService] Splitting compressed data into ${chunks.length} chunks`);
            
            // Start a chunked upload session
            console.log('[routeService] Starting chunked upload session');
            
            // Add compression flag to headers
            headers['X-Content-Encoding'] = 'gzip';
            
            const sessionResponse = await fetch(`${API_BASE}/chunked/start`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    persistentId,
                    totalChunks: chunks.length,
                    totalSize: dataToSend.length,
                    isUpdate: !!persistentId,
                    isCompressed: true // Add flag to indicate compression
                }),
                credentials: 'include'
            });
            
            const { sessionId } = await handleResponse(sessionResponse);
            console.log(`[routeService] Chunked upload session created: ${sessionId}`);
            
            // Upload each chunk
            for (let i = 0; i < chunks.length; i++) {
                console.log(`[routeService] Uploading chunk ${i+1}/${chunks.length}`);
                
                const chunkResponse = await fetch(`${API_BASE}/chunked/upload`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        sessionId,
                        chunkIndex: i,
                        data: chunks[i]
                    }),
                    credentials: 'include'
                });
                
                await handleResponse(chunkResponse);
                console.log(`[routeService] Chunk ${i+1}/${chunks.length} uploaded successfully`);
            }
            
            // Complete the chunked upload
            console.log('[routeService] Completing chunked upload');
            const completeResponse = await fetch(`${API_BASE}/chunked/complete`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    sessionId
                }),
                credentials: 'include'
            });
            
            const result = await handleResponse(completeResponse);
            console.log('[routeService] Chunked upload completed successfully');
            return result;
        } catch (error) {
            console.error('[routeService] Chunked upload error:', error);
            throw error;
        }
    };

    const loadRoute = async (persistentId) => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE}/${persistentId}`, {
                method: 'GET',
                headers,
                credentials: 'include'
            });
            const data = await handleResponse(response);
            
            // Transform the API response to match what the client expects
            let transformedData = data;
            
            // Check if this is the new API format (with data field but no routes array)
            if (data.data && !data.routes) {
                
                // Check if we have allRoutes in the data field (our new format)
                if (data.data.allRoutes && Array.isArray(data.data.allRoutes) && data.data.allRoutes.length > 0) {
                    
                    // Use the allRoutes array directly
                    transformedData = {
                        ...data,
                        routes: data.data.allRoutes
                    };
                } else {
                    // Fallback to creating a single route from the data field
                    
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
            }
            
            // Ensure POIs are included in the transformed data
            if (data.pois && !transformedData.pois) {
                console.log('[routeService] Adding POIs to transformed data:', 
                    data.pois.draggable?.length || 0, 'draggable POIs,', 
                    data.pois.places?.length || 0, 'place POIs');
                transformedData.pois = data.pois;
            } else if (!transformedData.pois) {
                console.log('[routeService] No POIs found in route data, initializing empty POIs');
                transformedData.pois = { draggable: [], places: [] };
            }
            
            // Handle both formats: data.route (old format) or data directly (new format)
            // Check if the data has a 'route' property or if it has 'routes' directly
            const routeData = transformedData.route || transformedData;
            
            // Add detailed logging for route data
            if (routeData && routeData.routes && routeData.routes.length > 0) {
                
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

    const listRoutes = async (filters, metadataOnly = true) => {
        try {
            const queryParams = new URLSearchParams();
            
            // Add userId to query params to filter routes by the current user
            if (userId) {
                queryParams.append('userId', userId);
            }
            
            if (filters?.type) {
                queryParams.append('type', filters.type);
            }
            if (filters?.isPublic !== undefined) {
                queryParams.append('isPublic', String(filters.isPublic));
            }
            
            // Add metadataOnly parameter to only fetch essential fields
            queryParams.append('metadataOnly', String(metadataOnly));
            
            const url = `${API_BASE}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            console.log(`[routeService] Listing routes with metadataOnly=${metadataOnly}`);
            
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
