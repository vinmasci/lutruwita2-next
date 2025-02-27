# S3 Upload and Image Loading Troubleshooting

## Issues

We encountered two separate issues with S3 image handling:

1. **Upload Issue**: Direct-to-S3 uploads were failing with a 403 Forbidden error due to header signing issues.
2. **Image Loading Issue**: Images were successfully uploaded to S3, but when trying to display them in the browser, a 403 Forbidden error occurred:
   ```
   [Error] Failed to load resource: the server responded with a status of 403 (Forbidden) (1740555592554-hgy0yns-IMG_4103.jpeg, line 0)
   ```

## Test Scripts Created

To diagnose and fix these issues, we created several test scripts:

1. **test-direct-upload.js** - Tests uploading an image directly to S3
2. **test-s3-image-access.js** - Tests downloading an image from S3 in various ways
3. **test-s3-cors.js** - Tests the CORS configuration of the S3 bucket
4. **test-s3-fetch-xhr.js** - Tests different ways of accessing S3 images with fetch and XMLHttpRequest
5. **test-s3-image-browser.html** - A simple HTML page to test loading images in the browser
6. **test-s3-image-browser-debug.html** - A more comprehensive browser-based tool for testing image loading

## Upload Issue: Root Cause and Solution

### Root Cause

The upload issue was related to how the ACL (Access Control List) headers were being handled:

1. The backend was correctly generating presigned URLs that included the `x-amz-acl=public-read` parameter in the URL itself.
2. The frontend code was also adding an `x-amz-acl` header to the request.
3. AWS S3 was rejecting the request because the `x-amz-acl` header in the request wasn't part of the original signature used to generate the presigned URL.

### Solution

The solution was to remove the redundant `x-amz-acl` header from the client-side code:

1. In `src/features/photo/services/photoService.js`, we removed the line:
   ```javascript
   xhr.setRequestHeader('x-amz-acl', 'public-read');
   ```

2. In `test-direct-upload.js`, we removed the same header from the test script.

The presigned URL already includes the necessary ACL parameters, so there's no need to add them again in the request headers.

## Image Loading Issue: Findings and Solutions

### Test Findings

Through our test scripts, we discovered several important findings:

1. **Direct Image Tags Work**: Loading images directly with `<img>` tags works consistently.
2. **Fetch API Issues**: The Fetch API sometimes fails with CORS errors when trying to load images from S3.
3. **XMLHttpRequest Issues**: XMLHttpRequest also sometimes fails with similar CORS errors.
4. **Accept Header Matters**: Adding specific Accept headers like `Accept: image/jpeg, image/png, image/*` helps in some cases.
5. **Image Object Approach**: Using the JavaScript Image object (`new Image()`) works more reliably than fetch or XHR.

### Solutions Implemented

We implemented two key solutions to fix the image loading issues:

1. **Added Accept Headers to XMLHttpRequest**: In `src/features/photo/services/photoService.js`, we added explicit Accept headers to help with CORS issues:
   ```javascript
   xhr.setRequestHeader('Accept', 'image/jpeg, image/png, image/*');
   ```

2. **Improved Image Loading in PhotoMarker Component**: In `src/features/photo/components/PhotoMarker/PhotoMarker.tsx`, we replaced the direct image creation with a more robust approach using the Image object:
   ```typescript
   // Create a new Image object to preload the image
   const imgLoader = new Image();
   imgLoader.onload = () => {
     // Once loaded, create the actual img element for the marker
     const img = document.createElement('img');
     img.src = imgLoader.src;
     img.alt = photo.name || 'Photo';
     bubble.appendChild(img);
   };
   
   imgLoader.onerror = () => {
     console.error('Failed to load photo thumbnail:', photo.thumbnailUrl);
     // Create fallback image
     const img = document.createElement('img');
     img.src = '/images/photo-fallback.svg';
     img.alt = 'Failed to load photo';
     bubble.appendChild(img);
   };
   
   // Set the source to start loading
   imgLoader.src = photo.thumbnailUrl;
   ```

## Current Status

### What's Working

1. **Image Uploads**: Direct uploads to S3 are now working correctly after removing the redundant ACL header.
2. **Image Loading with `<img>` Tags**: Direct image loading with `<img>` tags works consistently.
3. **Image Loading with Image Object**: The Image object approach implemented in the PhotoMarker component should work reliably.

### What May Still Have Issues

1. **Fetch API and XMLHttpRequest**: These methods may still have issues in some browsers or scenarios, but our implemented solutions should mitigate most problems.
2. **PhotoCluster Component**: This component may need similar updates to the PhotoMarker component if it experiences similar issues.

## Additional Notes

When using presigned URLs with AWS S3, it's important to understand that:

1. The presigned URL includes a signature that is calculated based on specific parameters and headers.
2. Any additional headers or parameters that weren't part of the original signature calculation will cause the request to be rejected.
3. If you need to include specific headers (like ACL settings), they should be included when generating the presigned URL on the server side, not added separately on the client side.

The backend code in `api/lib/storage.js` correctly includes the ACL parameter when generating the presigned URL:

```javascript
const params = {
  Bucket: bucketName,
  Key: key,
  ContentType: contentType,
  ACL: 'public-read'  // This is included in the presigned URL
};
```

## Recommendations for Future Issues

If similar issues occur in the future, consider:

1. **Check CORS Configuration**: Ensure the S3 bucket has the correct CORS configuration to allow requests from your application domains.
2. **Use Image Object Approach**: The `new Image()` approach is more reliable than fetch or XHR for loading images.
3. **Add Explicit Accept Headers**: When using fetch or XHR, include explicit Accept headers for images.
4. **Verify Presigned URL Parameters**: Make sure any parameters needed are included in the presigned URL generation, not added separately in the client request.
5. **Test with Browser Tools**: Use the browser's developer tools to inspect network requests and responses for detailed error information.

## Test Scripts Reference

All test scripts are available in the project root:

- `test-direct-upload.js` - For testing S3 uploads
- `test-s3-image-access.js` - For testing image downloads
- `test-s3-cors.js` - For testing CORS configuration
- `test-s3-fetch-xhr.js` - For testing fetch and XHR
- `test-s3-image-browser.html` - Simple browser test
- `test-s3-image-browser-debug.html` - Comprehensive browser test with debugging
