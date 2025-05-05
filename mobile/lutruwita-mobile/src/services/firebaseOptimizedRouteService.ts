/**
 * Firebase Optimized Route Service
 * 
 * This service handles fetching and storing optimized route data in Firebase.
 * It provides a way to access pre-processed route data directly from Firebase,
 * which can improve performance and enable offline access.
 */

import { firebase, firestore } from './firebaseService';

// SUPER VISIBLE LOGS FOR DEBUGGING
console.log('=================================================================');
console.log('🔥🔥🔥 FIREBASE MOBILE SERVICE LOADED 🔥🔥🔥');
console.log('=================================================================');

// Global state to track Firebase data loading status
export interface FirebaseStatus {
  isLoading: boolean;
  lastLoadedRoute: string | null;
  lastLoadTime: number | null;
  success: boolean;
  error: string | null;
}

// Initialize status object
export const firebaseStatus: FirebaseStatus = {
  isLoading: false,
  lastLoadedRoute: null,
  lastLoadTime: null,
  success: false,
  error: null
};

// Log the initial status
console.log('FIREBASE MOBILE STATUS INITIALIZED:', firebaseStatus);

/**
 * Get optimized route data from Firebase
 * @param routeId The persistent ID of the route
 * @returns The optimized route data or null if not found
 */
export const getOptimizedRouteData = async (routeId: string) => {
  try {
    // Update loading status
    firebaseStatus.isLoading = true;
    firebaseStatus.lastLoadedRoute = routeId;
    firebaseStatus.error = null;
    
    // SUPER VISIBLE LOGGING
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE MOBILE LOADING ROUTE: ${routeId} 🔄🔄🔄`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!firestore) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE MOBILE NOT INITIALIZED, SKIPPING FETCH ❌❌❌');
      console.log('=================================================================');
      
      firebaseStatus.isLoading = false;
      firebaseStatus.error = 'Firebase not initialized';
      firebaseStatus.success = false;
      return null;
    }
    
    console.log('FIREBASE MOBILE DB IS INITIALIZED, PROCEEDING WITH FETCH');
    
    const startTime = Date.now();
    console.log('FIREBASE MOBILE CREATING DOCUMENT REFERENCE...');
    const docRef = firestore().collection('optimizedRoutes').doc(routeId);
    console.log('FIREBASE MOBILE DOCUMENT REFERENCE CREATED:', docRef.path);
    
    console.log('FIREBASE MOBILE STARTING DOCUMENT FETCH...');
    const docSnapshot = await docRef.get();
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    console.log(`FIREBASE MOBILE DOCUMENT FETCH COMPLETED IN ${loadTime}ms`);
    
    // Update status with load time
    firebaseStatus.lastLoadTime = loadTime;
    
    if (docSnapshot.exists) {
      console.log('=================================================================');
      console.log(`✅✅✅ FIREBASE MOBILE FOUND DATA FOR ROUTE: ${routeId} ✅✅✅`);
      console.log(`✅✅✅ LOADED IN: ${loadTime}ms ✅✅✅`);
      console.log('=================================================================');
      
      // Update status
      firebaseStatus.isLoading = false;
      firebaseStatus.success = true;
      
      const data = docSnapshot.data()?.data;
      
      // Log data details
      if (data) {
        const dataSize = JSON.stringify(data).length;
        console.log(`FIREBASE MOBILE DATA SIZE: ${(dataSize / 1024).toFixed(2)} KB`);
        console.log('FIREBASE MOBILE DATA PROPERTIES:', Object.keys(data).slice(0, 10).join(', '));
        
        if (data.name) {
          console.log('FIREBASE MOBILE ROUTE NAME:', data.name);
        }
        
        if (data.persistentId) {
          console.log('FIREBASE MOBILE ROUTE PERSISTENT ID:', data.persistentId);
        }
      } else {
        console.log('FIREBASE MOBILE DATA IS NULL OR UNDEFINED');
      }
      
      return data;
    }
    
    console.log('=================================================================');
    console.log(`❌❌❌ FIREBASE MOBILE NO DATA FOUND FOR ROUTE: ${routeId} ❌❌❌`);
    console.log('=================================================================');
    
    // Update status
    firebaseStatus.isLoading = false;
    firebaseStatus.success = false;
    firebaseStatus.error = 'Document not found';
    
    return null;
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE MOBILE ERROR GETTING OPTIMIZED DATA ❌❌❌');
    console.log('ERROR:', error instanceof Error ? error.message : 'Unknown error');
    console.log('=================================================================');
    
    // Update status
    firebaseStatus.isLoading = false;
    firebaseStatus.success = false;
    firebaseStatus.error = error instanceof Error ? error.message : 'Unknown error';
    
    return null;
  }
};

/**
 * Save optimized route data to Firebase
 * @param routeId The persistent ID of the route
 * @param data The optimized route data to save
 * @returns True if successful, false otherwise
 */
export const saveOptimizedRouteData = async (routeId: string, data: any): Promise<boolean> => {
  try {
    // Update loading status
    firebaseStatus.isLoading = true;
    firebaseStatus.lastLoadedRoute = routeId;
    firebaseStatus.error = null;
    
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE MOBILE SAVING ROUTE: ${routeId} 🔄🔄🔄`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!firestore) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE MOBILE NOT INITIALIZED, SKIPPING SAVE ❌❌❌');
      console.log('=================================================================');
      
      firebaseStatus.isLoading = false;
      firebaseStatus.error = 'Firebase not initialized';
      firebaseStatus.success = false;
      return false;
    }
    
    // Log data size
    const dataSize = JSON.stringify(data).length;
    console.log(`FIREBASE MOBILE DATA SIZE TO SAVE: ${(dataSize / 1024).toFixed(2)} KB`);
    
    if (data) {
      console.log('FIREBASE MOBILE DATA PROPERTIES TO SAVE:', Object.keys(data).slice(0, 10).join(', '));
      
      if (data.name) {
        console.log('FIREBASE MOBILE ROUTE NAME TO SAVE:', data.name);
      }
      
      if (data.persistentId) {
        console.log('FIREBASE MOBILE ROUTE PERSISTENT ID TO SAVE:', data.persistentId);
      }
    }
    
    console.log('FIREBASE MOBILE CREATING DOCUMENT REFERENCE FOR SAVE...');
    const startTime = Date.now();
    const docRef = firestore().collection('optimizedRoutes').doc(routeId);
    console.log('FIREBASE MOBILE DOCUMENT REFERENCE CREATED:', docRef.path);
    
    console.log('FIREBASE MOBILE STARTING DOCUMENT SAVE...');
    await docRef.set({
      data,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      version: 1 // Initial version
    });
    
    const endTime = Date.now();
    const saveTime = endTime - startTime;
    console.log(`FIREBASE MOBILE DOCUMENT SAVE COMPLETED IN ${saveTime}ms`);
    
    // Update status
    firebaseStatus.isLoading = false;
    firebaseStatus.success = true;
    firebaseStatus.lastLoadTime = saveTime;
    
    console.log('=================================================================');
    console.log(`✅✅✅ FIREBASE MOBILE SAVED DATA FOR ROUTE: ${routeId} ✅✅✅`);
    console.log(`✅✅✅ SAVED IN: ${saveTime}ms ✅✅✅`);
    console.log('=================================================================');
    
    return true;
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE MOBILE ERROR SAVING OPTIMIZED DATA ❌❌❌');
    console.log('ERROR:', error instanceof Error ? error.message : 'Unknown error');
    console.log('=================================================================');
    
    // Update status
    firebaseStatus.isLoading = false;
    firebaseStatus.success = false;
    firebaseStatus.error = error instanceof Error ? error.message : 'Unknown error';
    
    return false;
  }
};

