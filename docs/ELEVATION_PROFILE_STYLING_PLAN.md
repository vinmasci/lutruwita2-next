# Elevation Profile Styling Migration Plan

## File Cleanup

### Duplicate Files to Remove
- `src/features/gpx/components/ElevationProfile/ElevationProfile.js` (using .tsx)
- `src/features/gpx/components/ElevationProfile/ElevationProfilePanel.js` (using .tsx)

## Major Changes Required

### 1. Chart Library Migration
- Current: Using Recharts in creation mode
- Target: Switch to Nivo Line chart (used in presentation mode)
- Benefits:
  - More consistent styling
  - Better customization options
  - Smoother animations

### 2. Styling Components

#### Container & Layout
```typescript
- Position: fixed
- Bottom: 0
- Left: 56px
- Right: 0
- Height: 300px
- Background: rgba(26, 26, 26, 0.9)
- Border-top: 1px solid rgba(255, 255, 255, 0.1)
```

#### Chart Styling
- Grid lines: rgba(255, 255, 255, 0.05)
- Axis text: rgba(255, 255, 255, 0.7)
- Font family: Futura
- Area fill: Custom gradient patterns for climbs
- Line colors: Match presentation colors

#### Header Section
- Route name styling
- Stats display with icons
- Surface type legend
- Climb category legend

### 3. Features to Add

#### Surface Type Visualization
- Add paved/unpaved section differentiation
- Implement pattern fills for unpaved sections
- Add surface type legend

#### Climb Visualization
- Implement climb markers with flags
- Add climb category colors
- Include climb stats in tooltips
- Add hover interactions

#### Interactive Elements
- Hover state styling
- Tooltip customization
- Click behavior matching
- Transition animations

#### Stats Display
- Add icons to stats
- Match presentation mode formatting
- Include unpaved percentage

## Implementation Steps

1. Library Migration
   - Install @nivo/line if not present
   - Replace Recharts implementation with Nivo
   - Port existing functionality

2. Component Structure
   - Update ElevationProfile.styles.ts
   - Implement new styled components
   - Match presentation layout

3. Feature Implementation
   - Surface type visualization
   - Climb markers and stats
   - Interactive elements
   - Stats display with icons

4. Polish & Refinement
   - Match fonts and colors
   - Implement animations
   - Add hover states
   - Refine tooltips

## Technical Details

### Key Components to Update

1. ElevationProfile.tsx
```typescript
- Replace Recharts with Nivo Line
- Update data processing
- Implement custom layers
- Add surface type handling
```

2. ElevationProfile.styles.ts
```typescript
- Update styled components
- Match presentation styling
- Add new style definitions
```

3. Types and Interfaces
```typescript
- Add surface type interfaces
- Update climb type definitions
- Add styling prop types
```

### Dependencies
- @nivo/line
- @mui/material
- styled-components

## Testing Plan

1. Visual Verification
   - Compare side by side with presentation mode
   - Check all breakpoints
   - Verify animations and transitions

2. Functional Testing
   - Hover interactions
   - Click behaviors
   - Tooltip accuracy
   - Climb detection
   - Surface type display

3. Performance Testing
   - Animation smoothness
   - Interaction responsiveness
   - Memory usage

## Notes
- Keep existing functionality while updating styling
- Maintain TypeScript type safety
- Consider extracting shared components
- Document any specific overrides needed

Once approved, we can proceed with implementation in Act mode.
