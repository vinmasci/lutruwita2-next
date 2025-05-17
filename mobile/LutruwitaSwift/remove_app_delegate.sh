#!/bin/bash

# This script removes the AppDelegate.swift file from the Xcode project

cd "$(dirname "$0")"

# Create a backup of the project file
cp LutruwitaSwift.xcodeproj/project.pbxproj LutruwitaSwift.xcodeproj/project.pbxproj.appdelegate.bak

echo "Removing AppDelegate.swift from project..."

# Find the file reference ID for AppDelegate.swift
app_delegate_id=$(grep -o "[A-F0-9]\{24\} /\* AppDelegate.swift \*/" LutruwitaSwift.xcodeproj/project.pbxproj | head -1 | cut -d' ' -f1)

if [ -z "$app_delegate_id" ]; then
  echo "AppDelegate.swift not found in project file"
  exit 0
fi

echo "Found AppDelegate.swift with ID: $app_delegate_id"

# Find the build file ID for AppDelegate.swift
build_file_id=$(grep -o "[A-F0-9]\{24\} /\* AppDelegate.swift in" LutruwitaSwift.xcodeproj/project.pbxproj | head -1 | cut -d' ' -f1)

# Create a temporary file for sed commands
temp_sed=$(mktemp)

# Remove the file reference
echo "s|$app_delegate_id = {isa = PBXFileReference;.*AppDelegate.swift.*};||g" >> "$temp_sed"

# Remove from PBXBuildFile section if found
if [ ! -z "$build_file_id" ]; then
  echo "s|$build_file_id = {isa = PBXBuildFile; fileRef = $app_delegate_id;.*};||g" >> "$temp_sed"
fi

# Remove from PBXGroup sections
echo "s|$app_delegate_id /\* AppDelegate.swift \*/,||g" >> "$temp_sed"

# Remove from build phases
echo "s|$app_delegate_id /\* AppDelegate.swift in [A-Za-z]* \*/,||g" >> "$temp_sed"

# Apply all the sed commands at once
sed -i '' -f "$temp_sed" LutruwitaSwift.xcodeproj/project.pbxproj

# Fix any syntax errors in the project file (missing commas, etc.)
sed -i '' 's/,);/);/g' LutruwitaSwift.xcodeproj/project.pbxproj
sed -i '' 's/,,/,/g' LutruwitaSwift.xcodeproj/project.pbxproj

# Clean up
rm "$temp_sed"

echo "Removed AppDelegate.swift from project"
echo "Backup saved as project.pbxproj.appdelegate.bak"
