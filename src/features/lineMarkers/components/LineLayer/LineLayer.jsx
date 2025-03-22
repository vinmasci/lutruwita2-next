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
          end: startPoint // Initially same as start
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
      
      // Use the mouse's x-coordinate but keep the y-coordinate the same as the start point
      // This ensures the line stays on a flat plain
      const endPoint = [
        mousePosition[0], // Use the mouse's x-coordinate (allows left or right)
        startPoint[1]     // Keep the same y coordinate for a straight line
      ];
      
      const finalLine = {
        ...currentLine,
        id: currentLine.id || `line-${Date.now()}`,
        coordinates: {
          ...currentLine.coordinates,
          end: endPoint
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
    
    // Use the mouse's x-coordinate but keep the y-coordinate the same as the start point
    // This allows drawing left or right but keeps the line on a flat plain
    const newEndPoint = [
      mousePosition[0], // Use the mouse's x-coordinate (allows left or right)
      startPoint[1]     // Keep the same y coordinate for a straight line
    ];
    
    setCurrentLine(prevLine => ({
      ...prevLine,
      coordinates: {
        ...prevLine.coordinates,
        end: newEndPoint
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
      coordinates: updatedLine.coordinates || selectedLine?.coordinates
    };

    console.log('Saving line:', finalLine);

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
