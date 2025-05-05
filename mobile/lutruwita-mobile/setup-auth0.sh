#!/bin/bash

# This script sets up Auth0 for the Expo app by running the prebuild command
# and then installing the pods for iOS

echo "Setting up Auth0 for the Expo app..."

# Run the prebuild command to generate the native code with Auth0 configuration
echo "Running expo prebuild..."
npx expo prebuild --clean

# For iOS, install the pods
if [ -d "ios" ]; then
  echo "Installing pods for iOS..."
  cd ios
  pod install
  cd ..
fi

echo "Auth0 setup complete!"
echo ""
echo "IMPORTANT: You need to configure the callback URLs in your Auth0 dashboard:"
echo "iOS: com.lutruwita.mobile.auth0://dev-8jmwfh4hugvdjwh8.au.auth0.com/ios/com.lutruwita.mobile/callback"
echo "Android: com.lutruwita.mobile.auth0://dev-8jmwfh4hugvdjwh8.au.auth0.com/android/com.lutruwita.mobile/callback"
echo ""
echo "After configuring the callback URLs, you can run the app with:"
echo "npx expo run:ios  # For iOS"
echo "npx expo run:android  # For Android"
