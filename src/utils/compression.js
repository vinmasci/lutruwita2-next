import pako from 'pako';

/**
 * Compresses a JSON string using GZIP compression
 * @param {string} jsonString - The JSON string to compress
 * @returns {string} Base64-encoded compressed data
 */
export function compressJSON(jsonString) {
  try {
    // Convert string to Uint8Array for compression
    const uint8Array = new TextEncoder().encode(jsonString);
    
    // Compress the data using pako (GZIP)
    const compressed = pako.gzip(uint8Array);
    
    // Convert compressed data to base64 for safe transmission
    // Handle large arrays by processing in chunks to avoid call stack size exceeded
    let result = '';
    const chunkSize = 8192; // Process 8KB chunks
    
    for (let i = 0; i < compressed.length; i += chunkSize) {
      const chunk = compressed.subarray(i, i + chunkSize);
      result += String.fromCharCode.apply(null, chunk);
    }
    
    return btoa(result);
  } catch (error) {
    console.error('JSON compression error:', error);
    // Return original data if compression fails
    return jsonString;
  }
}

/**
 * Decompresses a base64-encoded compressed JSON string
 * @param {string} compressedData - Base64-encoded compressed data
 * @returns {string} The original JSON string
 */
export function decompressJSON(compressedData) {
  try {
    // Check if the data is compressed (starts with base64 pattern)
    if (!compressedData.startsWith('H4sI') && !compressedData.startsWith('eJw')) {
      // Not compressed, return as is
      return compressedData;
    }
    
    // Convert base64 to binary
    const binary = atob(compressedData);
    
    // Convert binary to Uint8Array more efficiently
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    // Decompress the data
    const decompressed = pako.ungzip(bytes);
    
    // Convert back to string
    return new TextDecoder().decode(decompressed);
  } catch (error) {
    console.error('JSON decompression error:', error);
    // Return original data if decompression fails
    return compressedData;
  }
}
