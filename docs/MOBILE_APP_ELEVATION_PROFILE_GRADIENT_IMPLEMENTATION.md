# Mobile App Elevation Profile Gradient Implementation

## Overview

This document describes the implementation of a gradient-based elevation profile in the Lutruwita mobile app. The elevation profile uses color gradients to represent the steepness of different sections of a route, providing users with a visual indication of climb difficulty.

## Implementation Details

The implementation divides the route into 1km segments and calculates the average gradient for each segment. Each segment is then colored based on its gradient percentage, with smooth transitions between adjacent segments.

### Gradient Color Scheme

The gradient color scheme is based on climb categories with the following thresholds:

- **Green** (< 1%): Flat or downhill sections
- **Yellow** (1% - 3%): Easy climbs
- **Orange** (3% - 5%): Moderate climbs
- **Red** (5% - 8%): Hard climbs
- **Maroon** (8% - 10%): Steep climbs
- **Dark Maroon** (> 10%): Very steep climbs (using color #660000)

### Segment Length

The route is divided into 1km segments to provide a balance between detail and smoothness. This segment length:

- Provides enough granularity to show meaningful gradient changes
- Creates smooth transitions between different gradient sections
- Avoids excessive fragmentation that could make the profile visually cluttered

### Gradient Transitions

To create smooth visual transitions between segments of different gradients, we implemented:

1. **Gradient Blending**: Each segment's color gradually transitions to the next segment's color
2. **Multi-Stop Gradients**: For middle segments, we use 6 color stops to create a smoother transition:
   - 0%: Previous segment color
   - 20%: 60% blend of previous and current segment colors
   - 40%: 20% blend of previous and current segment colors
   - 60%: 20% blend of current and next segment colors
   - 80%: 60% blend of current and next segment colors
   - 100%: Next segment color

3. **Color Mixing Function**: A custom `mixColors` function blends two hex colors with a specified ratio:
   ```typescript
   const mixColors = (color1: string, color2: string, ratio: number): string => {
     // Parse the hex colors to RGB
     const r1 = parseInt(color1.substring(1, 3), 16);
     const g1 = parseInt(color1.substring(3, 5), 16);
     const b1 = parseInt(color1.substring(5, 7), 16);
     
     const r2 = parseInt(color2.substring(1, 3), 16);
     const g2 = parseInt(color2.substring(3, 5), 16);
     const b2 = parseInt(color2.substring(5, 7), 16);
     
     // Mix the colors
     const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
     const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
     const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
     
     // Convert back to hex
     return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
   };
   ```

## Technical Implementation

### Segment Creation

The route is divided into 1km segments using the following approach:

1. Calculate the total route distance
2. Determine the number of segments needed (total distance / segment length)
3. For each segment:
   - Find all elevation points within the segment distance range
   - Calculate the average gradient for the segment
   - Assign a color based on the gradient percentage

```typescript
const segmentData = useMemo(() => {
  if (elevationData.length === 0) return [];
  
  const segments = [];
  const segmentLength = 1000; // 1km segments
  
  // Get total route distance
  const totalDistance = elevationData[elevationData.length - 1].distance;
  
  // Calculate number of segments
  const numSegments = Math.ceil(totalDistance / segmentLength);
  
  for (let i = 0; i < numSegments; i++) {
    const startDistance = i * segmentLength;
    const endDistance = Math.min((i + 1) * segmentLength, totalDistance);
    
    // Find points in this segment
    const segmentPoints = elevationData.filter(
      point => point.distance >= startDistance && point.distance <= endDistance
    );
    
    if (segmentPoints.length >= 2) {
      const avgGradient = calculateAverageGradient(segmentPoints);
      const color = getColorForGradient(avgGradient);
      
      segments.push({
        startDistance,
        endDistance,
        avgGradient,
        color,
        startIndex: elevationData.findIndex(p => p.distance >= startDistance),
        endIndex: elevationData.findIndex(p => p.distance >= endDistance) || elevationData.length - 1
      });
    }
  }
  
  return segments;
}, [elevationData]);
```

### Gradient Color Assignment

Colors are assigned based on the average gradient of each segment:

```typescript
const getColorForGradient = (gradient: number): string => {
  if (gradient >= 10) {
    return "#660000"; // Very dark maroon for >10%
  } else if (gradient >= 8) {
    return GRADIENT_COLOR_CONFIG.STEEP.color; // Maroon for 8-10%
  } else if (gradient >= 5) {
    return GRADIENT_COLOR_CONFIG.HARD.color; // Red for 5-8%
  } else if (gradient >= 3) {
    return GRADIENT_COLOR_CONFIG.MODERATE.color; // Orange for 3-5%
  } else if (gradient >= 1) {
    return GRADIENT_COLOR_CONFIG.EASY.color; // Yellow for 1-3%
  } else {
    return GRADIENT_COLOR_CONFIG.FLAT.color; // Green for <1% (including downhill)
  }
};
```

### Gradient Definitions

For each segment, a gradient definition is created to provide smooth transitions:

```typescript
const gradientDefs = useMemo(() => {
  if (segmentAreaPaths.length < 2) return [];
  
  return segmentAreaPaths.map((segment, index) => {
    // For the first segment, transition from its color to the next segment's color
    if (index === 0) {
      const nextSegment = segmentAreaPaths[1];
      return {
        id: `gradient-${index}`,
        x1: "0", y1: "0", x2: "1", y2: "0",
        stops: [
          { offset: "0", color: segment.color },
          { offset: "1", color: nextSegment.color }
        ]
      };
    }
    // For the last segment, transition from the previous segment's color to its color
    else if (index === segmentAreaPaths.length - 1) {
      const prevSegment = segmentAreaPaths[index - 1];
      return {
        id: `gradient-${index}`,
        x1: "0", y1: "0", x2: "1", y2: "0",
        stops: [
          { offset: "0", color: prevSegment.color },
          { offset: "1", color: segment.color }
        ]
      };
    }
    // For middle segments, create a smoother transition with more stops
    else {
      const prevSegment = segmentAreaPaths[index - 1];
      const nextSegment = segmentAreaPaths[index + 1];
      return {
        id: `gradient-${index}`,
        x1: "0", y1: "0", x2: "1", y2: "0",
        stops: [
          { offset: "0", color: prevSegment.color },
          { offset: "0.2", color: mixColors(prevSegment.color, segment.color, 0.6) },
          { offset: "0.4", color: mixColors(prevSegment.color, segment.color, 0.2) },
          { offset: "0.6", color: mixColors(segment.color, nextSegment.color, 0.2) },
          { offset: "0.8", color: mixColors(segment.color, nextSegment.color, 0.6) },
          { offset: "1", color: nextSegment.color }
        ]
      };
    }
  });
}, [segmentAreaPaths]);
```

## Visual Rendering

The elevation profile is rendered using SVG with the following components:

1. **Gradient Definitions**: Linear gradients defined for each segment
2. **Segment Areas**: Path elements filled with the appropriate gradient
3. **Elevation Outline**: A path element that traces the top of the elevation profile
4. **Grid Lines**: Horizontal and vertical lines for distance and elevation markers
5. **Markers**: Text elements showing distance and elevation values

## Benefits

This gradient-based elevation profile provides several benefits:

1. **Intuitive Visual Cues**: Users can quickly identify steep sections of the route
2. **Detailed Gradient Information**: The color coding provides more detailed information than a simple elevation profile
3. **Smooth Visual Experience**: The gradient transitions create a visually appealing and easy-to-read profile
4. **Consistent with Climb Categories**: The color scheme aligns with standard climb category colors

## Future Enhancements

Potential future enhancements to the gradient-based elevation profile include:

1. **Interactive Hover Information**: Show detailed gradient information when hovering over a specific point
2. **Customizable Gradient Thresholds**: Allow users to adjust the gradient thresholds based on their preferences
3. **Terrain Type Indicators**: Add indicators for different terrain types (paved, gravel, etc.)
4. **Climb Category Labels**: Add labels for significant climbs with their category
5. **Elevation Gain/Loss Highlighting**: Use different color schemes for uphill vs. downhill sections
