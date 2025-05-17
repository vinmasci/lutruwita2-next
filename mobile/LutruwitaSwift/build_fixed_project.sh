#!/bin/bash

# This script builds the project with all the fixes applied

cd "$(dirname "$0")"

echo "Building fixed project..."

# Clean the project first
echo "Cleaning the project..."
xcodebuild clean -workspace LutruwitaSwift.xcworkspace -scheme LutruwitaSwift -configuration Debug -destination "platform=iOS Simulator,name=iPhone 15"

# Build the project
echo "Building the project..."
xcodebuild build -workspace LutruwitaSwift.xcworkspace -scheme LutruwitaSwift -configuration Debug -destination "platform=iOS Simulator,name=iPhone 15" -verbose

echo "Build process completed."
