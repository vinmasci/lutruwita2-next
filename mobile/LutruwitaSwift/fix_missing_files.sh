#!/bin/bash

# This script removes references to missing files from the Xcode project

cd "$(dirname "$0")"

# Create a backup of the project file
cp LutruwitaSwift.xcodeproj/project.pbxproj LutruwitaSwift.xcodeproj/project.pbxproj.missing.bak

echo "Analyzing project file for missing files..."

# Extract all file references from the project file
temp_refs=$(mktemp)
grep -o '[A-F0-9]\{24\} /\* [^*]* \*/' LutruwitaSwift.xcodeproj/project.pbxproj > "$temp_refs"

# Create a temporary file for sed commands
temp_sed=$(mktemp)

# Process each file reference
while read -r ref_line; do
  # Extract the file ID and name
  file_id=$(echo "$ref_line" | cut -d' ' -f1)
  file_name=$(echo "$ref_line" | sed -n 's|.*/\* \(.*\) \*/|\1|p')
  
  # Skip references that don't look like files
  if [[ "$file_name" == *"."* ]]; then
    # Get the file path from the project file
    file_path_line=$(grep -A 5 "$file_id = {isa = PBXFileReference;" LutruwitaSwift.xcodeproj/project.pbxproj | grep "path = ")
    file_path=$(echo "$file_path_line" | sed -n 's|.*path = \(.*\);.*|\1|p' | tr -d ' "')
    
    # Determine the full path based on sourceTree
    full_path=""
    if [[ "$file_path_line" == *'sourceTree = "<group>"'* ]]; then
      # This is a relative path, need to find the group
      full_path="$file_path"  # Simplified for now
    elif [[ "$file_path_line" == *'sourceTree = "<absolute>"'* ]]; then
      # This is an absolute path
      full_path="$file_path"
    elif [[ "$file_path_line" == *'sourceTree = SOURCE_ROOT'* ]]; then
      # This is relative to the project root
      full_path="$(pwd)/$file_path"
    fi
    
    # Check if the file exists
    if [[ ! -z "$full_path" && ! -f "$full_path" ]]; then
      echo "Missing file: $file_name (path: $full_path)"
      
      # Remove the file reference
      echo "s|$file_id = {isa = PBXFileReference;.*path = $file_path;.*};||g" >> "$temp_sed"
      
      # Remove from PBXBuildFile section
      build_file_id=$(grep -o "[A-F0-9]\{24\} /\* $file_name in" LutruwitaSwift.xcodeproj/project.pbxproj | cut -d' ' -f1)
      if [[ ! -z "$build_file_id" ]]; then
        echo "s|$build_file_id = {isa = PBXBuildFile; fileRef = $file_id;.*};||g" >> "$temp_sed"
      fi
      
      # Remove from PBXGroup sections
      echo "s|$file_id /\* $file_name \*/,||g" >> "$temp_sed"
      
      # Remove from build phases
      echo "s|$file_id /\* $file_name in [A-Za-z]* \*/,||g" >> "$temp_sed"
    fi
  fi
done < "$temp_refs"

# Apply all the sed commands at once
if [ -s "$temp_sed" ]; then
  sed -i '' -f "$temp_sed" LutruwitaSwift.xcodeproj/project.pbxproj
  echo "Removed references to missing files"
else
  echo "No missing files found to remove"
fi

# Fix any syntax errors in the project file (missing commas, etc.)
echo "Fixing project file syntax..."
sed -i '' 's/,);/);/g' LutruwitaSwift.xcodeproj/project.pbxproj
sed -i '' 's/,,/,/g' LutruwitaSwift.xcodeproj/project.pbxproj

# Clean up
rm "$temp_refs" "$temp_sed"

echo "Project file cleanup complete"
echo "Backup saved as project.pbxproj.missing.bak"
