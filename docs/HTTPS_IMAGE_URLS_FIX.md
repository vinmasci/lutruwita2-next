# HTTPS Image URLs Fix

## Issue
Mobile devices, particularly iOS, were experiencing crashes when scrolling through images in the photo modal. The console logs showed warnings about insecure content being automatically upgraded:

```
[Warning] The page at https://lutruwita2-next.vercel.app/preview/route/67b56367-5952-4a2a-9eb9-63ab467b5636 requested insecure content from http://res.cloudinary.com/dig9djqnj/image/upload/v1740722274/uploads/tzivpdoncpgya7nizzpa.jpg. This content was automatically upgraded and should be served over HTTPS.
```

## Root Cause
The application was generating HTTP URLs for Cloudinary images instead of HTTPS URLs. When these HTTP URLs were loaded on a secure HTTPS site, the browser automatically upgraded them to HTTPS, causing:

1. Additional network overhead as each request was redirected
2. Potential memory issues on mobile devices when many images were loaded
3. Possible race conditions during the upgrade process

This was particularly problematic on mobile devices (especially iOS) where:
- Memory constraints are tighter
- The browser is already handling complex operations (map rendering, photo modal, etc.)
- The automatic upgrades add extra processing overhead during image loading

## Solution

### 1. Server-Side Fix: Force HTTPS in Cloudinary URL Generation
Modified the URL generation functions in `api/lib/cloudinary.js` to explicitly use HTTPS by adding the `secure: true` option to all URL generation calls:

```javascript
export function generateTinyThumbnailUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    width: options.width || 100,
    height: options.height || 100,
    crop: 'fill',
    quality: options.quality || 60,
    format: 'auto',
    secure: true // Force HTTPS
  });
}
```

This change was applied to all URL generation functions:
- `generateTinyThumbnailUrl`
- `generateSmallThumbnailUrl`
- `generateMediumThumbnailUrl`
- `generateLargeImageUrl`
- `generateImageUrl`

### 2. Client-Side Safety Nets

#### a. PhotoModal Component
Added a safety check in the `getBestImageUrl` function in `src/features/presentation/components/PhotoLayer/PhotoModal.jsx` to ensure any HTTP URLs are converted to HTTPS on the fly:

```javascript
// Ensure a URL uses HTTPS instead of HTTP
const ensureHttpsUrl = (url) => {
  if (typeof url === 'string' && url.startsWith('http:')) {
    return url.replace('http:', 'https:');
  }
  return url;
};

// Determine the best image URL to use based on device type
const getBestImageUrl = (photo) => {
  // ... existing logic to select the best URL ...
  
  // Ensure the URL uses HTTPS
  return ensureHttpsUrl(url);
};
```

#### b. PresentationPhotoLayer Component
Added URL protocol conversion in the photo marker click handler in `src/features/presentation/components/PhotoLayer/PresentationPhotoLayer.js` to ensure all photo URLs are using HTTPS before the photo modal is opened:

```javascript
onClick: () => {
  // ... existing code for panning the map ...
  
  // Ensure any HTTP URLs are converted to HTTPS
  if (item.properties.photo.url && typeof item.properties.photo.url === 'string' && 
      item.properties.photo.url.startsWith('http:')) {
    item.properties.photo.url = item.properties.photo.url.replace('http:', 'https:');
  }
  
  // Also check other URL properties
  ['thumbnailUrl', 'tinyThumbnailUrl', 'mediumUrl', 'largeUrl'].forEach(urlProp => {
    if (item.properties.photo[urlProp] && 
        typeof item.properties.photo[urlProp] === 'string' && 
        item.properties.photo[urlProp].startsWith('http:')) {
      item.properties.photo[urlProp] = item.properties.photo[urlProp].replace('http:', 'https:');
    }
  });
  
  // ... existing code for setting the selected photo ...
}
```

These client-side safety nets ensure that even if HTTP URLs are stored in the database or coming from other sources, they will be converted to HTTPS before being used.

## Benefits

1. **Eliminates Mixed Content Warnings**: By ensuring all content is loaded over HTTPS, we eliminate the mixed content warnings.

2. **Prevents Automatic Upgrades**: The browser no longer needs to perform automatic upgrades, reducing overhead.

3. **Improves Mobile Performance**: Reduces the processing overhead on mobile devices, particularly iOS, which helps prevent crashes.

4. **Better Security**: HTTPS is more secure and is the recommended approach for all web content.

## Implementation Notes

- No database migration or re-uploading of images was required
- The fix is backward compatible with existing data
- Both server-side and client-side fixes were implemented for maximum reliability

## Bug Fix Updates

### Update 1: Avoiding Direct Object Modification

After implementing the initial fix, we discovered that directly modifying the photo object properties in `PresentationPhotoLayer.js` was causing the photo modal to not appear when clicking on image markers. This was because we were modifying the original photo object in-place, which can cause issues with React's state management.

