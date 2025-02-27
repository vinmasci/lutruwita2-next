/**
 * Test script for direct uploads to Cloudinary without using the API
 * 
 * This script demonstrates how to:
 * 1. Configure Cloudinary directly with credentials
 * 2. Upload an image directly to Cloudinary
 * 3. Verify the upload was successful
 * 
 * Usage:
 * node test-cloudinary-direct.js
 */

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration - using values directly from .env
const CLOUDINARY_CLOUD_NAME = 'dig9djqnj';
const CLOUDINARY_API_KEY = '682837882671547';
const CLOUDINARY_API_SECRET = '1-yg9KSGYSSQzM2V9AuzWkBholk';
const TEST_IMAGE_PATH = path.join(__dirname, 'test-s3-image.jpg');

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

// Main function
async function testCloudinaryDirect() {
  try {
    console.log('Starting direct Cloudinary upload test...');
    
    // Step 1: Read the test image
    console.log(`Reading test image from ${TEST_IMAGE_PATH}...`);
    const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const imageSize = imageBuffer.length;
    console.log(`Image size: ${imageSize} bytes`);
    
    // Step 2: Generate a timestamp and signature for the upload
    const timestamp = Math.round(new Date().getTime() / 1000);
    const uploadParams = {
      timestamp: timestamp,
      folder: 'uploads',
      upload_preset: 'lutruwita' // Using the correct upload preset name
    };
    
    // Generate the signature
    const signature = cloudinary.utils.api_sign_request(uploadParams, CLOUDINARY_API_SECRET);
    console.log('Generated signature:', signature);
    
    // Step 3: Upload the image to Cloudinary
    console.log('Uploading image to Cloudinary...');
    
    // Create a promise to handle the upload
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'uploads',
          timestamp: timestamp,
          signature: signature,
          upload_preset: 'lutruwita', // Using the correct upload preset name
          api_key: CLOUDINARY_API_KEY // Explicitly include the API key
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result);
        }
      );
      
      // Write the image data to the upload stream
      uploadStream.end(imageBuffer);
    });
    
    // Wait for the upload to complete
    const uploadResult = await uploadPromise;
    
    console.log('Upload successful!');
    console.log('Image URL:', uploadResult.secure_url);
    console.log('Public ID:', uploadResult.public_id);
    
    // Generate thumbnail URL
    const thumbnailUrl = uploadResult.secure_url.replace('/upload/', '/upload/w_800,h_800,c_fill,q_70/');
    console.log('Thumbnail URL:', thumbnailUrl);
    
    // Step 4: Download the image to verify it was uploaded correctly
    console.log('Downloading image to verify upload...');
    
    // Create a promise to handle the download
    const https = await import('https');
    const downloadPromise = new Promise((resolve, reject) => {
      const file = fs.createWriteStream('downloaded-test-image-direct.jpg');
      
      https.get(uploadResult.secure_url, (response) => {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink('downloaded-test-image-direct.jpg', () => {});
          reject(err);
        });
      }).on('error', (err) => {
        fs.unlink('downloaded-test-image-direct.jpg', () => {});
        reject(err);
      });
    });
    
    // Wait for the download to complete
    await downloadPromise;
    
    console.log('Image downloaded successfully to downloaded-test-image-direct.jpg');
    console.log('Test completed successfully!');
    
    // Test the generateUploadSignature function similar to what's in api/lib/cloudinary.js
    console.log('\nTesting signature generation similar to API implementation:');
    const testSignature = generateUploadSignature({
      public_id: `uploads/test/test-image.jpg`
    });
    
    console.log('Generated test signature:', testSignature);
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Function to generate upload signature (similar to the one in api/lib/cloudinary.js)
function generateUploadSignature(params = {}) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // Create the string to sign
  const toSign = {
    timestamp,
    folder: 'uploads',
    upload_preset: 'lutruwita', // Using the correct upload preset name
    ...params
  };
  
  // Generate the signature
  const signature = cloudinary.utils.api_sign_request(toSign, CLOUDINARY_API_SECRET);
  
  return {
    signature,
    timestamp,
    apiKey: CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME
  };
}

// Run the test
testCloudinaryDirect();
