import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import './PhotoCluster.css';

// Direct photo cluster implementation without using context
const PhotoCluster = ({ map, cluster, onClick }) => {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !cluster) return;

    // Create marker element
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
    
    // Use tinyThumbnailUrl if available, otherwise fall back to thumbnailUrl
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
    
    // Create and add marker
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat(cluster.geometry.coordinates)
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

export default PhotoCluster;
