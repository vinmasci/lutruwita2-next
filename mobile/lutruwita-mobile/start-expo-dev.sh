#!/bin/bash

# Script to start the Expo development server
# This will allow you to run the app on your physical device using Expo Go

set -e # Exit on error

echo "=== Starting Lutruwita Mobile Expo Development Server ==="

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

# Set up Mapbox configuration in .env file if it doesn't exist
if [ ! -f ".env" ]; then
  echo "Creating .env file..."
  cp .env.template .env
  echo "Please edit the .env file to add your Mapbox access token"
fi

# Start the Expo development server
echo "Starting Expo development server..."
echo "Please install the Expo Go app on your iPhone and scan the QR code that will appear"
echo "Make sure your phone is on the same WiFi network as your computer"
echo ""

# Set Safari as the default browser for Expo web
export EXPO_WEB_BROWSER="safari"
echo "Setting Safari as the default browser for Expo web"

npx expo start

exit 0
