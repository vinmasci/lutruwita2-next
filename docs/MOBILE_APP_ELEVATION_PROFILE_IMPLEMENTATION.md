# Mobile App Elevation Profile Implementation

## Overview

This document outlines the implementation plan for adding an elevation profile feature to the Lutruwita mobile app's route map page. The elevation profile will:

1. Display a full elevation chart with distance markers and elevation data
2. Support minimizing to a compact view showing just route name and basic stats
3. Handle multiple routes (2-10) showing individual route information
4. Always be visible on the page (not hidden behind a button)

## Reference Files

The implementation will build upon these existing files:

### Mobile App Core Files
- `mobile/lutruwita-mobile/src/screens/MapScreen.tsx` - Main map screen where the elevation profile will be integrated
- `mobile/lutruwita-mobile/src/components/map/POIDetailsDrawer.tsx` - Example of a sliding drawer implementation
- `mobile/lutruwita-mobile/src/services/routeService.ts` - Service providing route data with elevation statistics
- `mobile/lutruwita-mobile/src/context/RouteContext.tsx` - Context provider for route data
- `mobile/lutruwita-mobile/package.json` - Dependencies (includes react-native-svg for chart implementation)

### Web App Reference Files
- `docs/ELEVATION_PROFILE_NIVO.md` - Details on the web app's elevation profile implementation
- `docs/ELEVATION_PROFILE_TRACER.md` - Implementation of the map tracer feature
- `docs/ELEVATION_PROFILE_TRACER_PRESENTATION_MODE.md` - Tracer implementation in presentation mode
- `docs/ELEVATION_PANEL_IMPROVEMENTS.md` - UI improvements for the elevation panel
- `docs/MOBILE_APP_MAP_ENHANCEMENTS.md` - Mobile app map implementation details

## Data Structure

The route data structure includes elevation information in the `RouteData` interface:

```typescript
// From mobile/lutruwita-mobile/src/services/routeService.ts
export interface RouteStatistics {
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  averageSpeed: number;
  movingTime: number;
  totalTime: number;
}

export interface RouteData {
  order: number;
  routeId: string;
  name: string;
  color: string;
  isVisible: boolean;
  geojson: any; // GeoJSON data
  statistics: RouteStatistics;
  status: RouteStatus;
  metadata?: RouteMetadata;
  unpavedSections?: UnpavedSection[]; // Array of unpaved sections
}
```

The GeoJSON data contains the route coordinates, which include elevation data for each point.

## Implementation Plan

### 1. Component Structure

Create a new `RouteElevationDrawer` component with the following structure:

```
mobile/lutruwita-mobile/src/components/map/
  ├── RouteElevationDrawer/
  │   ├── index.tsx                 # Main component
  │   ├── ElevationChart.tsx        # SVG-based chart component
  │   ├── RouteStats.tsx            # Route statistics display
  │   ├── MinimizedView.tsx         # Compact view when minimized
  │   └── styles.ts                 # Styling
```

### 2. RouteElevationDrawer Component

The main component will:
- Always be visible at the bottom of the screen
- Support two states: minimized and expanded
- Handle multiple routes with tabs or a carousel
- Use Animated API for smooth transitions

