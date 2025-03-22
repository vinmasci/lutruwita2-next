# Line Marker Implementation Progress

## Implementation Status

### Completed
1. Created LineContext for state management:
   - Added state for isDrawing, lines, selectedLine, and currentLine
   - Added functions for addLine, updateLine, deleteLine, and updateLineCoordinates
   - Set up LineProvider component

2. Updated MapView component:
   - Added LineProvider wrapper around MapViewContent
   - Integrated LineContext into MapViewContent
   - Added LineLayer to map layers

3. Updated Sidebar components:
   - Added line drawing mode to useSidebar hook
   - Added handleAddLine function
   - Updated SidebarListItems to handle line drawing mode

4. Added CSS styles for line markers:
   - Styled circle markers with white fill and black stroke
   - Added styles for line elements
   - Added styles for text and icon containers

5. Enhanced marker design and text display:
   - Implemented bullseye marker design with inner black circle
   - Added text scaling based on zoom level for consistent appearance
   - Implemented proportional gap scaling between text and line
   - Optimized text positioning with right alignment
   - Reduced text size for better readability

6. Fixed marker positioning and text display issues:
   - Replaced DOM-based circle markers with Mapbox GL layers to prevent vertical shifting
   - Modified text marker creation logic to persist when drawer opens
   - Improved cleanup and event handling for consistent behavior

7. Improved line drawing behavior and styling (March 2025):
   - Modified line drawing to ensure lines always come out at 180 degrees from the marker
   - Replaced transparent icon containers with white box containers
   - Implemented more square icon boxes with small radial edges
   - Added subtle shadow for depth and improved visual appearance
   - Changed icon color to black for better contrast against white background
   - Optimized spacing between icon boxes for a cleaner look
   - Improved text and icon scaling behavior at different zoom levels
   - Added semi-transparent styling for text (0.5 opacity) and icon boxes (0.8 opacity)
   - Made line, text, and icons all clickable to open the drawer

8. Implemented MongoDB integration for line markers (March 2025):
   - Added MongoDB persistence for line markers similar to POI implementation
   - Integrated with RouteContext to save line data when route is saved
   - Modified LineContext to notify RouteContext of line changes
   - Added getPOIsForRoute-style function to format line data for MongoDB storage
   - Ensured line markers are properly loaded from saved routes
   - Fixed JSX syntax in MapView.js by converting to standard React.createElement calls
   - Added null checks for dragPreview, selectedPOIDetails, and selectedPOI to prevent errors

9. Fixed line data saving and loading issues (March 2025):
   - Added detailed logging to track line data through the save/load process
   - Confirmed line data is correctly saved to MongoDB
   - Enhanced LineContext's loadLinesFromRoute function with validation
   - Improved RouteContext's handling of line data during loading
   - Added more robust error handling for line data processing

### Current Issues & Solutions

1. Line Layer ID Issues:
   - Problem: Line layer IDs were undefined during initial drawing
   - Solution: Generate unique IDs using timestamp for new lines
   - Implementation: `lineLayerId.useRef(line.id ? `line-${line.id}` : `line-${Date.now()}`)` 

2. Layer Cleanup:
   - Problem: Layer removal order causing errors
   - Solution: Implemented proper cleanup order (glow layer → main layer → source)
   - Added cleanup function to handle removal in correct sequence

3. Line Drawing Behavior:
   - Initial Implementation: Using GeoJSON source with constant updates
   - Current Approach: Optimized layer management and update cycles
   - Separated layer lifecycle from updates to prevent re-renders
   - Added proper cleanup to prevent layer/source conflicts
   - Implemented requestAnimationFrame for smooth coordinate updates
   - Removed unnecessary viewport-relative positioning
   - Enforced straight line drawing at 180 degrees from marker

4. Text Scaling and Positioning:
   - Problem: Text size and gap remained fixed when zooming, causing visual inconsistency
   - Solution: Implemented dynamic scaling for both text size and gap
   - Added zoom event listener to update text size and marker offset
   - Used consistent scaling formula for both text and gap
   - Implemented proper cleanup of event listeners
   - Increased base font size and adjusted scaling parameters for better readability

5. Marker Positioning Issues:
   - Problem: Page shifting up the size of the navbar when adding a line component
   - Root Cause: DOM-based markers affected by page's scaling system, while map-rendered lines were not
   - Solution: Replaced DOM-based circle markers with Mapbox GL layers rendered directly on the map canvas
   - Trade-off: Lost dragging functionality that was built into Mapbox's DOM-based markers
   - Implementation: Added circle layers with proper styling to match original marker design

