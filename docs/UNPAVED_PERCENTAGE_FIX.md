# Unpaved Percentage Fix for Mobile App Elevation Profile

## Overview

This document outlines the implementation of fixes for the unpaved percentage display in the mobile app's elevation profile drawer. The issue was that the unpaved percentage was showing 0% even when there was gravel present in the route data.

## Problem Identification

The unpaved percentage was not being correctly displayed in the minimized view of the elevation profile drawer. After examining the data structure in `docs/cloudinaryraw.md`, we found that the unpaved data is stored in two possible locations:

1. In the `metadata.unpavedPercentage` property (when available)
2. In the `unpavedSections` array, which contains sections of the route that are unpaved

## Implementation Changes

### 1. Route Utils Enhancement

Created a utility function in `mobile/lutruwita-mobile/src/utils/routeUtils.ts` to calculate the unpaved percentage from the `unpavedSections` array when the metadata property is not available:

```typescript
/**
 * Calculate the unpaved percentage from the unpaved sections
 * @param route The route data
 * @returns The unpaved percentage (0-100)
 */
export const calculateUnpavedPercentage = (route: RouteData): number => {
  if (!route.unpavedSections || route.unpavedSections.length === 0) {
    return 0;
  }

  // If metadata already has the percentage, use that
  if (route.metadata?.unpavedPercentage) {
    return route.metadata.unpavedPercentage;
  }

  // Calculate from unpaved sections
  let totalUnpavedDistance = 0;
  
  route.unpavedSections.forEach(section => {
    // Each section has a startIndex and endIndex
    const sectionLength = section.endIndex - section.startIndex + 1;
    totalUnpavedDistance += sectionLength;
  });
  
  // Get total route length from coordinates
  const totalRouteLength = route.geojson?.features?.[0]?.geometry?.coordinates?.length || 0;
  
  if (totalRouteLength === 0) {
    return 0;
  }
  
  // Calculate percentage
  const percentage = (totalUnpavedDistance / totalRouteLength) * 100;
  
  // Round to nearest integer
  return Math.round(percentage);
};
```

### 2. MinimizedView Component Update

Updated the `MinimizedView.tsx` component to use the new utility function and display the unpaved percentage correctly:

```typescript
// Calculate unpaved percentage from metadata or from unpaved sections
const unpavedPercentage = metadata?.unpavedPercentage || calculateUnpavedPercentage(route);
```

### 3. UI Improvements for Minimized View

Made several UI improvements to the minimized view to make better use of the space and ensure the unpaved percentage is visible:

1. **Increased Height**: Changed the minimized drawer height from 120px to 140px to provide more space for content
2. **Improved Layout**: 
   - Put the title and navigation on the same line
   - Added a distance icon (Map icon)
   - Used the same elevation gain icon (ArrowUp)
   - Added "unpaved" text after the percentage
3. **Enhanced Styling**:
   - Added a light background to the stats row
   - Increased font size and weight for better readability
   - Added proper padding and rounded corners
   - Reduced white space under the chevron

### 4. Style Updates

Updated the styles in `styles.ts` to support the new layout:

```typescript
// Added new styles for the horizontal layout
stageNavigationRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
},
titleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
},

// Enhanced stats row styling
statsRowMinimized: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  alignItems: 'center',
  paddingHorizontal: 8,
  paddingVertical: 12,
  backgroundColor: 'rgba(0, 0, 0, 0.03)',
  borderRadius: 8,
  marginHorizontal: 4,
},

// Improved text styling
statValue: {
  color: '#121212',
  fontSize: 15,
  fontWeight: '500',
  marginLeft: 4,
},
```

## Testing

The implementation was tested with routes containing unpaved sections, and the unpaved percentage now correctly displays in the minimized view. The UI improvements also make the information more readable and accessible.

## Future Improvements

1. Consider adding a more detailed breakdown of surface types in the expanded view
2. Add the ability to toggle between different units (metric/imperial) for distance and elevation
3. Implement a more detailed visualization of unpaved sections in the elevation chart
