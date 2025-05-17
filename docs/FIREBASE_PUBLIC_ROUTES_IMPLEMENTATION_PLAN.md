# Firebase Public Routes Implementation Plan

This document outlines a plan for implementing the listing of public routes from Firebase for the landing page, including the necessary queries and indexes to support the filters currently used.

## Current State

The landing page currently loads routes from MongoDB and applies filters client-side in the `useRouteFilters` hook. These filters include:
- searchTerm
- selectedState
- selectedRegion
- selectedMapTypes
- surfaceType
- distanceFilter
- routeTypeFilter

When switching to Firebase, we need to implement a service that can efficiently query routes with these filters.

## Implementation Plan

### 1. Create a Firebase Public Routes Service

Create a new service file `src/services/firebasePublicRouteService.js` that will handle listing public routes from Firebase:

```javascript
/**
 * Firebase Public Route Service
 * 
 * This service handles listing public routes from Firebase for the landing page.
 * It provides functions to fetch and filter routes based on various criteria.
 */

import { db } from './firebaseService';
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
 * @param {number} limit - Maximum number of routes to return
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
      collection(db, 'routes'),
      where('metadata/info/isPublic', '==', true),
      orderBy('metadata/info/updatedAt', 'desc')
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
            collection(db, 'routes'),
            where('__name__', 'in', routeIds),
            orderBy('metadata/info/updatedAt', 'desc')
          );
        } else {
          // For more than 10 IDs, we'll need to do multiple queries
          // This will be handled in the implementation
          console.log('[firebasePublicRouteService] More than 10 route IDs, will need multiple queries');
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
        where('metadata/info/state', '==', filters.state)
      );
    }
    
    // Apply region filter if provided
    if (filters.region) {
      routesQuery = query(
        routesQuery,
        where('metadata/info/lga', 'array-contains', filters.region)
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
            where('metadata/info/totalDistance', '>=', range[0])
          );
        } else {
          routesQuery = query(
            routesQuery,
            where('metadata/info/totalDistance', '>=', range[0]),
            where('metadata/info/totalDistance', '<', range[1])
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
          where('metadata/info/unpavedPercentage', '>=', range[0]),
          where('metadata/info/unpavedPercentage', '<', range[1])
        );
      }
    }
    
    // Apply route type filter if provided
    if (filters.routeTypeFilter && filters.routeTypeFilter !== 'all') {
      const isLoop = filters.routeTypeFilter === 'loop';
      routesQuery = query(
        routesQuery,
        where('metadata/info/isLoop', '==', isLoop)
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
        route.metadata?.info?.name?.toLowerCase().includes(searchTermLower)
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
 * Get the current Firebase data loading status
 * @returns {Object} - The current status object
 */
export const getFirebasePublicRouteStatus = () => {
  return { ...firebasePublicRouteStatus };
};

export default {
  listPublicRoutes,
  getFirebasePublicRouteStatus
};
```

### 2. Update the Landing Page Component

Modify the `LandingPage.js` component to use the new Firebase service instead of the MongoDB-based service:

```javascript
import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service';
import { listPublicRoutes } from '../../services/firebasePublicRouteService';
import { withPerformanceTracking, logPerformanceSummary } from '../../../../utils/performanceUtils';
// ... other imports

export const LandingPage = () => {
  // ... existing state and hooks
  
  // Add a state to track the data source
  const [dataSource, setDataSource] = useState('mongodb');
  
  // Initialize with loading state and fetch routes
  useEffect(() => {
    console.time('LandingPage-TotalLoadTime');
    
    // Start in loading state
    setLoading(true);
    
    // Fetch routes in the background
    const fetchFeaturedRoutes = async () => {
      try {
        console.time('FetchRoutesOperation');
        
        let routes = [];
        
        // Try to fetch from Firebase first
        try {
          routes = await withPerformanceTracking(
            () => listPublicRoutes(),
            'firebasePublicRouteService.listPublicRoutes'
          )();
          
          if (routes.length > 0) {
            console.log('Routes loaded from Firebase:', routes.length);
            setDataSource('firebase');
          } else {
            // Fall back to MongoDB if no routes found in Firebase
            console.log('No routes found in Firebase, falling back to MongoDB');
            routes = await withPerformanceTracking(
              publicRouteService.listRoutes,
              'publicRouteService.listRoutes'
            )();
            setDataSource('mongodb');
          }
        } catch (firebaseError) {
          console.error('Error fetching from Firebase:', firebaseError);
          
          // Fall back to MongoDB
          console.log('Falling back to MongoDB due to Firebase error');
          routes = await withPerformanceTracking(
            publicRouteService.listRoutes,
            'publicRouteService.listRoutes'
          )();
          setDataSource('mongodb');
        }
        
        console.timeEnd('FetchRoutesOperation');
        setAllRoutes(routes);
        
        // Set loading to false and show route cards
        setLoading(false);
        setShowRouteCards(true);
        
        console.timeEnd('LandingPage-TotalLoadTime');
      }
      catch (error) {
        setError('Failed to load featured routes');
        console.error('Error fetching featured routes:', error);
        setLoading(false);
      }
    };
    
    // Start fetching routes
    fetchFeaturedRoutes();
    
    return () => {
      // Cleanup
    };
  }, []);
  
  // ... rest of the component
};
```

