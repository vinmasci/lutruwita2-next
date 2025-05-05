import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Text, Animated, TouchableOpacity, ScrollView, PanResponder } from 'react-native';
import { useRoute } from '../../../context/RouteContext';
import { RouteData } from '../../../services/routeService';
import ElevationChart from './ElevationChart';
import RouteStats from './RouteStats';
import RouteDescription from './RouteDescription';
import WeatherForecast from './WeatherForecast';
import HistoricalWeather from './HistoricalWeather';
import MinimizedView from './MinimizedView';
import RouteActionButtons from './RouteActionButtons';
import { useStyles } from './styles';
import { useTheme } from '../../../theme';
import { createMasterRoute } from '../../../utils/masterRouteUtils';

interface RouteElevationDrawerProps {
  onHeightChange?: (height: number) => void;
  hoverCoordinates?: [number, number] | null;
  onRouteSelect?: (routeIndex: number, route: any, isUserInitiated: boolean) => void;
  isCollapsed?: boolean; // Add prop to control collapsed state externally
}

const RouteElevationDrawer: React.FC<RouteElevationDrawerProps> = ({ 
  onHeightChange,
  hoverCoordinates,
  onRouteSelect,
  isCollapsed: externalIsCollapsed
}) => {
  const { routeState } = useRoute();
  const styles = useStyles();
  const { isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Use external collapsed state if provided
  useEffect(() => {
    if (externalIsCollapsed !== undefined) {
      setIsCollapsed(externalIsCollapsed);
    }
  }, [externalIsCollapsed]);
  const [activeRouteIndex, setActiveRouteIndex] = useState<number>(-1);
  const [tracerPosition, setTracerPosition] = useState<number | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  
  // Define constants for drawer heights
  const COLLAPSED_HEIGHT = 140;
  const EXPANDED_HEIGHT = 300;
  
  // Create pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical gestures
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        // When the gesture starts, stop any running animation
        translateY.stopAnimation();
        translateY.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        // Move the drawer with the gesture
        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        // When the gesture ends, snap to either collapsed or expanded state
        translateY.flattenOffset();
        
        // Determine whether to collapse or expand based on gesture velocity and distance
        const shouldCollapse = 
          (isCollapsed && gestureState.dy < 50) || // If already collapsed and small downward swipe
          (!isCollapsed && gestureState.dy > 50) || // If expanded and significant downward swipe
          (gestureState.vy > 0.5); // Or if velocity is high enough downward
        
        setIsCollapsed(shouldCollapse);
        
        // Animate to the target position
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }).start();
      }
    })
  ).current;
  
  // Handle animation between states
  useEffect(() => {
    const targetHeight = isCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;
    
    if (onHeightChange) {
      onHeightChange(targetHeight);
    }
  }, [isCollapsed, onHeightChange]);
  
  // Create a master route that combines all routes
  const masterRoute = useMemo(() => {
    if (!routeState.selectedRoute || !routeState.selectedRoute.routes || routeState.selectedRoute.routes.length === 0) {
      return null;
    }
    
    try {
      return createMasterRoute(
        routeState.selectedRoute.routes, 
        routeState.selectedRoute.name || 'Combined Routes'
      );
    } catch (error) {
      console.error('Error creating master route:', error);
      return null;
    }
  }, [routeState.selectedRoute]);
  
  // Track whether the tab change was user-initiated
  const [isUserInitiatedChange, setIsUserInitiatedChange] = useState(false);

  // Call onRouteSelect when activeRouteIndex changes
  useEffect(() => {
    if (onRouteSelect && routeState.selectedRoute?.routes) {
      if (activeRouteIndex === -1 && masterRoute) {
        // For overview tab, pass the master route
        onRouteSelect(activeRouteIndex, masterRoute, isUserInitiatedChange);
      } else if (activeRouteIndex >= 0 && activeRouteIndex < routeState.selectedRoute.routes.length) {
        // For individual route tabs
        onRouteSelect(activeRouteIndex, routeState.selectedRoute.routes[activeRouteIndex], isUserInitiatedChange);
      }
      
      // Reset the flag after calling onRouteSelect
      setIsUserInitiatedChange(false);
    }
  }, [activeRouteIndex, routeState.selectedRoute, onRouteSelect, masterRoute, isUserInitiatedChange]);
  
  // Calculate tracer position when hover coordinates change
  useEffect(() => {
    if (!hoverCoordinates || !routeState.selectedRoute || !routeState.selectedRoute.routes) {
      setTracerPosition(null);
      return;
    }
    
    // Use the effective route based on activeRouteIndex
    const effectiveRoute = activeRouteIndex === -1 && masterRoute 
      ? masterRoute 
      : routeState.selectedRoute.routes[activeRouteIndex >= 0 ? activeRouteIndex : 0];
    
    if (!effectiveRoute || !effectiveRoute.geojson || !effectiveRoute.geojson.features || 
        effectiveRoute.geojson.features.length === 0) {
      setTracerPosition(null);
      return;
    }
    
    // Find the closest point on the route to the hover coordinates
    const coordinates = effectiveRoute.geojson.features[0].geometry.coordinates;
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
  }, [hoverCoordinates, routeState.selectedRoute, activeRouteIndex, masterRoute]);
  
  // If no routes, don't render anything
  if (!routeState.selectedRoute || !routeState.selectedRoute.routes || routeState.selectedRoute.routes.length === 0) {
    return null;
  }
  
  const routes = routeState.selectedRoute.routes;
  
  // If activeRouteIndex is -1, use the master route, otherwise use the selected route
  let effectiveRouteIndex = activeRouteIndex;
  
  // If we couldn't create a master route, default to the first route
  if (activeRouteIndex === -1 && !masterRoute) {
    effectiveRouteIndex = 0;
  }
  
  const activeRoute = effectiveRouteIndex === -1 
    ? masterRoute! 
    : routes[effectiveRouteIndex];
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          height: isCollapsed ? 140 : 300, // Increased from 120 to 140 for minimized view
          transform: [{ translateY }] 
        }
      ]}
    >
      {/* Handle for swiping */}
      <View 
        style={styles.header}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle} />
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {isCollapsed ? (
          <MinimizedView 
            route={activeRoute as RouteData} 
            activeRouteIndex={activeRouteIndex}
            totalRoutes={routes.length}
            onChangeRoute={(index) => {
              setIsUserInitiatedChange(true);
              setActiveRouteIndex(index);
            }}
          />
        ) : (
          <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Route tabs with master route as first tab */}
            <View style={{ marginBottom: 0, paddingBottom: 0, paddingTop: 1 }}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 0 }}
              >
                {/* Master route tab */}
                <TouchableOpacity
                  key="master-route-tab"
                  style={[
                    styles.tab,
                    activeRouteIndex === -1 && styles.activeTab,
                    { 
                      borderBottomColor: '#ff4d4d',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }
                  ]}
                  onPress={() => {
                    setIsUserInitiatedChange(true);
                    setActiveRouteIndex(-1);
                  }}
                >
                  <Text style={[
                    styles.tabText,
                    { 
                      lineHeight: 16,
                      fontWeight: activeRouteIndex === -1 ? 'bold' : 'normal'
                    }
                  ]}>Overview</Text>
                </TouchableOpacity>
                
                {/* Individual route tabs */}
                {routes.map((route, index) => (
                  <TouchableOpacity
                    key={`route-tab-${route.routeId || index}`}
                    style={[
                      styles.tab,
                      activeRouteIndex === index && styles.activeTab,
                      { 
                        borderBottomColor: route.color || '#ff4d4d',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }
                    ]}
                    onPress={() => {
                      setIsUserInitiatedChange(true);
                      setActiveRouteIndex(index);
                    }}
                  >
                    <Text style={[
                      styles.tabText,
                      { 
                        lineHeight: 16, // Reduce line height to bring text closer to border
                        fontWeight: activeRouteIndex === index ? 'bold' : 'normal' // Make active tab text bold
                      }
                    ]}>{route.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            {/* Stats with small padding for spacing */}
            <View style={{ marginTop: 2, paddingTop: 0 }}>
              <RouteStats route={activeRoute as RouteData} />
            </View>
            
            {/* Scrollable content area with elevation chart, description, and weather */}
            <ScrollView 
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 20 }}
              // Start with the elevation chart visible
              contentOffset={{ x: 0, y: 0 }}
            >
              {/* Elevation chart with fixed height */}
              <View style={{ height: 150, marginTop: 4, marginBottom: 8, zIndex: 1 }}>
                <ElevationChart 
                  route={activeRoute as RouteData} 
                  height={150}
                  tracerPosition={tracerPosition}
                />
              </View>
              
              {/* Action buttons (only in Overview tab) */}
              {activeRouteIndex === -1 && routeState.selectedRoute && (
                <RouteActionButtons route={routeState.selectedRoute} />
              )}
              
              {/* Route description */}
              <RouteDescription 
                route={activeRoute as RouteData} 
                activeRouteIndex={activeRouteIndex}
              />
              
              {/* Weather data - show historical for master route, forecast for individual routes */}
              {activeRouteIndex === -1 ? (
                <HistoricalWeather route={activeRoute as RouteData} />
              ) : (
                <WeatherForecast route={activeRoute as RouteData} />
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export default RouteElevationDrawer;
