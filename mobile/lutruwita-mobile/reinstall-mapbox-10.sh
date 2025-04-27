#!/bin/bash

# Script to reinstall Mapbox SDK 10.0.15

echo "Starting Mapbox SDK 10.0.15 reinstallation process..."

# Step 1: Clean up previous builds
echo "Cleaning up previous builds..."
rm -rf ios/build
rm -rf ios/Pods
rm -rf node_modules

# Step 2: Verify package.json has the correct version
echo "Verifying package.json..."
if ! grep -q '"@rnmapbox/maps": "\^10.0.15"' package.json; then
  echo "Updating package.json..."
  sed -i '' 's/"@rnmapbox\/maps": ".*"/"@rnmapbox\/maps": "^10.0.15"/g' package.json
fi

# Step 3: Verify app.json has the correct version
echo "Verifying app.json..."
if ! grep -q '"RNMapboxMapsVersion": "10.0.15"' app.json; then
  echo "Updating app.json..."
  sed -i '' 's/"RNMapboxMapsVersion": ".*"/"RNMapboxMapsVersion": "10.0.15"/g' app.json
fi

# Step 4: Verify Podfile has the correct version
echo "Verifying Podfile..."
if ! grep -q '$RNMapboxMapsVersion = '\''10.0.15'\''' ios/Podfile; then
  echo "Updating Podfile..."
  sed -i '' 's/$RNMapboxMapsVersion = '\''.*'\''/$RNMapboxMapsVersion = '\''10.0.15'\''/g' ios/Podfile
fi

# Step 5: Install dependencies
echo "Installing dependencies..."
npm install

# Step 6: Clean and rebuild with Expo
echo "Running expo prebuild --clean..."
npx expo prebuild --clean

# Step 7: Run pod install with architecture fix
echo "Running pod install with architecture fix..."
cd ios
arch -x86_64 pod install --repo-update
cd ..

echo "Mapbox SDK 10.0.15 reinstallation completed!"
echo "Now try running: npx expo run:ios"
