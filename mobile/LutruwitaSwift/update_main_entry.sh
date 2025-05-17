#!/bin/bash

# This script updates the main entry point in the Xcode project to use the SwiftUI app lifecycle

cd "$(dirname "$0")"

# Create a backup of the project file
cp LutruwitaSwift.xcodeproj/project.pbxproj LutruwitaSwift.xcodeproj/project.pbxproj.main.bak

echo "Updating main entry point in project..."

# Find the UIApplicationMain attribute in the project file
if grep -q "MAIN_STORYBOARD" LutruwitaSwift.xcodeproj/project.pbxproj; then
  # Remove the main storyboard setting
  sed -i '' 's/MAIN_STORYBOARD = .*/MAIN_STORYBOARD = "";/g' LutruwitaSwift.xcodeproj/project.pbxproj
  echo "Removed main storyboard setting"
fi

# Update the UIApplicationSceneManifest in the Info.plist
if grep -q "UIApplicationSceneManifest" LutruwitaSwift.xcodeproj/project.pbxproj; then
  # Remove the UIApplicationSceneManifest setting
  sed -i '' 's/UIApplicationSceneManifest.*/UIApplicationSceneManifest = "";/g' LutruwitaSwift.xcodeproj/project.pbxproj
  echo "Removed UIApplicationSceneManifest setting"
fi

# Update the UIMainStoryboardFile in the Info.plist
if grep -q "UIMainStoryboardFile" LutruwitaSwift.xcodeproj/project.pbxproj; then
  # Remove the UIMainStoryboardFile setting
  sed -i '' 's/UIMainStoryboardFile.*/UIMainStoryboardFile = "";/g' LutruwitaSwift.xcodeproj/project.pbxproj
  echo "Removed UIMainStoryboardFile setting"
fi

# Add the LutruwitaApp.swift file as the main entry point
if ! grep -q "SWIFT_EMIT_LOC_STRINGS" LutruwitaSwift.xcodeproj/project.pbxproj; then
  # Add the SWIFT_EMIT_LOC_STRINGS setting
  sed -i '' 's/PRODUCT_NAME = .*/PRODUCT_NAME = "$(TARGET_NAME)";\n\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;/g' LutruwitaSwift.xcodeproj/project.pbxproj
  echo "Added SWIFT_EMIT_LOC_STRINGS setting"
fi

echo "Updated main entry point in project"
echo "Backup saved as project.pbxproj.main.bak"
