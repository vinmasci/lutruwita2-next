import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import './PhotoCluster.css';
// Helper function to calculate distance between two points
const calculateDistance = (point1, point2) => {
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;
    return Math.sqrt(Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2));
};
// Helper function to adjust position if too close to POIs
const getAdjustedPosition = (clusterPosition, pois, minDistance = 0.003 // Increased to ~300 meters for more noticeable offset
) => {
    const [clusterLng, clusterLat] = clusterPosition;
    let adjustedLng = clusterLng;
    let adjustedLat = clusterLat;
    // Check distance to all POIs
    const allPOIs = [...pois.draggable, ...pois.places];
    for (const poi of allPOIs) {
        const distance = calculateDistance(clusterPosition, poi.coordinates);
        if (distance < minDistance) {
            // Calculate offset direction (move cluster away from POI)
            const offsetLng = clusterLng - poi.coordinates[0];
            const offsetLat = clusterLat - poi.coordinates[1];
            // Normalize the offset
            const magnitude = Math.sqrt(offsetLng * offsetLng + offsetLat * offsetLat);
            if (magnitude === 0)
                continue; // Skip if points are exactly the same
            const normalizedLng = offsetLng / magnitude;
            const normalizedLat = offsetLat / magnitude;
            // Apply offset to move cluster away from POI
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
        if (!map)
            return;
        const el = document.createElement('div');
        el.className = 'photo-cluster';
        el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
        
        // Store reference to the element
        markerElementRef.current = el;
        // Update zoom attribute when map zooms
        const updateZoom = () => {
            el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
        };
        map.on('zoom', updateZoom);
        const container = document.createElement('div');
        container.className = 'photo-cluster-container';
        const bubble = document.createElement('div');
        bubble.className = 'photo-cluster-bubble';
        
        // Apply highlighted class if needed
        if (isHighlighted) {
            bubble.classList.add('highlighted');
            container.classList.add('highlighted');
        }
        // Create click handler with cleanup
        const handleClick = (e) => {
            e.stopPropagation();
            onClick?.();
        };
        if (onClick) {
            bubble.addEventListener('click', handleClick);
        }
        // Add preview container
        const previewsContainer = document.createElement('div');
        previewsContainer.className = 'photo-cluster-previews';
        
        // Get the first photo in the cluster
        const firstPhoto = cluster.properties.photos[0];
        
        // Always use the smallest possible thumbnail for clusters to reduce memory usage
        // Prioritize tinyThumbnailUrl which is the smallest size
        const thumbnailUrl = firstPhoto.tinyThumbnailUrl || firstPhoto.thumbnailUrl;
        
        // Create image element
        const preview = document.createElement('img');
        
        // Set up error handler for fallback
        preview.onerror = () => {
            console.error('Failed to load photo thumbnail:', thumbnailUrl);
            preview.src = '/images/photo-fallback.svg';
            preview.alt = 'Failed to load photo';
        };
        
        // Set alt text
        preview.alt = firstPhoto.name || 'Photo preview';
        
        // Check if the thumbnailUrl exists
        if (thumbnailUrl) {
            // Add loading="lazy" attribute to defer loading until visible
            preview.loading = 'lazy';
            preview.src = thumbnailUrl;
        } else {
            // No thumbnail URL, use fallback
            preview.src = '/images/photo-fallback.svg';
            preview.alt = 'No thumbnail available';
        }
        
        // Add the image to the container
        previewsContainer.appendChild(preview);
        
        bubble.appendChild(previewsContainer);
        
        // Add count
        const count = document.createElement('div');
        count.className = 'photo-cluster-count';
        count.textContent = cluster.properties.point_count.toString();
        bubble.appendChild(count);
        const point = document.createElement('div');
        point.className = 'photo-cluster-point';
        container.appendChild(bubble);
        container.appendChild(point);
        el.appendChild(container);
        // Get adjusted position to avoid POIs
        const poiData = getPOIsForRoute();
        const [adjustedLng, adjustedLat] = getAdjustedPosition([cluster.geometry.coordinates[0], cluster.geometry.coordinates[1]], poiData);
        // Create and add marker
        const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
        })
            .setLngLat([adjustedLng, adjustedLat])
            .addTo(map);
        markerRef.current = marker;
        return () => {
            if (markerRef.current) {
                markerRef.current.remove();
            }
            // Clean up event listeners
            if (onClick) {
                bubble.removeEventListener('click', handleClick);
            }
            map.off('zoom', updateZoom);
        };
    }, [map, cluster, onClick, getPOIsForRoute, isHighlighted]);
    
    // Update highlighted state when it changes
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
