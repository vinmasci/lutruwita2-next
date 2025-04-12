# Draggable Photos Implementation

## Overview

This document outlines the implementation plan for enhancing the photo upload functionality to support photos without GPS data. Currently, only photos with embedded GPS data can be added to the map. The enhancement will allow users to manually place photos without GPS data on the map as draggable markers.

## Current Functionality

1. Users can upload photos through the "Add GPS Photo" option in the sidebar
2. The system extracts GPS data from photos using the exifr library
3. Photos are displayed in a single grid with a green location icon indicating which ones have GPS data
4. Only photos with GPS data can be added to the map using the "Add to Map" button
5. Photos without GPS data are displayed but cannot be added to the map

## Proposed Enhancement

The enhancement will:

1. Split the photo grid into two sections:
   - Photos with GPS data (existing functionality)
   - Photos without GPS data (new section)
2. Add a new "Add as Draggable Markers" button for the non-GPS photos section
3. Allow users to drag and drop non-GPS photos onto the map
4. Visually distinguish manually placed photos with a blue outline (vs. green for GPS photos)
5. Keep manually placed photos draggable in creation mode
6. Add a flag to identify manually placed photos in the data structure

## Files to Modify

### 1. `src/features/photo/components/Uploader/PhotoUploaderUI.js`

This file handles the UI for the photo uploader. We need to:

- Split the photo grid into two sections
- Add a new button for adding non-GPS photos as draggable markers
- Add visual indicators to distinguish between GPS and non-GPS photos

### 2. `src/features/photo/components/Uploader/PhotoUploader.js`

This file handles the logic for the photo uploader. We need to:

- Add a new function `handleAddNonGpsPhotos` to handle adding photos without GPS data
- Implement the drag-and-drop functionality for non-GPS photos
- Add the `isManuallyPlaced` flag to photos placed manually

### 3. `src/features/photo/components/PhotoMarker/PhotoMarker.js`

This file handles the display of photo markers on the map. We need to:

- Add support for draggable photo markers
- Add visual styling (blue outline) for manually placed photos
- Implement drag event handlers

### 4. `src/features/photo/components/PhotoLayer/PhotoLayer.js`

This file manages the photo layer on the map. We need to:

- Update to handle draggable photo markers
- Add event listeners for drag events
- Update photo positions when dragged

### 5. `src/features/photo/context/PhotoContext.js`

This file provides the context for managing photos. We need to:

- Add support for the `isManuallyPlaced` flag
- Add a function to update photo coordinates when dragged
- Ensure the flag is persisted when saving routes

### 6. `src/features/map/components/MapView/MapView.js`

This file manages the map view. We need to:

- Add support for handling draggable photo markers
- Integrate with the existing drag-and-drop system

## Detailed Implementation Plan

### Phase 1: Data Structure Enhancement

1. Add `isManuallyPlaced` flag to the photo object structure
2. Update the PhotoContext to handle this new flag
3. Ensure the flag is persisted when saving routes

### Phase 2: UI Modifications

1. Update PhotoUploaderUI to separate photos into two sections
2. Add the new "Add as Draggable Markers" button for non-GPS photos
3. Add visual indicators (blue outline/icon) for manually placed photos

### Phase 3: Drag-and-Drop Functionality

1. Implement drag preview for non-GPS photos
2. Add drop handlers to place photos on the map
3. Update the PhotoMarker component to be draggable for manually placed photos

### Phase 4: Integration and Testing

1. Integrate with the existing POI drag-and-drop system
2. Test the functionality with various photo types
3. Ensure manually placed photos remain draggable after saving and reloading

## UI Changes

### Photo Uploader UI

The photo uploader will now have two sections:

```
+------------------------------------------+
| Photos with GPS Data (3)                 |
|                                          |
| [Add to Map]                             |
|                                          |
| +--------+  +--------+  +--------+       |
| |        |  |        |  |        |       |
| |  🖼️    |  |  🖼️    |  |  🖼️    |       |
| |    🟢  |  |    🟢  |  |    🟢  |       |
| +--------+  +--------+  +--------+       |
|                                          |
+------------------------------------------+
| Photos without GPS Data (2)              |
|                                          |
| [Add as Draggable Markers]               |
|                                          |
| +--------+  +--------+                   |
| |        |  |        |                   |
| |  🖼️    |  |  🖼️    |                   |
| |        |  |        |                   |
| +--------+  +--------+                   |
|                                          |
+------------------------------------------+
```

### Photo Markers

- Original GPS photos: Green location icon, standard marker
- Manually placed photos: Blue location icon, blue outline, draggable in creation mode

## Code Examples

### Adding the `isManuallyPlaced` Flag

```javascript
// In PhotoUploader.js
const handleAddNonGpsPhotos = () => {
  const photosWithoutGps = photos.filter(p => !p.hasGps);
  
  if (photosWithoutGps.length > 0) {
    // Mark these photos as manually placed
    const photosToAdd = photosWithoutGps.map(photo => ({
      ...photo,
      isManuallyPlaced: true
    }));
    
    // Set up for drag and drop
    setDragPreview({
      type: 'photo',
      photos: photosToAdd
    });
  }
};
```

### Updating PhotoMarker for Draggable Photos

```javascript
// In PhotoMarker.js
export const PhotoMarker = ({ photo, onClick, isHighlighted }) => {
  const { updatePhotoPosition } = usePhotoContext();
  const { map } = useMapContext();
  const [isDragging, setIsDragging] = useState(false);
  
  // Only allow dragging for manually placed photos in creation mode
  const isDraggable = photo.isManuallyPlaced;
  
  const handleDragEnd = (e) => {
    if (isDraggable) {
      const { lng, lat } = e.lngLat;
      updatePhotoPosition(photo.url, { lng, lat });
      setIsDragging(false);
    }
  };
  
  // Render marker with appropriate styling
  return (
    <Marker
      longitude={photo.coordinates.lng}
      latitude={photo.coordinates.lat}
      draggable={isDraggable}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
    >
      <div 
        className={`photo-marker ${isHighlighted ? 'highlighted' : ''} ${photo.isManuallyPlaced ? 'manually-placed' : ''}`}
        onClick={onClick}
      >
        <img src={photo.thumbnailUrl} alt={photo.name} />
      </div>
    </Marker>
  );
};
```

### Adding Styling for Manually Placed Photos

```css
/* In PhotoMarker.css */
.photo-marker.manually-placed {
  border: 2px solid #3498db; /* Blue border for manually placed photos */
}

.photo-marker.highlighted.manually-placed {
  border: 3px solid #3498db; /* Thicker blue border when highlighted */
}
```

## Benefits

1. **Enhanced Functionality**: Users can now add all photos to the map, regardless of GPS data
2. **Improved User Experience**: Clear visual distinction between original GPS photos and manually placed ones
3. **Flexibility**: Manually placed photos remain draggable, allowing for precise positioning
4. **Consistency**: Leverages existing drag-and-drop system for a familiar user experience

## Conclusion

This enhancement significantly improves the photo management capabilities of the application by allowing users to add any photo to the map, regardless of whether it contains GPS data. The implementation maintains the existing functionality while adding new capabilities in a way that is intuitive and visually clear to users.