```typescript
// Simplified example of the main component structure
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Animated, TouchableOpacity, ScrollView } from 'react-native';
import { useRoute } from '../../context/RouteContext';
import ElevationChart from './ElevationChart';
import RouteStats from './RouteStats';
import MinimizedView from './MinimizedView';
import { styles } from './styles';
import { ChevronDown, ChevronUp, Maximize, Minimize } from 'lucide-react-native';

interface RouteElevationDrawerProps {
  onHeightChange?: (height: number) => void;
}

const RouteElevationDrawer: React.FC<RouteElevationDrawerProps> = ({ onHeightChange }) => {
  const { routeState } = useRoute();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  
  // Handle animation between states
  useEffect(() => {
    const targetHeight = isCollapsed ? 80 : (isMaximized ? 300 : 180);
    
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
    
    if (onHeightChange) {
      onHeightChange(targetHeight);
    }
  }, [isCollapsed, isMaximized, translateY, onHeightChange]);
  
  // If no routes, don't render anything
  if (!routeState.selectedRoute || !routeState.selectedRoute.routes || routeState.selectedRoute.routes.length === 0) {
    return null;
  }
  
  const routes = routeState.selectedRoute.routes;
  const activeRoute = routes[activeRouteIndex];
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          height: isCollapsed ? 80 : (isMaximized ? 300 : 180),
          transform: [{ translateY }] 
        }
      ]}
    >
      <View style={styles.header}>
        <View style={styles.handle} />
        
        {/* Route tabs if multiple routes */}
        {routes.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
          >
            {routes.map((route, index) => (
              <TouchableOpacity
                key={`route-tab-${route.routeId || index}`}
                style={[
                  styles.tab,
                  activeRouteIndex === index && styles.activeTab,
                  { borderBottomColor: route.color || '#ff4d4d' }
                ]}
                onPress={() => setActiveRouteIndex(index)}
              >
                <Text style={styles.tabText}>{route.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        
        {/* Control buttons */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setIsMaximized(!isMaximized)}
            disabled={isCollapsed}
          >
            {isMaximized ? <Minimize size={18} color="#fff" /> : <Maximize size={18} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronUp size={18} color="#fff" /> : <ChevronDown size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {isCollapsed ? (
          <MinimizedView route={activeRoute} />
        ) : (
          <>
            <RouteStats route={activeRoute} />
            <ElevationChart 
              route={activeRoute} 
              height={isMaximized ? 220 : 100} 
            />
          </>
        )}
      </View>
    </Animated.View>
  );
};

export default RouteElevationDrawer;
```

### 3. ElevationChart Component

Create a custom SVG-based chart using react-native-svg:

