/**
 * Firebase Line Auto-Save Service
 * 
 * This service handles automatically saving line data to Firebase when lines are added, updated, or removed.
 * It works in conjunction with the firebaseGpxAutoSaveService to ensure all route data is persisted.
 */

import { db } from './firebaseService';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { autoSaveGpxToFirebase, firebaseAutoSaveStatus } from './firebaseGpxAutoSaveService';

// Import AutoSaveContext - will be used if available
let useAutoSave = null;
try {
  // Dynamic import to avoid circular dependencies
  const AutoSaveModule = require('../context/AutoSaveContext');
  useAutoSave = AutoSaveModule.useAutoSave;
} catch (error) {
  console.log('[firebaseLineAutoSaveService] AutoSaveContext not available, will use local state only');
}

// Global state to track Firebase Line auto-save status
export const firebaseLineAutoSaveStatus = {
  isLoading: false,
  lastSavedLine: null,
  lastSaveTime: null,
  success: false,
  error: null,
  autoSaveId: null // Add autoSaveId to track the current auto-save
};

/**
 * Auto-save lines to Firebase
 * @param {Array} lines - The lines data from LineContext
 * @param {Object} processedRoute - The processed route data (can be null if not available)
 * @param {string} userId - The ID of the current user
 * @param {Object} autoSaveContext - Optional AutoSaveContext from a component (if not using the hook)
 * @param {string} loadedPermanentRouteId - Optional ID of a loaded permanent route
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
export const autoSaveLinesToFirebase = async (lines, processedRoute, userId, autoSaveContext = null, loadedPermanentRouteId = null) => {
  try {
    console.log('=================================================================');
    console.log('🔍🔍🔍 ENTERING autoSaveLinesToFirebase 🔍🔍🔍');
    console.log('Input lines array type:', typeof lines);
    console.log('Input lines array:', lines);
    console.log('Input lines is array:', Array.isArray(lines));
    console.log('Input lines length:', lines?.length || 0);
    if (lines && lines.length > 0) {
      console.log('First line:', lines[0]);
    }
    console.log('=================================================================');
    
    // Get AutoSaveContext if available
    let autoSave = autoSaveContext;
    
    // If not provided directly, try to use the hook
    if (!autoSave && typeof window !== 'undefined') {
      try {
        // This will only work if called from a component within the AutoSaveProvider
        if (useAutoSave) {
          autoSave = useAutoSave(); // This gets the whole context
        }
      } catch (error) {
        console.log('[firebaseLineAutoSaveService] Could not access AutoSaveContext via hook:', error.message);
      }
    }

    // Prefer loadedPermanentRouteId from parameter, then from context
    const currentLoadedPermanentRouteId = loadedPermanentRouteId || autoSave?.loadedPermanentRouteId || null;
    
    // Update loading status in both places
    firebaseLineAutoSaveStatus.isLoading = true;
    firebaseLineAutoSaveStatus.lastSavedLine = lines?.length > 0 ? lines[0].id : null;
    firebaseLineAutoSaveStatus.error = null;
    
    // Also update the global context if available
    if (autoSave && autoSave.startAutoSave) {
      autoSave.startAutoSave();
    }
    
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE AUTO-SAVING LINE DATA ${processedRoute ? `FOR ROUTE: ${processedRoute.routeId}` : '(NO ROUTE AVAILABLE)'} 🔄🔄🔄`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING AUTO-SAVE ❌❌❌');
      console.log('=================================================================');
      
      firebaseLineAutoSaveStatus.isLoading = false;
      firebaseLineAutoSaveStatus.error = 'Firebase not initialized';
      firebaseLineAutoSaveStatus.success = false;
      return null;
    }
    
    console.log('FIREBASE DB IS INITIALIZED, PROCEEDING WITH AUTO-SAVE');
    
    // Start timing
    const startTime = performance.now();
    
    // Check if we have a route
    if (!processedRoute) {
      console.log('=================================================================');
      console.log('❌❌❌ NO ROUTE PROVIDED, CHECKING FOR EXISTING AUTO-SAVE ❌❌❌');
      console.log('=================================================================');
      
      // Try to find the most recent auto-save for this user
      // First check the global context if available
      let autoSaveIdToUse = null;

      if (currentLoadedPermanentRouteId) {
        autoSaveIdToUse = currentLoadedPermanentRouteId;
        console.log('[firebaseLineAutoSaveService] No route, but permanent route loaded. Using permanent ID for Lines:', autoSaveIdToUse);
      } else if (autoSave && autoSave.autoSaveId) {
        console.log('[firebaseLineAutoSaveService] No route, using auto-save ID from global context for Lines:', autoSave.autoSaveId);
        autoSaveIdToUse = autoSave.autoSaveId;
      } else {
        // Fallback: find most recent temporary auto-save if no permanent one is active
        autoSaveIdToUse = await findMostRecentAutoSaveForUser(userId); // This specifically queries gpx_auto_saves
      }
      
      if (!autoSaveIdToUse) {
        console.log('=================================================================');
        console.log('❌❌❌ NO EXISTING AUTO-SAVE (PERMANENT OR TEMPORARY) FOUND, CANNOT SAVE LINES ❌❌❌');
        console.log('=================================================================');
        return null;
      }
      
      console.log(`Found auto-save ID to use for Lines (no route context): ${autoSaveIdToUse}`);
      
      // Save Lines to the determined auto-save (could be permanent or temporary)
      return await saveLinesToExistingAutoSave(autoSaveIdToUse, lines, null, autoSave, startTime, currentLoadedPermanentRouteId);
    }
    
    // If processedRoute exists, determine the autoSaveId to use
    let autoSaveIdToUse = null;

    if (currentLoadedPermanentRouteId) {
      autoSaveIdToUse = currentLoadedPermanentRouteId;
      console.log('[firebaseLineAutoSaveService] Permanent route loaded. Using permanent ID for Lines:', autoSaveIdToUse);
    } else if (autoSave && autoSave.autoSaveId) {
      console.log('[firebaseLineAutoSaveService] Using auto-save ID from global context for Lines:', autoSave.autoSaveId);
      autoSaveIdToUse = autoSave.autoSaveId;
    } else if (firebaseLineAutoSaveStatus.autoSaveId) {
      autoSaveIdToUse = firebaseLineAutoSaveStatus.autoSaveId;
    } else if (firebaseAutoSaveStatus.autoSaveId) {
      autoSaveIdToUse = firebaseAutoSaveStatus.autoSaveId;
    } else {
      // Fallback if no specific permanent ID is active and no temporary ID is in context/status
      autoSaveIdToUse = await findAutoSaveIdForRoute(processedRoute.routeId, userId); // This queries gpx_auto_saves
    }
    
    if (!autoSaveIdToUse && !currentLoadedPermanentRouteId) { // Only create new if no permanent and no existing temporary
      console.log('=================================================================');
      console.log('❌❌❌ NO EXISTING AUTO-SAVE (PERMANENT OR TEMPORARY) FOUND FOR ROUTE, CREATING NEW TEMPORARY AUTO-SAVE ❌❌❌');
      console.log('=================================================================');
      
      // Create a new temporary auto-save with the lines included
      const newProcessedRouteWithLines = {
        ...processedRoute,
        lines // Add current lines to the new route data
      };
      
      // Pass the autoSave context and loadedPermanentRouteId (which should be null here)
      return await autoSaveGpxToFirebase(
        newProcessedRouteWithLines,
        userId,
        processedRoute.gpxFileName || 'unknown.gpx',
        autoSave,
        null, // existingAutoSaveId for gpx_auto_saves (null because we're creating new)
        null  // loadedPermanentRouteId (null because we're creating a new temporary save)
      );
    } else if (!autoSaveIdToUse && currentLoadedPermanentRouteId) {
        console.error(`[firebaseLineAutoSaveService] Have loadedPermanentRouteId ${currentLoadedPermanentRouteId} but no autoSaveIdToUse. This indicates an issue.`);
        return null;
    }
    
    console.log(`Using auto-save ID for Lines: ${autoSaveIdToUse}`);
    
    // Save Lines to the existing auto-save (could be permanent or temporary)
    return await saveLinesToExistingAutoSave(autoSaveIdToUse, lines, processedRoute, autoSave, startTime, currentLoadedPermanentRouteId);
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR AUTO-SAVING LINE DATA ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    
    // Update status in both places
    firebaseLineAutoSaveStatus.isLoading = false;
    firebaseLineAutoSaveStatus.success = false;
    firebaseLineAutoSaveStatus.error = error.message;
    
    // Also update the global context if available
    if (autoSave && autoSave.setAutoSaveError) {
      autoSave.setAutoSaveError(error);
    }
    return null;
  }
};

/**
 * Save lines to an existing auto-save
 * @param {string} autoSaveId - The ID of the auto-save
 * @param {Array} lines - The lines data
 * @param {Object} processedRoute - The processed route data (optional)
 * @param {Object} autoSave - The AutoSaveContext (optional)
 * @param {number} startTime - The start time for performance measurement
 * @param {string|null} loadedPermanentRouteId - The ID of the loaded permanent route, if any.
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
const saveLinesToExistingAutoSave = async (autoSaveId, lines, processedRoute = null, autoSave = null, startTime = null, loadedPermanentRouteId = null) => {
  try {
    console.log('=================================================================');
    console.log('🔍🔍🔍 DETAILED LINE DATA INSPECTION 🔍🔍🔍');
    console.log('Raw lines array type:', typeof lines);
    console.log('Raw lines array:', lines);
    console.log('lines is array:', Array.isArray(lines));
    console.log('lines length:', lines?.length || 0);
    if (lines && lines.length > 0) {
      console.log('First line:', lines[0]);
    }
    console.log('=================================================================');
    
    console.log('Saving lines data:', { 
      linesCount: lines?.length || 0
    });
    
    // Process lines to ensure they match the MongoDB structure
    // First ensure lines is an array
    const validLines = Array.isArray(lines) ? lines : [];
    
    console.log('Valid lines array after check:', {
      isArray: Array.isArray(validLines),
      length: validLines.length
    });
    
    // Process each line to ensure it has the correct structure
    const processedLines = validLines.map(line => {
      // Create a copy of the line to avoid modifying the original
      const lineCopy = { ...line };
      
      // Process photos if present
      if (lineCopy.photos && Array.isArray(lineCopy.photos)) {
        lineCopy.photos = lineCopy.photos.map(photo => {
          // Create a copy of the photo to avoid modifying the original
          const photoCopy = { ...photo };
          
          // Remove any large binary data that shouldn't be stored in Firestore
          if (photoCopy._blobs) {
            delete photoCopy._blobs;
          }
          
          // If it's a local photo, ensure it has the necessary properties
          if (photoCopy.isLocal) {
            // Keep only essential properties
            return {
              id: photoCopy.id,
              name: photoCopy.name || 'Unnamed Photo',
              caption: photoCopy.caption || photoCopy.name || 'Unnamed Photo',
              isLocal: true,
              dateAdded: photoCopy.dateAdded || new Date().toISOString(),
              url: photoCopy.url || null
            };
          }
          
          return photoCopy;
        });
      }
      
      return lineCopy;
    });
    
    console.log('Processed lines structure:', {
      linesCount: processedLines.length,
      firstLine: processedLines.length > 0 ? JSON.stringify(processedLines[0]) : 'none'
    });
    
    // Log the line data being saved
    console.log('=================================================================');
    console.log('📝📝📝 LINE DATA BEING SAVED TO FIREBASE 📝📝📝');
    console.log('Auto-save ID:', autoSaveId);
    console.log('Line data structure:', {
      linesCount: processedLines.length,
      firstLine: processedLines.length > 0 ? processedLines[0] : null
    });
    console.log('=================================================================');
    
    // Determine target collection based on whether a permanent route is loaded
    const targetCollectionName = loadedPermanentRouteId ? 'user_saved_routes' : 'gpx_auto_saves';

    // Create the document reference
    const linesRef = doc(db, targetCollectionName, autoSaveId, 'data', 'lines');
    console.log('Firebase Line document path:', linesRef.path);
    
    try {
      // Save the data to Firebase.
      // Similar to POIs, if it's a permanent route, lines are typically replaced.
      // The main autoSaveGpxToFirebase handles the comprehensive merging/replacing.
      await setDoc(linesRef, { data: processedLines });
      console.log('Lines data saved successfully to Firebase');
      
      // Verify the data was saved by reading it back
      try {
        const savedDoc = await getDoc(linesRef);
        if (savedDoc.exists()) {
          const savedData = savedDoc.data();
          console.log('=================================================================');
          console.log('✅✅✅ VERIFIED LINE DATA IN FIREBASE ✅✅✅');
          console.log('Saved data structure:', {
            hasData: !!savedData.data,
            linesCount: savedData.data?.length || 0,
            firstLine: savedData.data?.length > 0 ? savedData.data[0].id : null
          });
          console.log('=================================================================');
        } else {
          console.log('=================================================================');
          console.log('❌❌❌ VERIFICATION FAILED - DOCUMENT DOES NOT EXIST ❌❌❌');
          console.log('=================================================================');
        }
      } catch (verifyError) {
        console.error('Error verifying saved line data:', verifyError);
      }
    } catch (saveError) {
      console.log('=================================================================');
      console.log('❌❌❌ ERROR SAVING LINE DATA TO FIREBASE ❌❌❌');
      console.log('Error:', saveError.message);
      console.log('Stack:', saveError.stack);
      console.log('=================================================================');
      throw saveError;
    }
    
    // Calculate save time
    let saveTime = "unknown";
    if (startTime !== null) {
      const endTime = performance.now();
      saveTime = (endTime - startTime).toFixed(2);
    }
    
    console.log('=================================================================');
    console.log(`✅✅✅ FIREBASE LINE AUTO-SAVE COMPLETE ${processedRoute ? `FOR ROUTE: ${processedRoute.routeId}` : ''} ✅✅✅`);
    console.log(`✅✅✅ AUTO-SAVE ID: ${autoSaveId} ✅✅✅`);
    console.log(`✅✅✅ SAVED IN: ${saveTime}ms ✅✅✅`);
    console.log('=================================================================');
    
    // Update status in both places
    firebaseLineAutoSaveStatus.isLoading = false;
    firebaseLineAutoSaveStatus.success = true;
    firebaseLineAutoSaveStatus.lastSaveTime = saveTime;
    firebaseLineAutoSaveStatus.autoSaveId = autoSaveId; // Store the auto-save ID
    
    // Also update the global context if available
    if (autoSave && autoSave.completeAutoSave) {
      // Use the autoSaveId as the routeId if processedRoute is not available
      // This ensures we have a valid routeId for future operations
      const routeId = processedRoute ? processedRoute.routeId : autoSaveId;
      console.log(`[saveLinesToExistingAutoSave] Completing auto-save with routeId: ${routeId}`);
      autoSave.completeAutoSave(autoSaveId, routeId);
    }
    
    return autoSaveId;
  } catch (error) {
    console.error('Error saving lines data:', error);
    throw new Error(`Failed to save lines: ${error.message}`);
  }
};

/**
 * Find the most recent auto-save for a user
 * @param {string} userId - The ID of the user
 * @returns {Promise<string|null>} - The auto-save ID if found, null otherwise
 */
