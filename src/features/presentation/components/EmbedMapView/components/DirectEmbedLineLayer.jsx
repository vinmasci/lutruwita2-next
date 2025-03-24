import React, { useState, useCallback } from 'react';
import LineMarker from '../../../../lineMarkers/components/LineMarker/LineMarker.jsx';
import { PresentationLineViewer } from '../../LineViewer/PresentationLineViewer';
import './DirectEmbedLineLayer.css';

/**
 * DirectEmbedLineLayer component
 * 
 * A specialized version for embed mode that takes line data directly as props instead of using context.
 * This bypasses the context hierarchy issues and ensures proper rendering of line markers with text and icons.
 * 
 * @param {Object} props
 * @param {Object} props.map - The Mapbox map instance
 * @param {Array} props.lines - The line data to render
 */
const DirectEmbedLineLayer = ({ map, lines = [] }) => {
  console.log('[DirectEmbedLineLayer] Rendering with map:', !!map);
  console.log('[DirectEmbedLineLayer] Lines from props:', { 
    linesCount: lines?.length || 0
  });
  
  // Track selected line for UI state
  const [selectedLineId, setSelectedLineId] = useState(null);
  // Track the line being viewed in the modal
  const [viewingLine, setViewingLine] = useState(null);
  
  // Log the full line data for debugging
  if (lines && lines.length > 0) {
    console.log('[DirectEmbedLineLayer] First line data:', JSON.stringify(lines[0], null, 2));
    console.log('[DirectEmbedLineLayer] Line name:', lines[0].name);
    console.log('[DirectEmbedLineLayer] Line coordinates:', lines[0].coordinates);
    console.log('[DirectEmbedLineLayer] Line icons:', lines[0].icons);
  } else {
    console.log('[DirectEmbedLineLayer] No lines to render');
    return null;
  }

  // Handle line click with memoized callback to prevent unnecessary re-renders
  const handleLineClick = useCallback((line) => {
    console.log('[DirectEmbedLineLayer] Line clicked:', line.id);
    // In embed mode, we show the line viewer modal
    setViewingLine(line);
    // Also update the selected state
    setSelectedLineId(line.id);
  }, []);
  
  // Close the viewer
  const handleCloseViewer = useCallback(() => {
    setViewingLine(null);
    // Optionally deselect the line when closing the viewer
    setSelectedLineId(null);
  }, []);

  // Ensure each line has all required properties for rendering
  const enhancedLines = lines.map(line => {
    // Make sure the line object has all required properties
    return {
      ...line,
      // Ensure id is present
      id: line.id || `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      // Ensure coordinates are properly structured with support for midpoint
      coordinates: line.coordinates 
        ? {
            start: line.coordinates.start || [0, 0],
            end: line.coordinates.end || [0, 0],
            // Preserve midpoint if it exists
            ...(line.coordinates.mid ? { mid: line.coordinates.mid } : {})
          }
        : { start: [0, 0], end: [0, 0] },
      // Ensure name is a string
      name: line.name || '',
      // Ensure icons is an array
      icons: Array.isArray(line.icons) ? line.icons : [],
      // Ensure type is set
      type: line.type || 'line'
    };
  });

  return (
    <>
      {enhancedLines.map(line => (
        <LineMarker
          key={line.id}
          line={line}
          onClick={handleLineClick}
          selected={selectedLineId === line.id}
          map={map}
          drawerOpen={!!viewingLine && viewingLine.id === line.id}
        />
      ))}
      
      {/* Line viewer modal */}
      <PresentationLineViewer 
        line={viewingLine} 
        onClose={handleCloseViewer} 
      />
    </>
  );
};

export default DirectEmbedLineLayer;
