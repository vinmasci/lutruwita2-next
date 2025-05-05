#!/bin/bash

# Navigate to the iOS directory
cd ios

# Remove the Pods directory
rm -rf Pods

# Remove the Podfile.lock file
rm -f Podfile.lock

# Install pods
pod install

# Go back to the project root
cd ..

# Clean and rebuild the project
npx expo prebuild --clean --platform ios

echo "iOS project has been rebuilt successfully!"
