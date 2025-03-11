import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MAP_STYLES } from '../../../map/components/StyleControl/StyleControl';
import { PresentationElevationProfilePanel } from '../ElevationProfile/PresentationElevationProfilePanel';
import { PresentationPOIViewer } from '../POIViewer';
import { setupScaleListener } from '../../utils/scaleUtils';
import { SimpleLightbox } from '../../../photo/components/PhotoPreview/SimpleLightbox';
import { clusterPhotosPresentation, isCluster, getClusterExpansionZoom } from '../../utils/photoClusteringPresentation';
import { PhotoProvider } from '../../../photo/context/PhotoContext';

// Import extracted components
import SimplifiedRouteLayer from './components/SimplifiedRouteLayer';
import POIMarker from './components/POIMarker';
import PhotoMarker from './components/PhotoMarker';
import PhotoCluster from './components/PhotoCluster';
import EmbedSidebar from './components/EmbedSidebar';

// Import CSS
import './EmbedMapView.css';

// Make sure we have the Mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Helper functions for elevation calculations
const calculateElevationGained = (route) => {
    // Check if we have elevation data in the surface
    if (route.surface?.elevationProfile && route.surface.elevationProfile.length > 0) {
        let gained = 0;
        const elevations = route.surface.elevationProfile.map(point => point.elevation);
        
        // Calculate elevation gained
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i-1];
            if (diff > 0) {
                gained += diff;
            }
        }
        
        return gained;
    }
    
    // Check if we have elevation data in the statistics
    if (route.statistics?.elevationGained !== undefined) {
        return route.statistics.elevationGained;
    }
    
    // Default value if no elevation data is found
    return 0;
};

const calculateElevationLost = (route) => {
    // Check if we have elevation data in the surface
    if (route.surface?.elevationProfile && route.surface.elevationProfile.length > 0) {
        let lost = 0;
        const elevations = route.surface.elevationProfile.map(point => point.elevation);
        
        // Calculate elevation lost
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i-1];
            if (diff < 0) {
                lost += Math.abs(diff);
            }
        }
        
        return lost;
    }
    
    // Check if we have elevation data in the statistics
    if (route.statistics?.elevationLost !== undefined) {
        return route.statistics.elevationLost;
    }
    
    // Default value if no elevation data is found
    return 0;
};

// Helper functions for calculating elevation from an array of elevation values
const calculateElevationFromArray = (elevationArray) => {
    if (!elevationArray || elevationArray.length < 2) {
        return 0;
    }
    
    let gained = 0;
    
    // Handle both array of numbers and array of objects with elevation property
    const elevations = typeof elevationArray[0] === 'object' && elevationArray[0].elevation !== undefined
        ? elevationArray.map(point => point.elevation)
        : elevationArray;
    
    // Calculate elevation gained
    for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i-1];
        if (diff > 0) {
            gained += diff;
        }
    }
    
    return gained;
};

const calculateElevationLostFromArray = (elevationArray) => {
    if (!elevationArray || elevationArray.length < 2) {
        return 0;
    }
    
    let lost = 0;
    
    // Handle both array of numbers and array of objects with elevation property
    const elevations = typeof elevationArray[0] === 'object' && elevationArray[0].elevation !== undefined
        ? elevationArray.map(point => point.elevation)
        : elevationArray;
    
    // Calculate elevation lost
    for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i-1];
        if (diff < 0) {
            lost += Math.abs(diff);
        }
    }
    
    return lost;
};

