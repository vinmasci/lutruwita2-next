import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../context/PhotoContext';
import { PhotoMarker } from '../PhotoMarker/PhotoMarker';
import { PhotoCluster } from '../PhotoCluster/PhotoCluster';
import { SimpleLightbox } from '../PhotoPreview/SimpleLightbox';
import { clusterPhotos, isCluster, getClusterExpansionZoom, getPhotoIdentifier } from '../../utils/clustering';
import logger from '../../../../utils/logger';
import './PhotoLayer.css';
export const PhotoLayer = () => {
    const { map } = useMapContext();
    const { photos } = usePhotoContext();
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [zoom, setZoom] = useState(null);
    // Listen for zoom changes
    useEffect(() => {
        if (!map)
            return;
        const handleZoom = () => {
            const newZoom = map.getZoom();
            setZoom(newZoom);
        };
        map.on('zoom', handleZoom);
        // Set initial zoom
        setZoom(map.getZoom());
        return () => {
            map.off('zoom', handleZoom);
        };
    }, [map]);
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
    const clusteredItems = useMemo(() => {
        if (!map || zoom === null)
            return [];
        return clusterPhotos(validPhotos, 0, zoom);
    }, [validPhotos, map, zoom]);
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
    }, [findPhotoCluster, getPhotoIdentifier, zoom]);

    return (_jsxs("div", { className: "photo-layer", children: [
        clusteredItems.map(item => 
            isCluster(item) 
                ? (_jsx(PhotoCluster, { 
                    cluster: item, 
                    onClick: () => handleClusterClick(item) 
                  }, `cluster-${item.properties.cluster_id}`)) 
                : (_jsx(PhotoMarker, { 
                    photo: item.properties.photo, 
                    onClick: () => handlePhotoClick(item.properties.photo) 
                  }, item.properties.id))
        ), 
        selectedPhoto && (_jsx(SimpleLightbox, { 
            photo: selectedPhoto, 
            onClose: () => {
                setSelectedPhoto(null);
                setSelectedCluster(null);
            }, 
            additionalPhotos: selectedCluster 
        }, `preview-${selectedPhoto.id}`))
    ] }));
};
