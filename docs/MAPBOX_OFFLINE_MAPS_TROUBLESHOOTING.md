# Mapbox Offline Maps Troubleshooting Guide

## Recent Fixes Implemented

We've identified and fixed two key issues with the Mapbox offline maps functionality:

1. **Environment Variable Access Issue**: The `MAPBOX_DOWNLOADS_TOKEN` wasn't properly accessible in the JavaScript runtime because it wasn't exposed through the Expo config system.

2. **Token Handling Improvements**: Enhanced how the secret token is passed to the Mapbox SDK to ensure it's available for offline downloads.

## Changes Made

1. **App Configuration Update**:
   - Added `MAPBOX_DOWNLOADS_TOKEN` to the `extra` section in `app.config.js` to make it accessible at runtime
   - This ensures the token is properly bundled with the app

2. **Token Access Method**:
   - Updated code to use `Constants.expoConfig?.extra?.MAPBOX_DOWNLOADS_TOKEN` instead of `process.env.MAPBOX_DOWNLOADS_TOKEN`
   - Added more robust error handling and logging for token availability

3. **Multiple Token Passing Methods**:
   - Implemented multiple approaches to pass the downloads token to ensure compatibility with the native SDK
   - Added the token to metadata in different formats to maximize chances of it being recognized

## Common Issues and Solutions

### 1. Authentication Issues

**Symptoms:**
- Error message: "User not authenticated, returning empty list"
- No offline maps appear in the list
- Unable to download maps

**Solutions:**
- Ensure you are logged in to the app via the Profile tab
- If you're already logged in, try logging out and logging back in
- Check that your Auth0 configuration is correct in the app settings

### 2. Mapbox Token Issues

**Symptoms:**
- Error when trying to download maps
- Maps download starts but fails silently
- "Using public token for test region" appears in logs instead of secret token

**Solutions:**
- Verify both tokens are correctly set in your environment:
  - `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (Public Token - PK)
  - `MAPBOX_DOWNLOADS_TOKEN` (Secret Token - SK)
- Ensure the secret token starts with `sk.` and the public token starts with `pk.`
- Check that the tokens have the correct permissions in your Mapbox account

### 3. Rebuilding After Configuration Changes

After making changes to environment variables or app.config.js, you need to rebuild the app:

```bash
cd mobile/lutruwita-mobile
npx expo prebuild --clean
npx expo run:ios  # or run:android
```

### 4. Debugging Steps

If you're still experiencing issues:

1. **Test Mapbox Connection**
   - Go to the Downloads tab
   - Press "Test Mapbox Connection"
   - This will verify if the app can connect to Mapbox using the public token

2. **Test Minimal Region Download**
   - Go to the Downloads tab
   - Press "Test Minimal Region Download"
   - This will attempt to download a very small region to test if offline downloads work

3. **Check Logs**
   - Look for logs starting with `[MapboxOfflineManager]` and `[OfflineMapsContext]`
   - Pay attention to token-related logs and error messages

## Technical Background

### Mixed Version Setup

Our app uses a mixed version setup:
- JavaScript package: `@rnmapbox/maps` version 10.1.38
- Native iOS implementation: Mapbox Maps SDK version 11.11.0

This creates a situation where:
1. The JavaScript code uses v10.x API methods
2. But the underlying native implementation expects v11.x behavior

### Token Requirements

- The public token (PK) is used for general map operations
- The secret token (SK) is specifically required for offline downloads in the v11.x native implementation
- The JavaScript API doesn't have a direct way to set the downloads token, so we pass it through metadata

## Future Improvements

While the current fixes address the immediate issues, future improvements could include:

1. Aligning the JavaScript and native SDK versions to eliminate compatibility issues
2. Implementing a more secure way to handle the secret token
3. Adding more comprehensive error reporting and recovery mechanisms
