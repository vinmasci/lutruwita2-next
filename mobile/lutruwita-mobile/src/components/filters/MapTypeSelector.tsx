import React from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MapPinPlus, TentTree, CalendarDays, MapPlus, Repeat1 } from 'lucide-react-native';

interface MapTypeSelectorProps {
  selectedType: string;
  availableMapTypes: string[];
  onTypeChange: (type: string) => void;
}

/**
 * A horizontal scrollable list of map type category buttons
 * Styled to match AllTrails-like UI
 */
const MapTypeSelector: React.FC<MapTypeSelectorProps> = ({ 
  selectedType, 
  availableMapTypes,
  onTypeChange 
}) => {
  const theme = useTheme();
  
  // Get icon for each category
  const getIconForType = (type: string, isSelected: boolean) => {
    const color = isSelected ? '#000' : '#333';
    const size = 20;
    
    switch (type.toLowerCase()) {
      case 'all':
        return <MapPinPlus size={size} color={color} />;
      case 'bikepacking':
        return <TentTree size={size} color={color} />;
      case 'event':
        return <CalendarDays size={size} color={color} />;
      case 'tourism':
        return <MapPlus size={size} color={color} />;
      case 'single':
      default:
        return <Repeat1 size={size} color={color} />;
    }
  };
  
  // Add "All" as the first option
  const allCategories = ['all', ...availableMapTypes.length > 0 
    ? availableMapTypes.map(type => type.toLowerCase())
    : ['bikepacking', 'event', 'single', 'tourism']];
  
  // Get display name for each category
  const getDisplayName = (type: string) => {
    switch (type.toLowerCase()) {
      case 'all': return 'All';
      case 'bikepacking': return 'Bikepacking';
      case 'event': return 'Event';
      case 'tourism': return 'Tourism';
      case 'single': return 'Single';
      default: return type;
    }
  };
  
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {allCategories.map(type => {
          const isSelected = selectedType.toLowerCase() === type.toLowerCase();
          return (
            <TouchableOpacity
              key={type}
              onPress={() => onTypeChange(type.toLowerCase())}
              style={[
                styles.categoryButton,
                isSelected && styles.selectedButton
              ]}
            >
              <View style={styles.iconContainer}>
                {getIconForType(type, isSelected)}
              </View>
              <Text style={[
                styles.categoryText,
                isSelected && styles.selectedText
              ]}>
                {getDisplayName(type)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectedButton: {
    backgroundColor: '#fff',
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  iconContainer: {
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedText: {
    fontWeight: 'bold',
    color: '#000',
  },
});

export default MapTypeSelector;