const findMostRecentAutoSaveForUser = async (userId) => {
  try {
    // First check if there's an auto-save ID in the Line status
    if (firebaseLineAutoSaveStatus.autoSaveId) {
      console.log('[findMostRecentAutoSaveForUser] Using auto-save ID from Line status:', firebaseLineAutoSaveStatus.autoSaveId);
      return firebaseLineAutoSaveStatus.autoSaveId;
    }
    
    // Then check if there's an auto-save ID in the GPX status
    if (firebaseAutoSaveStatus.autoSaveId) {
      console.log('[findMostRecentAutoSaveForUser] Using auto-save ID from GPX status:', firebaseAutoSaveStatus.autoSaveId);
      return firebaseAutoSaveStatus.autoSaveId;
    }
    
    // Then check if there's a recent auto-save in the status
    if (firebaseAutoSaveStatus.lastSavedRoute) {
      // Get the auto-save ID from the URL
      const url = window.location.href;
      const match = url.match(/\/route\/([^\/]+)/);
      if (match && match[1]) {
        console.log('[findMostRecentAutoSaveForUser] Found auto-save ID in URL:', match[1]);
        return match[1];
      }
    }
    
    // If we can't find the auto-save ID, return null
    console.log('[findMostRecentAutoSaveForUser] No auto-save ID found for user:', userId);
    return null;
  } catch (error) {
    console.error('Error finding most recent auto-save:', error);
    return null;
  }
};

