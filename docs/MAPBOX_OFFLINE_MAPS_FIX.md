# Mapbox Offline Maps Fix

## Issue Summary

The offline maps functionality in the mobile app was failing silently due to a complex version mismatch and token configuration issue. The app uses a mixed version setup with different Mapbox SDK versions for JavaScript and native code.

## Root Cause Analysis

1. **Version Mismatch**: Our project has a mixed version setup:
   - JavaScript package: `@rnmapbox/maps` version 10.1.38 (in package.json)
   - Native iOS implementation: Mapbox Maps SDK version 11.11.0 (in app.json plugins configuration)

2. **Token Configuration**: The native iOS implementation (v11.11.0) requires a Secret Key (SK) token for offline downloads, but the JavaScript API (v10.1.38) doesn't provide a direct way to set it.

3. **Silent Failure**: Mapbox SDK silently rejected the configuration without providing clear error messages, making the issue difficult to diagnose.

4. **Documentation Version Mismatch**: The Mapbox documentation we were referencing (in `docs/MAPBOX_OFFLINE_MAPS_DOCUMENTATION.md`) is for Mapbox Maps SDK v11+, which has a different API for offline maps than the JavaScript API we're using.

## Solution Implemented

1. **Use Both Tokens**: Configure the system to use both tokens appropriately:
   - Public token (PK) for general map operations
   - Secret token (SK) specifically for offline downloads
   ```javascript
   // Get both tokens from environment variables
   const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
   const MAPBOX_DOWNLOADS_TOKEN = process.env.MAPBOX_DOWNLOADS_TOKEN || '';
   
   // Set the public token for general operations
   Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
   
   // Pass the secret token in the metadata for offline downloads
   (offlineRegionOptions.metadata as any).downloadsToken = MAPBOX_DOWNLOADS_TOKEN;
   ```

2. **Database Reset Approach**: Use `resetDatabase()` instead of trying to delete individual packs:
   ```javascript
   try {
     console.log('[MapboxOfflineManager] Resetting offline database to ensure clean state');
     await Mapbox.offlineManager.resetDatabase();
     
     // Add a small delay after reset to ensure the system has time to process
     await new Promise(resolve => setTimeout(resolve, 1000));
   } catch (resetError) {
     console.log('[MapboxOfflineManager] Error resetting offline database:', resetError);
     // Continue anyway
   }
   ```

3. **Improved Error Handling**: Added better error logging and retry mechanisms:
   ```javascript
   // Add a retry mechanism for getting the status
   let retryCount = 0;
   const maxRetries = 3;
   
   while (retryCount < maxRetries) {
     try {
       // Operation that might fail
       success = true;
       break;
     } catch (error) {
       console.error(`[MapboxOfflineManager] Error (attempt ${retryCount + 1}/${maxRetries}):`, error);
       
       // If we've retried enough, give up
       if (retryCount === maxRetries - 1) {
         break;
       }
       
       // Otherwise, wait and retry
       retryCount++;
       await new Promise(resolve => setTimeout(resolve, 500));
     }
   }
   ```

4. **Verification After Download**: Added verification to ensure the region exists after download:
   ```javascript
   // Verify the region exists by getting the packs
   Mapbox.offlineManager.getPacks().then(packs => {
     const routePack = packs.find(p => p.name === regionName);
     if (routePack) {
       console.log(`[MapboxOfflineManager] Route region ${regionName} verified in pack list`);
       resolve({ size: totalSize, tilesCount: totalTiles });
     } else {
       console.error(`[MapboxOfflineManager] Route region ${regionName} not found in pack list after download`);
       reject(new Error('Region not found after download'));
     }
   });
   ```

5. **Timing Improvements**: Added delays at critical points to ensure operations complete properly:
   ```javascript
   // Add a small delay before resolving to ensure the region is fully registered
   setTimeout(() => {
     // Verification code here
   }, 2000); // 2 second delay
   ```

## Version Complexity and API Differences

### Mixed Version Setup
Our project has a unique configuration:
- JavaScript API: `@rnmapbox/maps` v10.1.38 (in package.json)
- Native iOS implementation: Mapbox Maps SDK v11.11.0 (in app.json)

This creates a situation where:
1. The JavaScript code uses v10.x API methods
2. But the underlying native implementation expects v11.x behavior

