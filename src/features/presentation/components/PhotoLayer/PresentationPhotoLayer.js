import { useState, useCallback, useMemo, useEffect } from 'react';
import React from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { PhotoMarker } from '../../../photo/components/PhotoMarker/PhotoMarker';
import { PhotoCluster } from '../../../photo/components/PhotoCluster/PhotoCluster';
import { PhotoModal } from './PhotoModal';
import { clusterPhotosPresentation, isCluster, getClusterExpansionZoom } from '../../utils/photoClusteringPresentation';
import './PresentationPhotoLayer.css';

export const PresentationPhotoLayer = () => {
    const { map } = useMapContext();
    const { currentRoute } = useRouteContext();
    const { photos, loadPhotos } = usePhotoContext();
    
    // Load photos from route state
    useEffect(() => {
        if (!currentRoute || currentRoute._type !== 'loaded') {
            return;
        }
        if (currentRoute._loadedState?.photos) {
            loadPhotos(currentRoute._loadedState.photos);
        }
    }, [currentRoute]); // Remove loadPhotos from deps since it's a stable context function
    
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    // We don't need selectedCluster state anymore as we'll use validPhotos directly
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
        const filtered = photos.filter(p => {
            if (!p.coordinates) {
                return false;
            }
            if (typeof p.coordinates.lat !== 'number' || typeof p.coordinates.lng !== 'number') {
                return false;
            }
            // Keep photos with valid coordinates, normalizing if needed
            const normalized = normalizeCoordinates(p.coordinates.lng, p.coordinates.lat);
            // Only filter out if coordinates are way outside bounds
            return Math.abs(normalized.lng - p.coordinates.lng) < 360 &&
                Math.abs(normalized.lat - p.coordinates.lat) < 90;
        });
        
        return filtered;
    }, [photos, normalizeCoordinates]);
    
    // Use rounded zoom level to reduce recalculations
    const roundedZoom = useMemo(() => {
        if (zoom === null) return null;
        return Math.floor(zoom * 2) / 2; // Round to nearest 0.5
    }, [zoom]);
    
    const clusteredItems = useMemo(() => {
        if (!map || roundedZoom === null) {
            return [];
        }
            
        // Apply extra aggressive clustering at lower zoom levels
        const isLowZoom = roundedZoom < 6;
        const options = isLowZoom ? { extraAggressive: true } : undefined;
        
        const clusters = clusterPhotosPresentation(validPhotos, roundedZoom, undefined, options);
        
        return clusters;
    }, [validPhotos, map, roundedZoom]); // Use roundedZoom instead of zoom
    
    const handleClusterClick = useCallback((cluster) => {
        if (!map)
            return;
        // Get the zoom level to expand this cluster and add additional zoom for more aggressive zooming
        const expansionZoom = getClusterExpansionZoom(cluster.properties.cluster_id, clusteredItems);
        const targetZoom = Math.min(expansionZoom + 1.5, 20); // Add 1.5 zoom levels, but cap at 20
        // Get the cluster's coordinates
        const [lng, lat] = cluster.geometry.coordinates;
        
        // Check if on mobile
        const isMobile = window.innerWidth <= 768 || 
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Zoom to the cluster's location with more aggressive zoom and no tilt on mobile
        map.easeTo({
            center: [lng, lat],
            zoom: targetZoom,
            pitch: isMobile ? 0 : 60, // No pitch on mobile, 60 degrees on desktop (consistent with PhotoModal)
            duration: isMobile ? 200 : 300 // Faster on mobile
        });
        // No longer opening the modal for clusters
        // Only individual photo markers will open the modal when clicked
    }, [map, clusteredItems]);
    
    // Get the photo visibility state from context
    const { isPhotosVisible } = usePhotoContext();
    
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

    // If photos are not visible, we'll still render the component but with no elements
    const shouldRenderElements = isPhotosVisible;

    // Keep track of which cluster contains the selected photo
    const [selectedPhotoCluster, setSelectedPhotoCluster] = useState(null);
    
    // Create a simulated lower zoom level clustering to find related photos
    const simulatedClustering = useMemo(() => {
        if (!map || roundedZoom === null || validPhotos.length === 0) {
            return [];
        }
        
        // Use a much lower zoom level to force more aggressive clustering
        const simulatedZoom = Math.max(0, roundedZoom - 3);
        
        // Apply extra aggressive clustering options
        const options = { 
            extraAggressive: true,
            radius: 300, // Larger radius to group more photos together
            maxZoom: 14  // Higher max zoom to maintain clusters longer (reduced by 4 total)
        };
        
        return clusterPhotosPresentation(validPhotos, simulatedZoom, undefined, options);
    }, [validPhotos, map, roundedZoom]);
    
    // Update the selected photo cluster when the selected photo changes
    useEffect(() => {
        if (selectedPhoto) {
            console.log('Selected photo:', selectedPhoto);
            
            // First try to find clusters in the current zoom level
            const containingClusters = clusteredItems.filter(item => 
                isCluster(item) && 
                item.properties.photos.some(photo => photo.url === selectedPhoto.url)
            );
            
            console.log(`Found ${containingClusters.length} clusters containing the selected photo at current zoom`);
            
            // If we found a cluster containing this photo, store it
            if (containingClusters.length > 0) {
                setSelectedPhotoCluster(containingClusters[0]);
                console.log(`Cluster contains ${containingClusters[0].properties.photos.length} photos`);
            } else {
                // If no clusters found at current zoom, try the simulated lower zoom clustering
                const simulatedClusters = simulatedClustering.filter(item => 
                    isCluster(item) && 
                    item.properties.photos.some(photo => photo.url === selectedPhoto.url)
                );
                
                console.log(`Found ${simulatedClusters.length} clusters containing the selected photo at simulated zoom`);
                
                if (simulatedClusters.length > 0) {
                    // We found a cluster at the simulated zoom level
                    const simulatedCluster = simulatedClusters[0];
                    console.log(`Simulated cluster contains ${simulatedCluster.properties.photos.length} photos`);
                    
                    // Now find all photos in this simulated cluster
                    const relatedPhotoUrls = simulatedCluster.properties.photos.map(p => p.url);
                    console.log('Related photo URLs:', relatedPhotoUrls);
                    
                    // Find all clusters at the current zoom level that contain any of these related photos
                    const relatedClusters = clusteredItems.filter(item => 
                        isCluster(item) && 
                        item.properties.photos.some(photo => relatedPhotoUrls.includes(photo.url))
                    );
                    
                    if (relatedClusters.length > 0) {
                        setSelectedPhotoCluster(relatedClusters[0]);
                        console.log(`Using related cluster with ${relatedClusters[0].properties.photos.length} photos`);
                    } else {
                        console.log('No related clusters found at current zoom level');
                        setSelectedPhotoCluster(null);
                    }
                } else {
                    console.log('No clusters found containing the selected photo at any zoom level');
                    setSelectedPhotoCluster(null);
                }
            }
        } else {
            // If there's no selected photo, clear the selected cluster
            setSelectedPhotoCluster(null);
        }
    }, [selectedPhoto, clusteredItems, simulatedClustering]);

    // Get related photo URLs from simulated clustering
    const relatedPhotoUrls = useMemo(() => {
        if (!selectedPhoto) return new Set();
        
        // Find the simulated cluster that contains the selected photo
        const simulatedCluster = simulatedClustering.find(item => 
            isCluster(item) && 
            item.properties.photos.some(photo => photo.url === selectedPhoto.url)
        );
        
        if (simulatedCluster && isCluster(simulatedCluster)) {
            // Get all photo URLs in this simulated cluster
            const urls = new Set(simulatedCluster.properties.photos.map(photo => photo.url));
            console.log(`Found ${urls.size} related photos that would be in the same cluster at a lower zoom level`);
            return urls;
        }
        
        // If no cluster found, just include the selected photo
        return new Set([selectedPhoto.url]);
    }, [selectedPhoto, simulatedClustering]);
    
    // Create the clustered items elements, but only if photos are visible
    let clusterElements = [];
    if (shouldRenderElements) {
        clusterElements = clusteredItems.map(item => {
        if (isCluster(item)) {
            // Check if this cluster is the selected photo cluster
            const isSelectedCluster = selectedPhotoCluster && 
                item.properties.cluster_id === selectedPhotoCluster.properties.cluster_id;
                
            // Check if this cluster contains the selected photo or any related photos
            const containsSelectedPhoto = selectedPhoto && 
                item.properties.photos.some(photo => photo.url === selectedPhoto.url);
                
            // Check if this cluster contains any related photos from the simulated clustering
            const containsRelatedPhoto = selectedPhoto && 
                item.properties.photos.some(photo => relatedPhotoUrls.has(photo.url));
                
            // Highlight the cluster if it's the selected cluster, contains the selected photo,
            // or contains any related photos
            const shouldHighlight = isSelectedCluster || containsSelectedPhoto || containsRelatedPhoto;
            
            // Debug log to verify cluster highlighting
            if (shouldHighlight) {
                if (isSelectedCluster) {
                    console.log('Highlighting cluster because it is the selected cluster');
                }
                if (containsSelectedPhoto) {
                    console.log('Highlighting cluster containing selected photo:', selectedPhoto.url);
                }
                console.log('Cluster contains', item.properties.photos.length, 'photos');
                
                // Log all photo URLs in this cluster for debugging
                console.log('Photos in this cluster:', item.properties.photos.map(p => p.url));
            }
            
            return React.createElement(PhotoCluster, {
                key: `cluster-${item.properties.cluster_id}`,
                cluster: item,
                onClick: () => handleClusterClick(item),
                isHighlighted: shouldHighlight
            });
        } else {
            // Check if this marker is the selected photo
            const isSelectedPhoto = selectedPhoto && (
                // Try URL match
                (selectedPhoto.url && item.properties.photo.url && 
                 selectedPhoto.url === item.properties.photo.url) ||
                // Try ID match
                (selectedPhoto.id && item.properties.photo.id && 
                 selectedPhoto.id === item.properties.photo.id) ||
                // Try coordinates match
                (selectedPhoto.coordinates && item.properties.photo.coordinates &&
                 selectedPhoto.coordinates.lat === item.properties.photo.coordinates.lat &&
                 selectedPhoto.coordinates.lng === item.properties.photo.coordinates.lng)
            );
            
            // Check if this marker is a related photo from the simulated clustering
            const isRelatedPhoto = selectedPhoto && 
                item.properties.photo.url && 
                relatedPhotoUrls.has(item.properties.photo.url);
                
            // Highlight the marker if it's the selected photo or a related photo
            const isHighlighted = isSelectedPhoto || isRelatedPhoto;
            
            // Debug log for related photo markers
            if (isRelatedPhoto && !isSelectedPhoto) {
                console.log('Highlighting related photo marker:', item.properties.photo.url);
            }
            
            return React.createElement(PhotoMarker, {
                key: item.properties.id,
                photo: item.properties.photo,
                isHighlighted: isHighlighted,
                onClick: () => {
                    console.log('Photo marker clicked:', item.properties.photo);
                    console.log('Marker coordinates:', item.properties.photo.coordinates);
                    console.log('Map center:', map.getCenter());
                    setSelectedPhoto(item.properties.photo);
                    // Force the map to center on the photo with a reduced tilt angle on desktop only
                    if (map && item.properties.photo.coordinates) {
                        // Check if on mobile
                        const isMobile = window.innerWidth <= 768 || 
                            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                        
                        map.easeTo({
                            center: [item.properties.photo.coordinates.lng, item.properties.photo.coordinates.lat],
                            zoom: map.getZoom(),
                            pitch: isMobile ? 0 : 60, // No pitch on mobile, 60 degrees on desktop (consistent with PhotoModal)
                            duration: isMobile ? 200 : 300 // Faster on mobile
                        });
                    }
                }
            });
        }
    });
    }

    // Create the photo modal element if there's a selected photo
    const photoModalElement = selectedPhoto ? 
        (() => {
            // Find the index of the selected photo in the ordered array using URL as unique identifier
            const selectedPhotoIndex = orderedPhotos.findIndex(p => p.url === selectedPhoto.url);
            console.log('Selected photo URL:', selectedPhoto.url);
            console.log('Selected photo index in ordered array:', selectedPhotoIndex);
            
            // Check if on mobile
            const isMobile = window.innerWidth <= 768 || 
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // On mobile, only pass a subset of photos centered around the selected one
            let photosToPass = orderedPhotos;
            if (isMobile) {
                // Get 5 photos centered around the selected one (2 before, selected, 2 after)
                const startIdx = Math.max(0, selectedPhotoIndex - 2);
                const endIdx = Math.min(orderedPhotos.length, selectedPhotoIndex + 3);
                photosToPass = orderedPhotos.slice(startIdx, endIdx);
                console.log(`Mobile detected: Limiting photos to ${photosToPass.length} (index range ${startIdx}-${endIdx})`);
            }
            
            // Find the new index of the selected photo in the limited array
            const newIndex = isMobile ? 
                photosToPass.findIndex(p => p.url === selectedPhoto.url) : 
                selectedPhotoIndex;
            
            return React.createElement(PhotoModal, {
                key: `preview-${selectedPhoto.url}`,
                photo: selectedPhoto,
                onClose: () => {
                    console.log('Closing photo modal');
                    setSelectedPhoto(null);
                },
                additionalPhotos: photosToPass,
                initialIndex: newIndex,
                onPhotoChange: setSelectedPhoto
            });
        })() : null;

    // Create the main container element with all children
    return React.createElement(
        'div',
        { className: 'presentation-photo-layer' },
        shouldRenderElements ? [...clusterElements, photoModalElement] : []
    );
};
