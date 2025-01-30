import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { POIMarkerProps } from '../POIMarker/types';
import { getIconDefinition } from '../../constants/poi-icons';
import { POI_CATEGORIES } from '../../types/poi.types';
import { ICON_PATHS } from '../../constants/icon-paths';
import { useMapContext } from '../../../map/context/MapContext';

const MapboxPOIMarker: React.FC<POIMarkerProps> = ({
  poi,
  onClick,
  onDragEnd,
  selected,
  className,
}) => {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const isDraggable = poi.type === 'draggable';
  const categoryColor = POI_CATEGORIES[poi.category].color;
  const { map } = useMapContext();

  useEffect(() => {
    if (!map) return;

    // Create marker element
    const el = document.createElement('div');
    el.className = `poi-marker ${className || ''} ${selected ? 'selected' : ''}`;
    
    // Set up marker HTML with new bubble style
    el.innerHTML = `
      <div class="marker-bubble" style="background-color: ${categoryColor}">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white"
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        >
          <path d="${ICON_PATHS[poi.icon]}"></path>
        </svg>
      </div>
    `;

    // Create marker
    markerRef.current = new mapboxgl.Marker({
      element: el,
      draggable: isDraggable,
      anchor: 'bottom'
    })
      .setLngLat([poi.position.lng, poi.position.lat]);

    // Add event listeners
    if (onClick) {
      el.addEventListener('click', () => onClick(poi));
    }

    if (isDraggable && onDragEnd) {
      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current?.getLngLat();
        if (lngLat) {
          onDragEnd(poi, { lat: lngLat.lat, lng: lngLat.lng });
        }
      });
    }

    // Add to map
    markerRef.current.addTo(map);

    return () => {
      markerRef.current?.remove();
    };
  }, [poi, onClick, onDragEnd, selected, className, isDraggable, categoryColor, map]);

  return null;
};

export default MapboxPOIMarker;
