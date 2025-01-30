import React, { useCallback, useMemo, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { PopupContainer } from './POIMarker.styles';
import { POIMarkerProps } from './types';
import { getIconDefinition } from '../../constants/poi-icons';
import { POI_CATEGORIES } from '../../types/poi.types';
import { ICON_PATHS } from '../../constants/icon-paths';

const POIMarker: React.FC<POIMarkerProps> = ({
  poi,
  onClick,
  onDragEnd,
  eventHandlers,
  selected,
  className,
}) => {
  const isDraggable = poi.type === 'draggable';
  const iconDefinition = getIconDefinition(poi.icon);
  const categoryColor = POI_CATEGORIES[poi.category].color;

  // Get the SVG path data for the icon
  const [isDragging, setIsDragging] = useState(false);

  const divIcon = useMemo(() => {
    const pathData = ICON_PATHS[poi.icon] || '';
    const containerClasses = [
      'poi-marker-container',
      selected ? 'selected' : '',
      isDragging ? 'dragging' : ''
    ].filter(Boolean).join(' ');
    
    const svgTemplate = `
      <div class="${containerClasses}" style="color: ${categoryColor}">
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

    return new Icon({
      iconUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
      className: `poi-marker ${className || ''} ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`,
      html: svgTemplate
    });
  }, [poi.icon, categoryColor, selected, className, isDragging]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((e: L.DragEndEvent) => {
    setIsDragging(false);
    if (onDragEnd) {
      const latLng = e.target.getLatLng();
      onDragEnd(poi, { lat: latLng.lat, lng: latLng.lng });
    }
  }, [poi, onDragEnd]);

  const combinedEventHandlers = useMemo(() => ({
    ...eventHandlers,
    dragstart: handleDragStart,
    dragend: handleDragEnd,
    click: () => onClick?.(poi),
  }), [eventHandlers, handleDragStart, handleDragEnd, onClick, poi]);

  return (
    <Marker
      position={[poi.position.lat, poi.position.lng]}
      icon={divIcon}
      draggable={isDraggable}
      eventHandlers={combinedEventHandlers}
    >
      <Popup>
        <PopupContainer>
          <h3>{poi.name}</h3>
          {poi.description && <p>{poi.description}</p>}
          {iconDefinition?.description && (
            <p className="icon-description">{iconDefinition.description}</p>
          )}
          {poi.photos && poi.photos.length > 0 && (
            <div className="photos">
              {poi.photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo.url}
                  alt={photo.caption || `Photo ${index + 1}`}
                  title={photo.caption}
                />
              ))}
            </div>
          )}
        </PopupContainer>
      </Popup>
    </Marker>
  );
};

export default POIMarker;
