import { POICategory, POIIconName } from '../types/poi.types';

export interface POIIconDefinition {
  name: POIIconName;
  category: POICategory;
  label: string;
  description?: string;
  style?: {
    color?: string;
  };
}

export const POI_ICONS: POIIconDefinition[] = [
  // Road Information
  { name: 'TrafficCone', category: 'road-information', label: 'Road Hazard', description: 'Warning for road hazards or dangerous conditions' },
  { name: 'Octagon', category: 'road-information', label: 'Road Closed', description: 'Road is closed to all traffic' },
  { name: 'AlertOctagon', category: 'road-information', label: 'Private Road', description: 'Private road or restricted access' },
  { name: 'Lock', category: 'road-information', label: 'Locked Gate', description: 'Gate is locked, no access' },
  { name: 'Unlock', category: 'road-information', label: 'Gate', description: 'Gate present, may need to open/close' },
  { name: 'ChevronsRightLeft', category: 'road-information', label: 'Rough Surface', description: 'Rough or uneven road surface' },
  { name: 'ArrowUpRight', category: 'road-information', label: 'Steep Gradient', description: 'Steep uphill or downhill section' },
  { name: 'AudioWaveform', category: 'road-information', label: 'Single Track', description: 'Narrow single track section' },
  { name: 'Route', category: 'road-information', label: 'Trailhead', description: 'Start of a trail or track' },
  { name: 'RailTrail', category: 'road-information', label: 'Rail Trail', description: 'Former railway line converted to trail' },
  { name: 'Construction', category: 'road-information', label: 'Road Construction', description: 'Road works or construction area' },
  { name: 'WaterCrossing', category: 'road-information', label: 'Water Crossing', description: 'River, stream, or water crossing', style: { color: '#3498db' } },

  // Accommodation
  { name: 'Tent', category: 'accommodation', label: 'Camping', description: 'Camping area or campsite' },
  { name: 'Car', category: 'accommodation', label: 'Caravan Park', description: 'Caravan and camping park' },
  { name: 'Bell', category: 'accommodation', label: 'Motel/Hotel', description: 'Motel or hotel accommodation' },
  { name: 'BedDouble', category: 'accommodation', label: 'Accommodation', description: 'General accommodation' },
  { name: 'BedSingle', category: 'accommodation', label: 'Hostel', description: 'Hostel or backpacker accommodation' },

  // Food/Drink
  { name: 'Utensils', category: 'food-drink', label: 'Restaurant', description: 'Restaurant or dining' },
  { name: 'Coffee', category: 'food-drink', label: 'Cafe', description: 'Cafe or coffee shop' },
  { name: 'Pizza', category: 'food-drink', label: 'Roadhouse', description: 'Roadhouse or truck stop' },
  { name: 'ShoppingCart', category: 'food-drink', label: 'Supermarket', description: 'Supermarket or grocery store' },
  { name: 'Store', category: 'food-drink', label: 'General Store', description: 'General store or convenience store' },
  { name: 'Beer', category: 'food-drink', label: 'Bar/Pub', description: 'Bar or pub' },
  { name: 'Wine', category: 'food-drink', label: 'Winery', description: 'Winery or cellar door' },
  { name: 'Droplet', category: 'food-drink', label: 'Drinking Water', description: 'Drinking water available', style: { color: '#3498db' } },

  // Natural Features
  { name: 'Mountain', category: 'natural-features', label: 'Summit', description: 'Mountain summit or peak' },
  { name: 'TreePine', category: 'natural-features', label: 'National Park', description: 'National park or reserve' },
  { name: 'Binoculars', category: 'natural-features', label: 'Viewpoint', description: 'Scenic viewpoint or lookout' },
  { name: 'Swimming', category: 'natural-features', label: 'Swimming', description: 'Swimming spot or water access', style: { color: '#3498db' } },

  // Event Information
  { name: 'PlayCircle', category: 'event-information', label: 'Start', description: 'Event start point' },
  { name: 'StopCircle', category: 'event-information', label: 'Finish', description: 'Event finish point' },
  { name: 'Stethoscope', category: 'event-information', label: 'Aid Station', description: 'Medical or aid station' },
  { name: 'BatteryCharging', category: 'event-information', label: 'Rest Stop', description: 'Rest or recovery point' },
  { name: 'X', category: 'event-information', label: 'Checkpoint', description: 'Event checkpoint' },
  { name: 'CircleDot', category: 'event-information', label: 'Control Point', description: 'Event control point' },
  { name: 'Wrench', category: 'event-information', label: 'Bike Hub', description: 'Bike maintenance or repair' },

  // Town Services
  { name: 'Hospital', category: 'town-services', label: 'Medical Facility', description: 'Hospital or medical center' },
  { name: 'Toilet', category: 'town-services', label: 'Restroom', description: 'Public toilets' },
  { name: 'ShowerHead', category: 'town-services', label: 'Shower', description: 'Public or available showers' },
  { name: 'ParkingSquare', category: 'town-services', label: 'Parking', description: 'Parking area' },
  { name: 'Fuel', category: 'town-services', label: 'Service Station', description: 'Fuel or service station' },
  { name: 'Mail', category: 'town-services', label: 'Post Office', description: 'Post office' },
  { name: 'Bike', category: 'town-services', label: 'Bike Shop', description: 'Bicycle shop or repairs' },

  // Transportation
  { name: 'Bus', category: 'transportation', label: 'Bus Terminal', description: 'Bus station or stop' },
  { name: 'TrainStation', category: 'transportation', label: 'Train Station', description: 'Train station' },
  { name: 'Plane', category: 'transportation', label: 'Airport', description: 'Airport or airfield' },
  { name: 'Ship', category: 'transportation', label: 'Ferry', description: 'Ferry terminal or water transport' }
];

export const getIconsByCategory = (category: POICategory): POIIconDefinition[] => {
  return POI_ICONS.filter(icon => icon.category === category);
};

export const getIconDefinition = (name: POIIconName): POIIconDefinition | undefined => {
  return POI_ICONS.find(icon => icon.name === name);
};
