#!/bin/bash

# Script to fix architecture issues with Expo and Mapbox on Apple Silicon Macs

echo "Starting architecture fix for Expo/Mapbox on Apple Silicon..."

# Clean up previous builds
echo "Cleaning up previous builds..."
rm -rf ios/build
rm -rf ios/Pods
rm -rf node_modules

# Install dependencies
echo "Installing dependencies..."
npm install

# Create a .xcode.env file to force arm64 architecture
echo "Creating .xcode.env file..."
cat > ios/.xcode.env << EOL
# This file contains the XCode build settings for React Native apps.
# It is used by the React Native CLI to generate the correct build settings.
# This file should be checked into Version Control Systems.

# Use legacy build system
export RCT_NEW_ARCH_ENABLED=0

# Force building for arm64 architecture
export EXCLUDED_ARCHS="i386 x86_64"
export ONLY_ACTIVE_ARCH=NO
EOL

# Create a post-install script for Podfile
echo "Creating post-install script..."
cat > ios/fix-architecture-podfile.rb << EOL
# This script fixes architecture issues in the Podfile
def fix_architecture_podfile(installer)
  puts "Setting build settings to support Apple Silicon..."
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Force arm64 for simulators
      config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'i386 x86_64'
      
      # Make sure we build for both architectures
      config.build_settings['ONLY_ACTIVE_ARCH'] = 'NO'
      
      # Set deployment target
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
    end
  end
end
EOL

# Update Podfile to include our post-install script
echo "Updating Podfile..."
sed -i '' '/post_install do |installer|/,/end/ s/post_install do |installer|/post_install do |installer|\n    require_relative ".\/fix-architecture-podfile.rb"\n    fix_architecture_podfile(installer)/' ios/Podfile

# Run pod install with specific architecture settings
echo "Running pod install..."
cd ios
arch -x86_64 pod install --repo-update
cd ..

echo "Architecture fix completed!"
echo "Now try running: npx expo run:ios"