### 3. Update the useRouteFilters Hook

Modify the `useRouteFilters.jsx` hook to handle both MongoDB and Firebase data structures:

```javascript
import { useState, useEffect, useMemo } from 'react';
import { calculateUnpavedPercentage } from './RouteCard.jsx';
import { withPerformanceTracking } from '../../../../utils/performanceUtils';
import { listPublicRoutes } from '../../../../services/firebasePublicRouteService';

// ... existing code

export const useRouteFilters = (allRoutes) => {
  // ... existing state and functions
  
  // Add a state to track if we're using Firebase data
  const [isFirebaseData, setIsFirebaseData] = useState(false);
  
  // Detect if we're using Firebase data based on the structure
  useEffect(() => {
    if (allRoutes && allRoutes.length > 0) {
      // Check if this is Firebase data by looking for the metadata/info structure
      const isFirebase = allRoutes[0].metadata?.info !== undefined;
      setIsFirebaseData(isFirebase);
      console.log(`Data source detected: ${isFirebase ? 'Firebase' : 'MongoDB'}`);
    }
  }, [allRoutes]);
  
  // Apply filters to routes
  useEffect(() => {
    console.time('ApplyFilters-Effect');
    if (!allRoutes.length) {
      console.timeEnd('ApplyFilters-Effect');
      return;
    }
    
    // If using Firebase data and we have filters, fetch filtered data from Firebase
    if (isFirebaseData && (
      searchTerm || 
      selectedState || 
      selectedRegion || 
      selectedMapTypes.length > 0 || 
      surfaceType !== 'all' || 
      distanceFilter !== 'any' || 
      routeTypeFilter !== 'all'
    )) {
      const fetchFilteredRoutes = async () => {
        try {
          console.time('FirebaseFilteredFetch');
          
          // Create filters object
          const filters = {
            searchTerm,
            state: selectedState,
            region: selectedRegion,
            mapTypes: selectedMapTypes,
            surfaceType,
            distanceFilter,
            routeTypeFilter
          };
          
          // Fetch filtered routes from Firebase
          const filteredRoutes = await listPublicRoutes(filters);
          
          console.timeEnd('FirebaseFilteredFetch');
          
          // Update state
          setFilteredRoutes(filteredRoutes);
          setDisplayedRoutes(filteredRoutes.slice(0, visibleCount));
          setHasMore(filteredRoutes.length > visibleCount);
        } catch (error) {
          console.error('Error fetching filtered routes from Firebase:', error);
          
          // Fall back to client-side filtering
          applyClientSideFilters();
        }
      };
      
      fetchFilteredRoutes();
    } else {
      // Use client-side filtering for MongoDB data or when no filters are applied
      applyClientSideFilters();
    }
    
    console.timeEnd('ApplyFilters-Effect');
  }, [
    allRoutes, 
    searchTerm, 
    selectedState, 
    selectedRegion, 
    selectedMapTypes, 
    surfaceType, 
    distanceFilter,
    routeTypeFilter,
    visibleCount,
    isFirebaseData
  ]);
  
  // Client-side filtering function
  const applyClientSideFilters = () => {
    let result = [...allRoutes];
    
    // Apply search term filter
    if (searchTerm) {
      console.time('SearchTermFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
          const routeName = isFirebaseData 
            ? route.metadata?.info?.name 
            : route.name;
          return routeName?.toLowerCase().includes(searchTerm.toLowerCase());
        }),
        'searchTermFilter'
      )();
      console.timeEnd('SearchTermFilter');
    }
    
    // Apply state filter based on metadata
    if (selectedState) {
      console.time('StateFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
          const routeState = isFirebaseData 
            ? route.metadata?.info?.state 
            : route.metadata?.state;
          return routeState === selectedState;
        }),
        'stateFilter'
      )();
      console.timeEnd('StateFilter');
    }
    
    // Apply region filter based on metadata
    if (selectedRegion) {
      console.time('RegionFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
          const routeLga = isFirebaseData 
            ? route.metadata?.info?.lga 
            : route.metadata?.lga;
          
          if (!routeLga) return false;
          
          // Handle both array and string formats
          if (Array.isArray(routeLga)) {
            return routeLga.includes(selectedRegion);
          } else {
            // Split LGAs by comma and trim whitespace
            const lgas = routeLga.split(',').map(lga => lga.trim());
            return lgas.includes(selectedRegion);
          }
        }),
        'regionFilter'
      )();
      console.timeEnd('RegionFilter');
    }
    
    // Apply map type filter
    if (selectedMapTypes.length > 0) {
      console.time('MapTypeFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
          // Get route type based on data structure
          const routeType = isFirebaseData 
            ? route.metadata?.info?.type 
            : route.type;
          
          // Convert route type to match our filter options format
          const formattedType = routeType?.charAt(0).toUpperCase() + routeType?.slice(1);
          return selectedMapTypes.includes(formattedType);
        }),
        'mapTypeFilter'
      )();
      console.timeEnd('MapTypeFilter');
    }
    
    // Apply surface type filter
    if (surfaceType !== 'all') {
      console.time('SurfaceTypeFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
          // Get unpaved percentage based on data structure
          let unpavedPercentage;
          
          if (isFirebaseData) {
            unpavedPercentage = route.metadata?.info?.unpavedPercentage;
          } else {
            // Use the calculation for MongoDB data
            unpavedPercentage = calculateUnpavedPercentage(route);
          }
          
          switch (surfaceType) {
            case 'road': return unpavedPercentage < 10;
            case 'mixed': return unpavedPercentage >= 10 && unpavedPercentage < 60;
            case 'unpaved': return unpavedPercentage >= 10; // Include both mixed terrain and unpaved routes
            default: return true;
          }
        }),
        'surfaceTypeFilter'
      )();
      console.timeEnd('SurfaceTypeFilter');
    }
    
    // Apply distance filter
    if (distanceFilter !== 'any') {
      console.time('DistanceFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
          // Get total distance based on data structure
          let totalDistance;
          
          if (isFirebaseData) {
            totalDistance = route.metadata?.info?.totalDistance;
          } else {
            // Check if we have the distance in metadata
            if (route.metadata?.totalDistance !== undefined) {
              totalDistance = route.metadata.totalDistance;
            } else {
              // Fall back to calculation if metadata is not available
              if (!route.routes || route.routes.length === 0) return false;
              
              // Calculate total distance in km (without formatting)
              totalDistance = Math.round(route.routes
                .filter(r => r.statistics?.totalDistance)
                .reduce((total, r) => total + r.statistics.totalDistance, 0) / 1000);
            }
          }
          
          switch (distanceFilter) {
            case 'under50': return totalDistance < 50;
            case '50to100': return totalDistance >= 50 && totalDistance < 100;
            case '100to200': return totalDistance >= 100 && totalDistance < 200;
            case '200to500': return totalDistance >= 200 && totalDistance < 500;
            case 'over500': return totalDistance >= 500;
            default: return true;
          }
        }),
        'distanceFilter'
      )();
      console.timeEnd('DistanceFilter');
    }
    
    // Apply loop/point-to-point filter
    if (routeTypeFilter !== 'all') {
      console.time('RouteTypeFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
          // Get isLoop value based on data structure
          let isLoop;
          
          if (isFirebaseData) {
            isLoop = route.metadata?.info?.isLoop;
          } else {
            // Determine if it's a loop based on start/end points
            if (!route.routes || route.routes.length === 0) return false;
            
            const coordinates = route.routes[0]?.geojson?.features?.[0]?.geometry?.coordinates;
            if (!coordinates || coordinates.length < 2) return false;
            
            const start = coordinates[0];
            const end = coordinates[coordinates.length - 1];
            
            // Calculate distance between start and end points
            const dx = (end[0] - start[0]) * Math.cos((start[1] + end[1]) / 2 * Math.PI / 180);
            const dy = end[1] - start[1];
            const distance = Math.sqrt(dx * dx + dy * dy) * 111.32 * 1000; // approx meters
            
            // If start and end are within 5km, consider it a loop
            isLoop = distance < 5000;
          }
          
          if (routeTypeFilter === 'loop') {
            return isLoop;
          } else {
            return !isLoop;
          }
        }),
        'routeTypeFilter'
      )();
      console.timeEnd('RouteTypeFilter');
    }
    
    console.time('UpdateFilteredRoutes');
    setFilteredRoutes(result);
    setDisplayedRoutes(result.slice(0, visibleCount));
    setHasMore(result.length > visibleCount);
    console.timeEnd('UpdateFilteredRoutes');
  };
  
  // ... rest of the hook
  
  return {
    // ... existing return values
    isFirebaseData,
    applyClientSideFilters
  };
};
```

