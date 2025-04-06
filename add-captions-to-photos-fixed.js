// Script to add empty caption fields to all existing photos in the routes collection
// Run with: node add-captions-to-photos-fixed.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialize dotenv
dotenv.config();

// Get current file directory (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string - hardcoded to the correct database
const MONGODB_URI = 'mongodb+srv://vincentmasci:Mascivinci01@cluster0.ibd1d.mongodb.net/photoApp?retryWrites=true&w=majority';

console.log('Using MongoDB connection string:', MONGODB_URI);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return updatePhotosInRoutes();
  })
  .then((result) => {
    console.log('Migration completed successfully');
    console.log(`Updated ${result.photosUpdated} photos in ${result.routesUpdated} routes`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

// Function to update all photos in routes
async function updatePhotosInRoutes() {
  try {
    // Get all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in database:', collections.map(c => c.name).join(', '));
    
    // Check if the routes collection exists
    if (!collections.some(c => c.name === 'routes')) {
      console.error('Error: Routes collection not found in database!');
      return { photosUpdated: 0, routesUpdated: 0 };
    }
    
    // Get direct access to the routes collection
    const routesCollection = mongoose.connection.db.collection('routes');
    
    // Find all routes with photos
    const routes = await routesCollection.find({ photos: { $exists: true, $ne: [] } }).toArray();
    console.log(`Found ${routes.length} routes with photos`);
    
    // Print a sample route for debugging
    if (routes.length > 0) {
      const sampleRoute = routes[0];
      console.log('Sample route:', sampleRoute.name);
      console.log('Sample route photos count:', sampleRoute.photos ? sampleRoute.photos.length : 0);
      
      if (sampleRoute.photos && sampleRoute.photos.length > 0) {
        console.log('Sample photo from route:', JSON.stringify(sampleRoute.photos[0], null, 2));
        console.log('Sample photo has caption field:', sampleRoute.photos[0].caption !== undefined);
      }
    }
    
    let routesUpdated = 0;
    let totalPhotosInRoutes = 0;
    let photosUpdated = 0;
    
    // Update each route using the MongoDB updateOne method
    for (const route of routes) {
      let routeUpdated = false;
      const updatedPhotos = [];
      
      if (Array.isArray(route.photos)) {
        totalPhotosInRoutes += route.photos.length;
        
        // Update each photo in the route
        for (let i = 0; i < route.photos.length; i++) {
          const photo = route.photos[i];
          if (photo) {
            // Create a new photo object with caption field
            const updatedPhoto = { ...photo };
            
            // Add caption field if it doesn't exist
            if (updatedPhoto.caption === undefined) {
              updatedPhoto.caption = '';
              photosUpdated++;
              routeUpdated = true;
            }
            
            updatedPhotos.push(updatedPhoto);
          } else {
            // Keep null/undefined photos as is
            updatedPhotos.push(photo);
          }
        }
        
        // Update the route in the database if any photos were updated
        if (routeUpdated) {
          const result = await routesCollection.updateOne(
            { _id: route._id },
            { $set: { photos: updatedPhotos } }
          );
          
          if (result.modifiedCount > 0) {
            routesUpdated++;
            console.log(`Updated route: ${route.name || route._id}`);
          } else {
            console.warn(`Failed to update route: ${route.name || route._id}`);
          }
        }
      }
    }
    
    console.log(`Updated ${photosUpdated} photos in ${routesUpdated} routes`);
    console.log(`Total photos in routes: ${totalPhotosInRoutes}`);
    
    // Verify the updates by checking a sample route again
    if (routes.length > 0) {
      const sampleRouteId = routes[0]._id;
      const updatedRoute = await routesCollection.findOne({ _id: sampleRouteId });
      
      if (updatedRoute && updatedRoute.photos && updatedRoute.photos.length > 0) {
        console.log('Verification - Sample photo after update:', JSON.stringify(updatedRoute.photos[0], null, 2));
        console.log('Verification - Sample photo has caption field:', updatedRoute.photos[0].caption !== undefined);
      }
    }
    
    return {
      photosUpdated,
      routesUpdated
    };
  } catch (error) {
    console.error('Error in updatePhotosInRoutes function:', error);
    throw error;
  }
}
