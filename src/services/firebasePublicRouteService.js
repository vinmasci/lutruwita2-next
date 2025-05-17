/**
 * Firebase Public Route Service
 * 
 * This service handles listing public routes from Firebase for the landing page.
 * It provides functions to fetch and filter routes based on various criteria.
 */

import { db, auth } from './firebaseService';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs,
  getDoc,
  doc
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

// Global state to track Firebase data loading status
export const firebasePublicRouteStatus = {
  isLoading: false,
  lastQuery: null,
  lastLoadTime: null,
  success: false,
  error: null
};

/**
 * List public routes from Firebase with optional filtering
 * @param {Object} filters - Optional filters to apply
 * @param {string} filters.searchTerm - Search term to filter by name
 * @param {string} filters.state - State to filter by
 * @param {string} filters.region - Region (LGA) to filter by
 * @param {Array} filters.mapTypes - Array of map types to filter by
 * @param {string} filters.surfaceType - Surface type to filter by (all, road, mixed, unpaved)
 * @param {string} filters.distanceFilter - Distance range to filter by (any, under50, 50to100, etc.)
 * @param {string} filters.routeTypeFilter - Route type to filter by (all, loop, point)
 * @param {number} pageSize - Maximum number of routes to return
 * @param {Object} lastRoute - Last route from previous query for pagination
 * @returns {Promise<Array>} - Array of routes
 */
