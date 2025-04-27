import React from 'react';
import { View, Text } from 'react-native';
import { RouteData } from '../../../services/routeService';
import { Route, TrendingUp, TrendingDown, Mountain, RectangleEllipsis } from 'lucide-react-native';
import { useStyles } from './styles';
import { useTheme } from '../../../theme';
import { formatDistanceMetric, formatElevationMetric } from '../../../utils/unitUtils';
import { calculateUnpavedPercentage } from '../../../utils/routeUtils';

interface RouteStatsProps {
  route: RouteData;
}

const RouteStats: React.FC<RouteStatsProps> = ({ route }) => {
  const { statistics, metadata } = route;
  const styles = useStyles();
  const { isDark } = useTheme();
  
  // Calculate unpaved percentage from metadata or from unpaved sections
  const unpavedPercentage = metadata?.unpavedPercentage || calculateUnpavedPercentage(route);
  
  return (
    <View style={[styles.statsContainer, { marginTop: 0 }]}>
      <Text style={styles.routeName}>{route.name}</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Route size={14} color="#0066cc" />
          <Text style={styles.statValue}>{formatDistanceMetric(route.statistics?.totalDistance || 0)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <TrendingUp size={14} color="#0066cc" />
          <Text style={styles.statValue}>{formatElevationMetric(route.statistics?.elevationGain || 0)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <TrendingDown size={14} color="#0066cc" />
          <Text style={styles.statValue}>{formatElevationMetric(route.statistics?.elevationLoss || 0)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <RectangleEllipsis size={14} color="#ff4d4d" />
          <Text style={styles.statValue}>
            {unpavedPercentage}% unpaved
          </Text>
        </View>
      </View>
    </View>
  );
};

export default RouteStats;
