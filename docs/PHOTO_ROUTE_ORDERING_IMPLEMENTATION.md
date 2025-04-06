# Photo Route Ordering Implementation

## Overview

This document outlines the implementation of route-based photo ordering in the presentation mode photo viewer. The primary goals were to:

1. Order photos by route number and kilometer position
2. Ensure proper highlighting of the current photo marker on the map
3. Fix issues with photo navigation and counting
4. Maintain correct photo index display during navigation

## Files Modified

The following files were modified to implement these enhancements:

1. `src/features/presentation/components/PhotoLayer/PresentationPhotoLayer.js`
2. `src/features/presentation/components/PhotoLayer/PhotoModal.jsx`
3. `src/features/photo/components/PhotoMarker/PhotoMarker.js`

## Detailed Changes

### 1. Route-Based Photo Ordering

**Files:**
- `src/features/presentation/components/PhotoLayer/PresentationPhotoLayer.js`

**Changes:**
- Implemented a sophisticated algorithm to determine which route each photo belongs to
- Used the Haversine formula to calculate distances between photo locations and route points
- Added logic to find the closest point on each route to each photo
- Calculated the distance along the route for each photo
- Sorted photos first by route index, then by distance along the route

```javascript
// Function to get nearby photos for the lightbox, organized by route and km position
const getOrderedPhotos = useCallback((allPhotos) => {
    if (!allPhotos || allPhotos.length === 0) {
        return [];
    }
    
    // Get the current routes from context
    const routes = currentRoute?._loadedState?.routes || [];
    
    // Function to find which route a photo belongs to and its position along that route
    const getPhotoRouteInfo = (photo) => {
        if (!photo.coordinates) return { routeIndex: Infinity, distanceAlongRoute: Infinity };
        
        let bestRouteIndex = Infinity;
        let bestDistanceAlongRoute = Infinity;
        let shortestDistance = Infinity;
        
        // Helper function to calculate distance between two points using Haversine formula
        const calculateDistance = (point1, point2) => {
            // Convert to radians
            const toRad = (value) => value * Math.PI / 180;
            
            const lat1 = point1[1];
            const lng1 = point1[0];
            const lat2 = point2[1];
            const lng2 = point2[0];
            
            const φ1 = toRad(lat1);
            const φ2 = toRad(lat2);
            const Δφ = toRad(lat2 - lat1);
            const Δλ = toRad(lng2 - lng1);
            
            // Haversine formula
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            
            // Earth's radius in meters
            const R = 6371e3;
            return R * c;
        };
        
        // Check each route to find the closest one to this photo
        routes.forEach((route, routeIndex) => {
            if (!route.geojson?.features?.[0]?.geometry?.coordinates) return;
            
            const routeCoords = route.geojson.features[0].geometry.coordinates;
            
            // Find the closest point on this route to the photo
            let minDistance = Infinity;
            let closestPointIndex = -1;
            
            routeCoords.forEach((coord, index) => {
                if (!coord || coord.length < 2) return;
                
                // Calculate distance between route point and photo using Haversine formula
                const photoPoint = [photo.coordinates.lng, photo.coordinates.lat];
                const distance = calculateDistance(coord, photoPoint);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPointIndex = index;
                }
            });
            
            // If this route is closer than any previous route
            if (minDistance < shortestDistance) {
                shortestDistance = minDistance;
                bestRouteIndex = routeIndex;
                
                // Calculate actual distance along the route up to this point
                let distanceAlongRoute = 0;
                for (let i = 1; i <= closestPointIndex; i++) {
                    distanceAlongRoute += calculateDistance(
                        routeCoords[i-1], 
                        routeCoords[i]
                    );
                }
                
                bestDistanceAlongRoute = distanceAlongRoute;
            }
        });
        
        return { routeIndex: bestRouteIndex, distanceAlongRoute: bestDistanceAlongRoute };
    };
    
    // Calculate route info for each photo
    const photosWithRouteInfo = allPhotos.map(photo => {
        const routeInfo = getPhotoRouteInfo(photo);
        return {
            ...photo,
            routeIndex: routeInfo.routeIndex,
            distanceAlongRoute: routeInfo.distanceAlongRoute
        };
    });
    
    // Sort photos by route index first, then by distance along route
    const sortedPhotos = [...photosWithRouteInfo].sort((a, b) => {
        // First sort by route index
        if (a.routeIndex !== b.routeIndex) {
            return a.routeIndex - b.routeIndex;
        }
        
        // Then sort by distance along route (from start to end)
        return a.distanceAlongRoute - b.distanceAlongRoute;
    });
    
    return sortedPhotos;
}, [currentRoute]);
```

### 2. Photo Navigation and Marker Highlighting

**Files:**
- `src/features/presentation/components/PhotoLayer/PresentationPhotoLayer.js`
- `src/features/presentation/components/PhotoLayer/PhotoModal.jsx`
- `src/features/photo/components/PhotoMarker/PhotoMarker.js`

**Changes:**
- Modified the approach to use the photo's URL as a unique identifier instead of ID
- Added an `initialIndex` prop to the PhotoModal component to start at the correct position
- Implemented a callback mechanism to update the parent's selectedPhoto state when navigating
- Fixed the marker highlighting to use the URL for comparison

```javascript
// In PresentationPhotoLayer.js
const photoModalElement = selectedPhoto ? 
    (() => {
        // Find the index of the selected photo in the ordered array using URL as unique identifier
        const selectedPhotoIndex = orderedPhotos.findIndex(p => p.url === selectedPhoto.url);
        console.log('Selected photo URL:', selectedPhoto.url);
        console.log('Selected photo index in ordered array:', selectedPhotoIndex);
        
        return React.createElement(PhotoModal, {
            key: `preview-${selectedPhoto.url}`,
            photo: selectedPhoto,
            onClose: () => {
                console.log('Closing photo modal');
                setSelectedPhoto(null);
            },
            additionalPhotos: orderedPhotos,
            initialIndex: selectedPhotoIndex,
            onPhotoChange: setSelectedPhoto
        });
    })() : null;
```

```javascript
// In PhotoModal.jsx
// Update local photos when props change and update the selected index
useEffect(() => {
  // Always update the photos array
  setLocalPhotos(photos);
  
  // Update the selected index when initialIndex changes
  setSelectedIndex(initialIndex);
  
  console.log(`Setting index to ${initialIndex} of ${photos.length} photos`);
}, [photos, initialIndex]);

// Call onPhotoChange when the selected photo changes
useEffect(() => {
  if (onPhotoChange && selectedPhoto) {
    onPhotoChange(selectedPhoto);
  }
}, [selectedPhoto, onPhotoChange]);
```

### 3. Photo Count Display Fix

**Files:**
- `src/features/presentation/components/PhotoLayer/PhotoModal.jsx`

**Changes:**
- Fixed the photo count display to show the correct index when navigating
- Used the actual index in the array rather than reordering the photos
- Added debug logging to track index changes

```javascript
{/* Photo count (right side) */}
<Typography variant="caption" color="white" sx={{ px: 1 }}>
  {selectedIndex + 1} / {localPhotos.length}
</Typography>
```

## Results

The enhanced photo viewing experience now provides:

1. Photos ordered by route number and kilometer position
2. Proper highlighting of the current photo marker on the map
3. Accurate photo count display during navigation (e.g., "18 / 47")
4. Smooth navigation between photos with keyboard support
5. Route and kilometer information displayed for each photo

These improvements make the photo viewing experience more intuitive and organized, helping users better understand the spatial relationships between photos along the routes.