```typescript
// Simplified example of the elevation chart component
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Defs, LinearGradient, Stop, Pattern, Rect } from 'react-native-svg';
import { RouteData } from '../../services/routeService';

interface ElevationChartProps {
  route: RouteData;
  height: number;
  width?: number | string;
  tracerPosition?: number | null;
}

const ElevationChart: React.FC<ElevationChartProps> = ({ 
  route, 
  height, 
  width = '100%',
  tracerPosition = null
}) => {
  // Extract elevation data from route
  const extractElevationData = () => {
    if (!route.geojson || !route.geojson.features || route.geojson.features.length === 0) {
      return [];
    }
    
    const coordinates = route.geojson.features[0].geometry.coordinates;
    return coordinates.map((coord: [number, number, number], index: number) => {
      // Mapbox coordinates are [longitude, latitude, elevation]
      return {
        x: index,
        y: coord[2] || 0, // Elevation (may be 0 if not available)
        distance: (index / (coordinates.length - 1)) * route.statistics.totalDistance,
        isPaved: !isCoordinateInUnpavedSection(index, route.unpavedSections)
      };
    });
  };
  
  // Check if a coordinate index is in an unpaved section
  const isCoordinateInUnpavedSection = (index: number, unpavedSections?: any[]) => {
    if (!unpavedSections || unpavedSections.length === 0) {
      return false;
    }
    
    return unpavedSections.some(section => 
      index >= section.startIndex && index <= section.endIndex
    );
  };
  
  const elevationData = extractElevationData();
  
  if (elevationData.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noDataText}>No elevation data available</Text>
      </View>
    );
  }
  
  // Calculate chart dimensions and scales
  const chartWidth = typeof width === 'number' ? width : 300;
  const chartHeight = height - 30; // Leave space for labels
  const paddingBottom = 20;
  const paddingLeft = 40;
  const paddingRight = 10;
  
  const minElevation = Math.min(...elevationData.map(d => d.y));
  const maxElevation = Math.max(...elevationData.map(d => d.y));
  const elevationRange = maxElevation - minElevation;
  
  // Create the path for the elevation profile
  const createElevationPath = () => {
    const points = elevationData.map((d, i) => {
      const x = paddingLeft + (i / (elevationData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
      const y = chartHeight - paddingBottom - ((d.y - minElevation) / elevationRange) * (chartHeight - paddingBottom);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    });
    
    // Close the path for fill
    const lastX = paddingLeft + chartWidth - paddingLeft - paddingRight;
    points.push(`L${lastX},${chartHeight - paddingBottom}`);
    points.push(`L${paddingLeft},${chartHeight - paddingBottom}`);
    points.push('Z');
    
    return points.join(' ');
  };
  
  return (
    <View style={[styles.container, { height }]}>
      <Svg width={width} height={height}>
        <Defs>
          {/* Gradient fill for the elevation area */}
          <LinearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={route.color || '#ff4d4d'} stopOpacity="0.6" />
            <Stop offset="1" stopColor={route.color || '#ff4d4d'} stopOpacity="0.1" />
          </LinearGradient>
          
          {/* Pattern for unpaved sections */}
          <Pattern
            id="unpavedPattern"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <Line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke={route.color || '#ff4d4d'}
              strokeWidth="2"
              strokeOpacity="0.5"
            />
          </Pattern>
        </Defs>
        
        {/* Elevation area */}
        <Path
          d={createElevationPath()}
          fill="url(#elevationGradient)"
          stroke={route.color || '#ff4d4d'}
          strokeWidth="2"
        />
        
        {/* Distance markers */}
        {[0, 0.25, 0.5, 0.75, 1].map(percent => {
          const x = paddingLeft + percent * (chartWidth - paddingLeft - paddingRight);
          const distance = (route.statistics.totalDistance * percent).toFixed(1);
          
          return (
            <React.Fragment key={`marker-${percent}`}>
              <Line
                x1={x}
                y1={0}
                x2={x}
                y2={chartHeight - paddingBottom}
                stroke="#ffffff"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              <SvgText
                x={x}
                y={chartHeight - 5}
                fontSize="10"
                fill="#ffffff"
                textAnchor="middle"
              >
                {distance} mi
              </SvgText>
            </React.Fragment>
          );
        })}
        
        {/* Elevation markers */}
        {[0, 0.5, 1].map(percent => {
          const elevation = (minElevation + elevationRange * percent).toFixed(0);
          const y = chartHeight - paddingBottom - percent * (chartHeight - paddingBottom);
          
          return (
            <React.Fragment key={`elevation-${percent}`}>
              <Line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="#ffffff"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              <SvgText
                x={paddingLeft - 5}
                y={y + 4}
                fontSize="10"
                fill="#ffffff"
                textAnchor="end"
              >
                {elevation}ft
              </SvgText>
            </React.Fragment>
          );
        })}
        
        {/* Tracer marker */}
        {tracerPosition !== null && (
          <React.Fragment>
            <Line
              x1={tracerPosition}
              y1={0}
              x2={tracerPosition}
              y2={chartHeight - paddingBottom}
              stroke="#ff0000"
              strokeWidth="1"
            />
            <Circle
              cx={tracerPosition}
              cy={getYForTracerPosition(tracerPosition)}
              r="4"
              fill="#ff0000"
              stroke="#ffffff"
              strokeWidth="1"
            />
          </React.Fragment>
        )}
      </Svg>
    </View>
  );
};

export default ElevationChart;
```

### 4. RouteStats Component

Display key statistics for the route:

```typescript
// Simplified example of the route stats component
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { RouteData } from '../../services/routeService';
import { Mountain, ArrowUp, ArrowDown, Road } from 'lucide-react-native';

interface RouteStatsProps {
  route: RouteData;
}

const RouteStats: React.FC<RouteStatsProps> = ({ route }) => {
  const { statistics, metadata } = route;
  
  // Calculate unpaved percentage
  const unpavedPercentage = metadata?.unpavedPercentage || 0;
  
  return (
    <View style={styles.container}>
      <Text style={styles.routeName}>{route.name}</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Road size={16} color="#0288d1" />
          <Text style={styles.statValue}>
            {(statistics.totalDistance / 1609.34).toFixed(2)} mi
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <ArrowUp size={16} color="#0288d1" />
          <Text style={styles.statValue}>
            {statistics.elevationGain.toFixed(0)} ft
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <ArrowDown size={16} color="#0288d1" />
          <Text style={styles.statValue}>
            {statistics.elevationLoss.toFixed(0)} ft
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Mountain size={16} color="#0288d1" />
          <Text style={styles.statValue}>
            {statistics.maxElevation.toFixed(0)} ft
          </Text>
        </View>
        
        {unpavedPercentage > 0 && (
          <View style={styles.statItem}>
            <View style={styles.surfaceIndicator}>
              <View 
                style={[
                  styles.surfacePaved, 
                  { flex: 1 - (unpavedPercentage / 100) }
                ]} 
              />
              <View 
                style={[
                  styles.surfaceUnpaved, 
                  { flex: unpavedPercentage / 100 }
                ]} 
              />
            </View>
            <Text style={styles.statValue}>
              {unpavedPercentage}% unpaved
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default RouteStats;
```

