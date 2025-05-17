/**
 * Firebase Save Complete Route Service
 * 
 * This service handles saving complete routes permanently to Firebase and maintaining
 * a user route index for easy retrieval of saved routes.
 */

import { db } from './firebaseService';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { loadAutoSaveData } from './firebaseGpxAutoSaveService';
import { generateStaticMapImage } from '../utils/staticMapUtils';

// Global state to track Firebase save status
export const firebaseSaveRouteStatus = {
  isLoading: false,
  lastSavedRouteId: null,
  lastSaveTime: null,
  success: false,
  error: null
};

/**
 * Calculate route summary data for the index
 * @param {Array} routes - Array of route objects
 * @returns {Object} Summary data including distance, elevation, etc.
 */
const calculateRouteSummary = (routes) => {
  if (!routes || routes.length === 0) return null;

  // Initialize summary data
  let totalDistance = 0;
  let totalAscent = 0;
  let totalUnpavedDistance = 0;
  let totalRouteDistance = 0;
  let isLoop = true;
  const countries = new Set(['Australia']); // Default country
  const states = new Set();
  const lgas = new Set();

  // Variables to store first and last points for overall loop check
  let firstRouteStart = null;
  let lastRouteEnd = null;

  // Calculate totals from all routes
  routes.forEach((route, index) => {
    // Distance
    const distance = route.statistics?.totalDistance || 0;
    totalDistance += distance;
    totalRouteDistance += distance;

    // Elevation
    const ascent = route.statistics?.elevationGain || 0;
    totalAscent += ascent;

    // Unpaved sections
    const unpavedPercentage = route.unpavedSections?.length > 0 ? 10 : 0; // Simplified calculation
    totalUnpavedDistance += (distance * unpavedPercentage / 100);

    // Get coordinates for loop check
    if (route.geojson?.features?.[0]?.geometry?.coordinates) {
      const coordinates = route.geojson.features[0].geometry.coordinates;
      if (coordinates.length > 1) {
        // Store first route's start point
        if (index === 0) {
          firstRouteStart = coordinates[0];
        }

        // Store last route's end point
        if (index === routes.length - 1) {
          lastRouteEnd = coordinates[coordinates.length - 1];
        }

        // Individual route loop check
        const start = coordinates[0];
        const end = coordinates[coordinates.length - 1];

        // Calculate distance between start and end points
        const dx = (end[0] - start[0]) * Math.cos((start[1] + end[1]) / 2 * Math.PI / 180);
        const dy = end[1] - start[1];
        const distance = Math.sqrt(dx * dx + dy * dy) * 111.32 * 1000; // approx meters

        // Check if this individual route is a loop (using 5km threshold)
        const isRouteLoop = distance < 5000;

        // For a single route, set isLoop based on this route's loop status
        if (routes.length === 1) {
          isLoop = isRouteLoop;
        }
        // For multiple routes, only set isLoop to false if this route isn't a loop
        // (we'll check multi-route loops later)
        else if (!isRouteLoop) {
          isLoop = false;
        }
      }
    }

    // Location data
    if (route.metadata) {
      if (route.metadata.country) countries.add(route.metadata.country);
      if (route.metadata.state) states.add(route.metadata.state);
      if (route.metadata.lga) lgas.add(route.metadata.lga);
    }
  });

  // Check if the entire collection forms a loop (first route start connects to last route end)
  if (!isLoop && firstRouteStart && lastRouteEnd && routes.length > 1) {
    const dx = (lastRouteEnd[0] - firstRouteStart[0]) * Math.cos((firstRouteStart[1] + lastRouteEnd[1]) / 2 * Math.PI / 180);
    const dy = lastRouteEnd[1] - firstRouteStart[1];
    const distance = Math.sqrt(dx * dx + dy * dy) * 111.32 * 1000; // approx meters

    // If the distance between first route start and last route end is small enough (within 5km), it's a loop
    if (distance < 5000) {
      isLoop = true;
    }
  }

  // Calculate unpaved percentage
  const unpavedPercentage = totalRouteDistance > 0
    ? Math.round((totalUnpavedDistance / totalRouteDistance) * 100)
    : 0;

  return {
    totalDistance: Math.round(totalDistance / 1000 * 10) / 10, // Convert to km with 1 decimal
    totalAscent: Math.round(totalAscent),
    unpavedPercentage,
    isLoop,
    countries: Array.from(countries),
    states: Array.from(states),
    lgas: Array.from(lgas)
  };
};

