import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { POIMarkerProps } from '../POIMarker/types';
import { getIconDefinition } from '../../constants/poi-icons';
import { POI_CATEGORIES } from '../../types/poi.types';
import { ICON_PATHS } from '../../constants/icon-paths';
import { useMapContext } from '../../../map/context/MapContext';
import './MapboxPOIMarker.styles.css';

const MapboxPOIMarker: React.FC<POIMarkerProps> = ({
  poi,
  onClick,
  onDragEnd,
  selected,
  className,
}) => {
  // Debug logging for initial props
  console.log('MapboxPOIMarker render:', {
    poiId: poi.id,
    position: poi.position,
    type: poi.type,
    category: poi.category,
    selected,
  });
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const isDraggable = poi.type === 'draggable';
  const categoryColor = POI_CATEGORIES[poi.category].color;
  const { map } = useMapContext();

  // Create or recreate marker when position changes
  useEffect(() => {
    console.log('MapboxPOIMarker effect triggered:', {
      poiId: poi.id,
      hasMap: !!map,
      currentMarker: !!markerRef.current,
    });

    if (!map) return;

    // Remove existing marker if it exists
    if (markerRef.current) {
      const oldPos = markerRef.current.getLngLat();
      console.log('Removing existing marker:', {
        poiId: poi.id,
        oldPosition: oldPos,
      });
      markerRef.current.remove();
      markerRef.current = null;
    }

    const el = document.createElement('div');
    el.className = `poi-marker ${className || ''} ${selected ? 'selected' : ''}`;
    
    // Set up marker HTML with bubble-pin style
    el.innerHTML = `
      <div class="marker-container">
        <div class="marker-bubble" style="background-color: ${categoryColor}">
          <i class="${ICON_PATHS[poi.icon]} marker-icon"></i>
        </div>
        <div class="marker-point" style="border-top-color: ${categoryColor}"></div>
      </div>
    `;

    // Debug map state and viewport
    try {
      const mapCenter = map.getCenter();
      const mapBounds = map.getBounds();
      const viewport = {
        zoom: map.getZoom(),
        center: [mapCenter.lng, mapCenter.lat],
        bounds: mapBounds ? {
          sw: [mapBounds.getWest(), mapBounds.getSouth()],
          ne: [mapBounds.getEast(), mapBounds.getNorth()]
        } : null,
        pitch: map.getPitch(),
        bearing: map.getBearing()
      };
      console.log('Map viewport:', viewport);

      // Get map state
      const zoom = map.getZoom();
      const scale = Math.pow(2, zoom);
      const containerPoint = map.project([poi.position.lng, poi.position.lat]);
      const lngLat = map.unproject(containerPoint);

      // Debug coordinate transformations
      console.log('Coordinate transformations:', {
        poiId: poi.id,
        original: {
          lng: poi.position.lng,
          lat: poi.position.lat
        },
        projected: containerPoint,
        unprojected: lngLat,
        delta: {
          lng: lngLat.lng - poi.position.lng,
          lat: lngLat.lat - poi.position.lat
        },
        zoom,
        scale
      });

      // Create marker with original config
      console.log('Creating new marker:', {
        poiId: poi.id,
        position: poi.position,
        isDraggable,
        inBounds: mapBounds ? mapBounds.contains(poi.position) : null,
        zoom,
        scale,
        projectedPosition: containerPoint
      });
    } catch (error) {
      console.error('Error during debug logging:', error);
    }

    try {
      // Get coordinate transformations for debugging
      const originalPoint = map.project([poi.position.lng, poi.position.lat]);
      const zoom = map.getZoom();
      const worldSize = 512 * Math.pow(2, zoom);
      const mercatorScale = worldSize / 360;
      const mercatorX = (poi.position.lng + 180) * mercatorScale;
      const mercatorY = (180 - (180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + poi.position.lat * Math.PI / 360)))) * mercatorScale;
      
      console.log('Coordinate analysis:', {
        poiId: poi.id,
        original: poi.position,
        screen: originalPoint,
        mercator: { x: mercatorX, y: mercatorY },
        worldSize,
        camera: {
          zoom,
          pitch: map.getPitch(),
          bearing: map.getBearing(),
          center: map.getCenter()
        }
      });

      // Create marker with viewport alignment
      markerRef.current = new mapboxgl.Marker({
        element: el,
        draggable: isDraggable,
        rotationAlignment: 'viewport',
        pitchAlignment: 'viewport',
        anchor: 'center',
        offset: [0, -14] // Half the height of marker-bubble to center it
      })
        .setLngLat(poi.position)
        .addTo(map);

      // Debug marker positioning
      const markerElement = markerRef.current.getElement();
      const markerPos = markerRef.current.getLngLat();
      const markerPixel = map.project([markerPos.lng, markerPos.lat]);
      const markerBounds = markerElement.getBoundingClientRect();
      const mapBounds = map.getCanvas().getBoundingClientRect();
      
      console.log('Marker positioning:', {
        poiId: poi.id,
        position: {
          geographic: markerPos,
          pixel: markerPixel,
          screen: {
            left: markerBounds.left - mapBounds.left,
            top: markerBounds.top - mapBounds.top,
            width: markerBounds.width,
            height: markerBounds.height
          }
        },
        style: {
          transform: markerElement.style.transform,
          position: window.getComputedStyle(markerElement).position
        },
        map: {
          zoom: map.getZoom(),
          center: map.getCenter(),
          bearing: map.getBearing(),
          pitch: map.getPitch()
        }
      });

      // Verify marker position and pixel coordinates
      if (markerRef.current) {
        const actualPos = markerRef.current.getLngLat();
        const pixelPos = map.project([actualPos.lng, actualPos.lat]);
        const currentZoom = map.getZoom();
        console.log('Marker verification:', {
          poiId: poi.id,
          intended: poi.position,
          actual: actualPos,
          pixelCoordinates: pixelPos,
          matches: actualPos.lng === poi.position.lng && actualPos.lat === poi.position.lat,
          zoom: currentZoom,
          scale: Math.pow(2, currentZoom)
        });
      }
    } catch (error) {
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
      let dragStartPos: mapboxgl.LngLat | null = null;

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
              onDragEnd(poi, { lat: lngLat.lat, lng: lngLat.lng });
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
  }, [map, poi, onClick, onDragEnd, selected, className, isDraggable, categoryColor]); // Recreate marker when any of these change

  return null;
};

export default MapboxPOIMarker;
