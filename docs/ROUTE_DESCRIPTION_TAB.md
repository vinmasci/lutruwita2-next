# Route Description Tab Implementation

## ⚠️ Important Implementation Note
This feature uses JavaScript (.js) files instead of TypeScript (.tsx) files. The key files are:
- `src/features/presentation/components/RouteDescription/PresentationRouteDescriptionPanel.js`
- `src/features/presentation/components/ElevationProfile/PresentationElevationProfile.js`
- `src/features/presentation/components/ElevationProfile/index.js`
- `src/features/presentation/components/WeatherProfile/PresentationWeatherProfile.tsx`

Do not modify the .tsx files as they are not being used.

## Recent Changes (February 2025)
1. Implemented new layout with 40/60 split between photos and description
2. Added Material UI ImageList with standard grid layout (2 columns)
3. Added modal view for full-size photo viewing with navigation
4. Added weather tab with climate data visualization
5. Improved styling:
   - Custom scrollbars
   - Hover effects on images
   - Consistent dark theme
   - Better spacing and typography
   - Font Awesome icons for weather data
   - Improved precipitation bar visibility (0.8 opacity)
6. Made description field optional
7. Added route stats to header bar with info-colored icons:
   - Distance with route icon
   - Elevation with mountains icon
   - Unpaved percentage with mountain biking icon
8. Fixed header bar color to match elevation and weather panels

## UI Design

### Default View (Elevation Tab)
```
                                Map View
                                
                                
                                
                                
                                
                                
                                
     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───┐
     │Elevation│ │Description│ │Weather  │ │ ▼ │
     └─────────┴─┴─────────┴─┴─────────┴─┴───┘
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
                                
                                
                                
                                
                                
                                
                                
     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───┐
     │Elevation│ │Description│ │Weather  │ │ ▼ │
     └─────────┴─┴─────────┴─┴─────────┴─┴───┘
     ┌─────────────────────────────┐
     │ ┌──────────┐ ┌────────────┐ │
     │ │          │ │            │ │
     │ │  Photos  │ │Description │ │
     │ │   40%    │ │    60%     │ │
     │ │          │ │            │ │
     │ │          │ │            │ │
     │ │          │ │            │ │
     │ └──────────┘ └────────────┘ │
     └─────────────────────────────┘
```

### Weather Tab View
```
                                Map View
                                
                                
                                
                                
                                
                                
                                
     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───┐
     │Elevation│ │Description│ │Weather  │ │ ▼ │
     └─────────┴─┴─────────┴─┴─────────┴─┴───┘
     ┌─────────────────────────────┐
     │ ┌──────────┐ ┌────────────┐ │
     │ │          │ │            │ │
     │ │  Climate │ │ Location   │ │
     │ │  Chart   │ │            │ │
     │ │   70%    │ │ Weather    │ │
     │ │          │ │ Stats 30%  │ │
     │ │          │ │            │ │
     │ └──────────┘ └────────────┘ │
     └─────────────────────────────┘
```

## Component Structure

### Components
- `PresentationRouteDescriptionPanel.js`
  - Main panel component for the description tab
  - Handles photo display and description
  - Uses Material UI ImageList for photo grid
  - Implements modal view for full-size photos
  - Shows route stats in header bar
- `PresentationWeatherProfile.tsx`
  - Weather visualization component
  - Shows climate data with interactive chart
  - Displays temperature and precipitation stats
  - Uses Font Awesome icons for weather indicators

### Layout
- 40/60 split between photos and description
- 70/30 split for weather visualization
- Photos section:
  - Standard ImageList with 2 columns
  - Clickable thumbnails that open in modal
  - Custom scrollbar styling
  - Hover effects on images
- Description section:
  - Optional description text
  - Custom scrollbar styling
  - Proper text formatting and spacing
- Weather section:
  - Interactive climate chart
  - Temperature and precipitation stats
  - Font Awesome weather icons
  - Location display with icon

### Photo Features
- Standard grid layout with 2 columns
- Click to open full-size in modal
- Modal features:
  - Large photo view
  - Navigation arrows
  - Photo count (e.g. "2 of 5")
  - Close button
  - Dark backdrop

### Weather Features
- Climate visualization:
  - Monthly temperature range (min/max)
  - Monthly precipitation
  - Interactive tooltips
  - Responsive chart
- Weather stats:
  - Location with icon
  - Temperature range with icon
  - Precipitation data with icon
  - Annual and monthly averages

## Styling

- Dark theme consistent with the application:
  - Background: rgba(26, 26, 26, 0.9)
  - Panel background: rgb(35, 35, 35)
  - Text colors: white and rgba(255, 255, 255, 0.9)
- Custom scrollbars for better usability
- Hover effects on interactive elements
- Smooth transitions
- Consistent border radius and spacing
- Font Awesome icons for weather data
- Semi-transparent precipitation bars (0.8 opacity)

## Implementation Details

### Photo Handling
- Uses deserializePhoto utility
- Supports multiple photos
- Lazy loading for better performance
- Maintains aspect ratios
- Proper error handling for missing photos

### Modal Implementation
- Full-screen modal with dark backdrop
- Arrow key navigation between photos
- Photo counter
- Smooth transitions
- Responsive sizing

### Weather Implementation
- Uses Open-Meteo API for historical climate data
- Caches weather data to avoid redundant API calls
- Calculates monthly averages and totals
- Responsive chart with tooltips
- Font Awesome icons for weather indicators

### State Management
- Local state for:
  - Modal open/close
  - Current photo index
  - Active tab
  - Weather data
  - Location info

## User Flow

1. User selects tab (Description/Weather)
2. Description tab:
   - Views photos in grid layout
   - Can click any photo to view full size
   - Navigate between photos in modal view
   - Read description on the right side (optional)
3. Weather tab:
   - Views climate chart with temperature and precipitation
   - Interacts with chart tooltips
   - Views weather stats with icons
4. Smooth scrolling for both photos and description

## Technical Considerations

1. Performance
   - Lazy loading for images
   - Weather data caching
   - Efficient state management
   - Smooth transitions

2. Accessibility
   - Proper alt text for images
   - Keyboard navigation in modal
   - Clear visual hierarchy
   - Descriptive icons

3. Responsiveness
   - Maintains layout integrity
   - Proper image scaling
   - Scrollable containers
   - Responsive charts

4. Error Handling
   - Fallbacks for missing images
   - Weather API error handling
   - Proper null checks
   - Clear feedback for empty states

## Implementation Status

✅ Base tab system
✅ Description panel layout
✅ Photo grid implementation
✅ Modal view for photos
✅ Navigation between photos
✅ Styling and transitions
✅ Error states and fallbacks
✅ Scrolling behavior
✅ Layout proportions
✅ Weather visualization
✅ Climate data integration
✅ Weather icons and styling
✅ Optional description field
✅ Route stats in header
✅ Consistent header styling
