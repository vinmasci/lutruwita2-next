# Clear Button Functionality

## Current Status

The "Clear" button in the AutoSavePanel component now has full functionality:

- ✅ Successfully clears the GPX routes from the map
- ✅ Successfully clears the climb markers (category flags) from the map
- ✅ Successfully clears the POIs (points of interest) from the map
- ✅ Successfully clears the line markers from the map

## Technical Details

When a user presses the "Clear" button, the following actions occur:

1. The auto-save data is deleted from Firebase
2. The `clearAutoSave()` function is called to reset the auto-save state in the context
3. The `clearCurrentWork()` function is called from RouteContext to reset the map state

The improved `clearCurrentWork()` function now:
- Resets all state variables in RouteContext
- Clears the route data from memory
- Removes the route layers from the map
- Properly removes climb markers using multiple approaches
- Clears POIs using the global registry to access the POIContext
- Removes line markers using the global registry to access the LineContext
- Aggressively removes all map layers and event handlers
- Resets the map style to ensure a complete cleanup

## Implementation Details

1. **Global Context Registry**: A global registry (`window.__contextRegistry`) has been implemented to allow direct access to context functions across components without creating circular dependencies.

2. **Climb Markers**: The `clearClimbCache()` function is now properly called using multiple approaches:
   - Direct access through the global registry
   - Direct module import as a fallback
   - DOM-based cleanup as a final fallback

3. **POIs and Line Markers**: Both POIContext and LineContext now register their clearing functions with the global registry, allowing RouteContext to access them directly.

4. **Extremely Aggressive DOM Cleanup**: For each component type (climb markers, POIs, lines), we now use multiple approaches to ensure complete cleanup:
   - Context-based cleanup through the global registry
   - Direct removal of DOM elements with specific class names
   - Removal of all mapboxgl-marker elements that contain component-specific elements
   - Removal of all map layers and sources that match component-specific patterns

5. **LineMarker Component Improvements**: The LineMarker component now always performs cleanup when unmounting, regardless of the line state (being drawn, saved, or selected).

6. **Map Reset**: A complete map reset approach is used that reinitializes the map instance while preserving the view state.

## Benefits

- **Complete Cleanup**: All map elements are now properly removed when the Clear button is pressed.
- **Improved User Experience**: Users now get a clean slate for new work after clearing.
- **Reduced Memory Usage**: Proper cleanup prevents memory leaks from orphaned map elements.
- **Better Coordination**: The improved architecture ensures better coordination between different contexts during cleanup operations.
- **Multiple Fallback Mechanisms**: The system now has multiple layers of fallback to ensure cleanup works even if primary methods fail.

## Future Considerations

- Consider implementing a more centralized event system for map-related operations.
- Monitor performance to ensure the clearing process remains efficient as the application grows.
- Add visual feedback during the clearing process for a better user experience.
- Consider implementing a more formal component registry system rather than using the global window object.
