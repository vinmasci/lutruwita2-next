# S3 Image Troubleshooting Guide

This guide provides tools and instructions for diagnosing and fixing issues with S3 image uploads and access in the application.

## Background

The application is experiencing an issue where images are successfully uploaded to S3, but when trying to display them in the browser, a 403 Forbidden error occurs:

```
[Error] Failed to load resource: the server responded with a status of 403 (Forbidden) (1740558006447-nfz0ic5-IMG_4103.jpeg, line 0)
```

This guide provides test scripts and tools to help diagnose and fix the issue.

## Test Scripts

Three test scripts have been created to help diagnose the issue:

1. **test-direct-upload.js** - Tests uploading an image directly to S3
2. **test-s3-image-access.js** - Tests downloading an image from S3 in various ways
3. **test-s3-cors.js** - Tests the CORS configuration of the S3 bucket
4. **test-s3-image-browser.html** - A browser-based tool for testing image loading

### 1. Testing Direct Upload

This script tests uploading an image directly to S3 using a presigned URL.

```bash
node test-direct-upload.js
```

If this succeeds, it confirms that the upload process is working correctly.

### 2. Testing S3 Image Access

This script tests downloading an image from S3 in various ways, including standard GET requests, range requests, and saving the image locally.

```bash
node test-s3-image-access.js
```

This script will:
- Upload a test image to S3
- Test accessing the image with different HTTP methods
- Save the downloaded image locally
- Generate HTML to test the image in a browser

### 3. Testing S3 CORS Configuration

This script tests the CORS configuration of the S3 bucket by making preflight OPTIONS requests and checking the response headers.

```bash
node test-s3-cors.js [S3_URL]
```

Replace `[S3_URL]` with the URL of an image in your S3 bucket. For example:

```bash
node test-s3-cors.js https://your-bucket.s3.amazonaws.com/test-image.jpg
```

This script will:
- Make a preflight OPTIONS request to check CORS headers
- Test direct access to the image
- Test cross-origin access to the image
- Provide recommendations based on the results

### 4. Browser-based Image Testing

Open `test-s3-image-browser.html` in a web browser to test loading images from S3 directly in the browser.

This tool allows you to:
- Test loading images with an `<img>` tag
- Test loading images with the Fetch API
- Test loading images with XMLHttpRequest
- Check response headers

## Common Issues and Solutions

### 1. Missing or Incorrect CORS Configuration

**Symptoms:**
- Images load in direct requests but fail in the browser
- Browser console shows CORS errors

**Solution:**
1. Update your S3 bucket CORS configuration to include:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "POST", "GET", "DELETE"],
       "AllowedOrigins": [
         "https://your-production-domain.com", 
         "https://your-staging-domain.vercel.app", 
         "http://localhost:3000"
       ],
       "ExposeHeaders": ["ETag", "x-amz-meta-*"]
     }
   ]
   ```
2. Make sure your application's domain is included in the `AllowedOrigins` list

### 2. Incorrect ACL Settings

**Symptoms:**
- 403 Forbidden errors when accessing images
- Images upload successfully but can't be accessed

**Solution:**
1. Check if the `x-amz-acl` header is being set correctly during upload
2. Ensure the bucket policy allows public read access for the objects
3. Check if the objects have the correct ACL settings (e.g., `public-read`)

### 3. Bucket Policy Issues

**Symptoms:**
- 403 Forbidden errors when accessing images
- Images can be accessed with presigned URLs but not directly

**Solution:**
1. Update your bucket policy to allow public read access:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

### 4. Incorrect Content-Type

**Symptoms:**
- Images upload but display incorrectly or not at all
- Browser tries to download the image instead of displaying it

**Solution:**
1. Ensure the correct Content-Type is being set during upload
2. Check if the Content-Type header is being preserved in the S3 object metadata

## Debugging Steps

1. **Check if the image is actually in S3**
   - Use the AWS Console or CLI to verify the image exists
   - Check the object's permissions and metadata

2. **Test direct access to the image**
   - Try accessing the image URL directly in a browser
   - Use `curl` or Postman to check the response headers

3. **Check browser network requests**
   - Open the browser's developer tools
   - Look at the Network tab when loading the page
   - Check the request and response headers for the image

4. **Verify CORS configuration**
   - Use the `test-s3-cors.js` script to check CORS headers
   - Make sure your application's domain is allowed

5. **Test with a simple HTML page**
   - Use the `test-s3-image-browser.html` tool to test loading the image
   - Try different methods (img tag, fetch, XHR)

## Conclusion

By using these test scripts and following the debugging steps, you should be able to identify and fix the issue with S3 image loading. The most common causes are CORS configuration issues, incorrect ACL settings, or bucket policy problems.

If the test scripts show that the images can be uploaded and accessed directly, but still fail in the browser, it's likely a CORS issue. If the images can't be accessed directly, it's likely a permissions or ACL issue.
