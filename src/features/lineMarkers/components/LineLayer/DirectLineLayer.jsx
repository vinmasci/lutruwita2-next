import React, { useState, useCallback, useEffect } from 'react';
import LineMarker from '../LineMarker/LineMarker.jsx';
import LineDrawer from '../LineDrawer/LineDrawer.jsx';
import { useLineContext } from '../../context/LineContext.jsx';
import { useRouteContext } from '../../../map/context/RouteContext';
import logger from '../../../../utils/logger';

/**
 * DirectLineLayer component
 * 
 * A component that takes line data directly as props instead of relying solely on LineContext.
 * This helps bypass context hierarchy issues when loading lines from MongoDB.
 * 
 * @param {Object} props
 * @param {Object} props.map - The Mapbox map instance
 * @param {Array} props.lines - The line data to render directly (from loaded route)
 * @param {Function} props.onLineDeleted - Optional callback when a line is deleted
 */
const DirectLineLayer = ({ map, lines = [] }) => {
  console.log('[DirectLineLayer] Rendering with map:', !!map);
  console.log('[DirectLineLayer] Lines from props:', { 
    linesCount: lines?.length || 0
  });
  
  // Get access to LineContext for adding/updating lines
  const { 
    lines: contextLines,
    isDrawing,
    setIsDrawing,
    currentLine,
    setCurrentLine,
    addLine,
    updateLine,
    deleteLine
  } = useLineContext();
  
  // Local state for drawer and selection
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);

  // Determine which lines to display - prioritize context lines over prop lines with the same ID
  const displayLines = useCallback(() => {
    // Create a map of line IDs to lines from context
    const lineMap = new Map();
    contextLines.forEach(line => {
      if (line.id) {
        lineMap.set(line.id, line);
      }
    });
    
    // Add prop lines that aren't already in the context
    if (lines && lines.length > 0) {
      lines.forEach(propLine => {
        // Only add to the map if it doesn't already exist
        if (propLine.id && !lineMap.has(propLine.id)) {
          lineMap.set(propLine.id, propLine);
          
          // Also add the line to the context state to ensure it's saved
          // This is important to prevent lines from being lost when saving to MongoDB
          console.log('[DirectLineLayer] Adding line from props to context state:', propLine.id);
          
          // Ensure the line has all required properties, especially preserving the midpoint
          const enhancedLine = {
            ...propLine,
            id: propLine.id,
            coordinates: propLine.coordinates 
              ? {
                  start: propLine.coordinates.start || [0, 0],
                  end: propLine.coordinates.end || [0, 0],
                  // Preserve midpoint if it exists
                  ...(propLine.coordinates.mid ? { mid: propLine.coordinates.mid } : {})
                }
              : { start: [0, 0], end: [0, 0] },
            name: propLine.name || '',
            icons: Array.isArray(propLine.icons) ? propLine.icons : [],
            type: propLine.type || 'line'
          };
          
          // Log if the line has a midpoint
          if (propLine.coordinates?.mid) {
            console.log('[DirectLineLayer] Line has midpoint:', propLine.id, propLine.coordinates.mid);
          }
          
          // Add to context if not already there
          if (!contextLines.some(line => line.id === propLine.id)) {
            addLine(enhancedLine);
          }
        }
      });
    }
    
    // Convert the map back to an array
    return Array.from(lineMap.values());
  }, [contextLines, lines, addLine]);

  // Handle line click
  const handleLineClick = useCallback((line) => {
    // Normalize the line data to ensure it has the expected structure
    const normalizedLine = {
      ...line,
      id: line.id || `line-${Date.now()}`,
      type: line.type || 'line',
      name: line.name || '',
      description: line.description || '',
      icons: line.icons || [],
      // Ensure photos is an array, even if empty
      photos: Array.isArray(line.photos) ? line.photos : [],
      // Ensure coordinates structure is preserved, especially the midpoint
      coordinates: {
        start: line.coordinates?.start || [0, 0],
        end: line.coordinates?.end || [0, 0],
        ...(line.coordinates?.mid ? { mid: line.coordinates.mid } : {})
      }
    };
    
    console.log('[DirectLineLayer] Normalized line data for drawer:', normalizedLine);
    
    setSelectedLine(normalizedLine);
    setDrawerOpen(true);
  }, []);

  // Get access to RouteContext to update loadedLineData
  let routeContext;
  try {
    routeContext = useRouteContext();
  } catch (error) {
    // This is expected when the DirectLineLayer is used outside of a RouteProvider
    console.log('[DirectLineLayer] RouteContext not available:', error.message);
    routeContext = null;
  }

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
      console.log('[DirectLineLayer] Saving line with midpoint:', finalLine.id, finalLine.coordinates.mid);
    }

    console.log('[DirectLineLayer] Saving line:', finalLine);

    if (finalLine.id && finalLine.coordinates) {
      if (contextLines.some(line => line.id === finalLine.id)) {
        updateLine(finalLine.id, finalLine);
      } else {
        addLine(finalLine);
      }
      setDrawerOpen(false);
      setSelectedLine(null);
    } else {
      console.error('[DirectLineLayer] Invalid line data:', finalLine);
    }
  }, [addLine, updateLine, selectedLine, contextLines]);

  // Enhanced delete handler that updates LineContext
  const handleDeleteLine = useCallback((lineId) => {
    console.log('[DirectLineLayer] Deleting line with ID:', lineId);
    
    try {
      // Delete from LineContext (which now also updates RouteContext)
      deleteLine(lineId);
      console.log('[DirectLineLayer] Successfully deleted line:', lineId);
    } catch (error) {
      console.error('[DirectLineLayer] Error deleting line:', error.message);
    }
    
    // Update our local display state to remove the line
    setSelectedLine(null);
    setDrawerOpen(false);
    
    // Force a re-render by updating a state variable
    setIsDrawing(false);
    
    console.log('[DirectLineLayer] Line deletion process completed for line:', lineId);
  }, [deleteLine, setIsDrawing]);

  // Get the final list of lines to display
  const linesToDisplay = displayLines();

  return (
    <>
      {/* Render all lines */}
      {linesToDisplay.map(line => (
        <LineMarker
          key={line.id}
          line={line}
          onClick={handleLineClick}
          selected={selectedLine?.id === line.id}
          map={map}
          drawerOpen={drawerOpen && selectedLine?.id === line.id}
        />
      ))}

      {/* Render current line being drawn */}
      {isDrawing && currentLine && (
        <LineMarker
          line={currentLine}
          className="drawing"
          map={map}
          drawerOpen={false}
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
        onDelete={handleDeleteLine}
      />
    </>
  );
};

export default DirectLineLayer;
