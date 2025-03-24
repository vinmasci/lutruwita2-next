# Embed Route Context Issue

## Problem

The embed map view was throwing an error:

```
Error: useRouteContext must be used within a RouteProvider
```

This error occurred because some components were using the `useRouteContext` hook outside of a `RouteProvider`. The embed view uses its own `EmbedRouteProvider` and `useEmbedRouteContext` instead of the main app's `RouteProvider` and `useRouteContext`.

## Attempted Solutions

### Attempt 1: Create useEmbedRouteProcessing hook

We created a new hook `useEmbedRouteProcessing.jsx` that's a modified version of `useUnifiedRouteProcessing.js` but uses `useEmbedRouteContext` instead of `useRouteContext`:

```jsx
// src/features/presentation/components/EmbedMapView/hooks/useEmbedRouteProcessing.jsx
import { useState, useEffect, useRef } from 'react';
import { useEmbedRouteContext } from '../context/EmbedRouteContext.jsx';

// ... rest of the hook implementation
```

### Attempt 2: Create RouteInitializer component

We created a `RouteInitializer.jsx` component that uses the new `useEmbedRouteProcessing` hook:

```jsx
// src/features/presentation/components/EmbedMapView/components/RouteInitializer.jsx
import { useEffect } from 'react';
import useEmbedRouteProcessing from '../hooks/useEmbedRouteProcessing';

const RouteInitializer = ({ routes, onInitialized }) => {
    // Use the embed-specific route processing hook
    const { initialized } = useEmbedRouteProcessing(routes, {
        batchProcess: true,
        onInitialized: () => {
            console.log('[RouteInitializer] Routes initialized with embed-specific approach');
            onInitialized?.();
        }
    });

    // This component doesn't render anything
    return null;
};

export default RouteInitializer;
```

### Attempt 3: Update EmbedMapView.jsx

We updated `EmbedMapView.jsx` to:
- Import the RouteInitializer component
- Remove the direct call to useEmbedRouteProcessing at the component top level
- Add the RouteInitializer component inside the EmbedRouteProvider

```jsx
// src/features/presentation/components/EmbedMapView/EmbedMapView.jsx
import RouteInitializer from './components/RouteInitializer';

// ...

// We'll initialize routes inside the EmbedRouteProvider
const routesInitializedRef = useRef(false);

// ...

return (
    <EmbedRouteProvider initialRoutes={routeData?.allRoutesEnhanced || []} initialCurrentRoute={currentRoute}>
        {/* Initialize routes using the embed-specific approach - inside the provider */}
        {routeData?.allRoutesEnhanced && (
            <RouteInitializer 
                routes={routeData.allRoutesEnhanced} 
                onInitialized={() => {
                    routesInitializedRef.current = true;
                    console.log('[EmbedMapView] Routes initialized with embed-specific approach');
                }}
            />
        )}
        {/* ... rest of the component */}
    </EmbedRouteProvider>
);
```

## Final Solution

Despite these changes, we were still getting the error. After further investigation, we identified that the `MapHeader` component was using `useRouteContext` directly:

```jsx
// src/features/map/components/MapHeader/MapHeader.js
import { useRouteContext } from '../../context/RouteContext';

const MapHeader = ({ title, color = '#000000', logoUrl, username }) => {
    // Get the updateHeaderSettings function and headerSettings from RouteContext
    const { updateHeaderSettings, headerSettings } = useRouteContext();
    
    // ... rest of the component
};
```

### Solution: Create RouteContextAdapter and wrap components

1. We created a `RouteContextAdapter` component that provides a bridge between the embed route context and the main route context:

```jsx
// src/features/presentation/components/EmbedMapView/components/RouteContextAdapter.jsx
import { useEmbedRouteContext } from '../context/EmbedRouteContext';
import { RouteProvider } from '../../../../map/context/RouteContext';

const RouteContextAdapter = ({ children }) => {
    const embedContext = useEmbedRouteContext();
    
    // Create a compatible context value for the standard RouteContext
    const adaptedContextValue = {
        ...embedContext,
        // Add any missing properties or adapt as needed
    };
    
    return (
        <RouteProvider value={adaptedContextValue}>
            {children}
        </RouteProvider>
    );
};

export default RouteContextAdapter;
```

2. We wrapped the `MapHeader` component with the `RouteContextAdapter` in `EmbedMapView.jsx`:

```jsx
<RouteContextAdapter>
    <MapHeader 
        title={currentRoute?.name || 'Untitled Route'}
        color={routeData?.headerSettings?.color || '#000000'}
        logoUrl={routeData?.headerSettings?.logoUrl}
        username={routeData?.headerSettings?.username}
    />
</RouteContextAdapter>
```

3. We also wrapped other components that use `useRouteContext` with the `RouteContextAdapter`:

```jsx
{routeData?.allRoutesEnhanced && routeData.allRoutesEnhanced.map(route => (
    <RouteContextAdapter key={route.id || route.routeId}>
        <SimplifiedRouteLayer
            map={mapInstance.current}
            route={route}
            showDistanceMarkers={isDistanceMarkersVisible && route.id === currentRoute?.id}
            isActive={route.id === currentRoute?.id || route.routeId === currentRoute?.routeId}
        />
    </RouteContextAdapter>
))}
```

This solution allows components that use `useRouteContext` to work within the embed view without having to modify each component to use `useEmbedRouteContext` instead.
