import { useEffect, useRef } from 'react';
import './SimplifiedPhotoCluster.css';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';

export const SimplifiedPhotoCluster = ({ cluster, onClick, isHighlighted }) => {
    const markerRef = useRef(null);
    const markerElementRef = useRef(null);
    const { map } = useMapContext();

    useEffect(() => {
        if (!map)
            return;

        const el = document.createElement('div');
        el.className = 'simplified-photo-cluster';
        el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
        
        // Store reference to the element
        markerElementRef.current = el;

        // Update zoom attribute when map zooms
        const updateZoom = () => {
            el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
        };
        map.on('zoom', updateZoom);

        const container = document.createElement('div');
        container.className = 'simplified-photo-cluster-container';
        
        const bubble = document.createElement('div');
        bubble.className = 'simplified-photo-cluster-bubble';
        
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
        
        // Add camera icon and count
        const iconContainer = document.createElement('div');
        iconContainer.className = 'simplified-photo-cluster-icon-container';
        
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-camera';
        icon.style.color = 'white'; // White color for the icon to match POI clusters
        
        iconContainer.appendChild(icon);
        bubble.appendChild(iconContainer);
        
        // Add count
        const count = document.createElement('div');
        count.className = 'simplified-photo-cluster-count';
        count.textContent = cluster.properties.point_count.toString();
        bubble.appendChild(count);
        
        const point = document.createElement('div');
        point.className = 'simplified-photo-cluster-point';
        container.appendChild(bubble);
        container.appendChild(point);
        el.appendChild(container);

        // Create and add marker
        const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
        })
            .setLngLat([cluster.geometry.coordinates[0], cluster.geometry.coordinates[1]])
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
    }, [map, cluster, onClick, isHighlighted]);

    // Update highlighted state when it changes
    useEffect(() => {
        if (markerElementRef.current) {
            const bubble = markerElementRef.current.querySelector('.simplified-photo-cluster-bubble');
            const container = markerElementRef.current.querySelector('.simplified-photo-cluster-container');
            
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

export default SimplifiedPhotoCluster;
