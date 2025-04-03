# Mobile App Mounting/Unmounting Fix

## Issue

The mobile app was crashing on load due to a component mounting and unmounting cycle that caused duplicate initialization of resources and map instances. The console logs showed:

```
[Log] [RouteContent] Component mounted with route ID: – undefined
[Log] [RouteContent] Component unmounting with route ID: – undefined
[Log] [RouteContent] Component mounted with route ID: – "9661a12f-..."
[Log] [RouteContent] Component unmounting with route ID: – "9661a12f-..."
[Log] [PresentationMapView] ⚠️ Component unmounted during map initialization
[Error] [PresentationMapView] – "Mapbox GL error:" – ve {error: Error: Layer with id "tracer-layer" already exists on this map, type: "error", target: Map, …}
```

This indicated that:
1. `RouteContent` was mounting initially without a valid route, then unmounting
2. After route data was loaded, the component mounted again with the correct ID, but then still unmounted later
3. `PresentationMapView` was unmounting while its initialization `useEffect` was running
4. Map initialization logic was running multiple times, causing duplicate layers

## Root Cause

The issue was in `RoutePresentation.js`. It was rendering `RouteContent` even when the `route` state was initially `null` or loading. When the `route` state updated after fetching, it triggered a re-render that caused React to unmount and remount the `RouteContent` component, leading to this cycle.

## Solution

### 1. Conditional Rendering

Modified `RoutePresentation.js` to conditionally render `RouteContent` *only* when the route data is fully loaded and valid:

```jsx
// Conditionally render RouteContent only when route data is loaded and valid
!loading && !error && route && routes.length > 0 ? (
    _jsx(RouteContent, { route: route, key: `route-content-${route.persistentId}` })
) : null,
```

This prevents the initial mount/unmount cycle with incomplete data.

### 2. Global Initialization Tracking

Implemented a module-level Set to track which routes have been initialized, preventing duplicate initialization even if components remount:

```jsx
// Module-level Set to track initialized persistent IDs across mounts/sessions
const initializedPersistentIds = new Set();

// In the useEffect:
// Skip if this persistent ID has already been initialized globally
if (!routes.length || !route?.persistentId || initializedPersistentIds.has(route.persistentId)) {
    console.log('[RoutePresentation] ⏭️ Skipping initialization - no routes, invalid route ID, or already initialized globally for this ID');
    return;
}

// Mark this persistent ID as initialized globally
initializedPersistentIds.add(route.persistentId);
```

### 3. Mount Status Tracking

Added proper tracking of component mount status to prevent state updates on unmounted components:

```jsx
const isMountedRef = useRef(true);

// Set mount status to false on unmount
useEffect(() => {
    isMountedRef.current = true;
    return () => {
        console.log('[RouteContent] Component unmounting with route ID:', route?.persistentId);
        isMountedRef.current = false;
    };
}, [route?.persistentId]);

// Check mount status before updating state
if (isMountedRef.current) {
    setLineData(route.lines);
    console.log('[RoutePresentation] ✅ Lines loaded and stored for direct rendering');
} else {
    console.log('[RoutePresentation] ⚠️ Component unmounted before setting line data');
    // Early return if component is unmounted to prevent further processing
    return;
}
```

## Results

These changes prevent the mounting/unmounting cycle that was causing the mobile app to crash by:

1. Waiting for route data to be fully loaded before rendering the map
2. Tracking initialization globally to avoid duplicate initialization even across remounts
3. Checking component mount status before making state updates
4. Providing better error handling and logging for debugging

The app should now load properly on mobile devices without crashing due to duplicate map initialization or state updates on unmounted components.
