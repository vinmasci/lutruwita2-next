#!/bin/bash

# Script to update Mapbox SDK to version 11.1.0

echo "Starting Mapbox SDK update process..."

# Clean up previous builds
echo "Cleaning up previous builds..."
rm -rf ios/build
rm -rf ios/Pods
rm -rf node_modules

# Install dependencies
echo "Installing dependencies..."
npm install

# Run pod install with architecture fix
echo "Running pod install with architecture fix..."
cd ios
arch -x86_64 pod install --repo-update
cd ..

echo "Mapbox SDK update completed!"
echo "Now try running: npx expo run:ios"
