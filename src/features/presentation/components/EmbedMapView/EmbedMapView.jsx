import { useRef, useState, useEffect, useCallback } from 'react';
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
import { useRouteDataLoader, filterPhotosByRoute } from './hooks/useRouteDataLoader';

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


export default function EmbedMapView() {
    const { stateId } = useParams();
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isDistanceMarkersVisible, setIsDistanceMarkersVisible] = useState(true);
    const [selectedPOI, setSelectedPOI] = useState(null);
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
    const [isFlyByActive, setIsFlyByActive] = useState(false);
    
    // Refs to store animation timeouts so we can cancel them
    const animationTimeoutsRef = useRef([]);
    const routeBoundsRef = useRef(null);
    
    // Use the custom hook for data loading
    const {
        isLoading,
        routeData,
        mapState,
        error,
        currentRoute,
        setCurrentRoute,
        setRouteData
    } = useRouteDataLoader(stateId);
    
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
    
    // Calculate bearing between two points
    const calculateBearing = useCallback((start, end) => {
        const startLat = start[1] * Math.PI / 180;
        const startLng = start[0] * Math.PI / 180;
        const endLat = end[1] * Math.PI / 180;
        const endLng = end[0] * Math.PI / 180;
        
        const y = Math.sin(endLng - startLng) * Math.cos(endLat);
        const x = Math.cos(startLat) * Math.sin(endLat) -
                Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
        
        let bearing = Math.atan2(y, x) * 180 / Math.PI;
        bearing = (bearing + 360) % 360;
        
        return bearing;
    }, []);

    // Function to stop the flyby animation
    const stopFlyby = useCallback(() => {
        // Clear all pending animation timeouts
        animationTimeoutsRef.current.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        animationTimeoutsRef.current = [];
        
        console.log('[Flyby] Flyby stopped by user');
        
        // If we have stored route bounds, fit to them
        if (routeBoundsRef.current && mapInstance.current) {
            mapInstance.current.fitBounds(routeBoundsRef.current, {
                padding: 200,
                pitch: 45,
                duration: 1000,
                easing: (t) => {
                    // Ease out cubic - smooth deceleration
                    return 1 - Math.pow(1 - t, 3);
                }
            });
        }
        
        // Reset the active state
        setIsFlyByActive(false);
    }, []);

    // Function to start the flyby animation - improved implementation with reduced spinning
    const startFlyby = useCallback((route) => {
        if (!mapInstance.current || !route?.geojson?.features?.[0]?.geometry?.coordinates) {
            console.error('[Flyby] No map or route coordinates available');
            return;
        }
        
        // Clear any existing timeouts
        animationTimeoutsRef.current.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        animationTimeoutsRef.current = [];
        
        // Get route coordinates
        const allCoords = route.geojson.features[0].geometry.coordinates;
        
        // Sample coordinates for smoother animation
        const routeLength = allCoords.length;
        const targetPoints = Math.min(100, Math.max(40, Math.floor(routeLength / 20))); 
        const sampleRate = Math.max(1, Math.floor(routeLength / targetPoints));
        
        // Sample coordinates evenly
        let sampledCoords = [];
        for (let i = 0; i < allCoords.length; i += sampleRate) {
            sampledCoords.push(allCoords[i]);
        }
        
        // Always include the last point
        if (sampledCoords[sampledCoords.length - 1] !== allCoords[allCoords.length - 1]) {
            sampledCoords.push(allCoords[allCoords.length - 1]);
        }
        
        console.log('[Flyby] Starting flyby with', sampledCoords.length, 'points');
        
        // Calculate the overall bearing from start to end
        const overallBearing = calculateBearing(
            sampledCoords[0], 
            sampledCoords[sampledCoords.length - 1]
        );
        
        // Calculate bounds for the intro and outro animations
        const bounds = new mapboxgl.LngLatBounds();
        allCoords.forEach(coord => {
            bounds.extend(coord);
        });
        
        // Store the bounds for later use when stopping
        routeBoundsRef.current = bounds;
        
        // Set initial camera position
        mapInstance.current.easeTo({
            center: sampledCoords[0],
            zoom: 15,
            pitch: 75, // High pitch to look ahead
            bearing: overallBearing, // Use the overall bearing for consistent direction
            duration: 1500,
            easing: (t) => {
                // Cubic easing for smoother acceleration
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            }
        });
        
        // Animate through points
        let currentIndex = 1;
        let prevBearing = overallBearing;
        
        const flyToNextPoint = () => {
            if (currentIndex >= sampledCoords.length) {
                console.log('[Flyby] Flyby complete');
                
                // Simply zoom out to show the entire route
                mapInstance.current.fitBounds(bounds, {
                    padding: 200,
                    pitch: 45,
                    duration: 2500,
                    easing: (t) => {
                        // Ease out cubic - smooth deceleration
                        return 1 - Math.pow(1 - t, 3);
                    }
                });
                
                setIsFlyByActive(false); // Reset the button state when animation completes
                return;
            }
            
            const currentPoint = sampledCoords[currentIndex];
            
            // Look ahead for bearing calculation
            const lookAheadIndex = Math.min(currentIndex + 5, sampledCoords.length - 1);
            
            // Calculate bearing to look-ahead point
            let targetBearing;
            
            // If we're near the end, use the overall bearing to avoid spinning
            if (currentIndex > sampledCoords.length - 10) {
                targetBearing = overallBearing;
            } else {
                targetBearing = calculateBearing(currentPoint, sampledCoords[lookAheadIndex]);
            }
            
            // Smooth bearing changes with very heavy weighting to previous bearing
            // This creates much less spinning
            const bearingBlendFactor = 0.9; // Very high value = minimal turning
            const bearing = prevBearing * bearingBlendFactor + targetBearing * (1 - bearingBlendFactor);
            prevBearing = bearing; // Save for next iteration
            
            // Calculate distance to next point to adjust speed
            const nextPoint = sampledCoords[Math.min(currentIndex + 1, sampledCoords.length - 1)];
            const dx = nextPoint[0] - currentPoint[0];
            const dy = nextPoint[1] - currentPoint[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // More consistent duration for smoother movement
            const baseDuration = 400; // Faster base duration
            const duration = Math.max(300, Math.min(600, baseDuration * (distance * 5000)));
            
            // Keep pitch consistent to avoid bobbing
            const pitch = 75;
            
            // Move camera to next point with smooth parameters
            mapInstance.current.easeTo({
                center: currentPoint,
                bearing: bearing,
                pitch: pitch,
                duration: duration,
                easing: (t) => t, // Linear easing for more consistent speed
                essential: true
            });
            
            // Schedule next point with more overlap for smoother transitions
            currentIndex++;
            const timeoutId = setTimeout(flyToNextPoint, duration * 0.7);
            animationTimeoutsRef.current.push(timeoutId); // Store timeout ID for cancellation
        };
        
        // Start animation after initial positioning
        const initialTimeoutId = setTimeout(flyToNextPoint, 1500);
        animationTimeoutsRef.current.push(initialTimeoutId); // Store timeout ID for cancellation
    }, [calculateBearing]);

    // Function to handle fly-by button click
    const handleFlyBy = useCallback(() => {
        const newState = !isFlyByActive;
        setIsFlyByActive(newState);
        
        if (newState && currentRoute) {
            startFlyby(currentRoute);
        } else {
            // Stop the flyby animation
            stopFlyby();
        }
    }, [isFlyByActive, currentRoute, startFlyby, stopFlyby]);

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
                                            _allPhotos: routeData?.photos || [],
                                            // Ensure description has the correct structure with photos
                                            description: {
                                                ...currentRoute.description,
                                                // If description.photos is missing or empty, use filtered photos
                                                photos: currentRoute.description?.photos?.length > 0 
                                                    ? currentRoute.description.photos 
                                                    : filterPhotosByRoute(routeData?.photos?.map(photo => ({
                                                        ...photo,
                                                        // Ensure each photo has the required properties
                                                        id: photo.id || photo._id,
                                                        url: photo.url,
                                                        thumbnailUrl: photo.thumbnailUrl || photo.url,
                                                        coordinates: photo.coordinates
                                                    })) || [], currentRoute)
                                            }
                                        }}
                                        isFlyByActive={isFlyByActive}
                                        handleFlyByClick={handleFlyBy}
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
