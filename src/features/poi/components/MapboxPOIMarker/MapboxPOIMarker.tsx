import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { POIMarkerProps } from '../POIMarker/types';
import { getIconDefinition } from '../../constants/poi-icons';
import { POI_CATEGORIES } from '../../types/poi.types';
import { ICON_PATHS } from '../../constants/icon-paths';

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

  useEffect(() => {
    if (!window.mapboxgl) return;

    // Create marker element
    const el = document.createElement('div');
    el.className = `poi-marker ${className || ''} ${selected ? 'selected' : ''}`;

    // Create SVG icon
    const pathData = ICON_PATHS[poi.icon] || '';
    el.innerHTML = `
      <div class="poi-marker-container" style="color: ${categoryColor}">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        >
          <path d="${pathData}"></path>
        </svg>
      </div>
    `;

    // Create popup
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-container';
    popupContent.innerHTML = `
      <h3>${poi.name}</h3>
      ${poi.description ? `<p>${poi.description}</p>` : ''}
      ${iconDefinition?.description ? `<p class="icon-description">${iconDefinition.description}</p>` : ''}
      ${poi.photos?.length ? `
        <div class="photos">
          ${poi.photos.map((photo, index) => `
            <img
              src="${photo.url}"
              alt="${photo.caption || `Photo ${index + 1}`}"
              title="${photo.caption || ''}"
            />
          `).join('')}
        </div>
      ` : ''}
    `;

    popupRef.current = new mapboxgl.Popup({
      offset: [0, -10],
      closeButton: true,
      className: 'poi-popup'
    }).setDOMContent(popupContent);

    // Create marker
    markerRef.current = new mapboxgl.Marker({
      element: el,
      draggable: isDraggable,
      anchor: 'center'
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
    const map = (window as any).map;
    if (map && markerRef.current) {
      markerRef.current.addTo(map);
    }

    return () => {
      markerRef.current?.remove();
      popupRef.current?.remove();
    };
  }, [poi, onClick, onDragEnd, selected, className, isDraggable, categoryColor]);

  return null; // Marker is handled by mapbox-gl directly
};

export default MapboxPOIMarker;
