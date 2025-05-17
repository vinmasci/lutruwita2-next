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
 * Get optimized route data from Firebase using route-centric hierarchical structure
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
    
    // Load from route-centric hierarchical structure
    console.log('LOADING FROM ROUTE-CENTRIC STRUCTURE...');
    
    // 1. Get route metadata
    const metadataRef = doc(db, 'routes', firebaseRouteId, 'metadata', 'info');
    const metadataSnap = await getDoc(metadataRef);
    
    if (!metadataSnap.exists()) {
      console.log('=================================================================');
      console.log(`❌❌❌ FIREBASE NO ROUTE METADATA FOUND FOR ROUTE: ${routeId} ❌❌❌`);
      console.log(`❌❌❌ FIREBASE ROUTE ID USED: ${firebaseRouteId} ❌❌❌`);
      console.log('=================================================================');
      
      firebaseStatus.isLoading = false;
      firebaseStatus.success = false;
      firebaseStatus.error = 'Route metadata not found';
      return null;
    }
    
    console.log('FOUND ROUTE METADATA IN ROUTE-CENTRIC STRUCTURE');
    
    // 2. Get route GeoJSON data
    const geojsonRef = doc(db, 'routes', firebaseRouteId, 'geojson', 'routes');
    const geojsonSnap = await getDoc(geojsonRef);
    
    // 3. Get POIs
    const poisRef = doc(db, 'routes', firebaseRouteId, 'pois', 'data');
    const poisSnap = await getDoc(poisRef);
    
    // 4. Get lines
    const linesRef = doc(db, 'routes', firebaseRouteId, 'lines', 'data');
    const linesSnap = await getDoc(linesRef);
    
    // 5. Get photos metadata
    const photosRef = doc(db, 'routes', firebaseRouteId, 'photos', 'data');
    const photosSnap = await getDoc(photosRef);
    
    // 6. Load route coordinates if needed
    const geojsonData = geojsonSnap.exists() ? geojsonSnap.data() : { routes: [] };
    const routes = geojsonData.routes || [];
    
    // Check if any route segments need coordinates loaded
    for (const route of routes) {
      if (route.geojson?.features?.[0]?.geometry?.coordinates?.length === 0) {
        console.log(`Loading coordinates for route segment: ${route.name || 'unnamed'}`);
        
        // First try to load all coordinates at once from the 'all' document
        const allCoordsRef = doc(db, 'routes', firebaseRouteId, 'coordinates', 'all');
        const allCoordsSnap = await getDoc(allCoordsRef);
        
        if (allCoordsSnap.exists()) {
          // Use the single document with all coordinates
          const allCoords = allCoordsSnap.data().coordinates || [];
          route.geojson.features[0].geometry.coordinates = allCoords;
          console.log(`Loaded ${allCoords.length} coordinates from single document`);
        } else {
          // Fall back to loading from chunks directly in the coordinates collection
          const chunksQuery = query(
            collection(db, 'routes', firebaseRouteId, 'coordinates'),
            where(FieldPath.documentId(), '>=', 'chunk_'),
            where(FieldPath.documentId(), '<=', 'chunk_~'),
            orderBy(FieldPath.documentId())
          );
          
          const chunksSnap = await getDocs(chunksQuery);
          
          // Reassemble coordinates from chunks
          const allCoordinates = [];
          const chunks = [];
          
          chunksSnap.forEach(chunkDoc => {
            const chunkData = chunkDoc.data();
            chunks[chunkData.index] = chunkData;
          });
          
          // Ensure chunks are in the correct order
          for (let i = 0; i < chunks.length; i++) {
            if (chunks[i] && chunks[i].coordinates) {
              allCoordinates.push(...chunks[i].coordinates);
            }
          }
          
                // Set coordinates in the route
                if (allCoordinates.length > 0) {
                  route.geojson.features[0].geometry.coordinates = allCoordinates;
                  console.log(`Loaded ${allCoordinates.length} coordinates from ${chunks.length} chunks`);
                }
                
                // Ensure the route has the elevation data in the expected format
                if (route.surface && route.surface.elevationProfile && route.surface.elevationProfile.length > 0) {
                  // Make sure properties and coordinateProperties exist
                  if (!route.geojson.features[0].properties) {
                    route.geojson.features[0].properties = {};
                  }
                  if (!route.geojson.features[0].properties.coordinateProperties) {
                    route.geojson.features[0].properties.coordinateProperties = {};
                  }
                  
                  // Extract just the elevation values
                  const elevations = route.surface.elevationProfile.map(point => point.elevation);
                  route.geojson.features[0].properties.coordinateProperties.elevation = elevations;
                  console.log(`Added ${elevations.length} elevation points from surface.elevationProfile`);
                }
        }
      }
    }
    
    // Calculate load time
    const endTime = performance.now();
    const loadTime = (endTime - startTime).toFixed(2);
    
    // Combine all data
    const metadata = metadataSnap.data() || {};
    const poisData = poisSnap.exists() ? poisSnap.data() : { draggable: [], places: [] };
    const linesData = linesSnap.exists() ? linesSnap.data() : { lines: [] };
    const photosData = photosSnap.exists() ? photosSnap.data() : { photos: [] };
    
    // Only log lines data in development mode
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'development') {
      console.log(`[Firebase] Lines data for route ${routeId}: ${linesData.lines ? linesData.lines.length : 0} lines`);
    }
    
    // Construct the combined data object
    const combinedData = {
      persistentId: routeId,
      name: metadata.name,
      type: metadata.type,
      isPublic: metadata.isPublic,
      userId: metadata.userId,
      eventDate: metadata.eventDate,
      headerSettings: metadata.headerSettings,
      mapState: metadata.mapState,
      mapOverview: metadata.mapOverview,
      staticMapUrl: metadata.staticMapUrl,
      staticMapPublicId: metadata.staticMapPublicId,
      routes: routes,
      pois: poisData,
      lines: linesData.lines || [],
      photos: photosData.photos || [],
      _type: 'loaded',
      _loadedState: {
        name: metadata.name,
        type: metadata.type,
        eventDate: metadata.eventDate,
        pois: poisData,
        lines: linesData.lines || [],
        photos: photosData.photos || [],
        headerSettings: metadata.headerSettings,
        mapOverview: metadata.mapOverview,
        staticMapUrl: metadata.staticMapUrl,
        staticMapPublicId: metadata.staticMapPublicId
      }
    };
    
    console.log('=================================================================');
    console.log(`✅✅✅ FIREBASE LOADED ROUTE-CENTRIC DATA FOR ROUTE: ${routeId} ✅✅✅`);
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
    
    // Check route-centric structure
    console.log('CHECKING ROUTE-CENTRIC STRUCTURE...');
    
    // Check for route metadata (the most essential part)
    const metadataRef = doc(db, 'routes', firebaseRouteId, 'metadata', 'info');
    const metadataSnap = await getDoc(metadataRef);
    
    const endTime = performance.now();
    const checkTime = (endTime - startTime).toFixed(2);
    
    // Update status
    firebaseStatus.isLoading = false;
    firebaseStatus.success = metadataSnap.exists();
    firebaseStatus.lastLoadTime = checkTime;
    
    if (metadataSnap.exists()) {
      console.log('=================================================================');
      console.log(`✅✅✅ FIREBASE ROUTE DATA EXISTS IN ROUTE-CENTRIC STRUCTURE (checked in ${checkTime}ms) ✅✅✅`);
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
