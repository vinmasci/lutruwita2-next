import { POICategory, POIIconName } from '../types/poi.types';

export interface POIIconDefinition {
  name: POIIconName;
  category: POICategory;
  label: string;
  description?: string;
}

export const POI_ICONS: POIIconDefinition[] = [
  // Road Information
  { name: 'triangle-alert', category: 'road-information', label: 'Road Hazard', description: 'Warning for road hazards or dangerous conditions' },
  { name: 'octagon-x', category: 'road-information', label: 'Road Closed', description: 'Road is closed to all traffic' },
  { name: 'octagon-alert', category: 'road-information', label: 'Private Road', description: 'Private road or restricted access' },
  { name: 'lock-keyhole', category: 'road-information', label: 'Locked Gate', description: 'Gate is locked, no access' },
  { name: 'lock-keyhole-open', category: 'road-information', label: 'Gate', description: 'Gate present, may need to open/close' },
  { name: 'waves', category: 'road-information', label: 'Water Crossing', description: 'River, stream, or water crossing' },
  { name: 'chevrons-left-right-ellipsis', category: 'road-information', label: 'Rough Surface', description: 'Rough or uneven road surface' },
  { name: 'triangle-right', category: 'road-information', label: 'Steep Gradient', description: 'Steep uphill or downhill section' },
  { name: 'audio-waveform', category: 'road-information', label: 'Single Track', description: 'Narrow single track section' },
  { name: 'route', category: 'road-information', label: 'Trailhead', description: 'Start of a trail or track' },
  { name: 'train-track', category: 'road-information', label: 'Rail Trail', description: 'Former railway line converted to trail' },
  { name: 'construction', category: 'road-information', label: 'Road Construction', description: 'Road works or construction area' },

  // Accommodation
  { name: 'tent', category: 'accommodation', label: 'Camping', description: 'Camping area or campsite' },
  { name: 'caravan', category: 'accommodation', label: 'Caravan Park', description: 'Caravan and camping park' },
  { name: 'concierge-bell', category: 'accommodation', label: 'Motel/Hotel', description: 'Motel or hotel accommodation' },
  { name: 'bed-double', category: 'accommodation', label: 'Accommodation', description: 'General accommodation' },
  { name: 'bed-single', category: 'accommodation', label: 'Hostel', description: 'Hostel or backpacker accommodation' },

  // Food/Drink
  { name: 'utensils', category: 'food-drink', label: 'Restaurant', description: 'Restaurant or dining' },
  { name: 'coffee', category: 'food-drink', label: 'Cafe', description: 'Cafe or coffee shop' },
  { name: 'droplet', category: 'food-drink', label: 'Drinking Water', description: 'Drinking water available' },
  { name: 'pizza', category: 'food-drink', label: 'Roadhouse', description: 'Roadhouse or truck stop' },
  { name: 'shopping-cart', category: 'food-drink', label: 'Supermarket', description: 'Supermarket or grocery store' },
  { name: 'store', category: 'food-drink', label: 'General Store', description: 'General store or convenience store' },
  { name: 'beer', category: 'food-drink', label: 'Bar/Pub', description: 'Bar or pub' },
  { name: 'wine', category: 'food-drink', label: 'Winery', description: 'Winery or cellar door' },

  // Natural Features
  { name: 'mountain-snow', category: 'natural-features', label: 'Summit', description: 'Mountain summit or peak' },
  { name: 'tree-pine', category: 'natural-features', label: 'National Park', description: 'National park or reserve' },
  { name: 'binoculars', category: 'natural-features', label: 'Viewpoint', description: 'Scenic viewpoint or lookout' },
  { name: 'waves-ladder', category: 'natural-features', label: 'Swimming', description: 'Swimming spot or water access' },

  // Event Information
  { name: 'circle-play', category: 'event-information', label: 'Start', description: 'Event start point' },
  { name: 'circle-stop', category: 'event-information', label: 'Finish', description: 'Event finish point' },
  { name: 'briefcase-medical', category: 'event-information', label: 'Aid Station', description: 'Medical or aid station' },
  { name: 'battery-charging', category: 'event-information', label: 'Rest Stop', description: 'Rest or recovery point' },
  { name: 'x', category: 'event-information', label: 'Checkpoint', description: 'Event checkpoint' },
  { name: 'circle-dot', category: 'event-information', label: 'Control Point', description: 'Event control point' },
  { name: 'wrench', category: 'event-information', label: 'Bike Hub', description: 'Bike maintenance or repair' },

  // Town Services
  { name: 'hospital', category: 'town-services', label: 'Medical Facility', description: 'Hospital or medical center' },
  { name: 'toilet', category: 'town-services', label: 'Restroom', description: 'Public toilets' },
  { name: 'shower-head', category: 'town-services', label: 'Shower', description: 'Public or available showers' },
  { name: 'square-parking', category: 'town-services', label: 'Parking', description: 'Parking area' },
  { name: 'fuel', category: 'town-services', label: 'Service Station', description: 'Fuel or service station' },
  { name: 'mail', category: 'town-services', label: 'Post Office', description: 'Post office' },
  { name: 'bike', category: 'town-services', label: 'Bike Shop', description: 'Bicycle shop or repairs' },

  // Transportation
  { name: 'bus-front', category: 'transportation', label: 'Bus Terminal', description: 'Bus station or stop' },
  { name: 'train-front', category: 'transportation', label: 'Train Station', description: 'Train station' },
  { name: 'plane-takeoff', category: 'transportation', label: 'Airport', description: 'Airport or airfield' },
  { name: 'ship', category: 'transportation', label: 'Ferry', description: 'Ferry terminal or water transport' }
];

export const getIconsByCategory = (category: POICategory): POIIconDefinition[] => {
  return POI_ICONS.filter(icon => icon.category === category);
};

export const getIconDefinition = (name: POIIconName): POIIconDefinition | undefined => {
  return POI_ICONS.find(icon => icon.name === name);
};
