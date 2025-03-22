# POI vs Line Loading: Implementation Differences

## Overview

This document explains the differences between how POIs (Points of Interest) and Lines are loaded from MongoDB data in the application. The key issue identified is that while POIs are loading correctly, line data is failing to load with the error: `[RouteContext] loadLinesFromRoute function not available`.

## POI Loading Implementation

### Provider Structure

1. **Provider Hierarchy in App.jsx**:
   ```jsx
   <ProcessingProvider>
     <PhotoProvider>
       <PlaceProvider>
         <POIProvider>
           <Routes>
             {/* Route components including RouteProvider */}
           </Routes>
         </POIProvider>
       </PlaceProvider>
     </PhotoProvider>
   </ProcessingProvider>
   ```

2. **POIProvider is at a higher level** than RouteProvider, which is created inside route components like RoutePresentation.

### POI Context Implementation

1. **Error Handling in POIContext.js**:
   ```jsx
   // Get access to the RouteContext to notify it of POI changes
   let routeContext;
   try {
     routeContext = useRouteContext();
   } catch (error) {
     // This is expected when the POIProvider is used outside of a RouteProvider
     routeContext = null;
   }
   ```

2. **POI Loading Function**:
   ```jsx
   // Load POIs from route
   const loadPOIsFromRoute = (routePOIs) => {
     try {
       if (!routePOIs) {
         console.log('[POIContext] No POIs to load from route');
         return;
       }
       
       console.log('[POIContext] Loading POIs from route:', {
         draggableCount: routePOIs.draggable?.length || 0,
         placesCount: routePOIs.places?.length || 0
       });
       
       // Process new POIs - they should all be full POI objects now
       const newPOIs = [
         ...(routePOIs.draggable || [])
         // ...(routePOIs.places || []) // Place POIs are disabled
       ];
       
       // Replace existing POIs entirely
       dispatch({ type: 'LOAD_POIS', payload: newPOIs });
       
       console.log('[POIContext] POIs loaded successfully');
       
       // Don't notify RouteContext when loading POIs from route
       // as this is not a user-initiated change
     }
     catch (error) {
       console.error('[POIContext] Error loading POIs:', error);
       setError(error instanceof Error ? error : new Error('Failed to load POIs'));
     }
   };
   ```

3. **POI Loading in RoutePresentation.js**:
   ```jsx
   // In RouteContent component
   if (route.pois) {
     loadPOIsFromRoute(route.pois);
   }
   ```

## Line Loading Implementation

### Provider Structure

1. **Provider Hierarchy in RoutePresentation.js (BEFORE FIX)**:
   ```jsx
   return (_jsx(LineProvider, { children: _jsx(RouteProvider, { children: _jsx(RouteContent, { route: route }) }) }));
   ```

2. **LineProvider is wrapping RouteProvider**, which is the opposite of the POI implementation where POIProvider is at a higher level.

### Line Context Implementation

1. **Error Handling in LineContext.jsx**:
   ```jsx
   // Get access to the RouteContext to notify it of line changes
   let routeContext;
   try {
     routeContext = useRouteContext();
   } catch (error) {
     // This is expected when the LineProvider is used outside of a RouteProvider
     routeContext = null;
   }
   ```

2. **Line Loading Function**:
   ```jsx
   // Function to load lines from route
   const loadLinesFromRoute = useCallback((routeLines) => {
     if (!routeLines) {
       console.log('[LineContext] No lines to load from route');
       return;
     }
     
     console.log('[LineContext] Loading lines from route:', routeLines.length);
     console.log('[LineContext] Line data details:', JSON.stringify(routeLines));
     
     // Validate line data structure
     const validLines = routeLines.filter(line => {
       if (!line.id || !line.coordinates || !line.coordinates.start || !line.coordinates.end) {
         console.warn('[LineContext] Invalid line data structure:', line);
         return false;
       }
       return true;
     });
     
     console.log('[LineContext] Valid lines count:', validLines.length);
     setLines(validLines);
   }, []);
   ```

3. **Line Loading in RouteContext.js**:
   ```jsx
   // When loading a route in RouteContext
   // Get LineContext for line marker functionality
   let lineContext;
   try {
     lineContext = useLineContext();
   } catch (error) {
     // This is expected when the RouteProvider is used outside of a LineProvider
     console.log('[RouteContext] LineContext not available:', error.message);
     lineContext = null;
   }

   // Later when processing route data
   // Check if LineContext and loadLinesFromRoute function are available
   if (lineContext && typeof lineContext.loadLinesFromRoute === 'function') {
     console.log('[RouteContext] Calling loadLinesFromRoute function from LineContext');
     lineContext.loadLinesFromRoute(route.lines);
   } else {
     console.error('[RouteContext] LineContext or loadLinesFromRoute function not available');
   }
   ```

## Key Differences and Issues

