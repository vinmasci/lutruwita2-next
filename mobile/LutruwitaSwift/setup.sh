#!/bin/bash

# Lutruwita Swift Setup Script
# This script sets up the Lutruwita Swift project and installs dependencies

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Lutruwita Swift Setup ===${NC}"
echo -e "${BLUE}This script will set up the Lutruwita Swift project and install dependencies${NC}"
echo ""

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}Error: Xcode is not installed.${NC}"
    echo -e "${YELLOW}Please install Xcode from the App Store and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Xcode is installed${NC}"

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo -e "${YELLOW}CocoaPods is not installed. Installing...${NC}"
    sudo gem install cocoapods
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to install CocoaPods.${NC}"
        echo -e "${YELLOW}Please install CocoaPods manually and try again.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ CocoaPods is installed${NC}"
fi

# Check if the Podfile exists
if [ ! -f "Podfile" ]; then
    echo -e "${RED}Error: Podfile not found.${NC}"
    echo -e "${YELLOW}Please make sure you're running this script from the project root directory.${NC}"
    exit 1
fi

# Install CocoaPods dependencies
echo -e "${BLUE}Installing CocoaPods dependencies...${NC}"
pod install
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to install CocoaPods dependencies.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ CocoaPods dependencies installed${NC}"

# Check if configuration files exist
echo -e "${BLUE}Checking configuration files...${NC}"
CONFIG_FILES=("Resources/GoogleService-Info.plist" "Resources/Auth0.plist" "Resources/Mapbox-Info.plist")
MISSING_FILES=()

for file in "${CONFIG_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${YELLOW}Warning: The following configuration files are missing:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo -e "${YELLOW}- $file${NC}"
    done
    echo -e "${YELLOW}You will need to add these files with your API keys before running the app.${NC}"
else
    echo -e "${GREEN}✓ All configuration files found${NC}"
fi

# Check if API keys are set
echo -e "${BLUE}Checking API keys...${NC}"
API_KEYS_SET=true

if [ -f "Resources/GoogleService-Info.plist" ]; then
    if grep -q "YOUR_" "Resources/GoogleService-Info.plist"; then
        echo -e "${YELLOW}Warning: Firebase API keys are not set in GoogleService-Info.plist${NC}"
        API_KEYS_SET=false
    fi
fi

if [ -f "Resources/Auth0.plist" ]; then
    if grep -q "YOUR_" "Resources/Auth0.plist"; then
        echo -e "${YELLOW}Warning: Auth0 API keys are not set in Auth0.plist${NC}"
        API_KEYS_SET=false
    fi
fi

if [ -f "Resources/Mapbox-Info.plist" ]; then
    if grep -q "YOUR_" "Resources/Mapbox-Info.plist"; then
        echo -e "${YELLOW}Warning: Mapbox API keys are not set in Mapbox-Info.plist${NC}"
        API_KEYS_SET=false
    fi
fi

if [ "$API_KEYS_SET" = true ]; then
    echo -e "${GREEN}✓ All API keys are set${NC}"
else
    echo -e "${YELLOW}You will need to set your API keys in the configuration files before running the app.${NC}"
fi

# Open the workspace
echo -e "${BLUE}Opening the workspace...${NC}"
open LutruwitaSwift.xcworkspace
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Failed to open the workspace. You can open it manually.${NC}"
fi

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo -e "${GREEN}You can now build and run the project in Xcode.${NC}"
echo ""
echo -e "${YELLOW}If you encounter any issues, please check the README.md file for troubleshooting tips.${NC}"
