import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import './PhotoCluster.css';

const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/dig9djqnj/image/upload/';
const CLOUDINARY_THUMBNAIL_TRANSFORMATIONS = 'w_50,h_50,c_fill,g_auto/';

// Helper function to calculate distance between two points
const calculateDistance = (point1, point2) => {
    if (!point1 || !Array.isArray(point1) || point1.length !== 2 || typeof point1[0] !== 'number' || typeof point1[1] !== 'number') {
        // console.error('[PhotoCluster] calculateDistance: Invalid point1:', point1);
        return Infinity; 
    }
    if (!point2 || !Array.isArray(point2) || point2.length !== 2 || typeof point2[0] !== 'number' || typeof point2[1] !== 'number') {
        // console.error('[PhotoCluster] calculateDistance: Invalid point2:', point2);
        return Infinity; 
    }
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;
    return Math.sqrt(Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2));
};

// Helper function to adjust position if too close to POIs
const getAdjustedPosition = (clusterPosition, pois, minDistance = 0.003) => {
    if (!clusterPosition || !Array.isArray(clusterPosition) || clusterPosition.length !== 2 || typeof clusterPosition[0] !== 'number' || typeof clusterPosition[1] !== 'number') {
        // console.error('[PhotoCluster] getAdjustedPosition: Invalid clusterPosition:', clusterPosition);
        return [0, 0]; 
    }
    const [clusterLng, clusterLat] = clusterPosition;
    let adjustedLng = clusterLng;
    let adjustedLat = clusterLat;
    const draggablePOIs = (pois && Array.isArray(pois.draggable)) ? pois.draggable : [];
    const placePOIs = (pois && Array.isArray(pois.places)) ? pois.places : [];
    const allPOIs = [...draggablePOIs, ...placePOIs];

    for (const poi of allPOIs) {
        if (!poi || !poi.coordinates || !Array.isArray(poi.coordinates) || poi.coordinates.length !== 2 || typeof poi.coordinates[0] !== 'number' || typeof poi.coordinates[1] !== 'number') {
            continue; 
        }
        const distance = calculateDistance(clusterPosition, poi.coordinates);
        if (distance < minDistance && distance !== Infinity) {
            const offsetLng = clusterLng - poi.coordinates[0];
            const offsetLat = clusterLat - poi.coordinates[1];
            const magnitude = Math.sqrt(offsetLng * offsetLng + offsetLat * offsetLat);
            if (magnitude === 0) continue;
            const normalizedLng = offsetLng / magnitude;
            const normalizedLat = offsetLat / magnitude;
            adjustedLng = clusterLng + (normalizedLng * minDistance);
            adjustedLat = clusterLat + (normalizedLat * minDistance);
        }
    }
    return [adjustedLng, adjustedLat];
};

