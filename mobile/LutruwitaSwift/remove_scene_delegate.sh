#!/bin/bash

# This script removes the SceneDelegate.swift file from the Xcode project

cd "$(dirname "$0")"

# Create a backup of the project file
cp LutruwitaSwift.xcodeproj/project.pbxproj LutruwitaSwift.xcodeproj/project.pbxproj.scene.bak

echo "Removing SceneDelegate.swift from project..."

# Find the file reference ID for SceneDelegate.swift
scene_delegate_id=$(grep -o "[A-F0-9]\{24\} /\* SceneDelegate.swift \*/" LutruwitaSwift.xcodeproj/project.pbxproj | head -1 | cut -d' ' -f1)

if [ -z "$scene_delegate_id" ]; then
  echo "SceneDelegate.swift not found in project file"
  exit 0
fi

echo "Found SceneDelegate.swift with ID: $scene_delegate_id"

# Find the build file ID for SceneDelegate.swift
build_file_id=$(grep -o "[A-F0-9]\{24\} /\* SceneDelegate.swift in" LutruwitaSwift.xcodeproj/project.pbxproj | head -1 | cut -d' ' -f1)

# Create a temporary file for sed commands
temp_sed=$(mktemp)

# Remove the file reference
echo "s|$scene_delegate_id = {isa = PBXFileReference;.*SceneDelegate.swift.*};||g" >> "$temp_sed"

# Remove from PBXBuildFile section if found
if [ ! -z "$build_file_id" ]; then
  echo "s|$build_file_id = {isa = PBXBuildFile; fileRef = $scene_delegate_id;.*};||g" >> "$temp_sed"
fi

# Remove from PBXGroup sections
echo "s|$scene_delegate_id /\* SceneDelegate.swift \*/,||g" >> "$temp_sed"

# Remove from build phases
echo "s|$scene_delegate_id /\* SceneDelegate.swift in [A-Za-z]* \*/,||g" >> "$temp_sed"

# Apply all the sed commands at once
sed -i '' -f "$temp_sed" LutruwitaSwift.xcodeproj/project.pbxproj

# Fix any syntax errors in the project file (missing commas, etc.)
sed -i '' 's/,);/);/g' LutruwitaSwift.xcodeproj/project.pbxproj
sed -i '' 's/,,/,/g' LutruwitaSwift.xcodeproj/project.pbxproj

# Clean up
rm "$temp_sed"

echo "Removed SceneDelegate.swift from project"
echo "Backup saved as project.pbxproj.scene.bak"
