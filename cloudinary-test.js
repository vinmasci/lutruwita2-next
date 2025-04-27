/**
 * Test file for Cloudinary data fetching
 * 
 * This script tests the fetchRouteDataFromCloudinary function by:
 * 1. First fetching a list of public routes to find valid persistentIds
 * 2. Fetching minimal metadata for a route to get the embedUrl
 * 3. Using the embedUrl to fetch the full data from Cloudinary
 * 4. Logging the results
 * 
 * Usage: node cloudinary-test.js [routeId]
 * If no routeId is provided, it will use the first public route found
 */

import { fetchRouteDataFromCloudinary } from './src/utils/cloudinaryUtils.js';
import fetch from 'node-fetch';

// Use node-fetch for Node.js environment if needed
global.fetch = global.fetch || fetch;

// Base URL for API requests - adjust as needed for your environment
const API_BASE_URL = 'http://localhost:3000';

// Get the route ID from command line arguments
const routeIdArg = process.argv[2];

async function testCloudinaryFetch() {
  try {
    let routeId = routeIdArg;
    
    // If no route ID was provided, get a list of public routes and use the first one
    if (!routeId) {
      console.log('No route ID provided, fetching list of public routes...');
      const publicRoutesResponse = await fetch(`${API_BASE_URL}/api/routes/public`);
      
      if (!publicRoutesResponse.ok) {
        throw new Error(`Failed to fetch public routes: ${publicRoutesResponse.status} ${publicRoutesResponse.statusText}`);
      }
      
      const publicRoutes = await publicRoutesResponse.json();
      
      if (!publicRoutes.routes || publicRoutes.routes.length === 0) {
        throw new Error('No public routes found');
      }
      
      // Use the first route's persistentId
      routeId = publicRoutes.routes[0].persistentId;
      console.log(`Using first public route: ${publicRoutes.routes[0].name} (${routeId})`);
      
      // List all available routes for reference
      console.log('\nAvailable public routes:');
      publicRoutes.routes.forEach((route, index) => {
        console.log(`${index + 1}. ${route.name} (${route.persistentId})`);
      });
      console.log('');
    }
    
    console.log(`Testing Cloudinary data fetching for route: ${routeId}`);
    
    // Step 1: Fetch route data to get the embedUrl
    console.log(`Fetching route data from API to get embedUrl...`);
    const routeResponse = await fetch(`${API_BASE_URL}/api/routes/public/${routeId}`);
    
    if (!routeResponse.ok) {
      throw new Error(`Failed to fetch route data: ${routeResponse.status} ${routeResponse.statusText}`);
    }
    
    const routeData = await routeResponse.json();
    
    // Log the route data to see its structure
    console.log('Route data structure:');
    console.log(JSON.stringify(Object.keys(routeData), null, 2));
    
    if (!routeData.embedUrl) {
      console.log('No embedUrl found in route data. This means the route has not been processed for embedding yet.');
      
      // Since we don't have an embedUrl, we can't proceed with the Cloudinary fetch
      // In a real implementation, we would fall back to the direct API approach
      throw new Error('No embedUrl found in route data');
    }
    
    console.log(`Found embedUrl: ${routeData.embedUrl}`);
    
    // Step 2: Use the embedUrl to fetch the full data from Cloudinary
    console.log(`Fetching full data from Cloudinary...`);
    const cloudinaryData = await fetchRouteDataFromCloudinary(routeData.embedUrl);
    
    // Step 3: Log the results
    console.log('Successfully fetched data from Cloudinary:');
    console.log('Route Name:', cloudinaryData.name);
    console.log('Route Description:', cloudinaryData.description?.substring(0, 100) + '...');
    console.log('Number of Points:', cloudinaryData.points?.length || 0);
    console.log('Number of Photos:', cloudinaryData.photos?.length || 0);
    console.log('Number of POIs:', cloudinaryData.pois?.length || 0);
    
    // Log full data structure (but not all the data)
    console.log('\nData Structure:');
    console.log(JSON.stringify(Object.keys(cloudinaryData), null, 2));
    
    return cloudinaryData;
  } catch (error) {
    console.error('Error in test:', error);
    throw error;
  }
}

// Run the test
testCloudinaryFetch()
  .then(() => console.log('Test completed successfully'))
  .catch(error => console.error('Test failed:', error));
