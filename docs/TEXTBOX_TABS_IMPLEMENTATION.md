# Textbox Tabs Implementation

TEXTBOX TABS FEATURE IS FOR CREATION MODE ONLY

## Original Plan

### Overview
The goal is to create a new sidebar component called "Textbox Tabs" that works similarly to the existing sidebar but with enhanced customization options. This feature will allow users to create and manage tabs with directional pointers, icons, and text.

### Component Architecture
1. **TextboxTabsContext**
   - Manage the state of all tabs
   - Provide methods for adding, editing, and removing tabs
   - Store tab properties (text, icon, pointer direction, color)

2. **TextboxTabsDrawer**
   - Main container component that displays in the sidebar
   - Persistent drawer similar to other sidebar components
   - Contains list of existing tabs and controls for managing them

3. **TextboxTab**
   - Individual tab component with customizable pointer
   - Renders the tab with text, icon, and pointer in specified direction
   - Handles click events and visual feedback

4. **TextboxTabsCreator**
   - Interface for creating and editing tabs
   - Form with fields for text, icon selection, and pointer direction
   - Preview of the tab being created/edited

5. **Supporting Components**
   - DirectionSelector: UI for selecting pointer direction
   - ColorSelector: UI for selecting tab background color
   - IconSelector: UI for browsing and selecting icons

### Features
1. **Tab Creation and Management**
   - Create new tabs with custom properties
   - Edit existing tabs
   - Delete tabs
   - Reorder tabs (optional)

2. **Pointer Customization**
   - 8 directional options:
     - Cardinal directions: up, right, down, left
     - Diagonal directions: top-right, top-left, bottom-right, bottom-left
   - Pointer size and style consistent with the tab design

3. **Visual Customization**
   - Text content customization
   - Icon selection from available icon library
   - Background color selection
   - Consistent styling with the application's design system

4. **Integration**
   - Seamless integration with the existing sidebar
   - Consistent behavior with other sidebar components
   - Accessible through a dedicated sidebar icon

### Technical Implementation
1. **State Management**
   - Use React Context API for global state management
   - Store tabs data in a structured format
   - Persist tabs data (localStorage or backend)

2. **Styling**
   - Use Material-UI for consistent styling
   - Custom styled components for specialized UI elements
   - CSS for pointer rendering using pseudo-elements

3. **User Experience**
   - Intuitive UI for tab creation and management
   - Real-time preview of tabs during creation/editing
   - Smooth animations for drawer opening/closing

## Overview
The Textbox Tabs feature is a new sidebar component that allows users to create and manage tabs with pointers. These tabs can be positioned with pointers in various directions (up, down, left, right, and diagonal positions). Users can customize these tabs with icons and text.

## Components Created
1. **TextboxTabsContext.jsx** - Context provider for managing tabs state
2. **TextboxTabsDrawer.jsx** - Main drawer component for displaying and managing tabs
3. **TextboxTabsDrawer.styles.js** - Styled components for the drawer UI
4. **TextboxTabsCreator.jsx** - Component for creating and editing tabs
5. **TextboxTab.jsx** - Component for rendering individual tabs
6. **DirectionSelector.jsx** - Component for selecting pointer direction
7. **ColorSelector.jsx** - Component for selecting tab background color
8. **IconSelector.jsx** - Component for selecting tab icons
9. **index.js** - Export file for the components

## Implementation Status
1. ✅ Added an icon/button to the creation mode sidebar to open the TextboxTabsDrawer
2. ✅ Added the TextboxTabsDrawer component to the Sidebar.js
3. ❌ Removed the TextboxTabs functionality from the presentation mode sidebar
4. ✅ Connected the TextboxTabs context to the sidebar components

## Current Status
- ✅ Created all necessary components for the Textbox Tabs feature
- ✅ Fixed import issues and renamed files to use .jsx extension where needed
- ✅ Resolved naming conflicts (renamed IconButton to StyledIconButton)
- ✅ Integrated into the creation mode sidebar as an icon/button
- ✅ Removed TextboxTabs from presentation mode as requested
- ❌ Not yet fully tested in the application
- ❌ Known issue: Drawer toggle functionality is not working correctly - when clicking the icon on the sidebar, it opens, but clicking it again doesn't close it properly. Also, when clicking a different icon on the sidebar, the drawer doesn't close and then the other one open.

## Recent Updates (March 2025)
1. **Icon Selection Improvements**
   - ✅ Updated the IconSelector component to use a curated list of 50 popular Lucide icons
   - ✅ Directly imported icons from the lucide-react package
   - ✅ Organized icons into logical categories for easier browsing

2. **Color Palette Enhancements**
   - ✅ Removed one of the yellow colors (CAT3_CLIMB) to reduce redundancy
   - ✅ Added a WHITE color option to the palette
   - ✅ Updated the ColorSelector component to reflect these changes

3. **Text Contrast Improvements**
   - ✅ Modified the Tab component to use black text when the background is white
   - ✅ Updated the icon color to also be black when displayed on a white background
   - ✅ Ensured proper contrast and readability for all tab color options