/**
 * Find the auto-save ID for a route
 * @param {string} routeId - The ID of the route
 * @param {string} userId - The ID of the user
 * @returns {Promise<string|null>} - The auto-save ID if found, null otherwise
 */
const findAutoSaveIdForRoute = async (routeId, userId) => {
  try {
    // First check if there's an auto-save ID in the status
    if (firebaseAutoSaveStatus.autoSaveId) {
      console.log('[findAutoSaveIdForRoute] Using auto-save ID from status:', firebaseAutoSaveStatus.autoSaveId);
      return firebaseAutoSaveStatus.autoSaveId;
    }
    
    // Then check if the route ID matches the last saved route
    if (firebaseAutoSaveStatus.lastSavedRoute === routeId) {
      // Get the auto-save ID from the URL
      const url = window.location.href;
      const match = url.match(/\/route\/([^\/]+)/);
      if (match && match[1]) {
        console.log('[findAutoSaveIdForRoute] Found auto-save ID in URL:', match[1]);
        return match[1];
      }
    }
    
    // If we can't find the auto-save ID, return null
    // This will trigger a new auto-save
    console.log('[findAutoSaveIdForRoute] No auto-save ID found for route:', routeId);
    return null;
  } catch (error) {
    console.error('Error finding auto-save ID:', error);
    return null;
  }
};

/**
 * Get the current Firebase Line auto-save status
 * @returns {Object} - The current status object
 */
export const getFirebaseLineAutoSaveStatus = () => {
  return { ...firebaseLineAutoSaveStatus };
};

export default {
  autoSaveLinesToFirebase,
  getFirebaseLineAutoSaveStatus
};
