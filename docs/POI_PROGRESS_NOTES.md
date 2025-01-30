# POI Implementation Progress Notes

## Current Status

We've implemented the core POI drawer functionality following the GPX uploader drawer pattern. The implementation includes:

1. Core Types and Context:
   - ✅ POI types with photo support (`src/features/poi/types/poi.types.ts`)
   - ✅ POI context for state management (`src/features/poi/context/POIContext.tsx`)
   - ✅ Icon definitions and categories (`src/features/poi/constants/poi-icons.ts`)

2. POI Drawer Components:
   - ✅ Main drawer with multi-step flow (`src/features/poi/components/POIDrawer/POIDrawer.tsx`)
   - ✅ Mode selection screen (`POIModeSelection.tsx`)
   - ✅ Location instructions (`POILocationInstructions.tsx`)
   - ✅ Icon selection grid (`POIIconSelection.tsx`)
   - ✅ Details form with photo upload (`POIDetailsForm.tsx`)
   - ✅ Styled components (`POIDrawer.styles.ts`)
   - ✅ Photo utilities for base64 conversion (`src/features/poi/utils/photo.ts`)

## Recent Updates

1. Map Integration:
   - ✅ Implemented POIMarker base component
   - ✅ Added map click handling for POI placement
   - ✅ Implemented crosshair cursor mode
   - ✅ Fixed cursor and click handling issues
   - [ ] Add place name click handling
   - [ ] Implement drag and drop for draggable POIs

## Implementation Details

### Map Click Handling
1. Added POI placement mode to MapContext
2. Implemented cursor style changes for placement mode
3. Set up click event handling with proper coordinate conversion
4. Added cleanup and state management for placement mode
5. Fixed issues with click handler initialization and cleanup
6. Improved coordinate handling:
   - Added type safety for coordinate arrays
   - Memoized click handler to prevent unnecessary re-renders
   - Added validation to ensure coordinates exist before processing
   - Properly cleaned up click handlers when drawer closes

## Next Steps

2. Sidebar Integration:
   - ✅ Add POI icon to sidebar
   - [ ] Create POI list view
   - [ ] Add POI filtering

3. Testing:
   - [ ] Test POI creation flows
   - [ ] Test photo upload and storage
   - [ ] Test drag and drop
   - [ ] Test place name POI creation

## Implementation Details

### POI Creation Flow
1. User clicks "Add POI" in sidebar
2. Drawer opens with two options:
   - "Add POI to Map" - For draggable POIs
   - "Add POI to Place" - For place name POIs

3. Map POI Flow:
   - Show instructions to click map
   - Change cursor to crosshair
   - After click, show icon selection
   - After icon, show details form
   - Create POI on form submit

4. Place POI Flow:
   - Show instructions to click place name
   - After click, show icon selection
   - Allow multiple icon selection
   - Create POIs on form submit

### Photo Handling
- Photos are converted to base64 URLs
- Stored in POI data structure
- Preview grid in form
- Delete capability for uploaded photos

### Icon Categories
Using Lucide icons organized into categories:
- Road Information
- Accommodation
- Food/Drink
- Natural Features
- Event Information
- Town Services
- Transportation

### Styling
Following the existing dark theme:
- Background: rgba(35, 35, 35, 0.9)
- Consistent with GPX drawer
- Grid layout for icons
- Category-specific colors
- Responsive photo grid

## Reference Files
- GPX Uploader Drawer: `docs/GPX_UPLOADER_DRAWER.md`
- POI Implementation Plan: `docs/POI_IMPLEMENTATION_PLAN.md`
- Directory Structure: `docs/DIR.md`

## Notes for Next Developer
1. The POI drawer implementation follows the same pattern as the GPX uploader drawer
2. Photo handling is done through base64 conversion for simplicity
3. Icon selection is categorized for better organization
4. The drawer uses a multi-step flow with state management
5. Map integration will require updating MapView.tsx and adding click handlers
6. Place name POIs will need integration with the map's place name layer
7. Consider adding a POI list view in the sidebar for better management
8. Photo storage might need optimization for larger images
