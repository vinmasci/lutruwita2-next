import zlib from 'zlib';
import { promisify } from 'util';

// Promisify zlib functions
const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

/**
 * Decompresses a base64-encoded gzipped string
 * @param {string} compressedData - Base64-encoded compressed data
 * @returns {Promise<string>} The decompressed JSON string
 */
export async function decompressData(compressedData) {
  try {
    // Check if the data is likely compressed
    if (!isCompressedData(compressedData)) {
      return compressedData;
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(compressedData, 'base64');
    
    // Decompress the buffer
    const decompressed = await gunzip(buffer);
    
    // Return as string
    return decompressed.toString('utf-8');
  } catch (error) {
    console.error('[API] Decompression error:', error);
    // If decompression fails, return the original data
    return compressedData;
  }
}

/**
 * Compresses a string using gzip
 * @param {string} data - The string to compress
 * @returns {Promise<string>} Base64-encoded compressed data
 */
export async function compressData(data) {
  try {
    // Compress the data
    const compressed = await gzip(Buffer.from(data, 'utf-8'));
    
    // Return as base64 string
    return compressed.toString('base64');
  } catch (error) {
    console.error('[API] Compression error:', error);
    // If compression fails, return the original data
    return data;
  }
}

/**
 * Checks if a string is likely to be compressed data
 * @param {string} data - The string to check
 * @returns {boolean} True if the data appears to be compressed
 */
export function isCompressedData(data) {
  // Check for common gzip base64 headers
  return typeof data === 'string' && 
         (data.startsWith('H4sI') || data.startsWith('eJw'));
}