6. Text Disappearing Issues:
   - Problem: Text disappearing when clicking on a marker and the drawer opens
   - Root Cause: Text marker being removed unnecessarily when the drawer opens
   - Solution: Modified text marker creation logic to only check if coordinates exist, not requiring line.name
   - Implementation: Only create/update text marker if line.name exists, but don't remove it when drawer opens
   - Added custom property `_lineName` to the marker reference to track the current line name
   - Modified the condition to check for line name changes using this property
   - Added the `selected` prop to the dependency array to ensure the marker updates when the line is selected

7. Icon Styling Improvements:
   - Problem: Icons were difficult to see and lacked visual consistency
   - Solution: Implemented white box containers with black icons
   - Added subtle shadow and small border radius for a modern look
   - Adjusted icon sizing and spacing for better visual hierarchy
   - Implemented consistent scaling behavior for both icons and text

8. MongoDB Integration Issues:
   - Problem: JSX syntax in .js files causing errors
   - Solution: Converted JSX syntax to standard React.createElement() calls in MapView.js
   - Added null checks for objects that might be null to prevent runtime errors
   - Implemented similar pattern to POI context for saving and loading line data

9. Line Data Loading Issues (March 2025):
   - Problem: Line data was being saved to MongoDB but not loaded correctly
   - Root Cause: The loadLinesFromRoute function was not being properly called or was missing data validation
   - Solution: Added detailed logging throughout the data flow to track the line data
   - Enhanced error handling in the loadLinesFromRoute function
   - Improved the RouteContext's handling of line data during route loading
   - Added validation to ensure line data structure is correct before processing

### Recent Debugging and Fixes (March 2025)

We've identified and fixed several issues with the line marker implementation:

1. **Data Flow Tracing**:
   - Added comprehensive logging to track line data through the entire save/load process
   - Confirmed line data is correctly saved to MongoDB with proper structure
   - Verified the data is included in the API response when loading a route

2. **LineContext Enhancements**:
   - Improved the getLinesForRoute function with better validation and logging
   - Enhanced the loadLinesFromRoute function to handle edge cases and validate data
   - Added detailed logging to track line data processing

3. **RouteContext Improvements**:
   - Added logging to the loadRoute function to verify line data is received
   - Enhanced the handling of line data during route loading
   - Improved error handling for line data processing

4. **Data Validation**:
   - Added validation to ensure line data has the correct structure before processing
   - Implemented filtering to remove invalid line data
   - Added detailed error messages for debugging

5. **Error Handling**:
   - Improved error handling throughout the line marker implementation
   - Added try/catch blocks to prevent crashes
   - Enhanced error messages for easier debugging

6. **Creation Mode Line Loading Fix (March 2025)**:
   - Added DirectLineLayer component to bypass LineContext dependency issues
   - Modified MapView to include DirectLineLayer for loaded line data
   - Enhanced data normalization in DirectLineLayer to ensure consistent structure
   - Fixed photo handling in LineDrawer to work with both File objects and MongoDB data
   - Improved map layer cleanup in LineMarker with safer removal functions
   - Added defensive checks throughout to prevent type errors and undefined access
   - Implemented delayed cleanup to prevent timing issues with map layer removal

7. **Photo Handling Improvements**:
   - Added support for different photo data formats (File objects, URLs, and objects)
   - Implemented fallback image for failed photo loads
   - Enhanced error reporting for photo display issues
   - Added proper type checking and validation for photo data

8. **Line Disappearing Fix (March 2025)**:
   - Added `drawerOpen` prop to LineMarker component to prevent cleanup when drawer is open
   - Modified LineMarker cleanup function to skip layer removal when drawer is open for selected line
   - Increased cleanup timeout from 0ms to 100ms to ensure proper timing
   - Added additional safety checks in layer removal functions
   - Updated all line layer components to pass the drawerOpen state to LineMarker:
     - LineLayer (standard creation mode)
     - DirectLineLayer (loaded routes in creation mode)
     - PresentationLineLayer (presentation mode)
     - DirectPresentationLineLayer (direct presentation mode)
     - DirectEmbedLineLayer (embedded presentation mode)
   - Added more detailed logging during layer cleanup process

### Next Steps
1. Line Drawing Improvements:
   - Consider alternative rendering approaches for floating lines
   - Explore HTML Canvas or SVG overlays for non-terrain-following lines
   - Look into custom WebGL layers for advanced effects

2. Add line styling options:
   - Implement color selection
   - Add line thickness options
   - Consider adding line patterns/styles

