# Mapbox Integration Testing Guide

This guide provides instructions for testing and debugging the Mapbox integration in the Lutruwita Mobile app.

## Overview

The app uses Mapbox GL for maps, with a fallback mechanism:
1. First tries to use the native Mapbox GL implementation
2. If that fails, falls back to a WebView-based implementation
3. If both fail, shows a static map image

## Test Components

We've created a dedicated test component to help isolate and debug Mapbox issues:

- `MapboxTest.tsx`: A standalone component that focuses solely on initializing and rendering a Mapbox map
- `TestApp.tsx`: A simple wrapper for the test component

## Running the Test

1. Make sure you're in the project root directory:
   ```
   cd /Users/vincentmasci/Desktop/lutruwita2-next/lutruwita2-next/mobile/lutruwita-mobile
   ```

2. Make the test script executable (if not already):
   ```
   chmod +x run-mapbox-test.sh
   ```

3. Run the test script:
   ```
   ./run-mapbox-test.sh
   ```

   This will:
   - Temporarily modify App.tsx to use the test component
   - Start the Expo development server
   - Restore the original App.tsx when you exit

4. When the Expo server starts, run the app on your device or simulator:
   - For iOS: Press 'i'
   - For Android: Press 'a'
   - For web: Press 'w'

## Debugging

The test component provides detailed logging to help diagnose issues:

1. **Console Logs**: The component logs detailed information about:
   - Mapbox initialization
   - Token validation
   - Map loading events
   - Errors

2. **Visual Feedback**: The UI shows:
   - Initialization status
   - Map loading status
   - Error messages with retry option
   - Token information

3. **Common Issues**:

   - **Mapbox Token Issues**:
     - Check that the token in `.env` is valid
     - Verify token permissions in the Mapbox dashboard
     - Make sure the token is being properly loaded from the environment

   - **Native Module Issues**:
     - Run `npx expo prebuild --clean` to regenerate native code
     - Check that `@rnmapbox/maps` is properly installed
     - Verify the Podfile syntax is correct

   - **iOS-specific Issues**:
     - Check that the Swift Package Manager integration is set up correctly
     - Verify the `.netrc` file has the correct tokens
     - Run the `build-ios-spm.sh` script to rebuild with SPM

   - **Android-specific Issues**:
     - Check that the Mapbox download token is set in `android/gradle.properties`
     - Verify the manifest has the required permissions

## Fixing the Podfile

If you encounter issues with the Podfile, make sure it has the correct syntax:

```ruby
# Mapbox SPM Configuration
pod "MapboxMaps", :modular_headers => true, :linkage => podfile_properties['ios.useFrameworks'].to_sym if podfile_properties['ios.useFrameworks']
```

Note the comma after `:modular_headers => true`.

## Next Steps

If the native implementation continues to fail:

1. Check the logs to identify the specific error
2. Verify all tokens and permissions
3. Consider rebuilding the native modules with `npx expo prebuild --clean`
4. Run `pod install` in the iOS directory
5. Check for any Mapbox SDK version compatibility issues
