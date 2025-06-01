# Single Stage Route Overview Tab Fix Implementation Plan

## Problem Statement
Currently, all routes (both single and multi-stage) display an "Overview" tab. The requirement is to:
- **Multi-stage routes**: Continue showing Overview + individual stage tabs
- **Single-stage routes**: Show ONLY the single stage tab (no Overview tab)

## Files to Modify

### 1. **mobile/CyaTrails/CyaTrails/Views/RouteStageTabs.swift**

#### Changes Required:

**A. Add computed property for overview visibility**
- **Location**: Add after the `@Environment(\.colorScheme) private var colorScheme` line
- **Code to add**:
```swift
// Computed property to determine if Overview tab should be shown
private var shouldShowOverview: Bool {
    return routes.count > 1
}
```

**B. Modify the Overview tab rendering**
- **Location**: In the `body` var, inside the `HStack(spacing: 16)` section
- **Current code** (lines ~37-44):
```swift
// Overview tab
tabButton(title: "Overview", isSelected: selectedRouteIndex == -1) {
    withAnimation(.spring(response: 0.3, dampingFraction: 0.5, blendDuration: 0)) {
        selectedRouteIndex = -1
    }
}
```

- **Replace with**:
```swift
// Overview tab (only for multi-stage routes)
if shouldShowOverview {
    tabButton(title: "Overview", isSelected: selectedRouteIndex == -1) {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.5, blendDuration: 0)) {
            selectedRouteIndex = -1
        }
    }
}
```

### 2. **mobile/CyaTrails/CyaTrails/ViewModels/RouteDetailViewModel.swift**

#### Changes Required:

**A. Update route loading initialization**
- **Location**: In the `loadRoute(persistentId: String)` function
- **Find**: The section where `selectedRouteIndex = -1` is set (appears in multiple places around lines 400-450)
- **Current behavior**: Always sets `selectedRouteIndex = -1` regardless of route type

**Specific Changes:**

1. **In single route loading section** (around line 420):
   - **Current code**:
   ```swift
   self.routes = [loadedRoute]
   self.selectedRouteIndex = -1
   ```
   
   - **Replace with**:
   ```swift
   self.routes = [loadedRoute]
   self.selectedRouteIndex = 0  // Single route: select the first (and only) route
   ```

2. **In multi-route loading section** (around line 440):
   - **Current code**:
   ```swift
   self.selectedRouteIndex = -1
   ```
   
   - **Keep as is** (this is correct for multi-stage routes):
   ```swift
   self.selectedRouteIndex = -1  // Multi-stage route: select overview
   ```

**B. Add helper function for determining route type**
- **Location**: Add near other helper functions in the RouteDetailViewModel class
- **Code to add**:
```swift
// Helper function to determine if current setup is single stage
private var isSingleStageRoute: Bool {
    return routes.count == 1
}
```

### 3. **mobile/CyaTrails/CyaTrails/Views/ElevationDrawerView.swift**

#### Changes Required:

**A. Update route tabs section**
- **Location**: In the `routeTabs` computed property
- **Find**: The button for Overview tab (around line 430):

- **Current code**:
```swift
Button(action: {
    withAnimation(.spring(response: 0.3, dampingFraction: 0.5, blendDuration: 0)) { selectedRouteIndex = -1 }
}) {
    VStack(spacing: 4) {
        Text("Overview").font(.system(size: 15, weight: selectedRouteIndex == -1 ? .bold : .regular)).foregroundColor(.primary)
        Rectangle().frame(height: 3).foregroundColor(selectedRouteIndex == -1 ? Color(red: 1.0, green: 0.3, blue: 0.3) : .clear)
    }.frame(height: 30).padding(.horizontal, 4)
}
```

- **Replace with**:
```swift
// Only show Overview tab for multi-stage routes
if routes.count > 1 {
    Button(action: {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.5, blendDuration: 0)) { selectedRouteIndex = -1 }
    }) {
        VStack(spacing: 4) {
            Text("Overview").font(.system(size: 15, weight: selectedRouteIndex == -1 ? .bold : .regular)).foregroundColor(.primary)
            Rectangle().frame(height: 3).foregroundColor(selectedRouteIndex == -1 ? Color(red: 1.0, green: 0.3, blue: 0.3) : .clear)
        }.frame(height: 30).padding(.horizontal, 4)
    }
}
```

## Implementation Steps

### Step 1: Update RouteStageTabs.swift - ✅ COMPLETED
1. ✅ Added the `shouldShowOverview` computed property after the colorScheme line
2. ✅ Wrapped the Overview tab button in the conditional `if shouldShowOverview` block

### Step 2: Update RouteDetailViewModel.swift - ✅ COMPLETED
1. ✅ Found the `loadRoute(persistentId: String)` function
2. ✅ Located where `selectedRouteIndex = -1` was set for single routes
3. ✅ Changed it to `selectedRouteIndex = 0` for single routes
4. ✅ Kept `selectedRouteIndex = -1` for multi-stage routes unchanged

### Step 4: Fix Initial Setup Logic - ✅ COMPLETED
**Issue Found**: Additional problem in `attemptInitialMarkerSetup()` method was forcing single routes to overview

**Location**: `mobile/CyaTrails/CyaTrails/ViewModels/RouteDetailViewModel.swift` around lines 580-584

