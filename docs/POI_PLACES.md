# Place POI Implementation Guide

## Overview
This feature adds the ability to attach POIs to place names (cities, towns, villages) on the map. This is NOT a new drawer - it is implemented as a new mode within the existing POI drawer system.

```
User Flow:
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Existing      │     │   Click "Add    │     │  Drawer shows   │
│   POI Drawer    │ --> │  POI to Place"  │ --> │   hover over    │
│    opens        │     │     option      │     │  instructions   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                              │
         │                                              v
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   POIs appear   │     │   Select POI    │     │   Hover over    │
│   above place   │ <-- │     icons       │ <-- │   place name    │
│     name        │     │                 │     │   on map        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Implementation Status

### Completed
1. ✓ Added place detection utilities (placeDetection.ts)
2. ✓ Created PlacePOIInstructions component
3. ✓ Updated POIDrawer to handle place POI mode
4. ✓ Created PlacePOILayer component and styles
5. ✓ Integrated PlacePOILayer into MapView
6. ✓ Added support for place POIs in POIContext
7. ✓ Added POI positioning system for arranging POIs above place names

### Status Update
✓ Place name hover detection is now working with a white halo highlight effect
✓ Clicking a place name updates the drawer to show POI icon selection

### Next Steps
1. Create a dedicated place POI icon selection drawer that:
   - Allows selecting multiple icons at once
   - Uses white icons with dark shadows (no bubbles)
   - Positions icons above place names
2. Add POI removal capability
3. Add place-specific POI categories
4. Improve mobile responsiveness
5. Add POI clustering at lower zoom levels

## Integration Points
This feature integrates with the existing POI system in several ways:

1. **Mode Selection**
   - Lives within the existing POI drawer
   - Added as a new mode option alongside existing modes
   - Uses the same POIModeSelection component

2. **UI States**
   ```
   POI Drawer
   ├── Mode Selection
   │   ├── ADD_POI (existing)
   │   ├── EDIT_POI (existing)
   │   ├── ADD_POI_TO_PLACE (new) <-- Our new mode
   │   └── VIEW_POI (existing)
   │
   └── Content Area
       ├── If ADD_POI_TO_PLACE selected:
       │   ├── If no place hovered: Show instructions
       │   └── If place hovered: Show icon selection
       └── Other modes: Existing content
   ```

3. **Component Reuse**
   - Reuses existing POIIconSelection component
   - Shares POI context and state management
   - Uses same icon set and styling patterns

## CSS Styling
The following styles ensure proper POI display:

```css
.place-poi-marker {
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.place-poi-marker .poi-icon {
  color: #FFFFFF;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  width: 100%;
  height: 100%;
}
```

## Notes
- Place POIs use a distinct styling:
  - White icons with dark shadows
  - No bubble backgrounds
  - Non-interactive (pointer-events: none)
  - Positioned above place names
- Hover highlight:
  - White halo effect around place names
  - Scales with zoom level for better visibility
  - Cursor changes to pointer on hover
- Position calculations account for map zoom level
- Performance considerations for many place POIs
- Proper cleanup of markers when unmounting

## Important Implementation Notes
1. This is NOT a new drawer - it's a mode within the existing POI drawer
2. All UI components should maintain consistency with existing POI drawer styles
3. Reuse existing components where possible (POIIconSelection, etc.)
4. The feature activates only when "ADD POI to PLACE" is selected in the mode selector
5. The drawer content switches between instructions and icon selection based on place hover state
6. All state management happens through the existing POI context