4. **Drawer Functionality Issues**
   - ❌ Attempted to fix the drawer toggle functionality but the issue persists
   - ❌ The drawer doesn't close properly when clicking the icon again
   - ❌ When clicking a different icon, the drawer doesn't close before opening the new one

5. **Map Integration (March 2025)**
   - ✅ Added ability to drag and place textbox tabs on the map
   - ✅ Created MapboxTextboxTabMarker.jsx component to render tabs on the map
   - ✅ Created DraggableTextboxTabsLayer.jsx to manage tabs on the map
   - ✅ Enhanced TextboxTabsDrawer with drag functionality
   - ✅ Added visual indicator in the drawer for tabs that are placed on the map
   - ✅ Updated TextboxTabsContext with methods for tab positioning
   - ✅ Integrated with MapView component to display tabs on the map
   - ✅ Made tabs draggable after placement for repositioning
   - ✅ Ensured tabs maintain their styling (colors, icons, pointers) when placed on map

## Next Steps
1. ✅ Simplify the UI workflow by removing the initial "Textbox Tabs" list drawer
2. ✅ Make tabs immediately draggable after creation
3. ✅ Fix the issue with tabs staying on cursor after placement
4. ✅ Fix the issue with tabs moving when zooming in and out
5. ✅ Fix the issue with tabs snapping back to their original position after zooming or scrolling
6. ❌ Fix the issue with icons not being passed correctly to the preview and placed tabs
7. Test the map integration to ensure tabs are properly positioned and styled
8. Add persistence for tab positions on the map
9. Consider adding clustering for tabs when many are placed in the same area

## Recent Updates (March 2025)
1. **Fixed Zoom Movement Issue**
   - ✅ Analyzed the photo marker implementation which was working correctly
   - ✅ Changed the marker anchor from 'bottom' to 'center' in MapboxTextboxTabMarker.jsx
   - ✅ Updated CSS to apply scaling directly to the container with explicit transform values
   - ✅ Moved the data-zoom attribute from the container to the marker element
   - ✅ Set transform-origin to 'center center' for both marker and container
   - ✅ Updated TextboxTabDragPreview.jsx for consistency with these changes
   - ✅ Tabs now remain fixed in position when zooming in and out, like POI markers

## Previous Attempts (March 2025)
1. **Initial Attempts for Zoom Movement Issue**
   - Attempted to change the marker anchor from 'center' to 'bottom' in MapboxTextboxTabMarker.jsx
   - Created CSS file with zoom-based scaling rules similar to POI markers
   - Added a zoom event listener to update a data-zoom attribute on the tab container
   - These initial changes were insufficient to fix the issue

2. **Attempted Fixes for Icon Display Issue**
   - Updated both MapboxTextboxTabMarker.jsx and TextboxTabDragPreview.jsx to use a simpler approach for rendering icons
   - Attempted to use SVG's `<use>` element to reference icon IDs, similar to POI markers
   - Encountered issues with the implementation, as icons are still not displaying correctly
   - More time is needed to properly analyze and understand the POI marker implementation

3. **Offset Implementation**
   - The existing offset calculations in TextboxTabDragPreview.jsx were maintained
   - These offsets help ensure the tab is placed with the pointer pointing to the exact location where the user clicked
   - This functionality appears to be working correctly

Note: Due to time constraints and the complexity of the existing codebase, we were unable to fully resolve the zoom movement and icon display issues. A more thorough analysis of the POI marker implementation is needed to properly understand and replicate their behavior for the textbox tabs.

## Technical Notes
- The TextboxTabsDrawer is designed to work similarly to the existing sidebar components
- The tabs can be customized with different pointer directions, colors, and icons
- The component uses Material-UI for styling and components
- The tabs are managed through a context provider for state management
- The IconSelector now uses a curated list of popular Lucide icons with automatic categorization
- Text and icon colors automatically adjust based on background color for optimal readability

## Recent Updates (March 2025)
1. **UI Workflow Simplification**
   - ✅ Removed the initial "Textbox Tabs" list drawer
   - ✅ Now shows the "Create Textbox Tab" drawer directly when clicking the sidebar icon
   - ✅ Made tabs immediately draggable after creation
   - ✅ Fixed issue with tabs staying on cursor after placement

2. **Implementation Changes**
   - ✅ Modified TextboxTabsDrawer.jsx to skip the 'list' mode and go directly to 'create' mode
   - ✅ Updated TextboxTabsCreator.jsx to remove the edit functionality and simplify the UI
   - ✅ Added stopDragging() call to DraggableTextboxTabsLayer.jsx to properly clean up after tab placement
   - ✅ Simplified the workflow to create and place tabs in a single step

## Recent Updates (March 2025) - Drag Interaction Fixes
1. **Fixed Tab Dragging Issues**
   - ✅ Fixed issue with tabs getting a white border when moved
   - ✅ Fixed issue with tabs snapping back to original position on first drag attempt
   - ✅ Fixed issue with tab pointer changing position unexpectedly
   - ✅ Fixed interaction issues between tabs when placing multiple tabs

