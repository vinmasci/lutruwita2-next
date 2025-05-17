/**
 * Firebase GPX Auto-Save Service
 * 
 * This service handles automatically saving GPX data to Firebase when a GPX file is processed.
 * It saves the coordinates, elevation, unpaved sections, and POIs data to Firebase Firestore.
 */

import { db } from './firebaseService';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
// import { autoSaveLinesToFirebase } from './firebaseLineAutoSaveService'; // Assuming this might not be needed if lines are handled within this service

// Import AutoSaveContext - will be used if available
let useAutoSave = null;
try {
  // Dynamic import to avoid circular dependencies
  const AutoSaveModule = require('../context/AutoSaveContext');
  useAutoSave = AutoSaveModule.useAutoSave;
} catch (error) {
  console.log('[firebaseGpxAutoSaveService] AutoSaveContext not available, will use local state only');
}

// Global state to track Firebase auto-save status
export const firebaseAutoSaveStatus = {
  isLoading: false,
  lastSavedRoute: null,
  lastSaveTime: null,
  success: false,
  error: null,
  autoSaveId: null // Add autoSaveId to track the current auto-save
};

/**
 * Find the most recent auto-save for a user
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object|null>} - The auto-save document if found, null otherwise
 */
export const findMostRecentAutoSaveForUser = async (userId) => {
  try {
    console.log('[firebaseGpxAutoSaveService] Finding most recent auto-save for user:', userId);
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('[firebaseGpxAutoSaveService] Firebase not initialized, cannot find auto-saves');
      return null;
    }
    
    try {
      // First attempt: Try to use the compound query with ordering
      // Note: This requires a composite index to be created in Firebase
      const q = query(
        collection(db, 'gpx_auto_saves'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );
      
      // Execute the query
      const querySnapshot = await getDocs(q);
      
      // Check if we found any auto-saves
      if (querySnapshot.empty) {
        console.log('[firebaseGpxAutoSaveService] No auto-saves found for user:', userId);
        return null;
      }
      
      // Get the most recent auto-save
      const autoSaveDoc = querySnapshot.docs[0];
      const autoSaveData = {
        id: autoSaveDoc.id,
        ...autoSaveDoc.data()
      };
      
      console.log('[firebaseGpxAutoSaveService] Found most recent auto-save:', autoSaveData.id);
      
      // Update the global auto-save status
      firebaseAutoSaveStatus.autoSaveId = autoSaveData.id;
      
      return autoSaveData;
    } catch (indexError) {
      // If we get an index error, try a simpler approach without ordering
      if (indexError.code === 'failed-precondition' && indexError.message.includes('index')) {
        console.warn('[firebaseGpxAutoSaveService] Index error, falling back to simpler query:', indexError.message);
        console.warn('[firebaseGpxAutoSaveService] To fix this permanently, create the required index in Firebase console');
        
        // Fallback: Get all auto-saves for the user without ordering
        const simpleQuery = query(
          collection(db, 'gpx_auto_saves'),
          where('userId', '==', userId)
        );
        
        const allUserAutoSaves = await getDocs(simpleQuery);
        
        if (allUserAutoSaves.empty) {
          console.log('[firebaseGpxAutoSaveService] No auto-saves found for user (fallback):', userId);
          return null;
        }
        
        // Manually find the most recent one by comparing updatedAt timestamps
        let mostRecent = null;
        let mostRecentTimestamp = 0;
        
        allUserAutoSaves.forEach(doc => {
          const data = doc.data();
          const updatedAt = data.updatedAt?.toMillis() || 0;
          
          if (updatedAt > mostRecentTimestamp) {
            mostRecent = {
              id: doc.id,
              ...data
            };
            mostRecentTimestamp = updatedAt;
          }
        });
        
        if (mostRecent) {
          console.log('[firebaseGpxAutoSaveService] Found most recent auto-save (fallback):', mostRecent.id);
          
          // Update the global auto-save status
          firebaseAutoSaveStatus.autoSaveId = mostRecent.id;
          
          return mostRecent;
        }
        
        return null;
      }
      
      // If it's not an index error, rethrow
      throw indexError;
    }
  } catch (error) {
    console.error('[firebaseGpxAutoSaveService] Error finding most recent auto-save:', error);
    return null;
  }
};

/**
 * Load auto-save data for a specific auto-save ID
 * @param {string} autoSaveId - The ID of the auto-save to load
 * @returns {Promise<Object|null>} - The auto-save data if found, null otherwise
 */
export const loadAutoSaveData = async (autoSaveId) => {
  try {
    console.log('[firebaseGpxAutoSaveService] Loading auto-save data for:', autoSaveId);
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('[firebaseGpxAutoSaveService] Firebase not initialized, cannot load auto-save');
      return null;
    }
    
    // Get the auto-save document
    const autoSaveRef = doc(db, 'gpx_auto_saves', autoSaveId);
    const autoSaveDoc = await getDoc(autoSaveRef);
    
    if (!autoSaveDoc.exists()) {
      console.log('[firebaseGpxAutoSaveService] Auto-save not found:', autoSaveId);
      return null;
    }
    
    // Get the auto-save data
    const autoSaveData = {
      id: autoSaveDoc.id,
      ...autoSaveDoc.data()
    };
    
    // Get the routes data
    const routesRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'routes');
    const routesDoc = await getDoc(routesRef);
    
    if (!routesDoc.exists()) {
      console.log('[firebaseGpxAutoSaveService] No routes found for auto-save:', autoSaveId);
      autoSaveData.routes = [];
    } else {
      autoSaveData.routes = routesDoc.data().data || [];
    }
    
    // For each route, get the route data
    const routeDataPromises = autoSaveData.routes.map(async (route) => {
      const routeId = route.routeId;
      
      // Get coordinates
      const coordsRef = doc(db, 'gpx_auto_saves', autoSaveId, 'routes', routeId, 'data', 'coords');
      const coordsDoc = await getDoc(coordsRef);
      
      // Get elevation
      const elevationRef = doc(db, 'gpx_auto_saves', autoSaveId, 'routes', routeId, 'data', 'elevation');
      const elevationDoc = await getDoc(elevationRef);
      
      // Get unpaved sections
      const unpavedRef = doc(db, 'gpx_auto_saves', autoSaveId, 'routes', routeId, 'data', 'unpaved');
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
      // Make sure to include an id property, which is required by normalizeRoute
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
    autoSaveData.routesWithData = routesWithData;
    
    // Get POIs
    const poisRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'pois');
    const poisDoc = await getDoc(poisRef);
    
    if (poisDoc.exists()) {
      autoSaveData.pois = poisDoc.data().data;
    }
    
    // Get lines
    const linesRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'lines');
    const linesDoc = await getDoc(linesRef);
    
    if (linesDoc.exists()) {
      autoSaveData.lines = linesDoc.data().data;
    }
    
    // Get description
    const descriptionRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'description');
    const descriptionDoc = await getDoc(descriptionRef);
    
    if (descriptionDoc.exists()) {
      autoSaveData.description = descriptionDoc.data().data;
    }
    
    console.log('[firebaseGpxAutoSaveService] Auto-save data loaded successfully');
    
    return autoSaveData;
  } catch (error) {
    console.error('[firebaseGpxAutoSaveService] Error loading auto-save data:', error);
    return null;
  }
};

