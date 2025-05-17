#!/bin/bash

# This script cleans and builds the Xcode project

# Change to the project directory
cd "$(dirname "$0")"

# Clean the project
echo "Cleaning the project..."
xcodebuild clean -workspace LutruwitaSwift.xcworkspace -scheme LutruwitaSwift -configuration Debug

# Build the project with verbose output
echo "Building the project..."
xcodebuild build -workspace LutruwitaSwift.xcworkspace -scheme LutruwitaSwift -configuration Debug -verbose

echo "Build process completed."
