/**
 * Test script for S3 CORS configuration
 * 
 * This script tests if the S3 bucket's CORS configuration is correctly set up by:
 * 1. Making a preflight OPTIONS request to the S3 bucket
 * 2. Checking if the CORS headers are returned correctly
 * 
 * Usage:
 * node test-s3-cors.js [S3_URL]
 * 
 * Example:
 * node test-s3-cors.js https://your-bucket.s3.amazonaws.com/test-image.jpg
 */

import fetch from 'node-fetch';

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
 * Test CORS configuration by making a preflight OPTIONS request
 * @param {string} url - The URL to test
 * @returns {Promise<void>}
 */
async function testCorsConfiguration(url) {
  log(`Testing CORS configuration for: ${url}`, colors.cyan);
  
  try {
    // Make a preflight OPTIONS request
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    
    // Get all headers
    const headers = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });
    
    log('Response headers:', colors.blue);
    log(JSON.stringify(headers, null, 2), colors.blue);
    
    // Check for CORS headers
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-expose-headers',
      'access-control-max-age',
    ];
    
    const missingHeaders = corsHeaders.filter(header => !headers[header]);
    
    if (missingHeaders.length > 0) {
      log('Missing CORS headers:', colors.yellow);
      missingHeaders.forEach(header => log(`- ${header}`, colors.yellow));
    }
    
    // Check if the origin is allowed
    const allowOrigin = headers['access-control-allow-origin'];
    if (allowOrigin) {
      if (allowOrigin === '*') {
        log('✅ All origins are allowed', colors.green);
      } else if (allowOrigin === 'http://localhost:3000') {
        log('✅ localhost:3000 is allowed', colors.green);
      } else {
        log(`⚠️ Origin restriction: ${allowOrigin}`, colors.yellow);
      }
    } else {
      log('❌ No Access-Control-Allow-Origin header found', colors.red);
    }
    
    // Check allowed methods
    const allowMethods = headers['access-control-allow-methods'];
    if (allowMethods) {
      log(`✅ Allowed methods: ${allowMethods}`, colors.green);
      
      if (!allowMethods.includes('GET')) {
        log('❌ GET method is not allowed', colors.red);
      }
    } else {
      log('❌ No Access-Control-Allow-Methods header found', colors.red);
    }
    
    // Check allowed headers
    const allowHeaders = headers['access-control-allow-headers'];
    if (allowHeaders) {
      log(`✅ Allowed headers: ${allowHeaders}`, colors.green);
      
      if (!allowHeaders.includes('*') && !allowHeaders.toLowerCase().includes('content-type')) {
        log('❌ Content-Type header is not allowed', colors.red);
      }
    } else {
      log('❌ No Access-Control-Allow-Headers header found', colors.red);
    }
    
    // Overall assessment
    if (response.status === 200) {
      log('✅ OPTIONS request succeeded with status 200', colors.green);
    } else {
      log(`❌ OPTIONS request failed with status ${response.status}`, colors.red);
    }
    
    if (allowOrigin && allowMethods && allowHeaders) {
      log('✅ Basic CORS configuration appears to be in place', colors.green);
    } else {
      log('❌ CORS configuration is incomplete or missing', colors.red);
    }
    
  } catch (error) {
    log(`Error testing CORS configuration: ${error.message}`, colors.red);
    console.error(error);
  }
}

/**
 * Test a direct GET request to check if the resource is accessible
 * @param {string} url - The URL to test
 * @returns {Promise<void>}
 */
async function testDirectAccess(url) {
  log(`\nTesting direct access to: ${url}`, colors.cyan);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      log(`✅ Direct access succeeded with status ${response.status}`, colors.green);
      log(`Content-Type: ${contentType}`, colors.blue);
      log(`Content-Length: ${contentLength} bytes`, colors.blue);
    } else {
      log(`❌ Direct access failed with status ${response.status}`, colors.red);
      
      if (response.status === 403) {
        log('This could be due to bucket permissions or object ACL settings', colors.yellow);
        log('Make sure the object is publicly readable or has appropriate permissions', colors.yellow);
      }
    }
  } catch (error) {
    log(`Error testing direct access: ${error.message}`, colors.red);
  }
}

/**
 * Test a cross-origin GET request to check if CORS is working
 * @param {string} url - The URL to test
 * @returns {Promise<void>}
 */
async function testCrossOriginRequest(url) {
  log(`\nSimulating cross-origin request to: ${url}`, colors.cyan);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000',
      },
    });
    
    // Get CORS-related headers
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-expose-headers': response.headers.get('access-control-expose-headers'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
    };
    
    log('CORS response headers:', colors.blue);
    log(JSON.stringify(corsHeaders, null, 2), colors.blue);
    
    if (response.ok) {
      log(`✅ Cross-origin request succeeded with status ${response.status}`, colors.green);
      
      if (corsHeaders['access-control-allow-origin']) {
        log('✅ Access-Control-Allow-Origin header is present', colors.green);
      } else {
        log('❌ Access-Control-Allow-Origin header is missing', colors.red);
        log('The request succeeded, but browsers would block it due to CORS', colors.yellow);
      }
    } else {
      log(`❌ Cross-origin request failed with status ${response.status}`, colors.red);
    }
  } catch (error) {
    log(`Error testing cross-origin request: ${error.message}`, colors.red);
  }
}

/**
 * Main function
 */
async function main() {
  // Get URL from command line arguments or use default
  let url = process.argv[2];
  
  if (!url) {
    // Convert s3://bikepath/1731786827138-IMG_0109.jpeg to HTTPS URL
    const defaultBucket = 'bikepath';
    const defaultKey = '1731786827138-IMG_0109.jpeg';
    url = `https://${defaultBucket}.s3.ap-southeast-2.amazonaws.com/${defaultKey}`;
    
    log(`No URL provided, using default: ${url}`, colors.yellow);
  }
  
  log('Starting S3 CORS configuration test', colors.magenta);
  log('==================================', colors.magenta);
  
  // Test CORS configuration
  await testCorsConfiguration(url);
  
  // Test direct access
  await testDirectAccess(url);
  
  // Test cross-origin request
  await testCrossOriginRequest(url);
  
  log('\nTest completed!', colors.magenta);
  log('==============', colors.magenta);
  
  log('\nRecommendations:', colors.cyan);
  log('1. If CORS headers are missing, check your S3 bucket CORS configuration', colors.reset);
  log('2. Make sure your CORS configuration includes:', colors.reset);
  log('   - Appropriate AllowedOrigins (e.g., http://localhost:3000, https://your-domain.com)', colors.reset);
  log('   - AllowedMethods including GET', colors.reset);
  log('   - AllowedHeaders including * or specific headers like Content-Type', colors.reset);
  log('3. If direct access fails with 403, check your bucket policy and object ACLs', colors.reset);
  log('4. Remember that CORS doesn\'t affect direct access, only browser-based cross-origin requests', colors.reset);
}

// Run the main function
main().catch(console.error);
