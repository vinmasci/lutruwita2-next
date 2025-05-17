/**
 * Firebase POI Auto-Save Service
 * 
 * This service handles automatically saving POI data to Firebase when POIs are added, updated, or removed.
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
  console.log('[firebasePOIAutoSaveService] AutoSaveContext not available, will use local state only');
}

// Global state to track Firebase POI auto-save status
export const firebasePOIAutoSaveStatus = {
  isLoading: false,
  lastSavedPOI: null,
  lastSaveTime: null,
  success: false,
  error: null,
  autoSaveId: null // Add autoSaveId to track the current auto-save
};

/**
 * Auto-save POIs to Firebase
 * @param {Object} pois - The POIs data from POIContext
 * @param {Object} processedRoute - The processed route data (can be null if not available)
 * @param {string} userId - The ID of the current user
 * @param {Object} autoSaveContext - Optional AutoSaveContext from a component (if not using the hook)
 * @param {string} loadedPermanentRouteId - Optional ID of a loaded permanent route
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
export const autoSavePOIsToFirebase = async (pois, processedRoute, userId, autoSaveContext = null, loadedPermanentRouteId = null) => {
  try {
    console.log('=================================================================');
    console.log('🔍🔍🔍 ENTERING autoSavePOIsToFirebase 🔍🔍🔍');
    console.log('Input pois object type:', typeof pois);
    console.log('Input pois object:', pois);
    console.log('Input pois.draggable exists:', !!pois.draggable);
    console.log('Input pois.draggable type:', pois.draggable ? typeof pois.draggable : 'N/A');
    console.log('Input pois.draggable is array:', pois.draggable ? Array.isArray(pois.draggable) : 'N/A');
    console.log('Input pois.draggable length:', pois.draggable?.length || 0);
    if (pois.draggable && pois.draggable.length > 0) {
      console.log('First draggable POI:', pois.draggable[0]);
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
        console.log('[firebasePOIAutoSaveService] Could not access AutoSaveContext via hook:', error.message);
      }
    }

    // Prefer loadedPermanentRouteId from parameter, then from context
    const currentLoadedPermanentRouteId = loadedPermanentRouteId || autoSave?.loadedPermanentRouteId || null;
    
    // Update loading status in both places
    firebasePOIAutoSaveStatus.isLoading = true;
    firebasePOIAutoSaveStatus.lastSavedPOI = pois.draggable?.length > 0 ? pois.draggable[0].id : null;
    firebasePOIAutoSaveStatus.error = null;
    
    // Also update the global context if available
    if (autoSave && autoSave.startAutoSave) {
      autoSave.startAutoSave();
    }
    
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE AUTO-SAVING POI DATA ${processedRoute ? `FOR ROUTE: ${processedRoute.routeId}` : '(NO ROUTE AVAILABLE)'} 🔄🔄🔄`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING AUTO-SAVE ❌❌❌');
      console.log('=================================================================');
      
      firebasePOIAutoSaveStatus.isLoading = false;
      firebasePOIAutoSaveStatus.error = 'Firebase not initialized';
      firebasePOIAutoSaveStatus.success = false;
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
        console.log('[firebasePOIAutoSaveService] No route, but permanent route loaded. Using permanent ID for POIs:', autoSaveIdToUse);
      } else if (autoSave && autoSave.autoSaveId) {
        console.log('[firebasePOIAutoSaveService] No route, using auto-save ID from global context for POIs:', autoSave.autoSaveId);
        autoSaveIdToUse = autoSave.autoSaveId;
      } else {
        // Fallback: find most recent temporary auto-save if no permanent one is active
        autoSaveIdToUse = await findMostRecentAutoSaveForUser(userId); // This specifically queries gpx_auto_saves
      }
      
      if (!autoSaveIdToUse) {
        console.log('=================================================================');
        console.log('❌❌❌ NO EXISTING AUTO-SAVE (PERMANENT OR TEMPORARY) FOUND, CANNOT SAVE POIS ❌❌❌');
        console.log('=================================================================');
        return null;
      }
      
      console.log(`Found auto-save ID to use for POIs (no route context): ${autoSaveIdToUse}`);
      
      // Save POIs to the determined auto-save (could be permanent or temporary)
      return await savePOIsToExistingAutoSave(autoSaveIdToUse, pois, null, autoSave, startTime, currentLoadedPermanentRouteId);
    }
    
    // If processedRoute exists, determine the autoSaveId to use
    let autoSaveIdToUse = null;

    if (currentLoadedPermanentRouteId) {
      autoSaveIdToUse = currentLoadedPermanentRouteId;
      console.log('[firebasePOIAutoSaveService] Permanent route loaded. Using permanent ID for POIs:', autoSaveIdToUse);
    } else if (autoSave && autoSave.autoSaveId) {
      // This autoSaveId from context could be for a temporary gpx_auto_save
      console.log('[firebasePOIAutoSaveService] Using auto-save ID from global context for POIs:', autoSave.autoSaveId);
      autoSaveIdToUse = autoSave.autoSaveId;
    } else if (firebasePOIAutoSaveStatus.autoSaveId) {
      autoSaveIdToUse = firebasePOIAutoSaveStatus.autoSaveId;
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
      
      // Create a new temporary auto-save with the POIs included
      const newProcessedRouteWithPOIs = {
        ...processedRoute,
        pois // Add current POIs to the new route data
      };
      
      // Pass the autoSave context and loadedPermanentRouteId (which should be null here)
      return await autoSaveGpxToFirebase(
        newProcessedRouteWithPOIs,
        userId,
        processedRoute.gpxFileName || 'unknown.gpx',
        autoSave,
        null, // existingAutoSaveId for gpx_auto_saves (null because we're creating new)
        null  // loadedPermanentRouteId (null because we're creating a new temporary save)
      );
    } else if (!autoSaveIdToUse && currentLoadedPermanentRouteId) {
        // This case should ideally not happen if currentLoadedPermanentRouteId implies an existing document.
        // If it does, it means we have a permanent ID but couldn't find the document, which is an error state.
        console.error(`[firebasePOIAutoSaveService] Have loadedPermanentRouteId ${currentLoadedPermanentRouteId} but no autoSaveIdToUse. This indicates an issue.`);
        return null;
    }
    
    console.log(`Using auto-save ID for POIs: ${autoSaveIdToUse}`);
    
    // Save POIs to the existing auto-save (could be permanent or temporary)
    return await savePOIsToExistingAutoSave(autoSaveIdToUse, pois, processedRoute, autoSave, startTime, currentLoadedPermanentRouteId);
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR AUTO-SAVING POI DATA ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    
    // Update status in both places
    firebasePOIAutoSaveStatus.isLoading = false;
    firebasePOIAutoSaveStatus.success = false;
    firebasePOIAutoSaveStatus.error = error.message;
    
    // Also update the global context if available
    if (autoSave && autoSave.setAutoSaveError) {
      autoSave.setAutoSaveError(error);
    }
    return null;
  }
};

/**
 * Save POIs to an existing auto-save
 * @param {string} autoSaveId - The ID of the auto-save
 * @param {Object} pois - The POIs data
 * @param {Object} processedRoute - The processed route data (optional)
 * @param {Object} autoSave - The AutoSaveContext (optional)
 * @param {number} startTime - The start time for performance measurement
 * @param {string|null} loadedPermanentRouteId - The ID of the loaded permanent route, if any.
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
const savePOIsToExistingAutoSave = async (autoSaveId, pois, processedRoute = null, autoSave = null, startTime = null, loadedPermanentRouteId = null) => {
  try {
    console.log('=================================================================');
    console.log('🔍🔍🔍 DETAILED POI DATA INSPECTION 🔍🔍🔍');
    console.log('Raw pois object type:', typeof pois);
    console.log('Raw pois object:', pois);
    console.log('pois.draggable exists:', !!pois.draggable);
    console.log('pois.draggable type:', pois.draggable ? typeof pois.draggable : 'N/A');
    console.log('pois.draggable is array:', pois.draggable ? Array.isArray(pois.draggable) : 'N/A');
    console.log('pois.draggable length:', pois.draggable?.length || 0);
    if (pois.draggable && pois.draggable.length > 0) {
      console.log('First draggable POI:', pois.draggable[0]);
    }
    console.log('=================================================================');
    
    console.log('Saving POIs data:', { 
      draggableCount: pois.draggable?.length || 0
    });
    
    // Process POIs to ensure they match the MongoDB structure
    // First ensure pois.draggable is an array
    const draggablePois = Array.isArray(pois.draggable) ? pois.draggable : [];
    
    console.log('Draggable POIs array after check:', {
      isArray: Array.isArray(draggablePois),
      length: draggablePois.length
    });
    
    const processedPOIs = {
      draggable: draggablePois.map(poi => {
        // Create a copy of the POI to avoid modifying the original
        const poiCopy = { ...poi };
        
        // If the POI has Google Places data, only keep the placeId and url
        if (poiCopy.googlePlaces) {
          poiCopy.googlePlaces = {
            placeId: poiCopy.googlePlaces.placeId,
            url: poiCopy.googlePlaces.url
          };
        }
        
        return poiCopy;
      })
    };
    
    console.log('Processed POIs structure:', {
      draggableCount: processedPOIs.draggable.length,
      firstPOI: processedPOIs.draggable.length > 0 ? JSON.stringify(processedPOIs.draggable[0]) : 'none'
    });
    
    // Log the POI data being saved
    console.log('=================================================================');
    console.log('📝📝📝 POI DATA BEING SAVED TO FIREBASE 📝📝📝');
    console.log('Auto-save ID:', autoSaveId);
    console.log('POI data structure:', {
      draggableCount: processedPOIs.draggable.length,
      firstPOI: processedPOIs.draggable.length > 0 ? processedPOIs.draggable[0] : null
    });
    console.log('=================================================================');
    
    // Determine target collection based on whether a permanent route is loaded
    const targetCollectionName = loadedPermanentRouteId ? 'user_saved_routes' : 'gpx_auto_saves';
    
    // Create the document reference
    const poisRef = doc(db, targetCollectionName, autoSaveId, 'data', 'pois');
    console.log('Firebase POI document path:', poisRef.path);
    
    try {
      // Save the data to Firebase.
      // If it's a permanent route, POIs are typically replaced.
      // If it's a temporary gpx_auto_save, the main autoSaveGpxToFirebase handles merging if it creates/updates the whole doc.
      // This function specifically updates the 'pois' subcollection.
      // For simplicity here, we'll just set the POIs. The main autoSaveGpxToFirebase
      // should be the primary handler for merging/replacing logic for the entire save document.
      await setDoc(poisRef, { data: processedPOIs });
      console.log('POIs data saved successfully to Firebase');
      
      // Verify the data was saved by reading it back
      try {
        const savedDoc = await getDoc(poisRef);
        if (savedDoc.exists()) {
          const savedData = savedDoc.data();
          console.log('=================================================================');
          console.log('✅✅✅ VERIFIED POI DATA IN FIREBASE ✅✅✅');
          console.log('Saved data structure:', {
            hasData: !!savedData.data,
            draggableCount: savedData.data?.draggable?.length || 0,
            firstPOI: savedData.data?.draggable?.length > 0 ? savedData.data.draggable[0].id : null
          });
          console.log('=================================================================');
        } else {
          console.log('=================================================================');
          console.log('❌❌❌ VERIFICATION FAILED - DOCUMENT DOES NOT EXIST ❌❌❌');
          console.log('=================================================================');
        }
      } catch (verifyError) {
        console.error('Error verifying saved POI data:', verifyError);
      }
    } catch (saveError) {
      console.log('=================================================================');
      console.log('❌❌❌ ERROR SAVING POI DATA TO FIREBASE ❌❌❌');
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
    console.log(`✅✅✅ FIREBASE POI AUTO-SAVE COMPLETE ${processedRoute ? `FOR ROUTE: ${processedRoute.routeId}` : ''} ✅✅✅`);
    console.log(`✅✅✅ AUTO-SAVE ID: ${autoSaveId} ✅✅✅`);
    console.log(`✅✅✅ SAVED IN: ${saveTime}ms ✅✅✅`);
    console.log('=================================================================');
    
    // Update status in both places
    firebasePOIAutoSaveStatus.isLoading = false;
    firebasePOIAutoSaveStatus.success = true;
    firebasePOIAutoSaveStatus.lastSaveTime = saveTime;
    firebasePOIAutoSaveStatus.autoSaveId = autoSaveId; // Store the auto-save ID
    
    // Also update the global context if available
    if (autoSave && autoSave.completeAutoSave) {
      // Use the autoSaveId as the routeId if processedRoute is not available
      // This ensures we have a valid routeId for future operations
      const routeId = processedRoute ? processedRoute.routeId : autoSaveId;
      console.log(`[savePOIsToExistingAutoSave] Completing auto-save with routeId: ${routeId}`);
      autoSave.completeAutoSave(autoSaveId, routeId);
    }
    
    return autoSaveId;
  } catch (error) {
    console.error('Error saving POIs data:', error);
    throw new Error(`Failed to save POIs: ${error.message}`);
  }
};

/**
 * Find the most recent auto-save for a user
 * @param {string} userId - The ID of the user
 * @returns {Promise<string|null>} - The auto-save ID if found, null otherwise
 */
const findMostRecentAutoSaveForUser = async (userId) => {
  try {
    // First check if there's an auto-save ID in the POI status
    if (firebasePOIAutoSaveStatus.autoSaveId) {
      console.log('[findMostRecentAutoSaveForUser] Using auto-save ID from POI status:', firebasePOIAutoSaveStatus.autoSaveId);
      return firebasePOIAutoSaveStatus.autoSaveId;
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
 * Get the current Firebase POI auto-save status
 * @returns {Object} - The current status object
 */
export const getFirebasePOIAutoSaveStatus = () => {
  return { ...firebasePOIAutoSaveStatus };
};

export default {
  autoSavePOIsToFirebase,
  getFirebasePOIAutoSaveStatus
};
