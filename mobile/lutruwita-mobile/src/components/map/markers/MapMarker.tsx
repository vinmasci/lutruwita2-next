import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMap } from '../../../context/MapContext';
import { getIconDefinition } from '../../../constants/poi-icons';
import { ICON_PATHS } from '../../../constants/icon-paths';
import { POICategory, POIIconName, POI_CATEGORIES } from '../../../types/poi';

export interface MapMarkerProps {
  id: string;
  coordinate: [number, number]; // [longitude, latitude]
  title?: string;
  icon?: POIIconName;
  category?: POICategory;
  color?: string;
  size?: number;
  onPress?: () => void;
  onDragEnd?: (coordinate: [number, number]) => void;
  draggable?: boolean;
  selected?: boolean;
}

/**
 * MapMarker component for displaying markers on the map
 * Uses Mapbox GL Native's MarkerView for rendering
 */
const MapMarker: React.FC<MapMarkerProps> = ({
  id,
  coordinate,
  title,
  icon,
  category,
  color,
  size = 24,
  onPress,
  onDragEnd,
  draggable = false,
  selected = false,
}) => {
  const { mapState } = useMap();
  const markerRef = useRef<MapboxGL.MarkerView>(null);
  
  // Determine marker color
  let markerColor = color;
  
  // If icon and category are provided, use the icon definition color or category color
  if (icon && category) {
    const iconDefinition = getIconDefinition(icon);
    markerColor = iconDefinition?.style?.color || 
                 (category && POI_CATEGORIES[category]?.color) || 
                 color || 
                 '#0066cc';
  }
  
  // Handle marker press
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };
  
  // Handle marker drag end
  const handleDragEnd = (e: any) => {
    if (onDragEnd) {
      const { geometry } = e.nativeEvent;
      onDragEnd([geometry.coordinates[0], geometry.coordinates[1]]);
    }
  };

  // Get the icon name from the icon paths or use a default
  const iconName = icon ? ICON_PATHS[icon] : 'map-marker';

  return (
    <MapboxGL.MarkerView
      id={id}
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1.0 }}
      ref={markerRef}
    >
      <View>
        {/* Marker container with icon */}
        <MaterialCommunityIcons
          name={iconName as any}
          size={size}
          color={markerColor}
          style={[
            styles.marker,
            selected && styles.selected,
            { 
              borderRadius: size / 2,
              shadowColor: selected ? markerColor : 'rgba(0,0,0,0.5)',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selected ? 0.8 : 0.3,
              shadowRadius: selected ? 4 : 2,
              elevation: selected ? 5 : 3,
            }
          ]}
          onPress={handlePress}
        />
      </View>
    </MapboxGL.MarkerView>
  );
};

const styles = StyleSheet.create({
  marker: {
    backgroundColor: 'white',
    padding: 4,
    borderWidth: 1,
    borderColor: 'white',
  },
  selected: {
    borderWidth: 2,
    borderColor: 'white',
  },
});

export default MapMarker;
