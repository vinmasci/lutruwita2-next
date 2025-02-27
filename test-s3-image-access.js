/**
 * Test script for S3 image access
 * 
 * This script tests the ability to access images from S3 by:
 * 1. Getting a presigned URL from the API
 * 2. Uploading a test image directly to S3 using the presigned URL
 * 3. Testing different methods of accessing the image
 * 4. Saving the downloaded image locally to verify it's complete
 * 
 * Usage:
 * node test-s3-image-access.js
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
const DOWNLOAD_PATH = path.join(__dirname, 'downloaded-test-image.jpg');

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
 * Test accessing the image with a standard GET request
 * @param {string} url - The URL of the uploaded file
 * @returns {Promise<Buffer>} - The image data
 */
async function testStandardAccess(url) {
  log('Testing standard GET access...', colors.cyan);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to access image: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    log(`Content-Type: ${contentType}`, colors.blue);
    log(`Content-Length: ${contentLength} bytes`, colors.blue);
    
    const buffer = await response.buffer();
    log(`Successfully downloaded image (${buffer.length} bytes)`, colors.green);
    
    return buffer;
  } catch (error) {
    log(`Error accessing image: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Test accessing the image with a HEAD request to check headers
 * @param {string} url - The URL of the uploaded file
 * @returns {Promise<Object>} - The headers
 */
async function testHeadRequest(url) {
  log('Testing HEAD request...', colors.cyan);
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) {
      throw new Error(`Failed to access image headers: ${response.status} ${response.statusText}`);
    }
    
    const headers = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });
    
    log('Successfully retrieved headers:', colors.green);
    log(JSON.stringify(headers, null, 2), colors.blue);
    
    return headers;
  } catch (error) {
    log(`Error accessing image headers: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Test accessing the image with a Range request to get partial content
 * @param {string} url - The URL of the uploaded file
 * @returns {Promise<Buffer>} - The partial image data
 */
async function testRangeRequest(url) {
  log('Testing Range request...', colors.cyan);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Range': 'bytes=0-1023' // Request first 1KB
      }
    });
    
    if (response.status !== 206 && response.status !== 200) {
      throw new Error(`Failed to access partial image: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    log(`Successfully downloaded partial image (${buffer.length} bytes)`, colors.green);
    
    return buffer;
  } catch (error) {
    log(`Error accessing partial image: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Save the downloaded image to a file
 * @param {Buffer} buffer - The image data
 * @param {string} filePath - The path to save the file to
 * @returns {Promise<void>}
 */
async function saveDownloadedImage(buffer, filePath) {
  log(`Saving downloaded image to ${filePath}...`, colors.cyan);
  
  try {
    fs.writeFileSync(filePath, buffer);
    log('Successfully saved downloaded image', colors.green);
  } catch (error) {
    log(`Error saving downloaded image: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting S3 image access test', colors.magenta);
    
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
    const fileUrl = url.split('?')[0]; // Remove query parameters
    
    log(`File URL: ${fileUrl}`, colors.blue);
    
    // Test different access methods
    const headers = await testHeadRequest(fileUrl);
    const partialData = await testRangeRequest(fileUrl);
    const fullData = await testStandardAccess(fileUrl);
    
    // Save the downloaded image
    await saveDownloadedImage(fullData, DOWNLOAD_PATH);
    
    log('Test completed successfully!', colors.magenta);
    log(`File is available at: ${fileUrl}`, colors.blue);
    log(`Downloaded file saved to: ${DOWNLOAD_PATH}`, colors.blue);
    
    // Print browser HTML to test the image
    log('\nHTML to test in browser:', colors.yellow);
    log(`
<!DOCTYPE html>
<html>
<head>
  <title>S3 Image Test</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    img { max-width: 100%; border: 1px solid #ddd; }
    .error { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <h1>S3 Image Test</h1>
  
  <h2>Direct Image Tag</h2>
  <img src="${fileUrl}" alt="Test Image" onerror="this.nextElementSibling.style.display='block'">
  <p class="error" style="display:none">Error loading image directly!</p>
  
  <h2>Image with Fetch</h2>
  <img id="fetchedImage" alt="Fetched Image">
  <p id="fetchError" class="error" style="display:none"></p>
  
  <script>
    // Test fetching the image with JavaScript
    fetch('${fileUrl}')
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok: ' + response.status);
        return response.blob();
      })
      .then(blob => {
        const img = document.getElementById('fetchedImage');
        img.src = URL.createObjectURL(blob);
      })
      .catch(error => {
        document.getElementById('fetchError').textContent = 'Error: ' + error.message;
        document.getElementById('fetchError').style.display = 'block';
      });
  </script>
</body>
</html>
`, colors.reset);
    
  } catch (error) {
    log('Test failed', colors.red);
    log(error.stack, colors.red);
    process.exit(1);
  }
}

// Run the main function
main();
