#!/bin/bash

# Script to install the latest version of Mapbox SDK 10.x

echo "Starting Mapbox SDK 10.x installation process..."

# Step 1: Clean up previous builds
echo "Cleaning up previous builds..."
rm -rf ios/build
rm -rf ios/Pods
rm -rf node_modules

# Step 2: Update dependencies
echo "Installing @rnmapbox/maps version 10.x..."
npm install @rnmapbox/maps@10.0.15 --save
npm install

# Step 3: Update app.json
echo "Updating app.json..."
sed -i '' 's/"RNMapboxMapsVersion": "11.1.0"/"RNMapboxMapsVersion": "10.0.15"/g' app.json

# Step 4: Update Podfile
echo "Updating Podfile..."
sed -i '' 's/$RNMapboxMapsVersion = '\''11.1.0'\''/$RNMapboxMapsVersion = '\''10.0.15'\''/g' ios/Podfile

# Step 5: Clean and rebuild with Expo
echo "Running expo prebuild --clean..."
npx expo prebuild --clean

# Step 6: Run pod install with architecture fix
echo "Running pod install with architecture fix..."
cd ios
arch -x86_64 pod install --repo-update
cd ..

echo "Mapbox SDK 10.x installation completed!"
echo "Now try running: npx expo run:ios"
