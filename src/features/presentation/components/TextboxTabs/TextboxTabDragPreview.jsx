import React, { useEffect, useRef } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { useTextboxTabs, TabColors } from '../../context/TextboxTabsContext';
import { TEXTBOX_ICON_PATHS } from './textbox-icon-paths';

const TextboxTabDragPreview = ({ tab, onPlace }) => {
  const { map } = useMapContext();
  const containerRef = useRef(null);
  
  // Create the preview element when the component mounts
  useEffect(() => {
    if (!tab) return;

    // Create marker element (similar to MapboxTextboxTabMarker)
    const markerElement = document.createElement('div');
    markerElement.style.position = 'fixed';
    markerElement.style.zIndex = '1000';
    markerElement.style.pointerEvents = 'none';
    markerElement.style.transform = 'translate(-50%, -50%)';
    markerElement.style.transformOrigin = 'center center';
    markerElement.style.display = 'none'; // Initially hidden
    
    // Create tab container
    const tabContainer = document.createElement('div');
    tabContainer.style.position = 'relative';
    tabContainer.style.transformOrigin = 'center center';
    tabContainer.style.backgroundColor = tab.backgroundColor || TabColors.DEFAULT;
    tabContainer.style.color = tab.backgroundColor === TabColors.WHITE ? 'black' : 'white';
    tabContainer.style.padding = '5px 7px'; // Reduced padding for the preview
    tabContainer.style.borderRadius = '5px'; // Increased from 4px
    tabContainer.style.display = 'flex';
    tabContainer.style.alignItems = 'center';
    tabContainer.style.gap = '8px';
    tabContainer.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    tabContainer.style.maxWidth = '240px'; // Increased from 200px
    tabContainer.style.fontSize = '0.7em'; // Reduced text size to match map version
    
    // Add icon if present
    if (tab.icon && TEXTBOX_ICON_PATHS[tab.icon]) {
      try {
        // Create a Font Awesome icon element
        const iconElement = document.createElement('i');
        iconElement.className = TEXTBOX_ICON_PATHS[tab.icon];
        iconElement.style.fontSize = '10px'; // Further reduced icon size for the preview
        iconElement.style.color = tab.backgroundColor === TabColors.WHITE ? 'black' : 'white';
        iconElement.style.marginRight = '8px';
        
        tabContainer.appendChild(iconElement);
      } catch (error) {
        // Fallback to a generic icon if there's an error
        const iconSvg = document.createElement('div');
        iconSvg.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${tab.backgroundColor === TabColors.WHITE ? 'black' : 'white'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
        tabContainer.appendChild(iconSvg.firstChild);
        console.error('Error creating icon:', error);
      }
    }
    
    // Add text
    const textSpan = document.createElement('span');
    textSpan.textContent = tab.text || 'Tab';
    textSpan.style.fontWeight = '500';
    tabContainer.appendChild(textSpan);
    
    // Add pointer
    const pointer = document.createElement('div');
    pointer.style.width = '0';
    pointer.style.height = '0';
    pointer.style.position = 'absolute';
    pointer.style.filter = 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.2))';
    
    const pointerDirection = tab.pointerDirection || 'right';
    const backgroundColor = tab.backgroundColor || TabColors.DEFAULT;
    
    // Set pointer styles based on direction - reduced size for preview
    if (pointerDirection === 'right') {
      pointer.style.right = '-6px';
      pointer.style.top = '50%';
      pointer.style.transform = 'translateY(-50%)';
      pointer.style.borderTop = '6px solid transparent';
      pointer.style.borderBottom = '6px solid transparent';
      pointer.style.borderLeft = `6px solid ${backgroundColor}`;
    } else if (pointerDirection === 'left') {
      pointer.style.left = '-6px';
      pointer.style.top = '50%';
      pointer.style.transform = 'translateY(-50%)';
      pointer.style.borderTop = '6px solid transparent';
      pointer.style.borderBottom = '6px solid transparent';
      pointer.style.borderRight = `6px solid ${backgroundColor}`;
    } else if (pointerDirection === 'top') {
      pointer.style.top = '-6px';
      pointer.style.left = '50%';
      pointer.style.transform = 'translateX(-50%)';
      pointer.style.borderLeft = '6px solid transparent';
      pointer.style.borderRight = '6px solid transparent';
      pointer.style.borderBottom = `6px solid ${backgroundColor}`;
    } else if (pointerDirection === 'bottom') {
      pointer.style.bottom = '-6px';
      pointer.style.left = '50%';
      pointer.style.transform = 'translateX(-50%)';
      pointer.style.borderLeft = '6px solid transparent';
      pointer.style.borderRight = '6px solid transparent';
      pointer.style.borderTop = `6px solid ${backgroundColor}`;
    } else if (pointerDirection === 'top-right') {
      pointer.style.top = '-6px';
      pointer.style.right = '6px';
      pointer.style.borderLeft = '6px solid transparent';
      pointer.style.borderBottom = `6px solid ${backgroundColor}`;
      pointer.style.borderRight = '0px solid transparent';
    } else if (pointerDirection === 'top-left') {
      pointer.style.top = '-6px';
      pointer.style.left = '6px';
      pointer.style.borderRight = '6px solid transparent';
      pointer.style.borderBottom = `6px solid ${backgroundColor}`;
      pointer.style.borderLeft = '0px solid transparent';
    } else if (pointerDirection === 'bottom-right') {
      pointer.style.bottom = '-6px';
      pointer.style.right = '6px';
      pointer.style.borderLeft = '6px solid transparent';
      pointer.style.borderTop = `6px solid ${backgroundColor}`;
      pointer.style.borderRight = '0px solid transparent';
    } else if (pointerDirection === 'bottom-left') {
      pointer.style.bottom = '-6px';
      pointer.style.left = '6px';
      pointer.style.borderRight = '6px solid transparent';
      pointer.style.borderTop = `6px solid ${backgroundColor}`;
      pointer.style.borderLeft = '0px solid transparent';
    }
    
    tabContainer.appendChild(pointer);
    markerElement.appendChild(tabContainer);
    
    // Add to document
    document.body.appendChild(markerElement);
    containerRef.current = markerElement;
    
    // Add classes to body
    document.body.classList.add('tab-dragging');
    document.body.classList.add('hide-cursor');
    
    // Set up mouse tracking
    let isFirstMove = true;
    
    const handleMouseMove = (e) => {
      // Position the marker at the cursor
      if (containerRef.current) {
        containerRef.current.style.left = `${e.clientX}px`;
        containerRef.current.style.top = `${e.clientY}px`;
        
        // Show the marker after the first mouse move
        if (isFirstMove) {
          isFirstMove = false;
          containerRef.current.style.display = 'block';
        }
      }
    };
    
    const handleMouseUp = (e) => {
      // Convert screen coordinates to map coordinates
      if (map) {
        try {
          // Get the map container's position
          const mapContainer = map.getContainer();
          const rect = mapContainer.getBoundingClientRect();
          
          // Get the click point in screen coordinates
          const screenPoint = {
            x: e.clientX,
            y: e.clientY
          };
          
          // Convert screen coordinates to container coordinates
          const containerX = screenPoint.x - rect.left;
          const containerY = screenPoint.y - rect.top;
          
          // Get the current window dimensions
          const windowWidth = window.innerWidth;
          
          // Determine the scale factor based on window width
          let scale = 0.8; // Default scale
          if (windowWidth <= 320) {
            scale = 0.45;
          } else if (windowWidth <= 480) {
            scale = 0.5;
          } else if (windowWidth <= 600) {
            scale = 0.55;
          } else if (windowWidth <= 900) {
            scale = 0.65;
          } else if (windowWidth <= 1200) {
            scale = 0.7;
          } else if (windowWidth <= 1600) {
            scale = 0.75;
          }
          
          // Adjust coordinates based on the scale factor
          const adjustedX = containerX / scale;
          const adjustedY = containerY / scale;
          
          // With center anchor, we don't need as much offset adjustment
          // but we still need some for the pointer direction
          let offsetX = 0;
          let offsetY = 0;
          const pointerDirection = tab.pointerDirection || 'right';
          const pointerOffset = 10; // Reduced offset since we're using center anchor
          
          // Apply offset based on pointer direction - adjusted for bottom anchor
          // Since we're using bottom anchor now, we need to adjust the offsets
          // to ensure the pointer points exactly where the user clicked
          if (pointerDirection === 'right') {
            offsetX = -pointerOffset * 1.5;
            offsetY = pointerOffset; // Adjust for bottom anchor
          } else if (pointerDirection === 'left') {
            offsetX = pointerOffset * 1.5;
            offsetY = pointerOffset; // Adjust for bottom anchor
          } else if (pointerDirection === 'top') {
            offsetX = 0;
            offsetY = pointerOffset * 2; // Increase offset for bottom anchor
          } else if (pointerDirection === 'bottom') {
            offsetX = 0;
            offsetY = 0; // No offset needed for bottom pointer with bottom anchor
          } else if (pointerDirection === 'top-right') {
            offsetX = -pointerOffset;
            offsetY = pointerOffset * 1.5; // Adjust for bottom anchor
          } else if (pointerDirection === 'top-left') {
            offsetX = pointerOffset;
            offsetY = pointerOffset * 1.5; // Adjust for bottom anchor
          } else if (pointerDirection === 'bottom-right') {
            offsetX = -pointerOffset;
            offsetY = 0; // No Y offset needed for bottom pointer with bottom anchor
          } else if (pointerDirection === 'bottom-left') {
            offsetX = pointerOffset;
            offsetY = 0; // No Y offset needed for bottom pointer with bottom anchor
          }
          
          console.log(`[TextboxTabDragPreview] Using offsets for ${pointerDirection}:`, { offsetX, offsetY });
          
          // Apply the offset to the adjusted coordinates
          const finalX = adjustedX + offsetX;
          const finalY = adjustedY + offsetY;
          
          // Use the adjusted coordinates with offset to get the correct map position
          const lngLat = map.unproject([finalX, finalY]);
          
          console.log('Placing tab with pointer direction:', pointerDirection, 'and offset:', { offsetX, offsetY });
          
          // Create a deep copy of the coordinates to prevent reference issues
          const finalCoordinates = [lngLat.lng, lngLat.lat];
          
          console.log('[TextboxTabDragPreview] Final placement coordinates:', finalCoordinates);
          
          // Call the onPlace callback with the coordinates
          onPlace(finalCoordinates);
        } catch (error) {
          console.error('Error calculating map coordinates:', error);
        }
      }
      
      // Clean up
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('tab-dragging');
      document.body.classList.remove('hide-cursor');
      
      // Remove the marker
      if (containerRef.current) {
        document.body.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
    
    // Start tracking mouse
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Clean up on unmount
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('tab-dragging');
      document.body.classList.remove('hide-cursor');
      
      if (containerRef.current) {
        document.body.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, [map, tab, onPlace]);
  
  // This component doesn't render anything directly
  return null;
};

export default TextboxTabDragPreview;
