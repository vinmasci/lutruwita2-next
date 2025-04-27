#!/bin/bash

# Script to upgrade Mapbox SDK to version 11.1.0 following the plan in docs/MAPBOX_UPGRADE_PLAN.md

echo "Starting Mapbox SDK upgrade process..."

# Step 1: Clean up previous builds
echo "Cleaning up previous builds..."
rm -rf ios/build
rm -rf ios/Pods
rm -rf node_modules

# Step 2: Update dependencies
echo "Updating dependencies..."
npm install @rnmapbox/maps@11.1.0 --save
npm install

# Step 3: Clean and rebuild with Expo
echo "Running expo prebuild --clean..."
npx expo prebuild --clean

# Step 4: Run pod install with architecture fix
echo "Running pod install with architecture fix..."
cd ios
arch -x86_64 pod install --repo-update
cd ..

echo "Mapbox SDK upgrade completed!"
echo "Now try running: npx expo run:ios"
