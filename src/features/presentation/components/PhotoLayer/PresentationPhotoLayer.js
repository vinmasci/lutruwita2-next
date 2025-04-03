import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { PhotoMarker } from '../../../photo/components/PhotoMarker/PhotoMarker';
import { PhotoCluster } from '../../../photo/components/PhotoCluster/PhotoCluster';
import { SimpleLightbox } from '../../../photo/components/PhotoPreview/SimpleLightbox';
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
        console.log('[PresentationPhotoLayer] 🔄 Filtering photos for valid coordinates');
        console.time('photoFiltering');
        
        const filtered = photos.filter(p => {
            if (!p.coordinates) {
                console.warn('Photo missing coordinates:', p.id);
                return false;
            }
            if (typeof p.coordinates.lat !== 'number' || typeof p.coordinates.lng !== 'number') {
                console.warn('Photo has invalid coordinates:', p.id, p.coordinates);
                return false;
            }
            // Keep photos with valid coordinates, normalizing if needed
            const normalized = normalizeCoordinates(p.coordinates.lng, p.coordinates.lat);
            // Only filter out if coordinates are way outside bounds
            return Math.abs(normalized.lng - p.coordinates.lng) < 360 &&
                Math.abs(normalized.lat - p.coordinates.lat) < 90;
        });
        
        console.log('[PresentationPhotoLayer] Filtered photos:', {
            total: photos.length,
            valid: filtered.length,
            invalid: photos.length - filtered.length
        });
        
        console.timeEnd('photoFiltering');
        return filtered;
    }, [photos, normalizeCoordinates]);
    // Use rounded zoom level to reduce recalculations
    const roundedZoom = useMemo(() => {
        if (zoom === null) return null;
        return Math.floor(zoom * 2) / 2; // Round to nearest 0.5
    }, [zoom]);
    
    const clusteredItems = useMemo(() => {
        if (!map || roundedZoom === null) {
            console.log('[PresentationPhotoLayer] ⏭️ Skipping photo clustering - no map or zoom');
            return [];
        }
            
        console.log('[PresentationPhotoLayer] 🔄 Clustering photos at zoom level:', roundedZoom);
        console.time('photoClustering');
            
        // Apply extra aggressive clustering at lower zoom levels
        const isLowZoom = roundedZoom < 6;
        const options = isLowZoom ? { extraAggressive: true } : undefined;
        console.log('[PresentationPhotoLayer] Using extra aggressive clustering:', isLowZoom);
        
        const clusters = clusterPhotosPresentation(validPhotos, roundedZoom, undefined, options);
        
        console.log('[PresentationPhotoLayer] Clustering result:', {
            totalItems: clusters.length,
            clusters: clusters.filter(item => isCluster(item)).length,
            individualPhotos: clusters.filter(item => !isCluster(item)).length
        });
        
        console.timeEnd('photoClustering');
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
        // Zoom to the cluster's location with more aggressive zoom
        map.easeTo({
            center: [lng, lat],
            zoom: targetZoom
        });
        // No longer opening the modal for clusters
        // Only individual photo markers will open the modal when clicked
    }, [map, clusteredItems]);
    // Get the photo visibility state from context
    const { isPhotosVisible } = usePhotoContext();

    // If photos are not visible, return an empty fragment
    if (!isPhotosVisible) {
        return _jsx(_Fragment, {});
    }

    return (_jsxs("div", { className: "photo-layer", children: [clusteredItems.map(item => isCluster(item) ? (_jsx(PhotoCluster, { cluster: item, onClick: () => handleClusterClick(item) }, `cluster-${item.properties.cluster_id}`)) : (_jsx(PhotoMarker, { photo: item.properties.photo, onClick: () => setSelectedPhoto(item.properties.photo) }, item.properties.id))), selectedPhoto && (_jsx(SimpleLightbox, { photo: selectedPhoto, onClose: () => {
                    setSelectedPhoto(null);
                    setSelectedCluster(null);
                }, 
                additionalPhotos: selectedCluster,
                // Don't allow photo deletion in presentation mode
                disableDelete: true
              }, `preview-${selectedPhoto.id}`))] }));
};
