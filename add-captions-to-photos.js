// Script to add empty caption fields to all existing photos in the routes collection
// Run with: node add-captions-to-photos.js

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
    
    // Define Route schema (simplified)
    const RouteSchema = new mongoose.Schema({
      name: String,
      persistentId: String,
      photos: Array,
      // other fields not needed for this migration
    }, { strict: false }); // Use strict: false to allow for flexible schema
    
    const Route = mongoose.model('Route', RouteSchema);
    
    // Find all routes
    const routes = await Route.find({ photos: { $exists: true, $ne: [] } });
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
    
    // Update each route
    for (const route of routes) {
      let routeUpdated = false;
      
      if (Array.isArray(route.photos)) {
        totalPhotosInRoutes += route.photos.length;
        
        // Update each photo in the route
        for (let i = 0; i < route.photos.length; i++) {
          if (route.photos[i] && !route.photos[i].caption) {
            route.photos[i].caption = '';
            photosUpdated++;
            routeUpdated = true;
          }
        }
        
        // Save the route if any photos were updated
        if (routeUpdated) {
          await route.save();
          routesUpdated++;
        }
      }
    }
    
    console.log(`Updated ${photosUpdated} photos in ${routesUpdated} routes`);
    console.log(`Total photos in routes: ${totalPhotosInRoutes}`);
    
    return {
      photosUpdated,
      routesUpdated
    };
  } catch (error) {
    console.error('Error in updatePhotosInRoutes function:', error);
    throw error;
  }
}
