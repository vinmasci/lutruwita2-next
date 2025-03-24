# Route Metadata Fix

## Issue Description

There was a bug in the route metadata handling that caused state and LGA (Local Government Area) information to be lost when routes were loaded and then saved again. This affected the landing page filters, which rely on this metadata to populate filter options.

The issue occurred in the following sequence:

1. When a route was initially uploaded and saved, the metadata (country, state, LGA) was correctly calculated and saved to MongoDB.
2. When loading a route via the `loadRoute` function, the metadata from MongoDB wasn't properly transferred to the individual route objects in the transformed data structure.
3. When the loaded route was saved again, the `saveRoute` function couldn't find any metadata in the route objects, so it saved the route with empty metadata fields, effectively overwriting the previously saved metadata.
4. As a result, the landing page filters couldn't find the state and LGA information, as it had been overwritten with empty values.

## Fix Implementation

The fix modifies the `loadRoute` function in `src/features/map/services/routeService.js` to properly preserve the metadata when transforming the data structure:

1. Added logging of metadata from the API response for debugging purposes.
2. When transforming the data structure, we now transfer the metadata from the MongoDB document to the individual route objects.
3. For the case where we have `allRoutes` in the data field, we map over each route and add the metadata to each route object.
4. For the fallback case where we create a single route from the data field, we add the metadata to the route object.
5. Added an additional check to ensure the metadata is preserved in the transformed data structure.
6. **Added a final check after all data transformation to ensure that metadata is properly transferred to all route objects, regardless of the data structure format.** This ensures that metadata is preserved in all code paths of the `loadRoute` function.

## Code Changes

### 1. Changes to the `loadRoute` function:

```javascript
// Transform the API response to match what the client expects
let transformedData = data;

// Log metadata for debugging
console.log('[routeService] Metadata from API:', data.metadata);

// Check if this is the new API format (with data field but no routes array)
if (data.data && !data.routes) {
    
    // Check if we have allRoutes in the data field (our new format)
    if (data.data.allRoutes && Array.isArray(data.data.allRoutes) && data.data.allRoutes.length > 0) {
        
        // Use the allRoutes array directly
        transformedData = {
            ...data,
            routes: data.data.allRoutes
        };
        
        // Transfer metadata to each route object
        if (data.metadata) {
            transformedData.routes = transformedData.routes.map(route => ({
                ...route,
                metadata: {
                    ...route.metadata,
                    country: data.metadata.country,
                    state: data.metadata.state,
                    lga: data.metadata.lga,
                    isLoop: data.metadata.isLoop
                }
            }));
        }
    } else {
        // Fallback to creating a single route from the data field
        
        // Create a route object from the data field
        const routeObject = {
            // ... other properties ...
            
            // Add metadata to the route object
            metadata: data.metadata || {}
        };
        
        // Create a transformed data structure with routes array
        transformedData = {
            ...data,
            routes: [routeObject]
        };
    }
}

// Ensure metadata is preserved in the transformed data
if (data.metadata && !transformedData.metadata) {
    console.log('[routeService] Adding metadata to transformed data:', data.metadata);
    transformedData.metadata = data.metadata;
}

// Ensure metadata is properly transferred to all route objects
// This is a critical step to ensure metadata is preserved when loading routes
if (transformedData.routes && transformedData.routes.length > 0 && transformedData.metadata) {
    console.log('[routeService] Ensuring metadata is transferred to all route objects');
    transformedData.routes = transformedData.routes.map(route => {
        // If route doesn't have metadata or has incomplete metadata, add it from the top-level metadata
        if (!route.metadata || !route.metadata.state || !route.metadata.lga) {
            console.log('[routeService] Adding metadata to route:', route.name || route.routeId);
            return {
                ...route,
                metadata: {
                    ...route.metadata, // Keep any existing metadata
                    country: transformedData.metadata.country || 'Australia',
                    state: transformedData.metadata.state || '',
                    lga: transformedData.metadata.lga || '',
                    isLoop: transformedData.metadata.isLoop || false
                }
            };
        }
        return route;
    });
}
```

### 2. Added missing helper functions:

The `saveRoute` function was referencing two helper functions that were not defined in the file: `getRouteDistance` and `getUnpavedPercentage`. These functions have been added:

```javascript
// Helper function to get route distance
function getRouteDistance(route) {
    // Check multiple possible locations for distance data
    return route.statistics?.totalDistance || // First check statistics.totalDistance
           route.data?.distance ||           // Then check data.distance
           (route.geojson?.features?.[0]?.properties?.distance) || // Then check geojson properties
           0;  // Default to 0 if not found
}

// Helper function to get unpaved percentage
function getUnpavedPercentage(route) {
    // Check if route has surface data
    if (route.surface && route.surface.surfaceTypes) {
        // Calculate unpaved percentage from surface types
        let totalDistance = 0;
        let unpavedDistance = 0;
        
        route.surface.surfaceTypes.forEach(surface => {
            if (surface.type && surface.type.toLowerCase().includes('unpaved')) {
                unpavedDistance += surface.distance || 0;
            }
            totalDistance += surface.distance || 0;
        });
        
        return totalDistance > 0 ? (unpavedDistance / totalDistance) * 100 : 0;
    } else if (route.unpavedSections && route.unpavedSections.length > 0) {
        // Calculate unpaved percentage from unpaved sections
        const routeDistance = getRouteDistance(route);
        if (routeDistance === 0) return 0;
        
        let unpavedDistance = route.unpavedSections.reduce((total, section) => {
            // Calculate distance of this section if coordinates are available
            if (section.coordinates && section.coordinates.length > 1) {
                let sectionDistance = 0;
                for (let i = 1; i < section.coordinates.length; i++) {
                    const [lon1, lat1] = section.coordinates[i-1];
                    const [lon2, lat2] = section.coordinates[i];
                    // Simple distance calculation
                    const dx = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
                    const dy = lat2 - lat1;
                    const distance = Math.sqrt(dx * dx + dy * dy) * 111.32 * 1000; // approx meters
                    sectionDistance += distance;
                }
                return total + sectionDistance;
            }
            return total;
        }, 0);
        
        return (unpavedDistance / routeDistance) * 100;
    } else {
        // Default to 10% if no surface data available
        return 10;
    }
}
```

These helper functions ensure that the metadata calculation in the `saveRoute` function works correctly, which is essential for preserving the metadata when routes are saved.

## Testing

To verify the fix:

1. Upload a new route in creation mode - the metadata should be calculated and saved correctly.
2. Load the route - the metadata should be preserved in the route objects.
3. Save the route again - the metadata should be preserved in MongoDB.
4. Check the landing page filters - they should now show the correct state and LGA options.

## Future Considerations

- Consider adding more robust validation and error handling for metadata fields.
- Add unit tests specifically for metadata preservation during load/save operations.
- Monitor the landing page filters to ensure they continue to work correctly with the metadata.
