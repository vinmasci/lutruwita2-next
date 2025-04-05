# Mobile Map Initialization Fix

## Problem

The web app was experiencing crashes on mobile devices due to inefficient map initialization. The issue was identified in the `PresentationMapView` component, where a race condition was occurring:

1. When the component first mounted, it would initialize a map with a default ID (`map-default`) because the route data wasn't loaded yet.
2. Shortly after, when the route data loaded, the component would unmount the first map during initialization and create a new one with the actual route ID.
3. This double initialization was resource-intensive and caused crashes on mobile devices with limited resources.

The logs showed this sequence clearly:
```
[Log] [MapRegistry] Map map-default initialization status: initializing
[Log] [PresentationMapView] 🚀 Map initialization starting for ID: map-default
[Warning] [PresentationMapView] – "Component unmounted during map initialization"
[Log] [PresentationMapView] ⚠️ Component unmounted during map initialization
[Log] [MapRegistry] Map map-9661a12f-a376-4d6d-84b5-bd40a8e6719e initialization status: initializing
[Log] [PresentationMapView] 🚀 Map initialization starting for ID: map-9661a12f-a376-4d6d-84b5-bd40a8e6719e
```

## Solution

The fix was implemented by adding a check at the beginning of the map initialization effect to skip initialization if there's no valid route ID:

```javascript
// Skip initialization if we don't have a valid route ID
// This prevents creating a map with the default ID that will be discarded
if (!currentRoute?.persistentId && !currentRoute?.routeId) {
    console.log('[PresentationMapView] ⏭️ Skipping map initialization until route data is available');
    return;
}
```

Additionally, the map ID generation was modified to remove the fallback to 'default':

```javascript
// Before:
const mapId = `map-${currentRoute?.persistentId || currentRoute?.routeId || 'default'}`;

// After:
const mapId = `map-${currentRoute?.persistentId || currentRoute?.routeId}`;
```

## Benefits

1. **Improved Performance**: By preventing the wasteful initialization of a temporary map, the app uses fewer resources.
2. **Reduced Memory Usage**: Only one map is created instead of two, reducing memory consumption.
3. **Eliminated Race Condition**: The component now waits for valid route data before initializing the map.
4. **Better Mobile Experience**: Mobile devices with limited resources can now handle the app without crashing.

## Implementation Details

The fix was implemented in `src/features/presentation/components/PresentationMapView/PresentationMapView.js` and committed with the message "Fix mobile crashes by preventing map initialization with default ID".

## Testing

To verify the fix:
1. Load the app on a mobile device
2. Navigate to a route page
3. Observe that only one map initialization occurs (with the correct route ID)
4. Confirm that the app doesn't crash during navigation between routes
