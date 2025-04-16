#!/bin/bash

# Script to build the iOS app with Swift Package Manager integration
# This script handles the entire build process for iOS with Mapbox SPM

set -e # Exit on error

echo "=== Lutruwita Mobile iOS Build with Swift Package Manager ==="
echo "Starting build process..."

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
  echo "Error: Please run this script from the root of the Lutruwita Mobile project"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Set up Mapbox SPM configuration
echo "Setting up Mapbox SPM configuration..."

# Check if .netrc file exists
if [ -f "ios/.netrc" ]; then
  echo "Found .netrc file"
else
  echo "Creating .netrc file..."
  cat > ios/.netrc << EOF
machine api.mapbox.com
login mapbox
password pk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY20xY3B1ZmdzMHp5eDJwcHBtMmptOG8zOSJ9.Ayn_YEjOCCqujIYhY9PiiA

machine api.mapbox.com
login mapbox
password sk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY205ZjcyNDRoMHcybjJqb2Fsd2p4NTFzZyJ9.RypRAeS61ChnzZJRSViOpg
EOF
  chmod 0600 ios/.netrc
fi

# Check if Package.swift file exists
if [ -f "ios/Package.swift" ]; then
  echo "Found Package.swift file"
else
  echo "Creating Package.swift file..."
  cat > ios/Package.swift << EOF
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
EOF
fi

# Update Podfile to use Swift Package Manager for Mapbox
if [ -f "ios/Podfile" ]; then
  echo "Updating Podfile to use Swift Package Manager for Mapbox..."
  
  # Check if Podfile already has Mapbox SPM configuration
  if grep -q "use_frameworks!" ios/Podfile && ! grep -q "# Mapbox SPM Configuration" ios/Podfile; then
    # Add Mapbox SPM configuration to Podfile
    sed -i '' 's/use_frameworks!/use_frameworks!\n\n  # Mapbox SPM Configuration\n  pod "MapboxMaps", :modular_headers => true/' ios/Podfile
  fi
fi

echo "Mapbox SPM setup complete!"

# Clean and rebuild the project
echo "Cleaning previous builds..."
rm -rf ios/build

# Run Expo prebuild to generate native code
echo "Generating native code with Expo prebuild..."
npx expo prebuild --clean --platform ios

# Recreate the .netrc file after prebuild (since prebuild clears the ios directory)
echo "Recreating .netrc file after prebuild..."
cat > ios/.netrc << EOF
machine api.mapbox.com
login mapbox
password pk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY20xY3B1ZmdzMHp5eDJwcHBtMmptOG8zOSJ9.Ayn_YEjOCCqujIYhY9PiiA

machine api.mapbox.com
login mapbox
password sk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY205ZjcyNDRoMHcybjJqb2Fsd2p4NTFzZyJ9.RypRAeS61ChnzZJRSViOpg
EOF
chmod 0600 ios/.netrc

# Recreate Package.swift file after prebuild
echo "Recreating Package.swift file after prebuild..."
cat > ios/Package.swift << EOF
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
EOF

# Update Podfile to use Swift Package Manager for Mapbox
if [ -f "ios/Podfile" ]; then
  echo "Updating Podfile to use Swift Package Manager for Mapbox..."
  
  # Check if Podfile already has Mapbox SPM configuration
  if grep -q "use_frameworks!" ios/Podfile && ! grep -q "# Mapbox SPM Configuration" ios/Podfile; then
    # Add Mapbox SPM configuration to Podfile
    sed -i '' 's/use_frameworks!/use_frameworks!\n\n  # Mapbox SPM Configuration\n  pod "MapboxMaps", :modular_headers => true/' ios/Podfile
  fi
fi

# Copy .netrc to user's home directory for Xcode to use
cp ios/.netrc ~/.netrc
chmod 0600 ~/.netrc

# Build the iOS app directly to the connected device
echo "Building iOS app to connected device..."
npx expo run:ios --device

echo "=== Build process completed ==="
echo "If you encounter any issues, please check the documentation in docs/MAPBOX_SPM_INTEGRATION.md"

exit 0
