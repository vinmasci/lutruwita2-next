import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { getIconDefinition } from '../../constants/poi-icons';
import { POI_CATEGORIES } from '../../types/poi.types';
import { ICON_PATHS } from '../../constants/icon-paths';
import { useMapContext } from '../../../map/context/MapContext';
import logger from '../../../../utils/logger';
import './MapboxPOIMarker.styles.css';
const MapboxPOIMarker = ({ poi, onClick, onDragEnd, selected, className, }) => {
    const markerRef = useRef(null);
    const isDraggable = poi.type === 'draggable';
    const iconDefinition = getIconDefinition(poi.icon);
    // Add fallback color in case the category doesn't exist in POI_CATEGORIES
    const markerColor = iconDefinition?.style?.color || 
                       (POI_CATEGORIES[poi.category]?.color) || 
                       '#777777'; // Default gray color if category not found
    const { map } = useMapContext();

    // Effect to update zoom-based scaling
    useEffect(() => {
        if (!map)
            return;
        const updateZoomScale = () => {
            const zoom = Math.floor(map.getZoom());
            const markerElement = markerRef.current?.getElement();
            if (markerElement) {
                const container = markerElement.querySelector('.marker-container');
                if (container) {
                    container.setAttribute('data-zoom', zoom.toString());
                }
            }
        };
        // Initial update
        updateZoomScale();
        // Update on zoom changes
        map.on('zoom', updateZoomScale);
        return () => {
            map.off('zoom', updateZoomScale);
        };
    }, [map]);

    // We're not using dynamic offsets anymore as they cause issues when zooming

    useEffect(() => {
        if (!map)
            return;
        // Remove existing marker if it exists
        if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }
        const el = document.createElement('div');
        el.className = `poi-marker ${className || ''} ${selected ? 'selected' : ''}`;
        // Set up marker HTML with bubble-pin style and initial zoom level
        const initialZoom = Math.floor(map.getZoom());
        // Special handling for HC icon which has two icons side by side
        const iconContent = poi.icon === 'ClimbHC' 
          ? `<span style="font-size: 14px; color: white;"><i class="fa-solid fa-h"></i><i class="fa-solid fa-c"></i></span>`
          : `<i class="${ICON_PATHS[poi.icon]} marker-icon"></i>`;
          
        el.innerHTML = `
      <div class="marker-container" data-zoom="${initialZoom}">
        <div class="marker-bubble" style="background-color: ${markerColor}">
          ${iconContent}
        </div>
        <div class="marker-point" style="border-top-color: ${markerColor}"></div>
      </div>
    `;
        try {
            
            // Create marker with viewport alignment and center anchor
            markerRef.current = new mapboxgl.Marker({
                element: el,
                draggable: isDraggable,
                rotationAlignment: 'viewport',
                pitchAlignment: 'viewport',
                anchor: 'center', // Revert anchor to center
                offset: [0, 0]    // Revert offset to 0
            })
                .setLngLat({ lng: poi.coordinates[0], lat: poi.coordinates[1] })
                .addTo(map);
                
        }
        catch (error) {
            logger.error('MapboxPOIMarker', 'Error creating marker:', error);
        }
        // Handle clicking
        if (onClick) {
            el.addEventListener('click', () => {
                logger.info('MapboxPOIMarker', 'Click detected on POI:', poi);
                onClick(poi);
            });
        }
        // Handle dragging
        if (isDraggable && markerRef.current) {
            let isMoving = false;
            let hasBeenDragged = false;
            let dragStartPos = null;
            markerRef.current
                .on('dragstart', () => {
                isMoving = true;
                hasBeenDragged = false;
                dragStartPos = markerRef.current?.getLngLat() || null;
            })
                .on('drag', () => {
                hasBeenDragged = true;
                const currentPos = markerRef.current?.getLngLat();
            })
                .on('dragend', () => {
                isMoving = false;
                if (hasBeenDragged && onDragEnd) {
                    const lngLat = markerRef.current?.getLngLat();
                    if (lngLat) {
                        onDragEnd(poi, [lngLat.lng, lngLat.lat]);
                    }
                }
            });
        }
        return () => {
            if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
            }
        };
    }, [map, poi, onClick, onDragEnd, selected, className, isDraggable, markerColor]); // Recreate marker when any of these change
    return null;
};
export default MapboxPOIMarker;
