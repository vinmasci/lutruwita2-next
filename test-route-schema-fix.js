// Test script to verify the route schema fix
// This script creates a new route and then updates it to confirm the fix works

const fetch = require('node-fetch');

// Base URL for API requests
const API_BASE_URL = 'http://localhost:3000/api/routes';

// Sample route data for creation
const newRouteData = {
  name: 'Test Route Schema Fix',
  type: 'bikepacking',
  isPublic: false,
  userId: 'test-user',
  mapState: {
    zoom: 10,
    center: [146.8, -41.5],
    bearing: 0,
    pitch: 0,
    style: 'default'
  },
  routes: [
    {
      order: 0,
      routeId: 'route-test-1',
      name: 'Test Segment 1',
      color: '#ee5253',
      isVisible: true,
      geojson: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              name: 'Test Route Segment'
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [146.8, -41.5],
                [146.9, -41.6]
              ]
            }
          }
        ]
      }
    }
  ],
  pois: {
    draggable: [
      {
        id: 'test-poi-1',
        coordinates: [146.85, -41.55],
        name: 'Test POI',
        description: 'Test POI Description',
        category: 'road-information',
        icon: 'MapPin',
        photos: [],
        type: 'draggable'
      }
    ],
    places: []
  },
  data: {
    points: [],
    surfaces: []
  },
  metadata: {
    tags: ['test', 'schema-fix']
  }
};

// Sample update data
const updateData = {
  name: 'Updated Test Route',
  description: 'This route was updated to test the schema fix',
  viewCount: 1,
  pois: {
    draggable: [
      {
        id: 'test-poi-1',
        coordinates: [146.85, -41.55],
        name: 'Updated POI Name',
        description: 'Updated POI Description',
        category: 'road-information',
        icon: 'MapPin',
        photos: [],
        type: 'draggable'
      },
      {
        id: 'test-poi-2',
        coordinates: [146.9, -41.6],
        name: 'New POI',
        description: 'New POI added during update',
        category: 'town-services',
        icon: 'Bike',
        photos: [],
        type: 'draggable'
      }
    ]
  }
};

// Function to create a new route
async function createRoute() {
  console.log('Creating new test route...');
  
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newRouteData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create route: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Route created successfully!');
    console.log('Route ID:', data._id);
    console.log('Persistent ID:', data.persistentId);
    
    return data;
  } catch (error) {
    console.error('Error creating route:', error);
    throw error;
  }
}

// Function to update a route
async function updateRoute(persistentId) {
  console.log(`Updating route with persistentId: ${persistentId}...`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/${persistentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update route: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Route updated successfully!');
    console.log('Updated name:', data.name);
    console.log('Updated POIs count:', data.pois.draggable.length);
    
    return data;
  } catch (error) {
    console.error('Error updating route:', error);
    throw error;
  }
}

// Function to get a route
async function getRoute(persistentId) {
  console.log(`Getting route with persistentId: ${persistentId}...`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/${persistentId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get route: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Route retrieved successfully!');
    console.log('Route name:', data.name);
    console.log('Route type:', data.type);
    console.log('POIs count:', data.pois.draggable.length);
    
    return data;
  } catch (error) {
    console.error('Error getting route:', error);
    throw error;
  }
}

// Main function to run the test
async function runTest() {
  try {
    // Create a new route
    const createdRoute = await createRoute();
    
    // Wait a moment to ensure the route is saved
    console.log('Waiting for route to be saved...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update the route
    const updatedRoute = await updateRoute(createdRoute.persistentId);
    
    // Get the route to verify the update
    const retrievedRoute = await getRoute(createdRoute.persistentId);
    
    // Verify the update worked
    if (retrievedRoute.name === updateData.name && 
        retrievedRoute.pois.draggable.length === updateData.pois.draggable.length) {
      console.log('\n✅ TEST PASSED: Route was successfully updated with the new schema!');
    } else {
      console.log('\n❌ TEST FAILED: Route update did not work as expected.');
      console.log('Expected name:', updateData.name);
      console.log('Actual name:', retrievedRoute.name);
      console.log('Expected POIs count:', updateData.pois.draggable.length);
      console.log('Actual POIs count:', retrievedRoute.pois.draggable.length);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest();
