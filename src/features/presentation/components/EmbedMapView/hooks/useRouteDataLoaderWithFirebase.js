import { useState, useEffect } from 'react';
import { 
    calculateElevationGained, 
    calculateElevationLost, 
    calculateElevationFromArray, 
    calculateElevationLostFromArray 
} from '../utils/elevationUtils';
import { getOptimizedRouteData } from '../../../../../services/firebaseOptimizedRouteService';
import { filterPhotosByRoute } from './useRouteDataLoader';

/**
 * Custom hook to handle loading route data from Firebase, with fallback to Cloudinary or API
 * @param {string} stateId - The encoded state ID containing route information
 * @returns {Object} - Object containing route data and loading state
 */
export const useRouteDataLoaderWithFirebase = (stateId) => {
    const [isLoading, setIsLoading] = useState(true);
    const [routeData, setRouteData] = useState(null);
    const [mapState, setMapState] = useState(null);
    const [error, setError] = useState(null);
    const [currentRoute, setCurrentRoute] = useState(null);
    const [firebaseStatus, setFirebaseStatus] = useState({
        attempted: false,
        success: false,
        error: null
    });

    useEffect(() => {
        async function loadData() {
            try {
                if (!stateId) {
                    setError('No state ID provided');
                    setIsLoading(false);
                    return;
                }
                
                // Decode the state ID
                const decodedState = JSON.parse(atob(stateId));
                setMapState(decodedState.mapState);
                
                // Check if we have routes to load
                if (!decodedState.routes || decodedState.routes.length === 0) {
                    setError('No routes specified');
                    setIsLoading(false);
                    return;
                }
                
                // Get the first route ID (we'll only load one route for simplicity)
                const routeId = decodedState.routes[0].id;
                
                // Extract the UUID part if the routeId is in the format "route-{uuid}"
                const firebaseRouteId = routeId.startsWith('route-') ? routeId.substring(6) : routeId;
                
                console.log(`[Firebase] Original route ID: ${routeId}`);
                console.log(`[Firebase] Extracted Firebase route ID: ${firebaseRouteId}`);
                
                // Only attempt to load from Firebase
                try {
                    console.log(`[Firebase] Attempting to load route data from Firebase for route: ${firebaseRouteId}`);
                    setFirebaseStatus({ attempted: true, success: false, error: null });
                    
                    const firebaseData = await getOptimizedRouteData(firebaseRouteId);
                    
                    if (firebaseData) {
                        console.log(`[Firebase] Successfully loaded data from Firebase: ${firebaseData.name || 'Unnamed'}`);
                        console.log('[Firebase] Data structure:', Object.keys(firebaseData));
                        
                        setFirebaseStatus({ attempted: true, success: true, error: null });
                        
                        // Process the Firebase data
                        processRouteData(firebaseData, routeId);
                    } else {
                        console.log(`[Firebase] No data found in Firebase for route: ${routeId}`);
                        setFirebaseStatus({ 
                            attempted: true, 
                            success: false, 
                            error: 'No data found in Firebase' 
                        });
                        setError('No data found in Firebase for this route');
                        setIsLoading(false);
                    }
                } catch (firebaseError) {
                    console.error('[Firebase] Error loading from Firebase:', firebaseError);
                    setFirebaseStatus({ 
                        attempted: true, 
                        success: false, 
                        error: firebaseError.message || 'Unknown error' 
                    });
                    setError(`Failed to load data from Firebase: ${firebaseError.message || 'Unknown error'}`);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('[useRouteDataLoaderWithFirebase] Failed to load route data:', error);
                setError(error.message || 'Failed to load route data');
                setIsLoading(false);
            }
        }
        
        // Helper function to process route data from any source
        function processRouteData(data, routeId) {
            // Store the route data
            // Log headerSettings to debug
            console.log('Received headerSettings:', data.headerSettings);
            
            // If headerSettings is missing or empty, log a warning
            if (!data.headerSettings) {
                console.warn('No headerSettings found in data');
                
                // Set default headerSettings if missing
                data.headerSettings = {
                    color: '#000000',
                    logoUrl: null,
                    username: ''
                };
            } else {
                console.log('HeaderSettings details:', {
                    color: data.headerSettings.color,
                    logoUrl: data.headerSettings.logoUrl,
                    username: data.headerSettings.username
                });
            }
            
            setRouteData(data);
            
            // Set the current route (first subroute or the main route)
            if (data.routes && data.routes.length > 0) {
                // Find the specific subroute that matches the requested ID
                const matchingSubroute = data.routes.find(r => r.routeId === routeId);
                
                if (matchingSubroute) {
                    console.log(`Found matching subroute: ${matchingSubroute.name}`);
                    
                    // Ensure the route has the elevation data in the expected format
                    const routeIndex = data.routes.indexOf(matchingSubroute);
                    const elevationData = data.elevation && data.elevation[routeIndex] 
                        ? data.elevation[routeIndex] 
                        : [];
                    
                    // Calculate or extract total distance
                    let totalDistance = 0;
                    
                    // Try to get total distance from various sources
                    if (matchingSubroute.statistics && matchingSubroute.statistics.totalDistance) {
                        // Use existing statistics if available
                        totalDistance = matchingSubroute.statistics.totalDistance;
                        console.log(`Using existing statistics.totalDistance: ${totalDistance}`);
                    } else if (matchingSubroute.surface && matchingSubroute.surface.elevationProfile && matchingSubroute.surface.elevationProfile.length > 0) {
                        // Use the last distance value from elevation profile
                        const lastPoint = matchingSubroute.surface.elevationProfile[matchingSubroute.surface.elevationProfile.length - 1];
                        if (lastPoint && lastPoint.distance) {
                            totalDistance = lastPoint.distance;
                            console.log(`Using last elevation profile point distance: ${totalDistance}`);
                        }
                    } else if (matchingSubroute.geojson?.features?.[0]?.properties?.distance) {
                        // Use distance from geojson properties
                        totalDistance = matchingSubroute.geojson.features[0].properties.distance;
                        console.log(`Using geojson properties distance: ${totalDistance}`);
                    } else if (matchingSubroute.geojson?.features?.[0]?.geometry?.coordinates) {
                        // Calculate distance from coordinates
                        const coordinates = matchingSubroute.geojson.features[0].geometry.coordinates;
                        // Simple distance calculation (not accurate for real-world distances but better than 0)
                        for (let i = 1; i < coordinates.length; i++) {
                            const dx = coordinates[i][0] - coordinates[i-1][0];
                            const dy = coordinates[i][1] - coordinates[i-1][1];
                            totalDistance += Math.sqrt(dx*dx + dy*dy) * 111000; // Rough conversion to meters
                        }
                        console.log(`Calculated distance from coordinates: ${totalDistance}`);
                    } else {
                        // Fallback to a reasonable default for testing
                        totalDistance = 10000; // 10km
                        console.log(`Using fallback distance: ${totalDistance}`);
                    }
                    
                    // Log the description data to see its format
                    console.log('Route description data:', matchingSubroute.description);
                    
                    // Add elevation data to the geojson properties
                    const enhancedRoute = {
                        ...matchingSubroute,
                        id: matchingSubroute.routeId,
                        visible: true,
                    // Ensure description is in the correct format for PresentationRouteDescriptionPanel
                    description: {
                        description: matchingSubroute.description?.description || matchingSubroute.description || '',
                        title: matchingSubroute.description?.title || '',
                        photos: matchingSubroute.description?.photos?.length > 0 
                            ? matchingSubroute.description.photos 
                            : filterPhotosByRoute(data.photos?.map(photo => ({
                                ...photo,
                                id: photo.id || photo._id,
                                url: photo.url,
                                thumbnailUrl: photo.thumbnailUrl || photo.url,
                                coordinates: photo.coordinates
                            })) || [], matchingSubroute)
                    },
                    statistics: {
                        totalDistance: totalDistance,
                        elevationGained: calculateElevationGained(matchingSubroute),
                        elevationLost: calculateElevationLost(matchingSubroute),
                        // Add aliases for compatibility with different naming conventions
                        elevationGain: calculateElevationGained(matchingSubroute),
                        elevationLoss: calculateElevationLost(matchingSubroute)
                    }
                    };
                    
                    // Ensure geojson has the required structure
                    if (enhancedRoute.geojson && enhancedRoute.geojson.features && enhancedRoute.geojson.features.length > 0) {
                        // Make sure properties exists
                        if (!enhancedRoute.geojson.features[0].properties) {
                            enhancedRoute.geojson.features[0].properties = {};
                        }
                        
                        // Make sure coordinateProperties exists
                        if (!enhancedRoute.geojson.features[0].properties.coordinateProperties) {
                            enhancedRoute.geojson.features[0].properties.coordinateProperties = {};
                        }
                        
                        // Add elevation data from surface.elevationProfile if available
                        if (matchingSubroute.surface && matchingSubroute.surface.elevationProfile && matchingSubroute.surface.elevationProfile.length > 0) {
                            // Extract just the elevation values
                            const elevations = matchingSubroute.surface.elevationProfile.map(point => point.elevation);
                            enhancedRoute.geojson.features[0].properties.coordinateProperties.elevation = elevations;
                            
                            console.log('Added elevation data from surface.elevationProfile:', {
                                elevationCount: elevations.length,
                                firstFew: elevations.slice(0, 5),
                                lastFew: elevations.slice(-5)
                            });
                        } else {
                            // Try to use the elevation data from the routeData.elevation array
                            const routeIndex = data.routes.indexOf(matchingSubroute);
                            if (data.elevation && data.elevation[routeIndex] && data.elevation[routeIndex].length > 0) {
                                // If the elevation data is an array of objects with elevation property
                                if (typeof data.elevation[routeIndex][0] === 'object' && data.elevation[routeIndex][0].elevation !== undefined) {
                                    const elevations = data.elevation[routeIndex].map(point => point.elevation);
                                    enhancedRoute.geojson.features[0].properties.coordinateProperties.elevation = elevations;
                                    
                                    console.log('Added elevation data from data.elevation (object format):', {
                                        elevationCount: elevations.length,
                                        firstFew: elevations.slice(0, 5),
                                        lastFew: elevations.slice(-5)
                                    });
                                } else {
                                    // If the elevation data is already an array of numbers
                                    enhancedRoute.geojson.features[0].properties.coordinateProperties.elevation = data.elevation[routeIndex];
                                    
                                    console.log('Added elevation data from data.elevation (array format):', {
                                        elevationCount: data.elevation[routeIndex].length,
                                        firstFew: data.elevation[routeIndex].slice(0, 5),
                                        lastFew: data.elevation[routeIndex].slice(-5)
                                    });
                                }
                            } else {
                                console.log('No elevation data found for route:', matchingSubroute.name);
                                
                                // Check if the route has coordinates with elevation values (z-coordinate)
                                if (enhancedRoute.geojson?.features?.[0]?.geometry?.coordinates?.length > 0) {
                                    const coordinates = enhancedRoute.geojson.features[0].geometry.coordinates;
                                    if (coordinates[0].length > 2) {
                                        // Extract elevation values from coordinates
                                        const elevations = coordinates.map(coord => coord[2] || 0);
                                        enhancedRoute.geojson.features[0].properties.coordinateProperties.elevation = elevations;
                                        
                                        console.log('Extracted elevation data from coordinates:', {
                                            elevationCount: elevations.length,
                                            firstFew: elevations.slice(0, 5),
                                            lastFew: elevations.slice(-5)
                                        });
                                    }
                                }
                            }
                        }
                    }
                    
                    // Set the current route to the matching subroute for display in the sidebar
                    setCurrentRoute(enhancedRoute);
                    
                    // Store all routes in routeData for rendering
                    setRouteData({
                        ...data,
                        allRoutesEnhanced: data.routes.map(r => {
                            // Calculate or extract total distance for each route
                            let routeTotalDistance = 0;
                            
                            // Try to get total distance from various sources
                            if (r.statistics && r.statistics.totalDistance) {
                                routeTotalDistance = r.statistics.totalDistance;
                            } else if (r.surface && r.surface.elevationProfile && r.surface.elevationProfile.length > 0) {
                                const lastPoint = r.surface.elevationProfile[r.surface.elevationProfile.length - 1];
                                if (lastPoint && lastPoint.distance) {
                                    routeTotalDistance = lastPoint.distance;
                                }
                            } else if (r.geojson?.features?.[0]?.properties?.distance) {
                                routeTotalDistance = r.geojson.features[0].properties.distance;
                            }
                            
                            return {
                                ...r,
                                id: r.routeId,
                                visible: true,
                                statistics: {
                                    totalDistance: routeTotalDistance,
                                    elevationGained: calculateElevationGained(r),
                                    elevationLost: calculateElevationLost(r),
                                    // Add aliases for compatibility with different naming conventions
                                    elevationGain: calculateElevationGained(r),
                                    elevationLoss: calculateElevationLost(r)
                                }
                            };
                        })
                    });
                } else {
                    // If no matching subroute is found, use the first one
                    console.log(`No matching subroute found, using first subroute: ${data.routes[0].name}`);
                    
                    // Ensure the route has the elevation data in the expected format
                    const elevationData = data.elevation && data.elevation[0] 
                        ? data.elevation[0] 
                        : [];
                    
                    // Calculate or extract total distance
                    let totalDistance = 0;
                    
                    // Try to get total distance from various sources
                    if (data.routes[0].statistics && data.routes[0].statistics.totalDistance) {
                        // Use existing statistics if available
                        totalDistance = data.routes[0].statistics.totalDistance;
                        console.log(`Using existing statistics.totalDistance: ${totalDistance}`);
                    } else if (data.routes[0].surface && data.routes[0].surface.elevationProfile && data.routes[0].surface.elevationProfile.length > 0) {
                        // Use the last distance value from elevation profile
                        const lastPoint = data.routes[0].surface.elevationProfile[data.routes[0].surface.elevationProfile.length - 1];
                        if (lastPoint && lastPoint.distance) {
                            totalDistance = lastPoint.distance;
                            console.log(`Using last elevation profile point distance: ${totalDistance}`);
                        }
                    } else if (data.routes[0].geojson?.features?.[0]?.properties?.distance) {
                        // Use distance from geojson properties
                        totalDistance = data.routes[0].geojson.features[0].properties.distance;
                        console.log(`Using geojson properties distance: ${totalDistance}`);
                    } else if (data.routes[0].geojson?.features?.[0]?.geometry?.coordinates) {
                        // Calculate distance from coordinates
                        const coordinates = data.routes[0].geojson.features[0].geometry.coordinates;
                        // Simple distance calculation (not accurate for real-world distances but better than 0)
                        for (let i = 1; i < coordinates.length; i++) {
                            const dx = coordinates[i][0] - coordinates[i-1][0];
                            const dy = coordinates[i][1] - coordinates[i-1][1];
                            totalDistance += Math.sqrt(dx*dx + dy*dy) * 111000; // Rough conversion to meters
                        }
                        console.log(`Calculated distance from coordinates: ${totalDistance}`);
                    } else {
                        // Fallback to a reasonable default for testing
                        totalDistance = 10000; // 10km
                        console.log(`Using fallback distance: ${totalDistance}`);
                    }
                    
                    // Log the description data to see its format
                    console.log('Route description data (first route):', data.routes[0].description);
                    
                    // Add elevation data to the geojson properties
                    const enhancedRoute = {
                        ...data.routes[0],
                        id: data.routes[0].routeId,
                        visible: true,
                        // Ensure description is in the correct format for PresentationRouteDescriptionPanel
                        description: {
                            description: data.routes[0].description?.description || data.routes[0].description || '',
                            title: data.routes[0].description?.title || '',
                            photos: data.routes[0].description?.photos?.length > 0 
                                ? data.routes[0].description.photos 
                                : filterPhotosByRoute(data.photos?.map(photo => ({
                                    ...photo,
                                    id: photo.id || photo._id,
                                    url: photo.url,
                                    thumbnailUrl: photo.thumbnailUrl || photo.url,
                                    coordinates: photo.coordinates
                                })) || [], data.routes[0])
                        },
                        statistics: {
                            totalDistance: totalDistance,
                            elevationGained: calculateElevationGained(data.routes[0]),
                            elevationLost: calculateElevationLost(data.routes[0]),
                            // Add aliases for compatibility with different naming conventions
                            elevationGain: calculateElevationGained(data.routes[0]),
                            elevationLoss: calculateElevationLost(data.routes[0])
                        }
                    };
                    
                    // Ensure geojson has the required structure
                    if (enhancedRoute.geojson && enhancedRoute.geojson.features && enhancedRoute.geojson.features.length > 0) {
                        // Make sure properties exists
                        if (!enhancedRoute.geojson.features[0].properties) {
                            enhancedRoute.geojson.features[0].properties = {};
                        }
                        
                        // Make sure coordinateProperties exists
                        if (!enhancedRoute.geojson.features[0].properties.coordinateProperties) {
                            enhancedRoute.geojson.features[0].properties.coordinateProperties = {};
                        }
                        
                        // Add elevation data from surface.elevationProfile if available
                        if (data.routes[0].surface && data.routes[0].surface.elevationProfile && data.routes[0].surface.elevationProfile.length > 0) {
                            // Extract just the elevation values
                            const elevations = data.routes[0].surface.elevationProfile.map(point => point.elevation);
                            enhancedRoute.geojson.features[0].properties.coordinateProperties.elevation = elevations;
                        }
                    }
                    
                    // Set the current route to the first route
                    setCurrentRoute(enhancedRoute);
                    
                    // Store all routes in routeData for rendering
                    setRouteData({
                        ...data,
                        allRoutesEnhanced: data.routes.map(r => {
                            return {
                                ...r,
                                id: r.routeId,
                                visible: true,
                                statistics: {
                                    totalDistance: r.geojson?.features?.[0]?.properties?.distance || 0,
                                    elevationGained: calculateElevationGained(r),
                                    elevationLost: calculateElevationLost(r),
                                    // Add aliases for compatibility with different naming conventions
                                    elevationGain: calculateElevationGained(r),
                                    elevationLoss: calculateElevationLost(r)
                                }
                            };
                        })
                    });
                }
            } else {
                // If no subroutes, use the main route
                const enhancedRoute = {
                    ...data,
                    visible: true,
                    statistics: {
                        totalDistance: data.geojson?.features?.[0]?.properties?.distance || 0,
                        elevationGained: data.elevation ? calculateElevationFromArray(data.elevation) : 0,
                        elevationLost: data.elevation ? calculateElevationLostFromArray(data.elevation) : 0,
                        // Add aliases for compatibility with different naming conventions
                        elevationGain: data.elevation ? calculateElevationFromArray(data.elevation) : 0,
                        elevationLoss: data.elevation ? calculateElevationLostFromArray(data.elevation) : 0
                    }
                };
                
                // Ensure geojson has the required structure
                if (enhancedRoute.geojson && enhancedRoute.geojson.features && enhancedRoute.geojson.features.length > 0) {
                    // Make sure properties exists
                    if (!enhancedRoute.geojson.features[0].properties) {
                        enhancedRoute.geojson.features[0].properties = {};
                    }
                    
                    // Make sure coordinateProperties exists
                    if (!enhancedRoute.geojson.features[0].properties.coordinateProperties) {
                        enhancedRoute.geojson.features[0].properties.coordinateProperties = {};
                    }
                    
                    // Add elevation data if available
                    if (data.elevation && data.elevation.length > 0) {
                        enhancedRoute.geojson.features[0].properties.coordinateProperties.elevation = data.elevation;
                    }
                }
                
                setCurrentRoute(enhancedRoute);
            }
            
            setIsLoading(false);
        }
        
        loadData();
    }, [stateId]);

    return {
        isLoading,
        routeData,
        mapState,
        error,
        currentRoute,
        setCurrentRoute,
        setRouteData,
        firebaseStatus
    };
};