### 4. Create Required Composite Indexes in Firebase

To support the filters used in the landing page, create the following composite indexes in the Firebase console:

> **Important Note About Field Paths**: 
> 
> When creating indexes in the Firebase console, you may encounter an error when trying to use nested field paths with slashes like `metadata/info/isPublic`. If you see an error message saying "Field path is reserved", you'll need to use one of these approaches:
> 
> 1. Use dot notation instead of slashes: `metadata.info.isPublic`
> 2. If dot notation doesn't work either, you may need to flatten your data structure or create the indexes programmatically
> 
> The service code has been updated to try multiple field path formats to determine which one works with your specific Firebase setup.

1. For basic public routes listing with sorting:
   - Collection: `routes`
   - Fields: 
     - `isPublic` (Ascending)
     - `updatedAt` (Descending)

2. For filtering by state:
   - Collection: `routes`
   - Fields: 
     - `isPublic` (Ascending)
     - `state` (Ascending)
     - `updatedAt` (Descending)

3. For filtering by region:
   - Collection: `routes`
   - Fields: 
     - `isPublic` (Ascending)
     - `lga` (Array contains)
     - `updatedAt` (Descending)

4. For filtering by type:
   - Collection: `routes`
   - Fields: 
     - `isPublic` (Ascending)
     - `type` (Ascending)
     - `updatedAt` (Descending)

