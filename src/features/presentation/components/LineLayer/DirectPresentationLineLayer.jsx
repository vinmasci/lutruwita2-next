import React, { useState, useCallback, useEffect, useRef } from 'react'; // Keep only one import
import LineMarker from '../../../lineMarkers/components/LineMarker/LineMarker.jsx';
import { PresentationLineViewer } from '../LineViewer/PresentationLineViewer';
import { getStateFromCoords } from '../../../poi/services/googlePlacesService'; // Import state getter
import { fetchWikipediaSummary } from '../../../wikipedia/services/wikipediaService'; 
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
  // State for place details (renamed)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false); // Renamed
  const [placeDetails, setPlaceDetails] = useState(null); // Renamed
  const currentFetchIdRef = useRef(null); // Ref to track the current fetch operation
  
  // Check if we have lines to render
  if (!lines || lines.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DirectPresentationLineLayer] No lines to render');
    }
    return null;
  }

  // Handle line click with memoized callback to prevent unnecessary re-renders
  const handleLineClick = useCallback(async (line) => {
    console.log('[DirectPresentationLineLayer] Line clicked:', line.id);
    // In presentation mode, we show the line viewer modal
    setViewingLine(line);
    // Also update the selected state
    setSelectedLineId(line.id);

    // Fetch town details and hotels
    if (line?.coordinates?.start) {
      const fetchId = line.id; // Use line ID as the unique identifier for this fetch
      currentFetchIdRef.current = fetchId; // Store the ID of the fetch we are starting

      setIsLoadingDetails(true); // Use renamed state
      setPlaceDetails(null); // Use renamed state

      try {
        // 1. Get state from coordinates
        const stateName = await getStateFromCoords(line.coordinates.start[1], line.coordinates.start[0]);
         console.log('[DirectPresentationLineLayer] Fetched state:', stateName);

         // Clean the line name to remove trailing parentheses content
         const cleanedName = line.name.replace(/\s*\([^)]*\)$/, '').trim();
         
         // 2. Fetch Wikipedia summary using cleaned name and state
         const wikiResult = await fetchWikipediaSummary(cleanedName, stateName);

         console.log('[DirectPresentationLineLayer] Wikipedia info fetched. fetchId:', fetchId, 'currentFetchId:', currentFetchIdRef.current);
        console.log('[DirectPresentationLineLayer] Data before state update:', { wikiResult });
        
        // Only update state if this is still the most recent fetch request
        if (currentFetchIdRef.current === fetchId) {
          console.log('[DirectPresentationLineLayer] Updating state for fetchId:', fetchId);
          // Store name and summary (or fallback)
          setPlaceDetails({ 
            name: line.name, // Use the line name as the title
            summary: wikiResult?.summary || 'No summary found on Wikipedia.' 
          });
        } else {
           console.log('[DirectPresentationLineLayer] Discarding stale fetch results for line:', fetchId);
        }
      } catch (error) {
        console.error('[DirectPresentationLineLayer] Error fetching Wikipedia info:', error); // Updated error message
         // Only clear state if this is still the most recent fetch request
        if (currentFetchIdRef.current === fetchId) {
          console.log('[DirectPresentationLineLayer] Clearing state due to error for fetchId:', fetchId);
          setPlaceDetails(null);
        }
      } finally {
         // Only stop loading if this is still the most recent fetch request
        if (currentFetchIdRef.current === fetchId) {
          setIsLoadingDetails(false); // Use renamed state
        }
      }
    } else {
      // Clear data if line has no start coordinates (or name)
      currentFetchIdRef.current = null; // Clear fetch tracker
      setPlaceDetails(null);
      setIsLoadingDetails(false);
    }
  }, []); // Keep useCallback dependencies empty
  
  // Close the viewer
  const handleCloseViewer = useCallback(() => {
    setViewingLine(null);
    // Optionally deselect the line when closing the viewer
    setSelectedLineId(null);
    // Clear place data when closing
    setPlaceDetails(null);
    setIsLoadingDetails(false);
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
        isLoadingDetails={isLoadingDetails && viewingLine?.id === selectedLineId} // Pass renamed prop
        placeDetails={viewingLine?.id === selectedLineId ? placeDetails : null} // Pass renamed prop
      />
    </>
  );
};

export default DirectPresentationLineLayer;
