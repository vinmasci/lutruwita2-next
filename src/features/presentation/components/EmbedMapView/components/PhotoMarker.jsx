import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import './PhotoMarker.css';

// Direct photo marker implementation without using context
const PhotoMarker = ({ map, photo, onClick }) => {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !photo.coordinates ||
        typeof photo.coordinates.lng !== 'number' ||
        typeof photo.coordinates.lat !== 'number') {
      console.error('Invalid photo coordinates:', photo.coordinates);
      return;
    }

    // Create marker element
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
  }, [map, photo, onClick]);
  
  return null;
};

export default PhotoMarker;
