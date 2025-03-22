import React, { useState } from 'react';
import { useLineContext } from '../../../lineMarkers/context/LineContext.jsx';
import LineMarker from '../../../lineMarkers/components/LineMarker/LineMarker.jsx';
import { PresentationLineViewer } from '../LineViewer/PresentationLineViewer';

/**
 * PresentationLineLayer component
 * 
 * A specialized version of LineLayer for presentation mode that ensures
 * proper integration with the presentation map instance.
 * 
 * @param {Object} props
 * @param {Object} props.map - The Mapbox map instance
 */
const PresentationLineLayer = ({ map }) => {
  console.log('[PresentationLineLayer] Rendering with map:', !!map);
  
  const { 
    lines,
    selectedLine,
    updateLine
  } = useLineContext();
  
  // State for the line being viewed in the modal
  const [viewingLine, setViewingLine] = useState(null);
  
  console.log('[PresentationLineLayer] Lines from context:', { 
    linesCount: lines?.length || 0, 
    linesData: lines
  });

  // Handle line click
  const handleLineClick = (line) => {
    console.log('[PresentationLineLayer] Line clicked:', line.id);
    // In presentation mode, we show the line viewer modal
    setViewingLine(line);
    // Also update the selected state
    if (updateLine && line.id) {
      updateLine(line.id, { ...line, selected: true });
    }
  };
  
  // Close the viewer
  const handleCloseViewer = () => {
    setViewingLine(null);
  };

  return (
    <>
      {/* Render existing lines */}
      {lines && lines.length > 0 && lines.map(line => (
        <LineMarker
          key={line.id}
          line={line}
          onClick={handleLineClick}
          selected={selectedLine?.id === line.id}
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

export default PresentationLineLayer;
