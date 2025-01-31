import React, { useEffect, useRef } from 'react';
import { POIPosition, POICategory, POIIconName } from '../../types/poi.types';
import { useMapContext } from '../../../map/context/MapContext';
import { ICON_PATHS } from '../../constants/icon-paths';
import { POI_CATEGORIES } from '../../types/poi.types';
import '../MapboxPOIMarker/MapboxPOIMarker.styles.css';

interface POIDragPreviewProps {
  icon: POIIconName;
  category: POICategory;
  onPlace: (position: POIPosition) => void;
}

const POIDragPreview: React.FC<POIDragPreviewProps> = ({
  icon,
  category,
  onPlace,
}) => {
  const { map } = useMapContext();
  const markerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!map || !markerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !markerRef.current) return;
      
      // Follow the cursor
      markerRef.current.style.left = `${e.clientX}px`;
      markerRef.current.style.top = `${e.clientY}px`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      // Convert screen coordinates to map coordinates
      const point = map.unproject([e.clientX, e.clientY]);
      onPlace({ lat: point.lat, lng: point.lng });

      // Clean up
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (markerRef.current) {
        markerRef.current.style.display = 'none';
      }
    };

    // Start dragging
    isDraggingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [map, onPlace]);

  return (
    <div 
      ref={markerRef}
      style={{
        position: 'fixed',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <div className="marker-container">
        <div className="marker-bubble" style={{ backgroundColor: POI_CATEGORIES[category].color }}>
          <i className={`${ICON_PATHS[icon]} marker-icon`}></i>
        </div>
        <div className="marker-point" style={{ borderTopColor: POI_CATEGORIES[category].color }}></div>
      </div>
    </div>
  );
};

export default POIDragPreview;
