/**
 * Firebase Description Auto-Save Service
 * 
 * This service handles automatically saving route descriptions to Firebase.
 */

import { db } from './firebaseService';
import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// Import AutoSaveContext - will be used if available
let useAutoSave = null;
try {
  // Dynamic import to avoid circular dependencies
  const AutoSaveModule = require('../context/AutoSaveContext');
  useAutoSave = AutoSaveModule.useAutoSave;
} catch (error) {
  console.log('[firebaseDescriptionAutoSaveService] AutoSaveContext not available, will use local state only');
}

// Global state to track Firebase auto-save status
export const firebaseDescriptionAutoSaveStatus = {
  isLoading: false,
  lastSavedDescription: null,
  lastSaveTime: null,
  success: false,
  error: null,
  autoSaveId: null
};

/**
 * Auto-save route description to Firebase
 * @param {Object} description - The description object containing text and photos
 * @param {Object} route - The route object
 * @param {string} userId - The ID of the current user
 * @param {Object} autoSaveContext - Optional AutoSaveContext from a component
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
export const autoSaveDescriptionToFirebase = async (description, route, userId, autoSaveContext = null) => {
  try {
    // Get AutoSaveContext if available
    let autoSave = autoSaveContext;
    
    // If not provided directly, try to use the hook
    if (!autoSave && typeof window !== 'undefined') {
      try {
        if (useAutoSave) {
          autoSave = useAutoSave();
        }
      } catch (error) {
        console.log('[firebaseDescriptionAutoSaveService] Could not access AutoSaveContext via hook:', error.message);
      }
    }
    
    // Update loading status
    firebaseDescriptionAutoSaveStatus.isLoading = true;
    firebaseDescriptionAutoSaveStatus.lastSavedDescription = description?.description?.substring(0, 50) + '...';
    firebaseDescriptionAutoSaveStatus.error = null;
    
    // Also update the global context if available
    if (autoSave && autoSave.startAutoSave) {
      autoSave.startAutoSave();
    }
    
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE AUTO-SAVING DESCRIPTION FOR ROUTE: ${route?.routeId} 🔄🔄🔄`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING AUTO-SAVE ❌❌❌');
      console.log('=================================================================');
      
      firebaseDescriptionAutoSaveStatus.isLoading = false;
      firebaseDescriptionAutoSaveStatus.error = 'Firebase not initialized';
      firebaseDescriptionAutoSaveStatus.success = false;
      return null;
    }
    
    // First check if we have an auto-save ID
    let autoSaveId = null;
    
    // Check various sources for the auto-save ID
    if (autoSave && autoSave.autoSaveId) {
      autoSaveId = autoSave.autoSaveId;
    } else if (firebaseDescriptionAutoSaveStatus.autoSaveId) {
      autoSaveId = firebaseDescriptionAutoSaveStatus.autoSaveId;
    } else {
      // Try to find the auto-save ID from other services
      const { firebaseAutoSaveStatus } = require('./firebaseGpxAutoSaveService');
      if (firebaseAutoSaveStatus.autoSaveId) {
        autoSaveId = firebaseAutoSaveStatus.autoSaveId;
      } else {
        // If no auto-save ID is found, we need to create a new one
        // This should be rare since descriptions are usually edited after GPX upload
        console.log('No existing auto-save ID found, creating a new one');
        
        // Create a new document in the gpx_auto_saves collection
        const autoSaveRef = doc(collection(db, 'gpx_auto_saves'));
        autoSaveId = autoSaveRef.id;
        
        // Create the main metadata document
        await setDoc(autoSaveRef, {
          userId: userId,
          gpxFileName: route?.name || 'Unknown',
          status: "pending_action",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          name: route?.name || 'Draft route',
          statistics: route?.statistics || {}
        });
      }
    }
    
    // Start timing
    const startTime = performance.now();
    
    // Process photos to ensure they're in the correct format for Firestore
    const processedPhotos = (description?.photos || []).map(photo => {
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
    
    // Create the description document
    const descriptionData = {
      description: description?.description || '',
      photos: processedPhotos || []
    };
    
    console.log('Saving description data:', { 
      descriptionLength: descriptionData.description.length,
      photoCount: descriptionData.photos.length
    });
    
    const descriptionRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'description');
    await setDoc(descriptionRef, { data: descriptionData });
    
    // Calculate save time
    const endTime = performance.now();
    const saveTime = (endTime - startTime).toFixed(2);
    
    console.log('=================================================================');
    console.log(`✅✅✅ FIREBASE AUTO-SAVE COMPLETE FOR DESCRIPTION ✅✅✅`);
    console.log(`✅✅✅ AUTO-SAVE ID: ${autoSaveId} ✅✅✅`);
    console.log(`✅✅✅ SAVED IN: ${saveTime}ms ✅✅✅`);
    console.log('=================================================================');
    
    // Update status
    firebaseDescriptionAutoSaveStatus.isLoading = false;
    firebaseDescriptionAutoSaveStatus.success = true;
    firebaseDescriptionAutoSaveStatus.lastSaveTime = saveTime;
    firebaseDescriptionAutoSaveStatus.autoSaveId = autoSaveId;
    
    // Also update the global context if available
    if (autoSave && autoSave.completeAutoSave) {
      autoSave.completeAutoSave(autoSaveId, route?.routeId);
    }
    
    return autoSaveId;
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR AUTO-SAVING DESCRIPTION ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    
    // Update status
    firebaseDescriptionAutoSaveStatus.isLoading = false;
    firebaseDescriptionAutoSaveStatus.success = false;
    firebaseDescriptionAutoSaveStatus.error = error.message;
    
    // Also update the global context if available
    if (autoSave && autoSave.setAutoSaveError) {
      autoSave.setAutoSaveError(error);
    }
    return null;
  }
};

/**
 * Get the current Firebase description auto-save status
 * @returns {Object} - The current status object
 */
export const getFirebaseDescriptionAutoSaveStatus = () => {
  return { ...firebaseDescriptionAutoSaveStatus };
};

export default {
  autoSaveDescriptionToFirebase,
  getFirebaseDescriptionAutoSaveStatus
};