5. For filtering by surface type:
   - Collection: `routes`
   - Fields: 
     - `isPublic` (Ascending)
     - `unpavedPercentage` (Ascending)
     - `updatedAt` (Descending)

6. For filtering by distance:
   - Collection: `routes`
   - Fields: 
     - `isPublic` (Ascending)
     - `totalDistance` (Ascending)
     - `updatedAt` (Descending)

7. For filtering by route type (loop vs. point-to-point):
   - Collection: `routes`
   - Fields: 
     - `isPublic` (Ascending)
     - `isLoop` (Ascending)
     - `updatedAt` (Descending)

8. For combined filters (state + type):
   - Collection: `routes`
   - Fields: 
     - `isPublic` (Ascending)
     - `state` (Ascending)
     - `type` (Ascending)
     - `updatedAt` (Descending)

9. For combined filters (type + distance):
   - Collection: `routes`
   - Fields: 
     - `isPublic` (Ascending)
     - `type` (Ascending)
     - `totalDistance` (Ascending)
     - `updatedAt` (Descending)

#### Alternative: Creating Indexes Programmatically

If you're having trouble creating indexes through the Firebase console, you can create them programmatically using the Firebase Admin SDK:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Create the index for basic public routes listing
db.collection('routes')
  .createIndex({
    fields: [
      { fieldPath: 'isPublic', order: 'ASCENDING' },
      { fieldPath: 'updatedAt', order: 'DESCENDING' }
    ]
  })
  .then(result => {
    console.log('Index created:', result);
  })
  .catch(error => {
    console.error('Error creating index:', error);
  });

// Create other indexes similarly
```

#### Checking Document Structure

To ensure you're creating the correct indexes, you can check the structure of your documents in the Firebase console:

1. Go to the Firestore Database section
2. Navigate to the `routes` collection
3. Click on a document to view its structure
4. Note the field names and their nesting structure

Make sure the field paths in your indexes match the actual structure of your documents.

### 5. Update the Route Card Component

Modify the `RouteCard.jsx` component to handle both MongoDB and Firebase data structures:

```javascript
// ... existing imports