/**
 * Saves an auto-save as a permanent route
 * @param {string} autoSaveId - The ID of the auto-save to convert
 * @param {string} routeName - The name for the saved route
 * @param {string} userId - The ID of the current user
 * @param {boolean} isPublic - Whether the route should be publicly accessible
 * @param {Array} tags - Optional tags for organization
 * @returns {Promise<string|null>} - The ID of the saved route if successful, null otherwise
 */
export const saveAutoSaveToPermanentRoute = async (autoSaveId, routeName, userId, isPublic = false, tags = []) => {
  try {
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE SAVING PERMANENT ROUTE FROM AUTO-SAVE: ${autoSaveId} 🔄🔄🔄`);
    console.log('=================================================================');
    
    // Update loading status
    firebaseSaveRouteStatus.isLoading = true;
    firebaseSaveRouteStatus.error = null;
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING SAVE ❌❌❌');
      console.log('=================================================================');
      
      firebaseSaveRouteStatus.isLoading = false;
      firebaseSaveRouteStatus.error = 'Firebase not initialized';
      firebaseSaveRouteStatus.success = false;
      return null;
    }
    
    // Start timing
    const startTime = performance.now();
    
    // 1. Load the auto-save data
    console.log(`[firebaseSaveCompleteRouteService] Loading auto-save data for: ${autoSaveId}`);
    const autoSaveData = await loadAutoSaveData(autoSaveId);
    
    if (!autoSaveData) {
      console.error(`[firebaseSaveCompleteRouteService] Auto-save not found: ${autoSaveId}`);
      firebaseSaveRouteStatus.isLoading = false;
      firebaseSaveRouteStatus.error = 'Auto-save not found';
      firebaseSaveRouteStatus.success = false;
      return null;
    }
    
    console.log(`[firebaseSaveCompleteRouteService] Auto-save data loaded successfully`);
    
    // 2. Generate a static map image for the thumbnail
    console.log(`[firebaseSaveCompleteRouteService] Generating static map image for thumbnail`);
    let staticMapResult = null;
    try {
      staticMapResult = await generateStaticMapImage({
        routes: autoSaveData.routesWithData,
        width: 400,
        height: 300,
        style: 'satellite-streets-v12'
      });
      
      console.log(`[firebaseSaveCompleteRouteService] Static map generated successfully`);
      console.log(`[firebaseSaveCompleteRouteService] Thumbnail URL: ${staticMapResult.url}`);
    } catch (error) {
      console.error(`[firebaseSaveCompleteRouteService] Error generating static map:`, error);
      // Continue without a thumbnail if generation fails
    }
    
    // 3. Create a new document in the user_saved_routes collection
    const savedRouteRef = doc(collection(db, 'user_saved_routes'));
    const savedRouteId = savedRouteRef.id;
    
    console.log(`[firebaseSaveCompleteRouteService] Creating new saved route with ID: ${savedRouteId}`);
    
    // Calculate route summary for the index
    const routeSummary = calculateRouteSummary(autoSaveData.routesWithData);
    console.log(`[firebaseSaveCompleteRouteService] Route summary calculated:`, routeSummary);
    
    // 4. Save the main document with metadata
    await setDoc(savedRouteRef, {
      userId,
      name: routeName,
      description: autoSaveData.description || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      statistics: routeSummary || {},
      routeType: autoSaveData.routeType || 'Single',
      headerSettings: autoSaveData.headerSettings || {},
      isPublic,
      tags: tags || [],
      thumbnailUrl: staticMapResult?.url || null,
      thumbnailPublicId: staticMapResult?.publicId || null
    });
    
    console.log(`[firebaseSaveCompleteRouteService] Main document saved successfully`);
    
    // 5. Save routes data
    if (autoSaveData.routes && autoSaveData.routes.length > 0) {
      console.log(`[firebaseSaveCompleteRouteService] Saving ${autoSaveData.routes.length} routes`);
      
      // Save routes metadata
      const routesRef = doc(db, 'user_saved_routes', savedRouteId, 'data', 'routes');
      await setDoc(routesRef, { data: autoSaveData.routes });
      
      console.log(`[firebaseSaveCompleteRouteService] Routes metadata saved successfully`);
      
      // Save each route's data
      for (const route of autoSaveData.routesWithData) {
        const routeId = route.routeId || route.id;
        console.log(`[firebaseSaveCompleteRouteService] Saving data for route: ${routeId}`);
        
        // Save coordinates
        if (route.geojson?.features?.[0]?.geometry?.coordinates) {
          const coordinates = route.geojson.features[0].geometry.coordinates.map(coord => {
            if (Array.isArray(coord) && coord.length >= 2) {
              return {
                lng: coord[0],
                lat: coord[1],
                elevation: coord.length > 2 ? coord[2] : null
              };
            }
            return null;
          }).filter(Boolean);
          
          const coordsRef = doc(db, 'user_saved_routes', savedRouteId, 'routes', routeId, 'data', 'coords');
          await setDoc(coordsRef, { data: coordinates });
          
          console.log(`[firebaseSaveCompleteRouteService] Coordinates saved for route: ${routeId}`);
        }
        
        // Save elevation data
        if (route.geojson?.features?.[0]?.properties?.coordinateProperties?.elevation) {
          const elevation = route.geojson.features[0].properties.coordinateProperties.elevation;
          
          const elevationRef = doc(db, 'user_saved_routes', savedRouteId, 'routes', routeId, 'data', 'elevation');
          await setDoc(elevationRef, { data: elevation });
          
          console.log(`[firebaseSaveCompleteRouteService] Elevation data saved for route: ${routeId}`);
        }
        
        // Save unpaved sections
        if (route.unpavedSections && route.unpavedSections.length > 0) {
          // Transform unpaved sections to match Firestore structure
          const transformedUnpavedSections = route.unpavedSections.map(section => {
            const transformedSection = { 
              startIndex: section.startIndex,
              endIndex: section.endIndex,
              surfaceType: section.surfaceType || 'unpaved'
            };
            
            // Transform coordinates to objects to avoid nested arrays
            if (Array.isArray(section.coordinates)) {
              transformedSection.coordinates = section.coordinates.map(coord => {
                if (Array.isArray(coord)) {
                  return { lng: coord[0], lat: coord[1] };
                }
                return coord;
              });
            }
            
            return transformedSection;
          });
          
          const unpavedRef = doc(db, 'user_saved_routes', savedRouteId, 'routes', routeId, 'data', 'unpaved');
          await setDoc(unpavedRef, { data: transformedUnpavedSections });
          
          console.log(`[firebaseSaveCompleteRouteService] Unpaved sections saved for route: ${routeId}`);
        }
      }
    }
    
    // 6. Save POIs
    if (autoSaveData.pois) {
      console.log(`[firebaseSaveCompleteRouteService] Saving POIs`);
      
      const poisRef = doc(db, 'user_saved_routes', savedRouteId, 'data', 'pois');
      await setDoc(poisRef, { data: autoSaveData.pois });
      
      console.log(`[firebaseSaveCompleteRouteService] POIs saved successfully`);
    }
    
    // 7. Save lines
    if (autoSaveData.lines && autoSaveData.lines.length > 0) {
      console.log(`[firebaseSaveCompleteRouteService] Saving ${autoSaveData.lines.length} lines`);
      
      const linesRef = doc(db, 'user_saved_routes', savedRouteId, 'data', 'lines');
      await setDoc(linesRef, { data: autoSaveData.lines });
      
      console.log(`[firebaseSaveCompleteRouteService] Lines saved successfully`);
    }
    
    // 8. Save map overview if available
    if (autoSaveData.mapOverview) {
      console.log(`[firebaseSaveCompleteRouteService] Saving map overview`);
      
      const mapOverviewRef = doc(db, 'user_saved_routes', savedRouteId, 'data', 'mapOverview');
      await setDoc(mapOverviewRef, { data: autoSaveData.mapOverview });
      
      console.log(`[firebaseSaveCompleteRouteService] Map overview saved successfully`);
    }
    
    // 9. Update the user's route index
    await updateUserRouteIndex(userId, savedRouteId, {
      name: routeName,
      thumbnailUrl: staticMapResult?.url || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      statistics: routeSummary || {},
      tags: tags || [],
      isPublic
    });
    
    console.log(`[firebaseSaveCompleteRouteService] User route index updated successfully`);
    
    // Calculate save time
    const endTime = performance.now();
    const saveTime = (endTime - startTime).toFixed(2);
    
    console.log('=================================================================');
    console.log(`✅✅✅ FIREBASE PERMANENT SAVE COMPLETE FOR ROUTE: ${savedRouteId} ✅✅✅`);
    console.log(`✅✅✅ SAVED IN: ${saveTime}ms ✅✅✅`);
    console.log('=================================================================');
    
    // Update status in global state
    firebaseSaveRouteStatus.isLoading = false;
    firebaseSaveRouteStatus.success = true;
    firebaseSaveRouteStatus.lastSaveTime = saveTime;
    firebaseSaveRouteStatus.lastSavedRouteId = savedRouteId;
    
    // Delete the auto-save after successfully saving the permanent route
    try {
      console.log(`[firebaseSaveCompleteRouteService] Deleting auto-save after successful permanent save: ${autoSaveId}`);
      
      // Import the deleteAutoSaveFromFirebase function
      const { deleteAutoSaveFromFirebase } = await import('./firebaseGpxAutoSaveService');
      
      // Get the route ID from the first route in the auto-save
      const routeId = autoSaveData.routesWithData && autoSaveData.routesWithData.length > 0 
        ? autoSaveData.routesWithData[0].routeId || autoSaveData.routesWithData[0].id
        : null;
        
      if (routeId) {
        const deleteResult = await deleteAutoSaveFromFirebase(routeId, userId);
        if (deleteResult) {
          console.log(`[firebaseSaveCompleteRouteService] Auto-save deleted successfully: ${autoSaveId}`);
        } else {
          console.warn(`[firebaseSaveCompleteRouteService] Failed to delete auto-save: ${autoSaveId}`);
        }
      } else {
        console.warn(`[firebaseSaveCompleteRouteService] No route ID found in auto-save, cannot delete`);
      }
    } catch (deleteError) {
      console.error(`[firebaseSaveCompleteRouteService] Error deleting auto-save:`, deleteError);
      // Continue even if deleting the auto-save fails
    }
    
    return savedRouteId;
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR SAVING PERMANENT ROUTE ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    
    // Update status in global state
    firebaseSaveRouteStatus.isLoading = false;
    firebaseSaveRouteStatus.success = false;
    firebaseSaveRouteStatus.error = error.message;
    
    return null;
  }
};

/**
 * Updates the user's route index with a new or updated route
 * @param {string} userId - The ID of the user
 * @param {string} routeId - The ID of the route
 * @param {Object} routeData - The route data to add to the index
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const updateUserRouteIndex = async (userId, routeId, routeData) => {
  try {
    console.log(`[firebaseSaveCompleteRouteService] Updating user route index for user: ${userId}`);
    
    const userIndexRef = doc(db, 'user_route_index', userId);
    
    // Check if the user index exists
    const userIndexDoc = await getDoc(userIndexRef);
    
    if (userIndexDoc.exists()) {
      // Update existing index
      const existingRoutes = userIndexDoc.data().routes || [];
      
      // Check if this route is already in the index
      const routeIndex = existingRoutes.findIndex(route => route.id === routeId);
      
      if (routeIndex >= 0) {
        // Update existing route
        existingRoutes[routeIndex] = {
          ...existingRoutes[routeIndex],
          ...routeData,
          id: routeId,
          updatedAt: new Date()
        };
        
        console.log(`[firebaseSaveCompleteRouteService] Updating existing route in index: ${routeId}`);
      } else {
        // Add new route
        existingRoutes.push({
          id: routeId,
          ...routeData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`[firebaseSaveCompleteRouteService] Adding new route to index: ${routeId}`);
      }
      
      // Update the document
      await updateDoc(userIndexRef, {
        routes: existingRoutes,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new index
      await setDoc(userIndexRef, {
        userId,
        routes: [{
          id: routeId,
          ...routeData,
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`[firebaseSaveCompleteRouteService] Created new user route index for user: ${userId}`);
    }
    
    return true;
  } catch (error) {
    console.error('[firebaseSaveCompleteRouteService] Error updating user route index:', error);
    return false;
  }
};

/**
 * Gets the user's route index
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} - Array of route index entries
 */
export const getUserRouteIndex = async (userId) => {
  try {
    console.log(`[firebaseSaveCompleteRouteService] Getting route index for user: ${userId}`);
    
    const userIndexRef = doc(db, 'user_route_index', userId);
    const userIndexDoc = await getDoc(userIndexRef);
    
    if (userIndexDoc.exists()) {
      const routes = userIndexDoc.data().routes || [];
      console.log(`[firebaseSaveCompleteRouteService] Found ${routes.length} routes in user index`);
      return routes;
    }
    
    console.log(`[firebaseSaveCompleteRouteService] No route index found for user: ${userId}`);
    return [];
  } catch (error) {
    console.error('[firebaseSaveCompleteRouteService] Error getting user route index:', error);
    return [];
  }
};

/**
 * Loads a saved route
 * @param {string} routeId - The ID of the route to load
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object|null>} - The route data if found, null otherwise
 */
export const loadSavedRoute = async (routeId, userId) => {
  try {
    console.log(`[firebaseSaveCompleteRouteService] Loading saved route: ${routeId}`);
    
    // Get the main route document
    const routeRef = doc(db, 'user_saved_routes', routeId);
    const routeDoc = await getDoc(routeRef);
    
    if (!routeDoc.exists()) {
      console.log(`[firebaseSaveCompleteRouteService] Saved route not found: ${routeId}`);
      return null;
    }
    
    // Check if the user has access to this route
    const routeData = routeDoc.data();
    if (routeData.userId !== userId && !routeData.isPublic) {
      console.error(`[firebaseSaveCompleteRouteService] User ${userId} does not have access to route: ${routeId}`);
      return null;
    }
    
    // Get the route data
    const routeWithData = {
      id: routeDoc.id,
      ...routeData
    };
    
    // Get the routes metadata
    const routesRef = doc(db, 'user_saved_routes', routeId, 'data', 'routes');
    const routesDoc = await getDoc(routesRef);
    
    if (!routesDoc.exists()) {
      console.log(`[firebaseSaveCompleteRouteService] No routes found for saved route: ${routeId}`);
      routeWithData.routes = [];
    } else {
      routeWithData.routes = routesDoc.data().data || [];
    }
    
    // For each route, get the route data
    const routeDataPromises = routeWithData.routes.map(async (route) => {
      const routeId = route.routeId || route.id;
      
      // Get coordinates
      const coordsRef = doc(db, 'user_saved_routes', routeWithData.id, 'routes', routeId, 'data', 'coords');
      const coordsDoc = await getDoc(coordsRef);
      
      // Get elevation
      const elevationRef = doc(db, 'user_saved_routes', routeWithData.id, 'routes', routeId, 'data', 'elevation');
      const elevationDoc = await getDoc(elevationRef);
      
      // Get unpaved sections
      const unpavedRef = doc(db, 'user_saved_routes', routeWithData.id, 'routes', routeId, 'data', 'unpaved');
      const unpavedDoc = await getDoc(unpavedRef);
      
      // Create GeoJSON from coordinates
      const coordinates = coordsDoc.exists() ? coordsDoc.data().data : [];
      const elevation = elevationDoc.exists() ? elevationDoc.data().data : [];
      
      // Convert coordinates from objects to arrays for GeoJSON
      const coordinatesArray = coordinates.map(coord => [coord.lng, coord.lat, coord.elevation]);
      
      // Create GeoJSON
      const geojson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coordinatesArray
            },
            properties: {
              coordinateProperties: {
                elevation: elevation
              }
            }
          }
        ]
      };
      
      // Get unpaved sections
      let unpavedSections = unpavedDoc.exists() ? unpavedDoc.data().data : [];
      
      // Transform unpaved section coordinates from objects back to arrays for rendering
      unpavedSections = unpavedSections.map(section => {
        // Create a copy of the section to avoid modifying the original
        const transformedSection = { ...section };
        
        // Convert coordinates from objects to arrays if they exist
        if (transformedSection.coordinates && Array.isArray(transformedSection.coordinates)) {
          transformedSection.coordinates = transformedSection.coordinates.map(coord => {
            // If it's an object with lng/lat properties, convert to array
            if (coord && typeof coord === 'object' && 'lng' in coord && 'lat' in coord) {
              return [coord.lng, coord.lat];
            }
            // If it's already an array, return as is
            return coord;
          });
        }
        
        return transformedSection;
      });
      
      // Return the route with all data
      return {
        ...route,
        id: route.routeId || route.id, // Use routeId as id if available, otherwise use existing id
        geojson,
        unpavedSections,
        color: route.color // Include the route color when loading the route
      };
    });
    
    // Wait for all route data to be loaded
    const routesWithData = await Promise.all(routeDataPromises);
    routeWithData.routesWithData = routesWithData;
    
    // Get POIs
    const poisRef = doc(db, 'user_saved_routes', routeId, 'data', 'pois');
    const poisDoc = await getDoc(poisRef);
    
    if (poisDoc.exists()) {
      routeWithData.pois = poisDoc.data().data;
    }
    
    // Get lines
    const linesRef = doc(db, 'user_saved_routes', routeId, 'data', 'lines');
    const linesDoc = await getDoc(linesRef);
    
    if (linesDoc.exists()) {
      routeWithData.lines = linesDoc.data().data;
    }
    
    // Get map overview
    const mapOverviewRef = doc(db, 'user_saved_routes', routeId, 'data', 'mapOverview');
    const mapOverviewDoc = await getDoc(mapOverviewRef);
    
    if (mapOverviewDoc.exists()) {
      routeWithData.mapOverview = mapOverviewDoc.data().data;
    }

    // Get photos
    const photosRef = doc(db, 'user_saved_routes', routeId, 'data', 'photos');
    const photosDoc = await getDoc(photosRef);

    if (photosDoc.exists()) {
      routeWithData.photos = photosDoc.data().data; // Assuming photos are stored under a 'data' field in the 'photos' document
      console.log(`[firebaseSaveCompleteRouteService] Photos loaded for route: ${routeId}`, routeWithData.photos);
    } else {
      console.log(`[firebaseSaveCompleteRouteService] No photos document found for route: ${routeId}`);
      routeWithData.photos = []; // Ensure photos array exists, even if empty
    }
    
    console.log(`[firebaseSaveCompleteRouteService] Saved route loaded successfully`);
    
    return routeWithData;
  } catch (error) {
    console.error('[firebaseSaveCompleteRouteService] Error loading saved route:', error);
    return null;
  }
};

/**
 * Deletes a saved route
 * @param {string} routeId - The ID of the route to delete
 * @param {string} userId - The ID of the user
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const deleteSavedRoute = async (routeId, userId) => {
  try {
    console.log(`[firebaseSaveCompleteRouteService] Deleting saved route: ${routeId}`);
    
    // Log the route ID for debugging
    console.log(`[firebaseSaveCompleteRouteService] Attempting to delete route with ID: ${routeId}, type: ${typeof routeId}`);
    
    // Get the route document to check ownership
    const routeRef = doc(db, 'user_saved_routes', routeId);
    const routeDoc = await getDoc(routeRef);
    
    if (!routeDoc.exists()) {
      console.log(`[firebaseSaveCompleteRouteService] Route not found: ${routeId}`);
      
      // Even if the route is not found, try to remove it from the user's route index
      // This ensures that any stale references are cleaned up
      try {
        await removeRouteFromUserIndex(userId, routeId);
        console.log(`[firebaseSaveCompleteRouteService] Removed route from user index even though document not found`);
        return true; // Return true to indicate success to the UI
      } catch (indexError) {
        console.error(`[firebaseSaveCompleteRouteService] Error removing route from user index:`, indexError);
      }
      
      return true; // Return true to indicate success to the UI even if the route doesn't exist
    }
    
    // Check if the user owns this route
    if (routeDoc.data().userId !== userId) {
      console.error(`[firebaseSaveCompleteRouteService] User ${userId} does not own route: ${routeId}`);
      return false;
    }
    
    // Get the routes metadata to find all route IDs
    const routesRef = doc(db, 'user_saved_routes', routeId, 'data', 'routes');
    const routesDoc = await getDoc(routesRef);
    
    if (routesDoc.exists()) {
      const routes = routesDoc.data().data || [];
      
      // Delete each route's data
      for (const route of routes) {
        const routeId = route.routeId || route.id;
        
        // Delete coordinates
        try {
          // Use the parent route ID for the document path and the individual route ID for the subcollection
          const coordsRef = doc(db, 'user_saved_routes', routeId, 'routes', routeId, 'data', 'coords');
          await deleteDoc(coordsRef);
          console.log(`[firebaseSaveCompleteRouteService] Deleted coordinates for route ${routeId}`);
        } catch (error) {
          console.error(`[firebaseSaveCompleteRouteService] Error deleting coordinates for route ${routeId}:`, error);
        }
        
        // Delete elevation
        try {
          const elevationRef = doc(db, 'user_saved_routes', routeId, 'routes', routeId, 'data', 'elevation');
          await deleteDoc(elevationRef);
          console.log(`[firebaseSaveCompleteRouteService] Deleted elevation for route ${routeId}`);
        } catch (error) {
          console.error(`[firebaseSaveCompleteRouteService] Error deleting elevation for route ${routeId}:`, error);
        }
        
        // Delete unpaved sections
        try {
          const unpavedRef = doc(db, 'user_saved_routes', routeId, 'routes', routeId, 'data', 'unpaved');
          await deleteDoc(unpavedRef);
          console.log(`[firebaseSaveCompleteRouteService] Deleted unpaved sections for route ${routeId}`);
        } catch (error) {
          console.error(`[firebaseSaveCompleteRouteService] Error deleting unpaved sections for route ${routeId}:`, error);
        }
      }
    }
    
    // Delete POIs
    try {
      const poisRef = doc(db, 'user_saved_routes', routeId, 'data', 'pois');
      await deleteDoc(poisRef);
    } catch (error) {
      console.error(`[firebaseSaveCompleteRouteService] Error deleting POIs:`, error);
    }
    
    // Delete lines
    try {
      const linesRef = doc(db, 'user_saved_routes', routeId, 'data', 'lines');
      await deleteDoc(linesRef);
    } catch (error) {
      console.error(`[firebaseSaveCompleteRouteService] Error deleting lines:`, error);
    }
    
    // Delete map overview
    try {
      const mapOverviewRef = doc(db, 'user_saved_routes', routeId, 'data', 'mapOverview');
      await deleteDoc(mapOverviewRef);
    } catch (error) {
      console.error(`[firebaseSaveCompleteRouteService] Error deleting map overview:`, error);
    }
    
    // Delete routes metadata
    try {
      const routesRef = doc(db, 'user_saved_routes', routeId, 'data', 'routes');
      await deleteDoc(routesRef);
    } catch (error) {
      console.error(`[firebaseSaveCompleteRouteService] Error deleting routes metadata:`, error);
    }
    
    // Delete the main document
    await deleteDoc(routeRef);
    
    // Remove from user's route index
    await removeRouteFromUserIndex(userId, routeId);
    
    console.log(`[firebaseSaveCompleteRouteService] Route deleted successfully: ${routeId}`);
    
    return true;
  } catch (error) {
    console.error('[firebaseSaveCompleteRouteService] Error deleting saved route:', error);
    return false;
  }
};

/**
 * Removes a route from the user's route index
 * @param {string} userId - The ID of the user
 * @param {string} routeId - The ID of the route to remove
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const removeRouteFromUserIndex = async (userId, routeId) => {
  try {
    console.log(`[firebaseSaveCompleteRouteService] Removing route ${routeId} from user index for user: ${userId}`);
    
    const userIndexRef = doc(db, 'user_route_index', userId);
    const userIndexDoc = await getDoc(userIndexRef);
    
    if (userIndexDoc.exists()) {
      const existingRoutes = userIndexDoc.data().routes || [];
      
      // Filter out the route to remove
      const updatedRoutes = existingRoutes.filter(route => route.id !== routeId);
      
      // Update the document
      await updateDoc(userIndexRef, {
        routes: updatedRoutes,
        updatedAt: serverTimestamp()
      });
      
      console.log(`[firebaseSaveCompleteRouteService] Route removed from user index successfully`);
      return true;
    }
    
    console.log(`[firebaseSaveCompleteRouteService] No user index found, nothing to remove`);
    return true;
  } catch (error) {
    console.error('[firebaseSaveCompleteRouteService] Error removing route from user index:', error);
    return false;
  }
};

/**
 * Updates a saved route (either a specific segment or the overall route name)
 * @param {string} permanentRouteId - The ID of the overall permanent route to update
 * @param {string | null} segmentRouteId - The ID of the specific route segment to update, or null/undefined if updating the overall route name.
 * @param {Object} updates - The updates to apply. If updating overall name, this should be { name: "New Overall Name" }. For segments, it's { name: "New Segment Name", color: "#..." }.
 * @param {string} userId - The ID of the user
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const updateSavedRoute = async (permanentRouteId, segmentRouteId, updates, userId) => {
  try {
    if (segmentRouteId) {
      console.log(`[firebaseSaveCompleteRouteService] Updating segment ${segmentRouteId} in permanent route: ${permanentRouteId}`);
    } else {
      console.log(`[firebaseSaveCompleteRouteService] Updating overall properties for permanent route: ${permanentRouteId}`);
    }
    
    // Get the route document to check ownership
    const routeRef = doc(db, 'user_saved_routes', permanentRouteId);
    const routeDoc = await getDoc(routeRef);
    
    if (!routeDoc.exists()) {
      console.log(`[firebaseSaveCompleteRouteService] Permanent route not found: ${permanentRouteId}`);
      return false;
    }
    
    // Check if the user owns this route
    if (routeDoc.data().userId !== userId) {
      console.error(`[firebaseSaveCompleteRouteService] User ${userId} does not own permanent route: ${permanentRouteId}`);
      return false;
    }

    if (segmentRouteId) {
      // This is an update to a specific segment
      const routesDataRef = doc(db, 'user_saved_routes', permanentRouteId, 'data', 'routes');
      const routesDocSnap = await getDoc(routesDataRef);

      if (!routesDocSnap.exists()) {
        console.error(`[firebaseSaveCompleteRouteService] Routes data document not found for permanent route: ${permanentRouteId}`);
        return false;
      }

      let routesArray = routesDocSnap.data().data || [];
      const segmentIndex = routesArray.findIndex(segment => segment.routeId === segmentRouteId);

      if (segmentIndex === -1) {
        console.error(`[firebaseSaveCompleteRouteService] Segment ${segmentRouteId} not found in permanent route: ${permanentRouteId}`);
        return false;
      }

      routesArray[segmentIndex] = {
        ...routesArray[segmentIndex],
        ...updates, // `updates` here are segmentUpdates
        routeId: segmentRouteId 
      };

      await setDoc(routesDataRef, { data: routesArray });
      console.log(`[firebaseSaveCompleteRouteService] Segment ${segmentRouteId} updated successfully in data/routes.`);
      
      // Update the main permanent route document's updatedAt timestamp
      await updateDoc(routeRef, { updatedAt: serverTimestamp() });

      // Update user_route_index if segment name changed and it might affect the indexed name
      if (updates.name) {
        const indexUpdates = {};
        if (routesArray.length === 1) { // If it's a single segment route, its name is the overall name
          indexUpdates.name = updates.name;
        } else if (routeDoc.data().name === routesArray[segmentIndex].name && segmentIndex === 0) {
           // If the overall route name was based on the first segment's old name, update it.
           // This is a common convention for multi-segment routes.
           indexUpdates.name = updates.name;
        }
        // Add other potential index updates from segment changes if necessary (e.g., isPublic, tags)
        if (updates.isPublic !== undefined) indexUpdates.isPublic = updates.isPublic;
        if (updates.tags) indexUpdates.tags = updates.tags;

        if (Object.keys(indexUpdates).length > 0) {
          await updateUserRouteIndex(userId, permanentRouteId, {
            ...indexUpdates,
            updatedAt: new Date()
          });
          console.log(`[firebaseSaveCompleteRouteService] User route index updated for ${permanentRouteId} due to segment name change.`);
        }
      }
      console.log(`[firebaseSaveCompleteRouteService] Permanent route ${permanentRouteId} updated successfully (segment ${segmentRouteId}).`);

    } else {
      // This is an update to the overall permanent route (e.g., its top-level name)
      // `updates` here are for the main document, e.g., { name: "New Overall Name" }
      await updateDoc(routeRef, {
        ...updates, // Apply updates like the new overall name
        updatedAt: serverTimestamp()
      });

      // If the overall name changed, update the user's route index
      if (updates.name) {
        await updateUserRouteIndex(userId, permanentRouteId, {
          name: updates.name,
          updatedAt: new Date()
        });
        console.log(`[firebaseSaveCompleteRouteService] User route index updated for ${permanentRouteId} due to overall name change.`);
      }
      console.log(`[firebaseSaveCompleteRouteService] Overall properties for permanent route ${permanentRouteId} updated successfully.`);
    }
    
    return true;
  } catch (error) {
    console.error('[firebaseSaveCompleteRouteService] Error updating saved route:', error);
    return false;
  }
};

export default {
  saveAutoSaveToPermanentRoute,
  getUserRouteIndex,
  loadSavedRoute,
  deleteSavedRoute,
  updateSavedRoute,
  firebaseSaveRouteStatus
};