2. **Implementation Details**
   - ✅ Added proper drag lifecycle handling to MapboxTextboxTabMarker.jsx
   - ✅ Implemented dragstart, drag, and dragend event handlers
   - ✅ Added state tracking to distinguish between clicks and drags
   - ✅ Modified click handler to only trigger if marker wasn't being dragged
   - ✅ Ensured tabs only move when they're actually dragged
   - ✅ Matched the implementation approach used in POI markers

## Recent Updates (March 2025) - Fixed Position Persistence Issue
1. **Fixed Tab Position Persistence Issue**
   - ✅ Fixed issue with tabs snapping back to their original position after zooming or scrolling the map
   - ✅ Tabs now maintain their position correctly after being dragged and during map interactions
   - ✅ Improved synchronization between visual marker position and state coordinates

2. **Implementation Details**
   - ✅ Modified DraggableTextboxTabsLayer.jsx to pass the tab object to the handleTabDragEnd function
   - ✅ Updated MapboxTextboxTabMarker.jsx to directly update the tab object's coordinates
   - ✅ Enhanced TextboxTabsContext.jsx to create deep copies of coordinates to prevent reference issues
   - ✅ Added logging for better debugging of tab position updates
   - ✅ Improved the state update mechanism to ensure proper re-rendering after position changes
   - ✅ Aligned implementation with the POI marker system which was working correctly

## Recent Updates (March 2025) - Fixed Shadow/Duplicate Effect Issue
1. **Fixed Shadow/Duplicate Effect Issue**
   - ✅ Fixed issue with tabs showing a shadow/duplicate effect when zooming out
   - ✅ Identified that the issue was related to Mapbox GL's marker handling system
   - ✅ Tabs now display correctly at all zoom levels without any visual artifacts

2. **Root Cause Analysis**
   - ✅ Discovered that Mapbox GL uses the `poi-marker` class to identify and handle markers during zoom operations
   - ✅ When we changed the class name from `poi-marker` to `textbox-tab-marker`, we broke that connection
   - ✅ This caused the tab and its shadow to be scaled differently during zoom operations, creating the visual artifact

3. **Implementation Details**
   - ✅ Added back the `poi-marker` class while keeping our custom `textbox-tab-marker` class
   - ✅ Modified MapboxTextboxTabMarker.jsx to use both classes: `el.className = 'poi-marker textbox-tab-marker ${selected ? 'selected' : ''}'`
   - ✅ This maintains the connection to Mapbox's internal handling while keeping our custom styling
   - ✅ No duplicate styling issues occur because we don't have a `.poi-marker` definition in our CSS file

## Recent Updates (March 2025) - Fixed Visibility at Low Zoom Levels
1. **Fixed Tab Visibility at Low Zoom Levels**
   - ✅ Fixed issue with tabs still being visible when zoomed out too far
   - ✅ Implemented component-level visibility control based on zoom level
   - ✅ Tabs now completely disappear when zoomed out to level 4 or less
   - ✅ This provides a cleaner map view at lower zoom levels

2. **Implementation Details**
   - ✅ Added zoom level tracking to DraggableTextboxTabsLayer.jsx
   - ✅ Implemented conditional rendering to return null when zoom level is 4 or less
   - ✅ Added backup marker-level visibility control in MapboxTextboxTabMarker.jsx
   - ✅ Used a dual-layer approach to ensure tabs are completely hidden at low zoom levels
   - ✅ Added detailed logging to help debug zoom-related visibility issues

## Recent Updates (March 2025) - Modal Implementation Issues
1. **Modal Implementation Challenges**
   - ❌ Attempted to implement a modal view for textbox tabs when placed on the map
   - ❌ Tried to match the POI modal implementation from PresentationPOIViewer.js
   - ❌ Facing issues with getting the modal to open in edit mode when a tab is first placed

2. **Implementation Details**
   - ✅ Created TextboxTabViewer.jsx component to handle both drawer and modal display modes
   - ✅ Added isEditingInitial prop to TextboxTabViewer to control initial editing state
   - ✅ Modified DraggableTextboxTabsLayer.jsx to track newly placed tabs
   - ❌ Having issues with the state tracking for newly placed tabs
   - ❌ The modal appears but doesn't automatically enter edit mode when a tab is first placed
   - ❌ The draggedTab reference is lost after stopDragging() is called, making it difficult to determine if a tab was just placed

3. **Attempted Solutions**
   - Added justPlacedTabId state variable to track the ID of newly placed tabs
   - Created handleCloseModalWithReset function to reset the justPlacedTabId when modal is closed
   - Updated isEditingInitial condition to check if modalTab.id === justPlacedTabId
   - These changes have not fully resolved the issue
   
4. **Key Differences from POI Implementation**
   - The POI implementation doesn't have a special handling for automatically entering edit mode for newly placed POIs
   - The POIViewer component initializes isEditing to false and doesn't have a prop to set it initially to true
   - Our TextboxTabViewer component has an isEditingInitial prop, but the state tracking for newly placed tabs is not working correctly
   - The draggedTab reference is lost after stopDragging() is called in handlePlaceTab, making it difficult to determine if a tab was just placed
