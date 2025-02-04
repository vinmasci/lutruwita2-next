import React, { useEffect, useRef } from 'react';
import { POIPosition, POICategory, POIIconName } from '../../types/poi.types';
import { useMapContext } from '../../../map/context/MapContext';
import { ICON_PATHS } from '../../constants/icon-paths';
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
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

    // Add class to body when dragging starts
    document.body.classList.add('poi-dragging');

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
      document.body.classList.remove('poi-dragging');
    };
  }, [map, onPlace]);

  return (
    <div 
      ref={markerRef}
      style={{
        position: 'fixed',
        zIndex: 1000,
        pointerEvents: 'none',
        transform: 'scale(0.74)', // Scale down to match drawer size (20px/27px)
      }}
    >
      <div className="marker-container">
        {(() => {
          const iconDefinition = getIconDefinition(icon);
          const markerColor = iconDefinition?.style?.color || POI_CATEGORIES[category].color;
          return (
            <>
              <div className="marker-bubble" style={{ backgroundColor: markerColor }}>
                <i className={`${ICON_PATHS[icon]} marker-icon`} style={{ color: 'white' }}></i>
              </div>
              <div className="marker-point" style={{ borderTopColor: markerColor }}></div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default POIDragPreview;
