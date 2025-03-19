import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { TabPointerDirections, TabColors } from '../../context/TextboxTabsContext';
import { TEXTBOX_ICON_PATHS } from './textbox-icon-paths';
import { useMapContext } from '../../../map/context/MapContext';
import './MapboxTextboxTabMarker.styles.css';

const MapboxTextboxTabMarker = ({ tab, onDragEnd, onClick, selected }) => {
  const markerRef = useRef(null);
  const { map } = useMapContext();
  
  // Determine text color based on background color
  const textColor = tab.backgroundColor === TabColors.WHITE ? 'black' : 'white';
  
  useEffect(() => {
    if (!map || !tab) return;
    
    // Remove existing marker if it exists
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    
    // Create marker element
    const el = document.createElement('div');
    // Important: Keep the poi-marker class for Mapbox GL's internal handling
    el.className = `poi-marker textbox-tab-marker ${selected ? 'selected' : ''}`;
    
    // Set up marker HTML with proper structure
    const initialZoom = Math.floor(map.getZoom());
    const pointerDirection = tab.pointerDirection || 'right';
    
    // Create icon content similar to POI markers
    const iconContent = tab.icon && TEXTBOX_ICON_PATHS[tab.icon] 
      ? `<i class="${TEXTBOX_ICON_PATHS[tab.icon]}" style="font-size: 16px; color: ${textColor}; margin-right: 8px;"></i>` 
      : '';
    
    // Determine which border color to set based on pointer direction
    let pointerStyle = '';
    if (pointerDirection === 'right') {
      pointerStyle = `border-left-color: ${tab.backgroundColor};`;
    } else if (pointerDirection === 'left') {
      pointerStyle = `border-right-color: ${tab.backgroundColor};`;
    } else if (pointerDirection === 'top') {
      pointerStyle = `border-bottom-color: ${tab.backgroundColor};`;
    } else if (pointerDirection === 'bottom') {
      pointerStyle = `border-top-color: ${tab.backgroundColor};`;
    } else if (pointerDirection === 'top-right' || pointerDirection === 'top-left') {
      pointerStyle = `border-bottom-color: ${tab.backgroundColor};`;
    } else if (pointerDirection === 'bottom-right' || pointerDirection === 'bottom-left') {
      pointerStyle = `border-top-color: ${tab.backgroundColor};`;
    }

    el.innerHTML = `
      <div class="marker-container pointer-${pointerDirection}" data-zoom="${initialZoom}">
        <div class="textbox-tab-content" style="background-color: ${tab.backgroundColor}; color: ${textColor};">
          ${iconContent}
          <span>${tab.text}</span>
        </div>
        <div class="textbox-tab-pointer" style="${pointerStyle}"></div>
      </div>
    `;
    
    try {
      // Create marker with viewport alignment and bottom anchor like POI markers
      markerRef.current = new mapboxgl.Marker({
        element: el,
        draggable: !!onDragEnd,
        anchor: 'bottom', // Changed from 'center' to 'bottom' to match POI markers
        rotationAlignment: 'viewport',
        pitchAlignment: 'viewport',
        offset: [0, 0]
      })
      .setLngLat({ lng: tab.coordinates[0], lat: tab.coordinates[1] })
      .addTo(map);
      
      // Add zoom-based scaling and opacity control
      const updateZoomScale = () => {
        const zoom = map.getZoom(); // Use exact zoom value, not floored
        const markerElement = markerRef.current?.getElement();
        if (markerElement) {
          // Add a CSS class for low-zoom opacity instead of directly setting style
          // This allows CSS transitions to handle the change smoothly
          if (zoom <= 8) {
            markerElement.classList.add('low-zoom-opacity');
          } else {
            markerElement.classList.remove('low-zoom-opacity');
          }
          
          // Always display the marker
          markerElement.style.display = '';
          
          const container = markerElement.querySelector('.marker-container');
          if (container) {
            container.setAttribute('data-zoom', Math.floor(zoom).toString());
          }
        }
      };
      
      // Initial update
      updateZoomScale();
      
      // Update on zoom changes
      map.on('zoom', updateZoomScale);
      
      // Variables to track drag state
      let isMoving = false;
      let hasBeenDragged = false;
      let dragStartPos = null;
      
      // Handle clicking - only if not dragged
      if (onClick) {
        el.addEventListener('click', () => {
          // Only trigger click handler if the marker wasn't being dragged
          if (!hasBeenDragged) {
            onClick(tab);
          }
          // Reset drag state after click
          hasBeenDragged = false;
        });
      }
      
      // Handle dragging - improved to match POI marker implementation
      if (onDragEnd && markerRef.current) {
        markerRef.current
          .on('dragstart', () => {
            isMoving = true;
            hasBeenDragged = false;
            dragStartPos = markerRef.current?.getLngLat() || null;
            console.log('[TextboxTab] Drag started');
          })
          .on('drag', () => {
            hasBeenDragged = true;
          })
          .on('dragend', () => {
            isMoving = false;
            if (hasBeenDragged && onDragEnd) {
              const lngLat = markerRef.current.getLngLat();
              if (lngLat) {
                // Create a deep copy of the coordinates
                const newCoordinates = [lngLat.lng, lngLat.lat];
                
                console.log('[TextboxTab] Drag ended, new coordinates:', newCoordinates);
                
                // Pass the tab object to onDragEnd to ensure proper state updates
                onDragEnd(newCoordinates);
                
                // Update the marker position to match the new coordinates
                markerRef.current.setLngLat({ lng: newCoordinates[0], lat: newCoordinates[1] });
                
                // Also update the tab object's coordinates to maintain consistency
                // This is crucial for proper reinitialization after map interactions
                tab.coordinates = [...newCoordinates]; // Create a new array to avoid reference issues
              }
            }
          });
      }
      
      return () => {
        map.off('zoom', updateZoomScale);
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error creating marker:', error);
    }
  }, [map, tab, onClick, onDragEnd, selected, textColor]);
  
  return null;
};

export default MapboxTextboxTabMarker;
