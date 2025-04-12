# Photo Caption Fix

## Problem

The application was experiencing issues with photo captions not displaying correctly in the presentation mode. The root cause was identified as a caching issue:

1. Photos in MongoDB have captions stored correctly (e.g., "Climbing towards Mt Barrow")
2. When photos are initially loaded from the database, the captions are present in the data
3. However, when the photos are processed and cached, the captions are being lost
4. Subsequent loads use the cached version without captions, even though the original data had captions

The issue was confirmed by examining the logs, which showed:
- Captions present in the raw photo objects from the route
- Captions missing in the processed photos after loading

## Solution

The solution involved several changes:

1. **Improved Caching Mechanism**:
   - Added a cache versioning system to allow for cache invalidation
   - Modified the caching mechanism to preserve all photo properties, including captions
   - Added functions to clear the cache when needed

2. **Enhanced Photo Processing**:
   - Modified the photo loading process to make deep copies of photos to preserve all properties
   - Added explicit handling of captions to ensure they're preserved during processing
   - Improved protocol-agnostic URL comparison to handle HTTP vs HTTPS URLs correctly

3. **Added Debugging Tools**:
   - Created utility functions to clear the photo cache and force a reload
   - Added extensive logging to help diagnose caption-related issues
   - Created a browser console utility for clearing caches during development

## Usage

### Clearing the Photo Cache

If photo captions are not displaying correctly, you can clear the cache using one of these methods:

1. **Browser Console Method**:
   ```javascript
   import('/src/features/photo/utils/clearPhotoCache.js').then(module => module.clearCacheAndReload())
   ```

2. **Programmatic Method**:
   ```javascript
   import { clearAllPhotoCaches } from './features/photo/utils/photoCacheUtils';
   clearAllPhotoCaches();
   ```

3. **Automatic Cache Invalidation**:
   The cache version number can be incremented in `PresentationPhotoLayer.js` to automatically invalidate all caches:
   ```javascript
   const CACHE_VERSION = 2; // Increment this to invalidate all caches
   ```

## Technical Details

### Cache Versioning

The caching mechanism now uses a versioned key system:
```javascript
const cacheKey = `${routeId}_v${CACHE_VERSION}`;
```

This allows for automatic cache invalidation when the version number is incremented, ensuring that all users get the latest version of the code with the fix.

### Deep Copying

To ensure captions are preserved, we now make a deep copy of the photos before processing:
```javascript
const photosCopy = currentRoute._loadedState.photos.map(photo => ({
    ...photo,
    // Explicitly preserve caption if it exists
    caption: photo.caption !== undefined && photo.caption !== null ? photo.caption : undefined
}));
```

### Protocol-Agnostic URL Comparison

To handle HTTP vs HTTPS URLs correctly, we use a protocol-agnostic comparison function:
```javascript
const normalizeUrlForComparison = (url) => {
    if (!url) return '';
    // Remove protocol (http:// or https://) from the URL for comparison
    return url.replace(/^https?:\/\//, '');
};
```

## Future Improvements

For future development:

1. Consider adding a more targeted cache invalidation mechanism that can clear caches for specific routes or photos
2. Add a UI component to allow users to clear the cache if they notice issues with photo captions
3. Implement a more robust caching system that preserves all photo properties consistently
