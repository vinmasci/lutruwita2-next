#!/bin/bash

# This script modifies the Xcode project to build for iOS Simulator instead of macOS

cd "$(dirname "$0")"

# Create a backup of the project file
cp LutruwitaSwift.xcodeproj/project.pbxproj LutruwitaSwift.xcodeproj/project.pbxproj.target.bak

# Update the SDKROOT to use the iOS Simulator SDK
sed -i '' 's/SDKROOT = macosx;/SDKROOT = iphoneos;/g' LutruwitaSwift.xcodeproj/project.pbxproj

# Update the SUPPORTED_PLATFORMS to include iOS Simulator
sed -i '' 's/SUPPORTED_PLATFORMS = "macosx iphoneos iphonesimulator";/SUPPORTED_PLATFORMS = "iphoneos iphonesimulator";/g' LutruwitaSwift.xcodeproj/project.pbxproj

# Set the TARGETED_DEVICE_FAMILY to iPhone and iPad
sed -i '' 's/TARGETED_DEVICE_FAMILY = "1,2,6";/TARGETED_DEVICE_FAMILY = "1,2";/g' LutruwitaSwift.xcodeproj/project.pbxproj

echo "Updated project to build for iOS Simulator"
echo "Backup saved as project.pbxproj.target.bak"
