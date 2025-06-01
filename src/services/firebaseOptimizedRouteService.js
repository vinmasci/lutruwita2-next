/**
 * Firebase Optimized Route Service
 * 
 * This service handles loading optimized route data from Firebase.
 * It provides functions to fetch pre-processed route data that was saved to Firebase
 * by the API server during the save process.
 */

import { db } from './firebaseService';
import { collection, doc, getDoc, getDocs, query, where, orderBy, FieldPath } from 'firebase/firestore';

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
 * Get optimized route data from Firebase using user-centric hierarchical structure
 * @param {string} routeId - The persistent ID of the route
 * @returns {Promise<Object|null>} - The optimized route data or null if not found
 */
export const getOptimizedRouteData = async (routeId) => {
  try {
    // Update loading status
    firebaseStatus.isLoading = true;
    firebaseStatus.lastLoadedRoute = routeId;
    firebaseStatus.error = null;
    
    // Extract the UUID part if the routeId is in the format "route-{uuid}"
    const firebaseRouteId = routeId.startsWith('route-') ? routeId.substring(6) : routeId;
    
    // SUPER VISIBLE LOGGING
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE LOADING ROUTE: ${routeId} 🔄🔄🔄`);
    console.log(`🔄🔄🔄 FIREBASE ROUTE ID: ${firebaseRouteId} 🔄🔄🔄`);
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
    
    // Start timing
    const startTime = performance.now();
    
    // Load from user-centric hierarchical structure (user_saved_routes)
    console.log('LOADING FROM USER-CENTRIC STRUCTURE (user_saved_routes)...');
    
    // 1. Get route metadata and segments from routes collection
    const routesRef = doc(db, 'user_saved_routes', firebaseRouteId, 'data', 'routes');
    const routesSnap = await getDoc(routesRef);
    
    if (!routesSnap.exists()) {
      console.log('=================================================================');
      console.log(`❌❌❌ FIREBASE NO ROUTE DATA FOUND FOR ROUTE: ${routeId} ❌❌❌`);
      console.log(`❌❌❌ FIREBASE ROUTE ID USED: ${firebaseRouteId} ❌❌❌`);
      console.log('=================================================================');
      
      firebaseStatus.isLoading = false;
      firebaseStatus.success = false;
      firebaseStatus.error = 'Route data not found';
      return null;
    }
    
    console.log('FOUND ROUTE DATA IN USER-CENTRIC STRUCTURE');
    
    // Get the master route document for metadata
    const masterRouteRef = doc(db, 'user_saved_routes', firebaseRouteId);
    const masterRouteSnap = await getDoc(masterRouteRef);
    
    // 2. Get POIs from the correct user-centric path
    const poisRef = doc(db, 'user_saved_routes', firebaseRouteId, 'data', 'pois');
    const poisSnap = await getDoc(poisRef);
    
    // 3. Get lines from the correct user-centric path
    const linesRef = doc(db, 'user_saved_routes', firebaseRouteId, 'data', 'lines');
    const linesSnap = await getDoc(linesRef);
    
    // 4. Get photos metadata from the correct user-centric path
    const photosRef = doc(db, 'user_saved_routes', firebaseRouteId, 'data', 'photos');
    const photosSnap = await getDoc(photosRef);
    
    // 5. Process route segments data
    const routesData = routesSnap.exists() ? routesSnap.data() : { data: [] };
    const routes = routesData.data || [];
    
    // 6. Load route coordinates if needed from user_saved_routes structure
    for (const route of routes) {
      if (route.routeId && (!route.geojson?.features?.[0]?.geometry?.coordinates || route.geojson.features[0].geometry.coordinates.length === 0)) {
        console.log(`Loading coordinates for route segment: ${route.name || 'unnamed'} (${route.routeId})`);
        
        // Load coordinates from the route-specific collection under user_saved_routes
        const coordsRef = doc(db, 'user_saved_routes', firebaseRouteId, 'routes', route.routeId, 'data', 'coords');
        const coordsSnap = await getDoc(coordsRef);
        
        if (coordsSnap.exists()) {
          const coordsData = coordsSnap.data();
          const coordinates = coordsData.data || [];
          
          // Ensure route has proper geojson structure
          if (!route.geojson) {
            route.geojson = {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: []
                },
                properties: {}
              }]
            };
          }
          
          // Convert coordinate objects to arrays if needed
          const processedCoords = coordinates.map(coord => {
            if (coord.lat !== undefined && coord.lng !== undefined) {
              // Convert {lat, lng, elevation} to [lng, lat, elevation] array
              return coord.elevation !== undefined ? [coord.lng, coord.lat, coord.elevation] : [coord.lng, coord.lat];
            }
            return coord; // Already in array format
          });
          
          route.geojson.features[0].geometry.coordinates = processedCoords;
          console.log(`Loaded ${processedCoords.length} coordinates for route segment ${route.routeId}`);
        } else {
          console.warn(`No coordinates found for route segment ${route.routeId}`);
        }
      }
    }
    
    // Calculate load time
    const endTime = performance.now();
    const loadTime = (endTime - startTime).toFixed(2);
    
    // Get master route metadata
    const masterMetadata = masterRouteSnap.exists() ? masterRouteSnap.data() : {};
    
    // Combine POI data - handle the nested structure properly
    let poisData = { draggable: [], places: [] };
    if (poisSnap.exists()) {
      const rawPoisData = poisSnap.data();
      console.log('🔍 RAW POI DATA FROM FIREBASE:', rawPoisData);
      
      // Handle the nested data structure from user_saved_routes
      if (rawPoisData.data && rawPoisData.data.draggable) {
        poisData.draggable = rawPoisData.data.draggable;
        console.log(`✅ LOADED ${poisData.draggable.length} POIs from Firebase`);
      } else if (rawPoisData.draggable) {
        // Direct structure
        poisData.draggable = rawPoisData.draggable;
        console.log(`✅ LOADED ${poisData.draggable.length} POIs from Firebase (direct structure)`);
      }
      
      if (rawPoisData.data && rawPoisData.data.places) {
        poisData.places = rawPoisData.data.places;
      } else if (rawPoisData.places) {
        poisData.places = rawPoisData.places;
      }
    } else {
      console.log('❌ NO POI DATA FOUND IN FIREBASE');
    }
    
    // Combine lines data - handle the nested structure properly
    let linesData = [];
    if (linesSnap.exists()) {
      const rawLinesData = linesSnap.data();
      console.log('🔍 RAW LINES DATA FROM FIREBASE:', rawLinesData);
      
      // Handle the nested data structure from user_saved_routes
      if (rawLinesData.data && Array.isArray(rawLinesData.data)) {
        linesData = rawLinesData.data;
        console.log(`✅ LOADED ${linesData.length} lines from Firebase`);
      } else if (Array.isArray(rawLinesData)) {
        // Direct array structure
        linesData = rawLinesData;
        console.log(`✅ LOADED ${linesData.length} lines from Firebase (direct structure)`);
      }
    } else {
      console.log('❌ NO LINES DATA FOUND IN FIREBASE');
    }
    
    // Combine photos data - handle the nested structure properly
    let photosData = [];
    if (photosSnap.exists()) {
      const rawPhotosData = photosSnap.data();
      console.log('🔍 RAW PHOTOS DATA FROM FIREBASE:', rawPhotosData);
      
      // Handle the nested data structure from user_saved_routes
      if (rawPhotosData.data && Array.isArray(rawPhotosData.data)) {
        photosData = rawPhotosData.data;
        console.log(`✅ LOADED ${photosData.length} photos from Firebase`);
      } else if (Array.isArray(rawPhotosData)) {
        // Direct array structure
        photosData = rawPhotosData;
        console.log(`✅ LOADED ${photosData.length} photos from Firebase (direct structure)`);
      }
    } else {
      console.log('❌ NO PHOTOS DATA FOUND IN FIREBASE');
    }
    
    // Only log lines data in development mode
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'development') {
      console.log(`[Firebase] Lines data for route ${routeId}: ${linesData.length} lines`);
    }
    
    // Construct the combined data object
    let descriptionValue = '';
    if (masterMetadata.description) {
        if (typeof masterMetadata.description === 'object' && masterMetadata.description.description) {
            descriptionValue = masterMetadata.description.description;
            console.warn('[firebaseOptimizedRouteService] Loaded nested description object, extracting string value. Consider data migration.');
        } else if (typeof masterMetadata.description === 'string') {
            descriptionValue = masterMetadata.description;
        }
    }

    const combinedData = {
      persistentId: routeId,
      name: masterMetadata.name,
      description: descriptionValue, // Use extracted string value
      type: masterMetadata.type,
      isPublic: masterMetadata.isPublic,
      userId: masterMetadata.userId,
      eventDate: masterMetadata.eventDate,
      headerSettings: masterMetadata.headerSettings,
      mapState: masterMetadata.mapState,
      mapOverview: masterMetadata.mapOverview,
      staticMapUrl: masterMetadata.staticMapUrl,
      staticMapPublicId: masterMetadata.staticMapPublicId,
      routes: routes,
      pois: poisData,
      lines: linesData,
      photos: photosData,
      _type: 'loaded',
      _loadedState: {
        name: masterMetadata.name,
        description: descriptionValue, // Use extracted string value
        type: masterMetadata.type,
        eventDate: masterMetadata.eventDate,
        pois: poisData,
        lines: linesData,
        photos: photosData,
        headerSettings: masterMetadata.headerSettings,
        mapOverview: masterMetadata.mapOverview,
        staticMapUrl: masterMetadata.staticMapUrl,
        staticMapPublicId: masterMetadata.staticMapPublicId
      }
    };
    
    console.log('=================================================================');
    console.log(`✅✅✅ FIREBASE LOADED USER-CENTRIC DATA FOR ROUTE: ${routeId} ✅✅✅`);
    console.log(`✅✅✅ LOADED ${poisData.draggable.length} POIs, ${linesData.length} lines, ${photosData.length} photos ✅✅✅`);
    console.log(`✅✅✅ LOADED IN: ${loadTime}ms ✅✅✅`);
    console.log('=================================================================');
    
    // Update status
    firebaseStatus.isLoading = false;
    firebaseStatus.success = true;
    firebaseStatus.lastLoadTime = loadTime;
    
    return combinedData;
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
    
    // Extract the UUID part if the routeId is in the format "route-{uuid}"
    const firebaseRouteId = routeId.startsWith('route-') ? routeId.substring(6) : routeId;
    
    console.log('=================================================================');
    console.log(`🔍🔍🔍 FIREBASE CHECKING IF ROUTE EXISTS: ${routeId} 🔍🔍🔍`);
    console.log(`🔍🔍🔍 FIREBASE ROUTE ID: ${firebaseRouteId} 🔍🔍🔍`);
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
    
    // Start timing
    const startTime = performance.now();
    
    // Check user-centric structure
    console.log('CHECKING USER-CENTRIC STRUCTURE...');
    
    // Check for route data (the most essential part)
    const routesRef = doc(db, 'user_saved_routes', firebaseRouteId, 'data', 'routes');
    const routesSnap = await getDoc(routesRef);
    
    const endTime = performance.now();
    const checkTime = (endTime - startTime).toFixed(2);
    
    // Update status
    firebaseStatus.isLoading = false;
    firebaseStatus.success = routesSnap.exists();
    firebaseStatus.lastLoadTime = checkTime;
    
    if (routesSnap.exists()) {
      console.log('=================================================================');
      console.log(`✅✅✅ FIREBASE ROUTE DATA EXISTS IN USER-CENTRIC STRUCTURE (checked in ${checkTime}ms) ✅✅✅`);
      console.log('=================================================================');
      return true;
    } else {
      console.log('=================================================================');
      console.log(`❌❌❌ FIREBASE ROUTE DATA DOES NOT EXIST (checked in ${checkTime}ms) ❌❌❌`);
      console.log('=================================================================');
      return false;
    }
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