1. **Provider Hierarchy (CRITICAL DIFFERENCE)**:
   - **POI Implementation**: POIProvider is at a higher level than RouteProvider
   - **Line Implementation**: LineProvider is wrapping RouteProvider (INCORRECT)
   - **Issue**: This creates a circular dependency where RouteContext tries to access LineContext, but LineContext is trying to access RouteContext

2. **Loading Flow**:
   - **POI Implementation**: RoutePresentation component directly calls `loadPOIsFromRoute` with route.pois
   - **Line Implementation**: RouteContext tries to call `lineContext.loadLinesFromRoute` but can't access it because of the provider hierarchy issue

3. **Error Handling**:
   - **POI Implementation**: Both contexts gracefully handle the case when the other context is not available
   - **Line Implementation**: Same error handling, but the provider hierarchy prevents it from working correctly

4. **Data Structure**:
   - **POI Implementation**: Expects an object with `draggable` and `places` arrays
   - **Line Implementation**: Expects an array of line objects with `id` and `coordinates` properties

## Current Status and Fixes

### Creation Mode vs Presentation Mode

- **Creation Mode**: Line markers are now working correctly in creation mode.
- **Presentation Mode**: Line markers are still not loading correctly in presentation mode.

### Logs from Presentation Mode

The logs show that the line data is being correctly saved to MongoDB and is present in the route data:

```
[Log] [RoutePresentation] Found line data in route: – 1 – "lines" (RoutePresentation.js, line 131)
[Log] [RoutePresentation] Line data details: – "[{\"coordinates\":{\"start\":[147.34899532066862,-41.3404705520581],\"end\":[147.4014852895142,-41.3404705520581]},\"id\":\"line-1742555212627\",\"type…" (RoutePresentation.js, line 132)
"[{\"coordinates\":{\"start\":[147.34899532066862,-41.3404705520581],\"end\":[147.4014852895142,-41.3404705520581]},\"id\":\"line-1742555212627\",\"type\":\"line\",\"name\":\"fdfdsdfsfdsdffds\",\"description\":\"\",\"icons\":[],\"photos\":[],\"_id\":\"67dd4856fb727438f0d7a706\"}]"
```

However, the LineContext is showing 0 lines:

```
[Log] [PresentationLineLayer] Lines from context: – {linesCount: 0, linesData: []} (PresentationLineLayer.jsx, line 12)
```

### Implemented Fixes

1. **Created PresentationLineLayer Component**:
   - Created a specialized version of LineLayer for presentation mode
   - Ensures proper integration with the presentation map instance
   - Handles line markers in a way that's optimized for presentation mode

2. **Fixed Import Statement**:
   - Updated the import statement in PresentationMapView.js to use a default import for PresentationLineLayer
   - Changed from `import { PresentationLineLayer } from '../LineLayer/PresentationLineLayer';` to `import PresentationLineLayer from '../LineLayer/PresentationLineLayer';`

3. **Provider Hierarchy**:
   - The provider hierarchy in RoutePresentation.js is still incorrect:
   ```jsx
   return (_jsx(LineProvider, { children: _jsx(RouteProvider, { children: _jsx(RouteContent, { route: route }) }) }));
   ```
   - This needs to be swapped to match the POI implementation:
   ```jsx
   return (_jsx(RouteProvider, { children: _jsx(LineProvider, { children: _jsx(RouteContent, { route: route }) }) }));
   ```

## Next Steps

The key remaining issue is the provider hierarchy in RoutePresentation.js. The LineProvider should be inside the RouteProvider, not the other way around. This would allow the LineContext to access the RouteContext when needed, matching the pattern used for POIs.

## Attempted Fixes (March 2025)

### Provider Hierarchy Swap (FAILED)

We attempted to fix the issue by swapping the provider hierarchy in RoutePresentation.js:

```jsx
// Changed from:
return (_jsx(LineProvider, { children: _jsx(RouteProvider, { children: _jsx(RouteContent, { route: route }) }) }));

// To:
return (_jsx(RouteProvider, { children: _jsx(LineProvider, { children: _jsx(RouteContent, { route: route }) }) }));
```

We also updated the log message to reflect the new provider structure:

```jsx
// Changed from:
console.log('[RoutePresentation] Provider structure: LineProvider → RouteProvider → RouteContent');

// To:
console.log('[RoutePresentation] Provider structure: RouteProvider → LineProvider → RouteContent');
```

However, this fix did not resolve the issue. The line data is still not being loaded correctly in presentation mode, and the LineContext still shows 0 lines.

### Possible Reasons for Failure

1. There might be other components in the hierarchy that are affecting the context access
2. The issue might be in how the line data is being passed to the LineContext
3. There could be timing issues with when the contexts are initialized
4. The PresentationLineLayer component might not be correctly accessing the LineContext
5. There might be differences in how the LineContext is used in PresentationMapView.js compared to RoutePresentation.js

### Next Investigation Steps

1. Examine how the line data flows through the application in more detail
2. Check if there are any differences in how the LineContext is initialized in different parts of the application
3. Add more detailed logging to track the line data through the entire loading process
4. Consider a more comprehensive refactoring of the line marker implementation to match the POI implementation more closely
