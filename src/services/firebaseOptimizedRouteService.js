/**
 * Firebase Optimized Route Service
 * 
 * This service handles loading optimized route data from Firebase.
 * It provides functions to fetch pre-processed route data that was saved to Firebase
 * by the API server during the save process.
 */

import { db } from './firebaseService';
import { collection, doc, getDoc } from 'firebase/firestore';

// SUPER VISIBLE LOGS FOR DEBUGGING
console.log('=================================================================');
console.log('🔥🔥🔥 FIREBASE SERVICE LOADED 🔥🔥🔥');
console.log('=================================================================');

// Global state to track Firebase data loading status
export const firebaseStatus = {
  isLoading: false,
  lastLoadedRoute: null,
  lastLoadTime: null,
  success: false,
  error: null
};

// Log the initial status
console.log('FIREBASE STATUS INITIALIZED:', firebaseStatus);

/**
 * Get optimized route data from Firebase
 * @param {string} routeId - The persistent ID of the route
 * @returns {Promise<Object|null>} - The optimized route data or null if not found
 */
export const getOptimizedRouteData = async (routeId) => {
  try {
    // Update loading status
    firebaseStatus.isLoading = true;
    firebaseStatus.lastLoadedRoute = routeId;
    firebaseStatus.error = null;
    
    // SUPER VISIBLE LOGGING
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE LOADING ROUTE: ${routeId} 🔄🔄🔄`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING FETCH ❌❌❌');
      console.log('=================================================================');
      
      firebaseStatus.isLoading = false;
      firebaseStatus.error = 'Firebase not initialized';
      firebaseStatus.success = false;
      return null;
    }
    
    console.log('FIREBASE DB IS INITIALIZED, PROCEEDING WITH FETCH');
    
    // Get the document reference
    const docRef = doc(db, 'optimizedRoutes', routeId);
    console.log('FIREBASE DOCUMENT REFERENCE CREATED:', docRef);
    
    // Get the document
    console.log('STARTING FIREBASE DOCUMENT FETCH...');
    const startTime = performance.now();
    const docSnap = await getDoc(docRef);
    const endTime = performance.now();
    const loadTime = (endTime - startTime).toFixed(2);
    console.log(`FIREBASE DOCUMENT FETCH COMPLETED IN ${loadTime}ms`);
    
    // Check if the document exists
    if (docSnap.exists()) {
      console.log('=================================================================');
      console.log(`✅✅✅ FIREBASE FOUND DATA FOR ROUTE: ${routeId} ✅✅✅`);
      console.log(`✅✅✅ LOADED IN: ${loadTime}ms ✅✅✅`);
      console.log('=================================================================');
      
      const data = docSnap.data();
      console.log('FIREBASE DATA STRUCTURE:', Object.keys(data));
      
      // Update status
      firebaseStatus.isLoading = false;
      firebaseStatus.success = true;
      firebaseStatus.lastLoadTime = loadTime;
      
      // Check if the data is stored as a string (new format) or as an object (old format)
      if (data.dataString) {
        console.log('FIREBASE DATA FORMAT: String format (dataString)');
        console.log(`FIREBASE DATA SIZE: ${(data.dataString.length / 1024).toFixed(2)} KB`);
        
        try {
          // Parse the stringified data
          console.log('PARSING FIREBASE STRING DATA...');
          const parsedData = JSON.parse(data.dataString);
          console.log('=================================================================');
          console.log('✅✅✅ FIREBASE DATA PARSED SUCCESSFULLY ✅✅✅');
          console.log('=================================================================');
          
          // Log some data properties to verify content
          if (parsedData) {
            console.log('FIREBASE PARSED DATA PROPERTIES:', 
              Object.keys(parsedData).slice(0, 10).join(', '));
            
            if (parsedData.name) {
              console.log('FIREBASE ROUTE NAME:', parsedData.name);
            }
            
            if (parsedData.persistentId) {
              console.log('FIREBASE ROUTE PERSISTENT ID:', parsedData.persistentId);
            }
          }
          
          return parsedData;
        } catch (parseError) {
          console.log('=================================================================');
          console.log('❌❌❌ FIREBASE ERROR PARSING DATA ❌❌❌');
          console.log('ERROR:', parseError.message);
          console.log('=================================================================');
          
          firebaseStatus.error = 'Error parsing data';
          firebaseStatus.success = false;
          return null;
        }
      } else if (data.data) {
        // Old format - data stored directly in data field
        console.log('FIREBASE DATA FORMAT: Direct object format (data)');
        console.log('FIREBASE DATA PROPERTIES:', 
          Object.keys(data.data).slice(0, 10).join(', '));
        return data.data;
      }
      
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NO VALID DATA FORMAT FOUND ❌❌❌');
      console.log('=================================================================');
      
      firebaseStatus.error = 'Invalid data format';
      firebaseStatus.success = false;
      return null;
    } else {
      console.log('=================================================================');
      console.log(`❌❌❌ FIREBASE NO DATA FOUND FOR ROUTE: ${routeId} ❌❌❌`);
      console.log('=================================================================');
      
      firebaseStatus.isLoading = false;
      firebaseStatus.success = false;
      firebaseStatus.error = 'Document not found';
      return null;
    }
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR GETTING OPTIMIZED DATA ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    
    firebaseStatus.isLoading = false;
    firebaseStatus.success = false;
    firebaseStatus.error = error.message;
    return null;
  }
};

/**
 * Check if optimized route data exists in Firebase
 * @param {string} routeId - The persistent ID of the route
 * @returns {Promise<boolean>} - True if the data exists, false otherwise
 */
export const hasOptimizedRouteData = async (routeId) => {
  try {
    // Update loading status
    firebaseStatus.isLoading = true;
    firebaseStatus.lastLoadedRoute = routeId;
    firebaseStatus.error = null;
    
    console.log('=================================================================');
    console.log(`🔍🔍🔍 FIREBASE CHECKING IF ROUTE EXISTS: ${routeId} 🔍🔍🔍`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING CHECK ❌❌❌');
      console.log('=================================================================');
      
      firebaseStatus.isLoading = false;
      firebaseStatus.error = 'Firebase not initialized';
      firebaseStatus.success = false;
      return false;
    }
    
    console.log('FIREBASE DB IS INITIALIZED, PROCEEDING WITH CHECK');
    
    // Get the document reference
    const docRef = doc(db, 'optimizedRoutes', routeId);
    console.log('FIREBASE DOCUMENT REFERENCE CREATED FOR CHECK:', docRef);
    
    // Get the document
    console.log('STARTING FIREBASE DOCUMENT CHECK...');
    const startTime = performance.now();
    const docSnap = await getDoc(docRef);
    const endTime = performance.now();
    const checkTime = (endTime - startTime).toFixed(2);
    console.log(`FIREBASE DOCUMENT CHECK COMPLETED IN ${checkTime}ms`);
    
    // Update status
    firebaseStatus.isLoading = false;
    firebaseStatus.success = docSnap.exists();
    firebaseStatus.lastLoadTime = checkTime;
    
    if (docSnap.exists()) {
      console.log('=================================================================');
      console.log(`✅✅✅ FIREBASE ROUTE DATA EXISTS (checked in ${checkTime}ms) ✅✅✅`);
      console.log('=================================================================');
    } else {
      console.log('=================================================================');
      console.log(`❌❌❌ FIREBASE ROUTE DATA DOES NOT EXIST (checked in ${checkTime}ms) ❌❌❌`);
      console.log('=================================================================');
    }
    
    // Return true if the document exists
    return docSnap.exists();
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR CHECKING OPTIMIZED DATA ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    
    firebaseStatus.isLoading = false;
    firebaseStatus.success = false;
    firebaseStatus.error = error.message;
    return false;
  }
};

/**
 * Get the current Firebase data loading status
 * @returns {Object} - The current status object
 */
export const getFirebaseStatus = () => {
  console.log('FIREBASE STATUS REQUESTED:', { ...firebaseStatus });
  return { ...firebaseStatus };
};

export default {
  getOptimizedRouteData,
  hasOptimizedRouteData,
  getFirebaseStatus
};