export default function EmbedMapView() {
    const { stateId } = useParams();
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [routeData, setRouteData] = useState(null);
    const [mapState, setMapState] = useState(null);
    const [error, setError] = useState(null);
    const [isDistanceMarkersVisible, setIsDistanceMarkersVisible] = useState(true);
    const [selectedPOI, setSelectedPOI] = useState(null);
    const [currentRoute, setCurrentRoute] = useState(null);
    const [isPhotosVisible, setIsPhotosVisible] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [zoom, setZoom] = useState(null);
    const [scale, setScale] = useState(1);
    const [clusteredPhotos, setClusteredPhotos] = useState([]);
    const [visiblePOICategories, setVisiblePOICategories] = useState([
        'road-information',
        'accommodation',
        'food-drink',
        'natural-features',
        'town-services',
        'transportation',
        'event-information',
        'climb-category'
    ]);
    const [routeVisibility, setRouteVisibility] = useState({});
    
    // Load Font Awesome for icons
    useEffect(() => {
        // Check if Font Awesome is already loaded
        if (!document.querySelector('script[src*="fontawesome"]')) {
            const script = document.createElement('script');
            script.src = 'https://kit.fontawesome.com/b02e210188.js';
            script.crossOrigin = 'anonymous';
            script.async = true;
            document.head.appendChild(script);
            
            return () => {
                // Clean up script on unmount
                document.head.removeChild(script);
            };
        }
    }, []);
    
    // Function to toggle distance markers visibility
    const toggleDistanceMarkersVisibility = () => {
        setIsDistanceMarkersVisible(prev => !prev);
        
        // If we have a map instance, update the distance markers visibility
        if (mapInstance.current) {
            const map = mapInstance.current;
            const newVisibility = !isDistanceMarkersVisible;
            
            // Find all distance marker layers and update their visibility
            const style = map.getStyle();
            if (style && style.layers) {
                const distanceMarkerLayers = style.layers
                    .filter(layer => layer.id.includes('distance-marker'))
                    .map(layer => layer.id);
                
                distanceMarkerLayers.forEach(layerId => {
                    map.setLayoutProperty(
                        layerId,
                        'visibility',
                        newVisibility ? 'visible' : 'none'
                    );
                });
            }
        }
    };
    
    // Function to toggle photos visibility
    const togglePhotosVisibility = () => {
        setIsPhotosVisible(prev => !prev);
    };
    
    // Function to handle cluster click
    const handleClusterClick = (cluster) => {
        if (mapInstance.current) {
            // Get the expansion zoom level for this cluster
            // Supercluster adds 'id' property to cluster features
            const clusterId = cluster.id || cluster.properties.cluster_id;
            
            const expansionZoom = getClusterExpansionZoom(clusterId, clusteredPhotos);
            const targetZoom = Math.min(expansionZoom + 1.5, 20); // Add 1.5 zoom levels, but cap at 20
            
            // Get the cluster's coordinates
            const [lng, lat] = cluster.geometry.coordinates;
            
            // Zoom to the cluster's location with more aggressive zoom
            mapInstance.current.easeTo({
                center: [lng, lat],
                zoom: targetZoom,
                duration: 500
            });
        }
    };
    
    // Function to toggle POI category visibility
    const togglePOICategoryVisibility = (category) => {
        setVisiblePOICategories(prev => {
            if (prev.includes(category)) {
                return prev.filter(cat => cat !== category);
            } else {
                return [...prev, category];
            }
        });
        // POI markers will update automatically based on visiblePOICategories
    };
    
    // Function to toggle route visibility
    const toggleRouteVisibility = (routeId) => {
        setRouteVisibility(prev => {
            const newVisibility = {
                ...prev,
                [routeId]: {
                    ...prev[routeId],
                    visible: !(prev[routeId]?.visible ?? true)
                }
            };
            
            // Update the map layer visibility
            if (mapInstance.current) {
                const map = mapInstance.current;
                const isVisible = !(prev[routeId]?.visible ?? true);
                
                // Try different layer ID formats
                const possibleLayerIds = [
                    `${routeId}-main-line`,
                    `${routeId}-main-border`,
                    `unpaved-sections-layer-${routeId}`
                ];
                
                possibleLayerIds.forEach(layerId => {
                    if (map.getLayer(layerId)) {
                        map.setLayoutProperty(
                            layerId,
                            'visibility',
                            isVisible ? 'visible' : 'none'
                        );
                    }
                });
            }
            
            return newVisibility;
        });
    };
    
    // Decode the state ID and load route data
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
                
                try {
                    // First get the route data from the API to get the embedUrl
                    console.log(`Fetching route data from API to get embedUrl for route: ${routeId}`);
                    const routeResponse = await fetch(`/api/routes/embed/${routeId}`);
                    
                    if (!routeResponse.ok) {
                        console.error(`Failed to load route data: ${routeResponse.status} ${routeResponse.statusText}`);
                        throw new Error(`Failed to load route data: ${routeResponse.statusText}`);
                    }
                    
                    // Parse the response to get the embedUrl
                    const routeData = await routeResponse.json();
                    
                    // Check if we have an embedUrl
                    if (!routeData.embedUrl) {
                        console.error('No embedUrl found in route data');
                        throw new Error('No embedUrl found in route data');
                    }
                    
                    console.log(`Using embedUrl from route data: ${routeData.embedUrl}`);
                    
                    // Add a timestamp parameter to force a fresh version
                    const cloudinaryUrl = `${routeData.embedUrl}?t=${Date.now()}`;
                    
                    // Fetch the data from Cloudinary using the embedUrl
                    const cloudinaryResponse = await fetch(cloudinaryUrl);
                    
                    if (cloudinaryResponse.ok) {
                        // Parse the response
                        const data = await cloudinaryResponse.json();
                        console.log(`Successfully loaded pre-processed data from Cloudinary: ${data.name || 'Unnamed'}`);
                        
                        // Store the route data
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
                                    photos: matchingSubroute.description?.photos || []
                                },
                                    statistics: {
                                        totalDistance: totalDistance,
                                        elevationGained: calculateElevationGained(matchingSubroute),
                                        elevationLost: calculateElevationLost(matchingSubroute)
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
                                                totalDistance: routeTotalDistance
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
                                        photos: data.routes[0].description?.photos || []
                                    },
                                    statistics: {
                                        totalDistance: totalDistance,
                                        elevationGained: calculateElevationGained(data.routes[0]),
                                        elevationLost: calculateElevationLost(data.routes[0])
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
                                    allRoutesEnhanced: data.routes.map(r => ({
                                        ...r,
                                        id: r.routeId,
                                        visible: true
                                    }))
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
                                    elevationLost: data.elevation ? calculateElevationLostFromArray(data.elevation) : 0
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
                        return; // Exit early if we successfully loaded from Cloudinary
                    } else {
                        console.log(`No pre-processed data found in Cloudinary, falling back to API: ${cloudinaryResponse.status}`);
                    }
                } catch (cloudinaryError) {
                    console.error('Error loading from Cloudinary:', cloudinaryError);
                    console.log('Falling back to API...');
                }
                
                // Fallback to API if Cloudinary fails
                console.log(`Fetching route data from API for ID: ${routeId}`);
                const response = await fetch(`/api/routes/embed/${routeId}`);
                
                if (!response.ok) {
                    console.error(`Failed to load route: ${response.status} ${response.statusText}`);
                    const errorText = await response.text();
                    console.error(`Error details: ${errorText}`);
                    throw new Error(`Failed to load route: ${response.statusText}`);
                }
                
                // Parse the response
                const data = await response.json();
                console.log(`Successfully loaded route from API: ${data.name || 'Unnamed'}`);
                
                // Store the route data
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
                        console.log('Route description data (API fallback):', matchingSubroute.description);
                        
                        // Add elevation data to the geojson properties
                        const enhancedRoute = {
                            ...matchingSubroute,
                            id: matchingSubroute.routeId,
                            visible: true,
                            // Ensure description is in the correct format for PresentationRouteDescriptionPanel
                            description: {
                                description: matchingSubroute.description?.description || matchingSubroute.description || '',
                                title: matchingSubroute.description?.title || '',
                                photos: matchingSubroute.description?.photos || []
                            },
                            statistics: {
                                totalDistance: totalDistance,
                                elevationGained: calculateElevationGained(matchingSubroute),
                                elevationLost: calculateElevationLost(matchingSubroute)
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
                            }
                        }
                        
                        // Create a main route object that includes all routes
                        const mainEnhancedRoute = {
                            ...data,
                            visible: true,
                            allRoutes: data.routes.map(r => ({
                                ...r,
                                id: r.routeId,
                                visible: true
                            })),
                            statistics: {
                                totalDistance: data.geojson?.features?.[0]?.properties?.distance || 0
                            }
                        };
                        
                        // Set the current route to the matching subroute for display in the sidebar
                        setCurrentRoute(enhancedRoute);
                        
                        // Store all routes in routeData for rendering
                        setRouteData({
                            ...data,
                            allRoutesEnhanced: data.routes.map(r => ({
                                ...r,
                                id: r.routeId,
                                visible: true
                            }))
                        });
                    } else {
                        // If no matching subroute is found, use the first one
                        console.log(`No matching subroute found, using first subroute: ${data.routes[0].name}`);
                        
                        // Ensure the route has the elevation data in the expected format
                        const elevationData = data.elevation && data.elevation[0] 
                            ? data.elevation[0] 
                            : [];
                        
                        // Log the description data to see its format
                        console.log('Route description data (API fallback, no matching subroute):', data.routes[0].description);
                        
                        // Add elevation data to the geojson properties
                        const firstRouteEnhanced = {
                            ...data.routes[0],
                            id: data.routes[0].routeId,
                            visible: true,
                            // Ensure description is in the correct format for PresentationRouteDescriptionPanel
                            description: {
                                description: data.routes[0].description?.description || data.routes[0].description || '',
                                title: data.routes[0].description?.title || '',
                                photos: data.routes[0].description?.photos || []
                            },
                            statistics: {
                                totalDistance: data.routes[0].geojson?.features?.[0]?.properties?.distance || 0
                            }
                        };
                        
                        // Ensure geojson has the required structure
                        if (firstRouteEnhanced.geojson && firstRouteEnhanced.geojson.features && firstRouteEnhanced.geojson.features.length > 0) {
                            // Make sure properties exists
                            if (!firstRouteEnhanced.geojson.features[0].properties) {
                                firstRouteEnhanced.geojson.features[0].properties = {};
                            }
                            
                            // Make sure coordinateProperties exists
                            if (!firstRouteEnhanced.geojson.features[0].properties.coordinateProperties) {
                                firstRouteEnhanced.geojson.features[0].properties.coordinateProperties = {};
                            }
                            
                        }
                        
                        // Set the current route to the first route
                        setCurrentRoute(firstRouteEnhanced);
                    }
                }
                
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to load route data:', error);
                setError(error.message || 'Failed to load route data');
                setIsLoading(false);
            }
        }
        
        loadData();
    }, [stateId]);
    
    // Initialize map
    useEffect(() => {
        if (!mapRef.current || !mapState) return;
        
        // Handle case where mapState.style doesn't match any key in MAP_STYLES
        let mapStyle = MAP_STYLES.satellite.url; // Default fallback
        
        if (mapState.style) {
            // Check if the style exists in MAP_STYLES
            if (MAP_STYLES[mapState.style]) {
                mapStyle = MAP_STYLES[mapState.style].url;
            } else {
                // Handle specific style names that might come from the state
                if (mapState.style === 'Mapbox Satellite Streets') {
                    mapStyle = MAP_STYLES.satellite.url;
                } else if (mapState.style.toLowerCase().includes('outdoors')) {
                    mapStyle = MAP_STYLES.outdoors.url;
                } else if (mapState.style.toLowerCase().includes('light')) {
                    mapStyle = MAP_STYLES.light.url;
                } else if (mapState.style.toLowerCase().includes('night')) {
                    mapStyle = MAP_STYLES.night.url;
                }
                // If no match, we'll use the default satellite style
            }
        }
        
        console.log('Using map style:', { 
            requestedStyle: mapState.style, 
            resolvedStyle: mapStyle 
        });
        
        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: mapStyle,
            center: mapState.center || [146.5, -42.0],
            zoom: mapState.zoom || 10, // Default zoom will be overridden by fitBounds
            bearing: mapState.bearing || 0,
            pitch: mapState.pitch || 0,
            width: '100%',
            height: '100%'
        });
        
        map.on('load', () => {
            // Add terrain
            map.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14
            });
            
            map.setTerrain({
                source: 'mapbox-dem',
                exaggeration: 1.5
            });
            
            setIsMapReady(true);
        });
        
        // Update zoom state when map zooms
        map.on('zoom', () => {
            setZoom(map.getZoom());
        });
        
        // Add Mapbox controls
        map.addControl(new mapboxgl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true
        }), 'top-right');
        
        map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
        
        mapInstance.current = map;
        
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [mapRef, mapState]);
    
    // Render the embedded map view
    // Add container ref for scaling
    const containerRef = useRef(null);
    
    // Set up scaling
    useEffect(() => {
        if (containerRef.current) {
            const cleanup = setupScaleListener(containerRef.current, (newScale) => {
                setScale(newScale);
            });
            return cleanup;
        }
    }, []);
    
    // Initialize zoom state when map is ready
    useEffect(() => {
        if (isMapReady && mapInstance.current) {
            const currentZoom = mapInstance.current.getZoom();
            setZoom(currentZoom);
        }
    }, [isMapReady]);
    
    // Cluster photos when zoom or photos change
    useEffect(() => {
        if (isMapReady && mapInstance.current && routeData?.photos && routeData.photos.length > 0) {
            // Get the current zoom level
            const currentZoom = mapInstance.current.getZoom();
            
            // Filter photos to only include those with valid coordinates
            const validPhotos = routeData.photos.filter(p => {
                if (!p.coordinates) {
                    console.warn('Photo missing coordinates:', p.id);
                    return false;
                }
                if (typeof p.coordinates.lat !== 'number' || typeof p.coordinates.lng !== 'number') {
                    console.warn('Photo has invalid coordinates:', p.id, p.coordinates);
                    return false;
                }
                return true;
            });
            
            // Cluster the photos
            const clustered = clusterPhotosPresentation(validPhotos, currentZoom);
            // Remove console log to reduce noise
            setClusteredPhotos(clustered);
        }
    }, [isMapReady, routeData?.photos, zoom]);
    
    // Fit map to route bounds when map and route are ready
    useEffect(() => {
        if (isMapReady && mapInstance.current && currentRoute && currentRoute.geojson) {
            try {
                console.log('Fitting map to route bounds...');
                const map = mapInstance.current;
                const feature = currentRoute.geojson.features[0];
                
                if (feature && feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
                    // Calculate bounds from coordinates
                    const coordinates = feature.geometry.coordinates;
                    
                    // Find min/max coordinates to create a bounding box
                    let minLng = coordinates[0][0];
                    let maxLng = coordinates[0][0];
                    let minLat = coordinates[0][1];
                    let maxLat = coordinates[0][1];
                    
                    coordinates.forEach(coord => {
                        minLng = Math.min(minLng, coord[0]);
                        maxLng = Math.max(maxLng, coord[0]);
                        minLat = Math.min(minLat, coord[1]);
                        maxLat = Math.max(maxLat, coord[1]);
                    });
                    
                    // Create a bounds object
                    const bounds = [
                        [minLng, minLat], // Southwest corner
                        [maxLng, maxLat]  // Northeast corner
                    ];
                    
                    // Fit the map to the bounds with more padding to ensure the full route is visible
                    map.fitBounds(bounds, {
                        padding: 100, // Increased padding around the bounds
                        maxZoom: 12, // Lower maximum zoom level to show more context
                        duration: 1000 // Animation duration in milliseconds
                    });
                    
                    console.log('Map fitted to route bounds:', bounds);
                } else {
                    console.error('Invalid route geometry for fitting bounds');
                }
            } catch (error) {
                console.error('Error fitting map to route bounds:', error);
            }
        }
    }, [isMapReady, currentRoute]);
    
    return (
        <div ref={containerRef} className="embed-container">
            {/* Add the EmbedSidebar */}
            <EmbedSidebar 
                isOpen={true} 
                isDistanceMarkersVisible={isDistanceMarkersVisible}
                toggleDistanceMarkersVisibility={toggleDistanceMarkersVisibility}
                routeData={routeData}
                currentRoute={currentRoute}
                setCurrentRoute={setCurrentRoute}
                isPhotosVisible={isPhotosVisible}
                togglePhotosVisibility={togglePhotosVisibility}
                visiblePOICategories={visiblePOICategories}
                togglePOICategoryVisibility={togglePOICategoryVisibility}
                routeVisibility={routeVisibility}
                toggleRouteVisibility={toggleRouteVisibility}
                map={mapInstance.current}
            />
            
            {/* Map area */}
            <div className="embed-map-area">
                <div ref={mapRef} className="map-container" />
                
                {/* Loading indicator */}
                {(isLoading || !isMapReady) && (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <CircularProgress size={60} sx={{ mb: 2 }} />
                        <Typography variant="h6" color="white">
                            Loading map...
                        </Typography>
                    </Box>
                )}
                
                {/* Error display */}
                {error && (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <Typography variant="h6" color="error">
                            Error: {error}
                        </Typography>
                    </Box>
                )}
                
                {/* Render route and POIs when map is ready and data is loaded */}
                {isMapReady && mapInstance.current && !isLoading && !error && (
                    <>
                        {/* Render all routes */}
                        {routeData?.allRoutesEnhanced && routeData.allRoutesEnhanced.map(route => (
                            <SimplifiedRouteLayer
                                map={mapInstance.current}
                                route={route}
                                key={route.id || route.routeId}
                                showDistanceMarkers={isDistanceMarkersVisible && route.id === currentRoute?.id}
                            />
                        ))}
                        
                        {/* Render POIs directly without context */}
                        {routeData?.pois?.draggable && routeData.pois.draggable.map(poi => (
                            <POIMarker
                                key={poi.id}
                                map={mapInstance.current}
                                poi={poi}
                                onClick={setSelectedPOI}
                                visiblePOICategories={visiblePOICategories}
                                scale={scale}
                            />
                        ))}
                        
                        {routeData?.pois?.places && routeData.pois.places.map(poi => (
                            <POIMarker
                                key={poi.id}
                                map={mapInstance.current}
                                poi={poi}
                                onClick={setSelectedPOI}
                                visiblePOICategories={visiblePOICategories}
                                scale={scale}
                            />
                        ))}
                        
                        {/* Render photo markers with clustering */}
                        {isPhotosVisible && clusteredPhotos.length > 0 && (
                            // Use clustered photos if available
                            clusteredPhotos.map(item => {
                                if (isCluster(item)) {
                                    // Render a cluster
                                    return (
                                        <PhotoCluster
                                            key={`cluster-${item.id || Math.random().toString(36).substr(2, 9)}`}
                                            map={mapInstance.current}
                                            cluster={item}
                                            onClick={() => handleClusterClick(item)}
                                        />
                                    );
                                } else {
                                    // Render a single photo marker
                                    const photo = item.properties.photo;
                                    return (
                                        <PhotoMarker
                                            key={`photo-${photo.id || Math.random().toString(36).substr(2, 9)}`}
                                            map={mapInstance.current}
                                            photo={photo}
                                            onClick={() => setSelectedPhoto(photo)}
                                        />
                                    );
                                }
                            })
                        )}
                        
                        {/* POI Viewer */}
                        {selectedPOI && (
                            <PresentationPOIViewer 
                                poi={selectedPOI} 
                                onClose={() => setSelectedPOI(null)} 
                            />
                        )}
                        
                        {/* Photo Lightbox */}
                        {selectedPhoto && (
                            <SimpleLightbox 
                                photo={selectedPhoto} 
                                onClose={() => setSelectedPhoto(null)}
                                disableDelete={true}
                            />
                        )}
                        
                        {/* Route name display */}
                        {currentRoute && (
                            <div className="route-filename">
                                {currentRoute.name || 'Unnamed Route'}
                            </div>
                        )}
                        
                        {/* Elevation Profile with Description Tab */}
                        {currentRoute && (
                            <div className="elevation-container">
                                {/* Use the PhotoProvider with photos directly in the value prop */}
                                <PhotoProvider>
                                    <PresentationElevationProfilePanel 
                                        route={{
                                            ...currentRoute,
                                            // Add the photos to the route object directly
                                            // This ensures they're available to the PresentationRouteDescriptionPanel
                                            _allPhotos: routeData?.photos || []
                                        }} 
                                    />
                                </PhotoProvider>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