export const listPublicRoutes = async (filters = {}, pageSize = 20, lastRoute = null) => {
  try {
    // Update loading status
    firebasePublicRouteStatus.isLoading = true;
    firebasePublicRouteStatus.error = null;
    
    console.log('[firebasePublicRouteService] Listing public routes with filters:', filters);
    
    // Start timing
    const startTime = performance.now();
    
    // Base query - get all routes with isPublic = true
    let routesQuery = query(
      collection(db, 'user_saved_routes'),
      where('isPublic', '==', true),
      orderBy('updatedAt', 'desc')
    );
    
    // Apply type filter if provided
    if (filters.mapTypes && filters.mapTypes.length > 0) {
      // Use the type_index collection for efficient filtering
      const routeIds = [];
      
      // Get route IDs for each selected type
      for (const type of filters.mapTypes) {
        const typeDoc = await getDoc(doc(db, 'type_index', type.toLowerCase()));
        if (typeDoc.exists()) {
          // Add route IDs from this type to the array
          const typeData = typeDoc.data();
          Object.keys(typeData)
            .filter(key => key !== 'updatedAt' && typeData[key] === true)
            .forEach(routeId => routeIds.push(routeId));
        }
      }
      
      // If we have route IDs, add a where clause to filter by them
      if (routeIds.length > 0) {
        // Firestore has a limit of 10 items in an 'in' query
        // If we have more than 10, we'll need to do multiple queries and combine the results
        if (routeIds.length <= 10) {
          routesQuery = query(
            collection(db, 'user_saved_routes'),
            where(doc.id, 'in', routeIds),
            orderBy('updatedAt', 'desc')
          );
        } else {
          // For more than 10 IDs, we'll need to do multiple queries
          // This will be handled below
          console.log('[firebasePublicRouteService] More than 10 route IDs, will need multiple queries');
          
          // We'll handle this case by doing multiple queries and combining the results
          const allRoutes = [];
          
          // Split the route IDs into chunks of 10
          for (let i = 0; i < routeIds.length; i += 10) {
            const chunkIds = routeIds.slice(i, i + 10);
            
            // Create a query for this chunk
            const chunkQuery = query(
              collection(db, 'user_saved_routes'),
              where(doc.id, 'in', chunkIds),
              orderBy('updatedAt', 'desc')
            );
            
            // Execute the query
            const chunkSnapshot = await getDocs(chunkQuery);
            
            // Add the results to the array
            chunkSnapshot.forEach(doc => {
              allRoutes.push({
                id: doc.id,
                ...doc.data()
              });
            });
          }
          
          // Sort the combined results by updatedAt
          allRoutes.sort((a, b) => {
            const aDate = a.updatedAt?.toDate() || new Date(0);
            const bDate = b.updatedAt?.toDate() || new Date(0);
            return bDate - aDate; // Descending order
          });
          
          // Apply search term filter client-side
          let filteredRoutes = allRoutes;
          if (filters.searchTerm) {
            const searchTermLower = filters.searchTerm.toLowerCase();
            filteredRoutes = allRoutes.filter(route => 
              route.name?.toLowerCase().includes(searchTermLower)
            );
          }
          
          // Calculate load time
          const endTime = performance.now();
          const loadTime = (endTime - startTime).toFixed(2);
          
          // Update status
          firebasePublicRouteStatus.isLoading = false;
          firebasePublicRouteStatus.success = true;
          firebasePublicRouteStatus.lastLoadTime = loadTime;
          
          console.log(`[firebasePublicRouteService] Loaded ${filteredRoutes.length} public routes in ${loadTime}ms using multiple queries`);
          
          // Return the filtered routes
          return filteredRoutes;
        }
      } else {
        // No routes found for the selected types
        console.log('[firebasePublicRouteService] No routes found for selected types');
        firebasePublicRouteStatus.isLoading = false;
        firebasePublicRouteStatus.success = true;
        firebasePublicRouteStatus.lastLoadTime = (performance.now() - startTime).toFixed(2);
        return [];
      }
    }
    
    // Apply state filter if provided
    if (filters.state) {
      routesQuery = query(
        routesQuery,
        where('states', 'array-contains', filters.state)
      );
    }
    
    // Apply region filter if provided
    if (filters.region) {
      routesQuery = query(
        routesQuery,
        where('lgas', 'array-contains', filters.region)
      );
    }
    
    // Apply distance filter if provided
    if (filters.distanceFilter && filters.distanceFilter !== 'any') {
      // Define distance ranges
      const distanceRanges = {
        'under50': [0, 50],
        '50to100': [50, 100],
        '100to200': [100, 200],
        '200to500': [200, 500],
        'over500': [500, Infinity]
      };
      
      const range = distanceRanges[filters.distanceFilter];
      if (range) {
        if (range[1] === Infinity) {
          routesQuery = query(
            routesQuery,
            where('totalDistance', '>=', range[0])
          );
        } else {
          routesQuery = query(
            routesQuery,
            where('totalDistance', '>=', range[0]),
            where('totalDistance', '<', range[1])
          );
        }
      }
    }
    
    // Apply surface type filter if provided
    if (filters.surfaceType && filters.surfaceType !== 'all') {
      // Define unpaved percentage ranges
      const unpavedRanges = {
        'road': [0, 10],
        'mixed': [10, 60],
        'unpaved': [10, 100]
      };
      
      const range = unpavedRanges[filters.surfaceType];
      if (range) {
        routesQuery = query(
          routesQuery,
          where('unpavedPercentage', '>=', range[0]),
          where('unpavedPercentage', '<', range[1])
        );
      }
    }
    
    // Apply route type filter if provided
    if (filters.routeTypeFilter && filters.routeTypeFilter !== 'all') {
      const isLoop = filters.routeTypeFilter === 'loop';
      routesQuery = query(
        routesQuery,
        where('isLoop', '==', isLoop)
      );
    }
    
    // Apply pagination
    if (lastRoute) {
      routesQuery = query(
        routesQuery,
        startAfter(lastRoute)
      );
    }
    
    // Apply limit
    routesQuery = query(
      routesQuery,
      limit(pageSize)
    );
    
    // Execute the query
    const querySnapshot = await getDocs(routesQuery);
    
    // Process the results
    const routes = [];
    querySnapshot.forEach(doc => {
      // Get the route metadata
      const routeData = doc.data();
      
      // Add the route ID
      const route = {
        id: doc.id,
        ...routeData
      };
      
      // Add to the results
      routes.push(route);
    });
    
    // Apply search term filter client-side (Firestore doesn't support full-text search)
    let filteredRoutes = routes;
    if (filters.searchTerm) {
      const searchTermLower = filters.searchTerm.toLowerCase();
      filteredRoutes = routes.filter(route => 
        route.name?.toLowerCase().includes(searchTermLower)
      );
    }
    
    // Calculate load time
    const endTime = performance.now();
    const loadTime = (endTime - startTime).toFixed(2);
    
    // Update status
    firebasePublicRouteStatus.isLoading = false;
    firebasePublicRouteStatus.success = true;
    firebasePublicRouteStatus.lastLoadTime = loadTime;
    
    console.log(`[firebasePublicRouteService] Loaded ${filteredRoutes.length} public routes in ${loadTime}ms`);
    
    return filteredRoutes;
  } catch (error) {
    console.error('[firebasePublicRouteService] Error listing public routes:', error);
    
    // Update status
    firebasePublicRouteStatus.isLoading = false;
    firebasePublicRouteStatus.success = false;
    firebasePublicRouteStatus.error = error.message;
    
    return [];
  }
};

