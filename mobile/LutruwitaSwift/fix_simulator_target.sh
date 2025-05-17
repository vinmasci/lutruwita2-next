#!/bin/bash

# This script modifies the Xcode project to specifically target iOS Simulator

cd "$(dirname "$0")"

# Create a backup of the project file
cp LutruwitaSwift.xcodeproj/project.pbxproj LutruwitaSwift.xcodeproj/project.pbxproj.sim.bak

# Update the SDKROOT to use the iOS Simulator SDK
sed -i '' 's/SDKROOT = iphoneos;/SDKROOT = iphonesimulator;/g' LutruwitaSwift.xcodeproj/project.pbxproj

# Update the SUPPORTED_PLATFORMS to only include iOS Simulator
sed -i '' 's/SUPPORTED_PLATFORMS = "iphoneos iphonesimulator";/SUPPORTED_PLATFORMS = "iphonesimulator";/g' LutruwitaSwift.xcodeproj/project.pbxproj

# Set the TARGETED_DEVICE_FAMILY to iPhone and iPad
sed -i '' 's/TARGETED_DEVICE_FAMILY = "1,2";/TARGETED_DEVICE_FAMILY = "1,2";/g' LutruwitaSwift.xcodeproj/project.pbxproj

# Disable code signing
sed -i '' 's/CODE_SIGN_IDENTITY = ".*";/CODE_SIGN_IDENTITY = "";/g' LutruwitaSwift.xcodeproj/project.pbxproj
sed -i '' 's/DEVELOPMENT_TEAM = .*;/DEVELOPMENT_TEAM = "";/g' LutruwitaSwift.xcodeproj/project.pbxproj
sed -i '' 's/CODE_SIGN_STYLE = .*;/CODE_SIGN_STYLE = Manual;/g' LutruwitaSwift.xcodeproj/project.pbxproj
sed -i '' 's/PROVISIONING_PROFILE_SPECIFIER = .*;/PROVISIONING_PROFILE_SPECIFIER = "";/g' LutruwitaSwift.xcodeproj/project.pbxproj

# Add CODE_SIGNING_REQUIRED = NO
sed -i '' 's/ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = YES;/ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = YES;\n\t\t\t\tCODE_SIGNING_REQUIRED = NO;/g' LutruwitaSwift.xcodeproj/project.pbxproj

echo "Updated project to build specifically for iOS Simulator"
echo "Backup saved as project.pbxproj.sim.bak"
