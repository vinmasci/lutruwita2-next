import { useEffect, useRef, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';
import { LINE_ICON_PATHS } from '../../constants/line-icons.js';
import logger from '../../../../utils/logger';

const LineMarker = ({ 
  line, 
  onClick, 
  onDragEnd, 
  selected,
  map: propMap,
  drawerOpen = false // Add drawerOpen prop with default value
}) => {
  // Only log in development mode to reduce console output in production
  logger.debug('LineMarker', 'Rendering LineMarker component for line:', line?.id);
  const textMarkerRef = useRef(null);
  const textElementRef = useRef(null); // Reference to the text element for zoom scaling
  const iconsMarkerRef = useRef(null); // Reference to the icons marker
  const iconsElementRef = useRef(null); // Reference to the icons container
  const sourceRef = useRef(null);
  const circleLayerIdRef = useRef(`circle-${line.id || Date.now()}`);
  const circleSourceIdRef = useRef(`circle-source-${line.id || Date.now()}`);
  const innerCircleLayerIdRef = useRef(`inner-circle-${line.id || Date.now()}`);
  
  // Generate a clean layer ID without duplicate "line-" prefixes
  const lineLayerId = useRef(
    line.id 
      ? (line.id.startsWith('line-') ? line.id : `line-${line.id}`)
      : `line-${Date.now()}`
  );
  // Get map from props or context
  const mapContext = useMapContext();
  const map = propMap || mapContext?.map;

  // Memoize coordinates to prevent unnecessary updates
  const coordinates = useMemo(() => ({
    start: line.coordinates?.start,
    mid: line.coordinates?.mid,
    end: line.coordinates?.end
  }), [line.coordinates?.start, line.coordinates?.mid, line.coordinates?.end]);

  // Initial setup of layers and cleanup
  useEffect(() => {
    if (!map || !coordinates.start || !coordinates.end) {
      logger.debug('LineMarker', 'Skipping layer setup - missing requirements:', {
        mapExists: !!map,
        hasStartCoord: !!coordinates.start,
        hasEndCoord: !!coordinates.end
      });
      return;
    }

    logger.debug('LineMarker', 'Setting up map layers for line:', line.id);
    
    // Listen for style.load events to recreate layers after style changes
    const handleStyleLoad = () => {
      logger.debug('LineMarker', 'Map style changed, recreating layers for line:', line.id);
      // If the source and layers were removed during style change, recreate them
      if (!map.getSource(lineLayerId.current)) {
        createLineLayers();
      }
    };
    
    // Add the style.load event listener
    map.on('style.load', handleStyleLoad);

    // Function to create line layers
    const createLineLayers = () => {
      logger.debug('LineMarker', 'Creating new source and layers');
      try {
        // Check if the source already exists
        let sourceExists = false;
        try {
          sourceExists = map.getSource(lineLayerId.current) !== undefined;
        } catch (e) {
          // Source doesn't exist, which is what we want
          sourceExists = false;
        }
        
        // Determine the line coordinates based on whether we have a midpoint
        const lineCoordinates = coordinates.mid 
          ? [coordinates.start, coordinates.mid, coordinates.end] // Two-segment line with midpoint
          : [coordinates.start, coordinates.end]; // Single segment line
        
        // If the source already exists, update it instead of adding a new one
        if (sourceExists) {
          logger.debug('LineMarker', `Source ${lineLayerId.current} already exists, updating instead of creating`);
          const source = map.getSource(lineLayerId.current);
          if (source) {
            source.setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: lineCoordinates
              }
            });
          }
        } else {
          // Source doesn't exist, create it
          map.addSource(lineLayerId.current, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: lineCoordinates
              }
            }
          });
        }
        sourceRef.current = lineLayerId.current;

        // Add shadow line layer first (sits behind the main line)
        map.addLayer({
          id: `${lineLayerId.current}-shadow`,
          type: 'line',
          source: lineLayerId.current,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#000000', // Black shadow
            'line-width': 5, // Wider than the main line
            'line-opacity': 0.5, // Semi-transparent
            'line-blur': 1 // Soft edge for shadow effect
          }
        });
        
        // Add main line layer on top of shadow
        map.addLayer({
          id: lineLayerId.current,
          type: 'line',
          source: lineLayerId.current,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-opacity': 1
          }
        });
        
        // Add circle marker as a map layer instead of DOM element
        // First, check if the circle source already exists
        let circleSourceExists = false;
        try {
          circleSourceExists = map.getSource(circleSourceIdRef.current) !== undefined;
        } catch (e) {
          // Source doesn't exist, which is what we want
          circleSourceExists = false;
        }
        
        // If the circle source already exists, update it instead of adding a new one
        if (circleSourceExists) {
          logger.debug('LineMarker', `Circle source ${circleSourceIdRef.current} already exists, updating instead of creating`);
          const circleSource = map.getSource(circleSourceIdRef.current);
          if (circleSource) {
            circleSource.setData({
              type: 'Feature',
              properties: {
                selected: selected
              },
              geometry: {
                type: 'Point',
                coordinates: coordinates.start
              }
            });
          }
        } else {
          // Circle source doesn't exist, create it
          map.addSource(circleSourceIdRef.current, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                selected: selected
              },
              geometry: {
                type: 'Point',
                coordinates: coordinates.start
              }
            }
          });
        }
        
        // Add outer circle layer (white with black border)
        map.addLayer({
          id: circleLayerIdRef.current,
          type: 'circle',
          source: circleSourceIdRef.current,
          paint: {
            'circle-radius': 8,
            'circle-color': 'white',
            'circle-stroke-width': 2,
            'circle-stroke-color': 'black',
            'circle-stroke-opacity': 1,
            'circle-opacity': 1
          }
        });
        
        // Add inner circle layer (black bullseye)
        map.addLayer({
          id: innerCircleLayerIdRef.current,
          type: 'circle',
          source: circleSourceIdRef.current,
          paint: {
            'circle-radius': 3,
            'circle-color': 'black',
            'circle-opacity': 1
          }
        });
        
        // Add click handler for the circle
        if (onClick) {
          map.on('click', circleLayerIdRef.current, (e) => {
            // Prevent the click event from propagating to other layers
            e.originalEvent.stopPropagation();
            onClick(line);
          });
          
          // Add click handler for the line
          map.on('click', lineLayerId.current, (e) => {
            // Prevent the click event from propagating to other layers
            e.originalEvent.stopPropagation();
            onClick(line);
          });
          
          // Change cursor to pointer when hovering over the circle
          map.on('mouseenter', circleLayerIdRef.current, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          
          map.on('mouseleave', circleLayerIdRef.current, () => {
            map.getCanvas().style.cursor = '';
          });
          
          // Change cursor to pointer when hovering over the line
          map.on('mouseenter', lineLayerId.current, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          
          map.on('mouseleave', lineLayerId.current, () => {
            map.getCanvas().style.cursor = '';
          });
        }
      } catch (error) {
        logger.error('LineMarker', 'Error creating map layers:', error);
      }
    };
    
    // Create source if it doesn't exist
    if (!sourceRef.current) {
      createLineLayers();
    }

    return () => {
      // Remove the style.load event listener
      map.off('style.load', handleStyleLoad);
      
      // Skip cleanup if drawer is open for this line
      if (drawerOpen && selected) {
        logger.debug('LineMarker', `Skipping cleanup for line ${line.id} because drawer is open`);
        return;
      }
      
      logger.debug('LineMarker', `Starting cleanup for line ${line.id}`);
      
      // Clean up text marker first
      if (textMarkerRef.current) {
        textMarkerRef.current.remove();
        textMarkerRef.current = null;
      }
      
      // Clean up icons marker
      if (iconsMarkerRef.current) {
        iconsMarkerRef.current.remove();
        iconsMarkerRef.current = null;
      }

      // Clean up all layers in reverse order of creation
      // Important: Remove all layers before removing the source
      const safeRemoveLayer = (layerId) => {
        try {
          if (map && map.getStyle() && map.getLayer(layerId)) {
            logger.debug('LineMarker', `Removing layer: ${layerId}`);
            map.removeLayer(layerId);
            return true;
          }
        } catch (error) {
          logger.error('LineMarker', `Error removing layer ${layerId}:`, error);
        }
        return false;
      };
      
      const safeRemoveSource = (sourceId) => {
        try {
          if (map && map.getStyle() && map.getSource(sourceId)) {
            logger.debug('LineMarker', `Removing source: ${sourceId}`);
            map.removeSource(sourceId);
            return true;
          }
        } catch (error) {
          logger.error('LineMarker', `Error removing source ${sourceId}:`, error);
        }
        return false;
      };
      
      // Use a longer delay to ensure the map is ready for cleanup
      // This helps prevent issues with layer removal timing
      setTimeout(() => {
        // Skip cleanup if drawer was opened during the timeout
        if (drawerOpen && selected) {
          logger.debug('LineMarker', `Skipping delayed cleanup for line ${line.id} because drawer is open`);
          return;
        }
        
        // Remove inner circle layer
        safeRemoveLayer(innerCircleLayerIdRef.current);
        
        // Remove outer circle layer
        safeRemoveLayer(circleLayerIdRef.current);
        
        // Remove circle source
        safeRemoveSource(circleSourceIdRef.current);
        
        // Remove layers in reverse order of creation
        
        // Remove main line layer first
        safeRemoveLayer(lineLayerId.current);
        
        // Then remove shadow layer
        safeRemoveLayer(`${lineLayerId.current}-shadow`);
        
        // Remove any other layers that might exist
        safeRemoveLayer(`${lineLayerId.current}-extrusion`);
        safeRemoveLayer(`${lineLayerId.current}-glow`);
        
        // Finally remove the source after all layers are removed
        if (safeRemoveSource(lineLayerId.current)) {
          sourceRef.current = null;
        }
      }, 100); // Increased timeout from 0 to 100ms
    };
  }, [map, coordinates.start, onClick, selected]); // Dependencies

  // Update line coordinates when they change
  useEffect(() => {
    if (!map || !sourceRef.current || !coordinates.start || !coordinates.end) return;

    // Store the animation frame ID so we can cancel it if needed
    let frameId = null;
    
    const updateData = () => {
      // Update line source
      const source = map.getSource(sourceRef.current);
      if (source) {
        // Determine the line coordinates based on whether we have a midpoint
        const lineCoordinates = coordinates.mid 
          ? [coordinates.start, coordinates.mid, coordinates.end] // Two-segment line with midpoint
          : [coordinates.start, coordinates.end]; // Single segment line
        
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: lineCoordinates
          }
        });
      }
      
      // Update circle source
      const circleSource = map.getSource(circleSourceIdRef.current);
      if (circleSource) {
        circleSource.setData({
          type: 'Feature',
          properties: {
            selected: selected
          },
          geometry: {
            type: 'Point',
            coordinates: coordinates.start
          }
        });
      }
    };

    // Schedule the update
    frameId = requestAnimationFrame(updateData);

    // Clean up the animation frame if the component unmounts or coordinates change
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [map, coordinates.start, coordinates.end, selected]);

  // Create and update text marker
  useEffect(() => {
    if (!map || !coordinates.end) {
      logger.debug('LineMarker', `Skipping text marker creation - missing requirements for line: ${line?.id}`, {
        mapExists: !!map,
        hasEndCoord: !!coordinates?.end,
        lineName: line?.name
      });
      return;
    }

    // Create or update text marker if coordinates exist
    // We don't check for line.name here to prevent text from disappearing when drawer opens
    logger.debug('LineMarker', `Managing text marker for line: ${line.id}, name: ${line.name || 'unnamed'}`);

    // Only recreate the text marker if it doesn't exist or if the name has changed
    const shouldRecreateMarker = !textMarkerRef.current || 
                               (textMarkerRef.current && textMarkerRef.current._lineName !== line.name);
    
    if (shouldRecreateMarker) {
      // Remove existing text marker if it exists
      if (textMarkerRef.current) {
        textMarkerRef.current.remove();
        textMarkerRef.current = null;
      }

      // Create container for text
      const container = document.createElement('div');
      container.className = 'line-text-container';
      
      // Create text element with inline styles to ensure they're applied
      const textEl = document.createElement('div');
      textEl.className = 'line-text-label';
      textEl.textContent = line.name;
      textElementRef.current = textEl; // Store reference for zoom scaling
      
      // Function to calculate font size based on zoom level
      const calculateFontSize = (zoom) => {
        // Base size at zoom level 14
        const baseSize = 28; // Increased from 24 to 28
        const baseZoom = 14;
        
        // Scale factor - slightly less aggressive scaling
        const scaleFactor = 1.8; // Decreased from 2.0 to 1.8 to match icon scaling
        
        // Calculate size based on zoom difference
        const zoomDiff = zoom - baseZoom;
        const size = baseSize * Math.pow(scaleFactor, zoomDiff / 5);
        
        // Clamp size between reasonable min and max values
        // Increased minimum size for less aggressive shrinking at outer zooms
        return Math.max(12, Math.min(56, size)) + 'px'; // Increased min from 8 to 12, max from 48 to 56
      };
      
      // Function to calculate offset based on zoom level
      const calculateOffset = (zoom) => {
        // Use a fixed offset that doesn't depend on zoom level
        return [0, -5]; // Reduced offset to position text closer to the line
      };
      
      // Apply styles directly to the element - chip style
      textEl.style.color = 'white';
      textEl.style.fontSize = calculateFontSize(map.getZoom()); // Initial size based on current zoom
      textEl.style.fontWeight = '500';
      textEl.style.fontFamily = '"Roboto", "Arial", sans-serif';
      textEl.style.whiteSpace = 'nowrap';
      textEl.style.pointerEvents = 'auto';
      textEl.style.cursor = 'pointer';
      textEl.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      textEl.style.padding = '4px 8px';
      textEl.style.borderRadius = '4px'; // Slight radial edges
      textEl.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
      textEl.style.zIndex = '1000';
      textEl.style.display = 'inline-block';
      
      container.appendChild(textEl);
      
      // Remove verbose style logging
      
      // Determine text alignment based on line direction
      const startPoint = coordinates.start;
      const endPoint = coordinates.end;
      const isGoingRight = endPoint[0] >= startPoint[0];
      
      // Set text alignment based on line direction
      textEl.style.textAlign = isGoingRight ? 'right' : 'left';
      container.style.width = 'auto';
      container.style.textAlign = isGoingRight ? 'right' : 'left';
      
      // Add click handler to the text element
      if (onClick) {
        textEl.addEventListener('click', (e) => {
          e.stopPropagation();
          onClick(line);
        });
      }
      
      // Create and add the marker with positioning based on line direction
      textMarkerRef.current = new mapboxgl.Marker({
        element: container,
        anchor: isGoingRight ? 'bottom-right' : 'bottom-left', // Anchor based on direction
        offset: calculateOffset(map.getZoom()), // Use fixed offset
        // Add these properties to ensure consistent positioning
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport'
      })
        .setLngLat(coordinates.end)
        .addTo(map);
      
      // Store the line name in the marker reference for comparison in future renders
      textMarkerRef.current._lineName = line.name;
      
      logger.debug('LineMarker', 'Text marker added to map');
      
      // Add zoom change listener to update text size only (offset remains fixed)
      const updateTextSize = () => {
        const currentZoom = map.getZoom();
        
        // Update font size
        if (textElementRef.current) {
          textElementRef.current.style.fontSize = calculateFontSize(currentZoom);
        }
      };
      
      // Add the zoom event listener
      map.on('zoom', updateTextSize);
      
      // Clean up the zoom event listener when the component unmounts
      return () => {
        // Remove the zoom event listener
        map.off('zoom', updateTextSize);
        
        // Remove click event listener if it exists
        if (textElementRef.current && onClick) {
          textElementRef.current.removeEventListener('click', onClick);
        }
        
        // Remove the text marker
        if (textMarkerRef.current) {
          textMarkerRef.current.remove();
          textMarkerRef.current = null;
        }
        
        // Clear the text element reference
        textElementRef.current = null;
      };
    }
  }, [map, coordinates.start, coordinates.end, line.name, selected]);

  // Create and update icons marker
  useEffect(() => {
    if (!map || !coordinates.end) return;

    // Only proceed if the line has icons
    if (!line.icons || line.icons.length === 0) return;

    logger.debug('LineMarker', `Managing icons marker for line: ${line.id}, icons: ${line.icons.join(', ')}, selected: ${selected}`);

    // Check if we need to create or update the marker
    // We don't want to recreate the marker just because the selected state changed
    const shouldCreateMarker = !iconsMarkerRef.current;
    const shouldUpdateMarker = iconsMarkerRef.current && 
                              JSON.stringify(iconsMarkerRef.current._lineIcons) !== JSON.stringify(line.icons);
    
    // Only recreate the marker if it doesn't exist or if the icons have changed
    if (shouldCreateMarker || shouldUpdateMarker) {
      logger.debug('LineMarker', `${shouldCreateMarker ? 'Creating' : 'Updating'} icons marker for line: ${line.id}`);
      
      // Remove existing marker if it exists
      if (iconsMarkerRef.current) {
        iconsMarkerRef.current.remove();
        iconsMarkerRef.current = null;
      }

      // Determine direction based on line coordinates
      const startPoint = coordinates.start;
      const endPoint = coordinates.end;
      const isGoingRight = endPoint[0] >= startPoint[0];
      
      // Create container for icons
      const container = document.createElement('div');
      container.className = 'line-icons-container';
      container.style.display = 'flex';
      container.style.flexDirection = 'row';
      container.style.justifyContent = isGoingRight ? 'flex-start' : 'flex-end'; // Align based on direction
      container.style.alignItems = 'center';
      container.style.gap = '4px';
      
      // Function to calculate icon size based on zoom level
      const calculateIconSize = (zoom) => {
        // Base size at zoom level 14
        const baseSize = 30; // Increased from 26 to 30
        const baseZoom = 14;
        
        // Scale factor - slightly less aggressive scaling
        const scaleFactor = 1.8; // Decreased from 2.0 to 1.8
        
        // Calculate size based on zoom difference
        const zoomDiff = zoom - baseZoom;
        const size = baseSize * Math.pow(scaleFactor, zoomDiff / 5);
        
        // Clamp size between reasonable min and max values
        // Increased minimum size for less aggressive shrinking at outer zooms
        return Math.max(12, Math.min(70, size)); // Increased min from 8 to 12, max from 64 to 70
      };
      
      // Create icon elements in white boxes
      line.icons.forEach(iconName => {
        if (LINE_ICON_PATHS[iconName]) {
          // Create marker bubble container (white box)
          const bubbleContainer = document.createElement('div');
          // Make the boxes 40% larger than the calculated icon size
          const boxSize = calculateIconSize(map.getZoom()) * 1.4;
          bubbleContainer.style.width = `${boxSize}px`;
          bubbleContainer.style.height = `${boxSize}px`;
          bubbleContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
          bubbleContainer.style.borderRadius = '4px'; // Smaller border radius for more square appearance
          bubbleContainer.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
          bubbleContainer.style.display = 'flex';
          bubbleContainer.style.alignItems = 'center';
          bubbleContainer.style.justifyContent = 'center';
          bubbleContainer.style.margin = '0 2px'; // Reduced margin between boxes
          bubbleContainer.style.cursor = 'pointer'; // Add pointer cursor
          
          // Create icon element
          const iconEl = document.createElement('i');
          iconEl.className = LINE_ICON_PATHS[iconName];
          iconEl.style.fontSize = `${calculateIconSize(map.getZoom()) * 0.7}px`;
          iconEl.style.color = 'black'; // Black icon on white background
          
          // Add click handler to the bubble container
          if (onClick) {
            bubbleContainer.addEventListener('click', (e) => {
              e.stopPropagation();
              onClick(line);
            });
          }
          
          // Add icon to bubble container
          bubbleContainer.appendChild(iconEl);
          container.appendChild(bubbleContainer);
        }
      });
      
      iconsElementRef.current = container;
      
      // Create and add the marker with positioning based on line direction
      iconsMarkerRef.current = new mapboxgl.Marker({
        element: container,
        anchor: isGoingRight ? 'top-right' : 'top-left', // Anchor based on direction
        offset: [0, 7], // Increased from 5 to 7 to move icons down by 2px
        // Add these properties to ensure consistent positioning
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport'
      })
        .setLngLat(coordinates.end)
        .addTo(map);
      
      logger.debug('LineMarker', 'Icons marker added to map');
      
      // Store the line icons in the marker reference for comparison in future renders
      iconsMarkerRef.current._lineIcons = [...line.icons];
      
      // Add zoom change listener to update icon size
      const updateIconSize = () => {
        const currentZoom = map.getZoom();
        const iconSize = calculateIconSize(currentZoom);
        const boxSize = iconSize * 1.4; // Apply the same 40% increase as in creation
        
        // Update all icon sizes
        if (iconsElementRef.current) {
          // Get all bubble containers (white boxes)
          const bubbleContainers = iconsElementRef.current.querySelectorAll('div');
          bubbleContainers.forEach(container => {
            // Update bubble container size
            container.style.width = `${boxSize}px`;
            container.style.height = `${boxSize}px`;
            
            // Update icon size inside the bubble
            const icon = container.querySelector('i');
            if (icon) {
              icon.style.fontSize = `${iconSize * 0.7}px`;
            }
          });
        }
      };
      
      // Add the zoom event listener
      map.on('zoom', updateIconSize);
      
      // Clean up the zoom event listener when the component unmounts
      return () => {
        // Remove the zoom event listener
        map.off('zoom', updateIconSize);
        
        // Remove click event listeners from bubble containers
        if (iconsElementRef.current && onClick) {
          const bubbleContainers = iconsElementRef.current.querySelectorAll('div');
          bubbleContainers.forEach(container => {
            container.removeEventListener('click', onClick);
          });
        }
        
        // Remove the icons marker
        if (iconsMarkerRef.current) {
          iconsMarkerRef.current.remove();
          iconsMarkerRef.current = null;
        }
        
        // Clear the icons element reference
        iconsElementRef.current = null;
      };
    }
  }, [map, coordinates.end, line.icons, selected]);

  // Update marker selection state
  useEffect(() => {
    if (!map || !circleSourceIdRef.current) return;
    
    // Update the circle source with the new selected state
    const circleSource = map.getSource(circleSourceIdRef.current);
    if (circleSource) {
      circleSource.setData({
        type: 'Feature',
        properties: {
          selected: selected
        },
        geometry: {
          type: 'Point',
          coordinates: coordinates.start
        }
      });
    }
  }, [selected, map, coordinates.start]);

  return null;
};

export default LineMarker;
