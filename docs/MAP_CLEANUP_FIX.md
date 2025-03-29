# Map Cleanup Fix

## Issue

We were experiencing an error when navigating between pages with maps:

```
[Error] TypeError: undefined is not an object (evaluating 'this.style.getOwnLayer') — map.ts:3263
```

This error occurs when a Mapbox GL map instance is not properly cleaned up before navigating to another page. The error is particularly common when using the navbar links to navigate between pages.

## Root Cause

The root cause of the issue is that the map instance is not fully removed from the DOM before a new map is initialized. This happens because:

1. React's component unmounting and the browser's navigation happen asynchronously
2. Mapbox GL's internal cleanup process may not complete before a new map is initialized
3. Some map resources (like WebGL contexts) may still be in use when a new map is created

## Solution

We implemented a two-part solution to address this issue:

### 1. Enhanced Map Cleanup

We created a utility function in `src/features/map/utils/mapCleanup.js` that properly cleans up map resources:

- Removes all sources and layers
- Removes all event listeners
- Removes all controls
- Waits for the next animation frame before removing the map
- Returns a promise that resolves when cleanup is complete

### 2. Delayed Navigation

We created navigation utility functions in `src/utils/navigationUtils.js` that add a small delay before navigation:

- `safeNavigate`: A wrapper around the React Router `navigate` function that adds a delay
- `withNavigationDelay`: A higher-order function that wraps click handlers to add a delay

The delay gives the map cleanup process time to complete before a new map is initialized.

## Implementation Details

### Files Modified

1. `src/features/map/utils/mapCleanup.js` (new file)
   - Added `safelyRemoveMap` function to properly clean up map resources

2. `src/utils/navigationUtils.js` (new file)
   - Added `safeNavigate` and `withNavigationDelay` functions for delayed navigation

3. `src/features/map/components/MapHeader/MapHeader.js`
   - Updated navigation links to use `withNavigationDelay`

4. `src/features/presentation/components/LandingPage/LandingPageHeader.js`
   - Updated navigation links to use `withNavigationDelay`

5. `src/features/presentation/components/LandingPage/RouteCard.jsx`
   - Updated route card click handler to use `safeNavigate`

6. `src/features/presentation/components/PresentationMapView/PresentationMapView.js`
   - Updated map cleanup in useEffect to use `safelyRemoveMap`

7. `src/features/map/components/MapView/MapView.js`
   - Added error handling for map operations
   - Added import for `safelyRemoveMap` (to be used in future updates)

## Testing

The fix has been tested by:

1. Navigating between the home page and editor multiple times
2. Clicking on route cards to navigate to the preview page
3. Using the navbar links to navigate between pages
4. Testing on both desktop and mobile devices

The error no longer occurs during normal navigation.

## Future Improvements

1. Consider implementing a more robust map initialization process that checks for existing map instances
2. Add more comprehensive error handling for map operations
3. Consider using a map instance registry to track all active maps and ensure proper cleanup
