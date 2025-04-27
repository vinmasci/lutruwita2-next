# Mapbox Initial Location Fix

## Problem Description

The mobile app was experiencing an issue where the map would initially load showing Dubai (Mapbox's default location) before jumping to the correct location in Tasmania. This created a jarring user experience as users would briefly see an incorrect location before the map repositioned itself.

## Root Cause Analysis

After investigating the codebase, we identified several factors contributing to this issue:

1. **Default Mapbox Initialization Behavior**: When Mapbox GL is initialized, it briefly shows a default location (Dubai) before the app's code can set the correct location.

2. **Timing of Map Rendering vs. Data Loading**: The map view was being rendered before the route data was fully loaded and processed. The camera position was only updated after:
   - The map was ready (`mapReady` state is true)
   - The route details were loaded (`mapDetails` contains data)
   - The camera ref was available (`cameraRef.current` exists)

3. **Two-Step Camera Positioning**: The code had two different mechanisms for positioning the camera:
   - Initial props on the `<MapboxGL.Camera>` component
   - A subsequent `useEffect` that calls `fitBounds()` once data is loaded

## Solution Implemented

We implemented two key changes to fix the issue:

1. **Always Provide Initial Coordinates to Camera**: Modified the Camera component to always have a default center coordinate, even when using bounding box:

```typescript
<MapboxGL.Camera
  ref={cameraRef}
  zoomLevel={mapDetails.mapState?.zoom || 9}
  centerCoordinate={
    mapDetails.mapState?.center 
      ? ensureCorrectCoordinateOrder(mapDetails.mapState.center) 
      : ensureCorrectCoordinateOrder([146.8087, -41.4419])
  }
  // other props...
/>
```

2. **Loading Overlay**: Added a loading overlay that hides the map until it's properly positioned:
   - Added a new `mapPositioned` state variable to track when the map has been correctly positioned
   - Enhanced the camera positioning effect to set this state to true after positioning
   - Created a loading overlay that remains visible until both `mapReady` and `mapPositioned` are true

## Code Changes

The key changes were made in `mobile/lutruwita-mobile/src/screens/MapScreen.tsx`:

1. **Modified the Camera Component**: Changed the Camera component to always provide initial coordinates:

```typescript
<MapboxGL.Camera
  ref={cameraRef}
  zoomLevel={mapDetails.mapState?.zoom || 9}
  centerCoordinate={
    mapDetails.mapState?.center 
      ? ensureCorrectCoordinateOrder(mapDetails.mapState.center) 
      : ensureCorrectCoordinateOrder([146.8087, -41.4419])
  }
  pitch={is3DMode ? 60 : 0}
  animationDuration={0}
  maxZoomLevel={16}
  minZoomLevel={5}
/>
```

2. **Added a Loading Overlay**: Implemented a loading overlay to hide the map until it's properly positioned:

```typescript
// Added a new state variable
const [mapPositioned, setMapPositioned] = useState(false);

// Updated the camera positioning effect
useEffect(() => {
  if (mapReady && mapDetails?.boundingBox && cameraRef.current && !selectedPOI) {
    // Use the bounding box to fit the camera with corrected coordinates
    const correctedBoundingBox = ensureCorrectBoundingBox(mapDetails.boundingBox);
    
    // Fit the camera to the bounding box
    cameraRef.current.fitBounds(
      correctedBoundingBox[0],
      correctedBoundingBox[1],
      100, // padding
      0 // No animation for initial positioning
    );
    
    // Mark the map as positioned after a short delay
    setTimeout(() => {
      setMapPositioned(true);
      console.log('[MapScreen] Map positioned successfully');
    }, 100);
  }
}, [mapReady, mapDetails, selectedPOI]);

// Enhanced the loading overlay
{(!mapReady || !mapPositioned) && !mapError && (
  <View style={styles.loadingOverlay}>
    <ActivityIndicator size="large" color="#ffffff" />
    <Text style={styles.loadingText}>
      {!mapReady ? 'Loading map...' : 'Positioning map...'}
    </Text>
  </View>
)}
```

## Benefits

1. **Improved User Experience**: Users no longer see the map jumping from Dubai to Tasmania, creating a smoother experience.

2. **Better Loading Feedback**: The loading overlay now provides more specific feedback about what's happening (loading vs. positioning).

3. **No Visual Glitches**: The map is only revealed when it's fully ready and positioned correctly.

## Alternative Approaches Considered

1. **Always Provide Initial Coordinates**: Modify the Camera component to always have a default center coordinate, even when using bounding box.

2. **Initialize Mapbox with Default Options**: Modify how Mapbox is initialized to include default options for the center coordinates.

The loading overlay approach was chosen because it provides the best user experience by completely hiding the map until it's properly positioned, avoiding any visible "jumping" from Dubai to Tasmania.
