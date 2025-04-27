#!/bin/bash

# Script to rebuild the project with the new Mapbox SDK version

echo "Starting Mapbox SDK upgrade rebuild process..."

# Clean the project
echo "Cleaning the project..."
npx expo prebuild --clean

# Install dependencies
echo "Installing dependencies..."
npm install

# Rebuild for iOS
echo "Rebuilding for iOS..."
npx expo run:ios

# Rebuild for Android
echo "Rebuilding for Android..."
npx expo run:android

echo "Mapbox SDK upgrade rebuild process completed!"
