import React, { useEffect, useState, useCallback } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { useLineContext } from '../../context/LineContext.jsx';
import LineMarker from '../LineMarker/LineMarker.jsx';
import LineDrawer from '../LineDrawer/LineDrawer.jsx';

const LineLayer = () => {
  console.log('[LineLayer] Rendering LineLayer component');
  
  const { map, isMapReady } = useMapContext();
  console.log('[LineLayer] Map context:', { 
    mapExists: !!map, 
    isMapReady, 
    mapType: map ? typeof map : 'undefined'
  });
  
  const { 
    lines,
    isDrawing,
    setIsDrawing,
    currentLine,
    setCurrentLine,
    addLine,
    updateLine,
    updateLineCoordinates,
    deleteLine
  } = useLineContext();
  
  console.log('[LineLayer] Line context:', { 
    linesCount: lines?.length || 0, 
    linesData: lines,
    isDrawing
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);

  // Handle map click to start line drawing
  const handleMapClick = useCallback((e) => {
    if (isDrawing && !currentLine) {
      // Start drawing new line
      const startPoint = [e.lngLat.lng, e.lngLat.lat];
      const newLine = {
        id: `line-${Date.now()}`,
        coordinates: {
          start: startPoint,
          end: startPoint, // Initially same as start
          mid: null // Add midpoint for the diagonal segment
        },
        type: 'line'
      };
      setCurrentLine(newLine);
    } else if (isDrawing && currentLine) {
      // Finish drawing line and open drawer for details
      // Get the mouse position
      const mousePosition = [e.lngLat.lng, e.lngLat.lat];
      
      // Get the start point
      const startPoint = currentLine.coordinates.start;
      
      // Calculate the vertical distance from start to mouse
      const verticalDistance = mousePosition[1] - startPoint[1];
      
      // Calculate the horizontal distance from start to mouse
      const horizontalDistance = mousePosition[0] - startPoint[0];
      
      // Calculate the midpoint (end of diagonal segment, start of horizontal segment)
      // The vertical component determines how far up/down the diagonal goes
      const midPoint = [
        startPoint[0] + Math.abs(verticalDistance), // Move horizontally by the same amount as vertical
        startPoint[1] + verticalDistance // Move vertically based on mouse position
      ];
      
      // Calculate the end point (end of horizontal segment)
      // The horizontal distance determines how far left/right the horizontal line goes
      const endPoint = [
        midPoint[0] + (horizontalDistance - Math.abs(verticalDistance)), // Adjust for the horizontal component of the diagonal
        midPoint[1] // Keep the same y-coordinate as the midpoint for a horizontal line
      ];
      
      const finalLine = {
        ...currentLine,
        id: currentLine.id || `line-${Date.now()}`,
        coordinates: {
          ...currentLine.coordinates,
          mid: midPoint, // Add midpoint for the diagonal segment
          end: endPoint  // Update endpoint for the horizontal segment
        }
      };
      
      setSelectedLine(finalLine);
      setDrawerOpen(true);
      setCurrentLine(null);
      setIsDrawing(false);
    }
  }, [isDrawing, currentLine, setCurrentLine, setIsDrawing]);

  // Handle mouse move during line drawing
  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || !currentLine) return;

    // Get the mouse position
    const mousePosition = [e.lngLat.lng, e.lngLat.lat];
    
    // Get the start point
    const startPoint = currentLine.coordinates.start;
    
    // Calculate the vertical distance from start to mouse
    const verticalDistance = mousePosition[1] - startPoint[1];
    
    // Calculate the horizontal distance from start to mouse
    const horizontalDistance = mousePosition[0] - startPoint[0];
    
    // Calculate the midpoint (end of diagonal segment, start of horizontal segment)
    // The vertical component determines how far up/down the diagonal goes
    const midPoint = [
      startPoint[0] + Math.abs(verticalDistance), // Move horizontally by the same amount as vertical
      startPoint[1] + verticalDistance // Move vertically based on mouse position
    ];
    
    // Calculate the end point (end of horizontal segment)
    // The horizontal distance determines how far left/right the horizontal line goes
    const endPoint = [
      midPoint[0] + (horizontalDistance - Math.abs(verticalDistance)), // Adjust for the horizontal component of the diagonal
      midPoint[1] // Keep the same y-coordinate as the midpoint for a horizontal line
    ];
    
    // Update the line with both the midpoint and endpoint
    setCurrentLine(prevLine => ({
      ...prevLine,
      coordinates: {
        ...prevLine.coordinates,
        mid: midPoint, // Add midpoint for the diagonal segment
        end: endPoint  // Update endpoint for the horizontal segment
      }
    }));
  }, [isDrawing, currentLine, setCurrentLine]);

  // Reset drawing state when component unmounts or drawing mode changes
  useEffect(() => {
    return () => {
      if (isDrawing) {
        setIsDrawing(false);
        setCurrentLine(null);
      }
    };
  }, [isDrawing, setIsDrawing, setCurrentLine]);

  // Handle cursor style
  useEffect(() => {
    if (!map || !isMapReady) return;
    const canvas = map.getCanvas();
    if (!canvas) return;

    canvas.style.cursor = isDrawing ? 'crosshair' : '';
    return () => {
      canvas.style.cursor = '';
    };
  }, [map, isMapReady, isDrawing]);

  // Handle click events
  useEffect(() => {
    if (!map || !isMapReady || !isDrawing) return;

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, isMapReady, isDrawing, handleMapClick]);

  // Handle mouse move events
  useEffect(() => {
    if (!map || !isMapReady || !isDrawing || !currentLine) return;

    map.on('mousemove', handleMouseMove);
    return () => {
      map.off('mousemove', handleMouseMove);
    };
  }, [map, isMapReady, isDrawing, currentLine, handleMouseMove]);

  // Handle line click
  const handleLineClick = useCallback((line) => {
    setSelectedLine(line);
    setDrawerOpen(true);
  }, []);

  // Handle drawer save
  const handleDrawerSave = useCallback((updatedLine) => {
    // Ensure we have all required line data
    const finalLine = {
      ...updatedLine,
      id: updatedLine.id || `line-${Date.now()}`,
      type: 'line',
      coordinates: updatedLine.coordinates 
        ? {
            start: updatedLine.coordinates.start || [0, 0],
            end: updatedLine.coordinates.end || [0, 0],
            // Preserve midpoint if it exists in the updated line
            ...(updatedLine.coordinates.mid ? { mid: updatedLine.coordinates.mid } : 
              // Otherwise check if it exists in the selected line
              (selectedLine?.coordinates?.mid ? { mid: selectedLine.coordinates.mid } : {}))
          }
        : (selectedLine?.coordinates || { start: [0, 0], end: [0, 0] })
    };
    
    // Log if the line has a midpoint
    if (finalLine.coordinates.mid) {
      console.log(`[LineLayer] Saving line ${finalLine.id} with midpoint:`, finalLine.coordinates.mid);
    }

    console.log('[LineLayer] Saving line:', finalLine);

    if (finalLine.id && finalLine.coordinates) {
      if (lines.some(line => line.id === finalLine.id)) {
        updateLine(finalLine.id, finalLine);
      } else {
        addLine(finalLine);
      }
      setDrawerOpen(false);
      setSelectedLine(null);
    } else {
      console.error('Invalid line data:', finalLine);
    }
  }, [addLine, updateLine, selectedLine, lines]);

  return (
    <>
      {/* Render existing lines */}
      {lines.map(line => (
        <LineMarker
          key={line.id}
          line={line}
          onClick={handleLineClick}
          selected={selectedLine?.id === line.id}
          drawerOpen={drawerOpen && selectedLine?.id === line.id}
          map={map}
        />
      ))}

      {/* Render current line being drawn */}
      {isDrawing && currentLine && (
        <LineMarker
          line={currentLine}
          className="drawing"
          drawerOpen={false}
          map={map}
        />
      )}

      {/* Line details drawer */}
      <LineDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedLine(null);
        }}
        line={selectedLine}
        onSave={handleDrawerSave}
        onDelete={deleteLine}
      />
    </>
  );
};

export default LineLayer;
