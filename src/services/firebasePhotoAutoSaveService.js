/**
 * Firebase Photo Auto-Save Service
 * 
 * This service handles automatically saving photo data to Firebase when photos are added, updated, or removed.
 * It works in conjunction with the firebaseGpxAutoSaveService to ensure all route data is persisted.
 * It also handles uploading photos to Cloudinary if they haven't been uploaded yet.
 */

import { db } from './firebaseService';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { autoSaveGpxToFirebase, firebaseAutoSaveStatus } from './firebaseGpxAutoSaveService';
import { uploadToCloudinary } from '../utils/cloudinary';

// Import AutoSaveContext - will be used if available
let useAutoSave = null;
try {
  // Dynamic import to avoid circular dependencies
  const AutoSaveModule = require('../context/AutoSaveContext');
  useAutoSave = AutoSaveModule.useAutoSave;
} catch (error) {
  console.log('[firebasePhotoAutoSaveService] AutoSaveContext not available, will use local state only');
}

// Global state to track Firebase Photo auto-save status
export const firebasePhotoAutoSaveStatus = {
  isLoading: false,
  lastSavedPhoto: null,
  lastSaveTime: null,
  success: false,
  error: null,
  autoSaveId: null // Add autoSaveId to track the current auto-save
};

/**
 * Auto-save photos to Firebase
 * @param {Array} photos - The photos data from PhotoContext
 * @param {Object} processedRoute - The processed route data (can be null if not available)
 * @param {string} userId - The ID of the current user
 * @param {Object} autoSaveContext - Optional AutoSaveContext from a component (if not using the hook)
 * @param {string} loadedPermanentRouteId - Optional ID of a loaded permanent route
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
export const autoSavePhotosToFirebase = async (photos, processedRoute, userId, autoSaveContext = null, loadedPermanentRouteId = null) => {
  try {
    console.log('=================================================================');
    console.log('🔍🔍🔍 ENTERING autoSavePhotosToFirebase 🔍🔍🔍');
    console.log('Input photos array type:', typeof photos);
    console.log('Input photos array:', photos);
    console.log('Input photos is array:', Array.isArray(photos));
    console.log('Input photos length:', photos?.length || 0);
    if (photos && photos.length > 0) {
      console.log('First photo:', photos[0]);
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
        console.log('[firebasePhotoAutoSaveService] Could not access AutoSaveContext via hook:', error.message);
      }
    }

    // Prefer loadedPermanentRouteId from parameter, then from context
    const currentLoadedPermanentRouteId = loadedPermanentRouteId || autoSave?.loadedPermanentRouteId || null;
    
    // Update loading status in both places
    firebasePhotoAutoSaveStatus.isLoading = true;
    firebasePhotoAutoSaveStatus.lastSavedPhoto = photos?.length > 0 ? photos[0].url : null;
    firebasePhotoAutoSaveStatus.error = null;
    
    // Also update the global context if available
    if (autoSave && autoSave.startAutoSave) {
      autoSave.startAutoSave();
    }
    
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE AUTO-SAVING PHOTO DATA ${processedRoute ? `FOR ROUTE: ${processedRoute.routeId}` : '(NO ROUTE AVAILABLE)'} 🔄🔄🔄`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING AUTO-SAVE ❌❌❌');
      console.log('=================================================================');
      
      firebasePhotoAutoSaveStatus.isLoading = false;
      firebasePhotoAutoSaveStatus.error = 'Firebase not initialized';
      firebasePhotoAutoSaveStatus.success = false;
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
        console.log('[firebasePhotoAutoSaveService] No route, but permanent route loaded. Using permanent ID for Photos:', autoSaveIdToUse);
      } else if (autoSave && autoSave.autoSaveId) {
        console.log('[firebasePhotoAutoSaveService] No route, using auto-save ID from global context for Photos:', autoSave.autoSaveId);
        autoSaveIdToUse = autoSave.autoSaveId;
      } else {
        // Fallback: find most recent temporary auto-save if no permanent one is active
        autoSaveIdToUse = await findMostRecentAutoSaveForUser(userId); // This specifically queries gpx_auto_saves
      }
      
      if (!autoSaveIdToUse) {
        console.log('=================================================================');
        console.log('❌❌❌ NO EXISTING AUTO-SAVE (PERMANENT OR TEMPORARY) FOUND, CANNOT SAVE PHOTOS ❌❌❌');
        console.log('=================================================================');
        return null;
      }
      
      console.log(`Found auto-save ID to use for Photos (no route context): ${autoSaveIdToUse}`);
      
      // Save Photos to the determined auto-save (could be permanent or temporary)
      return await savePhotosToExistingAutoSave(autoSaveIdToUse, photos, null, autoSave, startTime, currentLoadedPermanentRouteId);
    }
    
    // If processedRoute exists, determine the autoSaveId to use
    let autoSaveIdToUse = null;

    if (currentLoadedPermanentRouteId) {
      autoSaveIdToUse = currentLoadedPermanentRouteId;
      console.log('[firebasePhotoAutoSaveService] Permanent route loaded. Using permanent ID for Photos:', autoSaveIdToUse);
    } else if (autoSave && autoSave.autoSaveId) {
      console.log('[firebasePhotoAutoSaveService] Using auto-save ID from global context for Photos:', autoSave.autoSaveId);
      autoSaveIdToUse = autoSave.autoSaveId;
    } else if (firebasePhotoAutoSaveStatus.autoSaveId) {
      autoSaveIdToUse = firebasePhotoAutoSaveStatus.autoSaveId;
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
      
      // Create a new temporary auto-save with the photos included
      const newProcessedRouteWithPhotos = {
        ...processedRoute,
        photos // Add current photos to the new route data
      };
      
      // Pass the autoSave context and loadedPermanentRouteId (which should be null here)
      return await autoSaveGpxToFirebase(
        newProcessedRouteWithPhotos,
        userId,
        processedRoute.gpxFileName || 'unknown.gpx',
        autoSave,
        null, // existingAutoSaveId for gpx_auto_saves (null because we're creating new)
        null  // loadedPermanentRouteId (null because we're creating a new temporary save)
      );
    } else if (!autoSaveIdToUse && currentLoadedPermanentRouteId) {
        console.error(`[firebasePhotoAutoSaveService] Have loadedPermanentRouteId ${currentLoadedPermanentRouteId} but no autoSaveIdToUse. This indicates an issue.`);
        return null;
    }
    
    console.log(`Using auto-save ID for Photos: ${autoSaveIdToUse}`);
    
    // Save Photos to the existing auto-save (could be permanent or temporary)
    return await savePhotosToExistingAutoSave(autoSaveIdToUse, photos, processedRoute, autoSave, startTime, currentLoadedPermanentRouteId);
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR AUTO-SAVING PHOTO DATA ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    
    // Update status in both places
    firebasePhotoAutoSaveStatus.isLoading = false;
    firebasePhotoAutoSaveStatus.success = false;
    firebasePhotoAutoSaveStatus.error = error.message;
    
    // Also update the global context if available
    if (autoSave && autoSave.setAutoSaveError) {
      autoSave.setAutoSaveError(error);
    }
    return null;
  }
};

/**
 * Save photos to an existing auto-save
 * @param {string} autoSaveId - The ID of the auto-save
 * @param {Array} photos - The photos data
 * @param {Object} processedRoute - The processed route data (optional)
 * @param {Object} autoSave - The AutoSaveContext (optional)
 * @param {number} startTime - The start time for performance measurement
 * @param {string|null} loadedPermanentRouteId - The ID of the loaded permanent route, if any.
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
const savePhotosToExistingAutoSave = async (autoSaveId, photos, processedRoute = null, autoSave = null, startTime = null, loadedPermanentRouteId = null) => {
  try {
    console.log('=================================================================');
    console.log('🔍🔍🔍 DETAILED PHOTO DATA INSPECTION 🔍🔍🔍');
    console.log('Raw photos array type:', typeof photos);
    console.log('Raw photos array:', photos);
    console.log('photos is array:', Array.isArray(photos));
    console.log('photos length:', photos?.length || 0);
    if (photos && photos.length > 0) {
      console.log('First photo:', photos[0]);
    }
    console.log('=================================================================');
    
    console.log('Saving photos data:', { 
      photosCount: photos?.length || 0
    });
    
    // Process photos to ensure they match the MongoDB structure
    // First ensure photos is an array
    const validPhotos = Array.isArray(photos) ? photos : [];
    
    console.log('Valid photos array after check:', {
      isArray: Array.isArray(validPhotos),
      length: validPhotos.length
    });
    
    // First, identify photos that need to be uploaded to Cloudinary
    const photosToUpload = validPhotos.filter(photo => 
      photo._originalFile && // Has original file
      (!photo.publicId || photo.url?.startsWith('blob:')) // Not already uploaded to Cloudinary
    );
    
    console.log(`Found ${photosToUpload.length} photos that need to be uploaded to Cloudinary`);
    
    // Upload photos to Cloudinary
    const uploadedPhotos = [];
    for (const photo of photosToUpload) {
      try {
        console.log(`Uploading photo ${photo.id} to Cloudinary...`);
        
        // Check if we have the original file
        if (!photo._originalFile) {
          console.warn(`Photo ${photo.id} has no original file, skipping upload`);
          continue;
        }
        
        // Upload to Cloudinary
        const result = await uploadToCloudinary(photo._originalFile);
        
        console.log(`Successfully uploaded photo ${photo.id} to Cloudinary:`, result);
        
        // Add to uploaded photos
        uploadedPhotos.push({
          originalId: photo.id,
          publicId: result.publicId,
          url: result.url, // This is already a secure HTTPS URL
          coordinates: photo.coordinates,
          caption: photo.caption || '',
          name: photo.name || '',
          dateAdded: photo.dateAdded || new Date().toISOString(),
          isManuallyPlaced: !!photo.isManuallyPlaced
        });
      } catch (error) {
        console.error(`Error uploading photo ${photo.id} to Cloudinary:`, error);
        // Continue with other photos
      }
    }
    
    console.log(`Successfully uploaded ${uploadedPhotos.length} photos to Cloudinary`);
    
    // Process each photo to ensure it has the correct structure
    const processedPhotos = validPhotos.map(photo => {
      // Check if this photo was just uploaded to Cloudinary
      const uploadedPhoto = uploadedPhotos.find(up => up.originalId === photo.id);
      
      if (uploadedPhoto) {
        // Use the uploaded photo data
        return {
          id: photo.id || `photo-${Date.now()}-${Math.random().toString().substring(2, 8)}`,
          publicId: uploadedPhoto.publicId,
          url: uploadedPhoto.url, // This is already a secure HTTPS URL
          caption: photo.caption || '',
          dateAdded: (photo.dateAdded && typeof photo.dateAdded !== 'string') 
            ? photo.dateAdded.toISOString() 
            : (photo.dateAdded || new Date().toISOString()),
          isManuallyPlaced: !!photo.isManuallyPlaced,
          name: photo.name || '',
          coordinates: photo.coordinates && photo.isManuallyPlaced ? {
            lng: photo.coordinates.lng,
            lat: photo.coordinates.lat
          } : undefined
        };
      } else {
        // Create a clean photo object with only the properties we need
        // This avoids issues with non-serializable properties like File objects
        const cleanPhoto = {
          id: photo.id || `photo-${Date.now()}-${Math.random().toString().substring(2, 8)}`,
          caption: photo.caption || '',
          dateAdded: (photo.dateAdded && typeof photo.dateAdded !== 'string') 
            ? photo.dateAdded.toISOString() 
            : (photo.dateAdded || new Date().toISOString()),
          isManuallyPlaced: !!photo.isManuallyPlaced,
          name: photo.name || ''
        };
        
        // Handle URLs - if we have a publicId, use that instead of blob URLs
        if (photo.publicId) {
          cleanPhoto.publicId = photo.publicId;
          // If we have permanent Cloudinary URLs, use those
          if (photo.url && !photo.url.startsWith('blob:')) {
            cleanPhoto.url = photo.url;
          }
          if (photo.thumbnailUrl && !photo.thumbnailUrl.startsWith('blob:')) {
            cleanPhoto.thumbnailUrl = photo.thumbnailUrl;
          }
        } else {
          // For photos that haven't been uploaded to Cloudinary yet,
          // we'll just store a reference that they exist but not the blob URLs
          cleanPhoto.pendingUpload = true;
          // Don't include blob URLs as they're temporary and only valid in the current session
        }
        
        // Only add coordinates if they exist and the photo is manually placed
        if (photo.coordinates && photo.isManuallyPlaced) {
          cleanPhoto.coordinates = {
            lng: photo.coordinates.lng,
            lat: photo.coordinates.lat
          };
        }
        
        return cleanPhoto;
      }
    });
    
    // Log the processed photos
    processedPhotos.forEach(photo => {
      console.log('Processed photo:', {
        id: photo.id,
        hasPublicId: !!photo.publicId,
        pendingUpload: !!photo.pendingUpload,
        hasCoordinates: !!photo.coordinates,
        isManuallyPlaced: photo.isManuallyPlaced,
        url: photo.url ? (photo.url.startsWith('http') ? photo.url.substring(0, 30) + '...' : photo.url) : 'none'
      });
    });
    
    console.log('Processed photos structure:', {
      photosCount: processedPhotos.length,
      firstPhoto: processedPhotos.length > 0 ? JSON.stringify(processedPhotos[0]) : 'none'
    });
    
    // Log the photo data being saved
    console.log('=================================================================');
    console.log('📝📝📝 PHOTO DATA BEING SAVED TO FIREBASE 📝📝📝');
    console.log('Auto-save ID:', autoSaveId);
    console.log('Photo data structure:', {
      photosCount: processedPhotos.length,
      firstPhoto: processedPhotos.length > 0 ? processedPhotos[0] : null
    });
    console.log('=================================================================');
    
    // Determine target collection based on whether a permanent route is loaded
    const targetCollectionName = loadedPermanentRouteId ? 'user_saved_routes' : 'gpx_auto_saves';

    // Create the document reference
    const photosRef = doc(db, targetCollectionName, autoSaveId, 'data', 'photos');
    console.log('Firebase Photo document path:', photosRef.path);
    
    try {
      // Check if we're deleting all photos
      if (processedPhotos.length === 0) {
        console.log('No photos to save, checking if we need to delete the photos document');
        
        // Check if the photos document exists
        const photosDoc = await getDoc(photosRef);
        if (photosDoc.exists()) {
          console.log('Photos document exists, deleting all photos data');
          
          // Save an empty array to effectively delete all photos
          await setDoc(photosRef, { data: [] });
          console.log('All photos data deleted from Firebase');
        } else {
          console.log('Photos document does not exist, nothing to delete');
        }
      } else {
        // Save the data to Firebase
        await setDoc(photosRef, { data: processedPhotos });
        console.log('Photos data saved successfully to Firebase');
      }
      
      // Verify the data was saved by reading it back
      try {
        const savedDoc = await getDoc(photosRef);
        if (savedDoc.exists()) {
          const savedData = savedDoc.data();
          console.log('=================================================================');
          console.log('✅✅✅ VERIFIED PHOTO DATA IN FIREBASE ✅✅✅');
          console.log('Saved data structure:', {
            hasData: !!savedData.data,
            photosCount: savedData.data?.length || 0,
            firstPhoto: savedData.data?.length > 0 ? savedData.data[0].url : null
          });
          console.log('=================================================================');
        } else {
          console.log('=================================================================');
          console.log('❌❌❌ VERIFICATION FAILED - DOCUMENT DOES NOT EXIST ❌❌❌');
          console.log('=================================================================');
        }
      } catch (verifyError) {
        console.error('Error verifying saved photo data:', verifyError);
      }
    } catch (saveError) {
      console.log('=================================================================');
      console.log('❌❌❌ ERROR SAVING PHOTO DATA TO FIREBASE ❌❌❌');
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
    console.log(`✅✅✅ FIREBASE PHOTO AUTO-SAVE COMPLETE ${processedRoute ? `FOR ROUTE: ${processedRoute.routeId}` : ''} ✅✅✅`);
    console.log(`✅✅✅ AUTO-SAVE ID: ${autoSaveId} ✅✅✅`);
    console.log(`✅✅✅ SAVED IN: ${saveTime}ms ✅✅✅`);
    console.log('=================================================================');
    
    // Update status in both places
    firebasePhotoAutoSaveStatus.isLoading = false;
    firebasePhotoAutoSaveStatus.success = true;
    firebasePhotoAutoSaveStatus.lastSaveTime = saveTime;
    firebasePhotoAutoSaveStatus.autoSaveId = autoSaveId; // Store the auto-save ID
    
    // Also update the global context if available
    if (autoSave && autoSave.completeAutoSave) {
      // Use the autoSaveId as the routeId if processedRoute is not available
      // This ensures we have a valid routeId for future operations
      const routeId = processedRoute ? processedRoute.routeId : autoSaveId;
      console.log(`[savePhotosToExistingAutoSave] Completing auto-save with routeId: ${routeId}`);
      autoSave.completeAutoSave(autoSaveId, routeId);
    }
    
    return autoSaveId;
  } catch (error) {
    console.error('Error saving photos data:', error);
    
    // Update status in both places
    firebasePhotoAutoSaveStatus.isLoading = false;
    firebasePhotoAutoSaveStatus.success = false;
    firebasePhotoAutoSaveStatus.error = error.message;
    
    // Also update the global context if available
    if (autoSave && autoSave.setAutoSaveError) {
      autoSave.setAutoSaveError(error);
    }
    
    throw new Error(`Failed to save photos: ${error.message}`);
  }
};

/**
 * Find the most recent auto-save for a user
 * @param {string} userId - The ID of the user
 * @returns {Promise<string|null>} - The auto-save ID if found, null otherwise
 */
const findMostRecentAutoSaveForUser = async (userId) => {
  try {
    // First check if there's an auto-save ID in the Photo status
    if (firebasePhotoAutoSaveStatus.autoSaveId) {
      console.log('[findMostRecentAutoSaveForUser] Using auto-save ID from Photo status:', firebasePhotoAutoSaveStatus.autoSaveId);
      return firebasePhotoAutoSaveStatus.autoSaveId;
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
 * Get the current Firebase Photo auto-save status
 * @returns {Object} - The current status object
 */
export const getFirebasePhotoAutoSaveStatus = () => {
  return { ...firebasePhotoAutoSaveStatus };
};

export default {
  autoSavePhotosToFirebase,
  getFirebasePhotoAutoSaveStatus
};
