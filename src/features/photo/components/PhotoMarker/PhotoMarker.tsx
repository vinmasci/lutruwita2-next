import React, { useEffect, useRef, useCallback } from 'react';
import './PhotoMarker.css';
import mapboxgl from 'mapbox-gl';
import { ProcessedPhoto } from '../Uploader/PhotoUploader.types';
import { useMapContext } from '../../../map/context/MapContext';

interface PhotoMarkerProps {
  photo: ProcessedPhoto;
  onClick?: () => void;
}

export const PhotoMarker: React.FC<PhotoMarkerProps> = ({ photo, onClick }) => {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
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
    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      onClick?.();
    };
    
    if (onClick) {
      bubble.addEventListener('click', handleClick);
    }

    // Create a new Image object to preload the image
    const imgLoader = new Image();
    imgLoader.onload = () => {
      // Once loaded, create the actual img element for the marker
      const img = document.createElement('img');
      img.src = imgLoader.src;
      img.alt = photo.name || 'Photo';
      bubble.appendChild(img);
    };
    
    imgLoader.onerror = () => {
      console.error('Failed to load photo thumbnail:', photo.thumbnailUrl);
      // Create fallback image
      const img = document.createElement('img');
      img.src = '/images/photo-fallback.svg';
      img.alt = 'Failed to load photo';
      bubble.appendChild(img);
    };
    
    // Set the source to start loading
    imgLoader.src = photo.thumbnailUrl;

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
      imgLoader.onerror = null;
      imgLoader.onload = null;
      map.off('zoom', updateZoom);
    };
  }, [map, photo.coordinates?.lng, photo.coordinates?.lat, photo.id, photo.thumbnailUrl, photo.name, onClick]);

  return null;
};
