#!/usr/bin/env node

import fetch from 'node-fetch';
import mongoose from 'mongoose';
import { connectToDatabase } from './api/lib/db.js';

// The route ID to test
const ROUTE_ID = '67b56367-5952-4a2a-9eb9-63ab467b5636';

// Define Route schema (same as in api/routes/index.js)
const RouteSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  isPublic: { type: Boolean, default: false },
  publicId: { type: String, index: true, sparse: true },
  data: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  persistentId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

async function main() {
  console.log('=== ROUTE API DEBUGGING SCRIPT ===');
  console.log(`Testing route ID: ${ROUTE_ID}`);
  
  // STEP 1: Test direct API call
  console.log('\n=== STEP 1: Testing direct API call ===');
  try {
    const apiUrl = `http://localhost:3000/api/routes/${ROUTE_ID}`;
    console.log(`Making request to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, response.headers.raw());
    
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      let errorText;
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Could not read response text';
      }
      console.error('Error response:', errorText);
    }
  } catch (error) {
    console.error('API call error:', error);
  }
  
  // STEP 2: Test direct database access
  console.log('\n=== STEP 2: Testing direct database access ===');
  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Connected to database');
    
    // Initialize the model
    let Route;
    try {
      // Try to get the model if it exists
      Route = mongoose.model('Route');
      console.log('Using existing Route model');
    } catch (e) {
      // Create the model if it doesn't exist
      Route = mongoose.model('Route', RouteSchema);
      console.log('Created new Route model');
    }
    
    // Get a count of routes in the database
    const routeCount = await Route.countDocuments();
    console.log(`Total routes in database: ${routeCount}`);
    
    // List all routes
    const allRoutes = await Route.find().select('persistentId name isPublic');
    console.log('All routes:', allRoutes.map(r => ({ 
      id: r.persistentId, 
      name: r.name,
      isPublic: r.isPublic
    })));
    
    // Try to find the route by persistentId
    console.log(`\nLooking for route with persistentId: ${ROUTE_ID}`);
    const route = await Route.findOne({ persistentId: ROUTE_ID });
    
    if (route) {
      console.log('Found route by persistentId:', {
        id: route.persistentId,
        name: route.name,
        isPublic: route.isPublic
      });
    } else {
      console.log('Route not found by persistentId');
      
      // Try a case-insensitive search
      console.log('Trying case-insensitive search...');
      const routeCaseInsensitive = await Route.findOne({ 
        persistentId: { $regex: new RegExp('^' + ROUTE_ID + '$', 'i') } 
      });
      
      if (routeCaseInsensitive) {
        console.log('Found route by case-insensitive persistentId:', {
          id: routeCaseInsensitive.persistentId,
          name: routeCaseInsensitive.name,
          isPublic: routeCaseInsensitive.isPublic
        });
      } else {
        console.log('Route not found by case-insensitive persistentId either');
      }
    }
    
    // STEP 3: Test public route API
    console.log('\n=== STEP 3: Testing public route API ===');
    const publicApiUrl = `http://localhost:3000/api/routes/public/${ROUTE_ID}`;
    console.log(`Making request to: ${publicApiUrl}`);
    
    const publicResponse = await fetch(publicApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Public API response status: ${publicResponse.status}`);
    
    if (publicResponse.ok) {
      const publicData = await publicResponse.json();
      console.log('Public API response data:', JSON.stringify(publicData, null, 2));
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
    console.error('Database access error:', error);
  } finally {
    // Close the database connection
    try {
      await mongoose.connection.close();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
  
  console.log('\n=== DEBUGGING COMPLETE ===');
}

main().catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});
