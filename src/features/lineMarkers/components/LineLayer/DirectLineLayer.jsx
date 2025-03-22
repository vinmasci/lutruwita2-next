import React, { useState, useCallback } from 'react';
import LineMarker from '../LineMarker/LineMarker.jsx';
import LineDrawer from '../LineDrawer/LineDrawer.jsx';
import { useLineContext } from '../../context/LineContext.jsx';

/**
 * DirectLineLayer component
 * 
 * A component that takes line data directly as props instead of relying solely on LineContext.
 * This helps bypass context hierarchy issues when loading lines from MongoDB.
 * 
 * @param {Object} props
 * @param {Object} props.map - The Mapbox map instance
 * @param {Array} props.lines - The line data to render directly (from loaded route)
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

  // Determine which lines to display - use context lines and add any prop lines not in context
  const displayLines = useCallback(() => {
    // Start with all context lines
    const result = [...contextLines];
    
    // Add any prop lines that aren't already in the context
    if (lines && lines.length > 0) {
      lines.forEach(propLine => {
        // Check if this line is already in the context
        const exists = result.some(contextLine => contextLine.id === propLine.id);
        if (!exists) {
          result.push(propLine);
        }
      });
    }
    
    return result;
  }, [contextLines, lines]);

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
      photos: Array.isArray(line.photos) ? line.photos : []
    };
    
    console.log('[DirectLineLayer] Normalized line data for drawer:', normalizedLine);
    
    setSelectedLine(normalizedLine);
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
        onDelete={deleteLine}
      />
    </>
  );
};

export default DirectLineLayer;
