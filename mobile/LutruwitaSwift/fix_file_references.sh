#!/bin/bash

# This script removes incorrect file references from the Xcode project file

cd "$(dirname "$0")"

# Create a backup of the project file
cp LutruwitaSwift.xcodeproj/project.pbxproj LutruwitaSwift.xcodeproj/project.pbxproj.refs.bak

# Get the list of files that don't exist
echo "Identifying incorrect file references..."
missing_files=$(grep -o '"/Users/vincentmasci/Desktop/lutruwita2-next/mobile/LutruwitaSwift/[^"]*\.swift"' LutruwitaSwift.xcodeproj/project.pbxproj | sort | uniq)

# Count the number of missing files
missing_count=$(echo "$missing_files" | wc -l)
echo "Found $missing_count potentially incorrect file references"

# Create a temporary file for sed commands
temp_file=$(mktemp)

# Generate sed commands to remove file references and their associated build file references
for file in $missing_files; do
  # Extract the filename without path
  filename=$(basename "$file" | sed 's/"//g')
  
  # Check if the file actually exists
  if [ ! -f "${file//\"/}" ]; then
    # Get the file reference ID (format: XXXXXXXXXXXXXXXXXXXXXXXX /* filename.swift */)
    file_ref_id=$(grep -o "[A-F0-9]\{24\} /\* $filename \*/" LutruwitaSwift.xcodeproj/project.pbxproj)
    
    if [ ! -z "$file_ref_id" ]; then
      # Remove the file reference line
      echo "s|$file_ref_id = {isa = PBXFileReference; fileEncoding = [0-9]*; lastKnownFileType = sourcecode.swift; path = $filename; sourceTree = \"<group>\"; };||g" >> "$temp_file"
      
      # Remove the file from build phases
      echo "s|$file_ref_id /\* $filename in [A-Za-z]* \*/,||g" >> "$temp_file"
      
      # Remove the file from PBXGroup
      echo "s|$file_ref_id /\* $filename \*/,||g" >> "$temp_file"
      
      echo "Removing reference to $filename"
    fi
  fi
done

# Apply all the sed commands at once
if [ -s "$temp_file" ]; then
  sed -i '' -f "$temp_file" LutruwitaSwift.xcodeproj/project.pbxproj
  echo "Removed incorrect file references from project file"
else
  echo "No incorrect file references found to remove"
fi

# Clean up
rm "$temp_file"

# Fix any syntax errors in the project file (missing commas, etc.)
echo "Fixing project file syntax..."
sed -i '' 's/,);/);/g' LutruwitaSwift.xcodeproj/project.pbxproj
sed -i '' 's/,,/,/g' LutruwitaSwift.xcodeproj/project.pbxproj

echo "Project file cleanup complete"
echo "Backup saved as project.pbxproj.refs.bak"
