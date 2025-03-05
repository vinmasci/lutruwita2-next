import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { ICON_PATHS } from '../../constants/icon-paths';
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import '../MapboxPOIMarker/MapboxPOIMarker.styles.css';

// We're not using dynamic offsets anymore as they cause issues when zooming

const POIDragPreview = ({ icon, category, onPlace, }) => {
    const { map } = useMapContext();
    const markerRef = useRef(null);
    const containerRef = useRef(null);
    
    // Create the marker element when the component mounts
    useEffect(() => {
        // Create marker container
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.zIndex = '1000';
        container.style.pointerEvents = 'none';
        container.style.transform = 'translate(-50%, -50%) scale(0.74)';
        container.style.transformOrigin = 'center center';
        container.style.display = 'none'; // Initially hidden
        
        // Create marker content
        const iconDefinition = getIconDefinition(icon);
        const markerColor = iconDefinition?.style?.color || POI_CATEGORIES[category].color;
        
        const markerContainer = document.createElement('div');
        markerContainer.className = 'marker-container';
        markerContainer.style.position = 'relative';
        
        const markerBubble = document.createElement('div');
        markerBubble.className = 'marker-bubble';
        markerBubble.style.backgroundColor = markerColor;
        
        if (icon === 'ClimbHC') {
            const span = document.createElement('span');
            span.style.fontSize = '14px';
            span.style.color = 'white';
            
            const iH = document.createElement('i');
            iH.className = 'fa-solid fa-h';
            
            const iC = document.createElement('i');
            iC.className = 'fa-solid fa-c';
            
            span.appendChild(iH);
            span.appendChild(iC);
            markerBubble.appendChild(span);
        } else {
            const i = document.createElement('i');
            i.className = `${ICON_PATHS[icon]} marker-icon`;
            i.style.color = 'white';
            markerBubble.appendChild(i);
        }
        
        const markerPoint = document.createElement('div');
        markerPoint.className = 'marker-point';
        markerPoint.style.borderTopColor = markerColor;
        
        markerContainer.appendChild(markerBubble);
        markerContainer.appendChild(markerPoint);
        container.appendChild(markerContainer);
        
        // Add to document
        document.body.appendChild(container);
        containerRef.current = container;
        
        // Add classes to body
        document.body.classList.add('poi-dragging');
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
                    
                    // Log map container details
                    console.log('Map container details:', {
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height
                    });
                    
                    // Log map state
                    console.log('Map state:', {
                        center: map.getCenter(),
                        zoom: map.getZoom(),
                        bearing: map.getBearing(),
                        pitch: map.getPitch(),
                        projection: map.getProjection().name
                    });
                    
                    // Try a different approach - use the map's project/unproject methods directly
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
                    // This should match the logic in mapScaleUtils.js
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
                    
                    console.log('Calculated scale factor based on window width:', {
                        windowWidth,
                        scale
                    });
                    
                    // Adjust coordinates based on the scale factor
                    const adjustedX = containerX / scale;
                    const adjustedY = containerY / scale;
                    
                    console.log('Coordinate adjustment for scaling:', {
                        originalX: e.clientX - rect.left,
                        originalY: e.clientY - rect.top,
                        scale,
                        adjustedX,
                        adjustedY
                    });
                    
                    // Use the adjusted coordinates to get the correct map position
                    const lngLat = map.unproject([adjustedX, adjustedY]);
                    
                    console.log('Using exact click coordinates for POI placement:', {
                        zoom: map.getZoom(),
                        coordinates: lngLat,
                        coordinatesString: `${lngLat.lng.toFixed(6)}, ${lngLat.lat.toFixed(6)}`
                    });
                    
                    // Log both approaches for comparison
                    const unadjustedPoint = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);
                    console.log('Coordinate calculation comparison:', {
                        fromEvent: e.lngLat ? [e.lngLat.lng, e.lngLat.lat] : null,
                        fromEventString: e.lngLat ? `${e.lngLat.lng.toFixed(6)}, ${e.lngLat.lat.toFixed(6)}` : null,
                        fromUnadjusted: [unadjustedPoint.lng, unadjustedPoint.lat],
                        fromUnadjustedString: `${unadjustedPoint.lng.toFixed(6)}, ${unadjustedPoint.lat.toFixed(6)}`,
                        fromAdjusted: [lngLat.lng, lngLat.lat],
                        fromAdjustedString: `${lngLat.lng.toFixed(6)}, ${lngLat.lat.toFixed(6)}`,
                        difference: {
                            lng: lngLat.lng - unadjustedPoint.lng,
                            lat: lngLat.lat - unadjustedPoint.lat
                        }
                    });
                    
                    console.log('POI placement details:', { 
                        clientX: e.clientX, 
                        clientY: e.clientY,
                        mapRect: rect,
                        relativeX: e.clientX - rect.left,
                        relativeY: e.clientY - rect.top,
                        adjustedX: adjustedX,
                        adjustedY: adjustedY,
                        lngLat,
                        lngLatString: `${lngLat.lng.toFixed(6)}, ${lngLat.lat.toFixed(6)}`
                    });
                    
                    // Dispatch a custom event for POI drop
                    const poiDroppedEvent = new CustomEvent('poi-dropped', {
                        detail: {
                            lng: lngLat.lng,
                            lat: lngLat.lat
                        }
                    });
                    console.log('Dispatching poi-dropped event:', {
                        lng: lngLat.lng,
                        lat: lngLat.lat,
                        lngLatString: `${lngLat.lng.toFixed(6)}, ${lngLat.lat.toFixed(6)}`
                    });
                    window.dispatchEvent(poiDroppedEvent);
                    
                    // Use the calculated point
                    console.log('Calling onPlace with coordinates:', [lngLat.lng, lngLat.lat]);
                    onPlace([lngLat.lng, lngLat.lat]);
                } catch (error) {
                    console.error('Error calculating map coordinates:', error);
                }
            }
            
            // Clean up
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('poi-dragging');
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
            document.body.classList.remove('poi-dragging');
            document.body.classList.remove('hide-cursor');
            
            if (containerRef.current) {
                document.body.removeChild(containerRef.current);
                containerRef.current = null;
            }
        };
    }, [map, icon, category, onPlace]);
    
    // This component doesn't render anything directly
    // It creates and manages the marker element via DOM manipulation
    return null;
};

export default POIDragPreview;
