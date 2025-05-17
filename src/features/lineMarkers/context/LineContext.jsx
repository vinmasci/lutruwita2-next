import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useRouteContext } from '../../map/context/RouteContext';
import logger from '../../../utils/logger';
import { autoSaveLinesToFirebase } from '../../../services/firebaseLineAutoSaveService';
import { useAuth0 } from '@auth0/auth0-react';
import { useAutoSave } from '../../../context/AutoSaveContext';

// Create a global registry for contexts if it doesn't exist
if (typeof window !== 'undefined' && !window.__contextRegistry) {
  window.__contextRegistry = {};
}

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
  
  // Track line changes locally if routeContext is not available
  const [localLineChanges, setLocalLineChanges] = useState(false);
  
  // Flag to track if we're currently in a clearing operation
  const [isClearing, setIsClearing] = useState(false);
  
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
    logger.debug('LineContext', 'notifyLineChange called, routeContext available:', !!routeContext);
    
    // Always set local changes flag
    setLocalLineChanges(true);
    
    if (routeContext) {
      // Mark lines as changed in the RouteContext
      logger.debug('LineContext', 'Setting lines flag in changedSections');
      try {
        routeContext.setChangedSections(prev => {
          const newState = {...prev, lines: true};
          logger.debug('LineContext', 'New changedSections state:', newState);
          return newState;
        });
      } catch (error) {
        logger.error('LineContext', 'Error setting changedSections:', error);
      }
    } else {
      logger.warn('LineContext', 'routeContext not available or missing setChangedSections, tracking changes locally');
    }
  }, [routeContext]);
  
  // Expose whether there are line changes
  const hasLineChanges = useCallback(() => {
    // Check local changes first
    if (localLineChanges) return true;
    
    // If routeContext is available, check its changedSections
    if (routeContext && routeContext.changedSectionsRef && routeContext.changedSectionsRef.current) {
      return !!routeContext.changedSectionsRef.current.lines;
    }
    
    return false;
  }, [localLineChanges, routeContext]);
  
  // Clear line changes
  const clearLineChanges = useCallback(() => {
    logger.debug('LineContext', 'Clearing line changes');
    setLocalLineChanges(false);
    
    // Also clear in routeContext if available
    if (routeContext && routeContext.setChangedSections) {
      routeContext.setChangedSections(prev => {
        const newState = {...prev};
        delete newState.lines;
        return newState;
      });
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
  const saveRoute = useCallback((name, type, isPublic, eventDate) => {
    if (routeContext && routeContext.saveCurrentState) {
      // Get valid lines to pass to RouteContext
      const lineData = getLinesForRoute();
      // Call saveCurrentState with lines data as parameter
      return routeContext.saveCurrentState(name, type, isPublic, lineData, eventDate);
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

  // Get the current user ID for auto-save
  const { user } = useAuth0();
  const userId = user?.sub;
  const autoSave = useAutoSave(); // Get AutoSave context
  
  // Debounce timer for auto-save
  const autoSaveTimerRef = useRef(null);
  // Flag to track if we're currently drawing
  const isDrawingRef = useRef(isDrawing);
  
  // Keep isDrawingRef in sync with isDrawing state
  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  // Auto-save lines to Firebase when they change, with debounce
  useEffect(() => {
    // Check if we're in presentation mode by looking at the URL
    const isPresentationMode = window.location.pathname.includes('/presentation/') || 
                              window.location.pathname.includes('/preview/') ||
                              window.location.pathname.includes('/route/');
    
    // Skip auto-save if in presentation mode
    if (isPresentationMode) {
      logger.debug('LineContext', 'Skipping auto-save - in presentation mode');
      return;
    }
    
    // Skip auto-save if there are no lines or no user
    if (!lines.length || !userId) return;
    
    // Skip auto-save if we're currently drawing
    if (isDrawingRef.current || currentLine) {
      logger.debug('LineContext', 'Skipping auto-save while drawing is in progress');
      return;
    }
    
    // Skip auto-save if no route is available
    const route = routeContext?.currentRoute;
    if (!route) {
      logger.debug('LineContext', 'Skipping auto-save - no route available');
      return;
    }

    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set a new timer for debounced auto-save (1 second delay)
    autoSaveTimerRef.current = setTimeout(() => {
      logger.debug('LineContext', 'Auto-saving lines to Firebase (debounced):', {
        linesCount: lines.length,
        userId,
        routeAvailable: !!route,
        loadedPermanentRouteId: autoSave?.loadedPermanentRouteId
      });
      
      // Auto-save lines to Firebase
      const loadedPermanentRouteId = autoSave?.loadedPermanentRouteId || null;
      autoSaveLinesToFirebase(lines, route, userId, autoSave, loadedPermanentRouteId)
        .then(autoSaveId => {
          if (autoSaveId) {
            logger.debug('LineContext', 'Lines auto-saved successfully with ID:', autoSaveId);
          } else {
            logger.warn('LineContext', 'Lines auto-save did not return an ID');
          }
        })
        .catch(error => {
          logger.error('LineContext', 'Error auto-saving lines:', error);
        });
    }, 1000); // 1 second debounce
    
    // Cleanup timer on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [lines, userId, routeContext?.currentRoute, currentLine]);

  // Enhanced addLine with proper state management
  const addLine = useCallback((line) => {
    // First add the line to state
    setLines((prevLines) => [...prevLines, line]);
    // Notify RouteContext of line changes
    notifyLineChange();
    // Then clean up the drawing state after a brief delay to ensure state update completes
    setTimeout(() => {
      stopDrawing();
      
      // Trigger an immediate auto-save after adding a line
      if (userId && line) {
        const route = routeContext?.currentRoute;
        logger.debug('LineContext', 'Triggering immediate auto-save after adding line:', line.id);
        
        // Use the updated lines array that includes the new line
        const loadedPermanentRouteId = autoSave?.loadedPermanentRouteId || null;
        autoSaveLinesToFirebase([...lines, line], route, userId, autoSave, loadedPermanentRouteId)
          .then(autoSaveId => {
            if (autoSaveId) {
              logger.debug('LineContext', 'Line auto-saved successfully after add with ID:', autoSaveId);
            }
          })
          .catch(error => {
            logger.error('LineContext', 'Error auto-saving line after add:', error);
          });
      }
    }, 0);
  }, [stopDrawing, notifyLineChange, lines, userId, routeContext?.currentRoute]);

  const updateLine = useCallback((id, updates) => {
    let updatedLine = null;
    
    setLines((prevLines) => {
      const newLines = prevLines.map((line) => {
        if (line.id === id) {
          updatedLine = { ...line, ...updates };
          return updatedLine;
        }
        return line;
      });
      return newLines;
    });
    
    // Notify RouteContext of line changes
    notifyLineChange();
    
    // Trigger an immediate auto-save after updating a line
    setTimeout(() => {
      if (userId && updatedLine) {
        const route = routeContext?.currentRoute;
        logger.debug('LineContext', 'Triggering immediate auto-save after updating line:', id);
        
        // Get the current lines state which includes the updated line
        const currentLines = lines.map(line => 
          line.id === id ? { ...line, ...updates } : line
        );
        
        const loadedPermanentRouteId = autoSave?.loadedPermanentRouteId || null;
        autoSaveLinesToFirebase(currentLines, route, userId, autoSave, loadedPermanentRouteId)
          .then(autoSaveId => {
            if (autoSaveId) {
              logger.debug('LineContext', 'Line auto-saved successfully after update with ID:', autoSaveId);
            }
          })
          .catch(error => {
            logger.error('LineContext', 'Error auto-saving line after update:', error);
          });
      }
    }, 0);
  }, [notifyLineChange, lines, userId, routeContext?.currentRoute]);

  const deleteLine = useCallback((id) => {
    // Store the filtered lines for auto-save
    let filteredLines = [];
    
    setLines((prevLines) => {
      filteredLines = prevLines.filter((line) => line.id !== id);
      return filteredLines;
    });
    
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
    
    // Trigger an immediate auto-save after deleting a line
    setTimeout(() => {
      if (userId) {
        const route = routeContext?.currentRoute;
        logger.debug('LineContext', 'Triggering immediate auto-save after deleting line:', id);
        
        const loadedPermanentRouteId = autoSave?.loadedPermanentRouteId || null;
        autoSaveLinesToFirebase(filteredLines, route, userId, autoSave, loadedPermanentRouteId)
          .then(autoSaveId => {
            if (autoSaveId) {
              logger.debug('LineContext', 'Line auto-saved successfully after delete with ID:', autoSaveId);
            }
          })
          .catch(error => {
            logger.error('LineContext', 'Error auto-saving line after delete:', error);
          });
      }
    }, 0);
  }, [routeContext, notifyLineChange, userId]);
  
  // Function to clear all lines
  const clearLines = useCallback(() => {
    logger.debug('LineContext', 'Clearing all lines');
    
    // Set the clearing flag to prevent auto-save during clearing
    setIsClearing(true);
    
    // Set the global force cleanup flag to bypass conditional cleanup logic in LineMarker
    if (typeof window !== 'undefined') {
      logger.debug('LineContext', 'Setting global force cleanup flag');
      window.__forceLineCleanup = true;
    }
    
    // Clear the lines state
    setLines([]);
    
    // Clear any selected or current line
    setSelectedLine(null);
    setCurrentLine(null);
    
    // Reset drawing state
    setIsDrawing(false);
    setIsDrawingInitialized(false);
    
    // Clear line changes
    clearLineChanges();
    
    // Perform extremely aggressive DOM cleanup for line markers
    try {
      logger.debug('LineContext', 'Performing extremely aggressive DOM cleanup for line markers');
      
      // Find and remove all mapboxgl-marker elements that might be related to lines
      const mapboxMarkers = document.querySelectorAll('.mapboxgl-marker');
      if (mapboxMarkers && mapboxMarkers.length > 0) {
        logger.debug('LineContext', `Found ${mapboxMarkers.length} mapboxgl-marker elements to check`);
        
        mapboxMarkers.forEach(marker => {
          try {
            // Check if this marker contains a line-marker element or has a line-related class
            // Also check for line-text-container and line-icons-container
            if (marker.querySelector('.line-marker') || 
                marker.querySelector('.line-text-container') ||
                marker.querySelector('.line-icons-container') ||
                marker.querySelector('.line-text-label') ||
                marker.classList.contains('line-marker') || 
                marker.classList.contains('line')) {
              logger.debug('LineContext', 'Removing mapboxgl-marker containing line-marker or line-related elements');
              marker.remove();
            }
          } catch (error) {
            logger.warn('LineContext', 'Error checking/removing mapboxgl-marker:', error);
          }
        });
      }
      
      // Also try to remove any remaining line-marker elements directly
      const lineElements = document.querySelectorAll('.line-marker, .line-icon, .mapboxgl-marker.line, .line-text-container, .line-icons-container, .line-text-label');
      if (lineElements && lineElements.length > 0) {
        logger.debug('LineContext', `Found ${lineElements.length} line elements to remove directly`);
        
        lineElements.forEach(element => {
          try {
            // Try to get the parent mapboxgl-marker element
            const markerParent = element.closest('.mapboxgl-marker');
            if (markerParent) {
              markerParent.remove();
            } else {
              // If we can't find the parent, remove the element itself
              element.remove();
            }
          } catch (error) {
            logger.warn('LineContext', 'Error removing line element:', error);
          }
        });
      }
      
      // Try to remove line layers and sources from the map if we have access to it
      try {
        // Get the map from the window object if available
        const map = window.mapInstance || (window.mapboxgl && window.mapboxgl.map);
        
        if (map && typeof map.getStyle === 'function') {
          const style = map.getStyle();
          if (style && style.layers) {
            // Find ALL layers that might be related to lines
            const lineLayerPatterns = [
              'line-', // Matches any layer starting with 'line-'
              '-line', // Matches any layer ending with '-line'
              '-shadow', // Matches shadow layers
              'circle-', // Matches circle layers for line markers
              'inner-circle-', // Matches inner circle layers
              '-extrusion', // Matches any extrusion layers
              '-glow' // Matches any glow layers
            ];
            
            // Get all layers that match any of the patterns
            const allLineLayers = style.layers
              .filter(layer => {
                return lineLayerPatterns.some(pattern => layer.id.includes(pattern));
              })
              .map(layer => layer.id);
            
            logger.debug('LineContext', `Found ${allLineLayers.length} potential line-related layers to remove`);
            
            // Remove all line-related layers
            allLineLayers.forEach(layerId => {
              try {
                if (map.getLayer(layerId)) {
                  logger.debug('LineContext', `Removing layer: ${layerId}`);
                  map.removeLayer(layerId);
                }
              } catch (error) {
                logger.warn('LineContext', `Error removing layer ${layerId}:`, error);
              }
            });
            
            // Find and remove all line-related sources
            const lineSourcePatterns = [
              'line-', // Matches any source starting with 'line-'
              '-line', // Matches any source ending with '-line'
              'circle-source-' // Matches circle sources for line markers
            ];
            
            // Get all sources that match any of the patterns
            const allLineSources = Object.keys(style.sources || {})
              .filter(sourceId => {
                return lineSourcePatterns.some(pattern => sourceId.includes(pattern));
              });
            
            logger.debug('LineContext', `Found ${allLineSources.length} potential line-related sources to remove`);
            
            // Remove all line-related sources
            allLineSources.forEach(sourceId => {
              try {
                if (map.getSource(sourceId)) {
                  logger.debug('LineContext', `Removing source: ${sourceId}`);
                  map.removeSource(sourceId);
                }
              } catch (error) {
                logger.warn('LineContext', `Error removing source ${sourceId}:`, error);
              }
            });
          }
        }
      } catch (error) {
        logger.warn('LineContext', 'Error removing line layers and sources:', error);
      }
      
      logger.debug('LineContext', 'Extremely aggressive DOM cleanup for line markers completed');
    } catch (error) {
      logger.error('LineContext', 'Error during extremely aggressive DOM cleanup for line markers:', error);
    }
    
    // Reset the clearing flag and force cleanup flag after a short delay
    setTimeout(() => {
      setIsClearing(false);
      
      // Reset the global force cleanup flag
      if (typeof window !== 'undefined') {
        logger.debug('LineContext', 'Resetting global force cleanup flag');
        window.__forceLineCleanup = false;
      }
      
      logger.debug('LineContext', 'Lines cleared successfully');
    }, 100);
    
    return true;
  }, [clearLineChanges]);
  
  // Register the clearLines function with the global registry
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create a context instance with the clearLines function
      const contextInstance = { clearLines };
      
      // Register the context instance
      window.__contextRegistry = window.__contextRegistry || {};
      window.__contextRegistry.LineContext = contextInstance;
      
      logger.debug('LineContext', 'Registered clearLines function with global registry');
      
      // Clean up when unmounted
      return () => {
        if (window.__contextRegistry && window.__contextRegistry.LineContext) {
          delete window.__contextRegistry.LineContext;
          logger.debug('LineContext', 'Unregistered from global registry');
        }
      };
    }
  }, [clearLines]);
  
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
        }, [notifyLineChange]),
        // Explicitly expose change tracking functions
        hasLineChanges,
        clearLineChanges,
        localLineChanges,
        // Expose the clearLines function
        clearLines
      }}
    >
      {children}
    </LineContext.Provider>
  );
};
