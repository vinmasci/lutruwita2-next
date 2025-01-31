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

### Known Issues
- Place name hover detection is not working yet. This affects the ability to detect when the user hovers over a place name on the map. The implementation is using the correct Mapbox layer ('settlement-label') but may need additional debugging.

### Next Steps
1. Fix place name hover detection in POIDrawer.tsx
2. Test and verify place label layer interaction
3. Add POI removal capability
4. Implement POI hover effects
5. Add place-specific POI categories
6. Improve mobile responsiveness
7. Add POI clustering at lower zoom levels

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
- All POIs added to places should be white for visibility
- POIs should be non-interactive (pointer-events: none)
- Position calculations should account for map zoom level
- Consider performance with many place POIs
- Ensure proper cleanup of markers when unmounting

## Important Implementation Notes
1. This is NOT a new drawer - it's a mode within the existing POI drawer
2. All UI components should maintain consistency with existing POI drawer styles
3. Reuse existing components where possible (POIIconSelection, etc.)
4. The feature activates only when "ADD POI to PLACE" is selected in the mode selector
5. The drawer content switches between instructions and icon selection based on place hover state
6. All state management happens through the existing POI context
