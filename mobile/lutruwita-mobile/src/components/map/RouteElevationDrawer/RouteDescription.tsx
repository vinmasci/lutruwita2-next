import React from 'react';
import { View, StyleSheet, Text, ScrollView, useWindowDimensions } from 'react-native';
import { RouteData } from '../../../services/routeService';
import { useTheme } from '../../../theme';
import HTML from 'react-native-render-html';

interface RouteDescriptionProps {
  route: RouteData;
  activeRouteIndex?: number;
}

const RouteDescription: React.FC<RouteDescriptionProps> = ({ route, activeRouteIndex = 0 }) => {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  
  // Extract description from route data
  // Handle both string descriptions and object descriptions with nested description property
  const descriptionObj = typeof route.description === 'object' ? route.description as { description: string } : null;
  const descriptionText = descriptionObj && descriptionObj.description 
    ? descriptionObj.description 
    : typeof route.description === 'string' && route.description.length > 0
      ? route.description
      : "No description available for this route.";
  
  const hasDescription = descriptionText !== "No description available for this route.";
  
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        {activeRouteIndex === -1 ? "Route Overview" : "Route Description"}
      </Text>
      
      <View style={styles.descriptionContainer}>
        {hasDescription ? (
          <HTML 
            source={{ html: descriptionText }} 
            contentWidth={width - 32} // Account for padding
            tagsStyles={{
              p: { color: '#333333', fontSize: 14, lineHeight: 20, marginBottom: 10 },
              h1: { color: '#121212', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
              h2: { color: '#121212', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
              h3: { color: '#121212', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
              a: { color: '#0288d1', textDecorationLine: 'underline' },
              ul: { marginBottom: 10, paddingLeft: 20 },
              li: { color: '#333333', fontSize: 14, lineHeight: 20, marginBottom: 4 },
            }}
          />
        ) : (
          <Text style={styles.descriptionText}>
            {descriptionText}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#121212',
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#121212',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
});

export default RouteDescription;
