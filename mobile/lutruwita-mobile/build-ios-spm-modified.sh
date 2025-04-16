#!/bin/bash

# Modified script to build the iOS app with Swift Package Manager integration
# This script skips the Podfile update step to use our manually updated Podfile

set -e # Exit on error

echo "=== Lutruwita Mobile iOS Build with Swift Package Manager (Modified) ==="
echo "Starting build process..."

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
  echo "Error: Please run this script from the root of the Lutruwita Mobile project"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Set up Mapbox SPM configuration
echo "Setting up Mapbox SPM configuration..."

# Check if .netrc file exists
if [ -f "ios/.netrc" ]; then
  echo "Found .netrc file"
else
  echo "Creating .netrc file..."
  cat > ios/.netrc << EOF
machine api.mapbox.com
login mapbox
password sk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY205ZjcyNDRoMHcybjJqb2Fsd2p4NTFzZyJ9.RypRAeS61ChnzZJRSViOpg
EOF
  chmod 0600 ios/.netrc
fi

# Check if Package.swift file exists
if [ -f "ios/Package.swift" ]; then
  echo "Found Package.swift file"
else
  echo "Creating Package.swift file..."
  cat > ios/Package.swift << EOF
// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "LutruwitaMobile",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "LutruwitaMobile",
            targets: ["LutruwitaMobile"]
        )
    ],
    dependencies: [
        .package(
            name: "MapboxMaps",
            url: "https://github.com/mapbox/mapbox-maps-ios.git",
            from: "10.0.0"
        )
    ],
    targets: [
        .target(
            name: "LutruwitaMobile",
            dependencies: [
                .product(name: "MapboxMaps", package: "MapboxMaps")
            ],
            path: "."
        )
    ]
)
EOF
fi

echo "Mapbox SPM setup complete!"

# Clean and rebuild the project
echo "Cleaning previous builds..."
rm -rf ios/build

# Run Expo prebuild to generate native code
echo "Generating native code with Expo prebuild..."
npx expo prebuild --clean --platform ios

# Recreate the .netrc file after prebuild (since prebuild clears the ios directory)
echo "Recreating .netrc file after prebuild..."
cat > ios/.netrc << EOF
machine api.mapbox.com
login mapbox
password sk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY205ZjcyNDRoMHcybjJqb2Fsd2p4NTFzZyJ9.RypRAeS61ChnzZJRSViOpg
EOF
chmod 0600 ios/.netrc

# Recreate Package.swift file after prebuild
echo "Recreating Package.swift file after prebuild..."
cat > ios/Package.swift << EOF
// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "LutruwitaMobile",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "LutruwitaMobile",
            targets: ["LutruwitaMobile"]
        )
    ],
    dependencies: [
        .package(
            name: "MapboxMaps",
            url: "https://github.com/mapbox/mapbox-maps-ios.git",
            from: "10.0.0"
        )
    ],
    targets: [
        .target(
            name: "LutruwitaMobile",
            dependencies: [
                .product(name: "MapboxMaps", package: "MapboxMaps")
            ],
            path: "."
        )
    ]
)
EOF

# IMPORTANT: We're manually updating the Podfile here
echo "Manually updating Podfile..."
cat > ios/Podfile << EOF
require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")
require File.join(File.dirname(\`node --print "require.resolve('react-native/package.json')"\`), "scripts/react_native_pods")

require 'json'
podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}

ENV['RCT_NEW_ARCH_ENABLED'] = podfile_properties['newArchEnabled'] == 'true' ? '1' : '0'
ENV['EX_DEV_CLIENT_NETWORK_INSPECTOR'] = podfile_properties['EX_DEV_CLIENT_NETWORK_INSPECTOR']

platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'
install! 'cocoapods',
  :deterministic_uuids => false

prepare_react_native_project!

# @generated begin @rnmapbox/maps-rnmapboxmapsimpl - expo prebuild (DO NOT MODIFY) sync-4f4226cc423f8396e32c4af6491c268fb70b36b7
\$RNMapboxMapsDownloadToken = 'sk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY205ZjcyNDRoMHcybjJqb2Fsd2p4NTFzZyJ9.RypRAeS61ChnzZJRSViOpg'
\$RNMapboxMapsImpl = 'mapbox'
# @generated end @rnmapbox/maps-rnmapboxmapsimpl
target 'LutruwitaMobile' do
  use_expo_modules!

  if ENV['EXPO_USE_COMMUNITY_AUTOLINKING'] == '1'
    config_command = ['node', '-e', "process.argv=['', '', 'config'];require('@react-native-community/cli').run()"];
  else
    config_command = [
      'node',
      '--no-warnings',
      '--eval',
      'require(require.resolve(\\'expo-modules-autolinking\\', { paths: [require.resolve(\\'expo/package.json\\')] }))(process.argv.slice(1))',
      'react-native-config',
      '--json',
      '--platform',
      'ios'
    ]
  end

  config = use_native_modules!(config_command)

  use_frameworks!

  # Mapbox SPM Configuration
  pod "MapboxMaps", :modular_headers => true

# @generated begin pre_installer - expo prebuild (DO NOT MODIFY) sync-c8812095000d6054b846ce74840f0ffb540c2757
  pre_install do |installer|
# @generated begin @rnmapbox/maps-pre_installer - expo prebuild (DO NOT MODIFY) sync-ea4905840bf9fcea0acc62e92aa2e784f9d760f8
    \$RNMapboxMaps.pre_install(installer)
# @generated end @rnmapbox/maps-pre_installer
  end
# @generated end pre_installer
  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
    # An absolute path to your application root.
    :app_path => "#{Pod::Config.instance.installation_root}/..",
    :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
  )

  post_install do |installer|
# @generated begin @rnmapbox/maps-post_installer - expo prebuild (DO NOT MODIFY) sync-c4e8f90e96f6b6c6ea9241dd7b52ab5f57f7bf36
    \$RNMapboxMaps.post_install(installer)
# @generated end @rnmapbox/maps-post_installer
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => podfile_properties['apple.ccacheEnabled'] == 'true',
    )

    # This is necessary for Xcode 14, because it signs resource bundles by default
    # when building for devices.
    installer.target_installation_results.pod_target_installation_results
      .each do |pod_name, target_installation_result|
      target_installation_result.resource_bundle_targets.each do |resource_bundle_target|
        resource_bundle_target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        end
      end
    end
  end
end
EOF

# Copy .netrc to user's home directory for Xcode to use
cp ios/.netrc ~/.netrc
chmod 0600 ~/.netrc

# Build the iOS app directly to the connected device
echo "Building iOS app to connected device..."
npx expo run:ios --device

echo "=== Build process completed ==="
echo "If you encounter any issues, please check the documentation in docs/MAPBOX_SPM_INTEGRATION.md"

exit 0
