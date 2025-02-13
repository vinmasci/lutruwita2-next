import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';
import { Cluster } from '../../utils/clustering';
import './PhotoCluster.css';

interface PhotoClusterProps {
  cluster: Cluster;
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

    // Add count
    const count = document.createElement('div');
    count.className = 'photo-cluster-count';
    count.textContent = cluster.photos.length.toString();
    bubble.appendChild(count);

    // Add preview images (show up to 4)
    const previewContainer = document.createElement('div');
    previewContainer.className = 'photo-cluster-previews';
    
    cluster.photos.slice(0, 4).forEach(photo => {
      const preview = document.createElement('img');
      preview.src = photo.thumbnailUrl;
      preview.alt = photo.name || 'Photo preview';
      preview.onerror = () => {
        preview.src = '/images/photo-fallback.svg';
        preview.alt = 'Failed to load photo';
      };
      previewContainer.appendChild(preview);
    });
    
    bubble.appendChild(previewContainer);

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
      .setLngLat([cluster.center.lng, cluster.center.lat])
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
