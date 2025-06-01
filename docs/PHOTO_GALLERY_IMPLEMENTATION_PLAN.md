# Photo Gallery Implementation Plan

## Overview
Replace the "Photo gallery placeholder" text in `ElevationDrawerView` with actual photo thumbnails that:
- Show all photos for Overview tab
- Show only stage-specific photos for individual segments
- Use existing photo modal system (`PhotoViewerView`)
- Leverage existing photo assignment logic (`routeIndex` property)

## Files to Modify
- `mobile/CyaTrails/CyaTrails/Views/ElevationDrawerView.swift` (main integration)
- Create new component: `mobile/CyaTrails/CyaTrails/Views/PhotoGalleryGridView.swift`

## Implementation Steps

### Phase 1: Create Photo Gallery Component (Horizontal Slider) - ✅ COMPLETED
- [x] **Step 1.1**: Create new file `PhotoGalleryGridView.swift`
  - **File**: `mobile/CyaTrails/CyaTrails/Views/PhotoGalleryGridView.swift`
  - **Action**: Create new SwiftUI view component
  - **Purpose**: Reusable photo slider with larger thumbnail display
  - **Dependencies**: Uses existing `Photo` model, `AsyncImage`
  - **Test**: Compiled without errors

- [x] **Step 1.2**: Implement horizontal slider layout
  - **Component**: `PhotoGalleryGridView`
  - **Features**: 
    - `ScrollView(.horizontal)` with `HStack`
    - Larger thumbnail image loading (180x140pt) with AsyncImage
    - Loading and error states for images
    - Empty state for no photos
  - **Test**: Preview works in Xcode, slider scrolls horizontally

- [x] **Step 1.3**: Add tap gesture handling
  - **Component**: `PhotoGalleryGridView`
  - **Features**: 
    - Closure-based tap callback `onPhotoTap(photo.id)`
    - Pass photo ID to parent
  - **Test**: Tap callbacks work in preview

### Phase 2: Integrate with ElevationDrawerView - ✅ COMPLETED
- [x] **Step 2.1**: Import and add PhotoGalleryGridView to ElevationDrawerView
  - **File**: `mobile/CyaTrails/CyaTrails/Views/ElevationDrawerView.swift`
  - **Location**: Inside the Photos `DisclosureGroup` content
  - **Action**: Replace placeholder text with `PhotoGalleryGridView`
  - **Test**: App compiles, no runtime errors

- [x] **Step 2.2**: Implement photo filtering logic
  - **File**: `mobile/CyaTrails/CyaTrails/Views/ElevationDrawerView.swift`
  - **Logic**: 
    - Overview mode: `viewModel.masterRoute?.photos ?? []`
    - Stage mode: Filter by `photo.routeIndex == selectedRouteIndex`
  - **Test**: Correct photos show for each tab

- [x] **Step 2.3**: Connect to existing photo modal system & Auto-Collapse Drawer
  - **File**: `mobile/CyaTrails/CyaTrails/Views/ElevationDrawerView.swift`
  - **Action**: 
    - Call `viewModel.prepareAndShowPhotoModal(photoID:mapView:)`
    - On photo tap, set `drawerState = .collapsed` with animation
  - **Integration**: Pass `mapView` reference through view hierarchy
  - **Test**: Tapping photos opens modal correctly and collapses drawer

### Phase 3: Handle Edge Cases and Polish - ⏳ PENDING
- [ ] **Step 3.1**: Verify empty states
  - **Component**: `PhotoGalleryGridView`
  - **Features**: 
    - "No photos available" message displays correctly
    - Consistent styling with other drawer sections
  - **Test**: Empty states display correctly in slider

- [ ] **Step 3.2**: Verify loading states for Overview mode
  - **Integration**: Check if overview photos are still being processed
  - **UI**: Show loading indicator similar to elevation profile (if applicable to slider)
  - **Test**: Loading states work correctly

- [ ] **Step 3.3**: Optimize performance
  - **Features**: 
    - Ensure `thumbnailUrl` is prioritized
    - Proper image caching (handled by AsyncImage to some extent)
    - Lazy loading for large photo sets (handled by ScrollView + ForEach)
  - **Test**: Smooth scrolling with many photos

### Phase 4: Testing and Validation - ⏳ PENDING
- [ ] **Step 4.1**: Test Overview mode
  - **Scenarios**: 
    - Routes with photos
    - Routes without photos
    - Multi-segment routes
    - Single routes
  - **Validation**: All photos from master route appear in slider

- [ ] **Step 4.2**: Test individual segments
  - **Scenarios**: 
    - Segments with assigned photos
    - Segments without photos
    - Photos with missing routeIndex
  - **Validation**: Only stage-specific photos appear in slider

- [ ] **Step 4.3**: Test photo modal integration
  - **Scenarios**: 
    - Modal opens with correct photo
    - Drawer collapses on modal open
    - Navigation between photos works
    - Map panning works
    - Modal closes properly
  - **Validation**: Existing modal functionality unchanged, drawer behaves as expected

- [ ] **Step 4.4**: Test edge cases
  - **Scenarios**: 
    - Network failures for image loading
    - Invalid image URLs
    - Very large photo sets
    - Rapid tab switching
  - **Validation**: No crashes, graceful degradation

### Phase 5: Photo Modal Enhancements - 🚀 NEXT
- [ ] **Step 5.1**: Analyze current `PhotoViewerView.swift`
- [ ] **Step 5.2**: Plan specific modal enhancements (e.g., improved navigation, metadata display, UI polish)
- [ ] **Step 5.3**: Implement modal enhancements

