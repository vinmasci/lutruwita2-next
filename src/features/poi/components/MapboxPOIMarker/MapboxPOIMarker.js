import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { getIconDefinition } from '../../constants/poi-icons';
import { POI_CATEGORIES } from '../../types/poi.types';
import { ICON_PATHS } from '../../constants/icon-paths';
import { useMapContext } from '../../../map/context/MapContext';
import './MapboxPOIMarker.styles.css';
const MapboxPOIMarker = ({ poi, onClick, onDragEnd, selected, className, }) => {
    const markerRef = useRef(null);
    const isDraggable = poi.type === 'draggable';
    const iconDefinition = getIconDefinition(poi.icon);
    const markerColor = iconDefinition?.style?.color || POI_CATEGORIES[poi.category].color;
    const { map } = useMapContext();
    // Create or recreate marker when position changes
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
    useEffect(() => {
        if (!map)
            return;
        // Remove existing marker if it exists
        if (markerRef.current) {
            const oldPos = markerRef.current.getLngLat();
            markerRef.current.remove();
            markerRef.current = null;
        }
        const el = document.createElement('div');
        el.className = `poi-marker ${className || ''} ${selected ? 'selected' : ''}`;
        // Set up marker HTML with bubble-pin style and initial zoom level
        const initialZoom = Math.floor(map.getZoom());
        el.innerHTML = `
      <div class="marker-container" data-zoom="${initialZoom}">
        <div class="marker-bubble" style="background-color: ${markerColor}">
          <i class="${ICON_PATHS[poi.icon]} marker-icon"></i>
        </div>
        <div class="marker-point" style="border-top-color: ${markerColor}"></div>
      </div>
    `;
        try {
            // Create marker with viewport alignment
            markerRef.current = new mapboxgl.Marker({
                element: el,
                draggable: isDraggable,
                rotationAlignment: 'viewport',
                pitchAlignment: 'viewport',
                anchor: 'center',
                offset: [0, -14] // Half the height of marker-bubble to center it
            })
                .setLngLat({ lng: poi.coordinates[0], lat: poi.coordinates[1] })
                .addTo(map);
        }
        catch (error) {
            console.error('Error creating marker:', error);
        }
        // Handle clicking
        if (onClick) {
            el.addEventListener('click', () => onClick(poi));
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
                console.log('Drag start:', {
                    poiId: poi.id,
                    position: dragStartPos
                });
            })
                .on('drag', () => {
                hasBeenDragged = true;
                const currentPos = markerRef.current?.getLngLat();
                console.log('Dragging:', {
                    poiId: poi.id,
                    startPos: dragStartPos,
                    currentPos,
                    delta: currentPos ? {
                        lng: currentPos.lng - (dragStartPos?.lng || 0),
                        lat: currentPos.lat - (dragStartPos?.lat || 0)
                    } : null
                });
            })
                .on('dragend', () => {
                isMoving = false;
                if (hasBeenDragged && onDragEnd) {
                    const lngLat = markerRef.current?.getLngLat();
                    if (lngLat) {
                        console.log('Drag end:', {
                            poiId: poi.id,
                            finalPosition: lngLat,
                            totalDelta: dragStartPos ? {
                                lng: lngLat.lng - dragStartPos.lng,
                                lat: lngLat.lat - dragStartPos.lat
                            } : null
                        });
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