/**
 * Check if optimized route data exists in Firebase
 * @param routeId The persistent ID of the route
 * @returns True if the data exists, false otherwise
 */
export const hasOptimizedRouteData = async (routeId: string): Promise<boolean> => {
  try {
    // Update loading status
    firebaseStatus.isLoading = true;
    firebaseStatus.lastLoadedRoute = routeId;
    firebaseStatus.error = null;
    
    console.log('=================================================================');
    console.log(`🔍🔍🔍 FIREBASE MOBILE CHECKING IF ROUTE EXISTS: ${routeId} 🔍🔍🔍`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!firestore) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE MOBILE NOT INITIALIZED, SKIPPING CHECK ❌❌❌');
      console.log('=================================================================');
      
      firebaseStatus.isLoading = false;
      firebaseStatus.error = 'Firebase not initialized';
      firebaseStatus.success = false;
      return false;
    }
    
    console.log('FIREBASE MOBILE CREATING DOCUMENT REFERENCE FOR CHECK...');
    const startTime = Date.now();
    const docRef = firestore().collection('optimizedRoutes').doc(routeId);
    console.log('FIREBASE MOBILE DOCUMENT REFERENCE CREATED:', docRef.path);
    
    console.log('FIREBASE MOBILE STARTING DOCUMENT CHECK...');
    const docSnapshot = await docRef.get();
    const endTime = Date.now();
    const checkTime = endTime - startTime;
    console.log(`FIREBASE MOBILE DOCUMENT CHECK COMPLETED IN ${checkTime}ms`);
    
    // Update status
    firebaseStatus.isLoading = false;
    firebaseStatus.success = docSnapshot.exists;
    firebaseStatus.lastLoadTime = checkTime;
    
    if (docSnapshot.exists) {
      console.log('=================================================================');
      console.log(`✅✅✅ FIREBASE MOBILE ROUTE DATA EXISTS (checked in ${checkTime}ms) ✅✅✅`);
      console.log('=================================================================');
    } else {
      console.log('=================================================================');
      console.log(`❌❌❌ FIREBASE MOBILE ROUTE DATA DOES NOT EXIST (checked in ${checkTime}ms) ❌❌❌`);
      console.log('=================================================================');
    }
    
    return docSnapshot.exists;
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE MOBILE ERROR CHECKING OPTIMIZED DATA ❌❌❌');
    console.log('ERROR:', error instanceof Error ? error.message : 'Unknown error');
    console.log('=================================================================');
    
    // Update status
    firebaseStatus.isLoading = false;
    firebaseStatus.success = false;
    firebaseStatus.error = error instanceof Error ? error.message : 'Unknown error';
    
    return false;
  }
};

/**
 * Get the current Firebase data loading status
 * @returns The current status object
 */
export const getFirebaseStatus = (): FirebaseStatus => {
  console.log('FIREBASE MOBILE STATUS REQUESTED:', { ...firebaseStatus });
  return { ...firebaseStatus };
};
