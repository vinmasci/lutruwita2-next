/**
 * Test script for S3 fetch and XMLHttpRequest issues
 * 
 * This script tests different ways of accessing S3 images to diagnose
 * why fetch and XMLHttpRequest might be failing while direct image tags work.
 */

import fetch from 'node-fetch';
import https from 'https';
import fs from 'fs';

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
 * Test fetch with different options
 * @param {string} url - The URL to test
 * @returns {Promise<void>}
 */
async function testFetchWithOptions(url) {
  log(`\nTesting fetch with different options for: ${url}`, colors.cyan);
  
  // Test 1: Basic fetch
  try {
    log('Test 1: Basic fetch', colors.blue);
    const response = await fetch(url);
    
    log(`Status: ${response.status} ${response.statusText}`, colors.green);
    log('Headers:', colors.green);
    const headers = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });
    log(JSON.stringify(headers, null, 2), colors.green);
    
    if (response.ok) {
      const buffer = await response.buffer();
      log(`✅ Success! Downloaded ${buffer.length} bytes`, colors.green);
    } else {
      log(`❌ Failed with status ${response.status}`, colors.red);
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
  }
  
  // Test 2: Fetch with origin header
  try {
    log('\nTest 2: Fetch with origin header', colors.blue);
    const response = await fetch(url, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    log(`Status: ${response.status} ${response.statusText}`, colors.green);
    log('Headers:', colors.green);
    const headers = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });
    log(JSON.stringify(headers, null, 2), colors.green);
    
    if (response.ok) {
      const buffer = await response.buffer();
      log(`✅ Success! Downloaded ${buffer.length} bytes`, colors.green);
    } else {
      log(`❌ Failed with status ${response.status}`, colors.red);
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
  }
  
  // Test 3: Fetch with no-cors mode (simulating browser behavior)
  try {
    log('\nTest 3: Fetch with no-cors mode (simulating browser behavior)', colors.blue);
    log('Note: In browsers, no-cors mode restricts access to the response', colors.yellow);
    const response = await fetch(url, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    log(`Status: ${response.status} ${response.statusText}`, colors.green);
    log('Headers:', colors.green);
    const headers = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });
    log(JSON.stringify(headers, null, 2), colors.green);
    
    if (response.ok) {
      const buffer = await response.buffer();
      log(`✅ Success! Downloaded ${buffer.length} bytes`, colors.green);
    } else {
      log(`❌ Failed with status ${response.status}`, colors.red);
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
  }
}

/**
 * Test HTTPS.get (similar to XMLHttpRequest)
 * @param {string} url - The URL to test
 * @returns {Promise<void>}
 */
function testHttpsGet(url) {
  return new Promise((resolve) => {
    log('\nTesting HTTPS.get (similar to XMLHttpRequest)', colors.cyan);
    
    // Test 1: Basic HTTPS.get
    log('Test 1: Basic HTTPS.get', colors.blue);
    https.get(url, (response) => {
      log(`Status: ${response.statusCode} ${response.statusMessage}`, colors.green);
      log('Headers:', colors.green);
      log(JSON.stringify(response.headers, null, 2), colors.green);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          log(`✅ Success! Downloaded ${buffer.length} bytes`, colors.green);
          resolve();
        });
      } else {
        log(`❌ Failed with status ${response.statusCode}`, colors.red);
        resolve();
      }
    }).on('error', (error) => {
      log(`❌ Error: ${error.message}`, colors.red);
      resolve();
    });
  });
}

/**
 * Test HTTPS.get with custom headers (similar to XMLHttpRequest with headers)
 * @param {string} url - The URL to test
 * @returns {Promise<void>}
 */
function testHttpsGetWithHeaders(url) {
  return new Promise((resolve) => {
    log('\nTesting HTTPS.get with custom headers', colors.cyan);
    
    const options = {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    };
    
    https.get(url, options, (response) => {
      log(`Status: ${response.statusCode} ${response.statusMessage}`, colors.green);
      log('Headers:', colors.green);
      log(JSON.stringify(response.headers, null, 2), colors.green);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          log(`✅ Success! Downloaded ${buffer.length} bytes`, colors.green);
          resolve();
        });
      } else {
        log(`❌ Failed with status ${response.statusCode}`, colors.red);
        resolve();
      }
    }).on('error', (error) => {
      log(`❌ Error: ${error.message}`, colors.red);
      resolve();
    });
  });
}

/**
 * Save the image to a local file
 * @param {string} url - The URL to download
 * @param {string} outputPath - The path to save the file
 * @returns {Promise<void>}
 */
async function saveImageToFile(url, outputPath) {
  log(`\nSaving image to file: ${outputPath}`, colors.cyan);
  
  try {
    const response = await fetch(url);
    
    if (response.ok) {
      const buffer = await response.buffer();
      fs.writeFileSync(outputPath, buffer);
      log(`✅ Successfully saved ${buffer.length} bytes to ${outputPath}`, colors.green);
    } else {
      log(`❌ Failed to download image: ${response.status} ${response.statusText}`, colors.red);
    }
  } catch (error) {
    log(`❌ Error saving image: ${error.message}`, colors.red);
  }
}

/**
 * Main function
 */
async function main() {
  // Get URL from command line arguments or use default
  let url = process.argv[2];
  
  if (!url) {
    // Use the default URL
    const defaultBucket = 'bikepath';
    const defaultRegion = 'ap-southeast-2';
    const defaultKey = '1731786827138-IMG_0109.jpeg';
    url = `https://${defaultBucket}.s3.${defaultRegion}.amazonaws.com/${defaultKey}`;
    
    log(`No URL provided, using default: ${url}`, colors.yellow);
  }
  
  log('Starting S3 fetch and XMLHttpRequest test', colors.magenta);
  log('==========================================', colors.magenta);
  
  // Test fetch with different options
  await testFetchWithOptions(url);
  
  // Test HTTPS.get (similar to XMLHttpRequest)
  await testHttpsGet(url);
  
  // Test HTTPS.get with custom headers
  await testHttpsGetWithHeaders(url);
  
  // Save the image to a local file
  await saveImageToFile(url, 'test-s3-image.jpg');
  
  log('\nTest completed!', colors.magenta);
  log('==============', colors.magenta);
  
  log('\nRecommendations:', colors.cyan);
  log('1. Check if the S3 bucket policy allows public read access', colors.reset);
  log('2. Verify that the correct region is being used in the URL', colors.reset);
  log('3. Make sure the Content-Type header is set correctly during upload', colors.reset);
  log('4. Check if the browser is sending the correct Origin header', colors.reset);
  log('5. Try using a different S3 endpoint format (e.g., s3-ap-southeast-2.amazonaws.com)', colors.reset);
}

// Run the main function
main().catch(console.error);
