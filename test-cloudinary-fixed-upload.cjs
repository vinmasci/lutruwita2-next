/**
 * Fixed test script for Cloudinary direct upload
 * 
 * This script addresses the signature mismatch issue by:
 * 1. Including all parameters in the signature request
 * 2. Using the exact same parameters for the upload
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
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Test image path
const TEST_IMAGE_PATH = path.join(__dirname, 'docs', 'IMG_4083.jpeg');

// GPS metadata to include
const GPS_METADATA = {
  latitude: 42.123,
  longitude: -71.456
};

// Context string for Cloudinary (must match exactly between signature and upload)
const CONTEXT_STRING = `lat=${GPS_METADATA.latitude}|lng=${GPS_METADATA.longitude}`;

// Function to get a signature for direct upload
async function getSignature() {
  try {
    console.log('Requesting signature with the following parameters:');
    const requestBody = {
      filename: 'test-image.jpg',
      contentType: 'image/jpeg',
      metadata: {
        gps: GPS_METADATA
      },
      // Important: Include the upload_preset and context in the signature request
      // These parameters need to be passed to the server so they can be included in the signature
      additionalParams: {
        upload_preset: 'lutruwita',
        context: CONTEXT_STRING
      }
    };
    
    console.log(JSON.stringify(requestBody, null, 2));

    const response = await fetch(`http://localhost:3000/api/photos?presigned=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get signature: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const signatureData = await response.json();
    console.log('Received signature data:', JSON.stringify(signatureData, null, 2));
    return signatureData;
  } catch (error) {
    console.error('Error getting signature:', error);
    throw error;
  }
}

// Function to upload an image to Cloudinary
async function uploadToCloudinary(signatureData) {
  try {
    console.log('Uploading to Cloudinary with the following parameters:');
    
    const formData = new FormData();
    
    // Add the required Cloudinary parameters
    formData.append('file', fs.createReadStream(TEST_IMAGE_PATH));
    formData.append('api_key', signatureData.apiKey);
    formData.append('timestamp', signatureData.timestamp);
    formData.append('signature', signatureData.signature);
    
    // Important: These parameters must match exactly what was used to generate the signature
    // The order matters for the signature calculation
    formData.append('folder', 'uploads'); // This is included in the signature calculation on the server
    formData.append('context', CONTEXT_STRING);
    formData.append('upload_preset', 'lutruwita');
    
    // Log that we're uploading
    console.log('Form data prepared with fields: file, api_key, timestamp, signature, upload_preset, context');
    
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
  console.log('Starting Cloudinary upload test...');
  console.log('Cloudinary credentials:');
  console.log(`- Cloud name: ${CLOUDINARY_CLOUD_NAME}`);
  console.log(`- API key: ${CLOUDINARY_API_KEY}`);
  console.log(`- API secret: ${CLOUDINARY_API_SECRET ? 'Present' : 'Missing'}`);
  
  try {
    // Method 1: Direct upload to Cloudinary
    console.log('\nMethod 1: Direct upload to Cloudinary...');
    
    // Get signature
    console.log('Getting signature...');
    const signatureData = await getSignature();
    
    // Upload to Cloudinary
    console.log('Uploading to Cloudinary...');
    const uploadResult = await uploadToCloudinary(signatureData);
    console.log('Upload successful!');
    console.log('Result:', JSON.stringify(uploadResult, null, 2));
    
    // Method 2: Upload through API
    console.log('\nMethod 2: Using API upload...');
    const uploadResult2 = await uploadToAPI();
    console.log('API upload successful!');
    console.log('Result:', JSON.stringify(uploadResult2, null, 2));
    
    console.log('\nBoth upload methods successful!');
    console.log('Cloudinary is properly configured and working.');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);