### 5. MinimizedView Component

Display a compact view when the drawer is collapsed:

```typescript
// Simplified example of the minimized view component
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { RouteData } from '../../services/routeService';
import { Mountain, ArrowUp } from 'lucide-react-native';

interface MinimizedViewProps {
  route: RouteData;
}

const MinimizedView: React.FC<MinimizedViewProps> = ({ route }) => {
  const { statistics } = route;
  
  return (
    <View style={styles.container}>
      <Text style={styles.routeName}>{route.name}</Text>
      
      <View style={styles.statsRow}>
        <Text style={styles.statValue}>
          {(statistics.totalDistance / 1609.34).toFixed(2)} mi
        </Text>
        
        <View style={styles.statItem}>
          <ArrowUp size={14} color="#0288d1" />
          <Text style={styles.statValue}>
            {statistics.elevationGain.toFixed(0)} ft
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Mountain size={14} color="#0288d1" />
          <Text style={styles.statValue}>
            {statistics.maxElevation.toFixed(0)} ft
          </Text>
        </View>
      </View>
    </View>
  );
};

export default MinimizedView;
```

### 6. Integration with MapScreen

Integrate the RouteElevationDrawer into the MapScreen component:

```typescript
// Simplified example of the integration in MapScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import RouteElevationDrawer from '../components/map/RouteElevationDrawer';

const MapScreen = ({ route, navigation }: any) => {
  // ... existing code ...
  
  const [drawerHeight, setDrawerHeight] = useState(180);
  const [hoverCoordinates, setHoverCoordinates] = useState<[number, number] | null>(null);
  
  // Handle drawer height changes to adjust map padding
  const handleDrawerHeightChange = (height: number) => {
    setDrawerHeight(height);
    
    // Adjust map padding to ensure content isn't hidden behind the drawer
    if (mapRef.current) {
      mapRef.current.setContentInset({
        top: 0,
        left: 0,
        bottom: height,
        right: 0
      });
    }
  };
  
  // ... existing render code ...
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Full-screen Map */}
      <View style={styles.mapFullContainer}>
        <MapboxGL.MapView 
          // ... existing props ...
          onRegionDidChange={(region) => {
            // Update current zoom level when region changes
            if (region.properties.zoomLevel) {
              setCurrentZoom(region.properties.zoomLevel);
            }
          }}
          // Add touch handler for tracer feature
          onTouchMove={(event) => {
            // Get the touch coordinates
            const { screenPointX, screenPointY } = event.properties;
            
            // Convert screen coordinates to map coordinates
            if (mapRef.current) {
              mapRef.current.getCoordinateFromView([screenPointX, screenPointY])
                .then((coords) => {
                  setHoverCoordinates(coords);
                })
                .catch((error) => {
                  console.error('Error getting coordinates:', error);
                });
            }
          }}
          onTouchEnd={() => {
            // Clear hover coordinates when touch ends
            setHoverCoordinates(null);
          }}
        >
          {/* ... existing map content ... */}
        </MapboxGL.MapView>
      </View>
      
      {/* ... existing UI elements ... */}
      
      {/* Route Elevation Drawer */}
      <RouteElevationDrawer 
        onHeightChange={handleDrawerHeightChange}
        hoverCoordinates={hoverCoordinates}
      />
      
      {/* ... existing UI elements ... */}
    </SafeAreaView>
  );
};

// Update styles to account for the drawer
const styles = StyleSheet.create({
  // ... existing styles ...
  
  mapFullContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  // ... other styles ...
});

export default MapScreen;
```

