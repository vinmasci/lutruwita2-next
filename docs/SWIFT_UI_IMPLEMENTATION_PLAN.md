# Swift UI Implementation Plan

## Introduction

### Project Overview

CyaTrails is a mobile application designed for outdoor enthusiasts, particularly focused on hiking, bikepacking, and tourism routes in Australia and New Zealand. The app allows users to discover, view, and save trails, complete with detailed information such as elevation profiles, points of interest, and photos. Users can filter routes based on various criteria like location, distance, and route type.

The application was originally developed using React Native with a MongoDB backend. However, to improve performance, maintainability, and native integration, the project is now transitioning to a Swift-based iOS application with Firebase as the backend database service. This architectural shift aims to provide a more seamless user experience while leveraging native iOS capabilities.

### Current State

The Swift version of CyaTrails has already implemented several core components:

1. **Firebase Integration**: The app can connect to Firebase and fetch route data.
2. **Map Display**: The main map view shows route markers using MapboxGL.
3. **Basic Filtering**: Users can filter routes by type, country, and other criteria.
4. **Data Models**: Swift models for routes, POIs, photos, and other entities have been created.

However, the Swift app is missing several key UI components that were present in the React Native version, particularly the interactive elements that enhance user experience, such as route preview drawers, route detail views, and list drawers.

### Purpose of This Document

This implementation plan serves as a comprehensive guide for developers (or AI assistants) who need to implement the missing UI components from the React Native app in the new Swift app. It provides:

1. **Context**: Understanding of what has been built and what needs to be built
2. **Reference Files**: Links to both the original React Native components and the existing Swift files
3. **Component Specifications**: Detailed descriptions of each component that needs to be implemented
4. **Step-by-Step Plan**: A logical sequence for implementing the components
5. **Testing Criteria**: Guidelines for testing each component after implementation

The goal is to ensure that anyone working on this project, even without prior knowledge of CyaTrails, can understand what needs to be done and how to do it.

### Implementation Goals

The primary goal is to replicate the user experience from the React Native app in the Swift app, ensuring that all functionality is preserved while taking advantage of Swift and iOS capabilities. Specifically, we aim to:

1. Implement all missing UI components with the same look and feel as the React Native app
2. Ensure smooth transitions and animations between views
3. Maintain feature parity with the React Native app
4. Optimize performance for iOS devices
5. Implement a saved routes feature that persists user preferences
6. Test each component thoroughly to ensure it works as expected

This document outlines the plan for implementing UI components from the React Native app in the Swift app. The goal is to replicate the UI, route details page, drawers, and other components from the React Native implementation to the new Swift and Firebase approach.

## Reference Files

### React Native Implementation

#### Core Components
- [HomeScreen.tsx](mobile/lutruwita-mobile/src/screens/HomeScreen.tsx) - Main landing page with map view and route markers
- [RoutePreviewDrawer.tsx](mobile/lutruwita-mobile/src/components/map/RoutePreviewDrawer.tsx) - Drawer for route previews
- [RouteListDrawer.tsx](mobile/lutruwita-mobile/src/components/map/RouteListDrawer.tsx) - Drawer for listing routes
- [FilterDrawer.tsx](mobile/lutruwita-mobile/src/components/filters/FilterDrawer.tsx) - Drawer for filtering routes
- [MapTypeSelector.tsx](mobile/lutruwita-mobile/src/components/filters/MapTypeSelector.tsx) - Selector for map types

### Swift Implementation

#### Existing Components
- [HomeView.swift](mobile/CyaTrails/CyaTrails/Views/HomeView.swift) - Main landing page with map view
- [FilterView.swift](mobile/CyaTrails/CyaTrails/Views/FilterView.swift) - Sheet for filtering routes
- [RouteListViewModel.swift](mobile/CyaTrails/CyaTrails/ViewModels/RouteListViewModel.swift) - View model for route listing
- [FirebaseService.swift](mobile/CyaTrails/CyaTrails/Services/FirebaseService.swift) - Service for Firebase operations
- [RouteModels.swift](mobile/CyaTrails/CyaTrails/Models/RouteModels.swift) - Data models for routes

## Components to Implement

1. **RoutePreviewDrawer**
   - Bottom sheet that appears when a route marker is tapped
   - Shows route name, location, distance, elevation stats
   - Displays photo carousel if the route has photos
   - Provides "Save" and "View Route" buttons
   - Supports swipe down to dismiss

2. **RouteListDrawer**
   - Bottom sheet that appears when the route count indicator is tapped
   - Lists all visible routes with thumbnails, names, locations, and stats
   - Supports tapping a route to navigate to route details
   - Includes a close button to dismiss

3. **RouteDetailView**
   - Full-screen view showing detailed information about a route
   - Displays map with the full route polyline
   - Shows POI markers and photo markers
   - Includes elevation profile
   - Provides route description and metadata
   - Offers navigation controls

4. **SavedRoutesService**
   - Service for saving and retrieving saved routes
   - Persists user preferences for saved routes
   - Provides methods for checking if a route is saved

