#!/bin/bash

# Script to fix the Mapbox version issue

echo "Starting Mapbox version fix process..."

# Clean the project
echo "Cleaning the project..."
npx expo prebuild --clean

# Install dependencies
echo "Installing dependencies..."
npm install

# Rebuild for iOS
echo "Rebuilding for iOS..."
npx expo run:ios

echo "Mapbox version fix process completed!"
echo "The app should now use @rnmapbox/maps version 11.8.0 as specified in app.json"