## Tracer Feature Implementation (Optional Enhancement)

The tracer feature shows a marker on both the map and elevation profile when hovering/touching the route. This requires:

1. Tracking touch position on the map
2. Finding the closest point on the route
3. Displaying markers on both the map and elevation profile

```typescript
// Add to RouteElevationDrawer component
interface RouteElevationDrawerProps {
  onHeightChange?: (height: number) => void;
  hoverCoordinates?: [number, number] | null;
}

const RouteElevationDrawer: React.FC<RouteElevationDrawerProps> = ({ 
  onHeightChange,
  hoverCoordinates
}) => {
  // ... existing code ...
  
  // Calculate tracer position
  const [tracerPosition, setTracerPosition] = useState<number | null>(null);
  
  useEffect(() => {
    if (!hoverCoordinates || !activeRoute || !activeRoute.geojson) {
      setTracerPosition(null);
      return;
    }
    
    // Find the closest point on the route to the hover coordinates
    const coordinates = activeRoute.geojson.features[0].geometry.coordinates;
    let closestPointIndex = 0;
    let minDistance = Infinity;
    
    coordinates.forEach((coord: [number, number], index: number) => {
      const distance = Math.sqrt(
        Math.pow(coord[0] - hoverCoordinates[0], 2) + 
        Math.pow(coord[1] - hoverCoordinates[1], 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPointIndex = index;
      }
    });
    
    // Only show tracer if we're close enough to the route
    const threshold = 0.005; // Approximately 500m
    if (minDistance < threshold) {
      // Calculate position in the chart
      const chartWidth = 300; // Same as in ElevationChart
      const paddingLeft = 40;
      const paddingRight = 10;
      
      const position = paddingLeft + (closestPointIndex / (coordinates.length - 1)) * 
        (chartWidth - paddingLeft - paddingRight);
      
      setTracerPosition(position);
    } else {
      setTracerPosition(null);
    }
  }, [hoverCoordinates, activeRoute]);
  
  // ... existing render code ...
  
  return (
    <Animated.View>
      {/* ... existing content ... */}
      
      <ElevationChart 
        route={activeRoute} 
        height={isMaximized ? 220 : 100}
        tracerPosition={tracerPosition}
      />
      
      {/* ... */}
    </Animated.View>
  );
};
```

## Styling Considerations

1. **Color Scheme**: Use dark backgrounds with high contrast for better visibility
2. **Responsive Design**: Ensure the drawer works well on different screen sizes
3. **Accessibility**: Include appropriate text sizes and contrast ratios
4. **Performance**: Optimize SVG rendering for smooth animations

## Dependencies

The implementation uses these existing dependencies:

```json
{
  "dependencies": {
    "@rnmapbox/maps": "^11.1.0",
    "lucide-react-native": "^0.487.0",
    "react-native-svg": "15.8.0",
    "react-native-paper": "^5.13.1",
    "react-native-animated": "..."
  }
}
```

No additional dependencies are required as we'll use react-native-svg for the chart implementation.

## Testing Considerations

1. Test with routes of varying lengths and elevation profiles
2. Test with multiple routes to ensure the tab interface works correctly
3. Test on different device sizes to ensure responsive design
4. Test performance with large route datasets

## Future Enhancements

1. **Climb Indicators**: Add markers for significant climbs with category information
2. **Interactive Elevation Profile**: Allow users to tap on the profile to see details at that point
3. **Elevation Profile Sharing**: Add ability to share the elevation profile as an image
4. **Customizable Colors**: Allow users to customize the colors and appearance of the elevation profile
5. **~~Terrain Type Indicators~~**: ✅ Implemented - See [Elevation Profile Unpaved Sections Visualization](./ELEVATION_PROFILE_UNPAVED_SECTIONS.md) for details on how unpaved sections are now visually represented in the elevation profile

## Conclusion

This implementation provides a comprehensive elevation profile feature for the Lutruwita mobile app, enhancing the route map experience with detailed elevation data visualization. The design follows the patterns established in the web app while adapting to the mobile context and user experience.

## Implementation Details (Updated April 2025)

The elevation profile has been implemented with the following enhancements:

