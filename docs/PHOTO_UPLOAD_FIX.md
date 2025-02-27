# Photo Upload Issue Fix

## Problem Identified

The photo upload functionality is failing with the following errors:

```
[Error] Could not connect to the server.
[Error] Fetch API cannot load http://localhost:8080/api/photos/upload due to access control checks.
[Error] Failed to load resource: Could not connect to the server. (upload, line 0)
[Error] [photoService] Upload error: – TypeError: Load failed
TypeError: Load failed
```

### Root Cause Analysis

1. The frontend is still trying to connect to the Express server at `http://localhost:8080/api/photos/upload` instead of using the Vercel serverless functions.

2. The key issue is that the application is using the JavaScript version of the photo service (`photoService.js`) which might be importing a base URL from somewhere or using a hardcoded URL.

3. Even though we have both photoService.js and photoService.ts files, the application is specifically using the .js version as shown in the error message.

4. The issue is likely due to one of the following:
   - The JavaScript version of the service has a hardcoded URL or is importing a base URL from somewhere
   - An environment variable in `.env.local` or `.env` that's setting `VITE_API_BASE_URL` to `http://localhost:8080`
   - A proxy configuration in `vite.config.ts` that's redirecting `/api` requests to the Express server
   - Components importing from the .js version instead of the .ts version

## Solution

### 1. Check and Update Environment Variables

Ensure that `VITE_API_BASE_URL` is not set to `http://localhost:8080` in any of the environment files:

```bash
# .env.local
# Comment out or remove this line
# VITE_API_BASE_URL=http://localhost:8080
```

### 2. Update Vite Configuration

Check `vite.config.ts` for any proxy configurations that might be redirecting API requests:

```typescript
// vite.config.ts
export default defineConfig({
  // ...
  server: {
    proxy: {
      // Remove or comment out this proxy configuration
      // '/api': 'http://localhost:8080'
    }
  }
  // ...
});
```

### 3. Ensure photoService.ts Uses Relative URLs

The photoService.ts file should use relative URLs without checking for environment variables:

```typescript
// src/features/photo/services/photoService.ts
export const usePhotoService = () => {
  // ...
  // Use a simple relative URL without environment variable checks
  const API_BASE = '/api/photos';
  // ...
};
```

### 4. Verify API Handler in Vercel Functions

Make sure the API handler in `api/photos/index.js` correctly processes the upload request:

- It should handle the `/upload` path
- It should properly parse multipart form data
- It should have the necessary S3 integration for file storage

## Testing the Fix

1. After making these changes, rebuild and deploy the application
2. Test the photo upload functionality
3. Check the browser's network tab to ensure requests are going to the correct endpoint
4. Verify that photos are being uploaded to S3 and the database records are created

## Additional Notes

This issue is part of the broader migration from Express server to Vercel serverless functions. Similar issues might exist in other API services that are still trying to connect to the Express server.

The same approach can be applied to fix those services:
1. Ensure environment variables don't override API base URLs
2. Remove proxy configurations that redirect to the Express server
3. Use simple relative URLs in service files
4. Verify the corresponding API handlers in the Vercel functions