export const PhotoCluster = ({ cluster, onClick, isHighlighted }) => {
    const markerRef = useRef(null);
    const markerElementRef = useRef(null);
    const { map } = useMapContext();
    const { getPOIsForRoute } = usePOIContext();

    useEffect(() => {
        if (!map) return;
        if (!cluster || !cluster.geometry || !cluster.geometry.coordinates || !Array.isArray(cluster.geometry.coordinates) || cluster.geometry.coordinates.length !== 2) {
            console.error('[PhotoCluster] Invalid cluster data:', cluster);
            return;
        }
        const clusterCoords = cluster.geometry.coordinates;
        if (typeof clusterCoords[0] !== 'number' || typeof clusterCoords[1] !== 'number') {
            console.error('[PhotoCluster] Invalid cluster coordinates:', clusterCoords);
            return;
        }

        const el = document.createElement('div');
        el.className = 'photo-cluster';
        el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
        markerElementRef.current = el;
        
        const updateZoom = () => {
            if (markerElementRef.current) {
                markerElementRef.current.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
            }
        };
        map.on('zoom', updateZoom);

        const container = document.createElement('div');
        container.className = 'photo-cluster-container';
        const bubble = document.createElement('div');
        bubble.className = 'photo-cluster-bubble';
        
        if (isHighlighted) {
            bubble.classList.add('highlighted');
            container.classList.add('highlighted');
        }
        
        const handleClick = (e) => {
            e.stopPropagation();
            onClick?.();
        };
        if (onClick) {
            bubble.addEventListener('click', handleClick);
        }
        
        const previewsContainer = document.createElement('div');
        previewsContainer.className = 'photo-cluster-previews';
        
        const photosInCluster = cluster.properties.photos;
        let firstPhoto = null;
        if (Array.isArray(photosInCluster) && photosInCluster.length > 0) {
            firstPhoto = photosInCluster.find(p => p && (p.tinyThumbnailUrl || p.thumbnailUrl || p.publicId || p.url)) || photosInCluster.find(p => p);
        }
        
        let displayUrl = null;
        if (firstPhoto) {
            if (firstPhoto.tinyThumbnailUrl && (firstPhoto.tinyThumbnailUrl.startsWith('data:') || firstPhoto.tinyThumbnailUrl.startsWith('blob:'))) {
                displayUrl = firstPhoto.tinyThumbnailUrl;
            } else if (firstPhoto.publicId) {
                displayUrl = `${CLOUDINARY_BASE_URL}${CLOUDINARY_THUMBNAIL_TRANSFORMATIONS}${firstPhoto.publicId}`;
            } else if (firstPhoto.thumbnailUrl && (firstPhoto.thumbnailUrl.startsWith('http:') || firstPhoto.thumbnailUrl.startsWith('https:'))) {
                displayUrl = firstPhoto.thumbnailUrl;
            } else if (firstPhoto.url && (firstPhoto.url.startsWith('http:') || firstPhoto.url.startsWith('https:'))) {
                displayUrl = firstPhoto.url; // Fallback to main URL
            }
        }
        
        const preview = document.createElement('img');
        preview.onerror = () => {
            // console.warn('[PhotoCluster] Failed to load photo thumbnail:', displayUrl, 'for photo:', firstPhoto);
            preview.src = '/images/photo-fallback.svg';
            preview.alt = 'Failed to load photo';
        };
        
        preview.alt = firstPhoto ? (firstPhoto.name || 'Photo preview') : 'Photo preview';
        
        if (displayUrl) {
            preview.src = displayUrl;
        } else {
            preview.src = '/images/photo-fallback.svg';
            preview.alt = firstPhoto ? 'No thumbnail available' : 'Cluster has no photos';
        }
        
        previewsContainer.appendChild(preview);
        bubble.appendChild(previewsContainer);
        // Count is now appended to container, not bubble
        const point = document.createElement('div');
        point.className = 'photo-cluster-point';
        
        container.appendChild(bubble);
        container.appendChild(point);

        // Create and append count to the container (sibling to bubble and point)
        const count = document.createElement('div');
        count.className = 'photo-cluster-count';
        count.textContent = cluster.properties.point_count ? cluster.properties.point_count.toString() : '0';
        container.appendChild(count); // Append count to container

        el.appendChild(container);
        
        const poiData = getPOIsForRoute();
        const [adjustedLng, adjustedLat] = getAdjustedPosition(clusterCoords, poiData);
        
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([adjustedLng, adjustedLat])
            .addTo(map);
        markerRef.current = marker;

        return () => {
            if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null; 
            }
            if (bubble && onClick) { 
                bubble.removeEventListener('click', handleClick);
            }
            map.off('zoom', updateZoom);
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
            markerElementRef.current = null;
        };
    }, [map, cluster, onClick, getPOIsForRoute, isHighlighted]);
    
    useEffect(() => {
        if (markerElementRef.current) {
            const bubble = markerElementRef.current.querySelector('.photo-cluster-bubble');
            const container = markerElementRef.current.querySelector('.photo-cluster-container');
            if (bubble && container) {
                if (isHighlighted) {
                    bubble.classList.add('highlighted');
                    container.classList.add('highlighted');
                } else {
                    bubble.classList.remove('highlighted');
                    container.classList.remove('highlighted');
                }
            }
        }
    }, [isHighlighted]);

    return null;
};