### Performance Optimizations (April 2025)

1. **Master Route Gradient Calculation Optimization**
   - Removed resource-intensive gradient calculations for master routes
   - For master routes, only a simple elevation profile with unpaved sections is displayed
   - Gradient coloring is only applied to individual route stages
   - This significantly improves performance for long routes (e.g., 1000km routes)
   - The master route now uses a neutral light gray color instead of gradient-based coloring

### UI Improvements

1. **Clean White Background Design**
   - Changed the container to use a white background with rounded corners
   - Improved typography and spacing for better readability
   - Adjusted padding and margins for a more polished look

2. **Enhanced Elevation Chart**
   - Implemented colored terrain sections (red, orange, yellow) similar to the reference design
   - Added a black outline for the elevation profile line
   - Created proper distance markers along the bottom (showing kilometers)
   - Added elevation markers on the side (showing meters)
   - Improved the grid lines for better readability

3. **Better Elevation Data Handling**
   - Enhanced the synthetic elevation data generation for routes without elevation data
   - Used multiple sine waves to create more natural-looking terrain
   - Properly segmented the elevation profile into colored sections
   - Improved scaling and rounding of elevation values

4. **Consistent Styling**
   - Used consistent icon colors for the stats
   - Standardized text colors and sizes
   - Made the UI consistent across both expanded and minimized views

### Technical Improvements

1. **Performance Optimization**
   - Used `useMemo` and `useCallback` hooks to prevent unnecessary recalculations
   - Optimized SVG rendering for smoother performance
   - Improved path generation for the elevation profile

2. **Improved Route Information Display**
   - Enhanced the stats display with better spacing
   - Made the route name more prominent
   - Improved the display of distance, elevation gain, and max elevation

3. **Multiple Route Support**
   - Maintained support for multiple routes with tabs
   - Each route's elevation profile is displayed when selected
   - Route colors are preserved in the elevation chart

4. **Synthetic Data Generation**
   - Added fallback for routes without elevation data
   - Created realistic-looking elevation profiles based on route statistics
   - Segmented the synthetic data into different terrain types for visualization

5. **Metric Units Implementation**
   - Converted all measurements to metric units (kilometers, meters)
   - Created utility functions for consistent formatting of distance and elevation values
   - Updated all displays to show metric values

### Styling Issues and Attempted Fixes

We've encountered persistent styling issues with the stage tabs in the elevation profile drawer:

1. **Tab Styling Gap Issue**
   - There's an unwanted gap between the stage names and their red line indicators
   - The red lines should appear as direct underlines for the text, but there's excessive white space

2. **Elevation Profile Cut-Off Issue**
   - The top of the elevation profile (around 800m) is still being cut off
   - Although we're now making better use of the white space at the bottom of the drawer
   - We've tried increasing the chart height, reducing bottom padding, and adjusting the elevation markers positioning
   - We've also added extra top padding and modified the y-position calculation for elevation markers

3. **Attempted Fixes for Tab Styling**
   - Reduced container height from 40px to 16px
   - Removed vertical padding in the tabs container
   - Added negative margins to pull content closer together
   - Adjusted line height for the text
   - Moved the tabs inside the content View for better positioning
   - Added justifyContent and alignItems center to position text properly
   - Set paddingTop and marginTop to 0 on the RouteStats component
   - Added negative marginTop to the content View

4. **Attempted Fixes for Elevation Profile Cut-Off**
   - Increased the chart height from 200px to 230px
   - Reduced the bottom padding from 30px to 20px
   - Reduced the chart container's bottom padding from 16px to 8px
   - Reduced the elevation chart's bottom margin from 16px to 8px
   - Added a topPadding of 10px for elevation markers
   - Modified the y-position calculation for elevation markers

Despite these attempts, the styling issues persist. The gap between the stage names and their red line indicators remains, and the top of the elevation profile is still partially cut off. These issues may require a more fundamental change to the component structure or a different approach to the layout.

The implementation otherwise closely resembles the reference design with the colored elevation profile and clean white background. The drawer can be collapsed to a minimal view showing just basic stats, or expanded to show the full elevation profile with terrain coloring.

## Route Description and Weather Integration
