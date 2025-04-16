# Mapbox Native Maps Authentication Fix

## Problem

The Mapbox native maps were failing to load because of an authentication issue when downloading the Mapbox SDK during the build process.

## Root Cause

We identified two issues:

1. In the Podfile, there was a line that explicitly set the Mapbox download token to the public key (pk) instead of the secret key (sk):

```ruby
$RNMapboxMapsDownloadToken = 'pk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY20xY3B1ZmdzMHp5eDJwcHBtMmptOG8zOSJ9.Ayn_YEjOCCqujIYhY9PiiA'
```

The public key doesn't have permission to download the Mapbox SDK, which was causing the 403 Forbidden error.

2. The .netrc file was also using the public key, which was causing issues when the build process tried to download the Mapbox SDK.

3. There was a version mismatch between the React Native Mapbox wrapper (@rnmapbox/maps version 10.1.38) and the native Mapbox SDK (version 10.16.0) specified in the Package.swift file.

4. The Podfile had syntax errors in the Mapbox configuration section, which was causing the build to fail.

## Solution

We fixed the issue by:

1. Updating the Podfile to use the secret key (sk) instead of the public key (pk):

```ruby
$RNMapboxMapsDownloadToken = 'sk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY205ZjcyNDRoMHcybjJqb2Fsd2p4NTFzZyJ9.RypRAeS61ChnzZJRSViOpg'
```

2. Ensuring the .netrc file only contains the secret key entry:

```
machine api.mapbox.com
login mapbox
password sk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY205ZjcyNDRoMHcybjJqb2Fsd2p4NTFzZyJ9.RypRAeS61ChnzZJRSViOpg
```

3. Updating the Package.swift file to use a more compatible version of the Mapbox SDK:

```swift
.package(
    name: "MapboxMaps",
    url: "https://github.com/mapbox/mapbox-maps-ios.git",
    from: "10.0.0"
)
```

4. Simplifying the Mapbox configuration in the Podfile to avoid syntax errors:

```ruby
# Mapbox SPM Configuration
pod "MapboxMaps", :modular_headers => true
```

5. Ensuring the .env file has both the public access token and the secret download token:

```
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY20xY3B1ZmdzMHp5eDJwcHBtMmptOG8zOSJ9.Ayn_YEjOCCqujIYhY9PiiA
MAPBOX_DOWNLOADS_TOKEN=sk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY205ZjcyNDRoMHcybjJqb2Fsd2p4NTFzZyJ9.RypRAeS61ChnzZJRSViOpg
```

## Current Status

The authentication issue has been resolved, and the build process is now able to successfully download and install the Mapbox SDK. The CocoaPods installation completes without errors related to Mapbox authentication.

## Next Steps

1. Run an EAS build to create a production build of the app
2. Test the app on a physical device to ensure the Mapbox maps are loading correctly
3. Consider updating the React Native and Expo dependencies to ensure compatibility with the latest version of the Mapbox SDK

## References

- [Mapbox Downloads API Documentation](https://docs.mapbox.com/api/maps/mapbox-gl-js/)
- [React Native Mapbox GL Documentation](https://github.com/rnmapbox/maps)
- [Swift Package Manager Integration](https://github.com/mapbox/mapbox-maps-ios/blob/main/Documentation/SPM.md)
