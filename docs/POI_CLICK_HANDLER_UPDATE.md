# POI Click Handler Update

## Changes Made

The click handlers in `PlacePOILayer.tsx` have been modified to ensure POI icons point to the same drawer as their underlying placename. The key changes were:

1. Removed code that was creating new places when clicking icons
2. Modified click handlers to use `getPlaceLabelAtPoint` to get the underlying placename
3. Only open the drawer if there's an existing place, using the same place data

This ensures that icons and placenames are treated as a single unified component.

## Current Issue

The edit functionality in the drawer is not working properly after these changes. When trying to edit a place's description or photos, the changes are not being persisted.

### Next Steps

1. Investigate the edit functionality in `PlacePOIDetailsDrawer.tsx`
2. Fix the save/update mechanism to ensure changes are properly persisted
3. Test the full flow:
   - Click POI icon
   - Open drawer
   - Edit description
   - Save changes
   - Verify changes persist when reopening drawer

This will complete the unification of POI icons and placenames, ensuring both the viewing and editing functionality works correctly.