export const RouteCard = ({ route, isFirebaseData = false }) => {
  // Extract data based on the data structure
  const name = isFirebaseData ? route.metadata?.info?.name : route.name;
  const type = isFirebaseData ? route.metadata?.info?.type : route.type;
  const state = isFirebaseData ? route.metadata?.info?.state : route.metadata?.state;
  const thumbnailUrl = isFirebaseData ? route.metadata?.info?.staticMapUrl : route.staticMapUrl;
  const persistentId = isFirebaseData ? route.id : route.persistentId;
  
  // Extract statistics based on the data structure
  let totalDistance, totalAscent, unpavedPercentage;
  
  if (isFirebaseData) {
    totalDistance = route.metadata?.info?.statistics?.totalDistance || route.metadata?.info?.totalDistance;
    totalAscent = route.metadata?.info?.statistics?.totalAscent || route.metadata?.info?.totalAscent;
    unpavedPercentage = route.metadata?.info?.unpavedPercentage;
  } else {
    // Use existing logic for MongoDB data
    totalDistance = route.metadata?.totalDistance;
    totalAscent = route.metadata?.totalAscent;
    unpavedPercentage = calculateUnpavedPercentage(route);
  }
  
  // ... rest of the component
};
```

### 6. Implement Pagination

Update the `loadMoreRoutes` function in the `useRouteFilters` hook to handle pagination with Firebase:

```javascript
const loadMoreRoutes = async () => {
  if (isFirebaseData && (
    searchTerm || 
    selectedState || 
    selectedRegion || 
    selectedMapTypes.length > 0 || 
    surfaceType !== 'all' || 
    distanceFilter !== 'any' || 
    routeTypeFilter !== 'all'
  )) {
    // Get the last displayed route
    const lastRoute = displayedRoutes[displayedRoutes.length - 1];
    
    // Create filters object
    const filters = {
      searchTerm,
      state: selectedState,
      region: selectedRegion,
      mapTypes: selectedMapTypes,
      surfaceType,
      distanceFilter,
      routeTypeFilter
    };
    
    // Fetch more routes from Firebase
    const moreRoutes = await listPublicRoutes(filters, 20, lastRoute);
    
    // Update state
    const newFilteredRoutes = [...filteredRoutes, ...moreRoutes];
    setFilteredRoutes(newFilteredRoutes);
    
    const nextVisibleCount = visibleCount + 20;
    setVisibleCount(nextVisibleCount);
    setDisplayedRoutes(newFilteredRoutes.slice(0, nextVisibleCount));
    setHasMore(moreRoutes.length > 0);
  } else {
    // Use existing client-side pagination for MongoDB data
    const nextVisibleCount = visibleCount + 20;
    setVisibleCount(nextVisibleCount);
    setDisplayedRoutes(filteredRoutes.slice(0, nextVisibleCount));
    setHasMore(nextVisibleCount < filteredRoutes.length);
  }
};
```

### 7. Testing and Validation

1. Test the implementation with a small set of routes in Firebase
2. Verify that all filters work correctly
3. Test pagination
4. Compare performance with the MongoDB implementation
5. Gradually migrate more routes to Firebase
6. Monitor performance and make adjustments as needed

### 8. Fallback Mechanism

Implement a fallback mechanism to use MongoDB if Firebase is not available or if there are no routes in Firebase:

```javascript
// In LandingPage.js

// Add a state to track the data source
const [dataSource, setDataSource] = useState('mongodb');

// Fetch routes function
const fetchFeaturedRoutes = async () => {
  try {
    console.time('FetchRoutesOperation');
    
    let routes = [];
    
    // Try to fetch from Firebase first
    try {
      routes = await withPerformanceTracking(
        () => listPublicRoutes(),
        'firebasePublicRouteService.listPublicRoutes'
      )();
      
      if (routes.length > 0) {
        console.log('Routes loaded from Firebase:', routes.length);
        setDataSource('firebase');
      } else {
        // Fall back to MongoDB if no routes found in Firebase
        console.log('No routes found in Firebase, falling back to MongoDB');
        routes = await withPerformanceTracking(
          publicRouteService.listRoutes,
          'publicRouteService.listRoutes'
        )();
        setDataSource('mongodb');
      }
    } catch (firebaseError) {
      console.error('Error fetching from Firebase:', firebaseError);
      
      // Fall back to MongoDB
      console.log('Falling back to MongoDB due to Firebase error');
      routes = await withPerformanceTracking(
        publicRouteService.listRoutes,
        'publicRouteService.listRoutes'
      )();
      setDataSource('mongodb');
    }
    
    console.timeEnd('FetchRoutesOperation');
    setAllRoutes(routes);
    
    // Set loading to false and show route cards
    setLoading(false);
    setShowRouteCards(true);
    
    console.timeEnd('LandingPage-TotalLoadTime');
  }
  catch (error) {
    setError('Failed to load featured routes');
    console.error('Error fetching featured routes:', error);
    setLoading(false);
  }
};
```

## Performance Considerations

1. **Server-side vs. Client-side Filtering**:
   - Use server-side filtering (Firebase queries) for filters that can be efficiently implemented with Firestore queries
   - Use client-side filtering for text search and complex filters that can't be
