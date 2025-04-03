# Map Registry Implementation

## Problem

The application was experiencing issues with map mounting and unmounting in presentation mode, causing errors like:

```
[Warning] [PresentationMapView] – "Component unmounted during map initialization"
[Error] [PresentationMapView] – "Mapbox GL error:" – xe {error: Error: Layer with id "tracer-layer" already exists on this map, type: "error", target: Map, …}
```

These issues occurred because:

1. Components were unmounting during map initialization
2. Multiple map instances were being created for the same route
3. Duplicate layers were being added to the map
4. State management was inconsistent across component lifecycles

## Solution

We implemented a robust map registry system that:

1. Tracks map instances globally across component lifecycles
2. Prevents duplicate initialization
3. Handles cancellation of in-progress initializations
4. Provides better error handling and logging

### Key Components

#### 1. Map Registry

A new utility (`src/features/map/utils/mapRegistry.js`) that provides:

- Global tracking of map instances by ID
- Initialization status tracking
- Cancellation tokens for async operations
- Comprehensive logging

```javascript
// Core functionality
const mapRegistry = new Map();
const initializationStatus = new Map();
const cancellationTokens = new Map();

// Register a map instance
export const registerMap = (id, instance) => {
  mapRegistry.set(id, instance);
};

// Get a registered map instance
export const getRegisteredMap = (id) => {
  return mapRegistry.get(id);
};

// Check if a map is registered
export const isMapRegistered = (id) => {
  return mapRegistry.has(id);
};
```

#### 2. Enhanced PresentationMapView

The `PresentationMapView` component now:

- Checks for existing map instances before creating new ones
- Uses cancellation tokens to handle unmounting during initialization
- Properly handles layer creation to prevent duplicates
- Maintains stable map IDs based on route IDs
- Uses unique timer names to prevent console warnings

```javascript
// Generate a stable ID for this map instance
const mapId = `map-${currentRoute?.persistentId || currentRoute?.routeId || 'default'}`;

// Check if map is already registered
if (isMapRegistered(mapId)) {
  console.log(`[PresentationMapView] ⏭️ Map with ID ${mapId} already registered, reusing instance`);
  
  // Get the existing map instance from the registry
  const existingMap = getRegisteredMap(mapId);
  
  // Update local refs and state
  mapInstance.current = existingMap;
  isInitializedRef.current = true;
  setIsMapReady(true);
  
  return;
}
```

#### 3. Improved RoutePresentation

The `RoutePresentation` component now:

- Uses a module-level loading flag to prevent duplicate loading
- Provides more stable component identity with explicit props
- Tracks initialization status per component instance
- Handles errors during initialization
- Provides better cleanup on unmount

```javascript
// Module-level variable to track if we're currently in a loading state
let isCurrentlyLoading = false;

// In the fetch effect:
if (isCurrentlyLoading) {
  console.log('[RoutePresentation] ⏭️ Already loading a route, skipping duplicate fetch');
  return;
}

// Set the global loading flag
isCurrentlyLoading = true;
```

## Benefits

1. **Prevents Duplicate Initialization**: Map instances are now tracked globally, preventing duplicate initialization even if components remount.

2. **Handles Race Conditions**: Cancellation tokens ensure that if a component unmounts during initialization, any pending operations are properly cancelled.

3. **Improves Error Handling**: Better error handling and logging throughout the initialization process.

4. **Reduces Memory Leaks**: Proper cleanup of resources when components unmount.

5. **Maintains Stable References**: Map instances are maintained with stable references, preventing unnecessary re-renders.

6. **Mobile Optimization**: The WebGL tracer layer is now disabled on mobile devices, significantly reducing resource usage and preventing crashes on devices with limited WebGL capabilities.

## Implementation Details

### Map Registry API

- `registerMap(id, instance)`: Register a map instance with the registry
- `getRegisteredMap(id)`: Get a registered map instance by ID
- `isMapRegistered(id)`: Check if a map is registered with the given ID
- `setInitializationStatus(id, status)`: Set the initialization status for a map
- `getInitializationStatus(id)`: Get the initialization status for a map
- `createCancellationToken(id)`: Create a cancellation token for a map initialization
- `getCancellationToken(id)`: Get the cancellation token for a map
- `removeCancellationToken(id)`: Remove the cancellation token for a map

### Initialization Flow

1. Component mounts and checks if a map with the current route ID is already registered
2. If registered, reuse the existing map instance
3. If not registered, create a cancellation token and start initialization
4. If component unmounts during initialization, cancel the token
5. On successful initialization, register the map in the global registry
6. On subsequent mounts, reuse the registered map instance

## Results

The implementation has successfully addressed the mounting/unmounting issues:

1. **First Mount**: The component creates a map instance with ID `map-default`
2. **Unmount During Initialization**: The component unmounts, cancellation token is triggered
3. **Second Mount**: The component creates a new map instance with the correct route ID `map-9661a12f-a376-4d6d-84b5-bd40a8e6719e`
4. **Successful Initialization**: The map is registered and initialization completes
5. **Subsequent Mounts**: The component reuses the existing map instance

This approach effectively prevents the "Layer with id 'tracer-layer' already exists" error by ensuring that only one map instance is active at a time and properly handling the cancellation of in-progress initializations.
