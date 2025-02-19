# Route Description Tab Implementation

## UI Design

### Default View (Elevation Tab)
```
                                Map View
                                
                                
                                
                                
                                
                                
                                
     ┌─────────┐ ┌─────────┐ ┌───┐
     │Elevation│ │Description│ │ ▼ │
     └─────────┴─┴─────────┴─┴───┘
     ┌─────────────────────────────┐
     │                             │
     │      Elevation Graph        │
     │                             │
     │                             │
     │                             │
     └─────────────────────────────┘
```

### Description Tab View
```
                                Map View
                                
                                
                                
                                
                                
                                
                                
     ┌─────────┐ ┌─────────┐ ┌───┐
     │Elevation│ │Description│ │ ▼ │
     └─────────┴─┴─────────┴─┴───┘
     ┌─────────────────────────────┐
     │ ┌─────┐                     │
     │ │     │  Title              │
     │ │Photo│  [Input field]      │
     │ │     │                     │
     │ │     │  Description        │
     │ │Slide│  [Text area]        │
     │ │     │                     │
     │ └─────┘                     │
     └─────────────────────────────┘
```

## Component Structure

### New Components
- `src/features/gpx/components/RouteDescription/RouteDescriptionPanel.tsx`
  - Main panel component for the description tab
  - Handles photo upload, title, and description editing
  - Similar layout to POIDetailsDrawer but adapted for routes

### Modified Components
- `src/features/gpx/components/ElevationProfile/ElevationProfilePanel.tsx`
  - Add tab system
  - Integrate with RouteDescriptionPanel
  - Handle tab state and switching

## Types and Interfaces

### Add to `src/features/map/types/route.types.ts`
```typescript
interface RouteDescription {
  title: string;
  description: string;
  photos: File[];
}
```

## Implementation Steps

1. Create TabPanel Component
   - Add tab headers for "Elevation" and "Description"
   - Style tabs to match current button aesthetic
   - Handle tab switching logic

2. Create RouteDescriptionPanel
   - Photo upload section on left
   - Title input field
   - Description text area
   - Save/Cancel buttons
   - Reuse styling from POIDetailsDrawer

3. Modify ElevationProfilePanel
   - Add tab system
   - Integrate RouteDescriptionPanel
   - Maintain collapse/expand functionality

4. Update Route Context
   - Add methods for saving route description
   - Update route types to include description data

## Styling

- Reuse existing dark theme styles from POIDetailsDrawer
- Match current elevation panel aesthetics:
  - Dark background (rgba(26, 26, 26, 0.9))
  - Border radius (4px 4px 0 0)
  - Border (1px solid rgba(255, 255, 255, 0.1))
- Ensure smooth transitions between tabs
- Maintain consistent spacing and padding

## User Flow

1. User selects a route
2. Bottom panel shows with elevation tab active
3. User can switch to description tab
4. In description tab:
   - Add photos on left side
   - Edit title
   - Edit description
   - Changes save automatically or with save button

## Key Features

### Photo Management
- Left-aligned photo slider
- Upload button for adding new photos
- Preview thumbnails in grid layout
- Click to view full-size photos

### Text Fields
- Title input field
  - Single line
  - Clear placeholder text
  - Auto-save on blur

- Description text area
  - Multi-line support
  - Rich text formatting (optional)
  - Auto-save on blur

### Tab System
- Visual connection between active tab and panel
- Smooth transition animations
- Maintains state between tab switches
- Collapse/expand affects both tabs

## Technical Considerations

1. State Management
   - Use RouteContext for storing description data
   - Local state for form fields and photo upload
   - Handle auto-saving efficiently

2. Photo Handling
   - Optimize photo uploads
   - Generate thumbnails
   - Handle photo removal
   - Support drag-and-drop

3. Performance
   - Lazy load photos
   - Debounce auto-save
   - Smooth tab transitions

4. Error Handling
   - Validate inputs
   - Handle failed uploads
   - Show appropriate error messages

## Next Steps

1. Implement base tab system
2. Add description panel layout
3. Integrate photo upload
4. Add save functionality
5. Polish UI/UX
6. Add error handling
7. Test edge cases
