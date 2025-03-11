import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { ICON_PATHS } from '../../../../poi/constants/icon-paths';
import { POI_CATEGORIES } from '../../../../poi/types/poi.types';
import './POIMarker.css';

// Direct POI marker implementation without using context
const POIMarker = ({ map, poi, onClick, visiblePOICategories = [], scale = 1 }) => {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !poi) return;
    
    // Check if this POI's category is in the visible categories list
    const isVisible = visiblePOICategories.includes(poi.category);
    
    // Store marker reference for cleanup
    markerRef.current = null;
    
    // If category is not visible, don't create the marker
    if (!isVisible) return;
    
    // Create marker element
    const el = document.createElement('div');
    el.className = 'poi-marker';
    
    // Get marker color based on category
    const categoryColor = POI_CATEGORIES[poi.category]?.color;
    const iconColor = poi.style?.color;
    const markerColor = iconColor || categoryColor || '#0288d1';
    
    // Get the correct icon class from ICON_PATHS
    const iconClass = ICON_PATHS[poi.icon] || 'fa-solid fa-map-pin';
    
    // Special handling for HC icon which has two icons side by side
    const iconContent = poi.icon === 'ClimbHC' 
      ? `<span style="font-size: 14px; color: white;"><i class="fa-solid fa-h"></i><i class="fa-solid fa-c"></i></span>`
      : `<i class="${iconClass} marker-icon"></i>`;
    
    // Set up marker HTML
    el.innerHTML = `
      <div class="marker-container" style="transform: scale(${scale})">
        <div class="marker-bubble" style="background-color: ${markerColor}">
          ${iconContent}
        </div>
        <div class="marker-point" style="border-top-color: ${markerColor}"></div>
      </div>
    `;
    
    // Create marker
    const marker = new mapboxgl.Marker({
      element: el,
      draggable: false,
      rotationAlignment: 'viewport',
      pitchAlignment: 'viewport',
      anchor: 'center',
      offset: [0, -20]
    })
      .setLngLat(poi.coordinates)
      .addTo(map);
    
    // Add click handler
    el.addEventListener('click', () => {
      if (onClick) onClick(poi);
    });
    
    // Add hover effect
    el.addEventListener('mouseenter', () => {
      const bubble = el.querySelector('.marker-bubble');
      if (bubble) {
        bubble.style.transform = 'scale(1.1)';
        bubble.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.3)';
      }
    });
    
    el.addEventListener('mouseleave', () => {
      const bubble = el.querySelector('.marker-bubble');
      if (bubble) {
        bubble.style.transform = '';
        bubble.style.boxShadow = '';
      }
    });
    
    // Store marker reference for cleanup
    markerRef.current = marker;
    
    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, poi, onClick, visiblePOICategories]);
  
  return null;
};

export default POIMarker;
