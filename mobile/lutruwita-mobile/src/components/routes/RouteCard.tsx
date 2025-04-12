import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import { RouteMap } from '../../services/routeService';
import { Route, Mountain, MoreHorizontal } from 'lucide-react-native';

interface RouteCardProps {
  route: RouteMap;
  onPress: (routeId: string) => void;
}

/**
 * Card component for displaying route information
 */
const RouteCard: React.FC<RouteCardProps> = ({ route, onPress }) => {
  const theme = useTheme();
  
  // Format description from metadata
  const getRouteDescription = () => {
    if (!route.metadata) return 'No description available';
    
    const parts = [];
    if (route.metadata.state) parts.push(route.metadata.state);
    if (route.metadata.totalDistance) parts.push(`${route.metadata.totalDistance} km`);
    if (route.metadata.isLoop !== undefined) parts.push(route.metadata.isLoop ? 'Loop route' : 'Point-to-point route');
    
    return parts.join(' • ') || 'No description available';
  };
  
  // Get unpaved percentage from metadata
  const getUnpavedPercentage = () => {
    return route.metadata?.unpavedPercentage !== undefined 
      ? route.metadata.unpavedPercentage 
      : 0;
  };
  
  // Get total distance from metadata
  const getTotalDistance = () => {
    return route.metadata?.totalDistance !== undefined 
      ? `${route.metadata.totalDistance} km` 
      : 'Unknown distance';
  };
  
  // Get total elevation from metadata
  const getTotalElevation = () => {
    return route.metadata?.totalAscent !== undefined 
      ? `${route.metadata.totalAscent} m` 
      : 'Unknown elevation';
  };
  
  // Determine if the route is premium
  const isPremium = () => {
    // This is a placeholder - in a real implementation, we would check if the route is premium
    return getUnpavedPercentage() > 50;
  };
  
  return (
    <Card 
      style={styles.card}
      onPress={() => onPress(route.persistentId)}
    >
      {/* Map Preview */}
      <Card.Cover 
        source={{ uri: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/pin-s+f74e4e(${route.mapState.center[0]},${route.mapState.center[1]})/${route.mapState.center[0]},${route.mapState.center[1]},${route.mapState.zoom},0/400x200?access_token=pk.eyJ1IjoibHV0cnV3aXRhIiwiYSI6ImNsZnRqcWRlZzAyaXgzcG8wdWN0Z2hoZW0ifQ.GJUrfLPj8d3vLXy5qf0xrA` }} 
        style={styles.mapPreview}
      />
      
      {/* Premium Badge */}
      {isPremium() && (
        <Chip 
          mode="outlined" 
          style={styles.premiumChip}
          textStyle={{ color: '#ffffff', fontSize: 10 }}
        >
          Premium
        </Chip>
      )}
      
      <Card.Content style={styles.content}>
        {/* Route Name */}
        <Text style={styles.title}>{route.name}</Text>
        
        {/* Route Description */}
        <Text style={styles.description}>{getRouteDescription()}</Text>
        
        {/* Route Stats */}
        <View style={styles.statsContainer}>
          {/* Distance */}
          <View style={styles.statItem}>
            <Route size={16} color={theme.colors.primary} />
            <Text style={styles.statText}>{getTotalDistance()}</Text>
          </View>
          
          {/* Elevation */}
          <View style={styles.statItem}>
            <Mountain size={16} color={theme.colors.primary} />
            <Text style={styles.statText}>{getTotalElevation()}</Text>
          </View>
          
          {/* Unpaved */}
          <View style={styles.statItem}>
            <MoreHorizontal size={16} color={theme.colors.primary} />
            <Text style={styles.statText}>{getUnpavedPercentage()}% unpaved</Text>
          </View>
        </View>
        
        {/* Route Type */}
        <View style={styles.footerContainer}>
          <Chip
            mode="outlined"
            style={[
              styles.typeChip,
              { backgroundColor: theme.colors.primary }
            ]}
            textStyle={{ color: '#ffffff', fontSize: 10 }}
          >
            {route.type.charAt(0).toUpperCase() + route.type.slice(1)}
          </Chip>
          
          {/* Views */}
          <Text style={styles.viewsText}>{route.viewCount} views</Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapPreview: {
    height: 150,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  premiumChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ee5253',
    borderColor: '#ee5253',
    height: 24,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeChip: {
    height: 24,
  },
  viewsText: {
    fontSize: 10,
    color: '#666',
  },
});

export default RouteCard;
