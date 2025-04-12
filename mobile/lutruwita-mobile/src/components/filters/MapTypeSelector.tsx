import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';

interface MapTypeSelectorProps {
  selectedType: string;
  availableMapTypes: string[];
  onTypeChange: (type: string) => void;
}

/**
 * A horizontal scrollable list of map type chips
 */
const MapTypeSelector: React.FC<MapTypeSelectorProps> = ({ 
  selectedType, 
  availableMapTypes,
  onTypeChange 
}) => {
  const theme = useTheme();
  
  // Default map types if none are available from the API
  const mapTypes = availableMapTypes.length > 0 
    ? availableMapTypes 
    : ['Bikepacking', 'Event', 'Single', 'Tourism'];
  
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {mapTypes.map(type => (
          <Chip
            key={type}
            selected={selectedType.toLowerCase() === type.toLowerCase()}
            onPress={() => onTypeChange(type.toLowerCase())}
            style={[
              styles.mapTypeChip,
              selectedType.toLowerCase() === type.toLowerCase() && {
                backgroundColor: theme.colors.primary,
              }
            ]}
            textStyle={
              selectedType.toLowerCase() === type.toLowerCase() 
                ? { color: '#ffffff' } 
                : {}
            }
            mode="outlined"
          >
            {type}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  mapTypeChip: {
    marginHorizontal: 4,
    height: 36,
  },
});

export default MapTypeSelector;
