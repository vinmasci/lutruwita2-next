import { useEffect, useRef } from 'react';
import './PhotoMarker.css';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';
export const PhotoMarker = ({ photo, onClick }) => {
    const markerRef = useRef(null);
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
        // Update zoom attribute when map zooms
        const updateZoom = () => {
            el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
        };
        map.on('zoom', updateZoom);
        const container = document.createElement('div');
        container.className = 'photo-marker-container';
        const bubble = document.createElement('div');
        bubble.className = 'photo-marker-bubble';
        // Create click handler with cleanup
        const handleClick = (e) => {
            e.stopPropagation();
            onClick?.();
        };
        if (onClick) {
            bubble.addEventListener('click', handleClick);
        }
        const img = document.createElement('img');
        img.onerror = () => {
            console.error('Failed to load photo thumbnail:', photo.thumbnailUrl);
            img.src = '/images/photo-fallback.svg';
            img.alt = 'Failed to load photo';
        };
        img.src = photo.thumbnailUrl;
        img.alt = photo.name || 'Photo';
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
            // Clean up image error handler
            img.onerror = null;
            map.off('zoom', updateZoom);
        };
    }, [map, photo.coordinates?.lng, photo.coordinates?.lat, photo.id, photo.thumbnailUrl, photo.name, onClick]);
    return null;
};