## Enhancements Implemented (Beyond Original Plan)
- **Horizontal Photo Slider**: The photo gallery was changed from a grid to a horizontal slider, displaying larger (180x140pt) and more prominent photo thumbnails.
- **Drawer Auto-Collapse**: When a photo in the slider is tapped, the `ElevationDrawerView` now automatically animates to its fully collapsed state to provide an unobstructed view of the photo modal. The drawer remains collapsed after the modal is closed.

## Detailed Implementation

### PhotoGalleryGridView Component Structure (Slider)
```swift
struct PhotoGalleryGridView: View {
    let photos: [Photo]
    let onPhotoTap: (String) -> Void
    @Environment(\.colorScheme) private var colorScheme

    // Constants for slider layout
    private let photoHeight: CGFloat = 140
    private let photoWidth: CGFloat = 180
    private let photoSpacing: CGFloat = 12
    private let photoCornerRadius: CGFloat = 12
    private let horizontalPadding: CGFloat = 16

    var body: some View {
        if photos.isEmpty {
            // Empty state view
        } else {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: photoSpacing) {
                    ForEach(photos) { photo in
                        // photoSliderItemView(photo)
                    }
                }
                .padding(.horizontal, horizontalPadding)
                .padding(.vertical, 8)
            }
            .frame(height: photoHeight + 16)
        }
    }

    // photoSliderItemView and emptyStateView implementations...
}
```

### ElevationDrawerView Integration Points
1. **Location**: Inside `expandedView` → Photos `DisclosureGroup` content
2. **Current code to replace**:
   ```swift
   Text("Photo gallery placeholder. This section will display photos related to the route.")
   ```
3. **New code structure**:
   ```swift
   PhotoGalleryGridView(
       photos: filteredPhotosForCurrentSelection,
       onPhotoTap: { photoID in
           viewModel.prepareAndShowPhotoModal(photoID: photoID, mapView: mapView)
       }
   )
   ```

### Photo Filtering Logic
```swift
private var filteredPhotosForCurrentSelection: [Photo] {
    let isOverview = selectedRouteIndex == -1
    
    if isOverview {
        // Show all photos from master route
        return viewModel.masterRoute?.photos ?? []
    } else {
        // Show only photos assigned to current stage
        let allPhotos = viewModel.masterRoute?.photos ?? []
        return allPhotos.filter { photo in
            photo.routeIndex == selectedRouteIndex
        }
    }
}
```

## Risk Mitigation

### Low Risk Changes
- Creating new `PhotoGalleryGridView` component (no existing code modified)
- Adding photo filtering logic (read-only operations)

### Medium Risk Changes  
- Modifying `ElevationDrawerView.swift` (existing code replacement)
- **Mitigation**: Replace only the placeholder text, keep all other logic intact

### Rollback Strategy
If issues arise:
1. **Step 1**: Comment out `PhotoGalleryGridView` usage, restore placeholder text
2. **Step 2**: Remove import of `PhotoGalleryGridView` 
3. **Step 3**: Delete `PhotoGalleryGridView.swift` file if needed

## Dependencies and Requirements

### Existing Systems Used
- ✅ `Photo` model with `routeIndex` and `distanceAlongRoute`
- ✅ `RouteDetailViewModel.prepareAndShowPhotoModal()`
- ✅ `RouteDetailViewModel.drawerState` for controlling drawer visibility
- ✅ `PhotoViewerView` modal system
- ✅ Photo assignment logic in `updatePhotoMetadata()`
- ✅ Existing drawer UI patterns

### No Changes Required To
- `RouteDetailViewModel.swift` (used existing methods, drawer state binding)
- `PhotoViewerView.swift` (used as-is for now)
- `RouteModels.swift` (Photo model sufficient)

## Success Criteria
- [x] Photos display correctly in a horizontal slider format
- [x] Overview shows all photos
- [x] Individual segments show only assigned photos  
- [x] Tapping photos opens existing modal
- [x] Drawer collapses to fully collapsed state when photo modal opens
- [ ] No performance degradation (initial testing good, further testing in Phase 4)
- [x] No breaking changes to existing functionality
- [x] Consistent UI with other drawer sections
- [x] **FIXED**: Single-stage routes correctly initialize to and remain on their only stage (index 0), preventing attempts to switch to a non-existent overview tab.

## Timeline Estimate
- **Phase 1 & 2 (including enhancements)**: ~2-3 hours (COMPLETED)
- **Phase 3 (Polish & Edge Cases)**: 1 hour (PENDING)
- **Phase 4 (Testing)**: 1 hour (PENDING)
- **Phase 5 (Modal Enhancements)**: TBD
- **Total**: Ongoing

## Notes
- Photo gallery successfully implemented as a horizontal slider.
- Drawer auto-collapse on photo tap enhances user experience for modal viewing.
- Next focus: Enhancements to the `PhotoViewerView` modal itself.
- Leverage existing photo infrastructure completely.
- No changes to data models or view models needed for gallery display.
- Focus on UI presentation layer only for gallery.
- Maintain consistency with existing drawer patterns.
- Use proven photo modal system without modification (until Phase 5).
- **Single-Stage Route Fix**: Modified `RouteDetailViewModel.swift` in `selectRoute(index: Int)` and `attemptInitialMarkerSetup()` to ensure `selectedRouteIndex` is always `0` for single-stage routes and to prevent selection of `-1` (overview) in such cases. This resolves an issue where single-stage routes might incorrectly attempt to revert to an overview tab that doesn't exist for them.