## Implementation Steps

### Step 1: Implement RouteListDrawer ✅

This drawer provides a way to browse all visible routes.

1. ✅ Create `RouteListDrawer.swift`
2. ✅ Implement sliding animation for the drawer
3. ✅ Display list of routes with thumbnails, names, locations, and stats
4. ✅ Add tap handling to navigate to route details
5. ✅ Implement close button
6. ✅ Update `HomeView.swift` to show the drawer when the route count indicator is tapped

**Testing:**
- ✅ Tap the route count indicator and verify the drawer appears
- ✅ Check that routes are listed correctly
- ✅ Tap a route and verify navigation to route details works
- ✅ Test close button functionality

### Step 2: Implement RoutePreviewDrawer ✅

This drawer appears when a user taps a route marker on the map.

1. ✅ Create `RoutePreviewDrawer.swift`
2. ✅ Implement sliding animation for the drawer
3. ✅ Display route information (name, location, distance, elevation)
4. ✅ Add "View Details" button
5. ✅ Implement swipe down to dismiss
6. ✅ Update `HomeView.swift` to show the drawer when a route marker is tapped

**Testing:**
- ✅ Tap a route marker on the map and verify the drawer appears
- ✅ Check that route information is displayed correctly
- ✅ Test "View Details" button functionality
- ✅ Test swipe down to dismiss

**Implementation Notes:**
- Created a shared `UIHelpers.swift` file for common UI extensions like corner radius and border styling
- Implemented proper error handling for model compatibility
- Ensured consistent styling between RouteListDrawer and RoutePreviewDrawer

### Step 3: Implement RouteDetailView

This view shows detailed information about a route when a user taps "View Route" in the preview drawer or selects a route from the list drawer.

1. Create `RouteDetailViewModel.swift`
2. Create `RouteDetailView.swift`
3. Implement map view with route polyline
4. Add POI markers and photo markers
5. Create elevation profile component
6. Display route description and metadata
7. Add navigation controls
8. Update both `RoutePreviewDrawer.swift` and `RouteListDrawer.swift` to navigate to this view when a route is selected

**Testing:**
- Tap "View Route" in the preview drawer and verify the detail view appears
- Select a route from the list drawer and verify the detail view appears
- Check that the map shows the route polyline correctly
- Verify POI markers and photo markers are displayed
- Test elevation profile functionality
- Verify route description and metadata are displayed correctly

### Step 4: Implement SavedRoutesService

This service is needed for the "Save" button in the RoutePreviewDrawer to work properly.

1. Create `SavedRoutesService.swift`
2. Implement methods for saving and unsaving routes
3. Add methods for checking if a route is saved
4. Use UserDefaults or another persistence mechanism to store saved route IDs
5. Update `RoutePreviewDrawer.swift` to use the service

**Testing:**
- Save a route and verify it's marked as saved
- Unsave a route and verify it's no longer marked as saved
- Restart the app and verify saved routes persist

### Step 5: Update HomeView

Update the HomeView to integrate all the new components.

1. Add state variables for selected route and showing route list
2. Update UI to include route count indicator
3. Add handling for route marker taps to show RoutePreviewDrawer
4. Add handling for route count indicator taps to show RouteListDrawer
5. Implement navigation to RouteDetailView

**Testing:**
- Verify all UI elements are displayed correctly
- Test route marker taps to show preview drawer
- Test route count indicator taps to show list drawer
- Verify navigation between views works correctly

### Step 6: Polish and Refinements

Final polish and refinements to ensure the UI matches the React Native implementation as closely as possible.

1. Update styling to match React Native implementation
2. Add animations and transitions
3. Implement error handling and loading states
4. Add accessibility support
5. Optimize performance

**Testing:**
- Compare UI with React Native implementation
- Verify animations and transitions work smoothly
- Test error handling and loading states
- Check accessibility support
- Measure and optimize performance

## Testing Strategy

After implementing each feature, we will test it thoroughly to ensure it works as expected. This includes:

1. **Functional Testing**
   - Verify all UI elements are displayed correctly
   - Test all interactions (taps, swipes, etc.)
   - Check navigation between views

2. **Integration Testing**
   - Verify components work together correctly
   - Test data flow between components

3. **Regression Testing**
   - Ensure existing functionality continues to work
   - Verify no new bugs are introduced

4. **Visual Testing**
   - Compare UI with React Native implementation
   - Verify styling matches

5. **Performance Testing**
   - Measure and optimize performance
   - Ensure smooth animations and transitions

## Conclusion

By following this implementation plan, we will be able to replicate the UI, route details page, drawers, and other components from the React Native implementation to the new Swift and Firebase approach. The plan is structured to allow for testing after each step, ensuring that each feature works correctly before moving on to the next one.

As requested, we will focus on implementing the three core components in this specific order:
1. Route List Drawer
2. Route Preview Drawer
3. Route Details Page (with all features including elevation profile)

Once these components are working correctly, we will proceed with implementing the SavedRoutesService and any remaining features.
