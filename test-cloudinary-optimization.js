/**
 * Test script to verify Cloudinary image optimization
 * 
 * This script uploads a test image to Cloudinary and verifies that
 * all the different image size variants are correctly generated.
 * 
 * Usage:
 * node test-cloudinary-optimization.js
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current file directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_BASE = 'http://localhost:3000/api/photos';
const TEST_IMAGE = path.join(__dirname, 'docs', 'IMG_4083.jpeg'); // Use the image in docs folder

// Utility function to format file size
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Function to get image size from URL
async function getImageSize(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return response.data.byteLength;
  } catch (error) {
    console.error(`Error fetching image from ${url}:`, error.message);
    return 0;
  }
}

// Main function
async function testCloudinaryOptimization() {
  try {
    console.log('Testing Cloudinary image optimization...');
    console.log('--------------------------------------');
    
    // Check if test image exists
    if (!fs.existsSync(TEST_IMAGE)) {
      console.error(`Test image not found: ${TEST_IMAGE}`);
      return;
    }
    
    // Upload test image
    console.log(`Uploading test image: ${TEST_IMAGE}`);
    
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(TEST_IMAGE));
    
    const uploadResponse = await axios.post(`${API_BASE}/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
    
    if (!uploadResponse.data) {
      console.error('No response data received from upload');
      return;
    }
    
    console.log('\nUpload successful!');
    console.log('--------------------------------------');
    
    // Extract URLs from response
    const {
      url,
      tinyThumbnailUrl,
      thumbnailUrl,
      mediumUrl,
      largeUrl,
      publicId
    } = uploadResponse.data;
    
    // Verify all URLs are present
    if (!url) {
      console.error('Original URL missing from response');
      return;
    }
    
    if (!tinyThumbnailUrl) {
      console.warn('tinyThumbnailUrl missing from response');
    }
    
    if (!thumbnailUrl) {
      console.warn('thumbnailUrl missing from response');
    }
    
    if (!mediumUrl) {
      console.warn('mediumUrl missing from response');
    }
    
    if (!largeUrl) {
      console.warn('largeUrl missing from response');
    }
    
    // Get sizes of all images
    console.log('Fetching image sizes...');
    
    const originalSize = await getImageSize(url);
    const tinySize = tinyThumbnailUrl ? await getImageSize(tinyThumbnailUrl) : 0;
    const thumbnailSize = thumbnailUrl ? await getImageSize(thumbnailUrl) : 0;
    const mediumSize = mediumUrl ? await getImageSize(mediumUrl) : 0;
    const largeSize = largeUrl ? await getImageSize(largeUrl) : 0;
    
    // Print results
    console.log('\nImage Size Comparison:');
    console.log('--------------------------------------');
    console.log(`Original:  ${formatBytes(originalSize)} - ${url}`);
    
    if (tinyThumbnailUrl) {
      const tinyPercent = ((tinySize / originalSize) * 100).toFixed(2);
      console.log(`Tiny:      ${formatBytes(tinySize)} (${tinyPercent}% of original) - ${tinyThumbnailUrl}`);
    }
    
    if (thumbnailUrl) {
      const thumbnailPercent = ((thumbnailSize / originalSize) * 100).toFixed(2);
      console.log(`Thumbnail: ${formatBytes(thumbnailSize)} (${thumbnailPercent}% of original) - ${thumbnailUrl}`);
    }
    
    if (mediumUrl) {
      const mediumPercent = ((mediumSize / originalSize) * 100).toFixed(2);
      console.log(`Medium:    ${formatBytes(mediumSize)} (${mediumPercent}% of original) - ${mediumUrl}`);
    }
    
    if (largeUrl) {
      const largePercent = ((largeSize / originalSize) * 100).toFixed(2);
      console.log(`Large:     ${formatBytes(largeSize)} (${largePercent}% of original) - ${largeUrl}`);
    }
    
    // Calculate total bandwidth savings
    const totalOriginalSize = originalSize * 5; // Assuming each variant would use original size
    const totalOptimizedSize = originalSize + tinySize + thumbnailSize + mediumSize + largeSize;
    const savingsBytes = totalOriginalSize - totalOptimizedSize;
    const savingsPercent = ((savingsBytes / totalOriginalSize) * 100).toFixed(2);
    
    console.log('\nBandwidth Savings Analysis:');
    console.log('--------------------------------------');
    console.log(`Without optimization: ${formatBytes(totalOriginalSize)}`);
    console.log(`With optimization:    ${formatBytes(totalOptimizedSize)}`);
    console.log(`Savings:              ${formatBytes(savingsBytes)} (${savingsPercent}%)`);
    
    // Clean up - delete the test image from Cloudinary
    console.log('\nCleaning up...');
    
    if (publicId) {
      await axios.delete(`${API_BASE}/delete`, {
        data: { publicId }
      });
      console.log(`Deleted test image with publicId: ${publicId}`);
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testCloudinaryOptimization();
