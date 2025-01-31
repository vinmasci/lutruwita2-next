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

  // Create marker once
  useEffect(() => {
    if (!map) return;

    // Create marker element
    const el = document.createElement('div');
    el.className = 'poi-marker';
    
    // Set up marker HTML with bubble-pin style
    el.innerHTML = `
      <div class="marker-container">
        <div class="marker-bubble" style="background-color: ${categoryColor}">
          <i class="${ICON_PATHS[poi.icon]} marker-icon"></i>
        </div>
        <div class="marker-point" style="border-top-color: ${categoryColor}"></div>
      </div>
    `;

    // Create marker with type-specific options
    const markerOptions: mapboxgl.MarkerOptions = {
      element: el,
      draggable: isDraggable,
      anchor: 'bottom',
      // Use map alignment for place POIs to maintain geographic accuracy
      pitchAlignment: poi.type === 'place' ? 'map' : 'viewport',
      rotationAlignment: poi.type === 'place' ? 'map' : 'viewport'
    };

    markerRef.current = new mapboxgl.Marker(markerOptions)
      .setLngLat([poi.position.lng, poi.position.lat])
      .addTo(map);

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

    return () => {
      markerRef.current?.remove();
    };
  }, [map]); // Only recreate when map changes

  // Update marker position
  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLngLat([poi.position.lng, poi.position.lat]);
  }, [poi.position]);

  // Update marker appearance
  useEffect(() => {
    if (!markerRef.current) return;
    const el = markerRef.current.getElement();
    el.className = `poi-marker ${className || ''} ${selected ? 'selected' : ''}`;
    el.innerHTML = `
      <div class="marker-container">
        <div class="marker-bubble" style="background-color: ${categoryColor}">
          <i class="${ICON_PATHS[poi.icon]} marker-icon"></i>
        </div>
        <div class="marker-point" style="border-top-color: ${categoryColor}"></div>
      </div>
    `;
  }, [selected, className, categoryColor, poi.icon]);

  return null;
};

export default MapboxPOIMarker;
