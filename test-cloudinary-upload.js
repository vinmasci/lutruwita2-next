/**
 * Test script for direct uploads to Cloudinary
 * 
 * This script demonstrates how to:
 * 1. Get a signature from the API
 * 2. Upload an image directly to Cloudinary
 * 3. Verify the upload was successful
 * 
 * Usage:
 * node test-cloudinary-upload.js
 */

import { v2 as cloudinary } from 'cloudinary';
import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const API_URL = 'http://localhost:3000/api/photos';
const TEST_IMAGE_PATH = path.join(__dirname, 'test-s3-image.jpg');
const CLOUDINARY_CLOUD_NAME = 'dig9djqnj';
const CLOUDINARY_API_KEY = '682837882671547';
const CLOUDINARY_API_SECRET = '1-yg9KSGYSSQzM2V9AuzWkBholk';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

// Function to generate a signature for direct upload
function generateUploadSignature(params = {}) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // Create the string to sign
  const toSign = {
    timestamp,
    folder: 'uploads',
    upload_preset: 'lutruwita', // Include the upload preset in the signature
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

// Main function
async function testCloudinaryUpload() {
  try {
    console.log('Starting Cloudinary upload test...');
    
    // Step 1: Read the test image
    console.log(`Reading test image from ${TEST_IMAGE_PATH}...`);
    const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const imageSize = imageBuffer.length;
    console.log(`Image size: ${imageSize} bytes`);
    
    // Step 2: Generate a signature directly
    console.log('Generating signature...');
    const signatureData = generateUploadSignature();
    console.log('Signature generated:', signatureData);
    
    // Step 3: Upload the image to Cloudinary
    console.log('Uploading image to Cloudinary...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_IMAGE_PATH));
    formData.append('api_key', signatureData.apiKey);
    formData.append('timestamp', signatureData.timestamp);
    formData.append('signature', signatureData.signature);
    formData.append('folder', 'uploads');
    formData.append('upload_preset', 'lutruwita');
    
    const uploadResponse = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('Upload successful!');
    console.log('Image URL:', uploadResult.secure_url);
    console.log('Public ID:', uploadResult.public_id);
    
    // Generate thumbnail URL
    const thumbnailUrl = uploadResult.secure_url.replace('/upload/', '/upload/w_800,h_800,c_fill,q_70/');
    console.log('Thumbnail URL:', thumbnailUrl);
    
    // Step 4: Download the image to verify it was uploaded correctly
    console.log('Downloading image to verify upload...');
    const imageResponse = await fetch(uploadResult.secure_url);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    const downloadedImageBuffer = await imageResponse.buffer();
    fs.writeFileSync('downloaded-test-image.jpg', downloadedImageBuffer);
    console.log('Image downloaded successfully to downloaded-test-image.jpg');
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testCloudinaryUpload();
