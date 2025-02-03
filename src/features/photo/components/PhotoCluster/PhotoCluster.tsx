import React, { useEffect, useRef, useCallback } from 'react';
import './PhotoCluster.css';
import mapboxgl from 'mapbox-gl';
import { ProcessedPhoto } from '../Uploader/PhotoUploader.types';
import { useMapContext } from '../../../map/context/MapContext';

interface PhotoClusterProps {
  photos: ProcessedPhoto[];
  coordinates: { lng: number; lat: number };
  onClick?: () => void;
}

export const PhotoCluster: React.FC<PhotoClusterProps> = ({ 
  photos, 
  coordinates, 
  onClick 
}) => {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const { map } = useMapContext();

  useEffect(() => {
    if (!map || !coordinates || !coordinates.lng || !coordinates.lat || photos.length === 0) return;

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

    // Create and add image directly to bubble
    const img = document.createElement('img');
    img.onerror = () => {
      img.src = '/images/photo-fallback.svg';
      img.alt = 'Failed to load cluster preview';
    };
    img.src = photos[0].thumbnailUrl;
    img.alt = `Cluster of ${photos.length} photos`;
    bubble.appendChild(img);

    const point = document.createElement('div');
    point.className = 'photo-cluster-point';

    // Add count indicator if there's more than one photo
    if (photos.length > 1) {
      const count = document.createElement('div');
      count.className = 'photo-cluster-count';
      count.textContent = `+${photos.length - 1}`;
      container.appendChild(count);
    }

    container.appendChild(bubble);
    container.appendChild(point);
    el.appendChild(container);

    // Create and add marker
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat([coordinates.lng, coordinates.lat])
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
  }, [map, coordinates, photos, onClick]);

  return null;
};

export default PhotoCluster;