/**
 * Auto-save GPX data to Firebase
 * @param {Object} processedRoute - The processed route data from useClientGpxProcessing
 * @param {string} userId - The ID of the current user
 * @param {string} gpxFileName - The original filename of the GPX file (more relevant for new temporary auto-saves)
 * @param {Object} autoSaveContext - Optional AutoSaveContext from a component (if not using the hook)
 * @param {string} existingAutoSaveId - Optional ID of an existing temporary auto-save in `gpx_auto_saves`
 * @param {string} loadedPermanentRouteId - Optional ID of a loaded permanent route in `user_saved_routes`
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
export const autoSaveGpxToFirebase = async (
  processedRoute, 
  userId, 
  gpxFileName, 
  autoSaveContext = null, 
  existingAutoSaveId = null,
  loadedPermanentRouteId = null
) => {
  try {
    // Get AutoSaveContext if available
    let autoSave = autoSaveContext;
    
    // If not provided directly, try to use the hook
    if (!autoSave && typeof window !== 'undefined') {
      try {
        // This will only work if called from a component within the AutoSaveProvider
        if (useAutoSave) {
          autoSave = useAutoSave();
        }
      } catch (error) {
        console.log('[firebaseGpxAutoSaveService] Could not access AutoSaveContext via hook:', error.message);
      }
    }
    
    // Update loading status in both places
    firebaseAutoSaveStatus.isLoading = true;
    firebaseAutoSaveStatus.lastSavedRoute = processedRoute.routeId;
    firebaseAutoSaveStatus.error = null;
    
    // Also update the global context if available
    if (autoSave && typeof autoSave.startAutoSave === 'function') {
      try {
        autoSave.startAutoSave();
      } catch (error) {
        console.error('[firebaseGpxAutoSaveService] Error starting auto-save in context:', error);
        // Continue even if updating the context fails
      }
    }
    
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE AUTO-SAVING GPX DATA FOR ROUTE: ${processedRoute.routeId} 🔄🔄🔄`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING AUTO-SAVE ❌❌❌');
      console.log('=================================================================');
      
      firebaseAutoSaveStatus.isLoading = false;
      firebaseAutoSaveStatus.error = 'Firebase not initialized';
      firebaseAutoSaveStatus.success = false;
      return null;
    }
    
    console.log('FIREBASE DB IS INITIALIZED, PROCEEDING WITH AUTO-SAVE');
    
    // Start timing
    const startTime = performance.now();
    
    // Determine target collection, document reference, and ID
    let targetCollectionName;
    let autoSaveRef; // DocumentReference for the main save document
    let autoSaveId;  // The ID of the document being saved/updated
    let isNewAutoSave = false; // True only if creating a new doc in gpx_auto_saves
    let existingRoutes = []; // Only relevant for gpx_auto_saves if appending

    if (loadedPermanentRouteId) {
      targetCollectionName = 'user_saved_routes';
      autoSaveId = loadedPermanentRouteId;
      autoSaveRef = doc(db, targetCollectionName, autoSaveId);
      console.log(`[firebaseGpxAutoSaveService] Auto-saving to existing permanent route: ${autoSaveId}`);
      // For permanent routes, we are always updating, so isNewAutoSave remains false.
      // existingRoutes is not typically used for permanent single route updates as we replace.
    } else {
      targetCollectionName = 'gpx_auto_saves';
      if (existingAutoSaveId) {
        const tempRef = doc(db, targetCollectionName, existingAutoSaveId);
        try {
          const tempDoc = await getDoc(tempRef);
          if (tempDoc.exists() && tempDoc.data().userId === userId) {
            autoSaveRef = tempRef;
            autoSaveId = existingAutoSaveId;
            isNewAutoSave = false; // Updating existing temporary auto-save
            console.log(`[firebaseGpxAutoSaveService] Using existing temporary auto-save ${autoSaveId}`);
            
            const routesDocSnap = await getDoc(doc(db, targetCollectionName, autoSaveId, 'data', 'routes'));
            if (routesDocSnap.exists() && routesDocSnap.data().data) {
              existingRoutes = routesDocSnap.data().data;
              console.log(`[firebaseGpxAutoSaveService] Found ${existingRoutes.length} existing routes in temporary auto-save`);
            }
          } else {
            console.log(`[firebaseGpxAutoSaveService] Existing temporary auto-save ${existingAutoSaveId} invalid or belongs to another user, creating new one.`);
            autoSaveRef = doc(collection(db, targetCollectionName));
            autoSaveId = autoSaveRef.id;
            isNewAutoSave = true;
          }
        } catch (error) {
          console.error(`[firebaseGpxAutoSaveService] Error checking existing temporary auto-save:`, error);
          autoSaveRef = doc(collection(db, targetCollectionName));
          autoSaveId = autoSaveRef.id;
          isNewAutoSave = true;
        }
      } else {
        // Create new temporary auto-save
        autoSaveRef = doc(collection(db, targetCollectionName));
        autoSaveId = autoSaveRef.id;
        isNewAutoSave = true;
        console.log(`[firebaseGpxAutoSaveService] Creating new temporary auto-save ${autoSaveId}`);
      }
    }
    
    // Extract the necessary data from the processed route
    const { 
      geojson, 
      unpavedSections = [],
      pois = { draggable: [], places: [] },
      lines = [],
      name,
      statistics,
      routeId,
      color // Extract the route color
    } = processedRoute;
    
    // Extract coordinates and elevation from the GeoJSON
    const rawCoordinates = geojson?.features?.[0]?.geometry?.coordinates || [];
    const elevation = geojson?.features?.[0]?.properties?.coordinateProperties?.elevation || [];
    
    // Transform coordinates from arrays to objects to avoid nested arrays in Firestore
    const coordinates = rawCoordinates.map((coord, index) => {
      // Handle coordinates with or without elevation
      if (coord.length >= 2) {
        return {
          lng: coord[0],
          lat: coord[1],
          // Include elevation if available (either from coord[2] or from elevation array)
          ...(coord.length > 2 ? { elevation: coord[2] } : 
              (elevation && elevation[index] !== undefined ? { elevation: elevation[index] } : {}))
        };
      }
      return null;
    }).filter(Boolean); // Remove any null values
    
    // Prepare main document data
    const mainDocData = {
      userId: userId,
      updatedAt: serverTimestamp(),
      name: processedRoute.name || (targetCollectionName === 'user_saved_routes' ? `Route ${autoSaveId.substring(0,5)}` : `Draft from ${gpxFileName}`), // Placeholder name for permanent if not in processedRoute
      statistics: processedRoute.statistics || {},
      routeType: processedRoute.routeType || 'Single',
      // headerSettings might need merging or specific update logic if saving to permanent
    };

    if (targetCollectionName === 'user_saved_routes') {
      // For permanent routes, update gpxFileName if provided in processedRoute, otherwise it might not be relevant
      if (processedRoute.gpxFileName) mainDocData.gpxFileName = processedRoute.gpxFileName;
      if (processedRoute.headerSettings) mainDocData.headerSettings = processedRoute.headerSettings;
      // 'createdAt' is not set here as we are updating an existing permanent route.
      // 'status' is not applicable to user_saved_routes.
    } else { // gpx_auto_saves
      mainDocData.gpxFileName = gpxFileName; // Use original gpxFileName for temporary auto-saves
      if (isNewAutoSave) {
        mainDocData.createdAt = serverTimestamp();
        mainDocData.status = "pending_action";
      }
      // If updating an existing gpx_auto_save, headerSettings might be merged if needed.
      if (processedRoute.headerSettings) mainDocData.headerSettings = processedRoute.headerSettings;
    }
    
    // Firestore batch
    const batch = writeBatch(db);

    // Save/Update main document
    if (isNewAutoSave && targetCollectionName === 'gpx_auto_saves') {
      batch.set(autoSaveRef, mainDocData);
    } else {
      // Update existing gpx_auto_save or user_saved_route.
      // Using merge: true to avoid overwriting fields not included in mainDocData,
      // though mainDocData should be comprehensive for the top-level document.
      batch.set(autoSaveRef, mainDocData, { merge: true }); 
    }
    
    // Create a route object to store in the 'data/routes' subcollection
    const routeObject = {
      routeId: routeId, // from processedRoute
      name: processedRoute.name || `Route from ${gpxFileName}`,
      gpxFileName: processedRoute.gpxFileName || gpxFileName,
      statistics: statistics || {},
      addedAt: new Date().toISOString(), // Consider if this should be preserved for existing routes
      color: color // from processedRoute
    };
    
    // Handle 'data/routes' subcollection document
    const routesDataRef = doc(db, targetCollectionName, autoSaveId, 'data', 'routes');
    let updatedRoutesArray;

    if (targetCollectionName === 'user_saved_routes') {
      let currentPermanentRoutes = [];
      // Fetch the current routes array for the permanent save
      const routesDocSnap = await getDoc(routesDataRef);
      if (routesDocSnap.exists() && routesDocSnap.data().data) {
        currentPermanentRoutes = routesDocSnap.data().data;
      }

      const routeIndex = currentPermanentRoutes.findIndex(r => r.routeId === routeObject.routeId);

      if (routeIndex !== -1) {
        // Update existing route in the array
        const existingSegment = currentPermanentRoutes[routeIndex];
        currentPermanentRoutes[routeIndex] = {
          ...existingSegment, // Preserve existing fields like original 'addedAt'
          // Update specific fields from the processed routeObject
          name: routeObject.name,
          gpxFileName: routeObject.gpxFileName,
          statistics: routeObject.statistics,
          color: routeObject.color,
          // Ensure routeId is correctly maintained
          routeId: routeObject.routeId
        };
        updatedRoutesArray = currentPermanentRoutes;
        console.log(`[firebaseGpxAutoSaveService] Updated segment ${routeObject.routeId} in permanent route ${autoSaveId}`);
      } else {
        // Add new route to the array (e.g., new segment in a bikepacking route)
        // routeObject already has a fresh 'addedAt' from its creation
        updatedRoutesArray = [...currentPermanentRoutes, routeObject];
        console.log(`[firebaseGpxAutoSaveService] Added new segment ${routeObject.routeId} to permanent route ${autoSaveId}`);
      }
    } else { // gpx_auto_saves
      // For temporary auto-saves, filter out any existing route with the same routeId and add the new one.
      // existingRoutes is populated earlier for gpx_auto_saves if applicable
      updatedRoutesArray = [...existingRoutes.filter(r => r.routeId !== routeObject.routeId), routeObject];
    }
    batch.set(routesDataRef, { data: updatedRoutesArray });
    
    console.log('Creating/updating subcollection documents for save:', autoSaveId, 'in', targetCollectionName);
    
    // Paths for route-specific data (coords, elevation, unpaved)
    const routeSpecificDataPathPrefix = `${targetCollectionName}/${autoSaveId}/routes/${routeId}/data`;
    
    try {
      console.log('Saving coordinates data:', { count: coordinates.length, sample: coordinates.slice(0, 2) });
      batch.set(doc(db, routeSpecificDataPathPrefix, 'coords'), { data: coordinates });
    } catch (error) {
      console.error('Error preparing coordinates data for batch:', error);
      throw new Error(`Failed to save coordinates: ${error.message}`);
    }
    
    try {
      console.log('Saving elevation data:', { count: elevation.length, sample: elevation.slice(0, 5) });
      batch.set(doc(db, routeSpecificDataPathPrefix, 'elevation'), { data: elevation });
    } catch (error) {
      console.error('Error preparing elevation data for batch:', error);
      throw new Error(`Failed to save elevation: ${error.message}`);
    }
    
    try {
      const transformedUnpavedSections = (unpavedSections || []).map(section => {
        const ts = { 
          startIndex: section.startIndex,
          endIndex: section.endIndex,
          surfaceType: section.surfaceType || 'unpaved'
        };
        if (!section.coordinates && rawCoordinates && section.startIndex !== undefined && section.endIndex !== undefined) {
          ts.coordinates = rawCoordinates.slice(Math.max(0, section.startIndex), Math.min(rawCoordinates.length, section.endIndex + 1))
            .map(coord => Array.isArray(coord) ? { lng: coord[0], lat: coord[1] } : coord);
        } else if (Array.isArray(section.coordinates)) {
          ts.coordinates = section.coordinates.map(coord => Array.isArray(coord) ? { lng: coord[0], lat: coord[1] } : coord);
        }
        return ts;
      });
      console.log('Saving unpaved sections:', { count: transformedUnpavedSections.length });
      batch.set(doc(db, routeSpecificDataPathPrefix, 'unpaved'), { data: transformedUnpavedSections });
    } catch (error) {
      console.error('Error preparing unpaved sections for batch:', error);
      throw new Error(`Failed to save unpaved sections: ${error.message}`);
    }

    // POIs and lines are saved at the top-level of the save (autoSaveId or loadedPermanentRouteId)
    // For permanent routes, we REPLACE POIs and Lines with the current state from processedRoute.
    // For temporary auto-saves, we continue to merge/append.
    let poisToSave = pois || { draggable: [], places: [] }; // Default to processedRoute.pois
    let linesToSave = lines || []; // Default to processedRoute.lines

    if (targetCollectionName === 'gpx_auto_saves') {
      // Logic for merging POIs for gpx_auto_saves (existing logic)
      let existingPOIsData = { draggable: [], places: [] };
      try {
        const existingPOIsSnap = await getDoc(doc(db, targetCollectionName, autoSaveId, 'data', 'pois'));
        if (existingPOIsSnap.exists()) existingPOIsData = existingPOIsSnap.data().data || existingPOIsData;
      } catch (e) { console.warn('Error getting existing POIs for gpx_auto_save, will create new.', e); }
      
      const mergedDraggablePOIs = [...(existingPOIsData.draggable || []), ...(pois.draggable || []).map(p => p.googlePlaces ? { ...p, googlePlaces: { placeId: p.googlePlaces.placeId, url: p.googlePlaces.url } } : p)];
      const mergedPlacesPOIs = [...(existingPOIsData.places || []), ...(pois.places || [])];
      poisToSave = {
        draggable: mergedDraggablePOIs.filter((p, i, self) => i === self.findIndex(item => item.id === p.id)),
        places: mergedPlacesPOIs.filter((p, i, self) => i === self.findIndex(item => item.id === p.id)),
      };

      // Logic for merging Lines for gpx_auto_saves (existing logic)
      let existingLinesData = [];
      try {
        const existingLinesSnap = await getDoc(doc(db, targetCollectionName, autoSaveId, 'data', 'lines'));
        if (existingLinesSnap.exists()) existingLinesData = existingLinesSnap.data().data || [];
      } catch (e) { console.warn('Error getting existing lines for gpx_auto_save, will create new.', e); }

      const validNewLines = Array.isArray(lines) ? lines : [];
      const mergedLines = [...existingLinesData, ...validNewLines.map(line => {
        const lc = { ...line };
        if (lc.photos && Array.isArray(lc.photos)) {
          lc.photos = lc.photos.map(photo => {
            const pc = { ...photo };
            if (pc._blobs) delete pc._blobs;
            if (pc.isLocal) return { id: pc.id, name: pc.name || 'Unnamed', caption: pc.caption || 'Unnamed', isLocal: true, dateAdded: pc.dateAdded || new Date().toISOString(), url: pc.url || null };
            return pc;
          });
        }
        return lc;
      })];
      linesToSave = mergedLines.filter((l, i, self) => i === self.findIndex(item => item.id === l.id));
    }
    // If targetCollectionName === 'user_saved_routes', poisToSave and linesToSave are already set to processedRoute.pois and processedRoute.lines (replacement)

    try {
      console.log('Saving POIs data to batch:', { draggableCount: poisToSave.draggable?.length || 0, placesCount: poisToSave.places?.length || 0 });
      batch.set(doc(db, targetCollectionName, autoSaveId, 'data', 'pois'), { data: poisToSave });
    } catch (error) {
      console.error('Error preparing POIs data for batch:', error);
      throw new Error(`Failed to save POIs: ${error.message}`);
    }
    
    try {
      console.log('Saving lines data to batch:', { linesCount: linesToSave?.length || 0 });
      batch.set(doc(db, targetCollectionName, autoSaveId, 'data', 'lines'), { data: linesToSave });
    } catch (error) {
      console.error('Error preparing lines data for batch:', error);
      throw new Error(`Failed to save lines: ${error.message}`);
    }

    if (targetCollectionName === 'user_saved_routes') {
      console.log(`[firebaseGpxAutoSaveService] Updating user_route_index for userId: ${userId}, permanentRouteId: ${autoSaveId}`);
      const userRouteIndexRef = doc(db, 'user_route_index', userId);
      try {
        const routeIndexDocSnap = await getDoc(userRouteIndexRef);
        if (routeIndexDocSnap.exists()) {
          const routeIndexData = routeIndexDocSnap.data();
          const routesArray = routeIndexData.routes || [];
          const routeIndexToUpdate = routesArray.findIndex(r => r.id === autoSaveId);

          if (routeIndexToUpdate !== -1) {
            routesArray[routeIndexToUpdate].updatedAt = serverTimestamp();
            // Also update statistics if they changed in mainDocData
            if (mainDocData.statistics) {
              routesArray[routeIndexToUpdate].statistics = mainDocData.statistics;
            }
            // Update name if it changed
            if (mainDocData.name) {
              routesArray[routeIndexToUpdate].name = mainDocData.name;
            }
            batch.update(userRouteIndexRef, { routes: routesArray, updatedAt: serverTimestamp() });
            console.log(`[firebaseGpxAutoSaveService] Prepared user_route_index update for ${autoSaveId}`);
          } else {
            console.warn(`[firebaseGpxAutoSaveService] Route ID ${autoSaveId} not found in user_route_index for user ${userId}. Index might be stale or route was just saved.`);
            // If it's not found, it might be because this is the first save after promoting from temporary,
            // in which case firebaseSaveCompleteRouteService handles adding it to the index.
            // For direct auto-saves to an existing permanent route, it should be found.
            // We'll still update the main index updatedAt timestamp.
            batch.update(userRouteIndexRef, { updatedAt: serverTimestamp() });
          }
        } else {
          console.warn(`[firebaseGpxAutoSaveService] user_route_index document not found for user ${userId}. Cannot update.`);
        }
      } catch (error) {
        console.error(`[firebaseGpxAutoSaveService] Error preparing user_route_index update for ${autoSaveId}:`, error);
        // Decide if the whole batch should fail or if this is a non-critical error.
        // For now, we'll let the batch continue, but this needs monitoring.
      }
    }
    
    await batch.commit();
    
    // Calculate save time
    const endTime = performance.now();
    const saveTime = (endTime - startTime).toFixed(2);
    
    console.log('=================================================================');
    console.log(`✅✅✅ FIREBASE AUTO-SAVE COMPLETE FOR ROUTE: ${processedRoute.routeId} ✅✅✅`);
    console.log(`✅✅✅ AUTO-SAVE ID: ${autoSaveId} ✅✅✅`);
    console.log(`✅✅✅ SAVED IN: ${saveTime}ms ✅✅✅`);
    console.log('=================================================================');
    
    // Update status in global state
    firebaseAutoSaveStatus.isLoading = false;
    firebaseAutoSaveStatus.success = true;
    firebaseAutoSaveStatus.lastSaveTime = saveTime;
    firebaseAutoSaveStatus.autoSaveId = autoSaveId; // Store the auto-save ID
    
    // Also update the global context if available
    if (autoSave && typeof autoSave.completeAutoSave === 'function') {
      try {
        autoSave.completeAutoSave(autoSaveId, processedRoute.routeId);
      } catch (error) {
        console.error('[firebaseGpxAutoSaveService] Error updating AutoSaveContext:', error);
        // Continue even if updating the context fails
      }
    }
    
    return autoSaveId;
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR AUTO-SAVING GPX DATA ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    
    // Update status in global state
    firebaseAutoSaveStatus.isLoading = false;
    firebaseAutoSaveStatus.success = false;
    firebaseAutoSaveStatus.error = error.message;
    
    // Also update the global context if available
    if (autoSave && typeof autoSave.setAutoSaveError === 'function') {
      try {
        autoSave.setAutoSaveError(error);
      } catch (contextError) {
        console.error('[firebaseGpxAutoSaveService] Error updating AutoSaveContext with error:', contextError);
        // Continue even if updating the context fails
      }
    }
    return null;
  }
};

/**
 * Delete auto-saved GPX data from Firebase
 * @param {string} routeId - The ID of the route to delete
 * @param {string} userId - The ID of the current user
 * @param {Object} autoSaveContext - Optional AutoSaveContext from a component
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const deleteAutoSaveFromFirebase = async (routeId, userId, autoSaveContext = null) => {
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
        console.log('[firebaseGpxAutoSaveService] Could not access AutoSaveContext via hook:', error.message);
      }
    }
    
    console.log('=================================================================');
    console.log(`🗑️🗑️🗑️ FIREBASE DELETING AUTO-SAVED GPX DATA FOR ROUTE: ${routeId} 🗑️🗑️🗑️`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING DELETE ❌❌❌');
      console.log('=================================================================');
      return false;
    }
    
    // Find the auto-save ID for this route
    let autoSaveId = null;
    
    // Check various sources for the auto-save ID
    if (autoSave && autoSave.autoSaveId) {
      autoSaveId = autoSave.autoSaveId;
    } else if (firebaseAutoSaveStatus.autoSaveId) {
      autoSaveId = firebaseAutoSaveStatus.autoSaveId;
    }
    
    if (!autoSaveId) {
      console.log('[firebaseGpxAutoSaveService] No auto-save ID found for route:', routeId);
      return false;
    }
    
    // First, remove the route from the routes array in the data/routes document
    try {
      const routesRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'routes');
      const routesDoc = await getDoc(routesRef);
      
      if (routesDoc.exists() && routesDoc.data().data) {
        const existingRoutes = routesDoc.data().data;
        console.log(`[firebaseGpxAutoSaveService] Found ${existingRoutes.length} routes in auto-save`);
        
        // Filter out the route to delete
        const updatedRoutes = existingRoutes.filter(route => route.routeId !== routeId);
        console.log(`[firebaseGpxAutoSaveService] Filtered routes: ${updatedRoutes.length} remaining`);
        
        // Update the routes document
        await setDoc(routesRef, { data: updatedRoutes });
        console.log(`[firebaseGpxAutoSaveService] Updated routes document`);
        
        // If this was the last route, delete the entire auto-save
        if (updatedRoutes.length === 0) {
          console.log(`[firebaseGpxAutoSaveService] No routes remaining, deleting entire auto-save`);
          
          // Delete all subcollections first
          const subcollections = ['coords', 'elevation', 'unpaved', 'pois', 'lines', 'photos', 'description', 'routes'];
          for (const subcollection of subcollections) {
            try {
              const dataRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', subcollection);
              await deleteDoc(dataRef);
              console.log(`[firebaseGpxAutoSaveService] Deleted subcollection: ${subcollection}`);
            } catch (error) {
              console.error(`[firebaseGpxAutoSaveService] Error deleting subcollection ${subcollection}:`, error);
              // Continue with other subcollections even if one fails
            }
          }
          
          // Delete the main document
          await deleteDoc(doc(db, 'gpx_auto_saves', autoSaveId));
          console.log(`[firebaseGpxAutoSaveService] Deleted main auto-save document`);
          
          // Reset the auto-save ID in the global context
          if (autoSave && autoSave.autoSaveId === autoSaveId) {
            try {
              if (typeof autoSave.resetAutoSave === 'function') {
                autoSave.resetAutoSave();
              } else if (typeof autoSave.completeAutoSave === 'function') {
                // Fallback if resetAutoSave is not available
                autoSave.completeAutoSave(null, null);
              }
            } catch (error) {
              console.error('[firebaseGpxAutoSaveService] Error resetting auto-save in context:', error);
              // Continue even if updating the context fails
            }
          }
          
          // Reset the auto-save ID in the global status
          if (firebaseAutoSaveStatus.autoSaveId === autoSaveId) {
            firebaseAutoSaveStatus.autoSaveId = null;
          }
        }
      } else {
        console.log(`[firebaseGpxAutoSaveService] No routes document found, deleting route data directly`);
      }
    } catch (error) {
      console.error(`[firebaseGpxAutoSaveService] Error updating routes document:`, error);
      // Continue with deleting the route data even if updating the routes document fails
    }
    
    // Delete the route-specific data
    const routeDataPath = `gpx_auto_saves/${autoSaveId}/routes`;
    const subcollections = ['coords', 'elevation', 'unpaved']; // Only delete route-specific data, not POIs or lines
    
    for (const subcollection of subcollections) {
      try {
        const dataRef = doc(db, routeDataPath, routeId, 'data', subcollection);
        await deleteDoc(dataRef);
        console.log(`[firebaseGpxAutoSaveService] Deleted route subcollection: ${subcollection}`);
      } catch (error) {
        console.error(`[firebaseGpxAutoSaveService] Error deleting route subcollection ${subcollection}:`, error);
        // Continue with other subcollections even if one fails
      }
    }
    
    console.log('=================================================================');
    console.log(`✅✅✅ FIREBASE DELETE COMPLETE FOR ROUTE: ${routeId} ✅✅✅`);
    console.log(`✅✅✅ AUTO-SAVE ID: ${autoSaveId} ✅✅✅`);
    console.log('=================================================================');
    
    return true;
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR DELETING GPX DATA ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    return false;
  }
};

/**
 * Update route properties in Firebase
 * @param {string} routeId - The ID of the route to update
 * @param {Object} updates - The properties to update
 * @param {string} userId - The ID of the current user
 * @param {Object} autoSaveContext - Optional AutoSaveContext from a component
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
export const updateRouteInFirebase = async (routeId, updates, userId, autoSaveContext = null) => {
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
        console.log('[firebaseGpxAutoSaveService] Could not access AutoSaveContext via hook:', error.message);
      }
    }
    
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE UPDATING ROUTE: ${routeId} 🔄🔄🔄`);
    console.log('Updates:', updates);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING UPDATE ❌❌❌');
      console.log('=================================================================');
      return null;
    }
    
    // Find the auto-save ID for this route
    let autoSaveId = null;
    
    // Check various sources for the auto-save ID
    if (autoSave && autoSave.autoSaveId) {
      autoSaveId = autoSave.autoSaveId;
    } else if (firebaseAutoSaveStatus.autoSaveId) {
      autoSaveId = firebaseAutoSaveStatus.autoSaveId;
    }
    
    if (!autoSaveId) {
      console.log('[firebaseGpxAutoSaveService] No auto-save ID found for route:', routeId);
      return null;
    }
    
    // Update the main auto-save document with timestamp
    const autoSaveRef = doc(db, 'gpx_auto_saves', autoSaveId);
    
    // Get the current document
    const autoSaveDoc = await getDoc(autoSaveRef);
    if (!autoSaveDoc.exists()) {
      console.log('[firebaseGpxAutoSaveService] Auto-save document not found:', autoSaveId);
      return null;
    }
    
    // Check if updates contains routeType, which should be applied to the main document
    if (updates.routeType) {
      // Update the main document with the routeType and timestamp
      await updateDoc(autoSaveRef, {
        updatedAt: serverTimestamp(),
        routeType: updates.routeType
      });
      
      console.log(`[firebaseGpxAutoSaveService] Updated main document with routeType: ${updates.routeType}`);
      
      // If the route type is changing to or from "Bikepacking", handle the master route
      if (updates.routeType === 'Bikepacking') {
        // Create or update the masterRoute document if it doesn't exist
        const masterRouteRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'masterRoute');
        try {
          const masterRouteDoc = await getDoc(masterRouteRef);
          if (!masterRouteDoc.exists()) {
            // Create a new masterRoute document with default values
            await setDoc(masterRouteRef, {
              data: {
                description: "Combined route of all segments",
                statistics: {}
              }
            });
            console.log(`[firebaseGpxAutoSaveService] Created new masterRoute document for Bikepacking route`);
          }
        } catch (error) {
          console.error(`[firebaseGpxAutoSaveService] Error handling masterRoute document:`, error);
          // Continue even if there's an error with the masterRoute document
        }
      } else if (updates.routeType !== 'Bikepacking') {
        // Check if we're changing from Bikepacking to another type
        try {
          const currentDoc = await getDoc(autoSaveRef);
          if (currentDoc.exists() && currentDoc.data().routeType === 'Bikepacking') {
            // We're changing from Bikepacking to another type, so we should remove the masterRoute document
            try {
              const masterRouteRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'masterRoute');
              await deleteDoc(masterRouteRef);
              console.log(`[firebaseGpxAutoSaveService] Deleted masterRoute document as route type changed from Bikepacking`);
            } catch (error) {
              console.error(`[firebaseGpxAutoSaveService] Error deleting masterRoute document:`, error);
              // Continue even if there's an error deleting the masterRoute document
            }
          }
        } catch (error) {
          console.error(`[firebaseGpxAutoSaveService] Error checking current route type:`, error);
          // Continue even if there's an error checking the current route type
        }
      }
      
      // Remove routeType from updates to avoid duplicating it in the route document
      const { routeType, ...routeUpdates } = updates;
      updates = routeUpdates;
    } else {
      // Update the main document with just the timestamp
      await updateDoc(autoSaveRef, {
        updatedAt: serverTimestamp()
      });
    }
    
    // Update the route in the routes array
    try {
      const routesRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'routes');
      const routesDoc = await getDoc(routesRef);
      
      if (routesDoc.exists() && routesDoc.data().data) {
        const existingRoutes = routesDoc.data().data;
        console.log(`[firebaseGpxAutoSaveService] Found ${existingRoutes.length} routes in auto-save`);
        
        // Find the route to update
        const updatedRoutes = existingRoutes.map(route => {
          if (route.routeId === routeId) {
            // Update the route properties
            return {
              ...route,
              ...updates,
              // Make sure routeId doesn't get overwritten
              routeId: routeId
            };
          }
          return route;
        });
        
        // Update the routes document
        await setDoc(routesRef, { data: updatedRoutes });
        console.log(`[firebaseGpxAutoSaveService] Updated route in routes array`);
      } else {
        console.log(`[firebaseGpxAutoSaveService] No routes document found, cannot update route properties`);
      }
    } catch (error) {
      console.error(`[firebaseGpxAutoSaveService] Error updating route in routes array:`, error);
      // Continue even if updating the routes array fails
    }
    
    console.log('=================================================================');
    console.log(`✅✅✅ FIREBASE UPDATE COMPLETE FOR ROUTE: ${routeId} ✅✅✅`);
    console.log(`✅✅✅ AUTO-SAVE ID: ${autoSaveId} ✅✅✅`);
    console.log('=================================================================');
    
    return autoSaveId;
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR UPDATING ROUTE ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    return null;
  }
};

/**
 * Get the current Firebase auto-save status
 * @returns {Object} - The current status object
 */
