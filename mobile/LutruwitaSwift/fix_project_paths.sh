#!/bin/bash

# This script fixes the incorrect file paths in the Xcode project file
# It replaces '/Users/vincentmasci/Desktop/lutruwita2-next/mobile/LutruwitaSwift/' with the correct relative paths

cd "$(dirname "$0")"

# Create a backup of the project file
cp LutruwitaSwift.xcodeproj/project.pbxproj LutruwitaSwift.xcodeproj/project.pbxproj.bak

# Replace the incorrect absolute paths with the correct relative paths
sed -i '' 's|/Users/vincentmasci/Desktop/lutruwita2-next/mobile/LutruwitaSwift/|$(SRCROOT)/|g' LutruwitaSwift.xcodeproj/project.pbxproj

echo "Fixed incorrect paths in project.pbxproj"
echo "Backup saved as project.pbxproj.bak"
