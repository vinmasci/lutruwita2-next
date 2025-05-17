#!/bin/bash

# This script adds all Swift files in the project to the Xcode project file

# Find all Swift files in the project
SWIFT_FILES=$(find . -name "*.swift" -not -path "./Pods/*" | sort)

# Create a temporary file
TEMP_FILE=$(mktemp)

# Add file references to the project.pbxproj file
echo "Adding file references to project.pbxproj..."

# First, let's create a backup of the project file
cp LutruwitaSwift.xcodeproj/project.pbxproj LutruwitaSwift.xcodeproj/project.pbxproj.bak

# Now, let's add the file references
for file in $SWIFT_FILES; do
    # Skip files that are already in the project
    if grep -q "$(basename "$file")" LutruwitaSwift.xcodeproj/project.pbxproj; then
        echo "Skipping $file (already in project)"
        continue
    fi
    
    # Generate a unique ID for the file reference
    FILE_REF_ID=$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | head -c 24)
    
    # Add the file reference
    echo "Adding $file with ID $FILE_REF_ID"
    
    # Add to PBXFileReference section
    sed -i '' "/\/\* Begin PBXFileReference section \*\//a\\
		$FILE_REF_ID /* $(basename "$file") */ = {isa = PBXFileReference; fileEncoding = 4; lastKnownFileType = sourcecode.swift; path = \"$(basename "$file")\"; sourceTree = \"<group>\"; };" LutruwitaSwift.xcodeproj/project.pbxproj
    
    # Add to PBXBuildFile section
    BUILD_FILE_ID=$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | head -c 24)
    sed -i '' "/\/\* Begin PBXBuildFile section \*\//a\\
		$BUILD_FILE_ID /* $(basename "$file") in Sources */ = {isa = PBXBuildFile; fileRef = $FILE_REF_ID /* $(basename "$file") */; };" LutruwitaSwift.xcodeproj/project.pbxproj
    
    # Add to Sources build phase
    sed -i '' "/\/\* Begin PBXSourcesBuildPhase section \*\//,/\/\* End PBXSourcesBuildPhase section \*\//s/files = (/files = (\n\t\t\t\t$BUILD_FILE_ID \/* $(basename "$file") in Sources *\/,/" LutruwitaSwift.xcodeproj/project.pbxproj
done

echo "Done! Project file updated."