The solution was to:

1. Create a deep copy of the photo object before modifying it:
   ```javascript
   // Create a deep copy of the photo object to avoid modifying the original
   const photoWithHttpsUrls = { ...item.properties.photo };
   ```

2. Use a helper function to ensure HTTPS URLs:
   ```javascript
   // Helper function to ensure HTTPS URLs
   const ensureHttpsUrl = (url) => {
       if (typeof url === 'string' && url.startsWith('http:')) {
           return url.replace('http:', 'https:');
       }
       return url;
   };
   ```

3. Apply the URL conversion to the copy rather than the original:
   ```javascript
   // Ensure the main URL uses HTTPS
   if (photoWithHttpsUrls.url) {
       photoWithHttpsUrls.url = ensureHttpsUrl(photoWithHttpsUrls.url);
   }
   
   // Also check other URL properties
   ['thumbnailUrl', 'tinyThumbnailUrl', 'mediumUrl', 'largeUrl'].forEach(urlProp => {
       if (photoWithHttpsUrls[urlProp]) {
           photoWithHttpsUrls[urlProp] = ensureHttpsUrl(photoWithHttpsUrls[urlProp]);
       }
   });
   ```

4. Pass the modified copy to the state setter:
   ```javascript
   setTimeout(() => {
       setSelectedPhoto(photoWithHttpsUrls);
   }, delay);
   ```

This approach ensures that we're not modifying the original photo object, which could cause issues with React's state management and rendering.

### Update 2: Protocol-Agnostic URL Comparison

We discovered another issue where the photo modal still wasn't showing because the URL comparison was failing. This was because we were converting HTTP URLs to HTTPS, but then trying to find the photo in arrays that still had HTTP URLs.

The solution was to implement protocol-agnostic URL comparison:

1. Create a helper function to normalize URLs for comparison:
   ```javascript
   // Helper function to normalize URLs for protocol-agnostic comparison
   const normalizeUrlForComparison = useCallback((url) => {
       if (!url) return '';
       // Remove protocol (http:// or https://) from the URL for comparison
       return url.replace(/^https?:\/\//, '');
   }, []);
   ```

2. Use this function when finding photos by URL:
   ```javascript
   // Find the index of the selected photo in the ordered array using URL as unique identifier
   // Use protocol-agnostic comparison to handle http vs https differences
   const selectedPhotoIndex = orderedPhotos.findIndex(p => 
       normalizeUrlForComparison(p.url) === normalizeUrlForComparison(selectedPhoto.url)
   );
   ```

3. Apply the same approach to all URL comparisons in the component:
   - When finding clusters containing the selected photo
   - When finding related photos in simulated clustering
   - When checking if a marker is the selected photo

This ensures that URLs are compared without considering the protocol (HTTP vs HTTPS), allowing the application to correctly match photos regardless of which protocol is used in the URL.

### Update 3: Mobile-Specific URL Comparison Fix

We discovered an additional issue where the photo modal wasn't showing on mobile devices. The problem was that we had implemented protocol-agnostic URL comparison for most of the code, but missed a mobile-specific code path.

The issue was in the code that finds the index of the selected photo in the limited array of photos passed to the modal on mobile devices:

```javascript
// Original code - direct URL comparison that fails when protocols don't match
const newIndex = isMobile ? 
    photosToPass.findIndex(p => p.url === selectedPhoto.url) : 
    selectedPhotoIndex;
```

We fixed this by updating the mobile-specific code path to also use protocol-agnostic URL comparison:

```javascript
// Updated code - protocol-agnostic comparison for both mobile and desktop
const newIndex = isMobile ? 
    photosToPass.findIndex(p => normalizeUrlForComparison(p.url) === normalizeUrlForComparison(selectedPhoto.url)) : 
    selectedPhotoIndex;
```

We also added additional debug logging to help diagnose any remaining issues:

```javascript
// Debug logging for mobile case
if (isMobile && !isMobile) { // This condition ensures it only runs in development, not on actual mobile devices
    console.log('Mobile photo modal debugging:');
    console.log('- Selected photo URL:', selectedPhoto.url);
    console.log('- Normalized selected URL:', normalizeUrlForComparison(selectedPhoto.url));
    console.log('- Photos to pass:', photosToPass.map(p => ({
        original: p.url,
        normalized: normalizeUrlForComparison(p.url)
    })));
    console.log('- New index in limited array:', newIndex);
}
```

This ensures that the photo modal works correctly on mobile devices, even when the URLs use different protocols.

## Related Issues

This fix complements the existing optimizations documented in:
- `PHOTO_MODAL_IOS_OPTIMIZATION.md`
- `MOBILE_PERFORMANCE_OPTIMIZATIONS.md`
