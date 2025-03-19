/**
 * Cleanup script to delete orphaned embed files from Cloudinary
 * 
 * This script:
 * 1. Gets all routes from the database
 * 2. Gets all embed files from Cloudinary
 * 3. Identifies embed files that don't correspond to any route
 * 4. Deletes the orphaned embed files
 */

import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// No global mongoose configuration needed

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Define Route schema (simplified version just for this script)
const RouteSchema = new mongoose.Schema({
  persistentId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  embedUrl: { type: String }
});

// Initialize the model
let Route;
try {
  Route = mongoose.model('Route');
} catch (e) {
  Route = mongoose.model('Route', RouteSchema);
}

// Function to connect to the database
async function connectToDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 60000, // 60 seconds
      socketTimeoutMS: 90000, // 90 seconds
      connectTimeoutMS: 60000, // 60 seconds
      maxPoolSize: 10,
      minPoolSize: 1
    });
    
    console.log('Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

async function cleanup() {
  try {
    // Connect to database
    await connectToDatabase();
    console.log('Connected to database');
    
    // Get all routes from the database
    const routes = await Route.find().select('persistentId name embedUrl');
    console.log(`Found ${routes.length} routes in the database`);
    
    // Create a set of valid persistentIds
    const validPersistentIds = new Set(routes.map(route => route.persistentId));
    console.log('Valid persistentIds:', Array.from(validPersistentIds));
    
    // Get all embed files from Cloudinary
    const result = await cloudinary.search
      .expression('folder:embeds')
      .execute();
    
    console.log(`Found ${result.resources.length} embed files in Cloudinary`);
    
    // Identify orphaned embed files
    const orphanedFiles = result.resources.filter(resource => {
      // Extract the persistentId from the public_id
      // Format is typically: embeds/embed-{persistentId}.json
      const match = resource.public_id.match(/embeds\/embed-(.+?)\.json$/);
      if (!match) return true; // If we can't extract the persistentId, consider it orphaned
      
      const persistentId = match[1];
      console.log(`Checking if ${persistentId} is valid...`);
      const isValid = validPersistentIds.has(persistentId);
      console.log(`${persistentId} is ${isValid ? 'valid' : 'orphaned'}`);
      return !isValid;
    });
    
    console.log(`Found ${orphanedFiles.length} orphaned embed files`);
    
    // List the orphaned files
    console.log('Orphaned files:');
    orphanedFiles.forEach(file => {
      console.log(`- ${file.public_id} (${file.secure_url})`);
    });
    
    // Ask for confirmation before deleting
    console.log('\nWould you like to delete these orphaned files? (y/n)');
    process.stdin.once('data', async (data) => {
      const input = data.toString().trim().toLowerCase();
      
      if (input === 'y' || input === 'yes') {
        console.log('Deleting orphaned files...');
        
        // Delete the orphaned files
        for (const file of orphanedFiles) {
          try {
            const result = await cloudinary.uploader.destroy(file.public_id, {
              resource_type: 'raw'
            });
            console.log(`Deleted ${file.public_id}: ${JSON.stringify(result)}`);
          } catch (error) {
            console.error(`Error deleting ${file.public_id}:`, error);
          }
        }
        
        console.log('Cleanup complete');
      } else {
        console.log('Cleanup cancelled');
      }
      
      // Close the database connection
      await mongoose.connection.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup function
cleanup();
