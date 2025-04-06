import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../context/PhotoContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { PhotoMarker } from '../PhotoMarker/PhotoMarker';
import { PhotoCluster } from '../PhotoCluster/PhotoCluster';
import { PhotoModal } from '../PhotoPreview/PhotoModal';
import { clusterPhotos, isCluster, getClusterExpansionZoom, getPhotoIdentifier } from '../../utils/clustering';
import logger from '../../../../utils/logger';
import './PhotoLayer.css';
export const PhotoLayer = () => {
    const { map } = useMapContext();
    const { currentRoute } = useRouteContext();
    const { photos } = usePhotoContext();
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [zoom, setZoom] = useState(null);
    // Listen for zoom changes with throttling to reduce recalculations
    useEffect(() => {
        if (!map)
            return;
            
        let lastZoomUpdate = 0;
        const THROTTLE_MS = 150; // Minimum ms between updates
        
        const handleZoom = () => {
            const now = Date.now();
            if (now - lastZoomUpdate < THROTTLE_MS) return;
            
            lastZoomUpdate = now;
            const newZoom = map.getZoom();
            
            // Only update if zoom changed significantly (0.5 levels)
            if (zoom === null || Math.abs(newZoom - zoom) >= 0.5) {
                setZoom(newZoom);
            }
        };
        
        map.on('zoom', handleZoom);
        
        // Set initial zoom
        setZoom(map.getZoom());
        
        return () => {
            map.off('zoom', handleZoom);
        };
    }, [map, zoom]);
    // Helper function to normalize coordinates within valid bounds for safety
    const normalizeCoordinates = useCallback((lng, lat) => {
        // Normalize longitude to [-180, 180]
        let normalizedLng = lng;
        while (normalizedLng > 180)
            normalizedLng -= 360;
        while (normalizedLng < -180)
            normalizedLng += 360;
        // Clamp latitude to [-90, 90]
        const normalizedLat = Math.max(-90, Math.min(90, lat));
        return { lng: normalizedLng, lat: normalizedLat };
    }, []);
    // Filter photos to only include those with valid coordinates
    const validPhotos = useMemo(() => {
        return photos.filter(p => {
            if (!p.coordinates) {
                logger.warn('PhotoLayer', `Photo missing coordinates: ${p.id}`);
                return false;
            }
            if (typeof p.coordinates.lat !== 'number' || typeof p.coordinates.lng !== 'number') {
                logger.warn('PhotoLayer', `Photo has invalid coordinates: ${p.id}`, p.coordinates);
                return false;
            }
            // Normalize coordinates for safety
            const normalized = normalizeCoordinates(p.coordinates.lng, p.coordinates.lat);
            p.coordinates.lng = normalized.lng;
            p.coordinates.lat = normalized.lat;
            return true;
        });
    }, [photos, normalizeCoordinates]);
    
    // Function to get nearby photos for the lightbox, organized by route and km position
    const getOrderedPhotos = useCallback((allPhotos) => {
        if (!allPhotos || allPhotos.length === 0) {
            return [];
        }
        
        // Get the current routes from context
        const routes = currentRoute?._loadedState?.routes || [];
        
        // Function to find which route a photo belongs to and its position along that route
        const getPhotoRouteInfo = (photo) => {
            if (!photo.coordinates) return { routeIndex: Infinity, distanceAlongRoute: Infinity };
            
            let bestRouteIndex = Infinity;
            let bestDistanceAlongRoute = Infinity;
            let shortestDistance = Infinity;
            
            // Helper function to calculate distance between two points using Haversine formula
            const calculateDistance = (point1, point2) => {
                // Convert to radians
                const toRad = (value) => value * Math.PI / 180;
                
                const lat1 = point1[1];
                const lng1 = point1[0];
                const lat2 = point2[1];
                const lng2 = point2[0];
                
                const φ1 = toRad(lat1);
                const φ2 = toRad(lat2);
                const Δφ = toRad(lat2 - lat1);
                const Δλ = toRad(lng2 - lng1);
                
                // Haversine formula
                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                          Math.cos(φ1) * Math.cos(φ2) *
                          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                
                // Earth's radius in meters
                const R = 6371e3;
                return R * c;
            };
            
            // Check each route to find the closest one to this photo
            routes.forEach((route, routeIndex) => {
                if (!route.geojson?.features?.[0]?.geometry?.coordinates) return;
                
                const routeCoords = route.geojson.features[0].geometry.coordinates;
                
                // Find the closest point on this route to the photo
                let minDistance = Infinity;
                let closestPointIndex = -1;
                
                routeCoords.forEach((coord, index) => {
                    if (!coord || coord.length < 2) return;
                    
                    // Calculate distance between route point and photo using Haversine formula
                    const photoPoint = [photo.coordinates.lng, photo.coordinates.lat];
                    const distance = calculateDistance(coord, photoPoint);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPointIndex = index;
                    }
                });
                
                // If this route is closer than any previous route
                if (minDistance < shortestDistance) {
                    shortestDistance = minDistance;
                    bestRouteIndex = routeIndex;
                    
                    // Calculate actual distance along the route up to this point
                    let distanceAlongRoute = 0;
                    for (let i = 1; i <= closestPointIndex; i++) {
                        distanceAlongRoute += calculateDistance(
                            routeCoords[i-1], 
                            routeCoords[i]
                        );
                    }
                    
                    bestDistanceAlongRoute = distanceAlongRoute;
                }
            });
            
            return { routeIndex: bestRouteIndex, distanceAlongRoute: bestDistanceAlongRoute };
        };
        
        // Calculate route info for each photo
        const photosWithRouteInfo = allPhotos.map(photo => {
            const routeInfo = getPhotoRouteInfo(photo);
            return {
                ...photo,
                routeIndex: routeInfo.routeIndex,
                distanceAlongRoute: routeInfo.distanceAlongRoute
            };
        });
        
        // Sort photos by route index first, then by distance along route
        const sortedPhotos = [...photosWithRouteInfo].sort((a, b) => {
            // First sort by route index
            if (a.routeIndex !== b.routeIndex) {
                return a.routeIndex - b.routeIndex;
            }
            
            // Then sort by distance along route (from start to end)
            return a.distanceAlongRoute - b.distanceAlongRoute;
        });
        
        return sortedPhotos;
    }, [currentRoute]);
    
    // Memoize the ordered photos to avoid recalculating on every render
    const orderedPhotos = useMemo(() => {
        return getOrderedPhotos(validPhotos);
    }, [validPhotos, getOrderedPhotos]);
    // Use rounded zoom level to reduce recalculations
    const roundedZoom = useMemo(() => {
        if (zoom === null) return null;
        return Math.floor(zoom * 2) / 2; // Round to nearest 0.5
    }, [zoom]);
    
    const clusteredItems = useMemo(() => {
        if (!map || roundedZoom === null)
            return [];
        return clusterPhotos(validPhotos, 0, roundedZoom);
    }, [validPhotos, map, roundedZoom]);
    const handleClusterClick = useCallback((cluster) => {
        if (!map)
            return;
        // Get the zoom level to expand this cluster and add additional zoom for more aggressive zooming
        const expansionZoom = getClusterExpansionZoom(cluster.properties.cluster_id, clusteredItems);
        const targetZoom = Math.min(expansionZoom + 1.5, 20); // Add 1.5 zoom levels, but cap at 20
        // Get the cluster's coordinates
        const [lng, lat] = cluster.geometry.coordinates;
        // Zoom to the cluster's location with more aggressive zoom
        map.easeTo({
            center: [lng, lat],
            zoom: targetZoom
        });
        // No longer opening the modal for clusters
        // Only individual photo markers will open the modal when clicked
    }, [map, clusteredItems]);
    // Function to find the cluster that contains a photo using URL
    const findPhotoCluster = useCallback((photoUrl) => {
        if (!photoUrl) {
            logger.warn('PhotoLayer', 'No URL provided to findPhotoCluster');
            return null;
        }
        
        const photoIdentifier = getPhotoIdentifier(photoUrl);
        logger.debug('PhotoLayer', `Looking for photo with identifier: ${photoIdentifier}`);
        
        for (const item of clusteredItems) {
            if (isCluster(item) && item.properties.photos) {
                // Check if this cluster contains the photo using URL identifier
                const photoInCluster = item.properties.photos.find(p => {
                    const pIdentifier = getPhotoIdentifier(p.url);
                    return pIdentifier === photoIdentifier;
                });
                
                if (photoInCluster) {
                    return item.properties.photos;
                }
            }
        }
        return null;
    }, [clusteredItems, getPhotoIdentifier]);

    // Handle photo click - set both selectedPhoto and selectedCluster
    const handlePhotoClick = useCallback((photo) => {
        logger.debug('PhotoLayer', `Photo clicked: ${photo.name}`);
        logger.debug('PhotoLayer', `Photo identifier: ${getPhotoIdentifier(photo.url)}`);
        logger.debug('PhotoLayer', `Current zoom level: ${zoom}`);
        setSelectedPhoto(photo);
        
        // Find if this photo is part of a cluster using URL
        const clusterPhotos = findPhotoCluster(photo.url);
        logger.debug('PhotoLayer', `Found cluster photos: ${clusterPhotos ? clusterPhotos.length : 'none'}`);
        setSelectedCluster(clusterPhotos);
        
        // Force the map to center on the photo with a 60-degree tilt angle
        if (map && photo.coordinates) {
            map.easeTo({
                center: [photo.coordinates.lng, photo.coordinates.lat],
                zoom: map.getZoom(),
                pitch: 60, // Add a 60-degree pitch to angle the map
                duration: 800 // Slightly longer transition for the pitch change
            });
        }
    }, [findPhotoCluster, getPhotoIdentifier, zoom, map]);

    // Find the index of the selected photo in the ordered array
    const selectedPhotoIndex = useMemo(() => {
        if (!selectedPhoto || !orderedPhotos.length) return 0;
        return orderedPhotos.findIndex(p => p.url === selectedPhoto.url);
    }, [selectedPhoto, orderedPhotos]);

    // Check if a cluster contains the selected photo
    const isClusterContainingSelectedPhoto = useCallback((cluster) => {
        if (!selectedPhoto || !cluster.properties.photos) return false;
        return cluster.properties.photos.some(photo => photo.url === selectedPhoto.url);
    }, [selectedPhoto]);

    return (_jsxs("div", { className: "photo-layer", children: [
        clusteredItems.map(item => 
            isCluster(item) 
                ? (_jsx(PhotoCluster, { 
                    cluster: item, 
                    onClick: () => handleClusterClick(item),
                    isHighlighted: selectedPhoto && isClusterContainingSelectedPhoto(item)
                  }, `cluster-${item.properties.cluster_id}`)) 
                : (_jsx(PhotoMarker, { 
                    photo: item.properties.photo, 
                    onClick: () => handlePhotoClick(item.properties.photo),
                    isHighlighted: selectedPhoto && selectedPhoto.url === item.properties.photo.url
                  }, item.properties.id))
        ), 
        selectedPhoto && (_jsx(PhotoModal, { 
            photo: selectedPhoto, 
            onClose: () => {
                setSelectedPhoto(null);
                setSelectedCluster(null);
                // Restore pitch to 0 when closing the modal
                if (map) {
                    map.easeTo({
                        pitch: 0,
                        duration: 500
                    });
                }
            }, 
            additionalPhotos: orderedPhotos,
            initialIndex: selectedPhotoIndex,
            onPhotoChange: setSelectedPhoto,
            onDelete: (photoIdOrUrl) => {
                // Handle deletion if needed
                setSelectedPhoto(null);
                setSelectedCluster(null);
            }
        }, `preview-${selectedPhoto.id || selectedPhoto.url}`))
    ] }));
};
