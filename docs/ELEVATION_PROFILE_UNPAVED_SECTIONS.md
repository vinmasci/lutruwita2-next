# Elevation Profile Unpaved Sections Visualization

## Overview

This document describes the implementation of a visual representation for unpaved sections in the elevation profile chart of the Lutruwita mobile app. The feature enhances the user experience by providing a clear visual indication of which parts of a route are unpaved, helping users better plan their journeys.

## Implementation Details

The implementation uses SVG patterns and path overlays to highlight unpaved sections in the elevation profile chart while maintaining the existing gradient coloring that indicates steepness.

### Data Source

The unpaved section data comes from the `unpavedSections` property in the `RouteData` interface:

```typescript
export interface RouteData {
  // other properties...
  unpavedSections?: UnpavedSection[]; // Array of unpaved sections
}

export interface UnpavedSection {
  startIndex: number;
  endIndex: number;
  coordinates: [number, number][];
  surfaceType: string;
  _id: string;
}
```

Each unpaved section defines a range of coordinates (from `startIndex` to `endIndex`) that represents an unpaved segment of the route.

### Visual Representation

After exploring several alternatives, we implemented a gravel-like stipple pattern that provides an intuitive visual representation of unpaved terrain. The pattern consists of randomly placed dots of varying sizes and opacity, resembling the appearance of gravel.

#### SVG Pattern Definition

```tsx
<Pattern
  id="unpavedPattern"
  patternUnits="userSpaceOnUse"
  width="10"
  height="10"
>
  {/* Random dots to simulate gravel */}
  <Circle cx="2" cy="2" r="0.8" fill="#000000" opacity="0.5" />
  <Circle cx="7" cy="3" r="0.6" fill="#000000" opacity="0.5" />
  <Circle cx="4" cy="7" r="0.7" fill="#000000" opacity="0.5" />
  <Circle cx="9" cy="8" r="0.5" fill="#000000" opacity="0.5" />
  <Circle cx="1" cy="9" r="0.6" fill="#000000" opacity="0.5" />
</Pattern>
```

### Identifying Unpaved Segments

The implementation uses the `isCoordinateInUnpavedSection` function to check if a coordinate is in an unpaved section:

```typescript
function isCoordinateInUnpavedSection(index: number, unpavedSections?: UnpavedSection[]) {
  if (!unpavedSections || unpavedSections.length === 0) {
    return false;
  }
  
  return unpavedSections.some(section => 
    index >= section.startIndex && index <= section.endIndex
  );
}
```

During elevation data extraction, each data point is marked with an `isPaved` property:

```typescript
const dataPoints = elevationPoints.map((point, index) => ({
  // other properties...
  isPaved: !isCoordinateInUnpavedSection(
    Math.floor((index / elevationPoints.length) * (route.geojson?.features[0]?.geometry?.coordinates?.length || 0)), 
    route.unpavedSections
  )
}));
```

### Rendering Unpaved Sections

The rendering process involves:

1. Grouping consecutive unpaved data points into segments
2. Creating SVG paths for each unpaved segment
3. Filling these paths with the gravel pattern

```tsx
// Group elevation data into unpaved segments
const unpavedSegments: ElevationPoint[][] = [];
let currentSegment: ElevationPoint[] = [];
let inUnpavedSection = !elevationData[0].isPaved;

elevationData.forEach((point, index) => {
  const isCurrentPointPaved = point.isPaved;
  
  // If we're transitioning between paved/unpaved
  if (inUnpavedSection !== !isCurrentPointPaved) {
    // If we were in an unpaved section, save the segment
    if (inUnpavedSection && currentSegment.length > 0) {
      unpavedSegments.push([...currentSegment]);
    }
    // Reset the current segment
    currentSegment = [];
    inUnpavedSection = !isCurrentPointPaved;
  }
  
  // If we're in an unpaved section, add the point
  if (!isCurrentPointPaved) {
    currentSegment.push(point);
  }
  
  // If this is the last point and we're in an unpaved section
  if (index === elevationData.length - 1 && !isCurrentPointPaved && currentSegment.length > 0) {
    unpavedSegments.push([...currentSegment]);
  }
});

// Render each unpaved segment
return unpavedSegments.map((segment, segmentIndex) => {
  if (segment.length === 0) return null;
  
  // Create path for this segment
  const pathData = segment.map((point: ElevationPoint, i: number) => {
    const x = paddingLeft + (elevationData.indexOf(point) / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
    const y = chartHeight - paddingBottom - ((point.y - minElevation) / elevationRange) * (chartHeight - paddingBottom);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  
  // For fill, we need to close the path
  const lastPoint = segment[segment.length - 1];
  const firstPoint = segment[0];
  const lastX = paddingLeft + (elevationData.indexOf(lastPoint) / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
  const firstX = paddingLeft + (elevationData.indexOf(firstPoint) / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
  
  const fillPathData = pathData + 
    ` L${lastX},${chartHeight - paddingBottom}` +
    ` L${firstX},${chartHeight - paddingBottom}` +
    ' Z';
  
  return (
    <Path
      key={`unpaved-segment-${segmentIndex}`}
      d={fillPathData}
      fill="url(#unpavedPattern)"
      fillOpacity="0.7"
      stroke="none"
    />
  );
});
```

## Alternative Approaches Considered

Several alternative visual representations were explored before settling on the gravel-like stipple pattern:

1. **Simple Black Dots Pattern**: A regular grid of small black dots. This was too uniform and didn't provide a strong enough visual distinction.

2. **Diagonal Hatching Pattern**: A pattern of diagonal lines. This was more visible but felt too regular and didn't intuitively represent unpaved terrain.

3. **Cross-Hatching Pattern**: A pattern of crossing diagonal lines. This was very distinct but too dense, potentially overwhelming the gradient coloring.

4. **Gravel-Like Stipple Pattern**: Random dots of varying sizes. This provides the most intuitive representation of unpaved surfaces while maintaining good visibility of the underlying gradient coloring.

## Benefits

This implementation provides several benefits:

1. **Intuitive Visual Representation**: The gravel-like pattern intuitively represents unpaved terrain, making it immediately clear to users which sections are unpaved.

2. **Maintains Gradient Information**: The pattern overlay allows the underlying gradient coloring (indicating steepness) to remain visible, preserving this important information.

3. **Efficient Implementation**: The implementation leverages existing data structures and rendering processes, adding minimal overhead.

4. **Enhanced User Experience**: Users can now easily identify unpaved sections in the elevation profile, helping them better plan their journeys.

## Future Enhancements

Potential future enhancements to the unpaved sections visualization include:

1. **Different Patterns for Different Surface Types**: Using different patterns to represent different types of unpaved surfaces (gravel, dirt, sand, etc.).

2. **Interactive Information**: Showing detailed surface information when tapping on a section of the elevation profile.

3. **Legend**: Adding a legend that explains the visual representation of unpaved sections.

4. **Customizable Visibility**: Allowing users to toggle the visibility of unpaved section indicators.
