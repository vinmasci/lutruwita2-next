/**
 * Test script to check if we can create folders in Cloudinary
 */

const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './api/.env' });

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Function to upload a test file to create a folder
async function createFolder(folderPath) {
  try {
    console.log(`Attempting to create folder: ${folderPath}`);
    
    // Create a small JSON file to upload
    const testData = {
      test: true,
      created: new Date().toISOString()
    };
    
    // Convert to buffer
    const buffer = Buffer.from(JSON.stringify(testData));
    
    // Upload to Cloudinary
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: 'folder-test',
          folder: folderPath,
          format: 'json',
          overwrite: true
        },
        (error, result) => {
          if (error) {
            console.error(`Error creating folder ${folderPath}:`, error);
            reject(error);
          } else {
            console.log(`Successfully created folder ${folderPath}`);
            console.log('Result:', result);
            resolve(result);
          }
        }
      );
      
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error(`Error in createFolder(${folderPath}):`, error);
    throw error;
  }
}

// Main function
async function main() {
  console.log('Current directory:', process.cwd());
  try {
    console.log('Starting Cloudinary folder test');
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key_exists: !!process.env.CLOUDINARY_API_KEY,
      api_secret_exists: !!process.env.CLOUDINARY_API_SECRET
    });
    
    // Test creating a top-level folder
    await createFolder('test-folder');
    
    // Test creating a nested folder
    await createFolder('test-folder/nested');
    
    // Test creating a user folder
    const userId = 'test-user-' + Date.now();
    await createFolder(`users/${userId}`);
    
    // Test creating a saved routes file
    const testRoutes = {
      savedRoutes: ['route1', 'route2', 'route3'],
      updatedAt: new Date().toISOString()
    };
    
    const buffer = Buffer.from(JSON.stringify(testRoutes));
    
    await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: 'saved-routes',
          folder: `users/${userId}`,
          format: 'json',
          overwrite: true
        },
        (error, result) => {
          if (error) {
            console.error(`Error creating saved routes file:`, error);
            reject(error);
          } else {
            console.log(`Successfully created saved routes file`);
            console.log('Result:', result);
            resolve(result);
          }
        }
      );
      
      uploadStream.end(buffer);
    });
    
    console.log('All tests completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the main function
main();
