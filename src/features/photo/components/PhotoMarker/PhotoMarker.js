import { useEffect, useRef } from 'react';
import './PhotoMarker.css';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';

export const PhotoMarker = ({ photo, onClick, isHighlighted }) => {
    const markerRef = useRef(null);
    const markerElementRef = useRef(null);
    const { map } = useMapContext();

    useEffect(() => {
        if (!map || !photo.coordinates ||
            typeof photo.coordinates.lng !== 'number' ||
            typeof photo.coordinates.lat !== 'number') {
            console.error('Invalid photo coordinates:', photo.coordinates);
            return;
        }

        // Allow coordinates outside normal bounds - they'll be normalized by the layer
        const el = document.createElement('div');
        el.className = 'photo-marker';
        el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
        
        // Store reference to the element
        markerElementRef.current = el;

        // Update zoom attribute when map zooms
        const updateZoom = () => {
            el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
        };
        map.on('zoom', updateZoom);

        const container = document.createElement('div');
        container.className = 'photo-marker-container';
        
        const bubble = document.createElement('div');
        bubble.className = 'photo-marker-bubble';
        
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
        
        // Use tinyThumbnailUrl if available, otherwise fall back to thumbnailUrl
        const thumbnailUrl = photo.tinyThumbnailUrl || photo.thumbnailUrl;
        
        // Create image element
        const img = document.createElement('img');
        
        // Set up error handler for fallback
        img.onerror = () => {
            console.error('Failed to load photo thumbnail:', thumbnailUrl);
            img.src = '/images/photo-fallback.svg';
            img.alt = 'Failed to load photo';
        };
        
        // Set alt text
        img.alt = photo.name || 'Photo';
        
        // Check if the thumbnailUrl is a data URL (local preview) or a regular URL
        if (thumbnailUrl) {
            img.src = thumbnailUrl;
        } else {
            // No thumbnail URL, use fallback
            img.src = '/images/photo-fallback.svg';
            img.alt = 'No thumbnail available';
        }
        
        // Add the image to the bubble
        bubble.appendChild(img);
        
        const point = document.createElement('div');
        point.className = 'photo-marker-point';
        container.appendChild(bubble);
        container.appendChild(point);
        el.appendChild(container);

        // Create and add marker
        const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
        })
            .setLngLat([photo.coordinates.lng, photo.coordinates.lat])
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
    }, [map, photo.coordinates?.lng, photo.coordinates?.lat, photo.id, photo.name, onClick, isHighlighted]);

    // Update highlighted state when it changes
    useEffect(() => {
        if (markerElementRef.current) {
            const bubble = markerElementRef.current.querySelector('.photo-marker-bubble');
            const container = markerElementRef.current.querySelector('.photo-marker-container');
            
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

    // Debug log to check which markers are highlighted
    useEffect(() => {
        if (isHighlighted) {
            console.log('Highlighted marker:', photo.url);
        }
    }, [isHighlighted, photo.url]);

    return null;
};
