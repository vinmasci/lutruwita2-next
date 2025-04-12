import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// Cache for loaded photos to avoid reloading for the same route
// Using a version number to allow for cache invalidation when needed
const CACHE_VERSION = 3; // Increment this to invalidate all caches
const loadedPhotosCache = new Map();

// Function to clear the entire photo cache
export const clearPhotoCache = () => {
  console.log('[PresentationPhotoLayer] Clearing entire photo cache');
  loadedPhotosCache.clear();
};

// Force clear the cache on module load
clearPhotoCache();

import React from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { PhotoMarker } from '../../../photo/components/PhotoMarker/PhotoMarker';
import SimplifiedPhotoMarker from '../../../photo/components/SimplifiedPhotoMarker/SimplifiedPhotoMarker';
import { PhotoCluster } from '../../../photo/components/PhotoCluster/PhotoCluster';
import SimplifiedPhotoCluster from '../../../photo/components/SimplifiedPhotoCluster/SimplifiedPhotoCluster';
import { PhotoModal } from './PhotoModal';
import { clusterPhotosPresentation, isCluster, getClusterExpansionZoom } from '../../utils/photoClusteringPresentation';
import './PresentationPhotoLayer.css';

export const PresentationPhotoLayer = () => {
    const { map } = useMapContext();
    const { currentRoute } = useRouteContext();
    const { photos, loadPhotos } = usePhotoContext();
    
    // Load photos from route state with caching
    useEffect(() => {
        if (!currentRoute || currentRoute._type !== 'loaded') {
            return;
        }
        
        // IMPORTANT: ALWAYS FORCE RELOAD PHOTOS TO FIX CAPTION ISSUES
        // This bypasses the cache completely
        
        if (currentRoute._loadedState?.photos) {
            // Make a deep copy of the photos to ensure we preserve all properties
            const photosCopy = currentRoute._loadedState.photos.map(photo => ({
                ...photo,
                // Explicitly preserve caption if it exists
                caption: photo.caption !== undefined && photo.caption !== null ? photo.caption : undefined
            }));
            
            // Load the copied photos
            loadPhotos(photosCopy);
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
        
        // Use easeTo for cluster clicks as it provides a smoother experience
        map.easeTo({
            center: [lng, lat],
            zoom: targetZoom,
            pitch: isMobile ? 0 : 60, // No pitch on mobile, 60 degrees on desktop
            duration: isMobile ? 200 : 300 // Faster on mobile
        });
        
        // No longer opening the modal for clusters
        // Only individual photo markers will open the modal when clicked
    }, [map, clusteredItems]);
    
    // Helper function to detect mobile devices
    const isMobileDevice = useCallback(() => {
        return window.innerWidth <= 768 || 
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }, []);
    
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
            radius: 100, // Reduced radius to make clusters tighter
            maxZoom: 14  // Higher max zoom to maintain clusters longer (reduced by 4 total)
        };
        
        return clusterPhotosPresentation(validPhotos, simulatedZoom, undefined, options);
    }, [validPhotos, map, roundedZoom]);
    
    // Helper function to normalize URLs for protocol-agnostic comparison
    const normalizeUrlForComparison = useCallback((url) => {
        if (!url) return '';
        // Remove protocol (http:// or https://) from the URL for comparison
        return url.replace(/^https?:\/\//, '');
    }, []);
    
    // Update the selected photo cluster when the selected photo changes
    useEffect(() => {
        if (!selectedPhoto) {
            // If there's no selected photo, clear the selected cluster
            setSelectedPhotoCluster(null);
            return;
        }
        
        // Find clusters in the current zoom level that contain the selected photo
        const normalizedSelectedUrl = normalizeUrlForComparison(selectedPhoto.url);
        const containingClusters = clusteredItems.filter(item => 
            isCluster(item) && 
            item.properties.photos.some(photo => normalizeUrlForComparison(photo.url) === normalizedSelectedUrl)
        );
        
        // If we found a cluster containing this photo, store it
        if (containingClusters.length > 0) {
            setSelectedPhotoCluster(containingClusters[0]);
        } else {
            // If no direct cluster found, try to find related photos
            setSelectedPhotoCluster(null);
        }
    }, [selectedPhoto, clusteredItems, normalizeUrlForComparison]);

    // Get related photo URLs from simulated clustering
    const relatedPhotoUrls = useMemo(() => {
        if (!selectedPhoto) return new Set();
        
        // Find the simulated cluster that contains the selected photo
        const normalizedSelectedUrl = normalizeUrlForComparison(selectedPhoto.url);
        const simulatedCluster = simulatedClustering.find(item => 
            isCluster(item) && 
            item.properties.photos.some(photo => normalizeUrlForComparison(photo.url) === normalizedSelectedUrl)
        );
        
        if (simulatedCluster && isCluster(simulatedCluster)) {
            // Get all photo URLs in this simulated cluster
            return new Set(simulatedCluster.properties.photos.map(photo => photo.url));
        }
        
        // If no cluster found, just include the selected photo
        return new Set([selectedPhoto.url]);
    }, [selectedPhoto, simulatedClustering, normalizeUrlForComparison]);
    
    // No longer limiting markers since we're using simplified markers on mobile
    // This is kept as a comment for reference in case we need to reintroduce limits
    /*
    const getMarkerLimit = useCallback(() => {
        const isMobile = window.innerWidth <= 768 || 
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        // Check for low memory devices (if deviceMemory API is available)
        const isLowEndDevice = navigator.deviceMemory && navigator.deviceMemory <= 4;
        
        if (isIOS) return 30;  // Most restrictive for iOS
        if (isLowEndDevice) return 40;  // Restrictive for low-end Android
        if (isMobile) return 50;  // Standard mobile limit
        return 200;  // Desktop can handle more
    }, []);
    */
    
    // Filter and limit clusters based on viewport and device capability
    const visibleClusterElements = useMemo(() => {
        if (!map || !shouldRenderElements || clusteredItems.length === 0) {
            return [];
        }
        
        // Get current viewport bounds with buffer
        const bounds = map.getBounds();
        
        // Filter items to only include those within the viewport (with buffer)
        // This still helps performance by not rendering off-screen markers
        const visibleItems = clusteredItems.filter(item => {
            const [lng, lat] = item.geometry.coordinates;
            return lng >= bounds.getWest() - 0.1 && 
                   lng <= bounds.getEast() + 0.1 && 
                   lat >= bounds.getSouth() - 0.1 && 
                   lat <= bounds.getNorth() + 0.1;
        });
        
        // Create React elements for all visible items
        return visibleItems.map(item => {
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
                
                // Use simplified cluster on mobile devices
                const ClusterComponent = isMobileDevice() ? SimplifiedPhotoCluster : PhotoCluster;
                
                return React.createElement(ClusterComponent, {
                    key: `cluster-${item.properties.cluster_id}`,
                    cluster: item,
                    onClick: () => handleClusterClick(item),
                    isHighlighted: shouldHighlight
                });
            } else {
                // Check if this marker is the selected photo
                const isSelectedPhoto = selectedPhoto && (
                    // Try URL match (protocol-agnostic)
                    (selectedPhoto.url && item.properties.photo.url && 
                     normalizeUrlForComparison(selectedPhoto.url) === normalizeUrlForComparison(item.properties.photo.url)) ||
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
                
                // Use simplified marker on mobile devices
                const MarkerComponent = isMobileDevice() ? SimplifiedPhotoMarker : PhotoMarker;
                
                return React.createElement(MarkerComponent, {
                    key: item.properties.id,
                    photo: item.properties.photo,
                    isHighlighted: isHighlighted,
                    onClick: () => {
                        // Detect iOS devices
                        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                        
                        // First, pan the map to the photo's location without changing pitch
                        if (map && item.properties.photo.coordinates) {
                            // Check if on mobile
                            const isMobile = window.innerWidth <= 768 || 
                                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                            
                            // Use panTo instead of easeTo to avoid changing pitch
                            map.panTo(
                                [item.properties.photo.coordinates.lng, item.properties.photo.coordinates.lat],
                                { duration: isMobile ? 200 : 300 } // Faster on mobile
                            );
                        }
                        
                        // Create a deep copy of the photo object to avoid modifying the original
                        // Explicitly preserve all properties including caption
                        const photoWithHttpsUrls = { 
                            ...item.properties.photo,
                            // Only use empty string if caption is actually undefined or null
                            caption: item.properties.photo.caption !== undefined && 
                                    item.properties.photo.caption !== null ? 
                                    item.properties.photo.caption : '' 
                        };
                        
                        // Helper function to ensure HTTPS URLs
                        const ensureHttpsUrl = (url) => {
                            if (typeof url === 'string' && url.startsWith('http:')) {
                                return url.replace('http:', 'https:');
                            }
                            return url;
                        };
                        
                        // Ensure the main URL uses HTTPS
                        if (photoWithHttpsUrls.url) {
                            photoWithHttpsUrls.url = ensureHttpsUrl(photoWithHttpsUrls.url);
                        }
                        
                        // Also check other URL properties
                        ['thumbnailUrl', 'tinyThumbnailUrl', 'mediumUrl', 'largeUrl'].forEach(urlProp => {
                            if (photoWithHttpsUrls[urlProp]) {
                                photoWithHttpsUrls[urlProp] = ensureHttpsUrl(photoWithHttpsUrls[urlProp]);
                            }
                        });
                        
                        // Then, after a delay, set the selected photo to open the modal
                        // Use a longer delay on iOS devices to prevent crashes
                        const delay = isIOS ? 400 : 200;
                        setTimeout(() => {
                            setSelectedPhoto(photoWithHttpsUrls);
                        }, delay);
                    }
                });
            }
        });
    }, [map, clusteredItems, shouldRenderElements, zoom, selectedPhoto, selectedPhotoCluster, 
        relatedPhotoUrls, normalizeUrlForComparison, handleClusterClick, isMobileDevice]);

    // Create the photo modal element if there's a selected photo
    const photoModalElement = selectedPhoto ? 
        (() => {
            // Find the index of the selected photo in the ordered array using URL as unique identifier
            // Use protocol-agnostic comparison to handle http vs https differences
            const selectedPhotoIndex = orderedPhotos.findIndex(p => 
                normalizeUrlForComparison(p.url) === normalizeUrlForComparison(selectedPhoto.url)
            );
            
            // Check if on mobile
            const isMobile = window.innerWidth <= 768 || 
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Pass all photos to allow full navigation
            // We used to limit this to 3 photos on mobile, but that prevented full navigation
            const photosToPass = orderedPhotos;
            
            // Find the new index of the selected photo in the limited array
            // Use protocol-agnostic comparison for both mobile and desktop
            const newIndex = isMobile ? 
                photosToPass.findIndex(p => normalizeUrlForComparison(p.url) === normalizeUrlForComparison(selectedPhoto.url)) : 
                selectedPhotoIndex;
            
            // Ensure all photos have a caption field before passing to PhotoModal
            const photosWithCaptions = photosToPass.map(p => ({
                ...p,
                caption: p.caption !== undefined ? p.caption : '' // Preserve existing caption or use empty string
            }));
            
            // Create a stable reference for the selected photo to prevent infinite loops
            const stableSelectedPhoto = {
                ...selectedPhoto,
                caption: selectedPhoto.caption !== undefined ? selectedPhoto.caption : '' // Ensure caption exists
            };
            
            return React.createElement(PhotoModal, {
                key: `preview-${selectedPhoto.url}`,
                photo: stableSelectedPhoto,
                onClose: () => {
                    setSelectedPhoto(null);
                },
                additionalPhotos: photosWithCaptions,
                initialIndex: newIndex,
                // Don't pass onPhotoChange to avoid infinite loops
                // The modal will still work correctly without this callback
                // onPhotoChange: setSelectedPhoto
            });
        })() : null;

    // Create the main container element with all children
    return React.createElement(
        'div',
        { className: 'presentation-photo-layer' },
        shouldRenderElements ? [...visibleClusterElements, photoModalElement] : []
    );
};
