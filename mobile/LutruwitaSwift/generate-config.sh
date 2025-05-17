#!/bin/bash

# Lutruwita Swift Configuration Generator
# This script generates configuration files from environment variables

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Lutruwita Swift Configuration Generator ===${NC}"
echo -e "${BLUE}This script generates configuration files from environment variables${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found.${NC}"
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    
    if [ ! -f ".env.example" ]; then
        echo -e "${RED}Error: .env.example file not found.${NC}"
        echo -e "${YELLOW}Please create a .env file manually.${NC}"
        exit 1
    fi
    
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}Please edit the .env file with your API keys.${NC}"
    exit 0
fi

# Load environment variables
echo -e "${BLUE}Loading environment variables...${NC}"
export $(grep -v '^#' .env | xargs)
echo -e "${GREEN}✓ Environment variables loaded${NC}"

# Create Resources directory if it doesn't exist
if [ ! -d "Resources" ]; then
    echo -e "${BLUE}Creating Resources directory...${NC}"
    mkdir -p Resources
    echo -e "${GREEN}✓ Resources directory created${NC}"
fi

# Generate GoogleService-Info.plist
echo -e "${BLUE}Generating GoogleService-Info.plist...${NC}"
cat > Resources/GoogleService-Info.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CLIENT_ID</key>
	<string>${FIREBASE_CLIENT_ID}.apps.googleusercontent.com</string>
	<key>REVERSED_CLIENT_ID</key>
	<string>com.googleusercontent.apps.${FIREBASE_CLIENT_ID}</string>
	<key>API_KEY</key>
	<string>${FIREBASE_API_KEY}</string>
	<key>GCM_SENDER_ID</key>
	<string>${FIREBASE_MESSAGING_SENDER_ID}</string>
	<key>PLIST_VERSION</key>
	<string>1</string>
	<key>BUNDLE_ID</key>
	<string>${APP_BUNDLE_ID}</string>
	<key>PROJECT_ID</key>
	<string>${FIREBASE_PROJECT_ID}</string>
	<key>STORAGE_BUCKET</key>
	<string>${FIREBASE_STORAGE_BUCKET}</string>
	<key>IS_ADS_ENABLED</key>
	<false></false>
	<key>IS_ANALYTICS_ENABLED</key>
	<false></false>
	<key>IS_APPINVITE_ENABLED</key>
	<true></true>
	<key>IS_GCM_ENABLED</key>
	<true></true>
	<key>IS_SIGNIN_ENABLED</key>
	<true></true>
	<key>GOOGLE_APP_ID</key>
	<string>${FIREBASE_APP_ID}</string>
	<key>DATABASE_URL</key>
	<string>https://${FIREBASE_PROJECT_ID}.firebaseio.com</string>
</dict>
</plist>
EOF
echo -e "${GREEN}✓ GoogleService-Info.plist generated${NC}"

# Generate Auth0.plist
echo -e "${BLUE}Generating Auth0.plist...${NC}"
cat > Resources/Auth0.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>ClientId</key>
	<string>${AUTH0_CLIENT_ID}</string>
	<key>Domain</key>
	<string>${AUTH0_DOMAIN}</string>
</dict>
</plist>
EOF
echo -e "${GREEN}✓ Auth0.plist generated${NC}"

# Generate Mapbox-Info.plist
echo -e "${BLUE}Generating Mapbox-Info.plist...${NC}"
cat > Resources/Mapbox-Info.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>MGLMapboxAccessToken</key>
	<string>${MAPBOX_ACCESS_TOKEN}</string>
	<key>MGLMapboxMetricsEnabledSettingShownInApp</key>
	<true/>
</dict>
</plist>
EOF
echo -e "${GREEN}✓ Mapbox-Info.plist generated${NC}"

# Update Info.plist with app configuration
echo -e "${BLUE}Updating Info.plist...${NC}"
cat > Resources/Info.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>${APP_NAME}</string>
	<key>CFBundleExecutable</key>
	<string>\$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>${APP_BUNDLE_ID}</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>\$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>\$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>${APP_VERSION}</string>
	<key>CFBundleVersion</key>
	<string>${APP_BUILD}</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UIApplicationSceneManifest</key>
	<dict>
		<key>UIApplicationSupportsMultipleScenes</key>
		<false/>
		<key>UISceneConfigurations</key>
		<dict>
			<key>UIWindowSceneSessionRoleApplication</key>
			<array>
				<dict>
					<key>UISceneConfigurationName</key>
					<string>Default Configuration</string>
					<key>UISceneDelegateClassName</key>
					<string>\$(PRODUCT_MODULE_NAME).SceneDelegate</string>
				</dict>
			</array>
		</dict>
	</dict>
	<key>UIApplicationSupportsIndirectInputEvents</key>
	<true/>
	<key>UILaunchScreen</key>
	<dict/>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>armv7</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	
	<!-- Required permissions -->
	<key>NSLocationWhenInUseUsageDescription</key>
	<string>Lutruwita needs your location to show your position on the map and track your routes.</string>
	<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
	<string>Lutruwita needs your location to show your position on the map and track your routes, even when the app is in the background.</string>
	<key>NSLocationAlwaysUsageDescription</key>
	<string>Lutruwita needs your location to show your position on the map and track your routes, even when the app is in the background.</string>
	<key>NSCameraUsageDescription</key>
	<string>Lutruwita needs access to your camera to take photos for your routes.</string>
	<key>NSPhotoLibraryUsageDescription</key>
	<string>Lutruwita needs access to your photo library to add photos to your routes.</string>
	<key>NSPhotoLibraryAddUsageDescription</key>
	<string>Lutruwita needs permission to save photos to your photo library.</string>
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
	</dict>
	
	<!-- Auth0 configuration -->
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleTypeRole</key>
			<string>None</string>
			<key>CFBundleURLName</key>
			<string>auth0</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>${APP_BUNDLE_ID}</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
EOF
echo -e "${GREEN}✓ Info.plist updated${NC}"

echo ""
echo -e "${GREEN}=== Configuration Generation Complete ===${NC}"
echo -e "${GREEN}All configuration files have been generated.${NC}"
echo ""
echo -e "${YELLOW}If you need to update the configuration, edit the .env file and run this script again.${NC}"
