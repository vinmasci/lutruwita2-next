# Mobile App Debugging Session

## Overview

This document summarizes the debugging session for the Lutruwita mobile app, focusing on resolving network connectivity issues and improving the map display in route cards.

## Issues Addressed

### 1. Network Request Failures

The app was experiencing `TypeError: Network request failed` errors when trying to fetch data from the API. This was occurring in the iOS simulator but not on real devices.

### 2. Map Display Issues

The fallback map component was showing a full test page with headers, footers, and spinners instead of just displaying the static map image.

## Solutions Implemented

### Network Connectivity

1. **Root Cause**: iOS simulators have known issues with certain network requests, particularly image loading. This is a documented issue in React Native.

2. **Solution**: Built and deployed the app to a real device in release mode, which:
   - Doesn't try to connect to the development server (localhost:8081)
   - Uses the production API URL from the .env file (https://lutruwita2-next.vercel.app)
   - Properly loads both the API data and the Mapbox maps

### Map Display

1. **Root Cause**: The fallback map component (`MinimalMapboxTest.tsx`) was designed as a test component with UI elements for debugging.

2. **Solution**: Created a clean static map component that only shows the map image:
   - Created `CleanStaticMap.tsx` that renders only the Mapbox static image
   - Updated `FallbackMapPreview.tsx` to use this new component
   - Removed all test UI elements (headers, footers, labels)
   - Eliminated unnecessary spinners once the image is loaded

## Testing Process

### Building and Testing on Real Device

1. **Create a Development Build**:
   ```bash
   cd mobile/lutruwita-mobile
   npx expo prebuild  # Creates the native iOS project
   ```

2. **Build and Install on Device**:
   ```bash
   cd mobile/lutruwita-mobile
   npx expo run:ios --configuration Release --device
   ```

3. **Code Signing Setup**:
   - Open the project in Xcode: `open ios/LutruwitaMobile.xcworkspace`
   - Sign in with your Apple ID in Xcode → Settings → Accounts
   - Set up automatic signing in the project settings
   - Select your team from the dropdown

4. **Testing on Device**:
   - The app should be automatically installed and launched on your device
   - Verify that the API connections work
   - Verify that the maps display correctly

## Mobile App File Structure

### Key Directories and Files

```
mobile/lutruwita-mobile/
├── .env                      # Environment variables (API URL, Mapbox token)
├── ios/                      # Native iOS project files
│   ├── Podfile               # iOS dependencies
│   ├── LutruwitaMobile/      # iOS app configuration
│   │   ├── Info.plist        # iOS app settings
├── src/                      # Source code
│   ├── App.tsx               # Main app component
│   ├── components/           # Reusable components
│   │   ├── map/              # Map-related components
│   │   │   ├── MapPreview.tsx             # Primary map component using native Mapbox
│   │   │   ├── FallbackMapPreview.tsx     # Fallback when native map fails
│   │   │   ├── CleanStaticMap.tsx         # Clean static map image component
│   │   │   ├── WebMapPreview.tsx          # WebView-based map (another fallback)
│   │   │   ├── MinimalMapboxTest.tsx      # Test component (not used in production)
│   │   │   └── SimpleStaticMap.tsx        # Another test component
│   ├── config/               # Configuration files
│   │   ├── mapbox.ts         # Mapbox configuration
│   ├── context/              # React context providers
│   ├── navigation/           # Navigation setup
│   ├── screens/              # App screens
│   ├── services/             # API services
│   │   ├── routeService.ts   # Service for fetching routes
│   ├── theme/                # Styling and theming
│   └── types/                # TypeScript type definitions
```

### Important Files

1. **`src/services/routeService.ts`**: Handles API requests to fetch route data
2. **`src/components/map/MapPreview.tsx`**: Primary map component using native Mapbox SDK
3. **`src/components/map/FallbackMapPreview.tsx`**: Fallback component when native maps fail
4. **`src/components/map/CleanStaticMap.tsx`**: New component for clean static map display
5. **`.env`**: Contains environment variables like API URL and Mapbox token

## Current Work

### In Progress

1. **Mobile App Stability**: Ensuring the app works reliably on real devices
2. **Map Display Optimization**: Improving the appearance and performance of maps in route cards
3. **API Integration**: Ensuring proper connectivity to the backend API

### Next Steps

1. **Testing**: Comprehensive testing on various devices and network conditions
2. **Performance Optimization**: Identify and address any performance bottlenecks
3. **UI Refinement**: Continue improving the user interface and experience

## Lessons Learned

1. **iOS Simulator Limitations**: The iOS simulator has known issues with certain network requests, particularly image loading. Testing on real devices is essential.

2. **Fallback Strategies**: Implementing proper fallback mechanisms (like static maps when native maps fail) improves app reliability.

3. **Clean Component Design**: Creating focused components that do one thing well (like `CleanStaticMap.tsx`) leads to better maintainability and user experience.
