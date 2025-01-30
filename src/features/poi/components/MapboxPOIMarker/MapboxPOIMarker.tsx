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
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const isDraggable = poi.type === 'draggable';
  const iconDefinition = getIconDefinition(poi.icon);
  const categoryColor = POI_CATEGORIES[poi.category].color;
  const { map } = useMapContext();

  useEffect(() => {
    if (!map) return;

    // Create marker element
    const el = document.createElement('div');
    el.className = `poi-marker ${className || ''} ${selected ? 'selected' : ''}`;
    
    // Set up marker HTML with proper styling
    el.innerHTML = `
      <div class="relative bg-gray-800 px-2 py-1 rounded flex items-center gap-1 shadow-md">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="${categoryColor}"
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        >
          <path d="${ICON_PATHS[poi.icon]}"></path>
        </svg>
        ${poi.name ? `
          <span class="text-white text-sm truncate max-w-[150px]">
            ${poi.name}
          </span>
        ` : ''}
        <div class="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0
                    border-l-[6px] border-l-transparent
                    border-r-[6px] border-r-transparent
                    border-t-[6px] border-t-gray-800">
        </div>
      </div>
    `;

    // Create popup
    const popupContent = document.createElement('div');
    popupContent.className = 'bg-gray-800 text-white p-2 rounded shadow-lg';
    popupContent.innerHTML = `
      <div class="space-y-1">
        <h3 class="font-medium">${poi.name}</h3>
        ${poi.description ? `<p class="text-sm text-gray-300">${poi.description}</p>` : ''}
        ${iconDefinition?.description ? `<p class="text-xs text-gray-400">${iconDefinition.description}</p>` : ''}
      </div>
    `;

    popupRef.current = new mapboxgl.Popup({
      offset: [0, -10],
      closeButton: true,
      className: 'bg-transparent border-none shadow-none'
    }).setDOMContent(popupContent);

    // Create marker
    markerRef.current = new mapboxgl.Marker({
      element: el,
      draggable: isDraggable,
      anchor: 'bottom'
    })
      .setLngLat([poi.position.lng, poi.position.lat])
      .setPopup(popupRef.current);

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
      popupRef.current?.remove();
    };
  }, [poi, onClick, onDragEnd, selected, className, isDraggable, categoryColor, map]);

  return null;
};

export default MapboxPOIMarker;
