# Elevation Profile Implementation

## Implementation Checklist

- [ ] 1. Create ElevationProfile.styles.ts
  - [ ] Create ElevationPanel styled component
  - [ ] Create ElevationHeader styled component
  - [ ] Create ElevationContent styled component

- [ ] 2. Create ElevationProfilePanel.tsx
  - [ ] Define component props interface
  - [ ] Create basic component structure
  - [ ] Add collapse/expand functionality
  - [ ] Implement header with toggle button

- [ ] 3. Update theme.ts
  - [ ] Add MuiBox style overrides
  - [ ] Configure theme colors for dark mode
  - [ ] Set up transitions and spacing

- [ ] 4. Update MapView.tsx
  - [ ] Import ElevationProfilePanel
  - [ ] Add state for panel collapse
  - [ ] Add panel toggle handler
  - [ ] Integrate with current route data

- [ ] 5. Update ElevationProfile.tsx
  - [ ] Adjust styling for dark theme
  - [ ] Configure chart colors and typography
  - [ ] Optimize for panel container

- [ ] 6. Testing
  - [ ] Test with sample GPX file
  - [ ] Verify collapse/expand
  - [ ] Check responsive behavior
  - [ ] Validate elevation data display

## Overview
The elevation profile component will display elevation data from GPX files in a sticky panel at the bottom of the screen. It visualizes the route's elevation changes over distance using an area chart.

## Current Implementation
The existing `ElevationProfile` component (`src/features/gpx/components/ElevationProfile/ElevationProfile.tsx`):
- Uses recharts for visualization
- Displays elevation data as an area chart
- Shows distance (km) on X-axis and elevation (m) on Y-axis
- Includes tooltips for precise measurements
- Handles loading states and errors
- Processes elevation data from GPX file properties

## Requirements for Sticky Bottom Panel

### Layout
- Position: Fixed to bottom of screen
- Width: 100% of viewport width
- Height: Fixed height (e.g., 200px)
- Z-index: Above map but below sidebar
- Background: Semi-transparent dark background
- Border: Subtle top border for visual separation

### Behavior
- Always visible when GPX file is loaded
- Collapses/hides when no GPX data is present
- Optional collapse/expand toggle
- Maintains position during map interaction
- Responsive to window resizing

### Data Flow
1. GPX file is uploaded through the Uploader component
2. ProcessedRoute data is passed to MapView
3. MapView passes elevation data to ElevationProfile component
4. ElevationProfile renders the chart with the provided data

## Implementation Steps

1. Create a wrapper component for the sticky panel:
```tsx
// src/features/gpx/components/ElevationProfile/ElevationProfilePanel.tsx
interface ElevationProfilePanelProps {
  route?: ProcessedRoute;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}
```

2. Create styled components using Material UI:
```tsx
// src/features/gpx/components/ElevationProfile/ElevationProfile.styles.ts
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

export const ElevationPanel = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(26, 26, 26, 0.9)',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.standard,
    easing: theme.transitions.easing.easeInOut,
  }),
  zIndex: 90,
  '&.collapsed': {
    transform: 'translateY(100%)'
  }
}));

export const ElevationHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
}));

export const ElevationContent = styled(Box)(({ theme }) => ({
  height: 200,
  padding: theme.spacing(2)
}));
```

3. Update MapView component to render the elevation panel:
```tsx
import { ElevationProfilePanel } from '../gpx/components/ElevationProfile/ElevationProfilePanel';
import { IconButton, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Inside MapView component:
<ElevationProfilePanel 
  route={currentRoute}
  isCollapsed={!currentRoute}
  header={
    <ElevationHeader>
      <Typography variant="subtitle2" color="white">
        Elevation Profile
      </Typography>
      <IconButton 
        size="small" 
        onClick={handleToggleCollapse}
        sx={{ color: 'white' }}
      >
        {isCollapsed ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </IconButton>
    </ElevationHeader>
  }
/>
```

4. Add collapse/expand functionality:
- Toggle button in panel header
- Smooth transition animation
- Persist state in local storage

## Styling Considerations

### Material UI Integration

#### Theme Configuration
```tsx
// Add to theme.ts
const theme = createTheme({
  components: {
    MuiBox: {
      styleOverrides: {
        root: {
          '&.elevation-panel': {
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }
        }
      }
    }
  }
});
```

#### Panel Design
- Use MUI's Box component with custom styled variants
- Leverage theme.spacing for consistent padding
- Apply theme.transitions for smooth animations
- Use theme.palette for consistent colors
- Utilize theme.shadows for elevation effects

#### Chart Styling with MUI Theme
- Sync chart colors with MUI palette
- Use theme typography for labels
- Apply theme spacing for margins/padding
- Match theme transitions for animations

### Responsive Behavior
- Adjust height on different screen sizes
- Maintain readability of axis labels
- Handle touch interactions for mobile
- Consider landscape/portrait orientations

## Future Enhancements

1. Interactive Features
- Hover line that syncs with map position
- Click to zoom to map location
- Highlight segments based on surface type
- Show markers for points of interest

2. Additional Data
- Display grade percentage
- Show cumulative elevation gain/loss
- Mark significant peaks and valleys
- Surface type indicators

3. User Preferences
- Adjustable panel height
- Unit toggles (metric/imperial)
- Color scheme customization
- Chart type options

## Technical Notes

### Performance
- Consider using canvas renderer for large datasets
- Implement data point reduction for smoother rendering
- Use memoization for expensive calculations
- Optimize re-renders with React.memo

### Accessibility
- Keyboard controls for panel collapse
- Screen reader support for chart data
- High contrast mode support
- Focus management for interactive elements
