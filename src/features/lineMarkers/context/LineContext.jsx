import { createContext, useContext, useState, useCallback } from 'react';
import { useRouteContext } from '../../map/context/RouteContext';
import logger from '../../../utils/logger';

const LineContext = createContext(null);

export const useLineContext = () => {
  const context = useContext(LineContext);
  if (!context) {
    throw new Error('useLineContext must be used within a LineProvider');
  }
  return context;
};

export const LineProvider = ({ children }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState(null);
  const [currentLine, setCurrentLine] = useState(null);
  const [isDrawingInitialized, setIsDrawingInitialized] = useState(false);
  
  // Get access to the RouteContext to notify it of line changes
  let routeContext;
  try {
    routeContext = useRouteContext();
  } catch (error) {
    // This is expected when the LineProvider is used outside of a RouteProvider
    routeContext = null;
  }
  
  // Function to notify RouteContext of line changes
  const notifyLineChange = useCallback(() => {
    if (routeContext) {
      // Mark lines as changed in the RouteContext
      routeContext.setChangedSections(prev => ({...prev, lines: true}));
    }
  }, [routeContext]);
  
  // Function to get lines for route saving
  const getLinesForRoute = useCallback(() => {
    logger.debug('LineContext', 'Getting lines for route saving, total lines:', lines.length);
    
    // Filter out any invalid lines
    const validLines = lines.filter(line => {
      if (!line.id || !line.coordinates || !line.coordinates.start || !line.coordinates.end) {
        logger.warn('LineContext', 'Invalid line:', line.id);
        return false;
      }
      return true;
    });
    
    // Log lines with midpoints for debugging
    const linesWithMidpoints = validLines.filter(line => line.coordinates.mid);
    logger.debug('LineContext', 'Lines with midpoints:', linesWithMidpoints.length);
    if (linesWithMidpoints.length > 0) {
      logger.debug('LineContext', 'Example line with midpoint:', {
        id: linesWithMidpoints[0].id,
        start: linesWithMidpoints[0].coordinates.start,
        mid: linesWithMidpoints[0].coordinates.mid,
        end: linesWithMidpoints[0].coordinates.end
      });
    }
    
    logger.debug('LineContext', 'Valid lines for saving:', validLines.length);
    
    // Check for photos in lines
    const linesWithPhotos = validLines.filter(line => line.photos && line.photos.length > 0);
    logger.debug('LineContext', 'Lines with photos:', linesWithPhotos.length);
    
    if (linesWithPhotos.length > 0) {
      // Log photo details for debugging
      linesWithPhotos.forEach(line => {
        logger.debug('LineContext', `Line ${line.id} has ${line.photos.length} photos`);
        
        // Check if photos have the required properties for Cloudinary upload
        const localPhotos = line.photos.filter(p => p.isLocal === true);
        logger.debug('LineContext', `Line ${line.id} has ${localPhotos.length} local photos that need Cloudinary upload`);
        
        // Check if local photos have the required _blobs.large property
        const validLocalPhotos = localPhotos.filter(p => p._blobs?.large);
        logger.debug('LineContext', `Line ${line.id} has ${validLocalPhotos.length} valid local photos with _blobs.large property`);
        
        if (validLocalPhotos.length !== localPhotos.length) {
          logger.warn('LineContext', `Warning: Line ${line.id} has ${localPhotos.length - validLocalPhotos.length} local photos missing the _blobs.large property needed for Cloudinary upload`);
        }
      });
    }
    
    return validLines;
  }, [lines]);
  
  // Function to save route with lines data
  const saveRoute = useCallback((name, type, isPublic) => {
    if (routeContext && routeContext.saveCurrentState) {
      // Get valid lines to pass to RouteContext
      const lineData = getLinesForRoute();
      // Call saveCurrentState with lines data as parameter
      return routeContext.saveCurrentState(name, type, isPublic, lineData);
    }
    return Promise.reject(new Error('RouteContext not available'));
  }, [routeContext, getLinesForRoute]);

  // Enhanced state management
  const startDrawing = useCallback(() => {
    setIsDrawing(true);
    setIsDrawingInitialized(true);
    setCurrentLine(null);
    setSelectedLine(null);
  }, []);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setIsDrawingInitialized(false);
    setCurrentLine(null);
    setSelectedLine(null);
  }, []);

  // Enhanced addLine with proper state management
  const addLine = useCallback((line) => {
    // First add the line to state
    setLines((prevLines) => [...prevLines, line]);
    // Notify RouteContext of line changes
    notifyLineChange();
    // Then clean up the drawing state after a brief delay to ensure state update completes
    setTimeout(() => {
      stopDrawing();
    }, 0);
  }, [stopDrawing, notifyLineChange]);

  const updateLine = (id, updates) => {
    setLines((prevLines) =>
      prevLines.map((line) =>
        line.id === id ? { ...line, ...updates } : line
      )
    );
    // Notify RouteContext of line changes
    notifyLineChange();
  };

  const deleteLine = (id) => {
    setLines((prevLines) => prevLines.filter((line) => line.id !== id));
    
    // Also remove from RouteContext's loadedLineData if available
    if (routeContext && routeContext.loadedLineData) {
      console.log('[LineContext] Removing line from RouteContext loadedLineData:', id);
      
      // Create a new array without the deleted line
      const updatedLineData = routeContext.loadedLineData.filter(line => line.id !== id);
      
      // Update the loadedLineData directly
      if (Array.isArray(routeContext.loadedLineData)) {
        // Clear the array and add the filtered items
        routeContext.loadedLineData.length = 0;
        updatedLineData.forEach(line => routeContext.loadedLineData.push(line));
        console.log('[LineContext] Updated RouteContext loadedLineData, new length:', routeContext.loadedLineData.length);
      }
    }
    
    // Notify RouteContext of line changes
    notifyLineChange();
  };
  
  // Function to load lines from route
  const loadLinesFromRoute = useCallback((routeLines) => {
    logger.debug('LineContext', 'loadLinesFromRoute function called');
    logger.debug('LineContext', 'Provider structure: RouteProvider → LineProvider → RouteContent');
    
    if (!routeLines) {
      logger.debug('LineContext', 'No lines to load from route');
      return;
    }
    
    logger.debug('LineContext', 'Loading lines from route:', routeLines.length);
    
    // Validate line data structure
    const validLines = routeLines.filter(line => {
      if (!line.id || !line.coordinates || !line.coordinates.start || !line.coordinates.end) {
        logger.warn('LineContext', 'Invalid line data structure:', line);
        return false;
      }
      
      // Removed midpoint logging to reduce console output
      
      return true;
    });
    
    logger.debug('LineContext', 'Valid lines count:', validLines.length);
    
    // Process photos in lines if present
    const processedLines = validLines.map(line => {
      // If line has no photos, return it as is
      if (!line.photos || !Array.isArray(line.photos) || line.photos.length === 0) {
        return line;
      }
      
      logger.debug('LineContext', `Processing photos for line ${line.id}, found ${line.photos.length} photos`);
      
      // Process each photo to ensure it has the correct structure
      const processedPhotos = line.photos.map(photo => {
        // If it's already a properly formatted photo object with _blobs, keep it as is
        if (photo._blobs?.large) {
          return photo;
        }
        
        // If it's a Cloudinary photo (has url properties), keep it as is
        if (photo.url || photo.thumbnailUrl || photo.largeUrl || photo.mediumUrl) {
          return photo;
        }
        
        // If it's a File object, format it properly
        if (photo instanceof File) {
          return {
            id: photo.id || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: photo.name,
            file: photo,
            isLocal: true,
            _blobs: {
              large: photo,
              original: photo
            },
            dateAdded: photo.dateAdded || new Date().toISOString(),
            size: photo.size,
            type: photo.type
          };
        }
        
        // For any other format, return as is (will be handled by the display logic)
        return photo;
      });
      
      // Return the line with processed photos
      return {
        ...line,
        photos: processedPhotos
      };
    });
    
    // IMPORTANT FIX: Merge loaded lines with existing lines instead of replacing them
    setLines(prevLines => {
      // Create a map of existing line IDs for quick lookup
      const existingLineIds = new Map(prevLines.map(line => [line.id, true]));
      
      // Filter out any loaded lines that already exist in the current state
      const newLines = processedLines.filter(line => !existingLineIds.has(line.id));
      
      logger.debug('LineContext', `Merging ${newLines.length} new lines with ${prevLines.length} existing lines`);
      
      // Return the combined array of existing lines plus new lines
      return [...prevLines, ...newLines];
    });
    
    logger.debug('LineContext', 'Lines loaded and merged successfully');
  }, []);

  return (
    <LineContext.Provider
      value={{
        isDrawing,
        setIsDrawing,
        lines,
        addLine,
        updateLine,
        deleteLine,
        selectedLine,
        setSelectedLine,
        currentLine,
        setCurrentLine,
        startDrawing,
        stopDrawing,
        isDrawingInitialized,
        getLinesForRoute,
        loadLinesFromRoute,
        saveRoute,
        updateLineCoordinates: useCallback((id, coordinates) => {
          setLines(prevLines =>
            prevLines.map(line =>
              line.id === id ? { ...line, coordinates } : line
            )
          );
          // Notify RouteContext of line changes
          notifyLineChange();
        }, [notifyLineChange])
      }}
    >
      {children}
    </LineContext.Provider>
  );
};
