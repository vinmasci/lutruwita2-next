# Cloudinary Photo Upload Issue

## Current Status

We've been investigating the issue with photos not being properly uploaded to Cloudinary when saving routes. The problem appears to be that photos are being processed locally and stored with blob URLs, but they are not being uploaded to Cloudinary before saving the route. This results in blob URLs being saved in the database, which are temporary and not accessible outside the browser session.

## Test Results

We created a test script (`test-cloudinary-photo-upload.cjs`) to diagnose the issue. Here's what we found:

### What's Working:
- **Signature Generation**: The API endpoint for getting a Cloudinary upload signature (`/api/photos?presigned=true`) is working correctly. We successfully received a signature with the following data:
  ```json
  {
    "signature": "fb7698c0082116ef7a1824da0dfdbb89e8df12bf",
    "timestamp": 1740650821,
    "apiKey": "682837882671547",
    "cloudName": "dig9djqnj",
    "metadata": {
      "gps": { "latitude": 42.123, "longitude": -71.456 },
      "userId": "anonymous",
      "timestamp": 1740650820539
    }
  }
  ```

### What's Not Working:
1. **Direct Cloudinary Upload**: When trying to upload directly to Cloudinary using the signature, we received a `401 Unauthorized` error. This suggests an authentication issue with the Cloudinary API.

2. **API Upload Endpoint**: When trying to upload through our API endpoint (`/api/photos/upload`), we received a `500 Internal Server Error`. This indicates a server-side issue with our photo upload handler.

## Hypotheses

### 1. Cloudinary Authentication Issues
The 401 error when uploading directly to Cloudinary is likely NOT due to incorrect credentials, as we've verified that:
- The API key, secret, and cloud name in the .env file match exactly with the Cloudinary dashboard
- The signature generation endpoint is working correctly, which confirms the credentials are being read properly

The 401 error is more likely due to:
- Issues with the signature calculation or how it's being used in the upload request
- Upload preset configuration ("lutruwita" is set to "Signed" mode)
- Cloudinary security settings (only "localhost" is allowed for referral/fetch domains)
- Missing or incorrect parameters in the upload request

### 2. API Endpoint Issues
The 500 error from our API endpoint could be due to:
- Server-side error in handling the multipart form data
- Missing dependencies or incorrect configuration in the API route
- Issues with the Cloudinary client library on the server
- Environment variables not properly set up on the server

## Current Photo Storage Flow

Based on the error and the code review, here's what appears to be happening:

1. When a user adds photos to a route, the photos are processed locally and stored as blob URLs
2. These blob URLs are saved directly in the route object
3. When the route is saved to the database, these temporary blob URLs are saved instead of permanent Cloudinary URLs
4. When trying to view the photos later, the blob URLs are no longer valid, resulting in errors

## Solution Implemented

After investigating the issue, we found that the problem was with the signature-based upload process. The signature calculation on the server was including parameters that weren't being included in the client-side upload request, specifically:

1. The server was adding a `folder: 'uploads'` parameter to the signature calculation
2. The order of parameters in the signature string matters for validation

We attempted to fix this by ensuring all parameters used in the signature calculation were also included in the upload request, but continued to encounter issues with the signature validation.

### Simplified Solution: Unsigned Uploads

Instead of troubleshooting the complex signature-based upload process, we implemented a simpler solution using Cloudinary's unsigned upload capability:

1. We modified the Cloudinary upload preset "lutruwita" in the Cloudinary dashboard to use "Unsigned" mode instead of "Signed" mode
2. We created a new test script (`test-cloudinary-unsigned.cjs`) that uploads directly to Cloudinary without requiring a signature
3. The test was successful, confirming that unsigned uploads work correctly

This approach has several advantages:
- Eliminates the complexity of signature generation and validation
- Reduces the number of API calls needed (no need to get a signature first)
- Simplifies the client-side code for uploading photos

### Implementation Details

The simplified upload process now works as follows:

```javascript
// Create form data with the file and upload preset
const formData = new FormData();
formData.append('file', fileData);
formData.append('upload_preset', 'lutruwita');

// Add metadata if needed
formData.append('context', `lat=${latitude}|lng=${longitude}`);

// Add folder for organization (optional)
formData.append('folder', 'uploads');

// Upload directly to Cloudinary
const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
  method: 'POST',
  body: formData
});

// Get the Cloudinary URL from the response
const data = await response.json();
const cloudinaryUrl = data.secure_url;
```

### Security Considerations

While unsigned uploads are simpler, they do introduce some security considerations:

1. Anyone who knows your cloud name and upload preset name could potentially upload to your account
2. To mitigate this, we've configured the upload preset with:
   - Upload limits (max file size, allowed formats)
   - Folder restrictions (uploads go to a specific folder)
   - CORS settings to restrict which domains can upload

## Next Steps

1. Update the photo upload component to use unsigned uploads directly to Cloudinary
2. Modify the route saving logic to store Cloudinary URLs instead of blob URLs
3. Test the complete flow from photo upload to route saving and retrieval
4. Consider adding server-side validation for uploads if needed

This solution should resolve the issue with photos not being properly stored and accessible after saving routes.
