# Elevation Profile Nivo Implementation

## Overview
The elevation profile visualization uses Nivo charts to display elevation data with different textures for unpaved sections and climb indicators.

## Implementation Details

### Surface Types
- Paved sections use a solid fill with `rgba(2, 136, 209, 0.4)`
- Unpaved sections use a diagonal line pattern:
  ```css
  repeating-linear-gradient(
    -45deg, 
    rgba(2, 136, 209, 0.2), 
    rgba(2, 136, 209, 0.2) 2px, 
    transparent 2px, 
    transparent 4px
  )
  ```

### Climb Indicators
- Flags mark the start and end of climbs
- Color-coded by category (HC, CAT1-4)
- Flags use subtle styling:
  - Stroke width: 0.5px
  - Stroke opacity: 0.7
  - Background color matches climb category

### Header Stats
- Distance (km)
- Elevation gained (m)
- Elevation lost (m)
- Surface type indicator
- Icons use Material Info Blue (#0288d1)

### Interactive Features
- Hover over climb flags to see:
  - Climb category
  - Distance
  - Elevation gain
  - Average gradient
  - Surface type info
- Hover over profile to see:
  - Current elevation
  - Current gradient

### Chart Configuration
- Natural curve interpolation
- Area opacity: 0.2
- Line stroke width: 2.5px
- Grid lines: rgba(255, 255, 255, 0.05)
- Dark theme with Futura font family

## Technical Implementation
- Uses @nivo/line for the base chart
- Custom layer implementation for:
  - Surface patterns
  - Climb indicators
  - Interactive tooltips
- Segments data based on:
  - Surface changes (paved/unpaved)
  - Climb boundaries
