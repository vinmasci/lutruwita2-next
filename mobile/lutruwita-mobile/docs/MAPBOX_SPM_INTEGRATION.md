# Mapbox Swift Package Manager Integration

This document outlines the integration of Mapbox Maps SDK using Swift Package Manager (SPM) in the Lutruwita Mobile app.

## Overview

Mapbox officially recommends using Swift Package Manager for integrating the Maps SDK v10+ in iOS projects. This approach offers several advantages over CocoaPods:

- Faster build times
- Better integration with Xcode
- Simplified dependency management
- Official support from Mapbox

## Setup

The integration consists of several components:

1. **Package.swift**: Defines the Swift Package Manager configuration
2. **.netrc**: Contains authentication information for Mapbox SDK downloads
3. **setup-mapbox-spm.sh**: Script to set up the SPM configuration
4. **build-ios-spm.sh**: Script to build the app with SPM

### Authentication

Mapbox requires authentication for downloading the SDK. This is handled through a `.netrc` file in the `ios` directory. The file contains:

```
machine api.mapbox.com
login mapbox
password YOUR_MAPBOX_ACCESS_TOKEN

machine api.mapbox.com
login mapbox
password YOUR_MAPBOX_DOWNLOADS_TOKEN
```

The tokens are stored in the `.env` file:
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`: Public token for map rendering
- `MAPBOX_DOWNLOADS_TOKEN`: Secret token for downloading the SDK

### Package.swift

The `Package.swift` file in the `ios` directory defines the Swift Package Manager configuration:

```swift
// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "LutruwitaMobile",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "LutruwitaMobile",
            targets: ["LutruwitaMobile"]
        )
    ],
    dependencies: [
        .package(
            name: "MapboxMaps",
            url: "https://github.com/mapbox/mapbox-maps-ios.git",
            from: "10.16.0"
        )
    ],
    targets: [
        .target(
            name: "LutruwitaMobile",
            dependencies: [
                .product(name: "MapboxMaps", package: "MapboxMaps")
            ],
            path: "."
        )
    ]
)
```

### Podfile Modifications

While we're using SPM for Mapbox, other React Native dependencies still use CocoaPods. The Podfile is modified to use modular headers for Mapbox:

```ruby
use_frameworks!

# Mapbox SPM Configuration
pod "MapboxMaps", :modular_headers => true
```

## Building with SPM

To build the app with Swift Package Manager:

1. Run the setup script:
   ```bash
   cd ios
   ./setup-mapbox-spm.sh
   ```

2. Build the app:
   ```bash
   cd ..
   ./build-ios-spm.sh
   ```

Alternatively, you can use the npm script:
```bash
npm run ios:spm
```

## Troubleshooting

### Missing .netrc or Package.swift

If you encounter errors about missing `.netrc` or `Package.swift` files, run the setup script:

```bash
cd ios
./setup-mapbox-spm.sh
```

### Authentication Errors

If you see authentication errors when downloading the Mapbox SDK:

1. Check that your tokens in the `.env` file are correct
2. Ensure the `.netrc` file has the correct format and permissions
3. Try copying the `.netrc` file to your home directory:
   ```bash
   cp ios/.netrc ~/.netrc
   chmod 0600 ~/.netrc
   ```

### Build Errors

If you encounter build errors:

1. Clean the build directory:
   ```bash
   rm -rf ios/build
   ```

2. Regenerate the native code:
   ```bash
   npx expo prebuild --clean --platform ios
   ```

3. Run the setup script again:
   ```bash
   cd ios
   ./setup-mapbox-spm.sh
   ```

## References

- [Mapbox Maps SDK for iOS](https://docs.mapbox.com/ios/maps/guides/)
- [Swift Package Manager Documentation](https://www.swift.org/package-manager/)
- [Expo Documentation](https://docs.expo.dev/)
