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
  ShoppingCart,
  // New icon imports
  WifiOff,
  Waves,
  Binoculars,
  Milestone,
  TrainTrack,
  Pizza,
  // Additional icons from web app
  Ban,
  Construction,
  ArrowUpRight,
  Flag,
  Play,
  StopCircle,
  Wrench,
  ShowerHead,
  Fuel,
  Mail,
  Signpost,
  // Icons based on user's feedback
  DoorClosed,
  LockKeyhole,
  Battery,
  BriefcaseMedical,
  // New icons for user's latest request
  Worm,
  Banana
} from 'lucide-react-native';

// Category to color mapping
const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'transportation':
      return '#38ada9'; // Teal (was #4A89F3)
    case 'accommodation':
      return '#9C27B0'; // Purple
    case 'food-drink':
      return '#f7b731'; // Yellow (was #ff7f50)
    case 'natural-features':
      return '#4CAF50'; // Green
    case 'town-services':
      return '#0a3d62'; // Dark blue (was #546E7A)
    case 'event-information':
      return '#0a3d62'; // Dark blue (was #546E7A)
    case 'road-information':
      return '#F44336'; // Red
    case 'trail-information':
      return '#F44336'; // Red (for hazards)
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
    case 'RailTrail':
      return TrainTrack;
      
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
    case 'Pizza':
      return Pizza;
      
    // Natural Features
    case 'Mountain':
      return Mountain;
    case 'TreePine':
    case 'Trees':
      return Trees;
    case 'Binoculars':
      return Binoculars;
    case 'WaterCrossing':
      return Waves;
    case 'Swimming':
      return Waves; // Using Waves for Swimming (waves-ladder)
    case 'MountainBikePark':
      return Signpost; // Using Signpost for MountainBikePark (signpost-big)
      
    // Town Services
    case 'Toilet':
      return Toilet;
    case 'Hospital':
      return Heart;
    case 'Phone':
      return Phone;
    case 'Info':
      return Info;
    case 'ShowerHead':
      return ShowerHead;
    case 'Fuel':
      return Fuel;
    case 'Mail':
      return Mail;
      
    // Road Information
    case 'TrafficCone':
      return AlertTriangle;
    case 'RoughSurface':
    case 'ChevronsRightLeft':
      return Banana; // Using Banana for Rough Surface (was Trash2)
    case 'Octagon':
      return Construction; // Using Construction for Road Closed
    case 'AlertOctagon':
      return Ban; // Using Ban for Private Road
    case 'Lock':
      return LockKeyhole; // Using LockKeyhole for Gate Locked (door-closed-locked)
    case 'Unlock':
      return DoorClosed; // Using DoorClosed for Gate Unlocked (door-closed)
    case 'Construction':
      return Construction;
    case 'ArrowUpRight':
      return ArrowUpRight;
    case 'HeavyTraffic':
      return Car; // Using Car for HeavyTraffic
    case 'AudioWaveform':
      return Worm; // Using Worm for Single Track (was MoreHorizontal)
      
    // Trail Information
    case 'RemoteArea':
      return WifiOff; // Using WifiOff for Remote Area
    case 'Trailhead':
    case 'Route':
      return Milestone;
    case 'HikeABike':
      return Bike;
      
    // Event Information
    case 'PlayCircle':
      return Play; // Using Play for Start
    case 'StopCircle':
      return StopCircle; // Using StopCircle for Finish (circle-stop)
    case 'Stethoscope':
      return BriefcaseMedical; // Using BriefcaseMedical for Aid Station (briefcase-medical)
    case 'BatteryCharging':
      return Battery; // Using Battery for Rest Stop (battery-medium)
    case 'Wrench':
      return Wrench; // Using Wrench for Bike Hub
    case 'Flag':
      return Flag; // Using Flag for Checkpoint
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
    case 'railtrail':
      return TrainTrack;
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
    case 'watercrossing':
    case 'waves':
      return Waves;
    case 'swimming':
    case 'swim':
    case 'wateraccess':
    case 'waves-ladder':
      return Waves; // Using Waves for Swimming (waves-ladder)
    case 'camera':
    case 'photo':
      return Camera;
    case 'viewpoint':
    case 'binoculars':
      return Binoculars;
    case 'info':
    case 'information':
      return Info;
    case 'warning':
    case 'alert':
    case 'danger':
    case 'trafficcone':
      return AlertTriangle;
    case 'roughsurface':
    case 'rough':
    case 'chevronsrightleft':
    case 'bacon':
    case 'bin':
      return Banana; // Using Banana for Rough Surface (was Trash2)
    case 'roadclosed':
    case 'octagon':
      return Construction; // Using Construction for Road Closed
    case 'privateroad':
    case 'alertoctagon':
      return Ban; // Using Ban for Private Road
    case 'lockedgate':
    case 'door-closed-locked':
      return LockKeyhole; // Using LockKeyhole for Gate Locked (door-closed-locked)
    case 'gate':
    case 'unlock':
    case 'door-closed':
      return DoorClosed; // Using DoorClosed for Gate Unlocked (door-closed)
    case 'construction':
    case 'roadwork':
    case 'roadconstruction':
      return Construction;
    case 'arrowupright':
    case 'steep':
    case 'gradient':
      return ArrowUpRight;
    case 'heavytraffic':
    case 'traffic':
      return Car; // Using Car for HeavyTraffic
    case 'singletrack':
    case 'audiowaveform':
    case 'ellipsis':
      return Worm; // Using Worm for Single Track (was MoreHorizontal)
    case 'landmark':
    case 'monument':
    case 'attraction':
      return Landmark;
    case 'trailhead':
    case 'trail':
    case 'route':
    case 'path':
    case 'milestone':
      return Milestone;
    case 'hikeabike':
    case 'hike':
    case 'carry':
      return Bike;
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
    case 'pizza':
    case 'roadhouse':
    case 'fastfood':
      return Pizza;
    case 'start':
    case 'play':
    case 'playcircle':
      return Play; // Using Play for Start
    case 'finish':
    case 'circle-stop':
    case 'stopcircle':
      return StopCircle; // Using StopCircle for Finish (circle-stop)
    case 'aid':
    case 'aidstation':
    case 'medical':
    case 'briefcase-medical':
    case 'stethoscope':
      return BriefcaseMedical; // Using BriefcaseMedical for Aid Station (briefcase-medical)
    case 'rest':
    case 'reststop':
    case 'battery-medium':
    case 'batterycharging':
      return Battery; // Using Battery for Rest Stop (battery-medium)
    case 'repair':
    case 'bikehub':
    case 'wrench':
      return Wrench; // Using Wrench for Bike Hub
    case 'checkpoint':
    case 'flag':
      return Flag; // Using Flag for Checkpoint
    case 'shower':
    case 'shower-head':
    case 'showerhead':
      return ShowerHead; // Using ShowerHead
    case 'servicestation':
    case 'gas':
    case 'petrol':
    case 'fuel':
      return Fuel; // Using Fuel
    case 'postoffice':
    case 'post':
    case 'mail':
      return Mail; // Using Mail
    case 'mountainbikepark':
    case 'bikepark':
    case 'biketrails':
    case 'signpost-big':
    case 'signpost':
    case 'motor-racing-helmet':
    case 'helmet':
    case 'hardhat':
      return Signpost; // Using Signpost for MountainBikePark (signpost-big)
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
    case 'hospital':
      return Heart;
    case 'phone':
    case 'telephone':
    case 'emergency':
      return Phone;
    case 'remotearea':
    case 'remote':
    case 'phoneoff':
    case 'nosignal':
    case 'wifi-off':
    case 'wifioff':
      return WifiOff; // Using WifiOff for Remote Area
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
  
  // Use the POI's size if available, otherwise use a default size (slightly smaller)
  const markerSize = poi.style?.size || 20;
  
  // Special case for water crossing and drinking water POIs
  let finalColor = markerColor;
  if (poi.icon && (
    poi.icon.toLowerCase() === 'watercrossing' || 
    poi.icon.toLowerCase() === 'droplet' || 
    poi.icon.toLowerCase() === 'water' || 
    poi.icon.toLowerCase() === 'waves' || 
    poi.icon.toLowerCase() === 'drinking-water'
  )) {
    finalColor = '#6a89cc'; // Light blue for water-related POIs
  }

  return (
    <View style={[
      styles.markerContainer,
      {
        width: markerSize + 8, // Reduced padding (was +12)
        height: markerSize + 8, // Reduced padding (was +12)
        borderRadius: 8, // Square with rounded corners instead of fully circular
        backgroundColor: finalColor,
      }
    ]}>
      <IconComponent size={markerSize * 0.75} color="#FFFFFF" strokeWidth={1.5} />
    </View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
});

export default POIMarker;
