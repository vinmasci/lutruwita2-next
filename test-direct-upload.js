/**
 * Test script for direct-to-S3 uploads
 * 
 * This script tests the direct-to-S3 upload functionality by:
 * 1. Getting a presigned URL from the API
 * 2. Uploading a test image directly to S3 using the presigned URL
 * 3. Verifying that the upload was successful
 * 
 * Usage:
 * node test-direct-upload.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = 'http://localhost:3000/api/photos';
const TEST_IMAGE_PATH = path.join(__dirname, 'public', 'images', 'photo-fallback.svg');
const TEST_IMAGE_CONTENT_TYPE = 'image/jpeg'; // We'll pretend the SVG is a JPEG for testing purposes

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Log a message with color
 * @param {string} message - The message to log
 * @param {string} color - The color to use
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Get a presigned URL from the API
 * @returns {Promise<Object>} - The presigned URL data
 */
async function getPresignedUrl() {
  log('Getting presigned URL...', colors.cyan);
  
  try {
    const response = await fetch(`${API_URL}?presigned=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'test-image.jpg',
        contentType: TEST_IMAGE_CONTENT_TYPE,
      }),
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to get presigned URL: ${response.status} ${response.statusText}\n${text}`);
    }
    
    const data = await response.json();
    log('Successfully got presigned URL:', colors.green);
    log(JSON.stringify(data, null, 2), colors.green);
    
    return data;
  } catch (error) {
    log(`Error getting presigned URL: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Upload a file directly to S3 using a presigned URL
 * @param {string} url - The presigned URL
 * @param {string} filePath - The path to the file to upload
 * @param {string} contentType - The content type of the file
 * @returns {Promise<void>}
 */
async function uploadToS3(url, filePath, contentType) {
  log('Uploading file to S3...', colors.cyan);
  
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        // Note: Do not add 'x-amz-acl' header here as it's already included in the presigned URL
      },
      body: fileContent,
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to upload file: ${response.status} ${response.statusText}\n${text}`);
    }
    
    log('Successfully uploaded file to S3', colors.green);
  } catch (error) {
    log(`Error uploading file: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Verify that the file was uploaded successfully
 * @param {string} url - The URL of the uploaded file
 * @returns {Promise<void>}
 */
async function verifyUpload(url) {
  log('Verifying upload...', colors.cyan);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to verify upload: ${response.status} ${response.statusText}`);
    }
    
    log('Successfully verified upload', colors.green);
  } catch (error) {
    log(`Error verifying upload: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting direct-to-S3 upload test', colors.magenta);
    
    // Check if test image exists
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      log(`Test image not found at ${TEST_IMAGE_PATH}`, colors.red);
      log('Please provide a valid test image path', colors.yellow);
      return;
    }
    
    // Get presigned URL
    const { url, key } = await getPresignedUrl();
    
    // Upload file to S3
    await uploadToS3(url, TEST_IMAGE_PATH, TEST_IMAGE_CONTENT_TYPE);
    
    // Extract the URL from the presigned URL
    // The presigned URL contains the correct bucket and region information
    const urlParts = url.split('?')[0]; // Remove query parameters
    const fileUrl = urlParts;
    
    log(`File URL: ${fileUrl}`, colors.blue);
    
    // Verify upload
    await verifyUpload(fileUrl);
    
    log('Test completed successfully!', colors.magenta);
    log(`File is available at: ${fileUrl}`, colors.blue);
  } catch (error) {
    log('Test failed', colors.red);
    log(error.stack, colors.red);
    process.exit(1);
  }
}

// Run the main function
main();
