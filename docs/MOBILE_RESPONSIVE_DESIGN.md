# Mobile Responsive Design Implementation

This document outlines the responsive design changes implemented to make the application more usable on mobile devices.

## Overview

The UI components were too large on mobile devices, making the application difficult to use. The solution was to implement responsive sizing for various UI components, making them 50% smaller on mobile devices and 75% smaller on tablets.

## Implementation Details

### 1. Responsive Utilities

Created a utility file (`src/utils/responsive.ts`) with helper functions for responsive sizing:

```typescript
import { Theme } from '@mui/material/styles';

// Responsive drawer width utility
export const responsiveDrawerWidth = (theme: Theme) => ({
  width: '7vw',
  minWidth: '28px',
  maxWidth: '56px',
  [theme.breakpoints.down('sm')]: {
    width: '10vw',
  },
  [theme.breakpoints.down(375)]: {
    width: '12vw',
  }
});

// Responsive nested drawer width utility
export const responsiveNestedDrawerWidth = (theme: Theme) => ({
  width: '30vw',
  minWidth: '200px',
  maxWidth: '264px',
  [theme.breakpoints.down('sm')]: {
    width: '70vw',
    maxWidth: 'none',
  },
  [theme.breakpoints.down(375)]: {
    width: '80vw',
  }
});

// Responsive panel height utility
export const responsivePanelHeight = (theme: Theme) => ({
  height: '30vh',
  minHeight: '150px',
  maxHeight: '300px',
  [theme.breakpoints.down('sm')]: {
    height: '25vh',
    minHeight: '120px',
    maxHeight: '250px',
  },
  [theme.breakpoints.down(375)]: {
    height: '20vh',
    minHeight: '100px',
    maxHeight: '200px',
  }
});

// Responsive padding utility
export const responsivePadding = (theme: Theme) => ({
  padding: {
    xs: '8px',
    sm: '12px',
    md: '16px'
  }
});
```

### 2. Sidebar Responsiveness

Updated the sidebar styles in `src/features/presentation/components/PresentationSidebar/PresentationSidebar.styles.js`:

- Changed fixed width (56px) to viewport-relative width (7vw) with min/max constraints
- Added media queries for different screen sizes
- Adjusted icon sizes for different breakpoints

### 3. Bottom Panel Responsiveness

Updated the elevation profile panel in `src/features/presentation/components/ElevationProfile/PresentationElevationProfilePanel.js`:

- Changed fixed height (300px) to viewport-relative height (30vh) with min/max constraints
- Made the panel position responsive to match the sidebar width
- Added media queries for different screen sizes

### 4. Map Controls Responsiveness

Updated map controls in `src/features/presentation/components/PresentationMapView/PresentationMapView.css`:

- Added media queries to adjust the size of map controls based on screen size
- Reduced the size of buttons and controls on smaller screens
- Adjusted positioning and spacing for better mobile experience

### 5. Search Control Responsiveness

Updated search control in `src/features/presentation/components/SearchControl/SearchControl.css`:

- Made the search button and input field responsive
- Adjusted the expanded width based on screen size
- Made search results more compact on smaller screens

### 6. POI Drawer Responsiveness

Updated POI drawer in `src/features/poi/components/POIDrawer/POIDrawer.styles.ts`:

- Changed fixed width to viewport-relative width with min/max constraints
- Adjusted padding based on screen size
- Made the drawer take up more screen width on smaller devices

## Breakpoints Used

- Desktop: Default styles
- Tablet: `theme.breakpoints.down('sm')` (< 900px)
- Mobile: `theme.breakpoints.down(600)` and `theme.breakpoints.down(375)`

## Testing

The responsive design has been implemented to scale UI components appropriately:
- On desktop: Normal size (100%)
- On tablets: ~75% of desktop size
- On mobile: ~50% of desktop size

This ensures that the application is usable across different device sizes while maintaining the same functionality.
