import React, { useState, useCallback, useEffect, useRef } from 'react';
import LineMarker from '../../../lineMarkers/components/LineMarker/LineMarker.jsx';
import { PresentationLineViewer } from '../LineViewer/PresentationLineViewer';
import './DirectPresentationLineLayer.css';

/**
 * DirectPresentationLineLayer component
 * 
 * A simplified version that takes line data directly as props instead of using context.
 * This bypasses the context hierarchy issues.
 * 
 * @param {Object} props
 * @param {Object} props.map - The Mapbox map instance
 * @param {Array} props.lines - The line data to render
 */
const DirectPresentationLineLayer = ({ map, lines = [] }) => {
  // Reduce logging in presentation mode to improve performance
  if (process.env.NODE_ENV === 'development') {
    console.log('[DirectPresentationLineLayer] Rendering with map:', !!map);
    console.log('[DirectPresentationLineLayer] Lines from props:', { 
      linesCount: lines?.length || 0
    });
  }
  
  // Reference to track if we've registered the style.load event listener
  const styleLoadListenerRef = useRef(false);
  
  // State to force re-render when map style changes
  const [forceUpdate, setForceUpdate] = useState(false);
  
  // Listen for map style changes to ensure lines are preserved
  useEffect(() => {
    if (!map || styleLoadListenerRef.current) return;
    
    const handleStyleLoad = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DirectPresentationLineLayer] Map style changed, ensuring lines are preserved');
      }
      // Force a re-render by updating a state variable
      // This will cause LineMarker components to recreate their layers
      setForceUpdate(prev => !prev);
    };
    
    map.on('style.load', handleStyleLoad);
    styleLoadListenerRef.current = true;
    
    return () => {
      map.off('style.load', handleStyleLoad);
      styleLoadListenerRef.current = false;
    };
  }, [map]);
  
  // Track selected line for UI state
  const [selectedLineId, setSelectedLineId] = useState(null);
  // Track the line being viewed in the modal
  const [viewingLine, setViewingLine] = useState(null);
  
  // Check if we have lines to render
  if (!lines || lines.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DirectPresentationLineLayer] No lines to render');
    }
    return null;
  }

  // Handle line click with memoized callback to prevent unnecessary re-renders
  const handleLineClick = useCallback((line) => {
    console.log('[DirectPresentationLineLayer] Line clicked:', line.id);
    // In presentation mode, we show the line viewer modal
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
      // Ensure coordinates are properly structured
      coordinates: line.coordinates || { start: [0, 0], end: [0, 0] },
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

export default DirectPresentationLineLayer;
