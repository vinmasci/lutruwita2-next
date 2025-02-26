#!/usr/bin/env node

import fetch from 'node-fetch';

// The route ID to test
const ROUTE_ID = '67b56367-5952-4a2a-9eb9-63ab467b5636';

// Helper function to analyze object structure without printing the entire object
function analyzeStructure(obj, prefix = '') {
  if (!obj) {
    console.log(`${prefix}null or undefined`);
    return;
  }
  
  if (typeof obj !== 'object') {
    console.log(`${prefix}${typeof obj}: ${obj}`);
    return;
  }
  
  if (Array.isArray(obj)) {
    console.log(`${prefix}Array with ${obj.length} items`);
    if (obj.length > 0) {
      // Only analyze the first item in arrays
      console.log(`${prefix}First item:`);
      analyzeStructure(obj[0], prefix + '  ');
    }
    return;
  }
  
  // For objects, print keys and analyze first level values
  console.log(`${prefix}Object with keys: ${Object.keys(obj).join(', ')}`);
  
  // Check for specific properties we're interested in
  if (obj.persistentId !== undefined) {
    console.log(`${prefix}persistentId: ${obj.persistentId}`);
  }
  
  if (obj.name !== undefined) {
    console.log(`${prefix}name: ${obj.name}`);
  }
  
  if (obj.routes !== undefined) {
    console.log(`${prefix}routes: Array with ${obj.routes.length} items`);
    if (obj.routes.length > 0) {
      console.log(`${prefix}First route:`);
      analyzeStructure(obj.routes[0], prefix + '  ');
    }
  }
}

async function main() {
  console.log('=== PUBLIC ROUTE API DEBUGGING SCRIPT ===');
  console.log(`Testing route ID: ${ROUTE_ID}`);
  
  // Test public route API
  console.log('\n=== Testing public route API ===');
  const publicApiUrl = `http://localhost:3000/api/routes/public/${ROUTE_ID}`;
  console.log(`Making request to: ${publicApiUrl}`);
  
  try {
    const publicResponse = await fetch(publicApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Public API response status: ${publicResponse.status}`);
    console.log(`Response headers:`, publicResponse.headers.raw());
    
    const contentType = publicResponse.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    if (publicResponse.ok) {
      const publicData = await publicResponse.json();
      console.log('Public API response structure:');
      analyzeStructure(publicData, '  ');
      
      // Check specifically for the persistentId property
      if (publicData && publicData.persistentId) {
        console.log(`\nPublic API persistentId: ${publicData.persistentId}`);
      } else {
        console.log('\nWARNING: persistentId property is missing from the public API response!');
        console.log('This is likely causing the error in the frontend.');
      }
    } else {
      let errorText;
      try {
        errorText = await publicResponse.text();
      } catch (e) {
        errorText = 'Could not read response text';
      }
      console.error('Public API error response:', errorText);
    }
  } catch (error) {
    console.error('API call error:', error);
  }
  
  console.log('\n=== DEBUGGING COMPLETE ===');
}

main().catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});