export const getFirebaseAutoSaveStatus = () => {
  return { ...firebaseAutoSaveStatus };
};

/**
 * Update header settings in Firebase
 * @param {Object} headerSettings - The header settings to save
 * @param {string} userId - The ID of the current user
 * @param {Object} autoSaveContext - Optional AutoSaveContext from a component
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
export const updateHeaderSettingsInFirebase = async (headerSettings, userId, autoSaveContext = null) => {
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
        console.log('[firebaseGpxAutoSaveService] Could not access AutoSaveContext via hook:', error.message);
      }
    }
    
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE UPDATING HEADER SETTINGS 🔄🔄🔄`);
    console.log('Header settings:', headerSettings);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING UPDATE ❌❌❌');
      console.log('=================================================================');
      return null;
    }
    
    // Determine target collection and ID
    let targetCollectionName;
    let targetId;

    if (autoSave && autoSave.loadedPermanentRouteId) {
      targetCollectionName = 'user_saved_routes';
      targetId = autoSave.loadedPermanentRouteId;
      console.log(`[firebaseGpxAutoSaveService] Targeting permanent route for header settings update: ${targetId}`);
    } else if (autoSave && autoSave.autoSaveId) {
      targetCollectionName = 'gpx_auto_saves';
      targetId = autoSave.autoSaveId;
      console.log(`[firebaseGpxAutoSaveService] Targeting temporary auto-save for header settings update: ${targetId}`);
    } else if (firebaseAutoSaveStatus.autoSaveId) { // Fallback for temporary auto-save
      targetCollectionName = 'gpx_auto_saves';
      targetId = firebaseAutoSaveStatus.autoSaveId;
      console.log(`[firebaseGpxAutoSaveService] Targeting temporary auto-save (fallback) for header settings update: ${targetId}`);
    }
    
    if (!targetId) {
      console.log('[firebaseGpxAutoSaveService] No target ID found for header settings update.');
      return null;
    }
    
    const targetRef = doc(db, targetCollectionName, targetId);
    
    // Get the current document
    const targetDoc = await getDoc(targetRef);
    if (!targetDoc.exists()) {
      console.log(`[firebaseGpxAutoSaveService] Target document not found in ${targetCollectionName}: ${targetId}`);
      return null;
    }
    
    // Check if we need to upload the logo to Cloudinary
    let updatedHeaderSettings = { ...headerSettings };
    
    // Log the logo-related properties for debugging
    console.log('[firebaseGpxAutoSaveService] Logo properties:', {
      hasLogoFile: !!headerSettings.logoFile,
      hasLogoData: !!headerSettings.logoData,
      hasLogoBlob: !!headerSettings.logoBlob,
      logoUrl: headerSettings.logoUrl
    });
    
    // If we have a logo file, blob, or data, upload it to Cloudinary
    if (headerSettings.logoFile || headerSettings.logoData || headerSettings.logoBlob) {
      try {
        console.log('[firebaseGpxAutoSaveService] Uploading logo to Cloudinary');
        
        // Import the cloudinary utility functions
        const { uploadToCloudinary, getPublicIdFromUrl } = await import('../utils/cloudinary');
        
        // Determine which source to use for the upload
        let fileToUpload = null;
        
        // First try the blob directly
        if (headerSettings.logoBlob) {
          console.log('[firebaseGpxAutoSaveService] Using logoBlob for upload');
          fileToUpload = headerSettings.logoBlob;
        }
        // Then try the blob from logoData
        else if (headerSettings.logoData?._blobs?.original) {
          console.log('[firebaseGpxAutoSaveService] Using logoData._blobs.original for upload');
          fileToUpload = headerSettings.logoData._blobs.original;
        }
        // Then try the file from logoData
        else if (headerSettings.logoData?.file) {
          console.log('[firebaseGpxAutoSaveService] Using logoData.file for upload');
          fileToUpload = headerSettings.logoData.file;
        }
        // Finally try the logoFile
        else if (headerSettings.logoFile) {
          console.log('[firebaseGpxAutoSaveService] Using logoFile for upload');
          fileToUpload = headerSettings.logoFile;
        }
        
        if (fileToUpload) {
          // Upload the logo to Cloudinary
          const result = await uploadToCloudinary(fileToUpload);
          
          console.log('[firebaseGpxAutoSaveService] Logo uploaded successfully:', result);
          
          // Update the header settings with the Cloudinary URL
          updatedHeaderSettings = {
            ...updatedHeaderSettings,
            logoUrl: result.url,
            logoPublicId: result.publicId,
            // Remove the file objects to avoid storing them in Firebase
            logoFile: null,
            logoData: null,
            logoBlob: null
          };
        } else {
          console.warn('[firebaseGpxAutoSaveService] No logo file found to upload');
        }
      } catch (error) {
        console.error('[firebaseGpxAutoSaveService] Error uploading logo to Cloudinary:', error);
        // Continue with the original header settings if upload fails
      }
    } else if (headerSettings.logoUrl && headerSettings.logoUrl.startsWith('blob:')) {
      // If we have a blob URL but no file to upload, clear the URL to avoid storing invalid URLs
      console.warn('[firebaseGpxAutoSaveService] Found blob URL but no file to upload, clearing URL');
      updatedHeaderSettings.logoUrl = null;
    }
    
    // Update the timestamp and header settings in the main document
    await updateDoc(targetRef, {
      updatedAt: serverTimestamp(),
      headerSettings: updatedHeaderSettings
    });
    
    console.log('=================================================================');
    console.log(`✅✅✅ FIREBASE UPDATE COMPLETE FOR HEADER SETTINGS IN ${targetCollectionName} ✅✅✅`);
    console.log(`✅✅✅ TARGET ID: ${targetId} ✅✅✅`);
    console.log(`✅✅✅ UPDATED HEADER SETTINGS: ${JSON.stringify(updatedHeaderSettings)} ✅✅✅`);
    console.log('=================================================================');
    
    return targetId;
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR UPDATING HEADER SETTINGS ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    return null;
  }
};

/**
 * Update master route description in Firebase
 * @param {string} description - The description text for the master route
 * @param {Object} statistics - Optional statistics for the master route
 * @param {string} userId - The ID of the current user
 * @param {Object} autoSaveContext - Optional AutoSaveContext from a component
 * @returns {Promise<string|null>} - The auto-save ID if successful, null otherwise
 */
