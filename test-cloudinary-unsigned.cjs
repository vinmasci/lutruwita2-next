/**
 * Test script for Cloudinary unsigned uploads
 * 
 * This script tests direct uploads to Cloudinary using an unsigned upload preset.
 * No signature is required, making the process much simpler.
 */

// Import required modules
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Load environment variables
require('dotenv').config();

// Cloudinary credentials
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;

// Test image path
const TEST_IMAGE_PATH = path.join(__dirname, 'test-s3-image.jpg');

// GPS metadata to include
const GPS_METADATA = {
  latitude: 42.123,
  longitude: -71.456
};

// Context string for Cloudinary
const CONTEXT_STRING = `lat=${GPS_METADATA.latitude}|lng=${GPS_METADATA.longitude}`;

// Function to upload an image to Cloudinary using unsigned upload
async function uploadToCloudinaryUnsigned() {
  try {
    console.log('Preparing unsigned upload to Cloudinary...');
    
    const formData = new FormData();
    
    // Add the file and upload preset (no signature needed)
    formData.append('file', fs.createReadStream(TEST_IMAGE_PATH));
    formData.append('upload_preset', 'lutruwita');
    
    // Add context metadata
    formData.append('context', CONTEXT_STRING);
    
    // Add folder for organization (optional)
    formData.append('folder', 'uploads');
    
    // Log what we're uploading
    console.log('Form data prepared with fields: file, upload_preset, context, folder');
    
    // Upload to Cloudinary
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
    console.log(`Uploading to: ${uploadUrl}`);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        // Add Origin header to match security settings
        'Origin': 'http://localhost:3000'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
}

// Function to upload directly to the API
async function uploadToAPI() {
  try {
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(TEST_IMAGE_PATH));
    
    // Add metadata
    formData.append('metadata', JSON.stringify({
      gps: GPS_METADATA
    }));
    
    console.log('Uploading to API with form data keys:', [...formData.keys()]);
    
    const response = await fetch('http://localhost:3000/api/photos/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Add Origin header to match security settings
        'Origin': 'http://localhost:3000'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading to API:', error);
    throw error;
  }
}

// Main function
async function main() {
  console.log('Starting Cloudinary unsigned upload test...');
  console.log('Cloudinary credentials:');
  console.log(`- Cloud name: ${CLOUDINARY_CLOUD_NAME}`);
  console.log(`- API key: ${CLOUDINARY_API_KEY}`);
  
  try {
    // Direct unsigned upload to Cloudinary
    console.log('\nDirect unsigned upload to Cloudinary...');
    const uploadResult = await uploadToCloudinaryUnsigned();
    console.log('Upload successful!');
    console.log('Result:', JSON.stringify(uploadResult, null, 2));
    
    // Display the URL for the uploaded image
    console.log('\nImage URL:', uploadResult.secure_url);
    
    console.log('\nCloudinary unsigned upload is working correctly!');
    console.log('This confirms that the upload preset is properly configured for unsigned uploads.');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);
