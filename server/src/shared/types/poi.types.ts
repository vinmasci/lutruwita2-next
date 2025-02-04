export interface POIPosition {
  lat: number;
  lng: number;
}

export type POICategory = 
  | 'road-information'
  | 'accommodation'
  | 'food-drink'
  | 'natural-features'
  | 'event-information'
  | 'town-services'
  | 'transportation';

export type POIIconName =
  // Road Information
  | 'TrafficCone' | 'Octagon' | 'AlertOctagon' | 'Lock'
  | 'Unlock' | 'WaterCrossing' | 'ChevronsRightLeft'
  | 'ArrowUpRight' | 'AudioWaveform' | 'Route' | 'RailTrail' | 'Construction'
  // Accommodation
  | 'Tent' | 'Car' | 'Bell' | 'BedDouble' | 'BedSingle'
  // Food/Drink
  | 'Utensils' | 'Coffee' | 'Droplet' | 'Pizza' | 'ShoppingCart'
  | 'Store' | 'Beer' | 'Wine'
  // Natural Features
  | 'Mountain' | 'TreePine' | 'Binoculars' | 'Swimming'
  // Event Information
  | 'PlayCircle' | 'StopCircle' | 'Stethoscope'
  | 'BatteryCharging' | 'X' | 'CircleDot' | 'Wrench'
  // Town Services
  | 'Hospital' | 'Toilet' | 'ShowerHead' | 'ParkingSquare'
  | 'Fuel' | 'Mail' | 'Bike'
  // Transportation
  | 'Bus' | 'TrainStation' | 'Plane' | 'Ship';

export interface POIPhoto {
  url: string;
  caption?: string;
  createdAt: string;
}

export interface BasePOI {
  id: string;
  position: POIPosition;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  category: POICategory;
  icon: POIIconName;
  photos?: POIPhoto[];
  style?: {
    color?: string;
    size?: number;
  };
}

export interface DraggablePOI extends BasePOI {
  type: 'draggable';
}

export interface PlaceNamePOI extends BasePOI {
  type: 'place';
  placeId: string;
}

export type POIType = DraggablePOI | PlaceNamePOI;

export interface StoredPOIs {
  draggable: DraggablePOI[];
  places: PlaceNamePOI[];
}

export const POI_CATEGORIES: Record<POICategory, { label: string; color: string }> = {
  'road-information': { label: 'Road Information', color: '#ff5252' },
  'accommodation': { label: 'Accommodation', color: '#40407a' },
  'food-drink': { label: 'Food & Drink', color: '#ffa502' },
  'natural-features': { label: 'Natural Features', color: '#27ae60' },
  'event-information': { label: 'Event Information', color: '#e15f41' },
  'town-services': { label: 'Town Services', color: '#3dc1d3' },
  'transportation': { label: 'Transportation', color: '#20c997' }
};