export const updateMasterRouteInFirebase = async (description, statistics = {}, userId, autoSaveContext = null) => {
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
        console.log('[firebaseGpxAutoSaveService] Could not access AutoSaveContext via hook:', error.message);
      }
    }
    
    console.log('=================================================================');
    console.log(`🔄🔄🔄 FIREBASE UPDATING MASTER ROUTE DESCRIPTION 🔄🔄🔄`);
    console.log('=================================================================');
    
    // Check if Firebase is initialized
    if (!db) {
      console.log('=================================================================');
      console.log('❌❌❌ FIREBASE NOT INITIALIZED, SKIPPING UPDATE ❌❌❌');
      console.log('=================================================================');
      return null;
    }
    
    // Find the auto-save ID
    let autoSaveId = null;
    
    // Check various sources for the auto-save ID
    if (autoSave && autoSave.autoSaveId) {
      autoSaveId = autoSave.autoSaveId;
    } else if (firebaseAutoSaveStatus.autoSaveId) {
      autoSaveId = firebaseAutoSaveStatus.autoSaveId;
    }
    
    if (!autoSaveId) {
      console.log('[firebaseGpxAutoSaveService] No auto-save ID found for master route update');
      return null;
    }
    
    // Update the main auto-save document with timestamp
    const autoSaveRef = doc(db, 'gpx_auto_saves', autoSaveId);
    
    // Get the current document
    const autoSaveDoc = await getDoc(autoSaveRef);
    if (!autoSaveDoc.exists()) {
      console.log('[firebaseGpxAutoSaveService] Auto-save document not found:', autoSaveId);
      return null;
    }
    
    // Check if the route type is Bikepacking
    const routeType = autoSaveDoc.data().routeType;
    if (routeType !== 'Bikepacking') {
      console.log('[firebaseGpxAutoSaveService] Route type is not Bikepacking, cannot update master route');
      return null;
    }
    
    // Update the timestamp in the main document
    await updateDoc(autoSaveRef, {
      updatedAt: serverTimestamp()
    });
    
    // Update the master route document
    const masterRouteRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'masterRoute');
    
    // Check if the master route document exists
    const masterRouteDoc = await getDoc(masterRouteRef);
    if (masterRouteDoc.exists()) {
      // Update the existing document
      await updateDoc(masterRouteRef, {
        data: {
          description: description,
          statistics: statistics
        }
      });
      console.log('[firebaseGpxAutoSaveService] Updated existing master route document');
    } else {
      // Create a new document
      await setDoc(masterRouteRef, {
        data: {
          description: description,
          statistics: statistics
        }
      });
      console.log('[firebaseGpxAutoSaveService] Created new master route document');
    }
    
    console.log('=================================================================');
    console.log(`✅✅✅ FIREBASE UPDATE COMPLETE FOR MASTER ROUTE ✅✅✅`);
    console.log(`✅✅✅ AUTO-SAVE ID: ${autoSaveId} ✅✅✅`);
    console.log('=================================================================');
    
    return autoSaveId;
  } catch (error) {
    console.log('=================================================================');
    console.log('❌❌❌ FIREBASE ERROR UPDATING MASTER ROUTE ❌❌❌');
    console.log('ERROR:', error.message);
    console.log('STACK:', error.stack);
    console.log('=================================================================');
    return null;
  }
};

export default {
  autoSaveGpxToFirebase,
  deleteAutoSaveFromFirebase,
  updateRouteInFirebase,
  updateMasterRouteInFirebase,
  updateHeaderSettingsInFirebase,
  getFirebaseAutoSaveStatus
};
