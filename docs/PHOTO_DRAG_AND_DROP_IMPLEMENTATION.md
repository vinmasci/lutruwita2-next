# Photo Drag and Drop Implementation

This document describes the implementation of the drag-and-drop functionality for photos without GPS data in the Lutruwita2 application.

## Current Issue

**Problem**: When clicking on a photo thumbnail in the "Photos without GPS data" section, the photo is not attaching to the cursor as expected. The photo should become fixed to the cursor so it can be dragged onto the map, but this is not happening.

**Possible Causes**:

1. The `dragPreview` state in the MapContext is not being properly set when a photo is clicked
2. The MapView component is not correctly rendering the PhotoDragPreview component when dragPreview is set
3. The PhotoDragPreview component is not correctly following the cursor
4. There might be a type mismatch in the dragPreview object structure between what's set and what's expected

**Potential Solutions**:

1. Add more detailed logging to trace the flow of the dragPreview state
2. Verify that the MapView component is correctly checking for the 'photo' type in the dragPreview object
3. Ensure the PhotoDragPreview component is being rendered in the correct position in the component tree
4. Check for any CSS issues that might be preventing the preview from being visible

## Overview

The drag-and-drop functionality allows users to click on a photo thumbnail in the "Photos without GPS data" section, which then attaches to the mouse cursor. The user can then move the cursor to the desired location on the map and click to place the photo at that exact location.

## Components

### 1. PhotoDragPreview

The `PhotoDragPreview` component is responsible for displaying a small preview of the photo that follows the mouse cursor. It also handles the placement of the photo on the map when the user clicks.

Key features:
- Follows the mouse cursor using mousemove event listeners
- Displays a small preview of the photo
- Handles click events to place the photo on the map
- Creates a deep copy of the photo with the new coordinates and isManuallyPlaced flag
- Dispatches a custom event to notify the PhotoUploader component that the photo has been placed

### 2. PhotoUploaderUI

The `PhotoUploaderUI` component is responsible for displaying the photos in the sidebar and handling the initial click on a photo to start the drag-and-drop process.

Key features:
- Displays photos with and without GPS data in separate sections
- Handles click events on photos without GPS data to start the drag-and-drop process
- Sets the dragPreview state in the MapContext when a photo is clicked

### 3. PhotoUploader

The `PhotoUploader` component is responsible for managing the photos in the sidebar and handling the removal of photos when they are placed on the map.

Key features:
- Listens for the photo-placed-on-map custom event
- Removes the photo from the sidebar when it is placed on the map
- Preserves the blob URLs when a photo is placed on the map to ensure the photo is displayed correctly

### 4. MapView

The `MapView` component is responsible for rendering the map and the drag preview component when a photo is being dragged.

Key features:
- Renders the PhotoDragPreview component when dragPreview state is set
- Clears the dragPreview state when a photo is placed on the map

## Implementation Details

### Drag and Drop Flow

1. User clicks on a photo thumbnail in the "Photos without GPS data" section
2. The `PhotoUploaderUI` component sets the dragPreview state in the MapContext
3. The `MapView` component renders the `PhotoDragPreview` component
4. The `PhotoDragPreview` component follows the mouse cursor
5. User clicks on the map to place the photo
6. The `PhotoDragPreview` component creates a copy of the photo with the new coordinates and isManuallyPlaced flag
7. The `PhotoDragPreview` component adds the photo to the map using the addPhoto function from the PhotoContext
8. The `PhotoDragPreview` component dispatches a custom event to notify the PhotoUploader component
9. The `PhotoUploader` component removes the photo from the sidebar
10. The `MapView` component clears the dragPreview state

### Preserving Blob URLs

One of the key challenges in implementing this functionality was preserving the blob URLs when a photo is placed on the map. When a photo is removed from the sidebar, the blob URLs are typically revoked to prevent memory leaks. However, when a photo is placed on the map, we need to preserve the blob URLs so that the photo can be displayed correctly.

To solve this issue, we added an `isBeingPlacedOnMap` flag to the `handleFileDelete` function in the `PhotoUploader` component. When this flag is set, the blob URLs are not revoked.

### Deep Copying Photos

Another challenge was ensuring that all properties of the photo object are preserved when it is placed on the map. This includes the blob URLs, but also other properties like the caption and isManuallyPlaced flag.

To solve this issue, we implemented a deep copy of the photo object in the `PhotoDragPreview` component, explicitly preserving all important properties.

## Future Improvements

- Add visual feedback when a photo is being dragged, such as a highlight or shadow
- Add the ability to cancel a drag operation by pressing the Escape key
- Add the ability to drag multiple photos at once
- Add the ability to drag photos from the file system directly onto the map
- Fix the current issue with the photo not attaching to the cursor when clicked
