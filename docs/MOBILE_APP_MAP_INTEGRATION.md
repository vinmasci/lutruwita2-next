# Lutruwita Mobile App: Native Map Integration Status

## Current Implementation Status

The Lutruwita mobile app is being developed using React Native with Expo and is designed to use the **native Mapbox implementation** (`@rnmapbox/maps`) for map rendering. This document outlines the current status, issues encountered, and next steps.

## Implementation Approach

We are using a **strictly native approach** with the following components:

1. **NativeMapView**: The core map component that uses the Mapbox GL Native SDK
2. **MapView**: A wrapper component that provides a consistent API for the app
3. **MapScreen**: The screen component that displays the map and route information

## Current Issues

When clicking on a route on the home page and opening it, the following issues are occurring:

1. **Loading and Blinking**: The map gets stuck on loading and blinks repeatedly
2. **UI Differences**: The map doesn't look like the PresentationMapView as it should
3. **Native SDK Integration**: There are issues with the Mapbox native SDK installation

### Detailed Analysis of Issues

After examining the code, I've identified several specific issues:

1. **Token Configuration Issues**:
   - The Podfile is using a variable syntax that might not be properly resolved: `$RNMapboxMapsDownloadToken = '${EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}'`
   - This could prevent the Mapbox SDK from authenticating properly

2. **Error Handling Limitations**:
   - The NativeMapView component doesn't have proper error handling for map loading failures
   - There's no fallback UI when the map fails to initialize

3. **Route Data Processing**:
   - The route data might not be in the correct format expected by the Mapbox native SDK
   - The component attempts to render routes before the map is fully initialized

4. **Native SDK Integration**:
   - The Mapbox native SDK requires additional configuration beyond what's currently set up
   - The development environment might not be properly configured for native module usage

## Attempted Solutions

We've tried several approaches to resolve these issues:

1. **Mapbox Token Configuration**: 
   - Updated the Mapbox access token in the `.env` file
   - Added the token to the `eas.json` configuration

2. **Native Build Configuration**: 
   - Modified the `eas.json` file to include the necessary build configuration
   - Added the Mapbox downloads token for native SDK access

3. **Podfile Modification**: 
   - Updated the Podfile to include the Mapbox token directly
   - Added the necessary hooks for Mapbox SDK integration

4. **Expo Prebuild**: 
   - Ran `npx expo prebuild --clean` to generate native code
   - Attempted to build the native modules directly

## Next Steps

To resolve the current issues, we need to:

1. **Fix Native SDK Integration**:
   - Update the Podfile to use a hardcoded token instead of the variable: `$RNMapboxMapsDownloadToken = 'pk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY20xY3B1ZmdzMHp5eDJwcHBtMmptOG8zOSJ9.Ayn_YEjOCCqujIYhY9PiiA'`
   - Ensure the Mapbox SDK is properly installed by running `npx expo prebuild --clean` followed by `npx expo run:ios` (or `android`)
   - Verify that the native modules are correctly linked by checking the build logs

2. **Improve Error Handling**:
   - Add try/catch blocks around map initialization code in NativeMapView
   - Implement a fallback UI when the map fails to load
   - Add loading indicators and timeout handling
   - Log detailed error information for debugging

3. **Enhance Route Data Processing**:
   - Ensure route data is in the correct format before passing to the map
   - Add validation for route data to prevent rendering issues
   - Implement a queue system to only add routes after the map is fully initialized
   - Add debug logging for route data processing

4. **UI Enhancements**:
   - Implement UI components similar to PresentationMapView
   - Add proper loading states and transitions
   - Ensure the map controls match the web app's design
   - Implement smooth animations for UI elements

5. **Performance Optimization**:
   - Reduce unnecessary re-renders in the map components
   - Implement proper memory management for map resources
   - Use React.memo and useCallback for performance-critical components
   - Add performance monitoring to identify bottlenecks

## Important Note

**DO NOT attempt to implement WebMapView or any WebView-based solution.** We are committed to using the native Mapbox implementation for better performance and user experience.

## Technical Details

### NativeMapView Component

The NativeMapView component (`src/components/map/NativeMapView.tsx`) is the core component that uses the Mapbox GL Native SDK:

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useTheme } from '../../theme';
import { useMap } from '../../context/MapContext';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES, MAP_CONFIG } from '../../config/mapbox';
import { RouteData } from '../../services/routeService';

// Initialize Mapbox with access token
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Set Mapbox configuration
MapboxGL.setConnected(true);
MapboxGL.setTelemetryEnabled(false);

// ... rest of the component
```

### MapView Component

The MapView component (`src/components/map/MapView.tsx`) is a wrapper that provides a consistent API:

```typescript
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute } from '../../context/RouteContext';
import NativeMapView from './NativeMapView';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../../config/mapbox';

// ... rest of the component
```

### MapScreen Component

The MapScreen component (`src/screens/MapScreen.tsx`) displays the map and route information:

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Text, Button, IconButton, Appbar, useTheme as usePaperTheme, ActivityIndicator, FAB, Surface, Divider, Chip } from 'react-native-paper';
import { useTheme } from '../theme';
import MapView from '../components/map/MapView';
import { useMap } from '../context/MapContext';
import { useRoute } from '../context/RouteContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ... rest of the component
```

## Conclusion

We are **firmly committed** to using the native Mapbox implementation for the mobile app. While there are currently some issues with the integration, we are working to resolve them and provide a high-quality map experience similar to the web app's PresentationMapView.

The native implementation offers significant advantages over WebView-based solutions:

1. **Superior Performance**: Native maps render more efficiently and handle large datasets better
2. **Better User Experience**: Native maps provide smoother interactions and animations
3. **Offline Capabilities**: Native implementation allows for robust offline map functionality
4. **Battery Efficiency**: Native maps consume less battery power than WebView solutions
5. **Integration with Device Features**: Better access to device capabilities like location services

**Under no circumstances should we revert to a WebView-based solution.** Our focus must remain on fixing the current issues with the native implementation to deliver the best possible user experience.
