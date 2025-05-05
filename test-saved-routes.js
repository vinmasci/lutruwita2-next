/**
 * Test script to verify the direct Cloudinary saved routes implementation
 */

import { saveUserSavedRoutesDirectly } from './api/lib/cloudinary.js';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './api/.env' });

// Manually configure Cloudinary with the values from .env
cloudinary.config({
  cloud_name: 'dig9djqnj',
  api_key: '682837882671547',
  api_secret: '1-yg9KSGYSSQzM2V9AuzWkBholk'
});

// Log Cloudinary configuration to verify
console.log('Cloudinary Configuration:');
console.log('- Cloud Name:', cloudinary.config().cloud_name);
console.log('- API Key exists:', !!cloudinary.config().api_key);

// Test user ID
const TEST_USER_ID = 'test-user-' + Date.now();

// Test route IDs
const TEST_ROUTE_IDS = ['route1', 'route2', 'route3'];

// Main function
async function main() {
  console.log('Starting saved routes test');
  console.log(`Test user ID: ${TEST_USER_ID}`);
  console.log(`Test route IDs: ${TEST_ROUTE_IDS.join(', ')}`);
  
  try {
    // Test direct saving
    console.log('\nTesting saveUserSavedRoutesDirectly...');
    const result = await saveUserSavedRoutesDirectly(TEST_USER_ID, TEST_ROUTE_IDS);
    console.log('Result:', result);
    
    console.log('\nTest completed successfully!');
    console.log('The saved routes should now be available at:');
    console.log(`${result.url}`);
    
    console.log('\nYou can verify this by opening the URL in a browser.');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the main function
main();
