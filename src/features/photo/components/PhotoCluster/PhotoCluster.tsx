import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';
import { ClusterFeature } from '../../utils/clustering';
import './PhotoCluster.css';

interface PhotoClusterProps {
  cluster: ClusterFeature;
  onClick?: () => void;
}

export const PhotoCluster: React.FC<PhotoClusterProps> = ({ cluster, onClick }) => {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const { map } = useMapContext();

  useEffect(() => {
    if (!map) return;

    const el = document.createElement('div');
    el.className = 'photo-cluster';
    el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());

    // Update zoom attribute when map zooms
    const updateZoom = () => {
      el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
    };
    map.on('zoom', updateZoom);

    const container = document.createElement('div');
    container.className = 'photo-cluster-container';

    const bubble = document.createElement('div');
    bubble.className = 'photo-cluster-bubble';
    
    // Create click handler with cleanup
    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      onClick?.();
    };
    
    if (onClick) {
      bubble.addEventListener('click', handleClick);
    }

    // Add preview container
    const previewsContainer = document.createElement('div');
    previewsContainer.className = 'photo-cluster-previews';
    
    // Add preview image
    const preview = document.createElement('img');
    preview.src = cluster.properties.photos[0].thumbnailUrl;
    preview.alt = cluster.properties.photos[0].name || 'Photo preview';
    preview.onerror = () => {
      preview.src = '/images/photo-fallback.svg';
      preview.alt = 'Failed to load photo';
    };
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
  }, [map, cluster, onClick]);

  return null;
};