/**
 * Get a single public route by ID
 * @param {string} routeId - The ID of the route to get
 * @returns {Promise<Object|null>} - The route data or null if not found
 */
export const getPublicRoute = async (routeId) => {
  try {
    // Update loading status
    firebasePublicRouteStatus.isLoading = true;
    firebasePublicRouteStatus.error = null;
    
    console.log(`[firebasePublicRouteService] Getting public route: ${routeId}`);
    
    // Start timing
    const startTime = performance.now();
    
    // Sign in anonymously to ensure we have authentication for accessing the route data
    try {
      // Check if we're already signed in
      if (!auth.currentUser) {
        console.log('[firebasePublicRouteService] Signing in anonymously to access route data');
        await signInAnonymously(auth);
        console.log('[firebasePublicRouteService] Successfully signed in anonymously');
      }
    } catch (authError) {
      console.warn('[firebasePublicRouteService] Error signing in anonymously:', authError);
      // Continue anyway, as we might still be able to access public routes
    }
    
    // Extract the UUID part if the routeId is in the format "route-{uuid}"
    const firebaseRouteId = routeId.startsWith('route-') ? routeId.substring(6) : routeId;
    
    // First try to get the route from the 'routes' collection
    let routeData = null;
    let routeSource = null;
    
    // Try the 'routes' collection first
    const routesRef = doc(db, 'routes', firebaseRouteId);
    const routesSnap = await getDoc(routesRef);
    
    if (routesSnap.exists()) {
      console.log(`[firebasePublicRouteService] Found route in 'routes' collection: ${firebaseRouteId}`);
      routeSource = 'routes';
      
      // Get metadata
      const metadataRef = doc(db, 'routes', firebaseRouteId, 'metadata', 'info');
      const metadataSnap = await getDoc(metadataRef);
      
      if (metadataSnap.exists()) {
        routeData = metadataSnap.data();
        
        // Check if the route is public
        if (!routeData.isPublic) {
          console.log(`[firebasePublicRouteService] Route is not public: ${routeId}`);
          
          // Update status
          firebasePublicRouteStatus.isLoading = false;
          firebasePublicRouteStatus.success = false;
          firebasePublicRouteStatus.error = 'Route is not public';
          
          return null;
        }
      }
    } else {
      // If not found in 'routes', try 'user_saved_routes'
      console.log(`[firebasePublicRouteService] Route not found in 'routes' collection, trying 'user_saved_routes': ${firebaseRouteId}`);
      
      const userSavedRoutesRef = doc(db, 'user_saved_routes', firebaseRouteId);
      const userSavedRoutesSnap = await getDoc(userSavedRoutesRef);
      
      if (userSavedRoutesSnap.exists()) {
        console.log(`[firebasePublicRouteService] Found route in 'user_saved_routes' collection: ${firebaseRouteId}`);
        routeSource = 'user_saved_routes';
        routeData = userSavedRoutesSnap.data();
        console.log(`[firebasePublicRouteService] Raw routeData from user_saved_routes for ${firebaseRouteId}:`, JSON.stringify(routeData, null, 2)); // Log raw data
        
        // Check if the route is public
        if (!routeData.isPublic) {
          console.log(`[firebasePublicRouteService] Route is not public: ${routeId}`);
          
          // Update status
          firebasePublicRouteStatus.isLoading = false;
          firebasePublicRouteStatus.success = false;
          firebasePublicRouteStatus.error = 'Route is not public';
          
          return null;
        }
      } else {
        console.log(`[firebasePublicRouteService] Route not found in any collection: ${routeId}`);
        
        // Update status
        firebasePublicRouteStatus.isLoading = false;
        firebasePublicRouteStatus.success = false;
        firebasePublicRouteStatus.error = 'Route not found';
        
        return null;
      }
    }
    
    // Initialize the route object with basic metadata
    const route = {
      id: firebaseRouteId,
      persistentId: firebaseRouteId,
      routeId: firebaseRouteId,
      ...routeData
    };
    
    // Get route data based on the source collection
    if (routeSource === 'routes') {
      try {
        // Get GeoJSON data from the 'routes' collection
        const geojsonRef = doc(db, 'routes', firebaseRouteId, 'geojson', 'routes');
        const geojsonSnap = await getDoc(geojsonRef);
        
        if (geojsonSnap.exists()) {
          // The routes collection has a different structure
          const routesData = geojsonSnap.data().routes;
          
          if (routesData && routesData.length > 0) {
            // Use the GeoJSON directly from the routes collection
            route.geojson = routesData[0].geojson;
            
            // Create routes array for compatibility with PresentationMapView
            route.routes = routesData.map(routeItem => ({
              ...routeItem,
              routeId: routeItem.routeId,
              id: routeItem.routeId,
              geojson: routeItem.geojson
            }));
          }
        }
        
        // If no GeoJSON found, try to get coordinates from the coordinates subcollection
        if (!route.geojson) {
          // Try to get all coordinates at once
          const allCoordsRef = doc(db, 'routes', firebaseRouteId, 'coordinates', 'all');
          const allCoordsSnap = await getDoc(allCoordsRef);
          
          if (allCoordsSnap.exists() && allCoordsSnap.data().coordinates) {
            // Create GeoJSON from coordinates
            const fetchedCoordinates = allCoordsSnap.data().coordinates;
            const coordinateProperties = {
              elevation: fetchedCoordinates.map(() => null) // Populate with nulls as elevation isn't directly here
              // Add other properties like time or heartrate if they become available and are stored here
            };
            route.geojson = {
              type: 'FeatureCollection', // Added type for FeatureCollection
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: fetchedCoordinates
                  },
                  properties: {
                    coordinateProperties: coordinateProperties
                  }
                }
              ]
            };
          } else {
            // If all coordinates not found, try to get chunked coordinates
            // This is more complex and would require multiple queries and combining the chunks
            console.log(`[firebasePublicRouteService] All coordinates not found, chunked coordinates not implemented yet`);
          }
        }
        
        // Get POIs
        const poisRef = doc(db, 'routes', firebaseRouteId, 'pois', 'data');
        const poisSnap = await getDoc(poisRef);
        
        if (poisSnap.exists()) {
          route.pois = poisSnap.data();
        }
        
        // Get lines
        const linesRef = doc(db, 'routes', firebaseRouteId, 'lines', 'data');
        const linesSnap = await getDoc(linesRef);
        
        if (linesSnap.exists()) {
          route.lines = linesSnap.data();
        }
        
        // Get photos
        const photosRef = doc(db, 'routes', firebaseRouteId, 'photos', 'data');
        const photosSnap = await getDoc(photosRef);
        
        if (photosSnap.exists()) {
          route.photos = photosSnap.data();
        }
      } catch (error) {
        console.error(`[firebasePublicRouteService] Error getting route data from 'routes' collection:`, error);
      }
    } else if (routeSource === 'user_saved_routes') {
      try {
        // Get route data from the 'user_saved_routes' collection
        // Get the route GeoJSON data
        const geojsonRef = doc(db, 'user_saved_routes', firebaseRouteId, 'data', 'routes');
        const geojsonSnap = await getDoc(geojsonRef);
        
        // Get route coordinates
        let routeCoordinates = [];
        if (geojsonSnap.exists() && geojsonSnap.data().data) {
          // Get the first route's coordinates
          const routesData = geojsonSnap.data().data;
          if (routesData.length > 0) {
            const firstRouteId = routesData[0].routeId;
            
            // Get coordinates for this route
            const coordsRef = doc(db, 'user_saved_routes', firebaseRouteId, 'routes', firstRouteId, 'data', 'coords');
            const coordsSnap = await getDoc(coordsRef);
            
            if (coordsSnap.exists() && coordsSnap.data().data) {
              routeCoordinates = coordsSnap.data().data;
            }
          }
        }
        
        // Create a GeoJSON structure from the coordinates
        if (routeCoordinates.length > 0) {
          // Convert from {lng, lat} objects to [lng, lat] arrays for GeoJSON
          // and extract coordinateProperties
          const coordinates = [];
          const coordinateProperties = {
            elevation: [],
            // Add other properties like time or heartrate if they become available
          };

          routeCoordinates.forEach(coord => {
            coordinates.push([coord.lng, coord.lat]);
            if (coord.elevation !== undefined) {
              coordinateProperties.elevation.push(coord.elevation);
            } else {
              coordinateProperties.elevation.push(null); // Keep arrays aligned
            }
            // Example for time if it were available:
            // if (coord.time) {
            //   coordinateProperties.time.push(coord.time);
            // } else {
            //   coordinateProperties.time.push(null);
            // }
          });
          
          route.geojson = {
            type: 'FeatureCollection', // Added type for FeatureCollection
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: coordinates
                },
                properties: {
                  coordinateProperties: coordinateProperties
                }
              }
            ]
          };
        }
        
        // Add routes array for compatibility with PresentationMapView
        if (geojsonSnap.exists() && geojsonSnap.data().data) {
          const routeItemsData = geojsonSnap.data().data;
          // Asynchronously fetch coordinates and create GeoJSON for each route item
          const processedRouteItems = await Promise.all(routeItemsData.map(async (routeItem) => {
            let itemGeojson = null;
            let itemUnpavedSections = [];
            const itemRouteId = routeItem.routeId || routeItem.id;

            // Fetch coordinates for the segment's GeoJSON
            const coordsRef = doc(db, 'user_saved_routes', firebaseRouteId, 'routes', itemRouteId, 'data', 'coords');
            const coordsSnap = await getDoc(coordsRef);
            if (coordsSnap.exists() && coordsSnap.data().data) {
              const itemRouteCoordinates = coordsSnap.data().data;
              if (itemRouteCoordinates.length > 0) {
                const coordinates = [];
                const coordinateProperties = { elevation: [] };
                itemRouteCoordinates.forEach(coord => {
                  coordinates.push([coord.lng, coord.lat]);
                  coordinateProperties.elevation.push(coord.elevation !== undefined ? coord.elevation : null);
                });
                itemGeojson = {
                  type: 'FeatureCollection',
                  features: [{
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: coordinates },
                    properties: { coordinateProperties: coordinateProperties }
                  }]
                };
              }
            }

            // Fetch unpaved sections for this segment
            const unpavedRef = doc(db, 'user_saved_routes', firebaseRouteId, 'routes', itemRouteId, 'data', 'unpaved');
            const unpavedSnap = await getDoc(unpavedRef);
            if (unpavedSnap.exists() && unpavedSnap.data().data) {
              // The 'data' field in the 'unpaved' document is an array of unpaved section objects
              const unpavedDataArray = unpavedSnap.data().data;
              if (Array.isArray(unpavedDataArray)) {
                itemUnpavedSections = unpavedDataArray.map(section => {
                  // Assuming section.coordinates is already an array of [lng, lat]
                  // and section.surfaceType exists.
                  // The schema screenshot shows coordinates as [{lat, lng}, ...], so we need to map them.
                  const sectionCoordinates = section.coordinates.map(c => [c.lng, c.lat]);
                  return {
                    coordinates: sectionCoordinates,
                    surfaceType: section.surfaceType || 'unpaved', // Default if not specified
                    // startIndex and endIndex might need to be derived or handled differently
                    // For now, focusing on getting the coordinates and type
                  };
                }).filter(section => section.coordinates && section.coordinates.length > 0);
              }
            }
            
            // If GeoJSON couldn't be created for this item, use the main route's GeoJSON or a default
            if (!itemGeojson) {
              itemGeojson = route.geojson || { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} }] };
            }

            return {
              ...routeItem,
              routeId: itemRouteId,
              id: itemRouteId,
              geojson: itemGeojson,
              unpavedSections: itemUnpavedSections // Add fetched unpaved sections
            };
          }));
          route.routes = processedRouteItems;
        } else {
          // Create a default route if none exists
          route.routes = [
            {
              routeId: firebaseRouteId,
              id: firebaseRouteId,
              name: routeData.name || 'Untitled Route',
              geojson: route.geojson
            }
          ];
        }
        
        // Get POIs
        const poisRef = doc(db, 'user_saved_routes', firebaseRouteId, 'data', 'pois');
        const poisSnap = await getDoc(poisRef);
        
        // Add POIs if available
        if (poisSnap.exists() && poisSnap.data().data && Array.isArray(poisSnap.data().data.draggable)) {
          // Ensure each POI has a unique ID, as POIContext expects it
          route.pois = poisSnap.data().data.draggable.map((poi, index) => ({
            ...poi,
            id: poi.id || `poi-${firebaseRouteId}-${index}` // Use existing id if present, otherwise generate one
          }));
        } else {
          route.pois = []; // Default to an empty array if POIs are not found or not in the expected format
        }
        
        // Get lines
        const linesRef = doc(db, 'user_saved_routes', firebaseRouteId, 'data', 'lines');
        const linesSnap = await getDoc(linesRef);
        
        // Add lines if available
        if (linesSnap.exists() && linesSnap.data().data) {
          route.lines = linesSnap.data().data;
        }
        
        // Get photos
        const photosRef = doc(db, 'user_saved_routes', firebaseRouteId, 'data', 'photos');
        const photosSnap = await getDoc(photosRef);
        
        // Add photos if available
        if (photosSnap.exists() && photosSnap.data().data) {
          route.photos = photosSnap.data().data;
        }
      } catch (error) {
        console.error(`[firebasePublicRouteService] Error getting route data from 'user_saved_routes' collection:`, error);
      }
    }
    
    // If we still don't have a geojson, create a default one
    if (!route.geojson) {
      console.log(`[firebasePublicRouteService] No GeoJSON found for route: ${routeId}`);
      route.geojson = {
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: []
            },
            properties: {}
          }
        ]
      };
    }
    
    // If we still don't have routes, create a default one
    if (!route.routes || route.routes.length === 0) {
      route.routes = [
        {
          routeId: firebaseRouteId,
          id: firebaseRouteId,
          name: routeData?.name || 'Untitled Route',
          geojson: route.geojson
        }
      ];
    }
    
    // Calculate load time
    const endTime = performance.now();
    const loadTime = (endTime - startTime).toFixed(2);
    
    // Update status
    firebasePublicRouteStatus.isLoading = false;
    firebasePublicRouteStatus.success = true;
    firebasePublicRouteStatus.lastLoadTime = loadTime;
    
    console.log(`[firebasePublicRouteService] Loaded public route in ${loadTime}ms from ${routeSource} collection`);
    console.log(`[firebasePublicRouteService] Route data:`, route);
    
    return route;
  } catch (error) {
    console.error('[firebasePublicRouteService] Error getting public route:', error);
    
    // Log the permission error but don't create a mock route
    if (error.code === 'permission-denied') {
      console.error('[firebasePublicRouteService] Permission denied error. Please check Firebase security rules.');
    }
    
    // Update status for other errors
    firebasePublicRouteStatus.isLoading = false;
    firebasePublicRouteStatus.success = false;
    firebasePublicRouteStatus.error = error.message;
    
    return null;
  }
};

/**
 * Get the current Firebase data loading status
 * @returns {Object} - The current status object
 */
export const getFirebasePublicRouteStatus = () => {
  return { ...firebasePublicRouteStatus };
};

export default {
  listPublicRoutes,
  getPublicRoute,
  getFirebasePublicRouteStatus
};
