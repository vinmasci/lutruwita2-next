# Photo Viewer Enhancements in Creation Mode

## Overview

This document outlines the implementation of photo viewer enhancements from presentation mode into creation mode. The primary goals are to:

1. Highlight the currently selected photo marker on the map
2. Improve the visual quality and layout of the photo modal
3. Add 3D perspective to the map when viewing photos
4. Implement smooth navigation between photos
5. Order photos by route number and kilometer position

## Implementation Plan

### 1. Photo Marker Highlighting

**Files to Modify:**
- `src/features/photo/components/PhotoLayer/PhotoLayer.js`

**Changes Needed:**
- Update the PhotoLayer component to pass the `isHighlighted` prop to PhotoMarker based on the selected photo
- Ensure the highlighted marker is properly toggled when navigating between photos

```javascript
// In PhotoLayer.js
// Add a state variable to track the selected photo
const [selectedPhoto, setSelectedPhoto] = useState(null);

// When rendering photo markers
{photos.map(photo => (
  <PhotoMarker
    key={photo.url}
    photo={photo}
    onClick={() => handlePhotoClick(photo)}
    isHighlighted={selectedPhoto && selectedPhoto.url === photo.url}
  />
))}

// Update the handlePhotoClick function
const handlePhotoClick = (photo) => {
  setSelectedPhoto(photo);
  // Other existing code...
};
```

### 2. Photo Modal Improvements

**Files to Modify:**
- `src/features/photo/components/PhotoPreview/PhotoModal.jsx`

**Changes Needed:**
- Increase the modal size from 300px to 600px width
- Increase the image container height from 200px to 400px
- Reposition the modal to the right side of the screen (75% from left)
- Change image display from `objectFit: 'contain'` to `objectFit: 'cover'` to fill the modal without black space
- Improve the loading of high-quality images by prioritizing full-size images

```jsx
// In PhotoModal.jsx
<Paper
  elevation={8}
  sx={{
    position: 'fixed',
    top: '40%',
    left: '75%', // Position further to the right
    transform: 'translate(-50%, -50%)',
    width: 600, // Increase from 300px
    maxWidth: '90vw',
    zIndex: 9999,
    overflow: 'hidden',
    borderRadius: 2,
    bgcolor: 'background.paper',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
  }}
>
  {/* Image container */}
  <Box
    sx={{
      height: 400, // Increase from 200px
      width: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    <img
      src={photo.url}
      alt={photo.caption || 'Photo'}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover' // Change from 'contain'
      }}
    />
  </Box>
</Paper>
```

### 3. 3D Map Perspective

**Files to Modify:**
- `src/features/photo/components/PhotoPreview/PhotoModal.jsx`

**Changes Needed:**
- Add a 60-degree pitch to the map when viewing photos
- Implement smooth transitions when panning to photo locations
- Add code to restore the map to a flat view when closing the photo modal

```jsx
// In PhotoModal.jsx
// Import useEffect and useContext
import React, { useState, useEffect, useContext } from 'react';
import { MapContext } from '../../../map/context/MapContext';

// Inside the component
const { map } = useContext(MapContext);

// Pan to the photo and add 3D perspective when the modal opens
useEffect(() => {
  if (map && photo && photo.coordinates) {
    map.easeTo({
      center: [photo.coordinates.lng, photo.coordinates.lat],
      zoom: map.getZoom(), // Maintain current zoom level
      pitch: 60, // Add a 60-degree pitch
      duration: 800 // Smooth transition
    });
  }
  
  // Restore pitch to 0 when component unmounts
  return () => {
    if (map) {
      map.easeTo({
        pitch: 0,
        duration: 500
      });
    }
  };
}, [map, photo]);
```

### 4. Photo Navigation

**Files to Modify:**
- `src/features/photo/components/PhotoPreview/PhotoModal.jsx`
- `src/features/photo/components/PhotoLayer/PhotoLayer.js`

**Changes Needed:**
- Add support for navigating between photos using arrow keys
- Implement smooth map panning when navigating between photos
- Update the highlighted marker when navigating between photos

