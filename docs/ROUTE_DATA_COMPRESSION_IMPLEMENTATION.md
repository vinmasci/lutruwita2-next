# Route Data Compression Implementation

## Overview

This document describes the implementation of data compression for route saving and loading in the application. The compression system reduces the size of route data during transmission, which improves performance, reduces bandwidth usage, and allows for larger routes to be saved without hitting API size limits.

## Implementation Details

### Compression Libraries

- **Client-side**: Using `pako` library for GZIP compression in the browser
- **Server-side**: Using Node.js built-in `zlib` module for decompression

### Files Added/Modified

1. **Client-side Compression Utility**:
   - `src/utils/compression.js` - Contains functions for compressing and decompressing JSON data

2. **Server-side Compression Utility**:
   - `api/lib/compression.js` - Contains functions for handling compressed data on the server

3. **Route Service**:
   - `src/features/map/services/routeService.js` - Modified to compress route data before sending to the server

4. **API Routes Handler**:
   - `api/routes/index.js` - Modified to detect and decompress incoming compressed data

### Compression Flow

#### Saving Routes:

1. When saving a route, the client-side `saveRoute` function:
   - Converts route data to JSON
   - Measures the original size
   - Compresses the JSON data using `compressJSON`
   - Measures the compressed size and logs compression ratio
   - Adds `X-Content-Encoding: gzip` header to indicate compression
   - Sends the compressed data to the server

2. For chunked uploads (large routes):
   - The compression flag is stored in the session info
   - Each chunk is sent as compressed data
   - When reassembling, the server decompresses the data before processing

3. The server-side handler:
   - Detects the `X-Content-Encoding: gzip` header
   - Decompresses the data using `decompressData`
   - Processes the decompressed data normally

#### Loading Routes:

- Currently, route loading doesn't use compression for responses
- This could be implemented in the future if needed

## Compression Functions

### Client-side (src/utils/compression.js)

```javascript
// Compress JSON string to base64-encoded GZIP data
export function compressJSON(jsonString) {
  // Convert to Uint8Array, compress with pako, convert to base64
}

// Decompress base64-encoded GZIP data to JSON string
export function decompressJSON(compressedData) {
  // Check if data is compressed, decompress with pako if needed
}
```

### Server-side (api/lib/compression.js)

```javascript
// Decompress base64-encoded GZIP data
export async function decompressData(compressedData) {
  // Convert base64 to buffer, decompress with zlib
}

// Compress string to base64-encoded GZIP data
export async function compressData(data) {
  // Compress with zlib, convert to base64
}

// Check if data is likely compressed
export function isCompressedData(data) {
  // Check for GZIP base64 headers
}
```

## Performance Benefits

Testing confirms significant size reductions:

- **Actual results**: 0.62MB route data compressed to 0.14MB (23.45% of original size)
- GeoJSON data typically compresses to 15-25% of its original size
- Route data with complex geometries can see compression ratios of 5:1 or better
- Chunked uploads can handle much larger routes with compression enabled

## Large Data Handling

The compression system includes optimizations for handling large data:

- Processes data in chunks to avoid JavaScript call stack size limitations
- Uses efficient buffer handling for large binary data
- Includes fallback mechanisms if compression fails
- Automatically detects compressed vs. uncompressed data

## Future Improvements

1. Add compression to server responses for route loading
2. Implement selective compression for specific fields (e.g., only compress GeoJSON)
3. Add compression level options for different types of data
4. Add metrics to track compression ratios and performance gains

## Usage Notes

- Compression is transparent to most of the application code
- The system falls back to uncompressed data if compression fails
- Compression headers and flags ensure backward compatibility
