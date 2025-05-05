import { useEffect, useRef } from 'react';
import './SimplifiedPhotoMarker.css';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';

// Helper function to check if we're in presentation mode
const isInPresentationMode = () => {
    return document.querySelector('.presentation-photo-layer') !== null;
};

export const SimplifiedPhotoMarker = ({ photo, onClick, isHighlighted, isPresentationMode = false }) => {
    const markerRef = useRef(null);
    const markerElementRef = useRef(null);
    const { map } = useMapContext();

    useEffect(() => {
        if (!map || !photo.coordinates ||
            typeof photo.coordinates.lng !== 'number' ||
            typeof photo.coordinates.lat !== 'number') {
            return;
        }

        // Create marker element
        const el = document.createElement('div');
        el.className = 'simplified-photo-marker';
        el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
        
        // Store reference to the element
        markerElementRef.current = el;

        // Update zoom attribute when map zooms
        const updateZoom = () => {
            el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
        };
        map.on('zoom', updateZoom);

        const container = document.createElement('div');
        container.className = 'simplified-photo-marker-container';
        
        const bubble = document.createElement('div');
        bubble.className = 'simplified-photo-marker-bubble';
        
        // Check if we're in presentation mode
        const inPresentationMode = isPresentationMode || isInPresentationMode();
        
        // Apply highlighted class if needed
        if (isHighlighted) {
            bubble.classList.add('highlighted');
            container.classList.add('highlighted');
        } else if (inPresentationMode) {
            // In presentation mode, ensure non-highlighted markers don't have the highlighted class
            bubble.classList.remove('highlighted');
            container.classList.remove('highlighted');
            
            // Add a presentation-mode class to help with CSS targeting
            bubble.classList.add('presentation-mode');
            container.classList.add('presentation-mode');
        }

        // Create click handler with cleanup
        const handleClick = (e) => {
            e.stopPropagation();
            onClick?.();
        };

        if (onClick) {
            bubble.addEventListener('click', handleClick);
        }
        
        // Add camera icon instead of image
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-camera';
        icon.style.color = '#4AA4DE'; // Blue color for the icon
        
        // Add the icon to the bubble
        bubble.appendChild(icon);
        
        const point = document.createElement('div');
        point.className = 'simplified-photo-marker-point';
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
    }, [map, photo.coordinates?.lng, photo.coordinates?.lat, photo.id, onClick, isHighlighted]);

    // Update highlighted state when it changes
    useEffect(() => {
        if (markerElementRef.current) {
            const bubble = markerElementRef.current.querySelector('.simplified-photo-marker-bubble');
            const container = markerElementRef.current.querySelector('.simplified-photo-marker-container');
            
            // Check if we're in presentation mode
            const inPresentationMode = isPresentationMode || isInPresentationMode();
            
            if (bubble && container) {
                if (isHighlighted) {
                    bubble.classList.add('highlighted');
                    container.classList.add('highlighted');
                    
                    // In presentation mode, make sure the presentation-mode class is removed
                    if (inPresentationMode) {
                        bubble.classList.remove('presentation-mode');
                        container.classList.remove('presentation-mode');
                    }
                } else {
                    bubble.classList.remove('highlighted');
                    container.classList.remove('highlighted');
                    
                    // In presentation mode, add the presentation-mode class to non-highlighted markers
                    if (inPresentationMode) {
                        bubble.classList.add('presentation-mode');
                        container.classList.add('presentation-mode');
                    }
                }
            }
        }
    }, [isHighlighted, isPresentationMode]);

    return null;
};

export default SimplifiedPhotoMarker;