```jsx
// In PhotoModal.jsx
// Add state for tracking the current photo index
const [selectedIndex, setSelectedIndex] = useState(0);
const [localPhotos, setLocalPhotos] = useState([]);

// Initialize with props
useEffect(() => {
  if (additionalPhotos && additionalPhotos.length > 0) {
    setLocalPhotos(additionalPhotos);
    // Find the index of the current photo
    const index = additionalPhotos.findIndex(p => p.url === photo.url);
    setSelectedIndex(index >= 0 ? index : 0);
  }
}, [additionalPhotos, photo]);

// Navigation functions
const handleNext = () => {
  if (selectedIndex < localPhotos.length - 1) {
    const nextIndex = selectedIndex + 1;
    setSelectedIndex(nextIndex);
    const nextPhoto = localPhotos[nextIndex];
    
    // Update the parent component's selected photo
    if (onPhotoChange) {
      onPhotoChange(nextPhoto);
    }
    
    // Pan to the next photo
    if (map && nextPhoto.coordinates) {
      map.easeTo({
        center: [nextPhoto.coordinates.lng, nextPhoto.coordinates.lat],
        duration: 500
      });
    }
  }
};

const handlePrev = () => {
  if (selectedIndex > 0) {
    const prevIndex = selectedIndex - 1;
    setSelectedIndex(prevIndex);
    const prevPhoto = localPhotos[prevIndex];
    
    // Update the parent component's selected photo
    if (onPhotoChange) {
      onPhotoChange(prevPhoto);
    }
    
    // Pan to the previous photo
    if (map && prevPhoto.coordinates) {
      map.easeTo({
        center: [prevPhoto.coordinates.lng, prevPhoto.coordinates.lat],
        duration: 500
      });
    }
  }
};

// Keyboard navigation
useEffect(() => {
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowRight':
        handleNext();
        break;
      case 'ArrowLeft':
        handlePrev();
        break;
      case 'Escape':
        onClose();
        break;
      default:
        break;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [handleNext, handlePrev, onClose]);

// Add navigation buttons to the UI
<Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
  <IconButton onClick={handlePrev} disabled={selectedIndex === 0}>
    <ArrowBackIcon />
  </IconButton>
  
  <Typography variant="caption">
    {selectedIndex + 1} / {localPhotos.length}
  </Typography>
  
  <IconButton onClick={handleNext} disabled={selectedIndex === localPhotos.length - 1}>
    <ArrowForwardIcon />
  </IconButton>
</Box>
```

### 5. Route-Based Photo Ordering

**Files to Modify:**
- `src/features/photo/components/PhotoLayer/PhotoLayer.js`

**Changes Needed:**
- Implement the algorithm to determine which route each photo belongs to
- Calculate the distance along the route for each photo
- Sort photos first by route index, then by distance along the route

```javascript
// In PhotoLayer.js
// Import useCallback and useContext
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { RouteContext } from '../../../map/context/RouteContext';

// Inside the component
const { currentRoute } = useContext(RouteContext);

// Function to get ordered photos
const getOrderedPhotos = useCallback((allPhotos) => {
  if (!allPhotos || allPhotos.length === 0) {
    return [];
  }
  
  // Get the current routes
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
        
        // Calculate distance between route point and photo
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

// Use the ordered photos when opening the photo modal
const handlePhotoClick = (photo) => {
  setSelectedPhoto(photo);
  
  // Get ordered photos for navigation
  const orderedPhotos = getOrderedPhotos(photos);
  
  // Open the photo modal with ordered photos
  // ...
};
```

## Expected Results

After implementing these enhancements, the creation mode photo viewer will provide:

1. Clear visual indication of which photo is currently being viewed through marker highlighting
2. Larger, higher-quality photo display with better positioning
3. Immersive 3D perspective when viewing photos
4. Smooth navigation between photos with keyboard support
5. Photos ordered by route number and kilometer position

These improvements will make the photo viewing experience in creation mode more intuitive and visually appealing, matching the enhanced experience already available in presentation mode.

## Implementation Status

- [x] Database migration to add caption fields to photos in routes
- [ ] Photo marker highlighting in creation mode
- [ ] Photo modal improvements in creation mode
- [ ] 3D map perspective in creation mode
- [ ] Photo navigation in creation mode
- [ ] Route-based photo ordering in creation mode

## Next Steps

1. Implement the photo marker highlighting in creation mode
2. Enhance the photo modal with improved styling and layout
3. Add 3D perspective to the map when viewing photos
4. Implement smooth navigation between photos
5. Add route-based photo ordering
6. Test all features thoroughly in creation mode
