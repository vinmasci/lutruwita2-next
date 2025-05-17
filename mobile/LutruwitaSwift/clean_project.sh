#!/bin/bash

# This script cleans the Xcode project

# Change to the project directory
cd "$(dirname "$0")"

# Clean the project
echo "Cleaning the project..."
xcodebuild clean -workspace LutruwitaSwift.xcworkspace -scheme LutruwitaSwift -configuration Debug

# Remove derived data
echo "Removing derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/LutruwitaSwift-*

echo "Clean process completed."
