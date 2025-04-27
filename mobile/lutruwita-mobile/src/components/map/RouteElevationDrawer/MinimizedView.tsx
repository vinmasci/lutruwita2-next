import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { RouteData } from '../../../services/routeService';
import { ArrowUp, ChevronLeft, ChevronRight, Route, RectangleEllipsis, Map } from 'lucide-react-native';
import { useStyles } from './styles';
import { useTheme } from '../../../theme';
import { formatDistanceMetric, formatElevationMetric } from '../../../utils/unitUtils';
import { calculateUnpavedPercentage } from '../../../utils/routeUtils';

interface MinimizedViewProps {
  route: RouteData;
  activeRouteIndex: number;
  totalRoutes: number;
  onChangeRoute: (index: number) => void;
}

const MinimizedView: React.FC<MinimizedViewProps> = ({ 
  route, 
  activeRouteIndex, 
  totalRoutes, 
  onChangeRoute 
}) => {
  const { statistics, metadata } = route;
  
  // Calculate unpaved percentage from metadata or from unpaved sections
  const unpavedPercentage = metadata?.unpavedPercentage || calculateUnpavedPercentage(route);
  const styles = useStyles();
  const { isDark } = useTheme();
  
  // Material UI primary blue color
  const primaryBlue = "#0066cc";
  
  // Format distance in kilometers
  const distanceKm = formatDistanceMetric(statistics.totalDistance);
  
  // Handle route navigation
  const goToPreviousRoute = () => {
    if (activeRouteIndex === 0) {
      // If at first route, go to master route
      onChangeRoute(-1);
    } else if (activeRouteIndex > 0) {
      // Go to previous route
      onChangeRoute(activeRouteIndex - 1);
    }
  };
  
  const goToNextRoute = () => {
    if (activeRouteIndex === -1) {
      // If at master route, go to first route
      onChangeRoute(0);
    } else if (activeRouteIndex < totalRoutes - 1) {
      // Go to next route
      onChangeRoute(activeRouteIndex + 1);
    }
  };
  
  return (
    <View style={styles.minimizedContainer}>
      {/* Stage name and navigation - all on one line */}
      <View style={[styles.stageNavigationRow, { marginTop: 0, marginBottom: 8 }]}>
        <TouchableOpacity 
          onPress={goToPreviousRoute}
          disabled={activeRouteIndex === -1}
          style={[styles.navButton, activeRouteIndex === -1 && styles.navButtonDisabled]}
        >
          <ChevronLeft size={18} color={activeRouteIndex === -1 ? "#cccccc" : "#000000"} />
        </TouchableOpacity>
        
        {/* Title and counter on one line */}
        <View style={styles.titleContainer}>
          {activeRouteIndex === -1 ? (
            <Text style={styles.stageName}>Overview</Text>
          ) : (
            <>
              <Text style={styles.stageName}>Stage {activeRouteIndex + 1}</Text>
              <Text style={styles.stageCounter}> {activeRouteIndex + 1} of {totalRoutes}</Text>
            </>
          )}
        </View>
        
        <TouchableOpacity 
          onPress={goToNextRoute}
          disabled={activeRouteIndex >= totalRoutes - 1}
          style={[styles.navButton, activeRouteIndex >= totalRoutes - 1 && styles.navButtonDisabled]}
        >
          <ChevronRight size={18} color={activeRouteIndex >= totalRoutes - 1 ? "#cccccc" : "#000000"} />
        </TouchableOpacity>
      </View>
      
      {/* Stats row - moved up with more space */}
      <View style={[styles.statsRowMinimized, { marginTop: 0 }]}>
        <View style={styles.statItem}>
          <Route size={14} color={primaryBlue} />
          <Text style={styles.statValue}>
            {distanceKm}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <ArrowUp size={14} color={primaryBlue} />
          <Text style={styles.statValue}>
            {formatElevationMetric(statistics.elevationGain)}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <RectangleEllipsis size={14} color="#ff4d4d" />
          <Text style={styles.statValue}>
            {unpavedPercentage}% unpaved
          </Text>
        </View>
      </View>
      
      {/* Empty space at the bottom */}
      <View style={styles.emptySpace} />
    </View>
  );
};

export default MinimizedView;
