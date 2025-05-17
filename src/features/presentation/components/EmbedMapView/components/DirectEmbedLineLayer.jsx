import React, { useState, useCallback, useEffect, useRef } from 'react'; // Keep only one import
import LineMarker from '../../../../lineMarkers/components/LineMarker/LineMarker.jsx';
import { PresentationLineViewer } from '../../LineViewer/PresentationLineViewer';
import { getStateFromCoords } from '../../../../poi/services/googlePlacesService'; // Import state getter
import { fetchWikipediaSummary } from '../../../../wikipedia/services/wikipediaService'; 
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
  // Only log on first render or when lines change
  useEffect(() => {
    console.log('[DirectEmbedLineLayer] Rendering with map:', !!map);
    console.log('[DirectEmbedLineLayer] Lines from props:', { 
      linesCount: lines?.length || 0
    });
  }, [map, lines?.length]);
  
  // Reference to track if we've registered the style.load event listener
  const styleLoadListenerRef = useRef(false);
  
  // State to force re-render when map style changes
  const [forceUpdate, setForceUpdate] = useState(false);
  
  // Listen for map style changes to ensure lines are preserved
  useEffect(() => {
    if (!map || styleLoadListenerRef.current) return;
    
    const handleStyleLoad = () => {
      console.log('[DirectEmbedLineLayer] Map style changed, ensuring lines are preserved');
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
  if (!(lines && lines.length > 0)) {
    // Only log this message once on mount or when lines change
    useEffect(() => {
      console.log('[DirectEmbedLineLayer] No lines to render');
    }, [lines?.length]);
    return null;
  }
  
  // Log detailed line data only in development mode and only when lines change
  useEffect(() => {
    if (lines && lines.length > 0) {
      console.log('[DirectEmbedLineLayer] First line data:', JSON.stringify(lines[0], null, 2));
      console.log('[DirectEmbedLineLayer] Line name:', lines[0].name);
      console.log('[DirectEmbedLineLayer] Line coordinates:', lines[0].coordinates);
      console.log('[DirectEmbedLineLayer] Line icons:', lines[0].icons);
    }
  }, [lines]);

  // Handle line click with memoized callback to prevent unnecessary re-renders
  const handleLineClick = useCallback(async (line) => {
    console.log('[DirectEmbedLineLayer] Line clicked:', line.id);
    // In embed mode, we show the line viewer modal
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
         console.log('[DirectEmbedLineLayer] Fetched state:', stateName);

         // Clean the line name to remove trailing parentheses content
         const cleanedName = line.name.replace(/\s*\([^)]*\)$/, '').trim();
         
         // 2. Fetch Wikipedia summary using cleaned name and state
         const wikiResult = await fetchWikipediaSummary(cleanedName, stateName);

         console.log('[DirectEmbedLineLayer] Wikipedia info fetched. fetchId:', fetchId, 'currentFetchId:', currentFetchIdRef.current);
        console.log('[DirectEmbedLineLayer] Data before state update:', { wikiResult });

        // Only update state if this is still the most recent fetch request
        if (currentFetchIdRef.current === fetchId) {
          console.log('[DirectEmbedLineLayer] Updating state for fetchId:', fetchId);
           // Store name and summary (or fallback)
          setPlaceDetails({ 
            name: line.name, // Use the line name as the title
            summary: wikiResult?.summary || 'No summary found on Wikipedia.' 
          });
        } else {
           console.log('[DirectEmbedLineLayer] Discarding stale fetch results for line:', fetchId);
        }
      } catch (error) {
        console.error('[DirectEmbedLineLayer] Error fetching Wikipedia info:', error); // Updated error message
         // Only clear state if this is still the most recent fetch request
        if (currentFetchIdRef.current === fetchId) {
          console.log('[DirectEmbedLineLayer] Clearing state due to error for fetchId:', fetchId);
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
        isLoadingDetails={isLoadingDetails && viewingLine?.id === selectedLineId} // Pass renamed prop
        placeDetails={viewingLine?.id === selectedLineId ? placeDetails : null} // Pass renamed prop
      />
    </>
  );
};

export default DirectEmbedLineLayer;
