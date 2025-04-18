import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { POI } from '../../services/routeService';
import {
  MapPin,
  Utensils,
  Coffee,
  Bed,
  Tent,
  Bike,
  Car,
  Bus,
  Train,
  Plane,
  Ship,
  Mountain,
  Trees,
  Droplet,
  Camera,
  Info,
  AlertTriangle,
  Landmark,
  Building,
  ShoppingBag,
  Beer,
  Music,
  Ticket,
  ParkingSquare,
  Toilet,
  Heart,
  Phone,
  Search,
  Wine,
  Store,
  ShoppingCart
} from 'lucide-react-native';

// Category to color mapping
const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'transportation':
      return '#4A89F3'; // Blue
    case 'accommodation':
      return '#FF9800'; // Orange
    case 'food-drink':
      return '#4CAF50'; // Green
    case 'natural-features':
      return '#8BC34A'; // Light Green
    case 'town-services':
      return '#9C27B0'; // Purple
    case 'road-information':
      return '#F44336'; // Red
    default:
      return '#3478F6'; // Default Blue
  }
};

// Map POI icons to Lucide icons
const getIconComponent = (iconName: string) => {
  // First try exact match (case-sensitive)
  switch (iconName) {
    // Transportation
    case 'TrainStation':
      return Train;
    case 'Car':
      return Car;
    case 'Parking':
    case 'ParkingSquare':
      return ParkingSquare;
    case 'Bus':
      return Bus;
    case 'Plane':
      return Plane;
    case 'Ship':
      return Ship;
      
    // Accommodation
    case 'Tent':
      return Tent;
    case 'Huts':
    case 'Cabin':
    case 'BedDouble':
      return Bed;
      
    // Food & Drink
    case 'Beer':
      return Beer;
    case 'Wine':
      return Wine;
    case 'Coffee':
      return Coffee;
    case 'Utensils':
      return Utensils;
    case 'Store':
      return Store;
    case 'ShoppingCart':
      return ShoppingCart;
    case 'Droplet':
      return Droplet;
      
    // Natural Features
    case 'Mountain':
      return Mountain;
    case 'TreePine':
    case 'Trees':
      return Trees;
    case 'Binoculars':
      return Search;
      
    // Town Services
    case 'Toilet':
      return Toilet;
    case 'Hospital':
      return Heart;
    case 'Phone':
      return Phone;
    case 'Info':
      return Info;
      
    // Road Information
    case 'TrafficCone':
      return AlertTriangle;
      
    // Other
    case 'Camera':
      return Camera;
    case 'Landmark':
      return Landmark;
    case 'Building':
      return Building;
    case 'Music':
      return Music;
    case 'Ticket':
      return Ticket;
  }
  
  // If no exact match, try lowercase
  switch (iconName.toLowerCase()) {
    case 'mappin':
    case 'pin':
      return MapPin;
    case 'restaurant':
    case 'food':
    case 'utensils':
      return Utensils;
    case 'coffee':
    case 'cafe':
      return Coffee;
    case 'hotel':
    case 'accommodation':
    case 'bed':
      return Bed;
    case 'camping':
    case 'tent':
      return Tent;
    case 'bike':
    case 'bicycle':
    case 'cycling':
      return Bike;
    case 'car':
      return Car;
    case 'parking':
      return ParkingSquare;
    case 'bus':
    case 'busstop':
      return Bus;
    case 'train':
    case 'railway':
    case 'trainstation':
      return Train;
    case 'plane':
    case 'airport':
      return Plane;
    case 'ship':
    case 'ferry':
    case 'boat':
      return Ship;
    case 'mountain':
    case 'peak':
    case 'summit':
      return Mountain;
    case 'tree':
    case 'forest':
    case 'park':
    case 'treepine':
      return Trees;
    case 'water':
    case 'river':
    case 'lake':
    case 'droplet':
      return Droplet;
    case 'camera':
    case 'photo':
    case 'viewpoint':
      return Camera;
    case 'info':
    case 'information':
      return Info;
    case 'warning':
    case 'alert':
    case 'danger':
    case 'trafficcone':
      return AlertTriangle;
    case 'landmark':
    case 'monument':
    case 'attraction':
    case 'binoculars':
      return Search;
    case 'building':
    case 'structure':
      return Building;
    case 'shopping':
    case 'shop':
    case 'store':
      return Store;
    case 'beer':
    case 'pub':
    case 'bar':
      return Beer;
    case 'wine':
      return Wine;
    case 'music':
    case 'event':
    case 'concert':
      return Music;
    case 'ticket':
    case 'entrance':
      return Ticket;
    case 'toilet':
    case 'restroom':
    case 'wc':
      return Toilet;
    case 'firstaid':
    case 'medical':
    case 'hospital':
      return Heart;
    case 'phone':
    case 'telephone':
    case 'emergency':
      return Phone;
    default:
      return MapPin;
  }
};

interface POIMarkerProps {
  poi: POI;
}

const POIMarker: React.FC<POIMarkerProps> = ({ poi }) => {
  // Get the icon component based on the POI's icon property
  const IconComponent = poi.icon ? getIconComponent(poi.icon) : MapPin;
  
  // Use category color or POI's color if available, otherwise use a default color
  const markerColor = poi.style?.color || getCategoryColor(poi.category) || '#3478F6';
  
  // Use the POI's size if available, otherwise use a default size
  const markerSize = poi.style?.size || 24;
  
  return (
    <View style={[
      styles.markerContainer,
      {
        width: markerSize + 12, // Add some padding
        height: markerSize + 12,
        borderRadius: (markerSize + 12) / 2,
        backgroundColor: markerColor,
      }
    ]}>
      <IconComponent size={markerSize * 0.75} color="#FFFFFF" strokeWidth={2.5} />
    </View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
});

export default POIMarker;
