/**
 * Icon paths for the mobile app
 * Using Material Community Icons from react-native-vector-icons
 * This is different from the web app which uses Font Awesome
 */

import { POIIconName } from '../types/poi';

// Map POI icon names to Material Community Icons names
export const ICON_PATHS: Record<POIIconName, string> = {
  // Road Information
  'TrafficCone': 'traffic-cone',
  'Octagon': 'octagon',
  'AlertOctagon': 'alert-octagon',
  'Lock': 'lock',
  'Unlock': 'lock-open',
  'WaterCrossing': 'water',
  'ChevronsRightLeft': 'chevron-left-right',
  'ArrowUpRight': 'arrow-up-right',
  'AudioWaveform': 'waveform',
  'Route': 'map-marker-path',
  'RailTrail': 'train-variant',
  'Construction': 'hammer-wrench',
  'HikeABike': 'hiking',
  'RemoteArea': 'signal-off',
  'HeavyTraffic': 'car-multiple',
  
  // Accommodation
  'Tent': 'tent',
  'Car': 'caravan',
  'BedDouble': 'bed-double',
  'BedSingle': 'bed-single',
  'Huts': 'home',
  
  // Food/Drink
  'Utensils': 'silverware-fork-knife',
  'Coffee': 'coffee',
  'Droplet': 'water-outline',
  'Pizza': 'food',
  'ShoppingCart': 'cart',
  'Store': 'store',
  'Beer': 'beer',
  'Wine': 'glass-wine',
  
  // Natural Features
  'Mountain': 'mountain',
  'TreePine': 'pine-tree',
  'Binoculars': 'binoculars',
  'Swimming': 'swim',
  'MountainBikePark': 'bike',
  
  // Town Services
  'Hospital': 'hospital-box',
  'Toilet': 'toilet',
  'ShowerHead': 'shower-head',
  'ParkingSquare': 'parking',
  'Fuel': 'gas-station',
  'Mail': 'email',
  'Bike': 'bicycle',
  
  // Transportation
  'Bus': 'bus',
  'TrainStation': 'train',
  'Plane': 'airplane',
  'Ship': 'ferry',
  
  // Event Information
  'PlayCircle': 'play-circle',
  'StopCircle': 'stop-circle',
  'Stethoscope': 'stethoscope',
  'BatteryCharging': 'battery-charging',
  'X': 'close',
  'Wrench': 'wrench',
  'Flag': 'flag'
};