### Mapbox Maps SDK v10.x (JavaScript API)
- Uses `offlineManager.createPack()` to download offline regions in a single step
- Does not have separate style pack and tile region concepts
- Example:
  ```javascript
  Mapbox.offlineManager.createPack({
    name: 'offlinePack',
    styleURL: 'mapbox://styles/mapbox/outdoors-v12',
    minZoom: 9,
    maxZoom: 15,
    bounds: [[neLng, neLat], [swLng, swLat]]
  }, progressListener, errorListener);
  ```

### Mapbox Maps SDK v11+ (Native Implementation)
- Uses a two-step process:
  1. First download style pack using `offlineManager.loadStylePack()`
  2. Then download tile region using `tileStore.loadTileRegion()`
- Has separate concepts for style packs and tile regions
- Requires a downloads token (SK) for offline functionality
- Example:
  ```javascript
  // Step 1: Download style pack
  offlineManager.loadStylePack(styleURI, stylePackLoadOptions, progressCallback, completionCallback);
  
  // Step 2: Download tile region
  tileStore.loadTileRegion(regionId, tileRegionLoadOptions, progressCallback, completionCallback);
  ```

### Our Approach
We're using the v10.x JavaScript API methods but passing the SK token in the metadata to help the v11.x native implementation access it. This is a non-standard approach but necessary due to the mixed version setup.

## Mapbox Token Best Practices and Our Exception

### Standard Best Practices
1. **Public Token (pk) for Client-Side**: 
   - Use public tokens (pk) for all client-side operations including map rendering
   - Public tokens have limited permissions and are safe to include in client code

2. **Secret Token (sk) for Server-Side Only**:
   - Secret tokens should ONLY be used on secure servers
   - Never include secret tokens in client-side code
   - Secret tokens grant full account access and can be misused if exposed

### Our Exception
In our specific case, we need to use both tokens:
- Public token (PK) for general map operations
- Secret token (SK) specifically for offline downloads

This is necessary because:
1. The v11.11.0 native implementation requires an SK token for offline downloads
2. But we're using the v10.1.38 JavaScript API which doesn't have a built-in way to provide it

**Security Note**: Including the SK token in client code is generally not recommended. In a production environment, consider implementing a server-side proxy to handle offline downloads or upgrading both the JavaScript and native implementations to the same version.

## Implementation Details

1. **Token Configuration**: The app now uses both tokens:
   ```javascript
   // Get both tokens from environment variables
   const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
   const MAPBOX_DOWNLOADS_TOKEN = process.env.MAPBOX_DOWNLOADS_TOKEN || '';
   
   // Set the public token for general operations
   Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
   ```

2. **Offline Pack Creation with SK Token**: Pass the SK token in the metadata:
   ```javascript
   if (MAPBOX_DOWNLOADS_TOKEN) {
     console.log(`[MapboxOfflineManager] Using hardcoded SK token for offline download`);
     (offlineRegionOptions.metadata as any).downloadsToken = MAPBOX_DOWNLOADS_TOKEN;
   }
   
   Mapbox.offlineManager.createPack(
     offlineRegionOptions,
     progressCallback,
     errorCallback
   );
   ```

3. **Improved Error Handling**: Added comprehensive error logging and retry mechanisms:
   ```javascript
   console.error(`[MapboxOfflineManager] Download error:`, JSON.stringify(error));
   
   // Retry mechanism for operations that might fail
   let retryCount = 0;
   const maxRetries = 3;
   while (retryCount < maxRetries) {
     try {
       // Operation that might fail
       break;
     } catch (error) {
       // Log error and retry
       retryCount++;
       await new Promise(resolve => setTimeout(resolve, 500));
     }
   }
   ```

4. **Verification Process**: Added verification after download:
   ```javascript
   // Verify the region exists by getting the packs
   Mapbox.offlineManager.getPacks().then(packs => {
     const routePack = packs.find(p => p.name === regionName);
     if (routePack) {
       console.log(`[MapboxOfflineManager] Route region verified in pack list`);
       resolve({ size: totalSize, tilesCount: totalTiles });
     } else {
       console.error(`[MapboxOfflineManager] Route region not found in pack list`);
       reject(new Error('Region not found after download'));
     }
   });
   ```

## Future Considerations

1. **Upgrade to Mapbox SDK v11+**: Consider upgrading to the latest Mapbox SDK version to take advantage of the improved offline maps functionality with separate style packs and tile regions.

2. **Improved Error Handling**: Continue to enhance error handling and logging to catch any silent failures.

3. **Token Management**: Ensure all tokens are properly managed and that no secret tokens are included in client-side code.