3. Enhance line interaction:
   - Add hover effects
   - Improve selection feedback
   - Add line editing capabilities

4. Restore dragging functionality:
   - Implement custom dragging for map layers to restore the ability to drag circle markers
   - Ensure consistent positioning while maintaining drag-and-drop capabilities

## Technical Details

### Line Data Structure
```typescript
interface Line {
  id: string;
  coordinates: {
    start: [number, number];
    end: [number, number];
  };
  name?: string;
  description?: string;
  icons?: string[];
  photos?: File[];
}
```

### Component Structure
```
src/features/lineMarkers/
  ├── components/
  │   ├── LineMarker/
  │   │   ├── LineMarker.jsx        # Individual line marker
  │   │   ├── LineMarker.css        # Styles for markers
  │   ├── LineDrawer/
  │   │   ├── LineDrawer.jsx        # Drawer for line details
  │   │   ├── LineDrawer.css        # Drawer styles
  │   ├── LineLayer/
  │   │   ├── LineLayer.jsx         # Container for all lines
  ├── context/
  │   ├── LineContext.jsx           # State management
  ├── constants/
  │   ├── line-icons.js            # Available icons
```

### State Management
The LineContext provides:
- `isDrawing`: Boolean indicating if line drawing mode is active
- `lines`: Array of all line markers
- `currentLine`: Currently being drawn line
- `selectedLine`: Line being edited
- Functions for managing lines:
  - `addLine`
  - `updateLine`
  - `deleteLine`
  - `updateLineCoordinates`

### User Interaction Flow
1. User clicks "Add Line" button in sidebar
2. Drawing mode is activated
3. First click places start marker
4. Mouse movement shows preview line
5. Second click places end marker
6. Drawer opens for entering details
7. User enters name, description, selects icons, and can add photos
8. Line is saved and added to map
9. User can click on the line, text, or icons to reopen the drawer and edit details

### Styling
Line markers use CSS for styling:
- White circle markers with black stroke and black bullseye center
- Thin white lines connecting markers
- Text labels rendered upright with right alignment
- Text and gap scaling based on zoom level for consistent appearance
- Icons positioned below text in white boxes with black icons
- Square icon boxes with small radial edges and subtle shadow

### Implementation Changes (March 2025)
1. **Circle Marker Implementation**:
   - Before: DOM-based markers using mapboxgl.Marker
   - After: Mapbox GL layers (circle type) rendered directly on the map canvas
   - Benefits: Consistent positioning, no vertical shifting when adding new lines
   - Trade-offs: Lost built-in dragging functionality

2. **Text Marker Handling**:
   - Before: Text marker removed when drawer opens, causing text to disappear
   - After: Text marker persists when drawer opens, only recreated when name changes
   - Implementation: Modified conditional logic to separate existence check from creation logic

3. **Line Drawing Behavior**:
   - Before: Lines could be drawn in any direction from the marker
   - After: Lines can be drawn to the left or right while maintaining a flat horizontal line
   - Implementation: Modified coordinate calculation in LineLayer component to keep y-coordinate constant but allow x-coordinate to vary
   - Added direction detection to adjust text alignment and icon positioning based on line direction
   - Text is right-aligned for lines going right and left-aligned for lines going left
   - Icons are positioned with appropriate anchoring based on line direction

4. **Icon Styling**:
   - Before: Icons displayed directly without containers
   - After: Icons displayed in white box containers with black icons
   - Implementation: Added bubble containers with styling for each icon
   - Benefits: Better visual hierarchy, improved contrast, consistent appearance

5. **Scaling Improvements**:
   - Before: Aggressive scaling that made elements too small at outer zoom levels
   - After: More balanced scaling with larger minimum sizes
   - Implementation: Adjusted base sizes, scaling factors, and minimum/maximum values
   - Benefits: Better readability at all zoom levels, more consistent appearance

6. **MongoDB Integration**:
   - Implementation: Added integration with RouteContext to save line data
   - Modified LineContext to notify RouteContext of line changes
   - Added functions to format line data for MongoDB storage
   - Fixed JSX syntax in MapView.js by converting to standard React.createElement calls
   - Added null checks for objects that might be null to prevent runtime errors
   - Used similar pattern to POI context for saving and loading line data

7. **Debugging Enhancements (March 2025)**:
   - Added comprehensive logging throughout the line marker implementation
   - Enhanced error handling and data validation
   - Improved the data flow between LineContext and RouteContext
   - Added detailed logging to track line data through the save/load process