**Problem Code**:
```swift
} else {
    // If no segments, just select overview directly
    print("   AIMS: No segments for simulation, or single route. Setting initial route to overview (-1) directly.")
    print("[RDM_LOG] attemptInitialMarkerSetup (async): No segments for simulation. Calling selectRoute(index: -1).")
    self.selectRoute(index: -1)  // ← This was forcing single routes to overview!
}
```

**Fixed Code**:
```swift
} else {
    // Handle different route types appropriately
    if self.routes.count == 1 {
        // Single-stage routes: Do nothing, stay at selectedRouteIndex = 0
        print("   AIMS: Single route detected. Staying at selectedRouteIndex = \(self.selectedRouteIndex). Triggering marker update.")
        print("[RDM_LOG] attemptInitialMarkerSetup (async): Single route - staying at current index. Calling triggerMarkerUpdateIfReady.")
        self.triggerMarkerUpdateIfReady()
    } else {
        // Fallback for edge cases (no routes)
        print("   AIMS: No routes available. Setting to overview as fallback.")
        print("[RDM_LOG] attemptInitialMarkerSetup (async): No routes - fallback to overview. Calling selectRoute(index: -1).")
        self.selectRoute(index: -1)
    }
}
```

**Changes Made**:
1. ✅ Added conditional logic to check `self.routes.count == 1`
2. ✅ For single routes: Stay at current index (0) and trigger marker update
3. ✅ For edge cases: Fall back to overview (-1)
4. ✅ Preserved multi-stage route simulation logic

### Step 3: Update ElevationDrawerView.swift - ✅ COMPLETED
1. ✅ Found the `routeTabs` computed property
2. ✅ Wrapped the Overview tab button in `if routes.count > 1` conditional

## Edge Cases to Handle

### 1. Photo Filtering Logic
- **Location**: `ElevationDrawerView.swift` - `filteredPhotosForCurrentSelection` computed property
- **Current logic**: Works correctly as it checks `selectedRouteIndex == -1`
- **Action**: No changes needed - this will automatically work since single routes won't have `selectedRouteIndex == -1`

### 2. Elevation Profile Logic
- **Location**: `ElevationDrawerView.swift` - `expandedView` computed property
- **Current logic**: Uses `isOverview = selectedRouteIndex == -1`
- **Action**: No changes needed - this will automatically work correctly

### 3. Route Saving Logic
- **Location**: Various locations in `RouteDetailViewModel.swift`
- **Current logic**: Checks `selectedRouteIndex == -1` to determine what to save
- **Action**: No changes needed - single routes will save the individual route instead of master route

## Testing Strategy

### Test Cases to Verify:

1. **Multi-stage Routes**:
   - Overview tab appears
   - Individual stage tabs appear
   - Default selection is Overview (`selectedRouteIndex == -1`)
   - All functionality works as before

2. **Single-stage Routes**:
   - No Overview tab appears
   - Only one stage tab appears
   - Default selection is the single route (`selectedRouteIndex == 0`)
   - Photos show correctly for the single route
   - Elevation profile shows correctly
   - Route saving works correctly

3. **Navigation Testing**:
   - Tab switching works smoothly
   - No crashes when switching between route types
   - Photo gallery filters correctly
   - Elevation data displays correctly

## Rollback Plan

If issues arise, the changes can be easily reverted by:

1. **RouteStageTabs.swift**: Remove the `shouldShowOverview` condition
2. **RouteDetailViewModel.swift**: Change all single route `selectedRouteIndex = 0` back to `selectedRouteIndex = -1`
3. **ElevationDrawerView.swift**: Remove the `routes.count > 1` condition

## ❌ TEST RESULTS - FIX FAILED

**Date**: 29/05/2025
**Status**: ❌ FAILED - Fix did not work as expected

### Issues Observed:
- ❌ Single-stage routes are still showing Overview tab
- ❌ Routes still reverting to overview mode instead of staying on stage tab
- ❌ The implemented logic changes did not resolve the core issue

### Possible Root Causes:
1. **Additional logic paths**: There may be other code locations forcing the overview behavior
2. **Tab rendering conflicts**: The RouteStageTabs.swift changes may not be sufficient
3. **ElevationDrawerView interactions**: The drawer's tab system may override the main tab logic
4. **Timing issues**: Route initialization timing may be causing the override

### Next Investigation Steps Required:
1. 🔍 Examine if there are additional places where `selectedRouteIndex = -1` is set
2. 🔍 Check for any onAppear or lifecycle methods that might override the initial selection
3. 🔍 Verify if RouteStageTabs conditional logic is actually being executed
4. 🔍 Look for any binding relationships that might force the overview selection
5. 🔍 Check if ElevationDrawerView has additional logic that overrides tab selection

## Success Criteria (Not Yet Achieved)

- ❌ Multi-stage routes show Overview + stage tabs
- ❌ Single-stage routes show only the stage tab  
- ❌ Default selection works correctly for both types
- ❌ All existing functionality preserved
- ❌ No crashes or UI glitches
- ❌ Photo gallery continues to work correctly
- ❌ Elevation profiles display properly
- ❌ Route saving/downloading works as expected

## Notes

- The changes are minimal and focused
- No breaking changes to existing data structures
- Backwards compatible with existing routes
- No changes needed to photo gallery implementation (already working correctly)
- The logic leverages existing conditional statements, making it robust
